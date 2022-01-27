module.exports = {
    averagePoints: function (games, playerName) {
        let totalPoints = 0;
        self = this;
        games.forEach(function(game) {
            totalPoints+= self.getGamePoints(game.game, playerName);
        });

        return totalPoints / games.length;
    },

    getGamePoints: function (game, playerName) {
        let points = 0;
        game.rounds.forEach(function(round) {
            points+= getRoundPoints(round.roundPlayers, playerName);
        });
        return points;
    },

    generateGameStatistics: function(game, gameIsPlayed) {
        const playersStatistics = getPlayerStatistics(game).sort(sortPlayerStatistics);
        for (let i = 0; i < playersStatistics.length; i++) {
            const position = i+1;
            playersStatistics[i].position = position;
            playersStatistics[i].scorePoints = (playersStatistics.length-position)/playersStatistics.length;
        }

        let spurtAndMelt = {
            spurtGap: null,
            spurtFrom: null,
            meltGap: null,
            meltFrom: null,
            melter: null,
        }

        if (gameIsPlayed) {
            const roundStats = this.getGameReport(game, playersStatistics);
            const winnerName = playersStatistics[0].playerName;

            let maxSpurt = 0;
            let spurtFrom = 0;
            let maxMelt = 0;
            let meltFrom = 0;
            let melter = '';
            for (let j = 0; j < roundStats.points[0].length; j++) {
                let winnerPoints = 0;
                let roundBest = null;
                let points1 = null;
                let points2 = null;
                let curMelter = '';
                for (let i = 0; i < roundStats.points.length; i++) {
                    if (roundStats.players[i] == winnerName) {
                        winnerPoints = roundStats.points[i][j];
                    } else {
                        if (roundBest == null || roundStats.points[i][j] > roundBest) {
                            roundBest = roundStats.points[i][j];
                        }

                        if (points1 == null) {
                            points1 = roundStats.points[i][j];
                            curMelter = roundStats.players[i];
                        } else {
                            if (roundStats.points[i][j] > points1) {
                                points2 = points1;
                                points1 = roundStats.points[i][j];
                                curMelter = roundStats.players[i];
                            } else if (points2 == null) {
                                points2 = roundStats.points[i][j];
                            } else if (roundStats.points[i][j] > points2) {
                                points2 = roundStats.points[i][j];
                            }
                        }
                    }
                }
                if (points1 > winnerPoints) {
                    const thisLead = points1 - Math.max(winnerPoints, points2);
                    if (maxMelt <= thisLead) {
                        maxMelt = thisLead;
                        meltFrom = j;
                        melter = curMelter;
                    }
                }
                
                const thisSpurt = roundBest - winnerPoints;
                if (winnerPoints < roundBest && thisSpurt >= maxSpurt) {
                    maxSpurt = thisSpurt;
                    spurtFrom = j;
                }
            }

            if (spurtFrom > 0) {
                spurtAndMelt.spurtGap = maxSpurt;
                spurtAndMelt.spurtFrom = spurtFrom;
                spurtAndMelt.meltGap = maxMelt;
                spurtAndMelt.meltFrom = meltFrom;
                spurtAndMelt.melter = melter;
            }
        }

        const roundsPlayed = getRoundsPlayed(game.rounds);

        return {
            generated: new Date().getTime(),
            playersStatistics: playersStatistics,
            winnerName: gameIsPlayed ? playersStatistics[0].playerName : '',
            winnerPoints: gameIsPlayed ? playersStatistics[0].totalPoints : '',
            roundsPlayed: roundsPlayed.bigRounds + roundsPlayed.smallRounds,
            bigRoundsPlayed: roundsPlayed.bigRounds,
            smallRoundsPlayed: roundsPlayed.smallRounds,
            cardsHit: cardsHitInGame(game.rounds),
            spurtAndMelt: spurtAndMelt,
        }
    },

    getGameReport: function (game, playersStatistics, onlyName) {
        const retObj = {
            players: null,
            points: null,
            rounds: null,
            pointsBig: null, // rounds of 6-10 cards
            pointsSmall: null, // rounds of 1-5 cards
            keepsBig: null, // rounds of 6-10 cards
            keepsSmall: null, // rounds of 1-5 cards
            smallStart: null,
            smallEnd: null,
            trumps: null,
            bigCards: null,
            smallCards: null,
            otherCards: null,
        };

        const players = [];
        const startPointsArr = [0];
        const roundsArr = [0];
        const pointsBigArr = [];
        const pointsSmallArr = [];
        const keepsBigArr = [];
        const keepsSmallArr = [];
        const pointsArr = [];
        const trumpsArr = [];
        const bigCardsArr = [];
        const smallCardsArr = [];
        const otherCardsArr = [];
        for (let i = 0; i < game.playerOrder.length; i++) {
            const playerName = game.playerOrder[i].name == null ? game.playerOrder[i] : game.playerOrder[i].name;
            if (onlyName !== undefined && onlyName !== playerName) continue;
            players.push(playerName);
            startPointsArr.push(0);
            keepsBigArr.push(0);
            keepsSmallArr.push(0);
            const totalPointsByPlayer = [0];
            let pointsPerPlayer = 0;
            let bigPointsPerPlayer = 0;
            let smallPointsPerPlayer = 0;
            for (let j = 0; j < game.rounds.length; j++) {
                for (let k = 0; k < game.rounds[j].roundPlayers.length; k++) {
                    if (game.rounds[j].roundPlayers[k].name == playerName) {
                        const pointsFromRound = game.rounds[j].roundPlayers[k].points;
                        pointsPerPlayer+= pointsFromRound;
                        totalPointsByPlayer.push(pointsPerPlayer);
                        if (game.rounds[j].cardsInRound > 5) {
                            bigPointsPerPlayer+= pointsFromRound;
                        } else {
                            smallPointsPerPlayer+= pointsFromRound;
                        }
                        break;
                    }
                }
            }
            if (playersStatistics != null) {
                for (let j = 0; j < playersStatistics.length; j++) {
                    if (playersStatistics[j].playerName == playerName) {
                        trumpsArr.push(playersStatistics[j].trumpsInGame);
                        bigCardsArr.push(playersStatistics[j].bigsCardsInGame);
                        smallCardsArr.push(playersStatistics[j].smallCardsInGame);
                        otherCardsArr.push(playersStatistics[j].otherCardsInGame);
                        break;
                    }
                }
            }
            pointsArr.push(totalPointsByPlayer);
            pointsBigArr.push(bigPointsPerPlayer);
            pointsSmallArr.push(smallPointsPerPlayer);
        }
        retObj.players = players;
        
        for (let i = 0; i < game.rounds.length; i++) {
            if (game.rounds[i].roundStatus != 2) break;
            roundsArr.push(i+1);
            for (let j = 0; j < game.rounds[i].roundPlayers.length; j++) {
                if (game.rounds[i].roundPlayers[j].promise == game.rounds[i].roundPlayers[j].keeps) {
                    if (game.rounds[i].cardsInRound > 5) {
                        if (retObj.smallStart != null && retObj.smallEnd == null) {
                            retObj.smallEnd = i;
                        }
                        keepsBigArr[j]++;
                    } else {
                        if (retObj.smallStart == null) {
                            retObj.smallStart = i;
                        }
                        keepsSmallArr[j]++;
                    }
                }
            }
        }

        retObj.points = pointsArr;
        retObj.rounds = roundsArr;
        retObj.pointsBig = pointsBigArr;
        retObj.pointsSmall = pointsSmallArr;
        retObj.keepsBig = keepsBigArr;
        retObj.keepsSmall = keepsSmallArr;
        retObj.trumps = trumpsArr;
        retObj.bigCards = bigCardsArr;
        retObj.smallCards = smallCardsArr;
        retObj.otherCards = otherCardsArr;

        return retObj;
    },

}

function countHandCards(game, playerName) {
    let trumps = 0;
    let bigCards = 0;
    let smallCards = 0;
    let otherCards = 0;
    for (let roundInd = 0; roundInd < game.rounds.length; roundInd++) {
        const round = game.rounds[roundInd];
        const trumpSuit = round.trumpCard.suit;
        for (let i = 0; i < round.cardsPlayed.length; i++) {
            for (let j = 0; j < round.cardsPlayed[i].length; j++) {
                if (round.cardsPlayed[i][j].name == playerName) {
                    if (round.cardsPlayed[i][j].card.suit == trumpSuit) {
                        trumps++;
                    } else {
                        if (round.cardsPlayed[i][j].card.rank > 10) {
                            bigCards++;
                        } else if (round.cardsPlayed[i][j].card.rank < 6) {
                            smallCards++;
                        } else {
                            otherCards++;
                        }
                    }
                    break;
                }
            }
        }
    }
    return { trumps: trumps, bigCards: bigCards, smallCards: smallCards, otherCards: otherCards };
}

function getPlayerStatistics(game) {
    const players = [];
    game.playerOrder.forEach(function (player) {
        const playerName = player.name != null ? player.name : player;
        const totalPoints = module.exports.getGamePoints(game, playerName);
        const gameInfo = getPlayerGameInfoForStats(game, playerName);
        const pointsPerKeeps = gameInfo.totalKeeps == 0 ? 0 : totalPoints/gameInfo.totalKeeps;
        const cards = countHandCards(game, playerName);
        players.push({
            playerName: playerName,
            totalPoints: totalPoints,
            totalKeeps: gameInfo.totalKeeps,
            bigPointsByZero: gameInfo.bigPointsByZero,
            bigZeroKeepPromisesCount: gameInfo.bigZeroKeepPromisesCount,
            bigZeroFailPromisesCount: gameInfo.bigZeroFailPromisesCount,
            smallPointsNotZero: gameInfo.smallPointsNotZero,
            smallNotZeroKeepPromisesCount: gameInfo.smallNotZeroKeepPromisesCount,
            smallNotZeroFailPromisesCount: gameInfo.smallNotZeroFailPromisesCount,
            pointsPerKeeps: pointsPerKeeps,
            position: null,
            scorePoints: null,
            trumpsInGame: cards.trumps,
            bigsCardsInGame: cards.bigCards,
            smallCardsInGame: cards.smallCards,
            otherCardsInGame: cards.otherCards,
        });
    });
    return players;
}

function getRoundPoints(roundPlayers, playerName) {
    for (let i = 0; i < roundPlayers.length; i++) {
        if (roundPlayers[i].name == playerName) return roundPlayers[i].points;
    }
    return 0;
}

function getPlayerRoundInfoForStats(roundPlayers, playerName) {
    const roundInfo = {
        keeps: 0,
        promise: 0,
        points: 0
    }
    for (let i = 0; i < roundPlayers.length; i++) {
        if (roundPlayers[i].name == playerName) {
            roundInfo.keeps = roundPlayers[i].keeps;
            roundInfo.promise = roundPlayers[i].promise;
            roundInfo.points = roundPlayers[i].points;
            return roundInfo;
        }
    }
    return roundInfo;
}

function getPlayerGameInfoForStats(game, playerName) {
    const gameInfo = {
        totalKeeps: 0,
        bigPointsByZero: 0,
        bigZeroKeepPromisesCount: 0,
        bigZeroFailPromisesCount: 0,
        smallPointsNotZero: 0,
        smallNotZeroKeepPromisesCount: 0,
        smallNotZeroFailPromisesCount: 0
    }
    game.rounds.forEach(function(round) {
        const roundInfo = getPlayerRoundInfoForStats(round.roundPlayers, playerName);
        const roundKept = roundInfo.keeps == roundInfo.promise;
        if (roundKept) gameInfo.totalKeeps++;
        if (round.cardsInRound > 5) {
            if (roundInfo.promise == 0) {
                if (roundKept) {
                    gameInfo.bigZeroKeepPromisesCount++;
                    gameInfo.bigPointsByZero+= roundInfo.points;
                } else {
                    gameInfo.bigZeroFailPromisesCount++;
                }
            }
        } else {
            if (roundInfo.promise > 0) {
                if (roundKept) {
                    gameInfo.smallNotZeroKeepPromisesCount++;
                    gameInfo.smallPointsNotZero+= roundInfo.points;
                } else {
                    gameInfo.smallNotZeroFailPromisesCount++;
                }
            }
        }
    });
    return gameInfo;
}

function sortPlayerStatistics(a, b) {
    if (a.totalPoints > b.totalPoints) return -1;
    if (a.totalPoints < b.totalPoints) return 1;
    if (a.totalPoints == b.totalPoints && a.totalKeeps > b.totalKeeps) return -1;
    if (a.totalPoints == b.totalPoints && a.totalKeeps < b.totalKeeps) return 1;
    return 0;
}

function getRoundsPlayed(rounds) {
    const roundsPlayed = {
        bigRounds: 0,
        smallRounds: 0
    }
    rounds.forEach(function (round) {
        if (round.roundStatus == 2) {
            if (round.cardsInRound > 5) {
                roundsPlayed.bigRounds++;
            } else {
                roundsPlayed.smallRounds++;
            }
        }
    });
    return roundsPlayed;
}

function cardsHitInGame(rounds) {
    let cardsHit = 0;
    rounds.forEach(function (round) {
        if (round.roundStatus > 0) {
            round.cardsPlayed.forEach(function (cardArr) {
                cardsHit+= cardArr.length;
            });
        }
    });
    return cardsHit;
}