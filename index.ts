var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var doc = require('card-deck');

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
                        if (player.playerId == newPlayer.myId) socketFree = false;
                    });

                    if (nameFree && socketFree) {
                        var players = game.humanPlayers;
                        players.push({name: newPlayer.myName, playerId: newPlayer.myId});
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                humanPlayers: players,
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);
                        socket.join(newPlayer.gameId);
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
                var resultGameInfo = gameToGameInfo(val);

                io.emit('update gameinfo', resultGameInfo);

                if (resultGameInfo.humanPlayersCount == resultGameInfo.humanPlayers.length) {
                    // start game
                    await startGame(resultGameInfo);
                }
                
            }
            
        });

        socket.on('create game', async (gameOptions, fn) => {
            console.log(gameOptions);
            const database = mongoUtil.getDb();
            const collection = database.collection('promiseweb');
            //gameOptions.humanPlayers = [{name: gameOptions.adminName, playerId: socket.id}];

            const result = await collection.insertOne(gameOptions);
            console.log('gameOptions inserted ' + result.insertedCount + ' with _id: ' + result.insertedId);
            socket.join(result.insertedId);
            fn(result.insertedId);
        });

        socket.on('get round', async (getRound, fn) => {
            console.log(getRound);

            const database = mongoUtil.getDb();
            const collection = database.collection('promiseweb');
            var ObjectId = require('mongodb').ObjectId;
            var searchId = new ObjectId(getRound.gameId);
            
            const query = { gameStatus: 1,
                _id: searchId,
                // password: newPlayer.gamePassword,
                 };
            const game = await collection.findOne(query);
            const playerRound = roundToPlayer(getRound.myId, getRound.round, game);
            console.log(playerRound);

            fn(playerRound);
        });

        socket.on('make promise', async (promiseDetails, fn) => {
            console.log(promiseDetails);

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
                var playerName = getPlayerNameById(promiseDetails.myId, gameInDb.humanPlayers);
                for (var i = 0; i < gameInDb.humanPlayersCount + gameInDb.botPlayersCount; i++) {
                    var chkInd = 1 + i; // start from next to dealer
                    if (chkInd >= gameInDb.humanPlayersCount + gameInDb.botPlayersCount) chkInd-=  (gameInDb.humanPlayersCount + gameInDb.botPlayersCount);
                    if (gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].promise == null) {
                        // this should be same as playerName
                        if (gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].name == playerName) {
                            // update promise
                            gameInDb.game.rounds[promiseDetails.roundInd].roundPlayers[chkInd].promise = promiseInt;
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    game: gameInDb.game,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            break;
                        }
                    }
                }
            }
            const thisGame = await collection.findOne(query);
            // const playerRound = roundToPlayer(thisGame.myId, thisGame.round, thisGame);
            console.log(thisGame);

            var gameInfo = gameToGameInfo(thisGame);
            gameInfo.currentRound = promiseDetails.roundInd;
            io.to(gameInfo.id).emit('promise made', gameInfo);

            fn(thisGame);

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
            console.log(games);
        });
    });
    
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

function gameToGameInfo(game) {
    var gameInfo = {
        id: game._id,
        humanPlayersCount: game.humanPlayersCount,
        computerPlayersCount: game.botPlayersCount,
        startRound: game.startRound,
        turnRound: game.turnRound,
        endRound: game.endRound,
        humanPlayers: game.humanPlayers,
        hasPassword: game.password.length > 0,
        currentRound: null,
    };
    return gameInfo;
}

function getPlayerIdByName(name, players) {
    var playerId = null;
    players.forEach(function(player) {
        if (player.name == name) playerId = player.playerId;
    });
    return playerId;
}

function getPlayerNameById(id, players) {
    var playerName = null;
    players.forEach(function(player) {
        if (player.playerId == id) playerName = player.name;
    });
    return playerName;
}

function getPlayerCards(name, round) {
    var cards = null;
    round.roundPlayers.forEach(function (roundPlayer) {
        if (roundPlayer.name == name) cards = roundPlayer.cards;
    });
    return cards;
}

function roundPlayers(myName, roundPlayers, dealer) {
    var players = [];
    roundPlayers.forEach(function (player, idx) {
        if (player.name == myName) {
            players.push({
                thisIsMe: true,
                dealer: dealer == idx,
                name: myName,
                promise: player.promise,
                cardPlayed: null,
            });
        } else {
            players.push({
                thisIsMe: false,
                dealer: dealer == idx,
                name: player.name,
                promise: player.promise,
                cardPlayed: null,
            });
        }
    });
    return players;
}

function winnerOfPlay(cardsPlayed, trumpCard) {

}

function getPlayerInCharge(roundInd, thisGame) {
    if (roundInd == 0) {
        return 1; // first round in game
    } else {
        return winnerOfPlay(thisGame.game.rounds[roundInd].cardsPlayed, thisGame.game.rounds[roundInd].trumpCard);
    }
}

function roundToPlayer(playerId, roundInd, thisGame) {
    var round = thisGame.game.rounds[roundInd];
    var playerName = getPlayerNameById(playerId, thisGame.humanPlayers);

    return {
        gameId: thisGame._id,
        roundInd: roundInd,
        cardsInRound: round.cardsInRound,
        dealerPosition: round.dealerPosition,
        myName: playerName,
        myCards: getPlayerCards(playerName, round),
        players: roundPlayers(playerName, round.roundPlayers, round.dealerPosition),
        trumpCard: round.trumpCard,
        playerInCharge: getPlayerInCharge(roundInd, thisGame),
        // round: round, // comment this when in production!
    };
}

async function refreshPromise(gameInfo) {
    io.to(gameInfo.id).emit('promise made', gameInfo);
}

async function startGame(gameInfo) {
    var players = initPlayers(gameInfo);
    var rounds = initRounds(gameInfo, players);
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
    const thisGame = await collection.findOne(query);

    io.to(gameInfo.id).emit('start game', gameInfo);

    console.log('start');
}

function initPlayers(gameInfo) {
    // first round is played by this order and the first player is the dealer of the first round
    var players = [];
    knuthShuffle(gameInfo.humanPlayers).forEach(function (player) {
        players.push(player.name);
    });
    return players;
}

function dealerPosition(roundIndex, totalPlayers) {
    if (roundIndex < totalPlayers) return roundIndex;
    return dealerPosition(roundIndex - totalPlayers, totalPlayers);
}

function initRound(roundIndex, cardsInRound, players) {
    var deck = initDeck();

    var roundPlayers = [];
    players.forEach(function (player, idx) {
        roundPlayers.push({
            name: player,
            cards: sortCardsDummy(deck.draw(cardsInRound)),
            promise: null,
            keeps: null,
            points: null,
        });
    });

    return {
        roundIndex: roundIndex,
        cardsInRound: cardsInRound,
        dealerPosition: dealerPosition(roundIndex, players.length+1),
        roundPlayers: roundPlayers,
        trumpCard: deck.draw(),
        totalPromise: null,
        cardsPlayed: [],
    };
}

function initRounds(gameInfo, players) {
    var rounds = [];
    var roundIndex = 0;
    for (var i = gameInfo.startRound; i >= gameInfo.turnRound; i--) {
        rounds.push(initRound(roundIndex, i, players));
        roundIndex++;
    }
    for (var i = gameInfo.turnRound+1; i <= gameInfo.endRound; i++) {
        rounds.push(initRound(roundIndex, i, players));
        roundIndex++;
    }
    return rounds;
}

function knuthShuffle(arr) {
    var rand, temp, i;
 
    for (i = arr.length - 1; i > 0; i -= 1) {
        rand = Math.floor((i + 1) * Math.random()); //get random between zero and i (inclusive)
        temp = arr[rand]; //swap i and the zero-indexed number
        arr[rand] = arr[i];
        arr[i] = temp;
    }
    return arr;
}

function sortCardsDummy(cards) {
    var sortedCards = [];
    var suits = ['hearts', 'diamonds', 'clubs',  'spades'];
    suits.forEach(function (suit) {
        for (var i = 2; i <= 14; i++) {
            for (var j = 0; j < cards.length; j++) {
                if (cards[j].suit == suit && cards[j].rank == i) sortedCards.push(cards[j]);
            }
        }
    });
    return sortedCards;
}

function initDeck() {
    var cards = [];
    var suits = ['hearts', 'diamonds', 'clubs',  'spades'];
    suits.forEach(function (suit) {
        for (var i = 2; i <= 14; i++) cards.push({
            suit: suit,
            rank: i
        });
    });
    var deck = new doc(cards);
    deck.shuffle();
    return deck;
}
