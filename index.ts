var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

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
    socket.on('create game', (gameOptions) => {
        console.log(gameOptions);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
