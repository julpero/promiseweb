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
                            players.push({name: newPlayer.myName, playerId: newPlayer.myId, type: 'human', active: true});
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
                    var playerName = pf.getPlayerNameById(getRound.myId, game.humanPlayers);
                    const stats = (pf.debugPlayerName(playerName) && (doReload || newRound || gameOver)) ? await getStatistics(game) : null;
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
                        evenPromisesAllowed: val.evenPromisesAllowed,
                        visiblePromiseRound: val.visiblePromiseRound,
                        onlyTotalPromise: val.onlyTotalPromise,
                        freeTrump: val.freeTrump,
                        hiddenTrump: val.hiddenTrump,
                        speedPromise: val.speedPromise,
                        privateSpeedGame: val.privateSpeedGame,
                        opponentPromiseCardValue: val.opponentPromiseCardValue,
                        opponentGameCardValue: val.opponentGameCardValue,
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
                    });
                });
    
                fn(games);
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

            socket.on('change nick', async (data, fn) => {
                console.log('start to change nick');
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(data.gameId);
                const oldName = data.oldName;
                const newName = data.newName;
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
                            break;
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
                const updateDoc = {
                    $set: {
                        humanPlayers: newHumanPlayers,
                        game: newGame,
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

async function getPlayerStats(playerName) {
    var stats = null;
    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    const aggregationA = [{$match: {
        gameStatus: {$in: [1, 2]},
        "humanPlayers.name": {$eq: playerName}
      }}, {$unwind: {
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
    return stats;
}

async function getStatistics(gameInDb) {
    var statsObj = {
        playersKeeps: [],
    }
    for (var i = 0; i < gameInDb.humanPlayers.length; i++) {
        statsObj.playersKeeps.push(await getPlayerStats(gameInDb.humanPlayers[i].name));
    }
    return statsObj;
}
