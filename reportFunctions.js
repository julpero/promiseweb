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
    }
}


function getRoundPoints(roundPlayers, playerName) {
    for (var i = 0; i < roundPlayers.length; i++) {
        if (roundPlayers[i].name == playerName) return roundPlayers[i].points;
    }
    return 0;
}