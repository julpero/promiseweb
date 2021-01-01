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

    generateGameStatistics: function(game) {
        const playersStatistics = getPlayerStatistics(game).sort(sortPlayerStatistics);
        for (var i = 0; i < playersStatistics.length; i++) {
            const position = i+1;
            playersStatistics[i].position = position;
            playersStatistics[i].scorePoints = (playersStatistics.length-position)/playersStatistics.length;
        }
        return {
            generated: new Date().getTime(),
            playersStatistics: playersStatistics,
            winnerName: playersStatistics[0].playerName,
            roundsPlayed: game.rounds.length,
        }
    }
}

function getPlayerStatistics(game) {
    var players = [];
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
