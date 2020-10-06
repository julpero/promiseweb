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
                        socket.join(game._id);
                        var gameInfo = gameToGameInfo(game);
                        gameInfo.currentRound = currentRoundIndex(game);
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
                    game.humanPlayers.forEach( function(player) {
                        if (player.playerId == gameCheck.myId) {
                            console.log('found game 0');
                            socket.join(game._id);
                            var gameInfo = gameToGameInfo(game);
                            gameInfo.currentRound = 0;
                            gameInfo.reloaded = true;
                            socket.emit('promise made', gameInfo);
                        }
                    });
                });
            }

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
            const playerRound = roundToPlayer(getRound.myId, getRound.round, game, getRound.doReload);
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
            console.log(thisGame);

            var gameInfo = gameToGameInfo(thisGame);
            gameInfo.currentRound = promiseDetails.roundInd;
            io.to(gameInfo.id).emit('promise made', gameInfo);

            fn(thisGame); // DEBUG

        });

        socket.on('play card', async (playDetails, fn) => {
            console.log(playDetails);

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
                var playerName = getPlayerNameById(playDetails.myId, gameInDb.humanPlayers);
                if (okToPlayCard(playedCard, playerName, gameInDb)) {
                    var roundInDb = currentRoundIndex(gameInDb);
                    if (roundInDb == playDetails.roundInd) {
                        var round = gameInDb.game.rounds[roundInDb];
                        var play = currentPlayIndex(round);
                        var playerInd = getPlayerIndexByName(playerName, round.roundPlayers)
                        var newHand = takeCardOut(round.roundPlayers[playerInd].cards, playedCard);
                        round.cardsPlayed[play].push({ name: playerName, card: playedCard });

                        var gameAfterPlay = gameInDb.game;
                        gameAfterPlay.rounds[roundInDb].cardsPlayed = round.cardsPlayed;
                        gameAfterPlay.rounds[roundInDb].roundPlayers[playerInd].cards = newHand;

                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                game: gameAfterPlay,
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);

                    }
                }
            }

            const thisGame = await collection.findOne(query);
            console.log(thisGame);

            var gameInfo = gameToGameInfo(thisGame);
            gameInfo.currentRound = playDetails.roundInd;
            io.to(gameInfo.id).emit('card played', gameInfo);

            fn(thisGame); // DEBUG

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

function takeCardOut(hand, cardPlayed) {
    var newHand = [];
    for (var i = 0; i < hand.length; i++) {
        if (hand[i].suit == cardPlayed.suit && hand[i].rank == cardPlayed.rank) continue;
        newHand.push(hand[i]);
    }
    return newHand;
}

function currentPlayTurnPlayerName(gameInDb) {
    var currentRoundNbr = currentRoundIndex(gameInDb);
    var round = gameInDb.game.rounds[currentRoundNbr];
    var currentPlayNbr = currentPlayIndex(round);
    if (round.cardsPlayed[currentPlayNbr].length == 0) return getRoundStarterName(round);

    var playerInd = round.starterPosition + round.cardsPlayed.length;
    if (playerInd > round.starterPosition + round.cardsPlayed.length) playerInd-= round.starterPosition + round.cardsPlayed.length;
    return round.roundPlayers[playerInd].name;
}

function isCardInHand(playedCard, playerCards) {
    for (var j = 0; j < playerCards.length; j++) {
        if (playerCards[j].suit == playedCard.suit && playerCards[j].rank == playedCard.rank) {
            return true;
        }
    }
    return false;
}

function isCardAvailableToPlay(playedCard, cardInCharge, playerCards) {
    if (cardInCharge == null) return true;
    var hasSuitInHand = false;
    for (var i = 0; i < playerCards.length; i++) {
        if (playerCards[i].suit == cardInCharge.suit) hasSuitInHand = true;
    }
    return !hasSuitInHand || playedCard.suit == cardInCharge.suit;
}


function okToPlayCard(playedCard, playerName, gameInDb) {
    var cardInHand = false;
    var playerCards = null;
    var currentRoundNbr = currentRoundIndex(gameInDb);
    var currentRound = gameInDb.game.rounds[currentRoundNbr];
    for (var i = 0; i < currentRound.roundPlayers.length; i++) {
        if (currentRound.roundPlayers[i].name == playerName) {
            playerCards = currentRound.roundPlayers[i].cards;
            cardInHand = isCardInHand(playedCard, playerCards);
            break;
        }
    }
    return cardInHand && currentPlayTurnPlayerName(gameInDb) == playerName && isCardAvailableToPlay(playedCard, currentRound.cardInCharge, playerCards);
}

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
        reloaded: false,
    };
    return gameInfo;
}

function getRoundDealerName(round) {
    return round.roundPlayers[round.dealerPosition].name;
}

function getRoundStarterName(round) {
    return round.roundPlayers[round.starterPosition].name;
}

function getPlayerIndexByName(name, players) {
    var playerIndex = null;
    players.forEach(function(player, idx) {
        if (player.name == name) playerIndex = idx;
        return;
    });
    return playerIndex;
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

function getPlayerPlayedCard(playerName, cardsPlayed) {
    var currentPlay = cardsPlayed[cardsPlayed.length-1];
    for (var i = 0; i < currentPlay.length; i++) {
        if (currentPlay[i].name == playerName) return currentPlay[i].card;
    }
    return null;
}

function getRoundPlayers(myName, round) {
    var players = [];
    round.roundPlayers.forEach(function (player, idx) {
        players.push({
            thisIsMe: player.name == myName,
            dealer: round.dealerPosition == idx,
            name: player.name,
            promise: player.promise,
            cardPlayed: getPlayerPlayedCard(player.name, round.cardsPlayed),
        });
    });
    return players;
}

function winnerOfPlay(cardsPlayed, trumpSuit) {
    var winner = cardsPlayed[0].name;
    var winningCard = cardsPlayed[0].card;
    for (var i = 1; i < cardsPlayed.length; i++) {
        var wins = false;
        var currentCard = cardsPlayed[i];
        if (winningCard.suit == trumpSuit) {
            // has to be bigger trump to win
            wins = currentCard.suit == trumpSuit && currentCard.rank > winningCard.rank;
        } else if (currentCard.suit == trumpSuit) {
            // wins with any trump
            wins = true;
        } else {
            // wins if greater rank of same suit
            wins = currentCard.suit == winningCard.suit && currentCard.rank > winningCard.rank;
        }
        if (wins) {
            winner = cardsPlayed[i].name;
            winningCard = currentCard;
        }
    }

    return winner;
}

function getPlayerInCharge(roundInd, playInd, thisGame) {
    var playerInd = null;
    if (playInd == 0) {
        playerInd = thisGame.game.rounds[roundInd].dealerPosition + 1; // first play in the round, next from the dealer is in charge
    } else {
        return winnerOfPlay(thisGame.game.rounds[roundInd].cardsPlayed[playInd-1], thisGame.game.rounds[roundInd].trumpCard.suit); // winner of the previous play
    }

    if (playerInd > thisGame.humanPlayersCount + thisGame.botPlayersCount) playerInd-= (thisGame.humanPlayersCount + thisGame.botPlayersCount);
    return playerInd;
}

function currentPlayIndex(round) {
    return round.cardsPlayed.length - 1;
}

function currentRoundIndex(thisGame) {
    for (var i = 0; i < thisGame.game.rounds.length; i++) {
        if (thisGame.game.rounds[i].roundStatus == 1) return i;
    }
    return null;
}

function getCurrentCardInCharge(cardsPlayed) {
    if (!cardsPlayed[cardsPlayed.length - 1][0]) return null;
    return cardsPlayed[cardsPlayed.length - 1][0].card;
}

function roundToPlayer(playerId, roundInd, thisGame, doReloadInit) {
    var round = thisGame.game.rounds[roundInd];
    var playerName = getPlayerNameById(playerId, thisGame.humanPlayers);

    return {
        gameId: thisGame._id,
        roundInd: roundInd,
        cardsInRound: round.cardsInRound,
        dealerPosition: round.dealerPosition,
        starterPosition: round.starterPosition,
        myName: playerName,
        myCards: getPlayerCards(playerName, round),
        players: getRoundPlayers(playerName, round),
        trumpCard: round.trumpCard,
        playerInCharge: getPlayerInCharge(roundInd, currentPlayIndex(round), thisGame),
        cardInCharge: getCurrentCardInCharge(round.cardsPlayed),
        cardsPlayed: round.cardsPlayed,
        doReloadInit: doReloadInit
        // round: round, // comment this when in production!
    };
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
    console.log('game started');

    // const thisGame = await collection.findOne(query);
    await startRound(gameInfo, 0);

    io.to(gameInfo.id).emit('start game', gameInfo);

}

function initPlayers(gameInfo) {
    // first round is played by this order and the first player is the dealer of the first round
    var players = [];
    knuthShuffle(gameInfo.humanPlayers).forEach(function (player) {
        players.push(player.name);
    });
    return players;
}

function getDealerPosition(roundIndex, totalPlayers) {
    if (roundIndex < totalPlayers) return roundIndex;
    return getDealerPosition(roundIndex - totalPlayers, totalPlayers);
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

    var dealerPosition = getDealerPosition(roundIndex, players.length+1);
    var starterPosition = dealerPosition + 1;
    if (starterPosition > players.length) starterPosition-= players.length;

    var cardsPlayed = [];
    cardsPlayed.push([]);

    return {
        roundIndex: roundIndex,
        cardsInRound: cardsInRound,
        dealerPosition: dealerPosition,
        starterPosition: starterPosition,
        roundPlayers: roundPlayers,
        trumpCard: deck.draw(),
        totalPromise: null,
        cardsPlayed: cardsPlayed,
        roundStatus: 0,
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
