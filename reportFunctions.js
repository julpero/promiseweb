module.exports = {
    averagePoints: function (games, playerName) {
        var totalPoints = 0;
        self = this;
        games.forEach(function(game) {
            totalPoints+= self.getGamePoints(game.game, playerName);
        });

        return totalPoints / games.length;
    },

    getGamePoints: function (game, playerName) {
        var points = 0;
        game.rounds.forEach(function(round) {
            points+= getRoundPoints(round.roundPlayers, playerName);
        });
        return points;
    },

    generateGameStatistics: function(game, gameIsPlayed) {
        const playersStatistics = getPlayerStatistics(game).sort(sortPlayerStatistics);
        for (var i = 0; i < playersStatistics.length; i++) {
            const position = i+1;
            playersStatistics[i].position = position;
            playersStatistics[i].scorePoints = (playersStatistics.length-position)/playersStatistics.length;
        }

        var spurtAndMelt = {
            spurtGap: null,
            spurtFrom: null,
            meltGap: null,
            meltFrom: null,
            melter: null,
        }
        if (gameIsPlayed) {
            const roundStats = this.getGameReport(game);
            const winnerName = playersStatistics[0].playerName;

            var maxSpurt = 0;
            var spurtFrom = 0;
            var maxMelt = 0;
            var meltFrom = 0;
            var melter = '';
            for (var j = 0; j < roundStats.points[0].length; j++) {
                var winnerPoints = 0;
                var roundBest = null;
                var points1 = null;
                var points2 = null;
                var curMelter = '';
                for (var i = 0; i < roundStats.points.length; i++) {
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

        return {
            generated: new Date().getTime(),
            playersStatistics: playersStatistics,
            winnerName: gameIsPlayed ? playersStatistics[0].playerName : '',
            winnerPoints: gameIsPlayed ? playersStatistics[0].totalPoints : '',
            roundsPlayed: getRoundsPlayed(game.rounds),
            cardsHit: cardsHitInGame(game.rounds),
            spurtAndMelt: spurtAndMelt,
        }
    },

    getGameReport: function (game) {
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
        };

        const players = [];
        const startPointsArr = [0];
        const roundsArr = [0];
        const pointsBigArr = [];
        const pointsSmallArr = [];
        const keepsBigArr = [];
        const keepsSmallArr = [];
        const pointsArr = [];
        for (var i = 0; i < game.playerOrder.length; i++) {
            const playerName = game.playerOrder[i].name == null ? game.playerOrder[i] : game.playerOrder[i].name;
            players.push(playerName);
            startPointsArr.push(0);
            keepsBigArr.push(0);
            keepsSmallArr.push(0);
            const totalPointsByPlayer = [0];
            var pointsPerPlayer = 0;
            var bigPointsPerPlayer = 0;
            var smallPointsPerPlayer = 0;
            for (var j = 0; j < game.rounds.length; j++) {
                for (var k = 0; k < game.rounds[j].roundPlayers.length; k++) {
                    if (game.rounds[j].roundPlayers[k].name == playerName) {
                        const pointsFromRound = game.rounds[j].roundPlayers[k].points;
                        pointsPerPlayer+= pointsFromRound;
                        totalPointsByPlayer.push(pointsPerPlayer);
                        if (game.rounds[j].cardsInRound > 5) {
                            bigPointsPerPlayer+= pointsFromRound;
                        } else {
                            smallPointsPerPlayer+= pointsFromRound;
                        }
                    }
                }
            }
            pointsArr.push(totalPointsByPlayer);
            pointsBigArr.push(bigPointsPerPlayer);
            pointsSmallArr.push(smallPointsPerPlayer);
        }
        retObj.players = players;
        
        for (var i = 0; i < game.rounds.length; i++) {
            if (game.rounds[i].roundStatus != 2) break;
            roundsArr.push(i+1);
            for (var j = 0; j < game.rounds[i].roundPlayers.length; j++) {
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

        return retObj;
    }
}

function getPlayerStatistics(game) {
    const players = [];
    game.playerOrder.forEach(function (player) {
        const playerName = player.name != null ? player.name : player;
        const totalPoints = module.exports.getGamePoints(game, playerName);
        const totalKeeps = getGameKeeps(game, playerName);
        const pointsPerKeeps = totalKeeps == 0 ? 0 : totalPoints/totalKeeps;
        players.push({
            playerName: playerName,
            totalPoints: totalPoints,
            totalKeeps: totalKeeps,
            pointsPerKeeps: pointsPerKeeps,
            position: null,
            scorePoints: null,
        });
    });
    return players;
}

function getRoundPoints(roundPlayers, playerName) {
    for (var i = 0; i < roundPlayers.length; i++) {
        if (roundPlayers[i].name == playerName) return roundPlayers[i].points;
    }
    return 0;
}

function getRoundKeeps(roundPlayers, playerName) {
    for (var i = 0; i < roundPlayers.length; i++) {
        if (roundPlayers[i].name == playerName) return roundPlayers[i].promise == roundPlayers[i].keeps ? 1 : 0;
    }
    return 0;
}

function getGameKeeps(game, playerName) {
    var keeps = 0;
    game.rounds.forEach(function(round) {
        keeps+= getRoundKeeps(round.roundPlayers, playerName);
    });
    return keeps;
}

function sortPlayerStatistics(a, b) {
    if (a.totalPoints > b.totalPoints) return -1;
    if (a.totalPoints < b.totalPoints) return 1;
    if (a.totalPoints == b.totalPoints && a.totalKeeps > b.totalKeeps) return -1;
    if (a.totalPoints == b.totalPoints && a.totalKeeps < b.totalKeeps) return 1;
    return 0;
}

function getRoundsPlayed(rounds) {
    var roundsPlayed = 0;
    rounds.forEach(function (round) {
        if (round.roundStatus == 2) {
            roundsPlayed++;
        }
    });
    return roundsPlayed;
}

function cardsHitInGame(rounds) {
    var cardsHit = 0;
    rounds.forEach(function (round) {
        if (round.roundStatus > 0) {
            round.cardsPlayed.forEach(function (cardArr) {
                cardsHit+= cardArr.length;
            });
        }
    });
    return cardsHit;
}