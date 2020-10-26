var express = require('express');
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

var port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('listening on *:' + port);
});

app.use(express.static('static'))
app.use(express.static('node_modules/deck-of-cards/dist'))


var pf = require(__dirname + '/promiseFunctions.js');
var sm = require(__dirname + '/clientSocketMapper.js');
var ai = require(__dirname + '/aiPlayer.js');

try {
    var mongoUtil = require(__dirname + '/mongoUtil.js');
    mongoUtil.connectToServer( async function( err, client ) {

        if (err) console.log(err);
        app.get('/', (req, res) => {
            res.sendFile('index.html');
        });
        app.get('/css/faces/:face', (req, res) => {
            try {
                res.sendFile(__dirname + '/cardGallery/fourColorFaces/' + req.params.face);
            } catch(error) {
                const err = JSON.stringify(error);
                res.status(500).send('Request error: ' + err);
            }
        });
    
        io.on('connection', (socket) => {
            console.log('a user connected');
            socket.on('disconnect', () => {
                var gameId = null;
                var userName = sm.getClientNameFromMap(socket.id);
                var mapping = sm.userSocketIdMap.get(userName);
                if (mapping != null && mapping.games != null) {
                    var gameIds = Array.from(mapping.games.values());
                    gameId = gameIds != null && gameIds.length > 0 ? gameIds[0] : null;
                }
                if (userName == null) userName = 'unknown';
                var chatLine = 'player ' + userName + ' disconnected';
                console.log(chatLine);
                if (gameId != null) {
                    io.to(gameId).emit('new chat line', chatLine);
                }
                sm.removeClientFromMap(userName, socket.id, gameId);
            });

            socket.on('write chat', async (chatObj, fn) => {
                var chatLine = chatObj.myName + ': ' + chatObj.chatLine;
                io.to(chatObj.gameId).emit('new chat line', chatLine);
                fn();
            });
    
            socket.on('check game', async (gameCheck) => {
                console.log(gameCheck);
                var gameFound = false;
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 1, // check first ongoing game
                                 };
                const games = collection.find(query);
                await games.forEach(function (game) {
                    game.humanPlayers.forEach( function(player) {
                        if (player.playerId == gameCheck.myId) {
                            console.log('found game 1');
                            gameFound = true;
                            socket.join(game._id.toString());
                            sm.addClientToMap(player.name, socket.id, game._id.toString());
                            var chatLine = 'player ' + player.name + ' connected';
                            io.to(game._id.toString()).emit('new chat line', chatLine);
                            var gameInfo = pf.gameToGameInfo(game);
                            gameInfo.currentRound = pf.getCurrentRoundIndex(game);
                            gameInfo.reloaded = true;
                            socket.emit('card played', gameInfo);
                        }
                    });
                });
    
                if (!gameFound) {
                    const query = { gameStatus: 0, // check promised ongoing game
                                    };
                    const games = collection.find(query);
                    await games.forEach(function (game) {
                        game.humanPlayers.forEach( function(player) {
                            if (player.playerId == gameCheck.myId) {
                                console.log('found game 0');
                                socket.join(game._id.toString());
                                sm.addClientToMap(player.name, socket.id, game._id.toString());
                                var chatLine = 'player ' + player.name + ' connected';
                                io.to(game._id.toString()).emit('new chat line', chatLine);
                                var gameInfo = pf.gameToGameInfo(game);
                                gameInfo.currentRound = 0;
                                gameInfo.reloaded = true;
                                socket.emit('promise made', gameInfo);
                            }
                        });
                    });
                }
    
            });

            socket.on('leave ongoing game', async (gameId, fn) => {
                socket.leave(gameId);
                fn();
            });
    
            socket.on('leave game', async (leaveGame, fn) => {
                var leavingResult = 'NOTSET';
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(leaveGame.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                console.log(game);
                var retVal = {
                    leavingResult: null,
                    gameId: leaveGame.gameId,
                }
                if (game !== null) {
                    var newHumanPlayers = [];
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId != leaveGame.myId) {
                            newHumanPlayers.push(game.humanPlayers[i]);
                        }
                    }
                    if (newHumanPlayers.length == game.humanPlayers.length - 1) {
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                humanPlayers: newHumanPlayers,
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);
                        if (result.modifiedCount == 1) {
                            console.log(result);
                            socket.leave(leaveGame.gameId);
                            leavingResult = 'LEAVED';
                        }
                    }
                }
    
                retVal.leavingResult = leavingResult;
    
                fn(retVal);
    
                if (leavingResult == 'LEAVED') {
                    // let's update info to clients
                    const val = await collection.findOne(query);
                    var resultGameInfo = pf.gameToGameInfo(val);
    
                    io.emit('update gameinfo', resultGameInfo);
                }
            });

            socket.on('join game by id', async (joiningDetails, fn) => {
                var joiningResult = 'NOTSET';
                console.log('join game by id');
                console.log(joiningDetails);
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(joiningDetails.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 1,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                console.log(game);
                var playAsName = null;
                if (game !== null) {
                    game.humanPlayers.forEach(function(player) {
                        if (player.playerId == joiningDetails.myId) {
                            playAsName = player.name;
                            socket.join(joiningDetails.gameId);
                            sm.addClientToMap(playAsName, socket.id, joiningDetails.gameId);
                            var chatLine = 'player ' + player.name + ' connected';
                            io.to(game._id.toString()).emit('new chat line', chatLine);
                            joiningResult = 'OK';
                            return;
                        }
                    });
                }

                if (joiningResult == 'OK') {
                    var result = {
                        joiningResult: joiningResult,
                        newName: playAsName,
                    }
                    fn(result);

                }
            });
    
            socket.on('join game', async (newPlayer, fn) => {
                var joiningResult = 'NOTSET';
                console.log(newPlayer);
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(newPlayer.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0,
                                _id: searchId,
                                password: newPlayer.gamePassword
                                 };
                const game = await collection.findOne(query);
                console.log(game);
                var retVal = {
                    joiningResult: null,
                    gameId: newPlayer.gameId,
                }
                if (game !== null) {
                    if (game.humanPlayersCount > game.humanPlayers.length && game.adminName != newPlayer.myName) {
                        var nameFree = true;
                        var socketFree = true;
                        game.humanPlayers.forEach(function(player) {
                            if (player.name == newPlayer.myName) nameFree = false;
                            if (player.playerId == newPlayer.myId) socketFree = false;
                        });
    
                        if (nameFree && socketFree) {
                            var players = game.humanPlayers;
                            players.push({name: newPlayer.myName, playerId: newPlayer.myId, type: 'human'});
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: players,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                socket.join(newPlayer.gameId);
                                sm.addClientToMap(newPlayer.myName, socket.id, newPlayer.gameId);
                                var chatLine = 'player ' + newPlayer.myName + ' connected';
                                io.to(newPlayer.gameId).emit('new chat line', chatLine);
                                joiningResult = 'OK';
                            }
                        } else if (!nameFree) {
                            joiningResult = 'NAMENOTOK';
                        } else if (!socketFree) {
                            joiningResult = 'SOCKETNOTOK';
                        } else {
                            joiningResult = 'UNKNOWNERROR';
                        }
                    } else {
                        joiningResult = 'NOTVALID';
                    }
                } else {
                    joiningResult = 'GAMENOTFOUND';
                }
    
                retVal.joiningResult = joiningResult;
    
                fn(retVal);
    
                console.log(joiningResult);
                if (joiningResult == 'OK') {
                    // let's update info to clients
                    const val = await collection.findOne(query);
                    var resultGameInfo = pf.gameToGameInfo(val);
    
                    io.emit('update gameinfo', resultGameInfo);
    
                    if (resultGameInfo.humanPlayersCount == resultGameInfo.humanPlayers.length) {
                        // add bot players here
                        if (resultGameInfo.botPlayersCount > 0) {
                            resultGameInfo.humanPlayers.concat(ai.getRandomAiPlayers(resultGameInfo.botPlayersCount));
                        }
                        // start game
                        await startGame(resultGameInfo);
                    }
                    
                }
                
            });
    
            socket.on('create game', async (gameOptions, fn) => {
                var okToCreate = true;
    
                console.log(gameOptions);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
    
                const query = { gameStatus: { $lte: 1 } };
                const cursor = await collection.find(query);
                await cursor.forEach(function(val) {
                    for (var i = 0; i < val.humanPlayers.length; i++) {
                        if (val.humanPlayers[i].playerId == gameOptions.humanPlayers[0].playerId) {
                            okToCreate = false;
                            return;
                        }
                    }
                });
                
                if (okToCreate) {
                    const result = await collection.insertOne(gameOptions);
                    console.log('gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId);
                    socket.join(result.insertedId);
                    sm.addClientToMap(gameOptions.adminName, socket.id, result.insertedId);
                    fn(result.insertedId);
                } else {
                    fn('NOT OK');
                }
            });
    
            socket.on('get round', async (getRound, fn) => {
                console.log(getRound);
    
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(getRound.gameId);
    
                const doReload = getRound.doReload;
                const newRound = getRound.newRound;
                const gameOver = getRound.gameOver;
                const gameStatus = gameOver ? 2 : 1;
                
                const query = { gameStatus: gameStatus,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                     };
                const game = await collection.findOne(query);
                if (game != null) {
                    const playerRound = pf.roundToPlayer(getRound.myId, getRound.round, game, doReload, newRound, gameOver);
                    console.log(playerRound);
        
                    fn(playerRound);
                }
            });
    
            socket.on('make promise', async (promiseDetails, fn) => {
                console.log(promiseDetails);

                var promiseMadeOk = false;
    
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(promiseDetails.gameId);
                
                const query = { gameStatus: 1,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                     };
                var gameInDb = await collection.findOne(query);
                if (gameInDb !== null) {
                    var promiseInt = parseInt(promiseDetails.promise, 10);
                    var playerName = pf.getPlayerNameById(promiseDetails.myId, gameInDb.humanPlayers);
                    for (var i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        var chkInd = 1 + i; // start from next to dealer
                        if (chkInd >= gameInDb.humanPlayersCount + gameInDb.botPlayersCount) chkInd-=  (gameInDb.humanPlayersCount + gameInDb.botPlayersCount);
                        if (gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].promise == null) {
                            // this should be same as playerName
                            if (gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].name == playerName) {
                                // update promise
                                gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].promise = promiseInt;
                                if (gameInDb.game.rounds[promiseDetails.roundInd].totalPromise == null) gameInDb.game.rounds[promiseDetails.roundInd].totalPromise = 0;
                                gameInDb.game.rounds[promiseDetails.roundInd].totalPromise += promiseInt;
                                const options = { upsert: true };
                                const updateDoc = {
                                    $set: {
                                        game: gameInDb.game,
                                    }
                                };
                                const result = await collection.updateOne(query, updateDoc, options);
                                if (result.modifiedCount == 1) {
                                    promiseMadeOk = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (promiseMadeOk) {
                        const thisGame = await collection.findOne(query);
                        console.log(thisGame);
            
                        var gameInfo = pf.gameToGameInfo(thisGame);
                        gameInfo.currentRound = promiseDetails.roundInd;
                        io.to(gameInfo.id).emit('promise made', gameInfo);
                        
                        io.to(gameInfo.id).emit('new chat line', playerName+' promised '+promiseInt);            
                        // fn(gameInfo); // just DEBUG
                    }
                }
    
            });
    
            socket.on('play card', async (playDetails, fn) => {
                console.log(playDetails);

                var cardPlayedOk = false;
    
                var eventInfo = null;
    
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(playDetails.gameId);
                
                const query = { gameStatus: 1,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                     };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null) {
                    var playedCard = playDetails.playedCard;
                    var playerName = pf.getPlayerNameById(playDetails.myId, gameInDb.humanPlayers);
                    var gameOver = false;
                    if (pf.okToPlayCard(playedCard, playerName, gameInDb)) {
                        var roundInDb = pf.getCurrentRoundIndex(gameInDb);
                        if (roundInDb == playDetails.roundInd) {
                            var round = gameInDb.game.rounds[roundInDb];
                            var play = pf.getCurrentPlayIndex(round);
                            var playerInd = pf.getPlayerIndexByName(playerName, round.roundPlayers)
                            var newHandObj = pf.takeCardOut(round.roundPlayers[playerInd].cards, playedCard);
                            var newHand = newHandObj.newHand;
                            round.cardsPlayed[play].push({ name: playerName, card: playedCard });
    
                            var gameAfterPlay = gameInDb.game;
                            gameAfterPlay.rounds[roundInDb].cardsPlayed = round.cardsPlayed;
                            gameAfterPlay.rounds[roundInDb].roundPlayers[playerInd].cards = newHand;
    
                            var newPlay = false;
                            var newRound = false;
                            var winnerName = null;
                            var gameStatus = 1;
                            
                            if (gameAfterPlay.rounds[roundInDb].cardsPlayed[play].length == gameInDb.humanPlayersCount + gameInDb.botPlayersCount) {
                                // this was the last card of the play
                                // let's see who wins this play and will be starter of the next play
                                newPlay = true;
                                winnerName = pf.winnerOfPlay(gameAfterPlay.rounds[roundInDb].cardsPlayed[play], gameAfterPlay.rounds[roundInDb].trumpCard.suit);
                                var winnerIndex = pf.getPlayerIndexByName(winnerName, round.roundPlayers);
    
                                gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps++;

                                io.to(playDetails.gameId).emit('new chat line', playerName+' won this play');
                                
                                if (gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps == gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].promise + 1) {
                                    io.to(playDetails.gameId).emit('new chat line', playerName+' Pitkäksi Oy:stä PÄIVÄÄ!');
                                }
    
                                if (gameAfterPlay.rounds[roundInDb].cardsPlayed.length == gameAfterPlay.rounds[roundInDb].cardsInRound) {
                                    // this was the last card of the round
                                    newRound = true;
                                    gameAfterPlay.rounds[roundInDb].roundStatus = 2;
                                    for (var i = 0; i < gameAfterPlay.rounds[roundInDb].roundPlayers.length; i++) {
                                        if (gameAfterPlay.rounds[roundInDb].roundPlayers[i].promise == gameAfterPlay.rounds[roundInDb].roundPlayers[i].keeps) {
                                            if (gameAfterPlay.rounds[roundInDb].roundPlayers[i].keeps == 0) {
                                                gameAfterPlay.rounds[roundInDb].roundPlayers[i].points = gameAfterPlay.rounds[roundInDb].cardsInRound > 5 ? 15 : 5;
                                            } else {
                                                gameAfterPlay.rounds[roundInDb].roundPlayers[i].points = 10 + gameAfterPlay.rounds[roundInDb].roundPlayers[i].keeps;
                                            }
                                        } else {
                                            gameAfterPlay.rounds[roundInDb].roundPlayers[i].points = 0;
                                        }
                                    }
    
                                    if (gameAfterPlay.rounds.length == roundInDb + 1) {
                                        // this was the last round of the game
                                        gameOver = true;
                                        gameStatus = 2;
                                    } else {
                                        // start next round
                                        gameAfterPlay.rounds[roundInDb+1].roundStatus = 1;
                                    }
                                } else {
                                    // start next play
                                    gameAfterPlay.rounds[roundInDb].cardsPlayed.push([]);
                                }
                            }
    
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    gameStatus: gameStatus,
                                    game: gameAfterPlay,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);

                            if (result.modifiedCount == 1) {
                                cardPlayedOk = true;
                                
                                eventInfo = {
                                    playedCard: playedCard,
                                    cardPlayedBy: playerName,
                                    cardPlayedByIndex: playerInd,
                                    newPlay: newPlay,
                                    winnerName: newPlay ? winnerName : null,
                                    newRound: newRound,
                                    gameOver: gameOver,
                                };
                            }
                        }
                    }

                    if (cardPlayedOk) {
                        var queryUsed = query;
                        if (gameOver) {
                            queryUsed = { gameStatus: 2,
                                _id: searchId,
                                // password: newPlayer.gamePassword,
                                 };
                        }
                        const thisGame = await collection.findOne(queryUsed);
                        console.log(thisGame);
            
                        var gameInfo = pf.gameToGameInfo(thisGame);
                        gameInfo.currentRound = playDetails.roundInd;
                        gameInfo.eventInfo = eventInfo;
                        io.to(gameInfo.id).emit('card played', gameInfo);
            
                        // fn(gameInfo); // just DEBUG
                    }
                }
    
            });
    
    
            socket.on('get games', async (data, fn) => {
                console.log('start to get games');
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0 };
                const cursor = await collection.find(query);
    
                var games = [];
                await cursor.forEach(function(val) {
                    games.push({
                        id: val._id.toString(),
                        humanPlayersCount: val.humanPlayersCount,
                        computerPlayersCount: val.botPlayersCount,
                        startRound: val.startRound,
                        turnRound: val.turnRound,
                        endRound: val.endRound,
                        humanPlayers: pf.parsedHumanPlayers(val.humanPlayers),
                        hasPassword: val.password.length > 0,
                        evenPromisesAllowed: val.evenPromisesAllowed
                    });
                });
    
                fn(games);
                console.log(games);
            });
        });
        
    });
} catch (error) {
    const err = JSON.stringify(error);
    console.log('Error while connecting to MongoDB: ' + error);
}

async function startGame (gameInfo) {
    var players = pf.initPlayers(gameInfo);
    var rounds = pf.initRounds(gameInfo, players);
    var game = {
        playerOrder: players,
        rounds: rounds,
    };

    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    var ObjectId = require('mongodb').ObjectId;
    var searchId = new ObjectId(gameInfo.id);

    const query = { _id: searchId };
    const options = { upsert: true };
    const updateDoc = {
        $set: {
            gameStatus: 1,
            game: game,
        }
    };
    const result = await collection.updateOne(query, updateDoc, options);
    console.log('game started');

    await startRound(gameInfo, 0);

    io.to(gameInfo.id).emit('start game', gameInfo);

}


async function startRound(gameInfo, roundInd) {
    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    var ObjectId = require('mongodb').ObjectId;
    var searchId = new ObjectId(gameInfo.id);

    const query = { _id: searchId };
    var thisGame = await collection.findOne(query);

    if (thisGame.game.rounds[roundInd].roundStatus < 1) {
        thisGame.game.rounds[roundInd].roundStatus = 1;
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                game: thisGame.game,
            }
        };
    
        const result = await collection.updateOne(query, updateDoc, options);
    }

    console.log('round '+roundInd+' started')
}
