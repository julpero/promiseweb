const doc = require('card-deck');

const speedPromiseMultiplierEven = 0.4;
const speedPromiseMultiplierNotEven = 0.6;

module.exports = {

    roundToPlayer: function (playerId, roundInd, thisGame, doReloadInit, newRound, gameOver) {
        const round = thisGame.game.rounds[roundInd];
        const playerName = this.getPlayerNameById(playerId, thisGame.humanPlayers);
        const play = this.getCurrentPlayIndex(round);
        const playerGoingToWinThisPlay = this.winnerOfPlay(round.cardsPlayed[play], round.trumpCard.suit);

        return {
            gameId: thisGame._id.toString(),
            roundInd: roundInd,
            cardsInRound: round.cardsInRound,
            dealerPositionIndex: round.dealerPositionIndex,
            starterPositionIndex: round.starterPositionIndex,
            myName: playerName,
            myCards: getPlayerCards(playerName, round, thisGame.speedPromise),
            players: getRoundPlayers(playerName, round, play, showPromisesNow('player', thisGame, roundInd), thisGame.humanPlayers, thisGame.hiddenCardsMode, playerGoingToWinThisPlay),
            trumpCard: showTrumpCard(thisGame, roundInd) ? round.trumpCard : null,
            playerInCharge: getPlayerInCharge(roundInd, this.getCurrentPlayIndex(round), thisGame),
            promiseTable: getPromiseTable(thisGame),
            cardInCharge: getCurrentCardInCharge(round.cardsPlayed),
            playerGoingToWinThisPlay: playerGoingToWinThisPlay,
            cardsPlayed: getCardsPlayed(round.cardsPlayed, thisGame.game.playerOrder.length, play, playerName, thisGame.hiddenCardsMode, playerGoingToWinThisPlay),
            doReloadInit: doReloadInit,
            newRound: newRound,
            gameOver: gameOver,
            handValues: getHandValues(thisGame, roundInd)
            // round: round, // comment this when in production!
        };
    },

    takeCardOut: function (hand, cardPlayed) {
        const newHand = [];
        let takenOutIndex = null;
        for (let i = 0; i < hand.length; i++) {
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
        let playerName = null;
        players.forEach(function(player) {
            if (player.playerId == id) playerName = player.name;
        });
        return playerName;
    },
    
    parsedHumanPlayers: function (humanPlayers) {
        const retVal = [];
        humanPlayers.forEach(function(humanPlayer) {
            retVal.push({
                name: humanPlayer.name,
                type: 'human',
            });
        })
        return retVal;
    },

    gameToGameInfo: function (game) {
        const gameInfo = {
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
            hiddenCardsMode: game.hiddenCardsMode == null ? 0 : game.hiddenCardsMode,
        };
        return gameInfo;
    },
    
    getPlayerIndexByName: function (name, players) {
        let playerIndex = null;
        players.forEach(function(player, idx) {
            if (player.name == name) playerIndex = idx;
            return;
        });
        return playerIndex;
    },
                    
    winnerOfPlay: function (cardsPlayedInPlay, trumpSuit) {
        if (cardsPlayedInPlay.length == 0) return null;
        let winner = cardsPlayedInPlay[0].name;
        let winningCard = cardsPlayedInPlay[0].card;
        for (let i = 1; i < cardsPlayedInPlay.length; i++) {
            let wins = false;
            const currentCard = cardsPlayedInPlay[i].card;
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
                winner = cardsPlayedInPlay[i].name;
                winningCard = currentCard;
            }
        }
    
        return winner;
    },

    getCurrentPlayIndex: function (round) {
        return round.cardsPlayed.length - 1;
    },

    getCurrentRoundIndex: function (thisGame) {
        for (let i = 0; i < thisGame.game.rounds.length; i++) {
            if (thisGame.game.rounds[i].roundStatus == 1) return i;
        }
        return null;
    },
    
    okToPlayCard: function (playedCard, playerName, gameInDb) {
        let cardInHand = false;
        let playerCards = null;
        const currentRoundIndex = this.getCurrentRoundIndex(gameInDb);
        const currentRound = gameInDb.game.rounds[currentRoundIndex];
        for (let i = 0; i < currentRound.roundPlayers.length; i++) {
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
        const players = [];
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
        const rounds = [];
        let roundIndex = 0;
        for (let i = gameInfo.startRound; i >= gameInfo.turnRound; i--) {
            rounds.push(initRound(roundIndex, i, players, gameInfo.speedPromise));
            roundIndex++;
        }
        for (let i = gameInfo.turnRound+1; i <= gameInfo.endRound; i++) {
            rounds.push(initRound(roundIndex, i, players, gameInfo.speedPromise));
            roundIndex++;
        }
        return rounds;
    },

    isLastPromiser: function (round) {
        let promisesMade = 0;
        for (let i = 0; i < round.roundPlayers.length; i++) {
            if (round.roundPlayers[i].promise != null) promisesMade++;
        }
        return promisesMade == round.roundPlayers.length - 1;
    },

    activatePlayer: function (humanPlayers, activateId) {
        const retPlayers = [];
        humanPlayers.forEach(function (player) {
            if (player.playerId == activateId && !player.active) player.active = true;
            retPlayers.push(player);
        });

        return retPlayers;
    },

    deActivatePlayer: function (humanPlayers, activateId) {
        const retPlayers = [];
        humanPlayers.forEach(function (player) {
            if (player.playerId == activateId && player.active) player.active = false;
            retPlayers.push(player);
        });

        return retPlayers;
    },

    imInThisGame: function (humanPlayers, myId) {
        let retVal = false;
        humanPlayers.forEach(function (player) {
            if (player.playerId == myId) {
                retVal = true;
                return;
            }
        });
        return retVal;
    },

    speedPromiseSolver: function (round, i) {
        let speedPromiseTotal = 0;
        if (round.roundPlayers[i].speedPromisePoints == 1) {
            // player has made speed promise
            if (round.roundPlayers[i].promise == round.roundPlayers[i].keeps) {
                // speed promise is kept
                // speed promise is 0.3 times (even round) or 0.6 times 
                speedPromiseTotal = Math.ceil(round.roundPlayers[i].points * (isEvenRound(round) ? speedPromiseMultiplierEven : speedPromiseMultiplierNotEven));
            } else {
                // speed promise went wrong
                // penalty is half of it what player may have got if speed promise is kept, including bonus
                let pointsIfKept = 0;
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
    },

    okToReturnCard: function (hiddenCardsMode, thisIsFirstCard, thisIsLastCard, thisIsWinnerCard) {
        if (hiddenCardsMode == null || hiddenCardsMode == 0) return true;
        if (hiddenCardsMode == 2 && thisIsWinnerCard) return true;
        if (thisIsFirstCard || thisIsLastCard) return true;
        return false;
    },

    checkPlayerNames: function (wholeGame, statNames) {
        const playerNames = [];
        const wrongNames = [];
        wholeGame.humanPlayers.forEach (function (humanPlayer) {
            const name = humanPlayer.name != null ? humanPlayer.name : humanPlayer;
            playerNames.push(name);
        });
        wholeGame.game.playerOrder.forEach(function (player) {
            const name = player.name != null ? player.name : player;
            if (!playerNames.includes(name) && !wrongNames.includes(name)) wrongNames.push(name);
        });
        wholeGame.game.rounds.forEach(function (round) {
            round.roundPlayers.forEach(function (roundPlayer) {
                const name = roundPlayer.name;
                if (!playerNames.includes(name) && !wrongNames.includes(name)) wrongNames.push(name);
            });
            round.cardsPlayed.forEach(function (play) {
                play.forEach(function (card) {
                    const name = card.name;
                    if (!playerNames.includes(name) && !wrongNames.includes(name)) wrongNames.push(name);
                });
            });
        });

        if (statNames != null && statNames.length > 0) {
            statNames.forEach(function (name) {
                if (!playerNames.includes(name) && !wrongNames.includes(name)) wrongNames.push(name);
            });
        }
        // if (wrongNames.length > 0) console.log(wrongNames);

        return wrongNames;
    }

}

function isEvenRound(round) {
    return round.totalPromise == round.cardsInRound;
}

function showTrumpCard(thisGame, roundInd) {
    return (!thisGame.hiddenTrump || isRoundPromised(thisGame.game.rounds[roundInd]));
}

function getCardsPlayed(cardsPlayed, playerCount, play, playerName, hiddenCardsMode, playerGoingToWinThisPlay) {
    if (hiddenCardsMode == null || hiddenCardsMode == 0) return cardsPlayed;
    const retArr = [];
    for (let i = 0; i < cardsPlayed.length; i++) {
        if (i != play || cardsPlayed[i].length == playerCount) {
            retArr.push(cardsPlayed[i]);
        } else {
            const playArr = [];
            for (let j = 0; j < cardsPlayed[i].length; j++) {
                if ((j == 0) || (cardsPlayed[i][j].name == playerName) || (hiddenCardsMode == 2 && cardsPlayed[i][j].name == playerGoingToWinThisPlay)) { // show card in charge and winning card
                    playArr.push({
                        name: cardsPlayed[i][j].name,
                        card: cardsPlayed[i][j].card,
                    });
                } else {
                    playArr.push({
                        name: cardsPlayed[i][j].name,
                        card: {
                            suit: 'dummy',
                            rank: 0,
                        },
                    });
                }
            }
            retArr.push(playArr);
        }
    }
    return retArr;
}

function getHandValues(thisGame, roundInd) {
    let showHandValue = false;
    
    if (thisGame.opponentPromiseCardValue && !isRoundPromised(thisGame.game.rounds[roundInd])) showHandValue = true;
    if (thisGame.opponentGameCardValue && isRoundPromised(thisGame.game.rounds[roundInd])) showHandValue = true;

    if (showHandValue) {
        const values = [];
        for (let i = 0; i < thisGame.game.rounds[roundInd].roundPlayers.length; i++) {
            let playerValues = 0;
            for (let j = 0; j < thisGame.game.rounds[roundInd].roundPlayers[i].cards.length; j++) {
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
    let cards = [];
    if (!speedPromise || isRoundPromised(round) || isMyPromiseTurn(round, name) || iHavePromised(round, name)) {
        round.roundPlayers.forEach(function (roundPlayer) {
            if (roundPlayer.name == name) cards = roundPlayer.cards;
        });
    }
    return cards;
}

function getPlayerPlayedCard(playerName, cardsPlayed, returnCard) {
    const currentPlay = cardsPlayed[cardsPlayed.length-1];
    for (let i = 0; i < currentPlay.length; i++) {
        if (currentPlay[i].name == playerName) return returnCard ? currentPlay[i].card : { suit: 'dummy', rank: 0 };
    }
    return null;
}

function parsePlayerStats(playersStats, playerName) {
    for (let i = 0; i < playersStats.length; i++) {
        if (playersStats[i].name == playerName) return playersStats[i].playerStats;
    }
    return null;
}

function getFirstPlayerInThePlay(round, play) {
    if (round.cardsPlayed[play] && round.cardsPlayed[play].length > 0) return round.cardsPlayed[play][0].name;
    if (play == 0 && round.cardsPlayed[play].length == 0) return round.roundPlayers[round.starterPositionIndex].name;
    return module.exports.winnerOfPlay(round.cardsPlayed[play-1], round.trumpCard.suit);
}

function getLastPlayerInThePlay(round, play) {
    if (round.cardsPlayed[play] && round.cardsPlayed[play].length == round.roundPlayers.length) return round.cardsPlayed[play][round.cardsPlayed[play].length-1].name;
    return "thisisnotvalid";
}

function getRoundPlayers(myName, round, play, showPromises, playersStats, hiddenCardsMode, playerGoingToWinThisPlay) {
    const players = [];
    const firstPlayerInThePlay = getFirstPlayerInThePlay(round, play);
    const lastPlayerInThePlay = getLastPlayerInThePlay(round, play);

    round.roundPlayers.forEach(function (player, idx) {
        const thisIsMe = player.name == myName;
        const returnCard = thisIsMe || module.exports.okToReturnCard(hiddenCardsMode, player.name == firstPlayerInThePlay, player.name == lastPlayerInThePlay, player.name == playerGoingToWinThisPlay);
        players.push({
            thisIsMe: thisIsMe,
            dealer: round.dealerPositionIndex == idx,
            name: player.name,
            promise: showPromises || thisIsMe ? player.promise : (player.promise == null) ? null : -1,
            keeps: player.keeps,
            cardPlayed: getPlayerPlayedCard(player.name, round.cardsPlayed, returnCard),
            speedPromisePoints: player.speedPromisePoints,
            speedPromiseTotal: player.speedPromiseTotal,
            playerStats: parsePlayerStats(playersStats, player.name)
        });
    });
    return players;
}

function isRoundPlayed (round) {
    return round.roundStatus == 2;
}

function isRoundPromised (round) {
    for (let i = 0; i < round.roundPlayers.length; i++) {
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
    for (let i = 0; i < round.roundPlayers.length; i++) {
        let chkPos = i + round.starterPositionIndex;
        if (chkPos >= round.roundPlayers.length) chkPos-= round.roundPlayers.length;
        if (round.roundPlayers[chkPos].promise != null && round.roundPlayers[chkPos].name == myName) {
            return true;
        }
    }
    return false;
}

function isMyPromiseTurn(round, myName) {
    for (let i = 0; i < round.roundPlayers.length; i++) {
        let chkPos = i + round.starterPositionIndex;
        if (chkPos >= round.roundPlayers.length) chkPos-= round.roundPlayers.length;
        if (round.roundPlayers[chkPos].promise == null) {
            // this is next player to promise
            return round.roundPlayers[chkPos].name == myName;
        }
    }
    return false;
}


function currentPlayTurnPlayerName(gameInDb) {
    const currentRoundIndex = module.exports.getCurrentRoundIndex(gameInDb);
    const round = gameInDb.game.rounds[currentRoundIndex];
    const currentPlayIndex = module.exports.getCurrentPlayIndex(round);
    if (currentRoundIndex == 0 && currentPlayIndex == 0 && round.cardsPlayed[currentPlayIndex].length == 0) return getRoundStarterName(round);
    if (round.cardsPlayed[currentPlayIndex].length == 0) return round.roundPlayers[getPlayerInCharge(currentRoundIndex, currentPlayIndex, gameInDb)].name;

    let playerInd = getPlayerInCharge(currentRoundIndex, currentPlayIndex, gameInDb) + round.cardsPlayed[currentPlayIndex].length;
    if (playerInd >= round.roundPlayers.length) playerInd-= round.roundPlayers.length;
    return round.roundPlayers[playerInd].name;
}

function isCardInHand(playedCard, playerCards) {
    for (let j = 0; j < playerCards.length; j++) {
        if (playerCards[j].suit == playedCard.suit && playerCards[j].rank == playedCard.rank) {
            return true;
        }
    }
    return false;
}

function isCardAvailableToPlay(playedCard, cardInCharge, playerCards, freeTrump, trumpSuit) {
    if (cardInCharge == null) return true;

    let hasSuitInHand = false;
    for (let i = 0; i < playerCards.length; i++) {
        if (playerCards[i].suit == cardInCharge.suit) hasSuitInHand = true;
    }

    if (freeTrump) {
        return !hasSuitInHand || playedCard.suit == cardInCharge.suit;
    } else {
        if (!hasSuitInHand) {
            let hasTrumpInHand = false;
            for (let i = 0; i < playerCards.length; i++) {
                if (playerCards[i].suit == trumpSuit) hasTrumpInHand = true;
            }
            return !hasTrumpInHand || playedCard.suit == trumpSuit;
        } else {
            return true;
        }
    }
}

function getRoundStarterName(round) {
    return round.roundPlayers[round.starterPositionIndex].name;
}

function getPlayerInCharge(roundInd, playInd, thisGame) {
    if (playInd == 0) {
        return thisGame.game.rounds[roundInd].starterPositionIndex;
    } else {
        const winnerName = module.exports.winnerOfPlay(thisGame.game.rounds[roundInd].cardsPlayed[playInd-1], thisGame.game.rounds[roundInd].trumpCard.suit); // winner of the previous play
        return module.exports.getPlayerIndexByName(winnerName, thisGame.game.rounds[roundInd].roundPlayers);
    }
}

function playersToPromiseTable(playerOrderArr) {
    const retArr = [];
    for (let i = 0; i < playerOrderArr.length; i++) {
        retArr.push(playerOrderArr[i].name);
    }
    return retArr;
}

function getPromiseTable(thisGame) {
    const promisesByPlayers = [];
    const rounds = [];
    for (let i = 0; i < thisGame.game.playerOrder.length; i++) {
        const playerPromises = [];
        for (let j = 0; j < thisGame.game.rounds.length; j++) {
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

    const promiseTable = {
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
    const deck = initDeck();

    const roundPlayers = [];
    players.forEach(function (player) {
        let playerCards = [];
        if (cardsInRound == 1) {
            const card = deck.draw(1);
            playerCards.push(card);
        } else {
            playerCards = deck.draw(cardsInRound);
        }
        const sortedPlayerCards = sortCardsDummy(playerCards);
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

    const dealerPositionIndex = getdealerPositionIndex(roundIndex, players.length);
    let starterPositionIndex = dealerPositionIndex + 1;
    if (starterPositionIndex >= players.length) starterPositionIndex-= players.length;

    const cardsPlayed = [];
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
    let rand, temp, i;
 
    for (i = arr.length - 1; i > 0; i -= 1) {
        rand = Math.floor((i + 1) * Math.random()); //get random between zero and i (inclusive)
        temp = arr[rand]; //swap i and the zero-indexed number
        arr[rand] = arr[i];
        arr[i] = temp;
    }
    return arr;
}

function sortCardsDummy(cards) {
    const sortedCards = [];
    const suits = ['hearts', 'diamonds', 'clubs',  'spades'];
    suits.forEach(function (suit) {
        for (let i = 2; i <= 14; i++) {
            for (let j = 0; j < cards.length; j++) {
                if (cards[j].suit == suit && cards[j].rank == i) sortedCards.push(cards[j]);
            }
        }
    });
    return sortedCards;
}

function initDeck() {
    const cards = [];
    const suits = ['hearts', 'diamonds', 'clubs',  'spades'];
    suits.forEach(function (suit) {
        for (let i = 2; i <= 14; i++) cards.push({
            suit: suit,
            rank: i
        });
    });
    const deck = new doc(cards);
    deck.shuffle();
    return deck;
}

