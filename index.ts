const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    doLog2('server', 'listening on *:' + port, null, null, null);
});

app.use(express.static('static'))
app.use(express.static('node_modules/jquery/dist'))
app.use(express.static('node_modules/bootstrap/dist'))
app.use(express.static('node_modules/deck-of-cards/dist'))
app.use(express.static('node_modules/jquery-color-animation'))
app.use(express.static('node_modules/chart.js'))
app.use(express.static('node_modules/chartjs-plugin-annotation'))

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

        if (err) await doLog('server', null, err, null, null);
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
            doLog('connection', 'a user connected', null, null, null);
            socket.on('disconnect', () => {
                var gameId = null;
                var userName = sm.getClientNameFromMap(socket.id);
                const mapping = sm.userSocketIdMap.get(userName);
                if (mapping != null && mapping.games != null) {
                    const gameIds = Array.from(mapping.games.values());
                    gameId = gameIds != null && gameIds.length > 0 ? gameIds[0] : null;
                }
                if (userName == null) userName = 'unknown';
                var chatLine = 'player ' + userName + ' disconnected';
                doLog('chat', chatLine, null, null, null);
                if (gameId != null) {
                    io.to(gameId).emit('new chat line', chatLine);
                }
                sm.removeClientFromMap(userName, socket.id, gameId);
            });

            socket.on('write chat', async (chatObj, fn) => {
                const chatLine = chatObj.myName + ': ' + chatObj.chatLine;
                io.to(chatObj.gameId).emit('new chat line', chatLine);
                fn();
            });
    
            socket.on('check game', async (gameCheck) => {
                await doLog('check game', null, gameCheck, null, null);
                const myId = gameCheck.myId;
                var gameFound = false;
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 1, // check first ongoing game
                                 };
                const games = collection.find(query);
                await games.forEach(function (game) {
                    game.humanPlayers.forEach(function(player) {
                        if (player.playerId == myId) {
                            doLog('check game', 'found game 1', null, null, null);
                            gameFound = true;
                            socket.join(game._id.toString());
                            sm.addClientToMap(player.name, socket.id, game._id.toString());
                            var chatLine = 'player ' + player.name + ' connected';
                            io.to(game._id.toString()).emit('new chat line', chatLine);
                            const gameInfo = pf.gameToGameInfo(game);
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
                            if (player.playerId == myId) {
                                doLog('check game', 'found game 0', null, null, null);
                                socket.join(game._id.toString());
                                sm.addClientToMap(player.name, socket.id, game._id.toString());
                                var chatLine = 'player ' + player.name + ' connected';
                                io.to(game._id.toString()).emit('new chat line', chatLine);
                                const gameInfo = pf.gameToGameInfo(game);
                                gameInfo.currentRound = 0;
                                gameInfo.reloaded = true;
                                socket.emit('promise made', gameInfo);
                            }
                        });
                    });
                }
            });

            socket.on('leave ongoing game', async (leaveGameObj, fn) => {
                const gameIdStr = leaveGameObj.gameId;
                const leaverIdStr = leaveGameObj.playerId;
                const retVal = {
                    leavingResult: 'NOTSET',
                    gameId: gameIdStr,
                }
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 1,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                if (game !== null) {
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId == leaverIdStr && game.humanPlayers[i].active) {
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: pf.deActivatePlayer(game.humanPlayers, leaverIdStr),
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                socket.leave(gameIdStr);
                                const leaverName = game.humanPlayers[i].name;
                                sm.removeClientFromMap(leaverName, socket.id, gameIdStr);
                                var chatLine = 'player ' + leaverName + ' has left the game';
                                io.to(gameIdStr).emit('new chat line', chatLine);
                                retVal.leavingResult = 'LEAVED';
                                chatLine = 'You can invite a new player to continue '+leaverName+'\'s game with these id\'s:'
                                io.to(gameIdStr).emit('new chat line', chatLine);
                                chatLine = 'GameId: '+gameIdStr;
                                io.to(gameIdStr).emit('new chat line', chatLine);
                                chatLine = 'PlayerId: '+leaverIdStr;
                                io.to(gameIdStr).emit('new chat line', chatLine);
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
                const gameIdStr = leaveGame.gameId;
                const retVal = {
                    leavingResult: 'NOTSET',
                    gameId: gameIdStr,
                    gameDeleted: false,
                }

                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                await doLog('leave game', null, game, gameIdStr, null);
                if (game !== null) {
                    const newHumanPlayers = [];
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
                            await doLog('leave game', null, result, gameIdStr, leaverName);
                            socket.leave(gameIdStr);
                            sm.removeClientFromMap(leaverName, socket.id, gameIdStr);
                            retVal.leavingResult = 'LEAVED';
                        }
                    }
                }
    
                fn(retVal);
    
                if (retVal.leavingResult == 'LEAVED') {
                    if (retVal.gameDeleted) {
                        io.emit('delete gameinfo', gameIdStr);
                    } else {
                        // let's update info to clients
                        const val = await collection.findOne(query);
                        const resultGameInfo = pf.gameToGameInfo(val);
        
                        io.emit('update gameinfo', resultGameInfo);
                    }
                }
            });

            socket.on('join game by id', async (joiningDetails, fn) => {
                const gameIdStr = joiningDetails.gameId;
                const newIdStr = joiningDetails.myId;
                const resultObj = {
                    joiningResult: 'NOTSET',
                    newName: null,
                    newId: newIdStr,
                    debugStr: 'no game or user found',
                }
                await doLog('join game by id', 'join game by id: ', joiningDetails, gameIdStr, null);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 1,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                if (game !== null) {
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId == newIdStr) {
                            const playAsName = game.humanPlayers[i].name;
                            if (game.humanPlayers[i].active) {
                                // let's check if player is disconnected
                                if (sm.isUserConnected(playAsName)) {
                                    // user is still in map if browser just closed
                                    // let's ping this player
                                    var ping = false;
                                    const sockets = sm.getSocketFromMap(playAsName);
                                    if (sockets != null) {
                                        for (var it = sockets.values(), val = null; val=it.next().value;) {
                                            if (val != undefined) {
                                                const socketId = val;
                                                ping = io.to(socketId).emit('hey', 'Are you there?');
                                                await doLog('join game by id', 'pinged socket '+socketId+' and result was: ', ping, gameIdStr, playAsName);
                                            }
                                        }
                                    }
                                    
                                    if (ping) {
                                        await doLog('join game by id', 'joining failed because user was active', null, gameIdStr, playAsName);
                                        resultObj.debugStr = 'user '+playAsName+' is still connected';
                                        break;
                                    }
                                }
                            }
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: pf.activatePlayer(game.humanPlayers, newIdStr),
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.matchedCount == 1) {
                                socket.join(gameIdStr);
                                sm.addClientToMap(playAsName, socket.id, gameIdStr);
                                var chatLine = 'player ' + playAsName + ' connected as new player';
                                io.to(gameIdStr).emit('new chat line', chatLine);
                                resultObj.joiningResult = 'OK';
                                resultObj.newName = playAsName;
                                resultObj.debugStr = 'join ok';
                                break;
                            }
                        }
                    }
                }

                fn(resultObj);
            });
    
            socket.on('join game', async (newPlayer, fn) => {
                var joiningResult = 'NOTSET';
                const gameIdStr = newPlayer.gameId;
                const myName = newPlayer.myName;
                await doLog('join game', null, newPlayer, gameIdStr, myName);
                const myId = newPlayer.myId;
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0,
                                _id: searchId,
                                password: newPlayer.gamePassword
                                 };
                const game = await collection.findOne(query);
                const retVal = {
                    joiningResult: null,
                    gameId: gameIdStr,
                }
                if (game !== null) {
                    if (game.humanPlayersCount > game.humanPlayers.length && game.adminName != myName) {
                        var nameFree = true;
                        var socketFree = true;
                        game.humanPlayers.forEach(function(player) {
                            if (player.name == myName) nameFree = false;
                            if (player.playerId == myId) socketFree = false;
                        });
    
                        if (nameFree && socketFree) {
                            var players = game.humanPlayers;
                            players.push({name: myName, playerId: myId, type: 'human', active: true, playerStats: await getGamesStatistics(game, myName)});
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: players,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                socket.join(gameIdStr);
                                sm.addClientToMap(myName, socket.id, gameIdStr);
                                var chatLine = 'player ' + myName + ' connected';
                                io.to(gameIdStr).emit('new chat line', chatLine);
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
    
                await doLog('join game', null, joiningResult, gameIdStr, myName);
                if (joiningResult == 'OK') {
                    // let's update info to clients
                    const val = await collection.findOne(query);
                    const resultGameInfo = pf.gameToGameInfo(val);
    
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
    
                await doLog('create game', null, gameOptions, null, null);
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
                    await doLog('create game', 'gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId, null, null, null);
                    socket.join(result.insertedId.toString());
                    sm.addClientToMap(gameOptions.adminName, socket.id, result.insertedId);
                    fn(result.insertedId);
                } else {
                    fn('NOT OK');
                }
            });
    
            socket.on('get round', async (getRound, fn) => {
                const gameIdStr = getRound.gameId;
                await doLog('get round', null, getRound, gameIdStr, null);
                const myId = getRound.myId;
                const roundInd = getRound.round;
    
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
    
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
                    const stats = (gameStarted || doReload || newRound || gameOver) ? await getStatistics(game) : null;
                    const playerRound = pf.roundToPlayer(myId, roundInd, game, stats, doReload, newRound, gameOver);
                    await doLog('get round', null, playerRound, gameIdStr, null);
        
                    fn(playerRound);
                }
            });

            socket.on('speedpromise', async (speedPromiseObj, fn) => {
                const gameIdStr = speedPromiseObj.gameId;
                await doLog('speedpromise', null, speedPromiseObj, gameIdStr, null);
                const myId = speedPromiseObj.myId;
                const roundInd = speedPromiseObj.roundInd;

                const resultObj = {
                    speedOk: false,
                    fullSpeedPromises: false,
                    round: null,
                    debug: null,
                }

                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const query = { gameStatus: 1,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null && gameInDb.speedPromise) {
                    const playerName = pf.getPlayerNameById(myId, gameInDb.humanPlayers);
                    for (var i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        var chkInd = 1 + i; // start from next to dealer
                        if (chkInd >= gameInDb.humanPlayersCount + gameInDb.botPlayersCount) chkInd-= (gameInDb.humanPlayersCount + gameInDb.botPlayersCount);
                        if (gameInDb.game.rounds[roundInd].roundPlayers[chkInd].promise == null) {
                            // this should be same as playerName
                            if (gameInDb.game.rounds[roundInd].roundPlayers[chkInd].name == playerName) {
                                // make speedpromise substraction
                                if (gameInDb.game.rounds[roundInd].roundPlayers[chkInd].speedPromisePoints >= -9) {
                                    gameInDb.game.rounds[roundInd].roundPlayers[chkInd].speedPromisePoints--;
                                    const options = { upsert: true };
                                    const updateDoc = {
                                        $set: {
                                            game: gameInDb.game,
                                        }
                                    };
                                    const result = await collection.updateOne(query, updateDoc, options);
                                    if (result.modifiedCount == 1) {
                                        resultObj.speedOk = true;
                                        resultObj.fullSpeedPromises = gameInDb.game.rounds[roundInd].roundPlayers[chkInd].speedPromisePoints == -10;

                                        var chatLine = playerName+' still thinking, speed promise: ' + gameInDb.game.rounds[roundInd].roundPlayers[chkInd].speedPromisePoints;
                                        io.to(gameIdStr).emit('new chat line', chatLine);

                                        const playerRound = pf.roundToPlayer(myId, roundInd, gameInDb, null, false, false, false);
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
                const gameIdStr = promiseDetails.gameId;
                await doLog('make promise', null, promiseDetails, gameIdStr, null);
                const myId = promiseDetails.myId;
                const roundInd = promiseDetails.roundInd;
                const promise = promiseDetails.promise;

                var promiseMadeOk = false;
    
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                
                const query = { gameStatus: 1,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null) {
                    const promiseInt = parseInt(promise, 10);
                    const playerName = pf.getPlayerNameById(myId, gameInDb.humanPlayers);
                    var speedPromisePoints = null;
                    for (var i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        var chkInd = 1 + i; // start from next to dealer
                        if (chkInd >= gameInDb.humanPlayersCount + gameInDb.botPlayersCount) chkInd-= (gameInDb.humanPlayersCount + gameInDb.botPlayersCount);
                        if (gameInDb.game.rounds[roundInd].roundPlayers[chkInd].promise == null) {
                            // this should be same as playerName
                            if (gameInDb.game.rounds[roundInd].roundPlayers[chkInd].name == playerName) {
                                // update promise
                                if (gameInDb.evenPromisesAllowed || !pf.isLastPromiser(gameInDb.game.rounds[roundInd]) || gameInDb.game.rounds[roundInd].totalPromise + promiseInt != gameInDb.game.rounds[roundInd].cardsInRound) {
                                    gameInDb.game.rounds[roundInd].roundPlayers[chkInd].promise = promiseInt;
                                    speedPromisePoints = gameInDb.game.rounds[roundInd].roundPlayers[chkInd].speedPromisePoints;
                                    if (gameInDb.game.rounds[roundInd].totalPromise == null) gameInDb.game.rounds[roundInd].totalPromise = 0;
                                    gameInDb.game.rounds[roundInd].totalPromise += promiseInt;
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
                    // await doLog(thisGame, gameIdStr, playerName);
        
                    const gameInfo = pf.gameToGameInfo(thisGame);
                    gameInfo.currentRound = roundInd;

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
                const gameIdStr = playDetails.gameId;
                await doLog('play card', null, playDetails, gameIdStr, null);
                const myId = playDetails.myId;
                const roundInd = playDetails.roundInd;
                const playedCard = playDetails.playedCard;

                var cardPlayedOk = false;
    
                var eventInfo = null;
                var eventInfoToCardPlayer = null;
    
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const statsCollection = database.collection('promisewebStats');
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                
                const query = { gameStatus: 1,
                    _id: searchId,
                    // password: newPlayer.gamePassword,
                     };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null) {
                    const playerName = pf.getPlayerNameById(myId, gameInDb.humanPlayers);
                    var gameOver = false;
                    var logStr1 = '';
                    var logStr2 = '';
                    if (pf.okToPlayCard(playedCard, playerName, gameInDb)) {
                        const roundInDb = pf.getCurrentRoundIndex(gameInDb);
                        if (roundInDb == roundInd) {
                            const round = gameInDb.game.rounds[roundInDb];
                            const play = pf.getCurrentPlayIndex(round);
                            const playerInd = pf.getPlayerIndexByName(playerName, round.roundPlayers)
                            const newHandObj = pf.takeCardOut(round.roundPlayers[playerInd].cards, playedCard);
                            var newHand = newHandObj.newHand;
                            round.cardsPlayed[play].push({ name: playerName, card: playedCard });
    
                            var gameAfterPlay = gameInDb.game;
                            gameAfterPlay.rounds[roundInDb].cardsPlayed = round.cardsPlayed;
                            gameAfterPlay.rounds[roundInDb].roundPlayers[playerInd].cards = newHand;
    
                            var newPlay = false;
                            var newRound = false;
                            var cardsInThisPlay = null;
                            const winnerName = pf.winnerOfPlay(gameAfterPlay.rounds[roundInDb].cardsPlayed[play], gameAfterPlay.rounds[roundInDb].trumpCard.suit);
                            var gameStatus = 1;

                            var gameStatistics = null;
                            
                            if (gameAfterPlay.rounds[roundInDb].cardsPlayed[play].length == gameInDb.humanPlayersCount + gameInDb.botPlayersCount) {
                                // this was the last card of the play
                                // let's see who wins this play and will be starter of the next play
                                newPlay = true;
                                const winnerIndex = pf.getPlayerIndexByName(winnerName, round.roundPlayers);
    
                                gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps++;

                                cardsInThisPlay = gameAfterPlay.rounds[roundInDb].cardsPlayed[play];

                                io.to(gameIdStr).emit('new chat line', winnerName+' won this play');
                                
                                if (gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps == gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].promise + 1) {
                                    if (!gameInDb.onlyTotalPromise) io.to(gameIdStr).emit('new chat line', winnerName+' Pitkäksi Oy:stä PÄIVÄÄ!');
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
                                            const speedPromiseTotal = pf.speedPromiseSolver(gameAfterPlay.rounds[roundInDb], i);
                                            gameAfterPlay.rounds[roundInDb].roundPlayers[i].points+= speedPromiseTotal;
                                            gameAfterPlay.rounds[roundInDb].roundPlayers[i].speedPromiseTotal = speedPromiseTotal;
                                        }

                                        const statsPlayer = {
                                            game: gameIdStr,
                                            played: new Date().getTime(),
                                            round: roundInDb,
                                            name: gameAfterPlay.rounds[roundInDb].roundPlayers[i].name,
                                            promise: gameAfterPlay.rounds[roundInDb].roundPlayers[i].promise,
                                            keeps: gameAfterPlay.rounds[roundInDb].roundPlayers[i].keeps,
                                            points: gameAfterPlay.rounds[roundInDb].roundPlayers[i].points,
                                            kept: gameAfterPlay.rounds[roundInDb].roundPlayers[i].promise == gameAfterPlay.rounds[roundInDb].roundPlayers[i].keeps,
                                            cardsInRound: gameAfterPlay.rounds[roundInDb].cardsInRound,
                                            playersInGame: gameAfterPlay.playerOrder.length,
                                        }
                                        const statsResult = await statsCollection.insertOne(statsPlayer);
                                        await doLog('play card', 'statsResult inserted ' + statsResult.insertedCount + ' with _id: ' + statsResult.insertedId, null, gameIdStr, playerName);
                                    }
    
                                    if (gameAfterPlay.rounds.length == roundInDb + 1) {
                                        // this was the last round of the game
                                        gameOver = true;
                                        gameStatus = 2;
                                        io.to(gameIdStr).emit('new chat line', 'GAME OVER!');
                                    } else {
                                        // start next round
                                        gameAfterPlay.rounds[roundInDb+1].roundStatus = 1;
                                        io.to(gameIdStr).emit('new chat line', 'New round starts...');
                                        io.to(gameIdStr).emit('new chat line', '... with '+ gameAfterPlay.playerOrder[gameAfterPlay.rounds[roundInDb+1].dealerPositionIndex].name +' as a dealer!');
                                    }
                                } else {
                                    // start next play
                                    gameAfterPlay.rounds[roundInDb].cardsPlayed.push([]);
                                }
                            }

                            // let's update game statistics after every card hit
                            gameStatistics = rf.generateGameStatistics(gameAfterPlay, gameOver);
    
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
                                    newPlay: newPlay,
                                    winnerName: newPlay ? winnerName : null,
                                    newRound: newRound,
                                    gameOver: gameOver,
                                    cardsInThisPlay: cardsInThisPlay,
                                    eventInfoType: 'common',
                                };

                                eventInfoToCardPlayer = {
                                    playedCard: playedCard,
                                    cardPlayedBy: playerName,
                                    newPlay: newPlay,
                                    winnerName: newPlay ? winnerName : null,
                                    newRound: newRound,
                                    gameOver: gameOver,
                                    cardsInThisPlay: cardsInThisPlay,
                                    eventInfoType: 'cardplayer',
                                };
                            }

                            logStr1 = 'cardPlayedOk, round: '+roundInDb+', play: '+play+', sending gameInfo to all other players than the one who just played card '+playedCard.suit+' '+playedCard.rank;
                            logStr2 = 'cardPlayedOk, round: '+roundInDb+', play: '+play+', sending gameInfo to the player who just played card '+playedCard.suit+' '+playedCard.rank;
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
                        // await doLog(thisGame, null, null);
            
                        const gameInfo = pf.gameToGameInfo(thisGame);
                        gameInfo.currentRound = roundInd;
                        gameInfo.eventInfo = eventInfo;

                        // this gameInfo to all other players than the one who just played card
                        await doLog('play card', logStr1, gameInfo, gameIdStr, playerName);
                        socket.to(gameInfo.id).emit('card played', gameInfo);
                        
                        // this gameInfo to the player who just played card
                        gameInfo.eventInfo = eventInfoToCardPlayer;
                        await doLog('play card', logStr2, gameInfo, gameIdStr, playerName);
                        fn(gameInfo);
                        //socket.emit('card played', gameInfo);
            
                    }
                }
            });
    
            socket.on('get games', async (data, fn) => {
                await doLog('get games', 'start to get games', null, null, null);
                const myId = data.myId;
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0 };
                const cursor = await collection.find(query);
    
                const games = [];
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
                        imInThisGame: pf.imInThisGame(val.humanPlayers, myId)
                    });
                });
    
                fn(games);
                // await doLog(games, null, null);
            });

            /* reporting functions */

            socket.on('get games for report', async (data, fn) => {
                await doLog('get games for report', 'start to get games for report', null, null, null);
                const database = mongoUtil.getDb();

                const games = [];
                const gameIds = [];
                const queryStatsGamesAggregation = [{$group: {
                    _id: "$game",
                  }}
                ];
                const statsCollection = database.collection('promisewebStats');
                const cursorStatGames = await statsCollection.aggregate(queryStatsGamesAggregation);
                await cursorStatGames.forEach(function (game) {
                    const gameIdStr = game._id.toString();
                    games[gameIdStr] = [];
                    gameIds.push(gameIdStr);
                });

                for (var i = 0; i < gameIds.length; i++) {
                    const gameIdStr = gameIds[i];
                    // await doLog(gameIdStr);
                    const queryStatsGamesPlayersAggregation = [{$match: {
                        game: gameIdStr,
                    }},{$group: {
                        _id: "$name",
                      }}
                    ];
                    const cursorStatGamePlayers = await statsCollection.aggregate(queryStatsGamesPlayersAggregation);
                    await cursorStatGamePlayers.forEach(function (player) {
                        games[gameIdStr].push(player._id);
                    });
                    // await doLog(games[gameIdStr]);
                }

                const collection = database.collection('promiseweb');
                const queryAggregation = [{$match: {
                    gameStatus: {$eq: 2}
                  }}, {$sort: {
                   createDateTime : -1
                  }}
                ];
                const cursor = await collection.aggregate(queryAggregation);
                const retArr = [];
                await cursor.forEach(function(val) {
                    const gameIdStr = val._id.toString();
                    const statNames = games[gameIdStr] != null ? games[gameIdStr] : [];
    
                    retArr.push({
                        id: gameIdStr,
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
                        playerNameErrors: pf.checkPlayerNames(val, statNames),
                    });
                });
    
                fn(retArr);
            });

            socket.on('get report data', async (data, fn) => {
                await doLog('get report data', 'start to get report data', null, null, null);
                const retObj = {
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
                    playerCount: null,
                    playerWinPercentage: null,
                    meltingGame: null,
                    spurtingGame: null,
                    avgPercentagePoints: null,
                };

                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');

                // game count
                await doLog('get report data', 'report data - game count', null, null, null);
                const queryGameCount = { gameStatus: 2 };
                const gameCount = await collection.countDocuments(queryGameCount);
                retObj.gamesPlayed = gameCount;
                // ********

                // rounds played
                await doLog('get report data', 'report data - rounds played', null, null, null);
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
                await doLog('get report data', 'report data - games played per player', null, null, null);
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
                const gamesPlayed = [];
                await cursorGamesPlayed.forEach(function(val) {
                    gamesPlayed.push(val);
                });
                retObj.mostGamesPlayed = gamesPlayed;
                // ********

                // average points per player
                await doLog('get report data', 'report data - average points per player', null, null, null);
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
                const avgPointsPerPlayer = [];
                await cursorAvgPoints.forEach(function(val) {
                    avgPointsPerPlayer.push(val);
                });
                retObj.avgPointsPerPlayer = avgPointsPerPlayer;
                // ********

                // average keep percentage per player
                await doLog('get report data', 'report data - average keep percentage per player', null, null, null);
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
                const avgKeepPercentagePerPlayer = [];
                try {
                    await cursorAvgKeepPercentage.forEach(function(val) {
                        avgKeepPercentagePerPlayer.push(val);
                    });
                } catch (e) {
                    await doLog('get report data', null, e, null, null);
                }
                retObj.avgKeepPercentagePerPlayer = avgKeepPercentagePerPlayer;
                // ********

                // total points per player
                await doLog('get report data', 'report data - total points per player', null, null, null);
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
                const totalPointsPerPlayer = [];
                await cursorTotalPointsPerPlayer.forEach(function(val) {
                    totalPointsPerPlayer.push(val);
                });
                retObj.totalPointsPerPlayer = totalPointsPerPlayer;
                // ********

                // total wins per player
                await doLog('get report data', 'report data - total wins per player', null, null, null);
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
                const playerTotalWins = [];
                await cursorPlayerTotalWins.forEach(function(val) {
                    playerTotalWins.push(val);
                });
                retObj.playerTotalWins = playerTotalWins;
                // ********

                // win percentage per player
                const playerWinPercentageTmp = [];
                for (var i = 0; i < playerTotalWins.length; i++) {
                    const winPercentageName = playerTotalWins[i]._id;
                    const winPercentageWins = playerTotalWins[i].playerTotalWins;
                    for (var j = 0; j < gamesPlayed.length; j++) {
                        if (gamesPlayed[j]._id == winPercentageName) {
                            playerWinPercentageTmp.push({
                                _id: winPercentageName,
                                winPercentage: winPercentageWins/gamesPlayed[j].count,
                            });
                        }
                    }
                }
                const playerWinPercentage = playerWinPercentageTmp.sort(sortWinPercentage);
                retObj.playerWinPercentage = playerWinPercentage;
                // ********

                // average score points per player
                await doLog('get report data', 'report data - average score points per player', null, null, null);
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
                const avgScorePointsPerPlayer = [];
                await cursorAvgScorePointsPerPlayer.forEach(function(val) {
                    avgScorePointsPerPlayer.push(val);
                });
                retObj.avgScorePointsPerPlayer = avgScorePointsPerPlayer;
                // ********

                // players average percentage points
                await doLog('get report data', 'report data - average percentage points', null, null, null);
                const aggregationPlayerPercentagePointsTotal = [{$match: {
                    gameStatus: {
                      $eq: 2
                    }
                  }}, {$unwind: {
                    path: "$gameStatistics.playersStatistics",
                    preserveNullAndEmptyArrays: false
                  }}, {$addFields: {
                    "gameStatistics.playersStatistics.pointPercentages": {$divide: ["$gameStatistics.playersStatistics.totalPoints", "$gameStatistics.winnerPoints"]}
                  }}, {$group: {
                    _id: "$gameStatistics.playersStatistics.playerName",
                    playerTotalGames: {$sum: 1},
                    playerAvgPercentPoints: {$avg: "$gameStatistics.playersStatistics.pointPercentages"},
                  }}, {$match: {
                    playerTotalGames: {$gte: minGamesToReport}
                  }}, {$sort: {
                    playerAvgPercentPoints: -1
                  }}
                ];

                const cursorPlayerPercentagePointsTotal = await collection.aggregate(aggregationPlayerPercentagePointsTotal);
                const playersPercentagePointsTotal = [];
                try {
                    await cursorPlayerPercentagePointsTotal.forEach(function(val) {
                        playersPercentagePointsTotal.push(val);
                    });
                } catch (err) {
                    await doLog('get report data', null, err, null, null);
                }
                retObj.avgPercentagePoints = playersPercentagePointsTotal;
                // ********

                // players total
                await doLog('get report data', 'report data - players total', null, null, null);
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

                // players count
                await doLog('get report data', 'report data - players count', null, null, null);
                const aggregationPlayerCount = [{$match: {
                    gameStatus: {$eq: 2},
                  }}, {$group: {
                    _id: "$humanPlayersCount",
                    lkm: {$sum: 1}
                  }}
                ];

                const cursorPlayerCount = await collection.aggregate(aggregationPlayerCount);
                const playerCount = {
                    threePlayers: 0,
                    fourPlayers: 0,
                    fivePlayers: 0,
                    sixPlayers: 0,
                };
                await cursorPlayerCount.forEach(function(val) {
                    if (val._id == 3) playerCount.threePlayers = val.lkm;
                    if (val._id == 4) playerCount.fourPlayers = val.lkm;
                    if (val._id == 5) playerCount.fivePlayers = val.lkm;
                    if (val._id == 6) playerCount.sixPlayers = val.lkm;
                });
                retObj.playerCount = playerCount;
                // ********

                // melter
                await doLog('get report data', 'report data - melter', null, null, null);
                const aggregationMeltingGame = [{$match: {
                    gameStatus: {$eq: 2}
                  }}, {$sort: {
                    "gameStatistics.spurtAndMelt.meltGap": -1,
                    // "gameStatistics.spurtAndMelt.meltFrom": -1,
                  }}, {$limit: 1}, {$project: {
                    game: 0
                  }}
                ];
                
                const cursorMeltingGame = await collection.aggregate(aggregationMeltingGame);
                var meltingGame = null;
                try {
                    await cursorMeltingGame.forEach(function(val) {
                        meltingGame = val;
                    });
                } catch (err) {
                    await doLog('get report data', null, err, null, null);
                }
                retObj.meltingGame = meltingGame;
                // ********

                // spurter
                await doLog('get report data', 'report data - spurter', null, null, null);
                const aggregationSpurtingGame = [{$match: {
                    gameStatus: {$eq: 2}
                  }}, {$sort: {
                    "gameStatistics.spurtAndMelt.spurtGap": -1,
                    // "gameStatistics.spurtAndMelt.spurtFrom": -1,
                  }}, {$limit: 1}, {$project: {
                    game: 0
                  }}
                ];

                const cursorSpurtingGame = await collection.aggregate(aggregationSpurtingGame);
                var spurtingGame = null;
                try {
                    await cursorSpurtingGame.forEach(function(val) {
                        spurtingGame = val;
                    });
                } catch (err) {
                    await doLog('get report data', null, err, null, null);
                }
                retObj.spurtingGame = spurtingGame;
                // ********

                // vanilla games
                await doLog('get report data', 'report data - vanilla games', null, null, null);
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
                await doLog('get report data', 'report data - used rules', null, null, null);
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
                const usedRulesCount = {
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

                await doLog('get report data', null, retObj, null, null);

                fn(retObj);
            });
            
            socket.on('get game report', async (data, fn) => {
                const gameIdStr = data.gameId;
                await doLog('get game report', 'get game report', null, gameIdStr, null);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
   
                await doLog('get game report', null, gameInDb, null, null);
                const retObj = rf.getGameReport(gameInDb.game);
                fn(retObj);
            });
            
            socket.on('update all game reports', async (data, fn) => {
                await doLog('update all game reports', 'start to update all game reports', null, null, null);
                const updatedIds = [];
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                };
                const gamesInDb = await collection.find(query);
                await gamesInDb.forEach(async function (gameInDb) {
                    const gameId = gameInDb._id;
                    // await doLog(gameId.toString(), null, null);
                    const gameStatistics = rf.generateGameStatistics(gameInDb.game, true);

                    const updateQuery = { _id: gameId, gameStatus: 2};
                    const options = { upsert: true };
                    const updateDoc = {
                        $set: {
                            gameStatistics: gameStatistics,
                        }
                    };
                    const result = await collection.updateOne(updateQuery, updateDoc, options);
                    if (result.modifiedCount == 1) {
                        updatedIds.push(gameId.toString());
                        // await doLog(' updated', null, null);
                    }
                });

                fn(updatedIds);
            });
            
            socket.on('get average report', async (data, fn) => {
                await doLog('get average report', 'start to get games for average report', null, null, null);
                const averageReport = {
                    gamesPlayed: null,
                    averagePointsPerGames: null,
                };
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');

                // games played
                await doLog('get average report', ' ... games played', null, null, null);
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
                const cursorA = await collection.aggregate(aggregationA);
    
                const gamesPlayed = [];
                await cursorA.forEach(function(val) {
                    gamesPlayed.push(val);
                });
                averageReport.gamesPlayed = gamesPlayed;

                // average points, all games
                await doLog('get average report', ' ... avg points, all games', null, null, null);
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
                const cursorC = await collection.aggregate(aggregationC, { allowDiskUse: true });
                const averagePointsPerGames = [];
                await cursorC.forEach(function(val) {
                    averagePointsPerGames.push({
                        _id: val._id,
                        avgAll: rf.averagePoints(val.games, val._id),
                        avgRegular: null,
                    });
                });

                // average points, regular games
                await doLog('get average report', ' ... avg points, regular games', null, null, null);
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
                const cursorB = await collection.aggregate(aggregationB, { allowDiskUse: true });
                await cursorB.forEach(function(val) {
                    for (var i = 0; i < averagePointsPerGames.length; i++) {
                        if (averagePointsPerGames[i]._id == val._id) {
                            averagePointsPerGames[i].avgRegular = rf.averagePoints(val.games, val._id);
                            break;
                        }
                    }
                });
                averageReport.averagePointsPerGames = averagePointsPerGames;

                fn(averageReport);
            });


            socket.on('generate game statistics', async (data, fn) => {
                const gameIdStr = data.gameId;
                await doLog('generate game statistics', 'start to generate game statistics for '+gameIdStr, null, gameIdStr, null);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
                const gameStatistics = rf.generateGameStatistics(gameInDb.game, true);
                const options = { upsert: true };
                const updateDoc = {
                    $set: {
                        gameStatistics: gameStatistics,
                    }
                };
                const result = await collection.updateOne(query, updateDoc, options);

                // await doLog(gameStatistics, null, null);
                
                fn(gameStatistics);

            });

            socket.on('change nick', async (data, fn) => {
                const gameIdStr = data.gameId;
                await doLog('change nick', 'start to change nick', null, gameIdStr, null);
                const ObjectId = require('mongodb').ObjectId;
                const oldName = data.oldName;
                const newName = data.newName;

                await doLog('change nick', ' game database '+oldName+' to '+newName, null, gameIdStr, null);
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
                const newHumanPlayers = gameInDb.humanPlayers;
                const newGame = gameInDb.game;
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
                const gameStatistics = rf.generateGameStatistics(newGame, true);
                const updateDoc = {
                    $set: {
                        humanPlayers: newHumanPlayers,
                        game: newGame,
                        gameStatistics: gameStatistics,
                    }
                };
                const result = await collection.updateOne(query, updateDoc, options);
                
                await doLog('change nick', ' stats database '+oldName+' to '+newName, null, gameIdStr, null);
                const updateStatsDocQuery = {
                        name: oldName,
                        game: gameIdStr,
                }
                const updateStatsDocSet = {
                    $set: {
                        name: newName,
                    }
                };
                const collectionStats = database.collection('promisewebStats');
                const resultStats = await collectionStats.updateMany(updateStatsDocQuery, updateStatsDocSet);

                fn();
            });
            
        });
    });
} catch (error) {
    const err = JSON.stringify(error);
    doLog2('server', 'Error while connecting to MongoDB: ' + err, error, null, null);
}

async function doLog(logTypeStr, logStr, logObj, gameId, playerName) {
    if (logStr != null) console.log(logStr);
    const logObject = {
        gameId: gameId,
        playerName: playerName,
        timestamp: new Date(),
        logTypeStr: logTypeStr,
        logStr: logStr,
        logObj: logObj,
    }
    try {
        const database = mongoUtil.getDb();
        const collection = database.collection('promisewebLogs');
        const result = await collection.insertOne(logObject);
    } catch (err) {
        console.log(err);
    }
}

function doLog2(logTypeStr, logStr, logObj, gameId, playerName) {
    const logObject = {
        gameId: gameId,
        playerName: playerName,
        timestamp: new Date(),
        logTypeStr: logTypeStr,
        logStr: logStr,
        logObj: logObj,
    }
    console.log(logObject);
}

async function startGame (gameInfo) {
    const gameIdStr = gameInfo.id;
    const players = pf.initPlayers(gameInfo);
    const rounds = pf.initRounds(gameInfo, players);
    const game = {
        playerOrder: players,
        rounds: rounds,
    };

    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    const ObjectId = require('mongodb').ObjectId;
    const searchId = new ObjectId(gameIdStr);

    const query = { _id: searchId };
    const options = { upsert: true };
    const updateDoc = {
        $set: {
            gameStatus: 1,
            game: game,
        }
    };
    const result = await collection.updateOne(query, updateDoc, options);
    await doLog('startGame', 'game started', null, null, null);

    await startRound(gameInfo, 0);

    io.to(gameIdStr).emit('start game', gameInfo);
    io.to(gameIdStr).emit('new chat line', 'New game begins!');

}

async function startRound(gameInfo, roundInd) {
    const gameIdStr = gameInfo.id;
    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    const ObjectId = require('mongodb').ObjectId;
    const searchId = new ObjectId(gameIdStr);

    const query = { _id: searchId };
    const thisGame = await collection.findOne(query);

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

    await doLog('startRound', 'round '+roundInd+' started', null, gameIdStr, null)
}

async function getPlayerPreviousStats(playerName, equalObj) {
    const stats = [];

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
    const cursor = await collection.aggregate(aggregationA);
    await cursor.forEach(function(gameInDb) {
        stats.push(rf.getGamePoints(gameInDb.game, playerName));
    });
    return stats;
}


function createAvgStatsArr(pStats, statCount) {
    const statArr = [];
    for (var i = 0; i < pStats.length; i++) {
        var keptSum = 0;
        var pointsSum = 0;
        var rounds = 0;
        for (var j = 0; (j < statCount && i+j < pStats.length); j++) {
            if (pStats[i+j].kept) keptSum++;
            pointsSum+= pStats[i+j].points;
            rounds++;
        }
        const keptPercentage = (100*keptSum/rounds).toFixed(1);
        const avgPoints = (pointsSum/rounds).toFixed(1);
        statArr[statCount-1-i] = {
            kPerc: keptPercentage,
            avgPoints: avgPoints,
        }
    }
    return statArr;
}

async function getPlayerAvgStats(players) {
    const avgRounds = 50;
    const retStats = {
        rounds: avgRounds,
        stats: null,
    }
    const stats = [];

    const database = mongoUtil.getDb();
    const collection = database.collection('promisewebStats');
    const match = {
        "name": {$in: players},
    };
    for (var i = 0; i < players.length; i++) {
        const pStats = [];
        const pName = players[i];

        const aggregationLiveStats = [{$match: { "name": {$eq: pName}}
        }, {$sort: {
          played: -1
        }}, {$limit: avgRounds*2
        }, {$project: {
            kept: 1,
            points: 1,
        }}
      ];
      const cursor = await collection.aggregate(aggregationLiveStats);
      await cursor.forEach(function(pStat) {
        pStats.push(pStat);
      });

      stats.push({
          name: pName,
          stats: createAvgStatsArr(pStats, avgRounds),
      });
    }
    retStats.stats = stats;
    return retStats;
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
    const players = [];
    for (var i = 0; i < gameInDb.game.playerOrder.length; i++) {
        players.push(gameInDb.game.playerOrder[i].name);
    }
    const statsAvgObj = await getPlayerAvgStats(players);
    return {
        statsAvgObj: statsAvgObj,
    }
}

async function getGamesStatistics(gameInDb, playerName) {
    const equalObj = parseEqualObj(gameInDb);
    const statsGamesObj = {
        playersAllGames: await getPlayerPreviousStats(playerName, null),
        playersEqualGames: await getPlayerPreviousStats(playerName, equalObj),
    }
    return statsGamesObj;
}

function sortWinPercentage(a, b) {
    if (a.winPercentage > b.winPercentage) return -1;
    if (a.winPercentage < b.winPercentage) return 1;
    return 0;
}
