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
    app.get('/deck.js', (req, res) => {
        res.sendFile(__dirname + '/node_modules/deck-of-cards/dist/deck.min.js');
    });
    app.get('/deck.css', (req, res) => {
        res.sendFile(__dirname + '/cardGallery/cardGallery.css');
    });
    app.get('/faces/:face', (req, res) => {
        res.sendFile(__dirname + '/cardGallery/fourColorFaces/' + req.params.face);
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
                    var socketFree = true;
                    game.humanPlayers.forEach(function(player) {
                        if (player.name == newPlayer.myName) nameFree = false;
                        if (player.playerId == socket.id) socketFree = false;
                    });

                    if (nameFree && socketFree) {
                        var players = game.humanPlayers;
                        players.push({name: newPlayer.myName, playerId: socket.id});
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                humanPlayers: players,
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);
                        retVal = 'OK';
                    } else if (!nameFree) {
                        retVal = 'NAMENOTOK';
                    } else if (!socketFree) {
                        retVal = 'SOCKETNOTOK';
                    } else {
                        retVal = 'UNKNOWNERROR';
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
                    resultGameInfo.humanPlayers.forEach(function (humanPlayer) {
                        io.to(humanPlayer.playerId).emit('testi');
                    });
                    await startGame(resultGameInfo);
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




async function startGame(gameInfo) {
    const database = mongoUtil.getDb();
    const collection = database.collection('promiseweb');
    var ObjectId = require('mongodb').ObjectId;
    var searchId = new ObjectId(gameInfo.id);

    const query = { _id: searchId };
    const options = { upsert: true };
    const updateDoc = {
        $set: {
            gameStatus: 1,
        }
    };
    const result = await collection.updateOne(query, updateDoc, options);

    console.log('start');
}
