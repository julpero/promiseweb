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
const hash = require('object-hash');

const bcrypt = require('bcrypt');

const sanitizeFileName = require("sanitize-filename");

app.use(express.static('static'))
app.use(express.static('node_modules/bootstrap/dist'))
app.use(express.static('node_modules/deck-of-cards/dist'))
app.use(express.static('node_modules/chart.js'))
app.use(express.static('node_modules/chartjs-plugin-annotation'))
app.use(express.static('node_modules/velocity-animate'))
app.use(express.static('node_modules/tabulator-tables/dist'))

const pf = require(__dirname + '/promiseFunctions.js');
const rf = require(__dirname + '/reportFunctions.js');
const sm = require(__dirname + '/clientSocketMapper.js');
// const ai = require(__dirname + '/aiPlayer.js');

const GAMESTATUS = {
    Created: 0,
    OnGoing: 1,
    Played: 2,
    Dismissed: 99
}

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
const statsCollectionStr = 'promisewebStats';
const pingCollection = 'pingCollection';
const userCollection = 'userCollection';

const mongoUtil = require(__dirname + '/mongoUtil.js');
try {
    mongoUtil.connectToServer(async function(err) {

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
                let gameIdStr = null;
                let userName = sm.getClientNameFromMap(socket.id);
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
                let gameFound = false;
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const query = {
                    gameStatus: GAMESTATUS.OnGoing, // check first ongoing game
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
                            const chatLine = 'player ' + player.name + ' connected';
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
                        gameStatus: GAMESTATUS.Created,
                    };
                    const games = collection.find(query);
                    await games.forEach(function (game) {
                        game.humanPlayers.forEach(function(player) {
                            if (player.playerId == myId) {
                                const gameIdStr = game._id.toString();
                                console.log('check game - found game 0', gameIdStr);
                                socket.join(gameIdStr);
                                sm.addClientToMap(player.name, socket.id, gameIdStr);
                                const chatLine = 'player ' + player.name + ' connected';
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
                    gameStatus: GAMESTATUS.OnGoing,
                };
                const game = await collection.findOne(query);
                if (game !== null) {
                    for (let i = 0; i < game.humanPlayers.length; i++) {
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
                                let chatLine = 'player ' + leaverName + ' has left the game';
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
                    let activePlayersInGame = 0;
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
                                gameStatus: GAMESTATUS.Dismissed,
                            }
                        }
                        await collection.updateOne(query, updateDoc, options);
                    }
                }
    
                fn(retVal);
            });
    
            socket.on('delete game', async (deleteGameObj, fn) => {
                const gameIdStr = deleteGameObj.gameToDelete;
                const deleteFromDB = deleteGameObj.deleteFromDB;
                const adminUser = deleteGameObj.adminUser;
                const adminPass = deleteGameObj.adminPass;
                const retObj = {
                    passOk: false,
                    deleteOk: false
                }
                retObj.passOk = await checkAdminAccess(adminUser, adminPass);
                if (retObj.passOk) {
                    const ObjectId = require('mongodb').ObjectId;
                    const searchId = new ObjectId(gameIdStr);
                    const database = mongoUtil.getDb();
                    const collection = database.collection(promisewebCollection);
                    const query = {
                        _id: searchId
                    };
                    const game = await collection.findOne(query);
                    if (game !== null) {
                        if (deleteFromDB) {
                            const deleteBaseGame = await collection.deleteOne(query);
                            if (deleteBaseGame.deletedCount == 1) {
                                console.log('game '+ gameIdStr + ' deleted from main game db');
                                retObj.deleteOk = true;
                            }
                            const statsCollection = database.collection(statsCollectionStr);
                            const statsQuery = {
                                gameId: gameIdStr
                            };
                            const deleteStats = await statsCollection.deleteMany(statsQuery);
                            if (deleteStats.deletedCount > 0) {
                                console.log('game '+ gameIdStr + ' deleted from statistics db');
                            }
                        } else {
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    gameStatus: GAMESTATUS.Dismissed,
                                }
                            }
                            await collection.updateOne(query, updateDoc, options);
                            console.log('game '+ gameIdStr + ' set dismissed');
                            retObj.deleteOk = true;
                        }
                    }
                }
    
                fn(retObj);
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
                    gameStatus: GAMESTATUS.Created,
                };
                const game = await collection.findOne(query);
                console.log('leave game', game, gameIdStr);
                if (game !== null) {
                    const newHumanPlayers = [];
                    let leaverName = "";
                    for (let i = 0; i < game.humanPlayers.length; i++) {
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
                                gameStatus: retVal.gameDeleted ? GAMESTATUS.Dismissed : GAMESTATUS.Created, // if no more players in the game, set gamestatus to 99
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
                    gameStatus: GAMESTATUS.OnGoing,
                };
                const game = await collection.findOne(query);
                if (game !== null) {
                    for (let i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId == newIdStr) {
                            const playAsName = game.humanPlayers[i].name;
                            if (game.humanPlayers[i].active) {
                                // let's check if player is disconnected
                                if (sm.isUserConnected(playAsName)) {
                                    // user is still in map if browser just closed
                                    // let's ping this player
                                    let ping = false;
                                    const sockets = sm.getSocketFromMap(playAsName);
                                    if (sockets != null) {
                                        // eslint-disable-next-line no-cond-assign
                                        for (let it = sockets.values(), val = null; val=it.next().value;) {
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
                                const chatLine = 'player ' + playAsName + ' connected as new player';
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
                let okToJoin = true;
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
                    gameStatus: GAMESTATUS.Created,
                    password: newPlayer.gamePassword
                };
                const game = await collection.findOne(query);
                if (okToJoin && game !== null) {
                    if (game.humanPlayersCount > game.humanPlayers.length && game.adminName != myName) {
                        let nameFree = true;
                        let socketFree = true;
                        game.humanPlayers.forEach(function(player) {
                            if (player.name == myName) nameFree = false;
                            if (player.playerId == myId) socketFree = false;
                        });
    
                        if (nameFree && socketFree) {
                            const players = game.humanPlayers;
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
                                const chatLine = 'player ' + myName + ' connected';
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

            socket.on('observe game', async (observeGameOptions, fn) => {
                console.log(observeGameOptions);
                fn();
            });
    
            socket.on('create game', async (gameOptions, fn) => {
                let okToCreate = true;
                let errorCode = 'NOT OK';

                const adminUserName = gameOptions.adminName;
                const adminId = gameOptions.humanPlayers[0].playerId;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
    
                const query = {
                    gameStatus: { $lte: GAMESTATUS.OnGoing },
                    'humanPlayers.playerId': { $eq: adminId }
                };
                const cursor = await collection.find(query);
                await cursor.forEach(function(val) {
                    for (let i = 0; i < val.humanPlayers.length; i++) {
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
    
                const doReload = getRound.doReload;
                const newRound = getRound.newRound;
                const gameOver = getRound.gameOver;
                const gameStatus = gameOver ? GAMESTATUS.Played : GAMESTATUS.OnGoing;
                
                const query = {
                    _id: searchId,
                    gameStatus: gameStatus,
                    // password: newPlayer.gamePassword,
                     };
                const game = await collection.findOne(query);
                if (game != null) {
                    const playerRound = pf.roundToPlayer(myId, roundInd, game, doReload, newRound, gameOver);
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
                    gameStatus: GAMESTATUS.OnGoing,
                    // password: newPlayer.gamePassword,
                };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null && gameInDb.speedPromise) {
                    const playerName = pf.getPlayerNameById(myId, gameInDb.humanPlayers);
                    for (let i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        let chkInd = 1 + i; // start from next to dealer
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

                                        const chatLine = playerName+' still thinking, speed promise: ' + gameInDb.game.rounds[roundInd].roundPlayers[chkInd].speedPromisePoints;
                                        io.to(gameIdStr).emit('new chat line', chatLine);

                                        const playerRound = pf.roundToPlayer(myId, roundInd, gameInDb, false, false, false);
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
    
            socket.on('make promise', async (promiseDetails) => {
                const gameIdStr = promiseDetails.gameId;
                console.log('make promise', promiseDetails, gameIdStr);
                const myId = promiseDetails.myId;
                const roundInd = promiseDetails.roundInd;
                const promise = promiseDetails.promise;

                let promiseMadeOk = false;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                
                const query = {
                    _id: searchId,
                    gameStatus: GAMESTATUS.OnGoing,
                    // password: newPlayer.gamePassword,
                };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null) {
                    const promiseInt = parseInt(promise, 10);
                    const playerName = pf.getPlayerNameById(myId, gameInDb.humanPlayers);
                    let speedPromisePoints = null;
                    for (let i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                        let chkInd = 1 + i; // start from next to dealer
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
                        
                        let chatLine = playerName+' promised';
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

                let cardPlayedOk = false;
    
                let eventInfo = null;
                let eventInfoToCardPlayer = null;
    
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const statsCollection = database.collection(statsCollectionStr);
                const ObjectId = require('mongodb').ObjectId;
                const searchId = new ObjectId(gameIdStr);
                
                const query = {
                    _id: searchId,
                    gameStatus: GAMESTATUS.OnGoing,
                    // password: newPlayer.gamePassword,
                     };
                const gameInDb = await collection.findOne(query);
                if (gameInDb !== null) {
                    const playerName = pf.getPlayerNameById(myId, gameInDb.humanPlayers);
                    let gameOver = false;
                    let logStr1 = '';
                    let logStr2 = '';
                    if (pf.okToPlayCard(playedCard, playerName, gameInDb)) {
                        const roundInDb = pf.getCurrentRoundIndex(gameInDb);
                        if (roundInDb == roundInd) {
                            const round = gameInDb.game.rounds[roundInDb];
                            const play = pf.getCurrentPlayIndex(round);
                            const playerInd = pf.getPlayerIndexByName(playerName, round.roundPlayers)
                            const newHandObj = pf.takeCardOut(round.roundPlayers[playerInd].cards, playedCard);
                            const newHand = newHandObj.newHand;
                            round.cardsPlayed[play].push({ name: playerName, card: playedCard });
    
                            const gameAfterPlay = gameInDb.game;
                            gameAfterPlay.rounds[roundInDb].cardsPlayed = round.cardsPlayed;
                            gameAfterPlay.rounds[roundInDb].roundPlayers[playerInd].cards = newHand;
    
                            let newPlay = false;
                            let newRound = false;
                            let cardsInThisPlay = null;
                            const winnerName = pf.winnerOfPlay(gameAfterPlay.rounds[roundInDb].cardsPlayed[play], gameAfterPlay.rounds[roundInDb].trumpCard.suit);
                            let gameStatus = GAMESTATUS.OnGoing;

                            let gameStatistics = null;
                            
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
                                    for (let i = 0; i < gameAfterPlay.rounds[roundInDb].roundPlayers.length; i++) {
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
                                        gameStatus = GAMESTATUS.Played;
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
                        let queryUsed = query;
                        if (gameOver) {
                            queryUsed = { gameStatus: GAMESTATUS.Played,
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
                    gameStatus: GAMESTATUS.Created,
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

            socket.on('get ongoing games', async (data, fn) => {
                console.log('get ongoing games - start to get games');
                const myId = data.myId;
                const database = mongoUtil.getDb();
                const collection = database.collection(promisewebCollection);
                const queryAggregation = [{$match: {
                    gameStatus: { $in: [ GAMESTATUS.Created, GAMESTATUS.OnGoing, GAMESTATUS.Dismissed ] }
                  }}, {$sort: {
                    gameStatus : 1
                  }}
                ];
                const cursor = await collection.aggregate(queryAggregation);

                const games = [];
                await cursor.forEach(function(val) {
                    if (!pf.imInThisGame(val.humanPlayers, myId)) {
                        games.push({
                            id: val._id.toString(),
                            gameStatus: val.gameStatus,
                            humanPlayers: pf.parsedHumanPlayers(val.humanPlayers),
                            created: val.createDateTime,
                            hasPassword: val.password.length > 0
                        });
                    }
                });
    
                fn(games);
            });

            /* reporting functions */

            socket.on('get games for report', async (data, fn) => {
                console.log('get games for report - start to get games for report');
                const retObj = {
                    passOk: false,
                    data: null
                }
                const database = mongoUtil.getDb();
                const dataIsSecure = data.isSecure;
                const adminUser = dataIsSecure ? data.adminUser : null;
                const adminPass = dataIsSecure ? data.adminPass : null;
                if (dataIsSecure) {
                    retObj.passOk = await checkAdminAccess(adminUser, adminPass);
                } else {
                    retObj.passOk = true;
                }

                if (retObj.passOk) {
                    const games = [];
                    const gameIds = [];
                    const queryStatsGamesAggregation = [{$group: {
                        _id: "$game",
                      }}
                    ];
                    const statsCollection = database.collection(statsCollectionStr);
                    const cursorStatGames = await statsCollection.aggregate(queryStatsGamesAggregation);
                    await cursorStatGames.forEach(function (game) {
                        const gameIdStr = game._id.toString();
                        games[gameIdStr] = [];
                        gameIds.push(gameIdStr);
                    });
    
                    for (let i = 0; i < gameIds.length; i++) {
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
                        gameStatus: {$eq: GAMESTATUS.Played}
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
    
                    retObj.data = retArr;
                } else {
                    console.log("secure data - wrong credentials");
                }
    
                fn(retObj);
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
                    avgZerosPerPlayer: null,
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
                const queryGameCount = { gameStatus: GAMESTATUS.Played };
                const gameCount = await collection.countDocuments(queryGameCount);
                retObj.gamesPlayed = gameCount;
                // ********

                // rounds played
                console.log('get report data - report data - rounds played');
                const aggregationRoundsPlayed = [{$match: {
                    gameStatus: { $eq: GAMESTATUS.Played }
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
                let roundsPlayed = null;
                let totalCardsHit = null;
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
                      $eq: GAMESTATUS.Played
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
                      $eq: GAMESTATUS.Played
                    },
                    "gameStatistics.roundsPlayed": {$eq: 19}
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

                // bigZero and smallNotZero
                console.log('get report data - report data - average points per player');
                const aggregationZeros = [
                    {
                      $match: {
                        gameStatus: {
                          $eq: GAMESTATUS.Played
                        },
                        'gameStatistics.bigRoundsPlayed': {$gt: 0},
                        'gameStatistics.smallRoundsPlayed': {$gt: 0},
                      }
                    }, {
                      $unwind: {
                        path: '$gameStatistics.playersStatistics', 
                        preserveNullAndEmptyArrays: false
                      }
                    }, {
                        $addFields: {
                            'gameStatistics.playersStatistics.tBigs': '$gameStatistics.bigRoundsPlayed', 
                            'gameStatistics.playersStatistics.tSmalls': '$gameStatistics.smallRoundsPlayed'
                        }
                    }, {
                      $group: {
                        _id: '$gameStatistics.playersStatistics.playerName', 
                        playerTotalGames: {
                          $sum: 1
                        }, 
                        totalBigZeroPoints: {
                          $sum: '$gameStatistics.playersStatistics.bigPointsByZero'
                        }, 
                        totalBigZeroKeeps: {
                          $sum: '$gameStatistics.playersStatistics.bigZeroKeepPromisesCount'
                        }, 
                        totalBigZeroFails: {
                          $sum: '$gameStatistics.playersStatistics.bigZeroFailPromisesCount'
                        }, 
                        totalBigRounds: {
                          $sum: '$gameStatistics.playersStatistics.tBigs'
                        }, 
                        totalSmallNotZeroPoints: {
                          $sum: '$gameStatistics.playersStatistics.smallPointsNotZero'
                        }, 
                        totalSmallNotZeroKeeps: {
                          $sum: '$gameStatistics.playersStatistics.smallNotZeroKeepPromisesCount'
                        }, 
                        totalSmallNotZeroFails: {
                          $sum: '$gameStatistics.playersStatistics.smallNotZeroFailPromisesCount'
                        }, 
                        totalSmallRounds: {
                          $sum: '$gameStatistics.playersStatistics.tSmalls'
                        }
                      }
                    }, {
                      $match: {
                        playerTotalGames: {
                          $gte: minGamesToReport
                        }
                      }
                    }
                  ];

                const cursorZeros = await collection.aggregate(aggregationZeros);
                const avgZerosPerPlayer = [];
                try {
                    await cursorZeros.forEach(function(val) {
                        avgZerosPerPlayer.push(val);
                    });
                } catch (e) {
                    console.log('get report data', e);
                }
                retObj.avgZerosPerPlayer = avgZerosPerPlayer;
                // ********

                // average keep percentage per player
                console.log('get report data - report data - average keep percentage per player');
                const aggregationAvgKeepPercentage = [{$match: {
                    gameStatus: {
                      $eq: GAMESTATUS.Played
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
                      $eq: GAMESTATUS.Played
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
                      $eq: GAMESTATUS.Played
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
                for (let i = 0; i < playerTotalWins.length; i++) {
                    const winPercentageName = playerTotalWins[i]._id;
                    const winPercentageWins = playerTotalWins[i].playerTotalWins;
                    for (let j = 0; j < gamesPlayed.length; j++) {
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
                      $eq: GAMESTATUS.Played
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
                      $eq: GAMESTATUS.Played
                    },
                    "gameStatistics.winnerPoints": {$gt: 0}
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
                      $eq: GAMESTATUS.Played
                    }
                  }}, {$group: {
                    _id: null,
                    playersTotal: {$sum: "$humanPlayersCount"}
                  }}, {$project: {
                    _id: 0
                  }}
                ];

                const cursorPlayersTotal = await collection.aggregate(aggregationPlayersTotal);
                let playersTotal = null;
                await cursorPlayersTotal.forEach(function(val) {
                    playersTotal = val.playersTotal;
                });
                retObj.playersTotal = playersTotal;
                // ********

                // players count
                console.log('get report data - report data - players count');
                const aggregationPlayerCount = [{$match: {
                    gameStatus: { $eq: GAMESTATUS.Played },
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
                      $match: {
                        gameStatus: {
                          $eq: GAMESTATUS.Played
                        }
                      }
                    }, {
                      $unwind: {
                        path: '$gameStatistics.playersStatistics', 
                        preserveNullAndEmptyArrays: false
                      }
                    }, {
                      $group: {
                        _id: '$gameStatistics.playersStatistics.playerName', 
                        trumps: {
                          $sum: '$gameStatistics.playersStatistics.trumpsInGame'
                        }, 
                        bigs: {
                          $sum: '$gameStatistics.playersStatistics.bigsCardsInGame'
                        }, 
                        smalls: {
                          $sum: '$gameStatistics.playersStatistics.smallCardsInGame'
                        }, 
                        others: {
                          $sum: '$gameStatistics.playersStatistics.otherCardsInGame'
                        }, 
                        games: {
                          $sum: 1
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
                    gameStatus: { $eq: GAMESTATUS.Played }
                  }}, {$sort: {
                    "gameStatistics.spurtAndMelt.meltGap": -1,
                    // "gameStatistics.spurtAndMelt.meltFrom": -1,
                  }}, {$limit: 1}, {$project: {
                    game: 0
                  }}
                ];
                
                const cursorMeltingGame = await collection.aggregate(aggregationMeltingGame);
                let meltingGame = null;
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
                    gameStatus: { $eq: GAMESTATUS.Played }
                  }}, {$sort: {
                    "gameStatistics.spurtAndMelt.spurtGap": -1,
                    // "gameStatistics.spurtAndMelt.spurtFrom": -1,
                  }}, {$limit: 1}, {$project: {
                    game: 0
                  }}
                ];

                const cursorSpurtingGame = await collection.aggregate(aggregationSpurtingGame);
                let spurtingGame = null;
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
                    gameStatus: { $eq: GAMESTATUS.Played },
                  }}, {$match: vanillaGameRules
                }, {$group: {
                    _id: null,
                    gamesTotal: {
                      $sum: 1
                    }
                  }}
                ];

                const cursorVanillaGames = await collection.aggregate(aggregationVanillaGames);
                let vanillaGamesCount = null;
                await cursorVanillaGames.forEach(function(val) {
                    vanillaGamesCount = val.gamesTotal;
                });
                retObj.vanillaGamesCount = vanillaGamesCount;
                // ********

                // used rules
                console.log('get report data - report data - used rules');
                const aggregationUsedRules = [{$match: {
                    gameStatus: { $eq: GAMESTATUS.Played },
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
                    gameStatus: GAMESTATUS.Played,
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
                    gameStatus: GAMESTATUS.Played,
                };
                const gamesInDb = await collection.find(query);
                await gamesInDb.forEach(async function (gameInDb) {
                    const gameId = gameInDb._id;
                    const gameStatistics = rf.generateGameStatistics(gameInDb.game, true);

                    const updateQuery = { _id: gameId, gameStatus: GAMESTATUS.Played};
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
                        gameStatus: { $eq: GAMESTATUS.Played }
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
                        gameStatus: { $eq: GAMESTATUS.Played },
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
                        gameStatus: { $eq: GAMESTATUS.Played },
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
                    for (let i = 0; i < averagePointsPerGames.length; i++) {
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
                const retObj = {
                    passOk: false
                }
                const adminUser = data.adminUser;
                const adminPass = data.adminPass;
                retObj.passOk = await checkAdminAccess(adminUser, adminPass);
                
                if (retObj.passOk) {
                    const database = mongoUtil.getDb();
                    const gameIdStr = data.gameId;
                    console.log('generate game statistics - start to generate game statistics for %s', gameIdStr, gameIdStr);
                    const ObjectId = require('mongodb').ObjectId;
                    const searchId = new ObjectId(gameIdStr);
                    const collection = database.collection(promisewebCollection);
                    const query = {
                        _id: searchId,
                        gameStatus: GAMESTATUS.Played,
                    };
                    const gameInDb = await collection.findOne(query);
                    const gameStatistics = rf.generateGameStatistics(gameInDb.game, true);
                    const options = { upsert: true };
                    const updateDoc = {
                        $set: {
                            gameStatistics: gameStatistics,
                        }
                    };
                    await collection.updateOne(query, updateDoc, options);
                }

                fn(retObj);

            });

            socket.on('change nick', async (data, fn) => {
                const retObj = {
                    passOk: false
                }
                const gameIdStr = data.gameId;
                console.log('change nick - start to change nick', gameIdStr);
                
                const adminUser = data.adminUser;
                const adminPass = data.adminPass;
                retObj.passOk = await checkAdminAccess(adminUser, adminPass);
                
                if (retObj.passOk) {
                    const database = mongoUtil.getDb();
                    const ObjectId = require('mongodb').ObjectId;
                    const oldName = data.oldName;
                    const newName = data.newName;
    
                    console.log('change nick - game database %s to %s', oldName, newName, gameIdStr);
    
                    const searchId = new ObjectId(gameIdStr);
                    const collection = database.collection(promisewebCollection);
                    const query = {
                        _id: searchId,
                        gameStatus: GAMESTATUS.Played,
                    };
                    const gameInDb = await collection.findOne(query);
                    const newHumanPlayers = gameInDb.humanPlayers;
                    const newGame = gameInDb.game;
                    if (gameInDb != null) {
                        for (let i = 0; i < newHumanPlayers.length; i++) {
                            if (newHumanPlayers[i].name == oldName) {
                                newHumanPlayers[i].name = newName;
                                break;
                            }
                        }
                        for (let i = 0; i < newGame.playerOrder.length; i++) {
                            if (newGame.playerOrder[i] == oldName) {
                                newGame.playerOrder[i] = newName;
                            }
                            if (newGame.playerOrder[i].name && newGame.playerOrder[i].name == oldName) {
                                newGame.playerOrder[i].name = newName;
                            }
                        }
                        for (let i = 0; i < newGame.rounds.length; i++) {
                            for (let j = 0; j < newGame.rounds[i].roundPlayers.length; j++) {
                                if (newGame.rounds[i].roundPlayers[j].name == oldName) {
                                    newGame.rounds[i].roundPlayers[j].name = newName;
                                    break;
                                }
                            }
                            for (let j = 0; j < newGame.rounds[i].cardsPlayed.length; j++) {
                                for (let k = 0; k < newGame.rounds[i].cardsPlayed[j].length; k++) {
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
                    await collection.updateOne(query, updateDoc, options);
                    
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
                    const collectionStats = database.collection(statsCollectionStr);
                    await collectionStats.updateMany(updateStatsDocQuery, updateStatsDocSet);
                }
                
                fn(retObj);
            });
            
            socket.on('show players with password', async (getObj, fn) => {
                const retObj = {
                    passOk: false,
                    playersWithPassword: []
                }
                
                const adminUser = getObj.adminUser;
                const adminPass = getObj.adminPass;
                retObj.passOk = await checkAdminAccess(adminUser, adminPass);
                
                if (retObj.passOk) {
                    const database = mongoUtil.getDb();
                    const uCollection = database.collection(userCollection);
                    const usersQuery = {
                        playerName: { $ne: adminUser }
                    }
                    const usersCusrsor = await uCollection.find(usersQuery);
                    await usersCusrsor.forEach(function(val) {
                        retObj.playersWithPassword.push(val.playerName);
                    });
                }
                fn(retObj);
            });
    
            socket.on('reset user password', async (resetObj, fn) => {
                const userToReset = resetObj.userToReset;
                const retObj = {
                    passOk: false,
                    deleteOk: false
                }
                const adminUser = resetObj.adminUser;
                const adminPass = resetObj.adminPass;

                retObj.passOk = await checkAdminAccess(adminUser, adminPass);
                if (!resetObj.passOk || userToReset == adminUser) {
                    fn(retObj);
                    return;
                }

                if (retObj.passOk) {
                    const deleteQuery = {
                        playerName: { $eq: userToReset }
                    }
                    const database = mongoUtil.getDb();
                    const uCollection = database.collection(userCollection);
                    const deleteResult = await uCollection.deleteOne(deleteQuery);
                    if (deleteResult.deletedCount == 1) {
                        console.log('user '+ userToReset + ' password reseted');
                        retObj.deleteOk = true;
                    }
                }
                fn(retObj);
            });
    
        });
    });
} catch (error) {
    const err = JSON.stringify(error);
    console.log('server - Error while connecting to MongoDB: ' + err, error);
}

async function checkAdminAccess(adminUser, adminPass) {
    if (!adminUser || !adminPass) return false;

    const database = mongoUtil.getDb();
    const secretConfig = require(__dirname + '/secret.config.js');
    const adminUserName = secretConfig.adminUserName;

    if (adminUser == adminUserName) {
        const uCollection = database.collection(userCollection);
        const uQuery = {
            playerName: { $eq: adminUserName }
        };
        const userDoc = await uCollection.findOne(uQuery);
        if (userDoc == null) {
            return false;
        } else {
            // check if password matches
            const passStr = adminPass+':'+secretConfig.secretPhase+':'+adminUserName;
            const passOk = await bcrypt.compare(passStr, userDoc.passHash);
            if (passOk) {
                return true;
            }
        }
    }
    return false;
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
            gameStatus: GAMESTATUS.OnGoing,
            game: game,
        }
    };
    await collection.updateOne(query, updateDoc, options);
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
    
        await collection.updateOne(query, updateDoc, options);
    }

    console.log('startRound - round '+roundInd+' started', gameIdStr);
}

async function getPlayerAvgPoints(playerName, roundsInGame) {
    const gameStats = [];
    const stats = [];
    const database = mongoUtil.getDb();
    const collection = database.collection(promisewebCollection);

    const aggregationA = [
        {
          $match: {
            gameStatus: {
              $eq: GAMESTATUS.Played
            }, 
            "humanPlayers.name": {$eq: playerName}
          }
        }, {
          $addFields: {
            rounds: {
              $sum: [
                {
                  $subtract: [
                    '$startRound', '$turnRound'
                  ]
                }, {
                  $subtract: [
                    '$endRound', '$turnRound'
                  ]
                }, 1
              ]
            }
          }
        }, {
            $match: {
                rounds: { $eq: roundsInGame}
            }
        }
    ];
    const cursor = await collection.aggregate(aggregationA);
    await cursor.forEach(function(gameInDb) {
        gameStats.push(rf.getGameReport(gameInDb.game, gameInDb.gameStatistics.playersStatistics, playerName));
    });
    for (let i = 0; i < gameStats.length; i++) {
        for (let j = 0; j < gameStats[i].points[0].length; j++) {
            if (i == 0) {
                stats[j] = 0;
            }
            stats[j]+= gameStats[i].points[0][j];
        }
    }
    return stats.map(v => v/gameStats.length);
}

async function getGamesStatistics(gameInDb, playerName) {
    const statsGamesObj = {
        playerAvgPointsInRounds: await getPlayerAvgPoints(playerName, (gameInDb.startRound-gameInDb.turnRound+1)+(gameInDb.endRound-gameInDb.turnRound))
    }
    return statsGamesObj;
}

function sortWinPercentage(a, b) {
    if (a.winPercentage > b.winPercentage) return -1;
    if (a.winPercentage < b.winPercentage) return 1;
    return 0;
}
