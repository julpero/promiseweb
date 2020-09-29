var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var mongoUtil = require(__dirname + '/mongoUtil.js');

mongoUtil.connectToServer( function( err, client ) {
    if (err) console.log(err);
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/index.html');
    });
    app.get('/promiseweb.js', (req, res) => {
        res.sendFile(__dirname + '/promiseweb.js');
    });

    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });

        socket.on('join game', async (newPlayer, fn) => {
            var retVal = 'NOTSET';
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
            if (game !== null) {
                if (game.humanPlayersCount > game.humanPlayers.length && game.adminName != newPlayer.myName) {
                    var nameFree = true;
                    game.humanPlayers.forEach(function(player) {
                        if (player.name == newPlayer.myName) nameFree = false;
                    });

                    if (nameFree) {
                        var players = game.humanPlayers;
                        players.push({name: newPlayer.myName, playerId: socket.id});
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                humanPlayers: players,
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);
                        // console.log(result);
                        retVal = 'OK';
                    } else {
                        retVal = 'NAMENOTOK';
                    }
                } else {
                    retVal = 'NOTVALID';
                }
            } else {
                retVal = 'GAMENOTFOUND';
            }

            fn(retVal);

            console.log(retVal);
            if (retVal == 'OK') {
                // let's update info to clients
                const val = await collection.findOne(query);
                var resultGameInfo = {
                    id: val._id,
                    humanPlayersCount: val.humanPlayersCount,
                    computerPlayersCount: val.botPlayersCount,
                    startRound: val.startRound,
                    turnRound: val.turnRound,
                    endRound: val.endRound,
                    humanPlayers: val.humanPlayers,
                    hasPassword: val.password.length > 0,
                };
                if (resultGameInfo.humanPlayersCount == resultGameInfo.humanPlayers.length) {
                    // start game
                    io.emit('start game', resultGameInfo);
                } else {
                    io.emit('update gameinfo', resultGameInfo);
                }
                
            }
            
        });

        socket.on('create game', async (gameOptions) => {
            console.log(gameOptions);
            const database = mongoUtil.getDb();
            const collection = database.collection('promiseweb');
            gameOptions.humanPlayers = [{name: gameOptions.adminName, playerId: socket.id}];

            const result = await collection.insertOne(gameOptions);
            console.log('gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId);
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
                    id: val._id,
                    humanPlayersCount: val.humanPlayersCount,
                    computerPlayersCount: val.botPlayersCount,
                    startRound: val.startRound,
                    turnRound: val.turnRound,
                    endRound: val.endRound,
                    humanPlayers: val.humanPlayers,
                    hasPassword: val.password.length > 0,
                });
            });
                

            fn(games);
            // socket.emit('game list', games);
            console.log(games);
        });
    });
    
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
