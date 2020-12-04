var doc = require('card-deck');

const speedPromiseMultiplierEven = 0.4;
const speedPromiseMultiplierNotEven = 0.6;

module.exports = {

    roundToPlayer: function (playerId, roundInd, thisGame, doReloadInit, newRound, gameOver) {
        var round = thisGame.game.rounds[roundInd];
        var playerName = this.getPlayerNameById(playerId, thisGame.humanPlayers);
    
        return {
            gameId: thisGame._id.toString(),
            roundInd: roundInd,
            cardsInRound: round.cardsInRound,
            dealerPositionIndex: round.dealerPositionIndex,
            starterPositionIndex: round.starterPositionIndex,
            myName: playerName,
            myCards: getPlayerCards(playerName, round, thisGame.speedPromise),
            players: getRoundPlayers(playerName, round, showPromisesNow('player', thisGame, roundInd)),
            trumpCard: showTrumpCard(thisGame, roundInd) ? round.trumpCard : null,
            playerInCharge: getPlayerInCharge(roundInd, this.getCurrentPlayIndex(round), thisGame),
            promiseTable: getPromiseTable(thisGame),
            cardInCharge: getCurrentCardInCharge(round.cardsPlayed),
            cardsPlayed: round.cardsPlayed,
            doReloadInit: doReloadInit,
            newRound: newRound,
            gameOver: gameOver,
            handValues: getHandValues(thisGame, roundInd),
            // round: round, // comment this when in production!
        };
    },

    takeCardOut: function (hand, cardPlayed) {
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
    },

    getPlayerNameById: function (id, players) {
        var playerName = null;
        players.forEach(function(player) {
            if (player.playerId == id) playerName = player.name;
        });
        return playerName;
    },
    
    parsedHumanPlayers: function (humanPlayers) {
        var retVal = [];
        humanPlayers.forEach(function(humanPlayer) {
            retVal.push({
                name: humanPlayer.name,
                type: 'human',
            });
        })
        return retVal;
    },

    gameToGameInfo: function (game) {
        var gameInfo = {
            id: game._id.toString(),
            humanPlayersCount: game.humanPlayersCount,
            computerPlayersCount: game.botPlayersCount,
            startRound: game.startRound,
            turnRound: game.turnRound,
            endRound: game.endRound,
            humanPlayers: this.parsedHumanPlayers(game.humanPlayers),
            hasPassword: game.password.length > 0,
            currentRound: null,
            reloaded: false,
            eventInfo: null,
            evenPromisesAllowed: game.evenPromisesAllowed == null || game.evenPromisesAllowed,
            visiblePromiseRound: game.visiblePromiseRound == null || game.visiblePromiseRound,
            onlyTotalPromise: game.onlyTotalPromise != null && game.onlyTotalPromise,
            freeTrump: game.freeTrump == null || game.freeTrump,
            hiddenTrump: game.hiddenTrump != null && game.hiddenTrump,
            speedPromise: game.speedPromise != null && game.speedPromise,
            privateSpeedGame: game.privateSpeedGame != null && game.privateSpeedGame,
            opponentPromiseCardValue: game.opponentPromiseCardValue != null && game.opponentPromiseCardValue,
            opponentGameCardValue: game.opponentGameCardValue != null && game.opponentGameCardValue,
        };
        return gameInfo;
    },
    
    getPlayerIndexByName: function (name, players) {
        var playerIndex = null;
        players.forEach(function(player, idx) {
            if (player.name == name) playerIndex = idx;
            return;
        });
        return playerIndex;
    },
                    
    winnerOfPlay: function (cardsPlayed, trumpSuit) {
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
    },

    getCurrentPlayIndex: function (round) {
        return round.cardsPlayed.length - 1;
    },

    getCurrentRoundIndex: function (thisGame) {
        for (var i = 0; i < thisGame.game.rounds.length; i++) {
            if (thisGame.game.rounds[i].roundStatus == 1) return i;
        }
        return null;
    },
    
    okToPlayCard: function (playedCard, playerName, gameInDb) {
        var cardInHand = false;
        var playerCards = null;
        var currentRoundIndex = this.getCurrentRoundIndex(gameInDb);
        var currentRound = gameInDb.game.rounds[currentRoundIndex];
        for (var i = 0; i < currentRound.roundPlayers.length; i++) {
            if (currentRound.roundPlayers[i].name == playerName) {
                playerCards = currentRound.roundPlayers[i].cards;
                cardInHand = isCardInHand(playedCard, playerCards);
                break;
            }
        }
        return cardInHand && currentPlayTurnPlayerName(gameInDb) == playerName && isCardAvailableToPlay(playedCard, currentRound.cardInCharge, playerCards, gameInDb.freeTrump, currentRound.trumpCard.suit);
    },
    
    initPlayers: function (gameInfo) {
        // first round is played by this order and the first player is the dealer of the first round
        var players = [];
        knuthShuffle(gameInfo.humanPlayers).forEach(function (player) {
            players.push({
                name: player.name,
                type: player.type,
                playerAi: player.type == 'ai' ? player.playerAi : null,
            });
        });
        return players;
    },
    
    initRounds: function (gameInfo, players) {
        var rounds = [];
        var roundIndex = 0;
        for (var i = gameInfo.startRound; i >= gameInfo.turnRound; i--) {
            rounds.push(initRound(roundIndex, i, players, gameInfo.speedPromise));
            roundIndex++;
        }
        for (var i = gameInfo.turnRound+1; i <= gameInfo.endRound; i++) {
            rounds.push(initRound(roundIndex, i, players, gameInfo.speedPromise));
            roundIndex++;
        }
        return rounds;
    },

    isLastPromiser: function (round) {
        var promisesMade = 0;
        for (var i = 0; i < round.roundPlayers.length; i++) {
            if (round.roundPlayers[i].promise != null) promisesMade++;
        }
        return promisesMade == round.roundPlayers.length - 1;
    },

    activatePlayer: function (humanPlayers, activateId) {
        var retPlayers = [];
        humanPlayers.forEach(function (player) {
            if (player.playerId == activateId && !player.active) player.active = true;
            retPlayers.push(player);
        });

        return retPlayers;
    },

    deActivatePlayer: function (humanPlayers, activateId) {
        var retPlayers = [];
        humanPlayers.forEach(function (player) {
            if (player.playerId == activateId && player.active) player.active = false;
            retPlayers.push(player);
        });

        return retPlayers;
    },

    imInThisGame: function (humanPlayers, myId) {
        var retVal = false;
        humanPlayers.forEach(function (player) {
            if (player.playerId == myId) {
                retVal = true;
                return;
            }
        });
        return retVal;
    },

    speedPromiseSolver: function (round, i) {
        var speedPromiseTotal = 0;
        if (round.roundPlayers[i].speedPromisePoints == 1) {
            // player has made speed promise
            if (round.roundPlayers[i].promise == round.roundPlayers[i].keeps) {
                // speed promise is kept
                // speed promise is 0.3 times (even round) or 0.6 times 
                speedPromiseTotal = Math.ceil(round.roundPlayers[i].points * (isEvenRound(round) ? speedPromiseMultiplierEven : speedPromiseMultiplierNotEven));
            } else {
                // speed promise went wrong
                // penalty is half of it what player may have got if speed promise is kept, including bonus
                var pointsIfKept = 0;
                if (round.roundPlayers[i].promise == 0) {
                    if (round.cardsInRound > 5) {
                        pointsIfKept = Math.ceil(15 * (isEvenRound(round) ? 1 + speedPromiseMultiplierEven : 1 + speedPromiseMultiplierNotEven));
                    } else {
                        pointsIfKept = Math.ceil(5 * (isEvenRound(round) ? 1 + speedPromiseMultiplierEven : 1 + speedPromiseMultiplierNotEven));
                    }
                } else {
                    pointsIfKept = Math.ceil((10 + round.roundPlayers[i].promise) * (isEvenRound(round) ? 1 + speedPromiseMultiplierEven : 1 + speedPromiseMultiplierNotEven));
                }
                speedPromiseTotal = Math.ceil(-0.5 * pointsIfKept);
            }
        } else if (round.roundPlayers[i].speedPromisePoints == 0) {
            // no changes to points
        } else if (round.roundPlayers[i].speedPromisePoints < 0) {
            // player promise went to penalties
            speedPromiseTotal = round.roundPlayers[i].speedPromisePoints; // speedPromisePoints are already negative
        }

        return speedPromiseTotal;
    }

}

function isEvenRound(round) {
    return round.totalPromise == round.cardsInRound;
}

function isOverPromisedRound(round) {
    return round.totalPromise > round.cardsInRound;
}

function isUnderPromisedRound(round) {
    return round.totalPromise < round.cardsInRound;
}

function showTrumpCard(thisGame, roundInd) {
    return (!thisGame.hiddenTrump || isRoundPromised(thisGame.game.rounds[roundInd]));
}

function getHandValues(thisGame, roundInd) {
    var showHandValue = false;
    
    if (thisGame.opponentPromiseCardValue && !isRoundPromised(thisGame.game.rounds[roundInd])) showHandValue = true;
    if (thisGame.opponentGameCardValue && isRoundPromised(thisGame.game.rounds[roundInd])) showHandValue = true;

    if (showHandValue) {
        var values = [];
        for (var i = 0; i < thisGame.game.rounds[roundInd].roundPlayers.length; i++) {
            var playerValues = 0;
            for (var j = 0; j < thisGame.game.rounds[roundInd].roundPlayers[i].cards.length; j++) {
                playerValues+= thisGame.game.rounds[roundInd].roundPlayers[i].cards[j].rank;
            }
            values.push({
                name: thisGame.game.rounds[roundInd].roundPlayers[i].name,
                cardValues: playerValues,
            });
        }
        return values;
    }
    return null;
}

function getCurrentCardInCharge(cardsPlayed) {
    if (!cardsPlayed[cardsPlayed.length - 1][0]) return null;
    return cardsPlayed[cardsPlayed.length - 1][0].card;
}

function getPlayerCards(name, round, speedPromise) {
    var cards = [];
    if (!speedPromise || isRoundPromised(round) || isMyPromiseTurn(round, name) || iHavePromised(round, name)) {
        round.roundPlayers.forEach(function (roundPlayer) {
            if (roundPlayer.name == name) cards = roundPlayer.cards;
        });
    }
    return cards;
}

function getPlayerPlayedCard(playerName, cardsPlayed) {
    var currentPlay = cardsPlayed[cardsPlayed.length-1];
    for (var i = 0; i < currentPlay.length; i++) {
        if (currentPlay[i].name == playerName) return currentPlay[i].card;
    }
    return null;
}

function getRoundPlayers(myName, round, showPromises) {
    var players = [];
    round.roundPlayers.forEach(function (player, idx) {
        players.push({
            thisIsMe: player.name == myName,
            dealer: round.dealerPositionIndex == idx,
            name: player.name,
            promise: showPromises || player.name == myName ? player.promise : (player.promise == null) ? null : -1,
            keeps: player.keeps,
            cardPlayed: getPlayerPlayedCard(player.name, round.cardsPlayed),
            speedPromisePoints: player.speedPromisePoints,
            speedPromiseTotal: player.speedPromiseTotal,
        });
    });
    return players;
}

function isRoundPlayed (round) {
    return round.roundStatus == 2;
}

function isRoundPromised (round) {
    for (var i = 0; i < round.roundPlayers.length; i++) {
        if (round.roundPlayers[i].promise == null) return false;
    }
    return true;
}

function showPromisesNow(type, thisGame, roundInd) {
    if (thisGame.onlyTotalPromise) {
        if (type == 'total') {
            return isRoundPromised(thisGame.game.rounds[roundInd]);
        } else {
            return isRoundPlayed(thisGame.game.rounds[roundInd]);
        }
    }

    if (!thisGame.visiblePromiseRound) {
        return isRoundPromised(thisGame.game.rounds[roundInd]);
    }

    return true;
}

function iHavePromised(round, myName) {
    for (var i = 0; i < round.roundPlayers.length; i++) {
        var chkPos = i + round.starterPositionIndex;
        if (chkPos >= round.roundPlayers.length) chkPos-= round.roundPlayers.length;
        if (round.roundPlayers[chkPos].promise != null && round.roundPlayers[chkPos].name == myName) {
            return true;
        }
    }
    return false;
}

function isMyPromiseTurn(round, myName) {
    for (var i = 0; i < round.roundPlayers.length; i++) {
        var chkPos = i + round.starterPositionIndex;
        if (chkPos >= round.roundPlayers.length) chkPos-= round.roundPlayers.length;
        if (round.roundPlayers[chkPos].promise == null) {
            // this is next player to promise
            return round.roundPlayers[chkPos].name == myName;
        }
    }
    return false;
}


function currentPlayTurnPlayerName(gameInDb) {
    var currentRoundIndex = module.exports.getCurrentRoundIndex(gameInDb);
    var round = gameInDb.game.rounds[currentRoundIndex];
    var currentPlayIndex = module.exports.getCurrentPlayIndex(round);
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

function isCardAvailableToPlay(playedCard, cardInCharge, playerCards, freeTrump, trumpSuit) {
    if (cardInCharge == null) return true;

    var hasSuitInHand = false;
    for (var i = 0; i < playerCards.length; i++) {
        if (playerCards[i].suit == cardInCharge.suit) hasSuitInHand = true;
    }

    if (freeTrump) {
        return !hasSuitInHand || playedCard.suit == cardInCharge.suit;
    } else {
        if (!hasSuitInHand) {
            var hasTrumpInHand = false;
            for (var i = 0; i < playerCards.length; i++) {
                if (playerCards[i].suit == trumpSuit) hasTrumpInHand = true;
            }
            return !hasTrumpInHand || playedCard.suit == trumpSuit;
        } else {
            return true;
        }
    }
}

function getRoundDealerName(round) {
    return round.roundPlayers[round.dealerPositionIndex].name;
}

function getRoundStarterName(round) {
    return round.roundPlayers[round.starterPositionIndex].name;
}

function getPlayerIdByName(name, players) {
    var playerId = null;
    players.forEach(function(player) {
        if (player.name == name) playerId = player.playerId;
    });
    return playerId;
}

function getPlayerInCharge(roundInd, playInd, thisGame) {
    if (playInd == 0) {
        return thisGame.game.rounds[roundInd].starterPositionIndex;
    } else {
        var winnerName = module.exports.winnerOfPlay(thisGame.game.rounds[roundInd].cardsPlayed[playInd-1], thisGame.game.rounds[roundInd].trumpCard.suit); // winner of the previous play
        return module.exports.getPlayerIndexByName(winnerName, thisGame.game.rounds[roundInd].roundPlayers);
    }
}

function playersToPromiseTable(playerOrderArr) {
    var retArr = [];
    for (i = 0; i < playerOrderArr.length; i++) {
        retArr.push(playerOrderArr[i].name);
    }
    return retArr;
}

function getPromiseTable(thisGame) {
    var promisesByPlayers = [];
    var rounds = [];
    for (var i = 0; i < thisGame.game.playerOrder.length; i++) {
        var playerPromises = [];
        for (var j = 0; j < thisGame.game.rounds.length; j++) {
            playerPromises.push({
                promise: showPromisesNow('player', thisGame, j) ? thisGame.game.rounds[j].roundPlayers[i].promise : null,
                keep: thisGame.game.rounds[j].roundPlayers[i].keeps,
                points: thisGame.game.rounds[j].roundPlayers[i].points,
                speedPromisePoints: thisGame.game.rounds[j].roundPlayers[i].speedPromisePoints,
                speedPromiseTotal: thisGame.game.rounds[j].roundPlayers[i].speedPromiseTotal,
            });
            if (i == 0) {
                rounds.push({
                    cardsInRound: thisGame.game.rounds[j].cardsInRound,
                    totalPromise: showPromisesNow('total', thisGame, j) ? thisGame.game.rounds[j].totalPromise : null,
                });
            }
        }
        promisesByPlayers.push(playerPromises);
    }

    var promiseTable = {
        players: playersToPromiseTable(thisGame.game.playerOrder),
        promisesByPlayers: promisesByPlayers,
        rounds: rounds,
    }
    return promiseTable;
}


function getdealerPositionIndex(roundIndex, totalPlayers) {
    if (roundIndex < totalPlayers) return roundIndex;
    return getdealerPositionIndex(roundIndex - totalPlayers, totalPlayers);
}

function initRound(roundIndex, cardsInRound, players, speedPromise) {
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
            name: player.name,
            cards: sortedPlayerCards,
            promise: null,
            keeps: 0,
            points: null,
            cardsToDebug: sortedPlayerCards,
            type: player.type,
            speedPromisePoints: speedPromise ? 1 : null,
            speedPromiseTotal: null,
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

