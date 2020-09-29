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

        socket.on('create game', async (gameOptions) => {
            console.log(gameOptions);
            const database = mongoUtil.getDb();
            const collection = database.collection('promiseweb');
            const result = await collection.insertOne(gameOptions);
            console.log('gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId);
        });

        socket.on('get games', async () => {
            console.log('start to get games');
            const database = mongoUtil.getDb();
            const collection = database.collection('promiseweb');
            const query = { gameStatus: 0 };
            const games = await collection.findOne(query);
            console.log(games);
        });
    });
    
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
