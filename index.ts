const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('listening on *:' + port);
});

app.use(express.static('static'))
app.use(express.static('node_modules/deck-of-cards/dist'))
app.use(express.static('node_modules/jquery-color-animation'))

const pf = require(__dirname + '/promiseFunctions.js');
const rf = require(__dirname + '/reportFunctions.js');
const sm = require(__dirname + '/clientSocketMapper.js');
const ai = require(__dirname + '/aiPlayer.js');

const minGamesToReport = 5;
const vanillaGameRules = {
    // startRound: {$eq: 10},
    // turnRound: {$eq: 1},
    // endRound: {$eq: 10},
    evenPromisesAllowed: {$in: [null, true]},
    visiblePromiseRound: {$in: [null, true]},
    onlyTotalPromise: {$in: [null, false]},
    freeTrump: {$in: [null, true]},
    hiddenTrump: {$in: [null, false]},
    speedPromise: {$in: [null, false]},
    privateSpeedGame: {$in: [null, false]},
    opponentPromiseCardValue: {$in: [null, false]},
    opponentGameCardValue: {$in: [null, false]},
    hiddenCardsMode: {$in: [null, 0]},
};

try {
    var mongoUtil = require(__dirname + '/mongoUtil.js');
    mongoUtil.connectToServer(async function(err, client ) {

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
                        game.humanPlayers.forEach(function(player) {
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

            socket.on('leave ongoing game', async (leaveGameObj, fn) => {
                var retVal = {
                    leavingResult: 'NOTSET',
                    gameId: leaveGameObj.gameId,
                }
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(leaveGameObj.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 1,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                console.log(game);
                if (game !== null) {
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId == leaveGameObj.playerId && game.humanPlayers[i].active) {
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: pf.deActivatePlayer(game.humanPlayers, leaveGameObj.playerId),
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                socket.leave(leaveGameObj.gameId);
                                sm.removeClientFromMap(game.humanPlayers[i].name, socket.id, leaveGameObj.gameId);
                                var chatLine = 'player ' + game.humanPlayers[i].name + ' has left the game';
                                io.to(game._id.toString()).emit('new chat line', chatLine);
                                retVal.leavingResult = 'LEAVED';
                                break;
                            }
                        }
                    }
                    var activePlayersInGame = 0;
                    game.humanPlayers.forEach(function (player) {
                        if (player.active) {
                            activePlayersInGame++;
                        }
                    });
                    if (activePlayersInGame == 0) {
                        // all players have left the game, update gamestatus to 99
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                gameStatus: 99,
                            }
                        }
                        const result = await collection.updateOne(query, updateDoc, options);
                    }
                }
    
                fn(retVal);
            });
    
            socket.on('leave game', async (leaveGame, fn) => {
                var retVal = {
                    leavingResult: 'NOTSET',
                    gameId: leaveGame.gameId,
                    gameDeleted: false,
                }

                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(leaveGame.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                console.log(game);
                if (game !== null) {
                    var newHumanPlayers = [];
                    var leaverName = "";
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId != leaveGame.myId) {
                            newHumanPlayers.push(game.humanPlayers[i]);
                        } else {
                            leaverName = game.humanPlayers[i].name;
                        }
                    }
                    if (newHumanPlayers.length == game.humanPlayers.length - 1) {
                        if (newHumanPlayers.length == 0) {
                            retVal.gameDeleted = true;
                        }
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                humanPlayers: newHumanPlayers,
                                gameStatus: retVal.gameDeleted ? 99 : 0, // if no more players in the game, set gamestatus to 99
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);
                        if (result.modifiedCount == 1) {
                            console.log(result);
                            socket.leave(leaveGame.gameId);
                            sm.removeClientFromMap(leaverName, socket.id, leaveGame.gameId);
                            retVal.leavingResult = 'LEAVED';
                        }
                    }
                }
    
                fn(retVal);
    
                if (retVal.leavingResult == 'LEAVED') {
                    if (retVal.gameDeleted) {
                        io.emit('delete gameinfo', leaveGame.gameId);
                    } else {
                        // let's update info to clients
                        const val = await collection.findOne(query);
                        var resultGameInfo = pf.gameToGameInfo(val);
        
                        io.emit('update gameinfo', resultGameInfo);
                    }
                }
            });

            socket.on('join game by id', async (joiningDetails, fn) => {
                var resultObj = {
                    joiningResult: 'NOTSET',
                    newName: null,
                    newId: joiningDetails.myId,
                }
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
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId == joiningDetails.myId && !game.humanPlayers[i].active) {
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: pf.activatePlayer(game.humanPlayers, joiningDetails.myId),
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                playAsName = game.humanPlayers[i].name;
                                socket.join(joiningDetails.gameId.toString());
                                sm.addClientToMap(playAsName, socket.id, joiningDetails.gameId);
                                var chatLine = 'player ' + playAsName + ' connected as new player';
                                io.to(game._id.toString()).emit('new chat line', chatLine);
                                resultObj.joiningResult = 'OK';
                                resultObj.newName = playAsName;
                                break;
                            }
                        }
                    }
                }

                if (resultObj.joiningResult == 'OK') {
                    fn(resultObj);
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
                            players.push({name: newPlayer.myName, playerId: newPlayer.myId, type: 'human', active: true, playerStats: await getGamesStatistics(game, newPlayer.myName)});
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: players,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                socket.join(newPlayer.gameId.toString());
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
    
                const query = { gameStatus: { $lte: 1 }, 'humanPlayers.playerId': {$eq: gameOptions.humanPlayers[0].playerId } };
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
                    gameOptions.humanPlayers[0].playerStats = await getGamesStatistics(gameOptions, gameOptions.adminName);
                    const result = await collection.insertOne(gameOptions);
                    console.log('gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId);
                    socket.join(result.insertedId.toString());
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
    
                const gameStarted = getRound.gameStarted;
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
                    const stats = null;// (gameStarted || doReload || newRound || gameOver) ? await getStatistics(game) : null;
                    const playerRound = pf.roundToPlayer(getRound.myId, getRound.round, game, stats, doReload, newRound, gameOver);
                    console.log(playerRound);
        
                    fn(playerRound);
                }
            });

            socket.on('speedpromise', async (speedPromiseObj, fn) => {
                console.log(speedPromiseObj);
                var resultObj = {
                    speedOk: false,
                    fullSpeedPromises: false,
                    round: null,
                    debug: null,
                }

                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(speedPromiseObj.gameId);
                const query = { gameStatus: 1,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                     };
                var gameInDb = await collection.findOne(query);
                if (gameInDb !== null && gameInDb.speedPromise) {
                    var playerName = pf.getPlayerNameById(speedPromiseObj.myId, gameInDb.humanPlayers);
                    for (var i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        var chkInd = 1 + i; // start from next to dealer
                        if (chkInd >= gameInDb.humanPlayersCount + gameInDb.botPlayersCount) chkInd-= (gameInDb.humanPlayersCount + gameInDb.botPlayersCount);
                        if (gameInDb.game.rounds[speedPromiseObj.roundInd].roundPlayers[chkInd].promise == null) {
                            // this should be same as playerName
                            if (gameInDb.game.rounds[speedPromiseObj.roundInd].roundPlayers[chkInd].name == playerName) {
                                // make speedpromise substraction
                                if (gameInDb.game.rounds[speedPromiseObj.roundInd].roundPlayers[chkInd].speedPromisePoints >= -9) {
                                    gameInDb.game.rounds[speedPromiseObj.roundInd].roundPlayers[chkInd].speedPromisePoints--;
                                    const options = { upsert: true };
                                    const updateDoc = {
                                        $set: {
                                            game: gameInDb.game,
                                        }
                                    };
                                    const result = await collection.updateOne(query, updateDoc, options);
                                    if (result.modifiedCount == 1) {
                                        resultObj.speedOk = true;
                                        resultObj.fullSpeedPromises = gameInDb.game.rounds[speedPromiseObj.roundInd].roundPlayers[chkInd].speedPromisePoints == -10;

                                        var chatLine = playerName+' still thinking, speed promise: ' + gameInDb.game.rounds[speedPromiseObj.roundInd].roundPlayers[chkInd].speedPromisePoints;
                                        io.to(speedPromiseObj.gameId).emit('new chat line', chatLine);

                                        const playerRound = pf.roundToPlayer(speedPromiseObj.myId, speedPromiseObj.roundInd, gameInDb, null, false, false, false);
                                        resultObj.round = playerRound;
                                        resultObj.debug = null;
                                        break;
                                    } else {
                                        resultObj.debug = 'DB error when updating speed promise';
                                    }
                                } else {
                                    resultObj.debug = 'Already maximum promise penalty';
                                }
                            } else {
                                resultObj.debug = 'Not my promise turn';
                            }
                        } else {
                            resultObj.debug = 'All players have made promise';
                        }
                    }
                } else {
                    resultObj.debug = 'No game in DB';
                }

                fn(resultObj);
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
                    var speedPromisePoints = null;
                    for (var i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        var chkInd = 1 + i; // start from next to dealer
                        if (chkInd >= gameInDb.humanPlayersCount + gameInDb.botPlayersCount) chkInd-= (gameInDb.humanPlayersCount + gameInDb.botPlayersCount);
                        if (gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].promise == null) {
                            // this should be same as playerName
                            if (gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].name == playerName) {
                                // update promise
                                if (gameInDb.evenPromisesAllowed || !pf.isLastPromiser(gameInDb.game.rounds[promiseDetails.roundInd]) || gameInDb.game.rounds[promiseDetails.roundInd].totalPromise + promiseInt != gameInDb.game.rounds[promiseDetails.roundInd].cardsInRound) {
                                    gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].promise = promiseInt;
                                    speedPromisePoints = gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].speedPromisePoints;
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
                                } else {
                                    socket.emit('new chat line', 'You can\'t promise '+promiseInt+' because even promises is not allowed!');
                                }
                            }
                        }
                    }

                    const thisGame = await collection.findOne(query);
                    console.log(thisGame);
        
                    var gameInfo = pf.gameToGameInfo(thisGame);
                    gameInfo.currentRound = promiseDetails.roundInd;

                    if (promiseMadeOk) {
                        io.to(gameInfo.id).emit('promise made', gameInfo);
                        
                        var chatLine = playerName+' promised';
                        if (thisGame.visiblePromiseRound) chatLine+= ' '+promiseInt;
                        if (thisGame.speedPromise) {
                            if (speedPromisePoints == 1) {
                                chatLine+= ' with Speed Promise!';
                            } else if (speedPromisePoints == 0) {
                                chatLine+= ' without any bonus';
                            } else {
                                chatLine+= ' with '+speedPromisePoints+' penalty points';
                            }
                        }
                        io.to(gameInfo.id).emit('new chat line', chatLine);
                        // fn(gameInfo); // just DEBUG
                    } else {
                        socket.emit('promise made', gameInfo);
                    }
                }
            });
    
            socket.on('play card', async (playDetails, fn) => {
                console.log(playDetails);

                var cardPlayedOk = false;
    
                var eventInfo = null;
                var eventInfoToCardPlayer = null;
    
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
                            var cardsInThisPlay = null;
                            var winnerName = pf.winnerOfPlay(gameAfterPlay.rounds[roundInDb].cardsPlayed[play], gameAfterPlay.rounds[roundInDb].trumpCard.suit);
                            var gameStatus = 1;

                            var gameStatistics = null;
                            
                            if (gameAfterPlay.rounds[roundInDb].cardsPlayed[play].length == gameInDb.humanPlayersCount + gameInDb.botPlayersCount) {
                                // this was the last card of the play
                                // let's see who wins this play and will be starter of the next play
                                newPlay = true;
                                var winnerIndex = pf.getPlayerIndexByName(winnerName, round.roundPlayers);
    
                                gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps++;

                                cardsInThisPlay = gameAfterPlay.rounds[roundInDb].cardsPlayed[play];

                                io.to(playDetails.gameId).emit('new chat line', winnerName+' won this play');
                                
                                if (gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps == gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].promise + 1) {
                                    if (!gameInDb.onlyTotalPromise) io.to(playDetails.gameId).emit('new chat line', winnerName+' Pitkäksi Oy:stä PÄIVÄÄ!');
                                }
    
                                if (gameAfterPlay.rounds[roundInDb].cardsPlayed.length == gameAfterPlay.rounds[roundInDb].cardsInRound) {
                                    // this was the last card of the round
                                    newRound = true;
                                    gameAfterPlay.rounds[roundInDb].roundStatus = 2;
                                    // let's count points
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
                                        if (gameInDb.speedPromise) {
                                            var speedPromiseTotal = pf.speedPromiseSolver(gameAfterPlay.rounds[roundInDb], i);
                                            gameAfterPlay.rounds[roundInDb].roundPlayers[i].points+= speedPromiseTotal;
                                            gameAfterPlay.rounds[roundInDb].roundPlayers[i].speedPromiseTotal = speedPromiseTotal;
                                        }
                                    }
    
                                    if (gameAfterPlay.rounds.length == roundInDb + 1) {
                                        // this was the last round of the game
                                        gameOver = true;
                                        gameStatus = 2;
                                        io.to(playDetails.gameId).emit('new chat line', 'GAME OVER!');
                                        gameStatistics = rf.generateGameStatistics(gameAfterPlay);
                                    } else {
                                        // start next round
                                        gameAfterPlay.rounds[roundInDb+1].roundStatus = 1;
                                        io.to(playDetails.gameId).emit('new chat line', 'New round starts...');
                                        io.to(playDetails.gameId).emit('new chat line', '... with '+ gameAfterPlay.playerOrder[gameAfterPlay.rounds[roundInDb+1].dealerPositionIndex].name +' as a dealer!');
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
                                    gameStatistics: gameStatistics,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);

                            if (result.modifiedCount == 1) {
                                cardPlayedOk = true;
                                
                                eventInfo = {
                                    playedCard: pf.okToReturnCard(gameInDb.hiddenCardsMode, (round.cardsPlayed[play].length == 1), (newPlay || newRound || gameOver), winnerName == playerName) ? playedCard : { suit: 'dummy', rank: 0 },
                                    cardPlayedBy: playerName,
                                    cardPlayedByIndex: playerInd,
                                    newPlay: newPlay,
                                    winnerName: newPlay ? winnerName : null,
                                    newRound: newRound,
                                    gameOver: gameOver,
                                    cardsInThisPlay: cardsInThisPlay,
                                };

                                eventInfoToCardPlayer = {
                                    playedCard: playedCard,
                                    cardPlayedBy: playerName,
                                    cardPlayedByIndex: playerInd,
                                    newPlay: newPlay,
                                    winnerName: newPlay ? winnerName : null,
                                    newRound: newRound,
                                    gameOver: gameOver,
                                    cardsInThisPlay: cardsInThisPlay,
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

                        // this gameInfo to all other players than the one who just played card
                        socket.to(gameInfo.id).emit('card played', gameInfo);

                        // this gameInfo to the player who just played card
                        gameInfo.eventInfo = eventInfoToCardPlayer;
                        socket.emit('card played', gameInfo);
            
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
                        evenPromisesAllowed: val.evenPromisesAllowed,
                        visiblePromiseRound: val.visiblePromiseRound,
                        onlyTotalPromise: val.onlyTotalPromise,
                        freeTrump: val.freeTrump,
                        hiddenTrump: val.hiddenTrump,
                        speedPromise: val.speedPromise,
                        privateSpeedGame: val.privateSpeedGame,
                        opponentPromiseCardValue: val.opponentPromiseCardValue,
                        opponentGameCardValue: val.opponentGameCardValue,
                        hiddenCardsMode: val.hiddenCardsMode,
                        imInThisGame: pf.imInThisGame(val.humanPlayers, data.myId)
                    });
                });
    
                fn(games);
                console.log(games);
            });

            /* reporting functions */

            socket.on('get games for report', async (data, fn) => {
                console.log('start to get games');
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 2 };
                const cursor = await collection.find(query);
    
                var games = [];
                await cursor.forEach(function(val) {
                    games.push({
                        id: val._id.toString(),
                        gameStatistics: val.gameStatistics,
                        created: val.createDateTime,
                        startRound: val.startRound,
                        turnRound: val.turnRound,
                        endRound: val.endRound,
                        humanPlayers: pf.parsedHumanPlayers(val.humanPlayers),
                        evenPromisesAllowed: val.evenPromisesAllowed,
                        visiblePromiseRound: val.visiblePromiseRound,
                        onlyTotalPromise: val.onlyTotalPromise,
                        freeTrump: val.freeTrump,
                        hiddenTrump: val.hiddenTrump,
                        speedPromise: val.speedPromise,
                        privateSpeedGame: val.privateSpeedGame,
                        opponentPromiseCardValue: val.opponentPromiseCardValue,
                        opponentGameCardValue: val.opponentGameCardValue,
                        hiddenCardsMode: val.hiddenCardsMode,
                        playerNameErrors: pf.checkPlayerNames(val),
                    });
                });
    
                fn(games);
            });

            socket.on('get report data', async (data, fn) => {
                console.log('start to get report data');
                var retObj = {
                    gamesPlayed: null,
                    roundsPlayed: null,
                    totalCardsHit: null,
                    playersTotal: null,
                    mostGamesPlayed: null,
                    playerTotalWins: null,
                    avgPointsPerPlayer: null,
                    avgScorePointsPerPlayer: null,
                    // avgKeepsPerPlayer: null,
                    avgKeepPercentagePerPlayer: null,
                    totalPointsPerPlayer: null,
                    vanillaGamesCount: null,
                    usedRulesCount: null,
                };

                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');

                // game count
                console.log('report data - game count');
                const queryGameCount = { gameStatus: 2 };
                const gameCount = await collection.countDocuments(queryGameCount);
                retObj.gamesPlayed = gameCount;
                // ********

                // rounds played
                console.log('report data - rounds played');
                const aggregationRoundsPlayed = [{$match: {
                    gameStatus: {$eq: 2}
                  }}, {$group: {
                    _id: null,
                    totalRounds: {
                      $sum: "$gameStatistics.roundsPlayed"
                    },
                    totalCardsHit: {
                      $sum: "$gameStatistics.cardsHit"
                    }
                  }}
                ];

                const cursorRoundsPlayed = await collection.aggregate(aggregationRoundsPlayed);
                var roundsPlayed = null;
                var totalCardsHit = null;
                await cursorRoundsPlayed.forEach(function(val) {
                    roundsPlayed = val.totalRounds;
                    totalCardsHit = val.totalCardsHit;
                });
                retObj.roundsPlayed = roundsPlayed;
                retObj.totalCardsHit = totalCardsHit;
                // ********

                // games played per player
                console.log('report data - games played per player');
                const aggregationGamesPlayed = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$unwind: {
                    path: '$humanPlayers',
                    preserveNullAndEmptyArrays: true
                  }}, {$group: {
                    _id: '$humanPlayers.name',
                    count: {
                      $sum: 1
                    }
                  }}, {$match: {
                    count: {$gte: minGamesToReport}
                  }}, {$sort: {
                    count: -1
                  }}
                ];

                const cursorGamesPlayed = await collection.aggregate(aggregationGamesPlayed);
                var gamesPlayed = [];
                await cursorGamesPlayed.forEach(function(val) {
                    gamesPlayed.push(val);
                });
                retObj.mostGamesPlayed = gamesPlayed;
                // ********

                // average points per player
                console.log('report data - average points per player');
                const aggregationAvgPoints = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$unwind: {
                    path: "$gameStatistics.playersStatistics",
                    preserveNullAndEmptyArrays: false
                  }}, {$group: {
                    _id: "$gameStatistics.playersStatistics.playerName",
                    playerTotalGames: {$sum: 1},
                    avgPoints: {$avg: "$gameStatistics.playersStatistics.totalPoints"},
                  }}, {$match: {
                    playerTotalGames: {$gte: minGamesToReport}
                  }}, {$sort: {
                    avgPoints: -1
                  }}
                ];

                const cursorAvgPoints = await collection.aggregate(aggregationAvgPoints);
                var avgPointsPerPlayer = [];
                await cursorAvgPoints.forEach(function(val) {
                    avgPointsPerPlayer.push(val);
                });
                retObj.avgPointsPerPlayer = avgPointsPerPlayer;
                // ********

                // average keep percentage per player
                console.log('report data - average keep percentage per player');
                const aggregationAvgKeepPercentage = [{$match: {
                    gameStatus: {
                      $eq: 2
                    },
                    "gameStatistics.roundsPlayed": {
                      $gte: 0
                    },
                    "gameStatistics.playersStatistics.totalKeeps": {
                      $gte: 0
                    }
                  }}, {$addFields: {
                      "gameStatistics.playersStatistics.roundsPlayed": "$gameStatistics.roundsPlayed"
                  }}, {$unwind: {
                    path: "$gameStatistics.playersStatistics",
                    preserveNullAndEmptyArrays: false
                  }}, {$group: {
                    _id: "$gameStatistics.playersStatistics.playerName",
                    playerTotalGames: {
                      $sum: 1
                    },
                    playerTotalRounds: {
                      $sum: "$gameStatistics.playersStatistics.roundsPlayed"
                    },
                    playerTotalKeeps: {$sum: "$gameStatistics.playersStatistics.totalKeeps"}
                  }}, {$match: {
                    playerTotalGames: {
                      $gte: minGamesToReport
                    }
                  }}, {$project: {
                    id_: 1,
                    avgKeepPercentage: {$divide: ["$playerTotalKeeps", "$playerTotalRounds"]}
                  }}, {$sort: {
                    avgKeepPercentage: -1
                  }}
                ];
                const cursorAvgKeepPercentage = await collection.aggregate(aggregationAvgKeepPercentage);
                var avgKeepPercentagePerPlayer = [];
                try {
                    await cursorAvgKeepPercentage.forEach(function(val) {
                        avgKeepPercentagePerPlayer.push(val);
                    });
                } catch (e) {
                    console.log(e);
                }
                retObj.avgKeepPercentagePerPlayer = avgKeepPercentagePerPlayer;
                // ********

                // total points per player
                console.log('report data - total points per player');
                const aggregationTotalPointsPerPlayer = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$unwind: {
                    path: "$gameStatistics.playersStatistics",
                    preserveNullAndEmptyArrays: false
                  }}, {$group: {
                    _id: "$gameStatistics.playersStatistics.playerName",
                    playerTotalGames: {$sum: 1},
                    playersTotalPoints: {$sum: "$gameStatistics.playersStatistics.totalPoints"}
                  }}, {$match: {
                    playerTotalGames: {
                      $gte: minGamesToReport
                    }
                  }}, {$sort: {
                    playersTotalPoints: -1
                  }}
                ];

                const cursorTotalPointsPerPlayer = await collection.aggregate(aggregationTotalPointsPerPlayer);
                var totalPointsPerPlayer = [];
                await cursorTotalPointsPerPlayer.forEach(function(val) {
                    totalPointsPerPlayer.push(val);
                });
                retObj.totalPointsPerPlayer = totalPointsPerPlayer;
                // ********

                // total wins per player
                console.log('report data - total wins per player');
                const aggregationPlayerTotalWins = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$group: {
                    _id: "$gameStatistics.winnerName",
                    playerTotalWins: {$sum: 1},
                  }}, {$match: {
                    playerTotalWins: {$gte: 3}
                  }}, {$sort: {
                    playerTotalWins: -1
                  }}
                ];

                const cursorPlayerTotalWins = await collection.aggregate(aggregationPlayerTotalWins);
                var playerTotalWins = [];
                await cursorPlayerTotalWins.forEach(function(val) {
                    playerTotalWins.push(val);
                });
                retObj.playerTotalWins = playerTotalWins;
                // ********

                // average score points per player
                console.log('report data - average score points per player');
                const aggregationAvgScorePointsPerPlayer = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$unwind: {
                    path: "$gameStatistics.playersStatistics",
                    preserveNullAndEmptyArrays: false
                  }}, {$group: {
                    _id: "$gameStatistics.playersStatistics.playerName",
                    playerTotalGames: {$sum: 1},
                    playerAvgScorePoints: {$avg: "$gameStatistics.playersStatistics.scorePoints"},
                  }}, {$match: {
                    playerTotalGames: {$gte: minGamesToReport}
                  }}, {$sort: {
                    playerAvgScorePoints: -1
                  }}, 
                ];

                const cursorAvgScorePointsPerPlayer = await collection.aggregate(aggregationAvgScorePointsPerPlayer);
                var avgScorePointsPerPlayer = [];
                await cursorAvgScorePointsPerPlayer.forEach(function(val) {
                    avgScorePointsPerPlayer.push(val);
                });
                retObj.avgScorePointsPerPlayer = avgScorePointsPerPlayer;
                // ********

                // players total
                console.log('report data - players total');
                const aggregationPlayersTotal = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$group: {
                    _id: null,
                    playersTotal: {$sum: "$humanPlayersCount"}
                  }}, {$project: {
                    _id: 0
                  }}
                ];

                const cursorPlayersTotal = await collection.aggregate(aggregationPlayersTotal);
                var playersTotal = null;
                await cursorPlayersTotal.forEach(function(val) {
                    playersTotal = val.playersTotal;
                });
                retObj.playersTotal = playersTotal;
                // ********

                // vanilla games
                console.log('report data - vanilla games');
                const aggregationVanillaGames = [{$match: {
                    gameStatus: {$eq: 2},
                  }}, {$match: vanillaGameRules
                }, {$group: {
                    _id: null,
                    gamesTotal: {
                      $sum: 1
                    }
                  }}
                ];

                const cursorVanillaGames = await collection.aggregate(aggregationVanillaGames);
                var vanillaGamesCount = null;
                await cursorVanillaGames.forEach(function(val) {
                    vanillaGamesCount = val.gamesTotal;
                });
                retObj.vanillaGamesCount = vanillaGamesCount;
                // ********

                // used rules
                console.log('report data - used rules');
                const aggregationUsedRules = [{$match: {
                    gameStatus: {$eq: 2},
                  }}, {$project: {
                    item: 1,
                    evenPromisesDisallowed: {$cond: [{ $eq: ["$evenPromisesAllowed", false]}, 1, 0]},
                    hiddenPromiseRound: {$cond: [{ $eq: ["$visiblePromiseRound", false]}, 1, 0]},
                    onlyTotalPromise: {$cond: [{ $eq: ["$onlyTotalPromise", true]}, 1, 0]},
                    mustTrump: {$cond: [{ $eq: ["$freeTrump", false]}, 1, 0]},
                    hiddenTrump: {$cond: [{ $eq: ["$hiddenTrump", true]}, 1, 0]},
                    speedPromise: {$cond: [{ $eq: ["$speedPromise", true]}, 1, 0]},
                    privateSpeedGame: {$cond: [{ $eq: ["$privateSpeedGame", true]}, 1, 0]},
                    opponentPromiseCardValue: {$cond: [{ $eq: ["$opponentPromiseCardValue", true]}, 1, 0]},
                    opponentGameCardValue: {$cond: [{ $eq: ["$opponentGameCardValue", true]}, 1, 0]},
                    showOnlyCardInCharge: {$cond: [{ $eq: ["$hiddenCardsMode", 1]}, 1, 0]},
                    showCardInChargeAndWinningCard: {$cond: [{ $eq: ["$hiddenCardsMode", 2]}, 1, 0]},
                  }}, {$group: {
                    _id: "$item",
                    evenPromisesDisallowedCount: {$sum: "$evenPromisesDisallowed"},
                    hiddenPromiseRoundCount: {$sum: "$hiddenPromiseRound"},
                    onlyTotalPromiseCount: {$sum: "$onlyTotalPromise"},
                    mustTrumpCount: {$sum: "$mustTrump"},
                    hiddenTrumpCount: {$sum: "$hiddenTrump"},
                    speedPromiseCount: {$sum: "$speedPromise"},
                    privateSpeedGameCount: {$sum: "$privateSpeedGame"},
                    opponentPromiseCardValueCount: {$sum: "$opponentPromiseCardValue"},
                    opponentGameCardValueCount: {$sum: "$opponentGameCardValue"},
                    showOnlyCardInChargeCount: {$sum: "$showOnlyCardInCharge"},
                    showCardInChargeAndWinningCardCount: {$sum: "$showCardInChargeAndWinningCard"},
                  }}
                ];

                const cursorUsedRules = await collection.aggregate(aggregationUsedRules);
                var usedRulesCount = {
                    evenPromisesDisallowedCount: null,
                    hiddenPromiseRoundCount: null,
                    onlyTotalPromiseCount: null,
                    mustTrumpCount: null,
                    hiddenTrumpCount: null,
                    speedPromiseCount: null,
                    privateSpeedGameCount: null,
                    opponentPromiseCardValueCount: null,
                    opponentGameCardValueCount: null,
                    showOnlyCardInChargeCount: null,
                    showCardInChargeAndWinningCardCount: null,
                };
                await cursorUsedRules.forEach(function(val) {
                    usedRulesCount.evenPromisesDisallowedCount = val.evenPromisesDisallowedCount;
                    usedRulesCount.hiddenPromiseRoundCount = val.hiddenPromiseRoundCount;
                    usedRulesCount.onlyTotalPromiseCount = val.onlyTotalPromiseCount;
                    usedRulesCount.mustTrumpCount = val.mustTrumpCount;
                    usedRulesCount.hiddenTrumpCount = val.hiddenTrumpCount;
                    usedRulesCount.speedPromiseCount = val.speedPromiseCount;
                    usedRulesCount.privateSpeedGameCount = val.privateSpeedGameCount;
                    usedRulesCount.opponentPromiseCardValueCount = val.opponentPromiseCardValueCount;
                    usedRulesCount.opponentGameCardValueCount = val.opponentGameCardValueCount;
                    usedRulesCount.showOnlyCardInChargeCount = val.showOnlyCardInChargeCount;
                    usedRulesCount.showCardInChargeAndWinningCardCount = val.showCardInChargeAndWinningCardCount;
                });
                retObj.usedRulesCount = usedRulesCount;
                // ********

                console.log(retObj);

                fn(retObj);
            });
            
            socket.on('get game report', async (data, fn) => {
                console.log('start to get game for report');
                var retObj = {
                    players: null,
                    points: null,
                    keeps: null,
                };
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(data.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
    
                var players = [];
                var totalPointsByPlayer = [];
                var startPointsArr = [0];
                var keepsArr = [];
                for (var i = 0; i < gameInDb.game.playerOrder.length; i++) {
                    players.push(gameInDb.game.playerOrder[i].name == null ? gameInDb.game.playerOrder[i] : gameInDb.game.playerOrder[i].name);
                    totalPointsByPlayer[i] = 0;
                    startPointsArr.push(0);
                    keepsArr.push(0);
                }
                retObj.players = players;
                
                var pointsArr = [];
                pointsArr.push(startPointsArr);
                for (var i = 0; i < gameInDb.game.rounds.length; i++) {
                    if (gameInDb.game.rounds[i].roundStatus != 2) break;
                    var pointsByRound = [i+1];
                    for (var j = 0; j < gameInDb.game.rounds[i].roundPlayers.length; j++) {
                        totalPointsByPlayer[j]+= gameInDb.game.rounds[i].roundPlayers[j].points;
                        pointsByRound.push(totalPointsByPlayer[j]);
                        if (gameInDb.game.rounds[i].roundPlayers[j].promise == gameInDb.game.rounds[i].roundPlayers[j].keeps) keepsArr[j]++;
                    }
                    pointsArr.push(pointsByRound);
                }
                retObj.points = pointsArr;
                retObj.keeps = keepsArr;
    
                fn(retObj);
            });
            
            socket.on('get average report', async (data, fn) => {
                console.log('start to get games');
                var averageReport = {
                    gamesPlayed: null,
                    averagePointsPerGames: null,
                };
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');

                // games played
                const aggregationA = [
                    {$match: {
                        gameStatus: {$eq: 2}
                    }},
                    {$unwind: {
                        path: "$humanPlayers",
                        preserveNullAndEmptyArrays: true
                    }},
                    {$group: {
                        _id: "$humanPlayers.name",
                        count: {$sum:1}
                    }},
                    {$sort: {
                        _id: 1
                    }}
                ];
                var cursor = await collection.aggregate(aggregationA);
    
                var games = [];
                await cursor.forEach(function(val) {
                    games.push(val);
                });
                averageReport.gamesPlayed = games;

                // average points, all games
                const aggregationC = [
                    {$match: {
                        gameStatus: {$eq: 2},
                    }},
                    {$project: {
                        "game.rounds.cardsPlayed": 0,
                        "game.playerOrder": 0
                    }},
                    {$unwind: {
                        path: "$humanPlayers",
                        preserveNullAndEmptyArrays: true
                    }},
                    {$group: {
                        _id: "$humanPlayers.name",
                        games: {
                             $push : "$$ROOT"
                        },
                        count: {$sum:1}
                    }},
                    {$sort: {
                        _id: 1
                    }}
                ];
                cursor = await collection.aggregate(aggregationC);
                games = [];
                await cursor.forEach(function(val) {
                    games.push({
                        _id: val._id,
                        avgAll: rf.averagePoints(val.games, val._id),
                        avgRegular: null,
                    });
                });
                // average points, regular games
                const aggregationB = [
                    {$match: {
                        gameStatus: {$eq: 2},
                        evenPromisesAllowed: {$in: [true, null]},
                        visiblePromiseRound: {$in: [true, null]},
                        onlyTotalPromise: {$in: [false, null]},
                        freeTrump: {$in: [true, null]},
                        hiddenTrump: {$in: [false, null]},
                        speedPromise: {$in: [false, null]},
                        privateSpeedGame: {$in: [false, null]},
                        opponentPromiseCardValue: {$in: [false, null]},
                        opponentGameCardValue: {$in: [false, null]},
                        hiddenCardsMode: {$in: [0, null]},
                    }},
                    {$project: {
                        "game.rounds.cardsPlayed": 0,
                        "game.playerOrder": 0
                    }},
                    {$unwind: {
                        path: "$humanPlayers",
                        preserveNullAndEmptyArrays: true
                    }},
                    {$group: {
                        _id: "$humanPlayers.name",
                        games: {
                             $push : "$$ROOT"
                        },
                        count: {$sum:1}
                    }},
                    {$sort: {
                        _id: 1
                    }}
                ];
                cursor = await collection.aggregate(aggregationB);
                await cursor.forEach(function(val) {
                    var avgRegular = rf.averagePoints(val.games, val._id);
                    for (var i = 0; i < games.length; i++) {
                        if (games[i]._id == val._id) {
                            games[i].avgRegular = avgRegular;
                            break;
                        }
                    }
                });
                averageReport.averagePointsPerGames = games;

                fn(averageReport);
            });


            socket.on('generate game statistics', async (data, fn) => {
                console.log('start to generate game statistics for '+data.gameId);
                var ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(data.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
                const gameStatistics = rf.generateGameStatistics(gameInDb.game);
                const options = { upsert: true };
                const updateDoc = {
                    $set: {
                        gameStatistics: gameStatistics,
                    }
                };
                const result = await collection.updateOne(query, updateDoc, options);

                console.log(gameStatistics);
                
                fn(gameStatistics);

            });

            socket.on('change nick', async (data, fn) => {
                console.log('start to change nick');
                var ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(data.gameId);
                const oldName = data.oldName;
                const newName = data.newName;
                console.log(' '+oldName+' to '+newName);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
                var newHumanPlayers = gameInDb.humanPlayers;
                var newGame = gameInDb.game;
                if (gameInDb != null) {
                    for (var i = 0; i < newHumanPlayers.length; i++) {
                        if (newHumanPlayers[i].name == oldName) {
                            newHumanPlayers[i].name = newName;
                            break;
                        }
                    }
                    for (var i = 0; i < newGame.playerOrder.length; i++) {
                        if (newGame.playerOrder[i] == oldName) {
                            newGame.playerOrder[i] = newName;
                        }
                        if (newGame.playerOrder[i].name && newGame.playerOrder[i].name == oldName) {
                            newGame.playerOrder[i].name = newName;
                        }
                    }
                    for (var i = 0; i < newGame.rounds.length; i++) {
                        for (var j = 0; j < newGame.rounds[i].roundPlayers.length; j++) {
                            if (newGame.rounds[i].roundPlayers[j].name == oldName) {
                                newGame.rounds[i].roundPlayers[j].name = newName;
                                break;
                            }
                        }
                        for (var j = 0; j < newGame.rounds[i].cardsPlayed.length; j++) {
                            for (var k = 0; k < newGame.rounds[i].cardsPlayed[j].length; k++) {
                                if (newGame.rounds[i].cardsPlayed[j][k].name == oldName) {
                                    newGame.rounds[i].cardsPlayed[j][k].name = newName;
                                    break;
                                }
                            }
                        }
                    }
                }
                const options = { upsert: true };
                const gameStatistics = rf.generateGameStatistics(newGame);
                const updateDoc = {
                    $set: {
                        humanPlayers: newHumanPlayers,
                        game: newGame,
                        gameStatistics: gameStatistics,
                    }
                };
                const result = await collection.updateOne(query, updateDoc, options);
                
                fn();
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
    io.to(gameInfo.id).emit('new chat line', 'New game begins!');

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

async function getPlayerPreviousStats(playerName, equalObj) {
    var stats = [];

    const evenPromisesAllowed = equalObj == null || equalObj.evenPromisesAllowed ? [true, null] : [false];
    const visiblePromiseRound = equalObj == null || equalObj.visiblePromiseRound ? [true, null] : [false];
    const onlyTotalPromise = equalObj == null || !equalObj.onlyTotalPromise ? [false, null] : [true];
    const freeTrump = equalObj == null || equalObj.freeTrump ? [true, null] : [false];
    const hiddenTrump = equalObj == null || !equalObj.hiddenTrump ? [false, null] : [true];
    const speedPromise = equalObj == null || !equalObj.speedPromise ? [false, null] : [true];
    const privateSpeedGame = equalObj == null || !equalObj.privateSpeedGame ? [false, null] : [true];
    const opponentPromiseCardValue = equalObj == null || !equalObj.opponentPromiseCardValue ? [false, null] : [true];
    const opponentGameCardValue = equalObj == null || !equalObj.opponentGameCardValue ? [false, null] : [true];
    const hiddenCardsMode = equalObj == null || equalObj.hiddenCardsMode == null || equalObj.hiddenCardsMode == 0 ? [0, null] : [equalObj.hiddenCardsMode];

    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    const match = equalObj == null
    ? {
        gameStatus: {$eq: 2},
        "humanPlayers.name": {$eq: playerName}
    }
    : {
        gameStatus: {$eq: 2},
        "humanPlayers.name": {$eq: playerName},
        humanPlayersCount: {$eq: equalObj.humanPlayersCount},
        startRound: {$eq: equalObj.startRound},
        turnRound: {$eq: equalObj.turnRound},
        endRound: {$eq: equalObj.endRound},
        evenPromisesAllowed: {$in: evenPromisesAllowed},
        visiblePromiseRound: {$in: visiblePromiseRound},
        onlyTotalPromise: {$in: onlyTotalPromise},
        freeTrump: {$in: freeTrump},
        hiddenTrump: {$in: hiddenTrump},
        speedPromise: {$in: speedPromise},
        privateSpeedGame: {$in: privateSpeedGame},
        opponentPromiseCardValue: {$in: opponentPromiseCardValue},
        opponentGameCardValue: {$in: opponentGameCardValue},
        hiddenCardsMode: {$in: hiddenCardsMode},
    };
    const aggregationA = [{$match: match
    }, {$sort: {
        "createDateTime": -1,
      }}, {$limit: 10}
    ];
    var cursor = await collection.aggregate(aggregationA);
    await cursor.forEach(function(gameInDb) {
        stats.push(rf.getGamePoints(gameInDb.game, playerName));
    });
    return stats;
}

async function getPlayerStats(playerName, equalObj) {
    var stats = null;

    const evenPromisesAllowed = equalObj == null || equalObj.evenPromisesAllowed ? [true, null] : [false];
    const visiblePromiseRound = equalObj == null || equalObj.visiblePromiseRound ? [true, null] : [false];
    const onlyTotalPromise = equalObj == null || !equalObj.onlyTotalPromise ? [false, null] : [true];
    const freeTrump = equalObj == null || equalObj.freeTrump ? [true, null] : [false];
    const hiddenTrump = equalObj == null || !equalObj.hiddenTrump ? [false, null] : [true];
    const speedPromise = equalObj == null || !equalObj.speedPromise ? [false, null] : [true];
    const privateSpeedGame = equalObj == null || !equalObj.privateSpeedGame ? [false, null] : [true];
    const opponentPromiseCardValue = equalObj == null || !equalObj.opponentPromiseCardValue ? [false, null] : [true];
    const opponentGameCardValue = equalObj == null || !equalObj.opponentGameCardValue ? [false, null] : [true];
    const hiddenCardsMode = equalObj == null || equalObj.hiddenCardsMode == null || equalObj.hiddenCardsMode == 0 ? [0, null] : [equalObj.hiddenCardsMode];

    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    const match = equalObj == null
    ? {
        gameStatus: {$in: [1, 2]},
        "humanPlayers.name": {$eq: playerName}
    }
    : {
        gameStatus: {$in: [1, 2]},
        "humanPlayers.name": {$eq: playerName},
        humanPlayersCount: {$eq: equalObj.humanPlayersCount},
        startRound: {$eq: equalObj.startRound},
        turnRound: {$eq: equalObj.turnRound},
        endRound: {$eq: equalObj.endRound},
        evenPromisesAllowed: {$in: evenPromisesAllowed},
        visiblePromiseRound: {$in: visiblePromiseRound},
        onlyTotalPromise: {$in: onlyTotalPromise},
        freeTrump: {$in: freeTrump},
        hiddenTrump: {$in: hiddenTrump},
        speedPromise: {$in: speedPromise},
        privateSpeedGame: {$in: privateSpeedGame},
        opponentPromiseCardValue: {$in: opponentPromiseCardValue},
        opponentGameCardValue: {$in: opponentGameCardValue},
        hiddenCardsMode: {$in: hiddenCardsMode},
    };
    const aggregationA = [{$match: match
    }, {$unwind: {
        path: "$game.rounds",
        includeArrayIndex: 'roundInd',
        preserveNullAndEmptyArrays: true
      }}, {$match: {
        "game.rounds.roundStatus": {$eq: 2},
      }}, {$unwind: {
        path: "$game.rounds.roundPlayers",
        preserveNullAndEmptyArrays: true
      }}, {$match: {
        "game.rounds.roundPlayers.name": {$eq: playerName},
      }}, {$addFields: {
        "roundPlayerName": "$game.rounds.roundPlayers.name",
        "roundPlayerPromise": "$game.rounds.roundPlayers.promise",
        "roundPlayerKeep": "$game.rounds.roundPlayers.keeps",
        "roundPlayerPoints": "$game.rounds.roundPlayers.points",
        "roundKept": { $eq: ["$game.rounds.roundPlayers.keeps", "$game.rounds.roundPlayers.promise"]}
      }}, {$project: {
        "roundPlayerName": 1,
        "roundPlayerPromise": 1,
        "roundPlayerKeep": 1,
        "roundPlayerPoints": 1,
        "roundKept": 1,
        "roundInd": 1,
        "createDateTime": 1
      }}, {$sort: {
        "createDateTime": -1,
        "roundInd": -1
      }}, {$limit: 100}, {$group: {
        _id: "$roundPlayerName",
        "avgPoints": {
          $avg: "$roundPlayerPoints",
        },
        "keeps": {
          $sum: {
            $cond: {
              if: {
                $eq: [ "$roundKept", true ]
              },
              then: 1,
              else: 0
            }
          }
        },
        "total": {$sum: 1}
      }}
    ];
    var cursor = await collection.aggregate(aggregationA);
    await cursor.forEach(function(stat) {
        stats = stat;
    });
    if (stats == null) {
        stats = {_id: playerName};
    }
    return stats;
}

function parseEqualObj(gameInDb) {
    return {
        humanPlayersCount: gameInDb.humanPlayersCount,
        startRound: gameInDb.startRound,
        turnRound: gameInDb.turnRound,
        endRound: gameInDb.endRound,
        evenPromisesAllowed: gameInDb.evenPromisesAllowed,
        visiblePromiseRound: gameInDb.visiblePromiseRound,
        onlyTotalPromise: gameInDb.onlyTotalPromise,
        freeTrump: gameInDb.freeTrump,
        hiddenTrump: gameInDb.hiddenTrump,
        speedPromise: gameInDb.speedPromise,
        privateSpeedGame: gameInDb.privateSpeedGame,
        opponentPromiseCardValue: gameInDb.opponentPromiseCardValue,
        opponentGameCardValue: gameInDb.opponentGameCardValue,
        hiddenCardsMode: gameInDb.hiddenCardsMode,
    }
}

async function getStatistics(gameInDb) {
    var equalObj = parseEqualObj(gameInDb);
    var statsObj = {
        playersKeeps: [],
        playersEqualKeeps: [],
    }
    for (var i = 0; i < gameInDb.game.playerOrder.length; i++) {
        statsObj.playersKeeps.push(await getPlayerStats(gameInDb.game.playerOrder[i].name, null));
        statsObj.playersEqualKeeps.push(await getPlayerStats(gameInDb.game.playerOrder[i].name, equalObj));
    }
    return statsObj;
}

async function getGamesStatistics(gameInDb, playerName) {
    var equalObj = parseEqualObj(gameInDb);
    var statsGamesObj = {
        playersAllGames: await getPlayerPreviousStats(playerName, null),
        playersEqualGames: await getPlayerPreviousStats(playerName, equalObj),
    }
    return statsGamesObj;
}

