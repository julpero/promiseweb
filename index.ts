var express = require('express');
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

var port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('listening on *:' + port);
});

app.use(express.static('static'))
app.use(express.static('node_modules/deck-of-cards/dist'))

var doc = require('card-deck');

try {
    var mongoUtil = require(__dirname + '/mongoUtil.js');
    mongoUtil.connectToServer( async function( err, client ) {

        if (err) console.log(err);
        app.get('/', (req, res) => {
            res.sendFile('index.html');
        });
        // app.get('/promiseweb.js', (req, res) => {
        //     res.sendFile(__dirname + '/promiseweb.js');
        // });
        // app.get('/deck.js', (req, res) => {
        //     try {
        //         res.sendFile(__dirname + '/node_modules/deck-of-cards/dist/deck.min.js');
        //     } catch(error) {
        //         const err = JSON.stringify(error);
        //         res.status(500).send('Request error: ' + err);
        //     }
        // });
        // app.get('/deck.css', (req, res) => {
        //     try {
        //         res.sendFile(__dirname + '/cardGallery/cardGallery.css');
        //     } catch(error) {
        //         const err = JSON.stringify(error);
        //         res.status(500).send('Request error: ' + err);
        //     }
        // });
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
                            gameInfo.currentRound = getCurrentRoundIndex(game);
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
    
            socket.on('leave game', async (leaveGame, fn) => {
                var leavingResult = 'NOTSET';
                var ObjectId = require('mongodb').ObjectId;
                var searchId = new ObjectId(leaveGame.gameId);
                const database = mongoUtil.getDb();
                const collection = database.collection('promiseweb');
                const query = { gameStatus: 0,
                                _id: searchId,
                                 };
                const game = await collection.findOne(query);
                console.log(game);
                var retVal = {
                    leavingResult: null,
                    gameId: leaveGame.gameId,
                }
                if (game !== null) {
                    var newHumanPlayers = [];
                    for (var i = 0; i < game.humanPlayers.length; i++) {
                        if (game.humanPlayers[i].playerId != leaveGame.myId) {
                            newHumanPlayers.push(game.humanPlayers[i]);
                        }
                    }
                    if (newHumanPlayers.length == game.humanPlayers.length - 1) {
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                humanPlayers: newHumanPlayers,
                            }
                        };
                        const result = await collection.updateOne(query, updateDoc, options);
                        if (result.modifiedCount == 1) {
                            console.log(result);
                            socket.leave(leaveGame.gameId);
                            leavingResult = 'LEAVED';
                        }
                    }
                }
    
                retVal.leavingResult = leavingResult;
    
                fn(retVal);
    
                if (leavingResult == 'LEAVED') {
                    // let's update info to clients
                    const val = await collection.findOne(query);
                    var resultGameInfo = gameToGameInfo(val);
    
                    io.emit('update gameinfo', resultGameInfo);
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
                            players.push({name: newPlayer.myName, playerId: newPlayer.myId});
                            const options = { upsert: true };
                            const updateDoc = {
                                $set: {
                                    humanPlayers: players,
                                }
                            };
                            const result = await collection.updateOne(query, updateDoc, options);
                            if (result.modifiedCount == 1) {
                                socket.join(newPlayer.gameId);
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
                    var resultGameInfo = gameToGameInfo(val);
    
                    io.emit('update gameinfo', resultGameInfo);
    
                    if (resultGameInfo.humanPlayersCount == resultGameInfo.humanPlayers.length) {
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
                    socket.join(result.insertedId);
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
                    const playerRound = roundToPlayer(getRound.myId, getRound.round, game, doReload, newRound, gameOver);
                    console.log(playerRound);
        
                    fn(playerRound);
                }
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
                                if (result.modifiedCount == 1) {
                                    promiseMadeOk = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (promiseMadeOk) {
                        const thisGame = await collection.findOne(query);
                        console.log(thisGame);
            
                        var gameInfo = gameToGameInfo(thisGame);
                        gameInfo.currentRound = promiseDetails.roundInd;
                        io.to(gameInfo.id).emit('promise made', gameInfo);
            
                        fn(gameInfo); // just DEBUG
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
                    var playerName = getPlayerNameById(playDetails.myId, gameInDb.humanPlayers);
                    var gameOver = false;
                    if (okToPlayCard(playedCard, playerName, gameInDb)) {
                        var roundInDb = getCurrentRoundIndex(gameInDb);
                        if (roundInDb == playDetails.roundInd) {
                            var round = gameInDb.game.rounds[roundInDb];
                            var play = getCurrentPlayIndex(round);
                            var playerInd = getPlayerIndexByName(playerName, round.roundPlayers)
                            var newHandObj = takeCardOut(round.roundPlayers[playerInd].cards, playedCard);
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
                                winnerName = winnerOfPlay(gameAfterPlay.rounds[roundInDb].cardsPlayed[play], gameAfterPlay.rounds[roundInDb].trumpCard.suit);
                                var winnerIndex = getPlayerIndexByName(winnerName, round.roundPlayers);
    
                                gameAfterPlay.rounds[roundInDb].roundPlayers[winnerIndex].keeps++;
    
                                if (gameAfterPlay.rounds[roundInDb].cardsPlayed.length == gameAfterPlay.rounds[roundInDb].cardsInRound) {
                                    // this was the last card of the round
                                    newRound = true;
                                    gameAfterPlay.rounds[roundInDb].roundStatus = 2;
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
                                    }
    
                                    if (gameAfterPlay.rounds.length == roundInDb + 1) {
                                        // this was the last round of the game
                                        gameOver = true;
                                        gameStatus = 2;
                                    } else {
                                        // start next round
                                        gameAfterPlay.rounds[roundInDb+1].roundStatus = 1;
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
            
                        var gameInfo = gameToGameInfo(thisGame);
                        gameInfo.currentRound = playDetails.roundInd;
                        gameInfo.eventInfo = eventInfo;
                        io.to(gameInfo.id).emit('card played', gameInfo);
            
                        fn(gameInfo); // just DEBUG
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
                        id: val._id,
                        humanPlayersCount: val.humanPlayersCount,
                        computerPlayersCount: val.botPlayersCount,
                        startRound: val.startRound,
                        turnRound: val.turnRound,
                        endRound: val.endRound,
                        humanPlayers: parsedHumanPlayers(val.humanPlayers),
                        hasPassword: val.password.length > 0,
                    });
                });
    
                fn(games);
                console.log(games);
            });
        });
        
    });
} catch (error) {
    const err = JSON.stringify(error);
    console.log('Error while connecting to MongoDB: ' + error);
}


function parsedHumanPlayers(humanPlayers) {
    var retVal = [];
    humanPlayers.forEach(function(humanPlayer) {
        retVal.push({
            name: humanPlayer.name,
        });
    })
    return retVal;
}

function takeCardOut(hand, cardPlayed) {
    var newHand = [];
    var takenOutIndex = null;
    for (var i = 0; i < hand.length; i++) {
        if (hand[i].suit == cardPlayed.suit && hand[i].rank == cardPlayed.rank)
        {
            takenOutIndex = i;
            continue;
        }
        newHand.push(hand[i]);
    }
    return {
        newHand: newHand,
        takenOutIndex: takenOutIndex,
    }
}

function currentPlayTurnPlayerName(gameInDb) {
    var currentRoundIndex = getCurrentRoundIndex(gameInDb);
    var round = gameInDb.game.rounds[currentRoundIndex];
    var currentPlayIndex = getCurrentPlayIndex(round);
    if (currentRoundIndex == 0 && currentPlayIndex == 0 && round.cardsPlayed[currentPlayIndex].length == 0) return getRoundStarterName(round);
    if (round.cardsPlayed[currentPlayIndex].length == 0) return round.roundPlayers[getPlayerInCharge(currentRoundIndex, currentPlayIndex, gameInDb)].name;

    var playerInd = getPlayerInCharge(currentRoundIndex, currentPlayIndex, gameInDb) + round.cardsPlayed[currentPlayIndex].length;
    if (playerInd >= round.roundPlayers.length) playerInd-= round.roundPlayers.length;
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
    var currentRoundIndex = getCurrentRoundIndex(gameInDb);
    var currentRound = gameInDb.game.rounds[currentRoundIndex];
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
        humanPlayers: parsedHumanPlayers(game.humanPlayers),
        hasPassword: game.password.length > 0,
        currentRound: null,
        reloaded: false,
        eventInfo: null,
    };
    return gameInfo;
}

function getRoundDealerName(round) {
    return round.roundPlayers[round.dealerPositionIndex].name;
}

function getRoundStarterName(round) {
    return round.roundPlayers[round.starterPositionIndex].name;
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
            dealer: round.dealerPositionIndex == idx,
            name: player.name,
            promise: player.promise,
            keeps: player.keeps,
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
        var currentCard = cardsPlayed[i].card;
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
    if (playInd == 0) {
        return thisGame.game.rounds[roundInd].starterPositionIndex;
    } else {
        var winnerName = winnerOfPlay(thisGame.game.rounds[roundInd].cardsPlayed[playInd-1], thisGame.game.rounds[roundInd].trumpCard.suit); // winner of the previous play
        return getPlayerIndexByName(winnerName, thisGame.game.rounds[roundInd].roundPlayers);
    }
}

function getCurrentPlayIndex(round) {
    return round.cardsPlayed.length - 1;
}

function getCurrentRoundIndex(thisGame) {
    for (var i = 0; i < thisGame.game.rounds.length; i++) {
        if (thisGame.game.rounds[i].roundStatus == 1) return i;
    }
    return null;
}

function getCurrentCardInCharge(cardsPlayed) {
    if (!cardsPlayed[cardsPlayed.length - 1][0]) return null;
    return cardsPlayed[cardsPlayed.length - 1][0].card;
}

function getPromiseTable(thisGame) {
    var promisesByPlayers = [];
    var rounds = [];
    for (var i = 0; i < thisGame.game.playerOrder.length; i++) {
        var playerPromises = [];
        for (var j = 0; j < thisGame.game.rounds.length; j++) {
            if (true || thisGame.game.rounds[j].roundStatus > 0) {
                playerPromises.push({
                    promise: thisGame.game.rounds[j].roundPlayers[i].promise,
                    keep: thisGame.game.rounds[j].roundPlayers[i].keeps,
                    points: thisGame.game.rounds[j].roundPlayers[i].points,
                });
            }
            if (i == 0) {
                rounds.push({
                    cardsInRound: thisGame.game.rounds[j].cardsInRound,
                });
            }
        }
        promisesByPlayers.push(playerPromises);
    }

    var promiseTable = {
        players: thisGame.game.playerOrder,
        promisesByPlayers: promisesByPlayers,
        rounds: rounds,
    }
    return promiseTable;
}

function roundToPlayer(playerId, roundInd, thisGame, doReloadInit, newRound, gameOver) {
    var round = thisGame.game.rounds[roundInd];
    var playerName = getPlayerNameById(playerId, thisGame.humanPlayers);

    return {
        gameId: thisGame._id,
        roundInd: roundInd,
        cardsInRound: round.cardsInRound,
        dealerPositionIndex: round.dealerPositionIndex,
        starterPositionIndex: round.starterPositionIndex,
        myName: playerName,
        myCards: getPlayerCards(playerName, round),
        players: getRoundPlayers(playerName, round),
        trumpCard: round.trumpCard,
        playerInCharge: getPlayerInCharge(roundInd, getCurrentPlayIndex(round), thisGame),
        promiseTable: getPromiseTable(thisGame),
        cardInCharge: getCurrentCardInCharge(round.cardsPlayed),
        cardsPlayed: round.cardsPlayed,
        doReloadInit: doReloadInit,
        newRound: newRound,
        gameOver: gameOver,
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

function getdealerPositionIndex(roundIndex, totalPlayers) {
    if (roundIndex < totalPlayers) return roundIndex;
    return getdealerPositionIndex(roundIndex - totalPlayers, totalPlayers);
}

function initRound(roundIndex, cardsInRound, players) {
    var deck = initDeck();

    var roundPlayers = [];
    players.forEach(function (player, idx) {
        var playerCards = [];
        if (cardsInRound == 1) {
            var card = deck.draw(1);
            playerCards.push(card);
        } else {
            playerCards = deck.draw(cardsInRound);
        }
        var sortedPlayerCards = sortCardsDummy(playerCards);
        roundPlayers.push({
            name: player,
            cards: sortedPlayerCards,
            promise: null,
            keeps: 0,
            points: null,
            cardsToDebug: sortedPlayerCards,
        });
    });

    var dealerPositionIndex = getdealerPositionIndex(roundIndex, players.length);
    var starterPositionIndex = dealerPositionIndex + 1;
    if (starterPositionIndex >= players.length) starterPositionIndex-= players.length;

    var cardsPlayed = [];
    cardsPlayed.push([]);

    return {
        roundIndex: roundIndex,
        cardsInRound: cardsInRound,
        dealerPositionIndex: dealerPositionIndex,
        starterPositionIndex: starterPositionIndex,
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
