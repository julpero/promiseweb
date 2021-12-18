const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('server listening on *:' + port);
});

const NodeCache = require( "node-cache" );
const myCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
var hash = require('object-hash');

const bcrypt = require('bcrypt');

const sanitizeFileName = require("sanitize-filename");

app.use(express.static('static'))
app.use(express.static('node_modules/bootstrap/dist'))
app.use(express.static('node_modules/deck-of-cards/dist'))
app.use(express.static('node_modules/chart.js'))
app.use(express.static('node_modules/chartjs-plugin-annotation'))
app.use(express.static('node_modules/velocity-animate'))

const pf = require(__dirname + '/promiseFunctions.js');
const rf = require(__dirname + '/reportFunctions.js');
const sm = require(__dirname + '/clientSocketMapper.js');
// const ai = require(__dirname + '/aiPlayer.js');

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

const promisewebCollection = 'promiseweb';
const statsCollection = 'promisewebStats';
const pingCollection = 'pingCollection';
const userCollection = 'userCollection';

try {
    var mongoUtil = require(__dirname + '/mongoUtil.js');
    mongoUtil.connectToServer(async function(err, client ) {

        if (err) console.log('server', err);

        app.get('/', (req, res) => {
            res.sendFile('index.html');
        });

        app.get('/ping', async (req, res) => {
            console.log('ping');
            const database = mongoUtil.getDb();
            const collection = database.collection(pingCollection);
            // const ObjectId = require('mongodb').ObjectId;
            // const pingId = new ObjectId();
            const pingObject = {
                pingTime: new Date().getTime()
            };
            const pingResult = await collection.insertOne(pingObject);
            const pingId = pingResult.insertedId;
            if (pingId == undefined) {
                throw new Error('ping insert failed');
            }
            const deleteResult = await collection.deleteOne({
                '_id': pingId
            });
            if (deleteResult.deletedCount != 1) {
                throw new Error('ping delete failed');
            }

            res.sendFile(__dirname +'/static/ping.html');
        });
        
        app.get('/css/faces/:face', (req, res) => {
            if (req.params && req.params.face) {
                const faceName = sanitizeFileName(req.params.face);
                try {
                    const options = {
                        root: __dirname + '/cardGallery/fourColorFaces/'
                    };
                    res.sendFile(faceName, options, function (err) {
                        if (err) {
                            console.log(err);
                            res.status(500).send('Request error, face ' + faceName + ' not found!');
                        } else {
                            console.log(faceName + ' send');
                        }
                    });
                } catch(error) {
                    // const err = JSON.stringify(error);
                    console.log(error);
                    res.status(500).send('Request error, face ' + faceName + ' not found!');
                }
            } else {
                res.status(500).send('Request error, no face!');
            }
        });
    
        io.on('connection', (socket) => {
            console.log('connection - a user connected');
            socket.on('disconnect', () => {
                var gameIdStr = null;
                var userName = sm.getClientNameFromMap(socket.id);
                const mapping = sm.userSocketIdMap.get(userName);
                if (mapping != null && mapping.games != null) {
                    const gameIds = Array.from(mapping.games.values());
                    gameIdStr = gameIds != null && gameIds.length > 0 ? gameIds[0] : null;
                }
                if (userName == null) userName = 'unknown';
                const chatLine = 'player ' + userName + ' disconnected';
                console.log('chat', chatLine);
                if (gameIdStr != null) {
                    io.to(gameIdStr).emit('new chat line', chatLine);
                }
                sm.removeClientFromMap(userName, socket.id, gameIdStr);
            });

            socket.on('write chat', async (chatObj, fn) => {
                const gameIdStr = chatObj.gameId;
                const chatLine = chatObj.myName + ': ' + chatObj.chatLine;
                io.to(gameIdStr).emit('new chat line', chatLine);
                fn();
            });
    
            socket.on('check game', async (gameCheck) => {
                console.log('check game', gameCheck);
                const myId = gameCheck.myId;
                var gameFound = false;
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    gameStatus: 1, // check first ongoing game
                };
                const games = collection.find(query);
                await games.forEach(function (game) {
                    game.humanPlayers.forEach(function(player) {
                        if (player.playerId == myId) {
                            const gameIdStr = game._id.toString();
                            console.log('check game - found game 1', gameIdStr);
                            gameFound = true;
                            socket.join(gameIdStr);
                            sm.addClientToMap(player.name, socket.id, gameIdStr);
                            var chatLine = 'player ' + player.name + ' connected';
                            io.to(gameIdStr).emit('new chat line', chatLine);
                            const gameInfo = pf.gameToGameInfo(game);
                            gameInfo.currentRound = pf.getCurrentRoundIndex(game);
                            gameInfo.reloaded = true;
                            socket.emit('card played', gameInfo);
                        }
                    });
                });
    
                if (!gameFound) {
                    const query = {
                        gameStatus: 0, // check promised ongoing game
                    };
                    const games = collection.find(query);
                    await games.forEach(function (game) {
                        game.humanPlayers.forEach(function(player) {
                            if (player.playerId == myId) {
                                const gameIdStr = game._id.toString();
                                console.log('check game - found game 0', gameIdStr);
                                socket.join(gameIdStr);
                                sm.addClientToMap(player.name, socket.id, gameIdStr);
                                var chatLine = 'player ' + player.name + ' connected';
                                io.to(gameIdStr).emit('new chat line', chatLine);
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
                const collection = database.collection(promisewebCollection);
                const query = {
                    _id: searchId,
                    gameStatus: 1,
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
                const collection = database.collection(promisewebCollection);
                const query = {
                    _id: searchId,
                    gameStatus: 0,
                };
                const game = await collection.findOne(query);
                console.log('leave game', game, gameIdStr);
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
                            console.log('leave game', result, gameIdStr, leaverName);
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
                console.log('join game by id - join game by id: ', joiningDetails, gameIdStr);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    _id: searchId,
                    gameStatus: 1,
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
                                                console.log('join game by id - pinged socket '+socketId+' and result was: ', ping, gameIdStr, playAsName);
                                            }
                                        }
                                    }
                                    
                                    if (ping) {
                                        console.log('join game by id - joining failed because user was active', gameIdStr, playAsName);
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
                var okToJoin = true;
                const gameIdStr = newPlayer.gameId;
                const myName = newPlayer.myName;
                const retVal = {
                    joiningResult: 'NOTSET',
                    gameId: gameIdStr,
                }
                
                const myId = newPlayer.myId;
                const database = mongoUtil.getDb();

                const secretConfig = require(__dirname + '/secret.config.js');
                const saltRounds = 10;
                const uCollection = database.collection(userCollection);
                const uQuery = {
                    playerName: { $eq: myName }
                };
                const userDoc = await uCollection.findOne(uQuery);
                if (userDoc == null) {
                    // first time user, check if both passwords match
                    if (newPlayer.myPass1 != newPlayer.myPass2) {
                        retVal.joiningResult = 'PWDMISMATCH';
                        okToJoin = false;
                    }
                    if (newPlayer.myPass2.length == 0) {
                        retVal.joiningResult = 'PWD2EMPTY';
                        okToJoin = false;
                    }
                    if (newPlayer.myPass1.length < 4) {
                        retVal.joiningResult = 'PWDSHORT';
                        okToJoin = false;
                    }

                    if (okToJoin) {
                        // create user
                        const passStr = newPlayer.myPass1+':'+secretConfig.secretPhase+':'+myName;
                        bcrypt.hash(passStr, saltRounds, async function(err, hash) {
                            const userDoc2 = {
                                playerName: myName,
                                passHash: hash,
                            };
                            await uCollection.insertOne(userDoc2);
                        });
                    }
                } else {
                    // check if password matches
                    const passStr = newPlayer.myPass1+':'+secretConfig.secretPhase+':'+myName;
                    const passOk = await bcrypt.compare(passStr, userDoc.passHash);
                    if (!passOk) {
                        retVal.joiningResult = 'PWDFAILS';
                        okToJoin = false;
                    }
                }

                // unset passwords
                newPlayer.myPass1 = null;
                newPlayer.myPass2 = null;

                // logging after nulling passwords
                console.log('join game', newPlayer, gameIdStr, myName);

                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const collection = database.collection(promisewebCollection);
                const query = {
                    _id: searchId,
                    gameStatus: 0,
                    password: newPlayer.gamePassword
                };
                const game = await collection.findOne(query);
                if (okToJoin && game !== null) {
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
                                retVal.joiningResult = 'OK';
                            }
                        } else if (!nameFree) {
                            retVal.joiningResult = 'NAMENOTOK';
                        } else if (!socketFree) {
                            retVal.joiningResult = 'SOCKETNOTOK';
                        } else {
                            retVal.joiningResult = 'UNKNOWNERROR';
                        }
                    } else {
                        retVal.joiningResult = 'NOTVALID';
                    }
                } else if (game == null) {
                    retVal.joiningResult = 'GAMENOTFOUND';
                }
    
                fn(retVal);
    
                console.log('join game', retVal.joiningResult, gameIdStr, myName);
                if (retVal.joiningResult == 'OK') {
                    // let's update info to clients
                    const val = await collection.findOne(query);
                    const resultGameInfo = pf.gameToGameInfo(val);
    
                    io.emit('update gameinfo', resultGameInfo);
    
                    if (resultGameInfo.humanPlayersCount == resultGameInfo.humanPlayers.length) {
                        // add bot players here
                        if (resultGameInfo.botPlayersCount > 0) {
                            // resultGameInfo.humanPlayers.concat(ai.getRandomAiPlayers(resultGameInfo.botPlayersCount));
                        }
                        // start game
                        await startGame(resultGameInfo);
                    }
                }
            });
    
            socket.on('create game', async (gameOptions, fn) => {
                var okToCreate = true;
                var errorCode = 'NOT OK';

                const adminUserName = gameOptions.adminName;
                const adminId = gameOptions.humanPlayers[0].playerId;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
    
                const query = {
                    gameStatus: { $lte: 1 },
                    'humanPlayers.playerId': { $eq: adminId }
                };
                const cursor = await collection.find(query);
                await cursor.forEach(function(val) {
                    for (var i = 0; i < val.humanPlayers.length; i++) {
                        if (val.humanPlayers[i].playerId == adminId) {
                            okToCreate = false;
                            return;
                        }
                    }
                });

                const secretConfig = require(__dirname + '/secret.config.js');
                const saltRounds = 10;
                const uCollection = database.collection(userCollection);
                const uQuery = {
                    playerName: { $eq: adminUserName }
                };
                const userDoc = await uCollection.findOne(uQuery);
                if (userDoc == null) {
                    // first time user, check if both passwords match
                    if (gameOptions.userPassword1 != gameOptions.userPassword2) {
                        errorCode = 'PWDMISMATCH';
                        okToCreate = false;
                    }
                    if (gameOptions.userPassword2.length == 0) {
                        errorCode = 'PWD2EMPTY';
                        okToCreate = false;
                    }
                    if (gameOptions.userPassword1.length < 4) {
                        errorCode = 'PWDSHORT';
                        okToCreate = false;
                    }

                    if (okToCreate) {
                        // create user
                        const passStr = gameOptions.userPassword1+':'+secretConfig.secretPhase+':'+adminUserName;
                        bcrypt.hash(passStr, saltRounds, async function(err, hash) {
                            const userDoc2 = {
                                playerName: adminUserName,
                                passHash: hash,
                            };
                            await uCollection.insertOne(userDoc2);
                        });
                    }
                } else {
                    // check if password matches
                    const passStr = gameOptions.userPassword1+':'+secretConfig.secretPhase+':'+adminUserName;
                    const passOk = await bcrypt.compare(passStr, userDoc.passHash);
                    if (!passOk) {
                        errorCode = 'PWDFAILS';
                        okToCreate = false;
                    }
                }

                // unset passwords
                gameOptions.userPassword1 = null;
                gameOptions.userPassword2 = null;

                // logging after nulled passwords
                console.log('create game', gameOptions);
                
                if (okToCreate) {
                    gameOptions.humanPlayers[0].playerStats = await getGamesStatistics(gameOptions, gameOptions.adminName);
                    const result = await collection.insertOne(gameOptions);
                    console.log('create game - gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId);
                    socket.join(result.insertedId.toString());
                    sm.addClientToMap(gameOptions.adminName, socket.id, result.insertedId);
                    fn(result.insertedId);
                } else {
                    fn(errorCode);
                }
            });
    
            socket.on('get round', async (getRound, fn) => {
                const getRoundHash = hash(getRound);
                const gameIdStr = getRound.gameId;
                const myId = getRound.myId;
                console.log('get round', getRoundHash, getRound, gameIdStr, myId);
                if (await myCache.has(getRoundHash)) {
                    console.log('get round - getRoundHash already exists', getRoundHash, gameIdStr, myId);
                    return;
                } else {
                    console.log('get round - insert getRoundHash to cache', getRoundHash, gameIdStr, myId);
                    await myCache.set(getRoundHash, 1);
                }
                const roundInd = getRound.round;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
    
                const gameStarted = getRound.gameStarted;
                const doReload = getRound.doReload;
                const newRound = getRound.newRound;
                const gameOver = getRound.gameOver;
                const gameStatus = gameOver ? 2 : 1;
                
                const query = {
                    _id: searchId,
                    gameStatus: gameStatus,
                    // password: newPlayer.gamePassword,
                     };
                const game = await collection.findOne(query);
                if (game != null) {
                    const stats = (gameStarted || doReload || newRound || gameOver) ? await getStatistics(game) : null;
                    const playerRound = pf.roundToPlayer(myId, roundInd, game, stats, doReload, newRound, gameOver);
                    console.log('get round', playerRound, gameIdStr);
        
                    fn(playerRound);
                }
            });

            socket.on('speedpromise', async (speedPromiseObj, fn) => {
                const gameIdStr = speedPromiseObj.gameId;
                console.log('speedpromise', speedPromiseObj, gameIdStr);
                const myId = speedPromiseObj.myId;
                const roundInd = speedPromiseObj.roundInd;

                const resultObj = {
                    speedOk: false,
                    fullSpeedPromises: false,
                    round: null,
                    debug: null,
                }

                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const query = {
                    _id: searchId,
                    gameStatus: 1,
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
                console.log('make promise', promiseDetails, gameIdStr);
                const myId = promiseDetails.myId;
                const roundInd = promiseDetails.roundInd;
                const promise = promiseDetails.promise;

                var promiseMadeOk = false;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                
                const query = {
                    _id: searchId,
                    gameStatus: 1,
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
        
                    const gameInfo = pf.gameToGameInfo(thisGame);
                    gameInfo.currentRound = roundInd;

                    if (promiseMadeOk) {
                        io.to(gameIdStr).emit('promise made', gameInfo);
                        
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
                        io.to(gameIdStr).emit('new chat line', chatLine);
                        // fn(gameInfo); // just DEBUG
                    } else {
                        socket.emit('promise made', gameInfo);
                    }
                }
            });
    
            socket.on('play card', async (playDetails, fn) => {
                const playDetailsHash = hash(playDetails);
                const gameIdStr = playDetails.gameId;
                const myId = playDetails.myId;
                console.log('play card', playDetailsHash, playDetails, gameIdStr, myId);
                if (await myCache.has(playDetailsHash)) {
                    console.log('play card - playDetailsHash already exists', playDetails, gameIdStr, myId);
                    return;
                } else {
                    console.log('play card - insert playDetailsHash to cache', playDetails, gameIdStr, myId);
                    await myCache.set(playDetailsHash, 1);
                }
                const roundInd = playDetails.roundInd;
                const playedCard = playDetails.playedCard;

                var cardPlayedOk = false;
    
                var eventInfo = null;
                var eventInfoToCardPlayer = null;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const statsCollection = database.collection('promisewebStats');
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                
                const query = {
                    _id: searchId,
                    gameStatus: 1,
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
                                        console.log('play card - statsResult inserted ' + statsResult.insertedCount + ' with _id: ' + statsResult.insertedId, gameIdStr, playerName);
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
            
                        const gameInfo = pf.gameToGameInfo(thisGame);
                        gameInfo.currentRound = roundInd;
                        gameInfo.eventInfo = eventInfo;

                        // this gameInfo to all other players than the one who just played card
                        console.log('play card', logStr1, gameInfo, gameIdStr, playerName);
                        socket.to(gameInfo.id).emit('card played', gameInfo);
                        
                        // this gameInfo to the player who just played card
                        gameInfo.eventInfo = eventInfoToCardPlayer;
                        console.log('play card', logStr2, gameInfo, gameIdStr, playerName);
                        fn(gameInfo);
                        //socket.emit('card played', gameInfo);
            
                    }
                }
            });
    
            socket.on('get games', async (data, fn) => {
                console.log('get games - start to get games');
                const myId = data.myId;
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    gameStatus: 0,
                };
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
            });

            /* reporting functions */

            socket.on('get games for report', async (data, fn) => {
                console.log('get games for report - start to get games for report');
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
                }

                const collection = database.collection(promisewebCollection);
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
                console.log('get report data - start to get report data');
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
                    cardsInHandCount: null,
                };

                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);

                // game count
                console.log('get report data - report data - game count');
                const queryGameCount = { gameStatus: 2 };
                const gameCount = await collection.countDocuments(queryGameCount);
                retObj.gamesPlayed = gameCount;
                // ********

                // rounds played
                console.log('get report data - report data - rounds played');
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
                console.log('get report data - report data - games played per player');
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
                console.log('get report data - report data - average points per player');
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
                console.log('get report data - report data - average keep percentage per player');
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
                    console.log('get report data', e);
                }
                retObj.avgKeepPercentagePerPlayer = avgKeepPercentagePerPlayer;
                // ********

                // total points per player
                console.log('get report data - report data - total points per player');
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
                console.log('get report data - report data - total wins per player');
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
                console.log('get report data - report data - average score points per player');
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
                console.log('get report data - report data - average percentage points');
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
                    console.log('get report data', err);
                }
                retObj.avgPercentagePoints = playersPercentagePointsTotal;
                // ********

                // players total
                console.log('get report data - report data - players total');
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
                console.log('get report data - report data - players count');
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

                // cards in hand count
                console.log('get report data - report data - cards in hand count');
                const aggregationCardsInHandCount = [
                    {
                      '$match': {
                        'gameStatus': {
                          '$eq': 2
                        }
                      }
                    }, {
                      '$unwind': {
                        'path': '$gameStatistics.playersStatistics', 
                        'preserveNullAndEmptyArrays': false
                      }
                    }, {
                      '$group': {
                        '_id': '$gameStatistics.playersStatistics.playerName', 
                        'trumps': {
                          '$sum': '$gameStatistics.playersStatistics.trumpsInGame'
                        }, 
                        'bigs': {
                          '$sum': '$gameStatistics.playersStatistics.bigsCardsInGame'
                        }, 
                        'smalls': {
                          '$sum': '$gameStatistics.playersStatistics.smallCardsInGame'
                        }, 
                        'others': {
                          '$sum': '$gameStatistics.playersStatistics.otherCardsInGame'
                        }, 
                        'games': {
                          '$sum': 1
                        }
                      }
                    }
                ];

                const cardsInHandCountPerPlayer = [];
                const cursorCardsInHandCount = await collection.aggregate(aggregationCardsInHandCount);
                await cursorCardsInHandCount.forEach(function(val) {
                    if (val.games > minGamesToReport) {
                        const totalCards = val.trumps + val.bigs + val.smalls + val.others;
                        val.trumpPercentage = val.trumps/totalCards;
                        val.bigPercentage = val.bigs/totalCards;
                        val.smallPercentage = val.smalls/totalCards;
                        val.otherPercentage = val.others/totalCards;
                        cardsInHandCountPerPlayer.push(val);
                    }
                });
                retObj.cardsInHandCount = cardsInHandCountPerPlayer;
                // ********

                // melter
                console.log('get report data - report data - melter');
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
                    console.log('get report data', err);
                }
                retObj.meltingGame = meltingGame;
                // ********

                // spurter
                console.log('get report data - report data - spurter');
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
                    console.log('get report data', err);
                }
                retObj.spurtingGame = spurtingGame;
                // ********

                // vanilla games
                console.log('get report data - report data - vanilla games');
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
                console.log('get report data - report data - used rules');
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

                console.log('get report data', retObj);

                fn(retObj);
            });
            
            socket.on('get game report', async (data, fn) => {
                const gameIdStr = data.gameId;
                console.log('get game report - get game report', gameIdStr);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    gameStatus: 2,
                    _id: searchId,
                };
                const gameInDb = await collection.findOne(query);
   
                console.log('get game report', gameInDb);
                const retObj = rf.getGameReport(gameInDb.game, gameInDb.gameStatistics.playersStatistics);
                fn(retObj);
            });
            
            socket.on('update all game reports', async (data, fn) => {
                console.log('update all game reports - start to update all game reports');
                const updatedIds = [];
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    gameStatus: 2,
                };
                const gamesInDb = await collection.find(query);
                await gamesInDb.forEach(async function (gameInDb) {
                    const gameId = gameInDb._id;
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
                        console.log('update all game reports - game '+gameId.toString()+' statistics updated');
                    }
                });

                console.log('update all game reports - all game reports updated');

                fn(updatedIds);
            });
            
            socket.on('get average report', async (data, fn) => {
                console.log('get average report - start to get games for average report');
                const averageReport = {
                    gamesPlayed: null,
                    averagePointsPerGames: null,
                };
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);

                // games played
                console.log('get average report ... games played');
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
                console.log('get average report ... avg points, all games');
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
                console.log('get average report ... avg points, regular games');
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
                console.log('generate game statistics - start to generate game statistics for %s', gameIdStr, gameIdStr);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    _id: searchId,
                    gameStatus: 2,
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

                fn(gameStatistics);

            });

            socket.on('change nick', async (data, fn) => {
                const gameIdStr = data.gameId;
                console.log('change nick - start to change nick', gameIdStr);
                const ObjectId = require('mongodb').ObjectId;
                const oldName = data.oldName;
                const newName = data.newName;

                console.log('change nick - game database %s to %s', oldName, newName, gameIdStr);

                const searchId = new ObjectId(gameIdStr);
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    _id: searchId,
                    gameStatus: 2,
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
                
                console.log('change nick - stats database %s to %s', oldName, newName, gameIdStr);
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
    console.log('server - Error while connecting to MongoDB: ' + err, error);
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
    const collection = database.collection(promisewebCollection);
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
    console.log('startGame - game started');

    await startRound(gameInfo, 0);

    io.to(gameIdStr).emit('start game', gameInfo);
    io.to(gameIdStr).emit('new chat line', 'New game begins!');

}

async function startRound(gameInfo, roundInd) {
    const gameIdStr = gameInfo.id;
    const database = mongoUtil.getDb();
    const collection = database.collection(promisewebCollection);
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

    console.log('startRound - round '+roundInd+' started', gameIdStr);
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
    const collection = database.collection(promisewebCollection);
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
