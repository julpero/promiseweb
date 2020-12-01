module.exports = {
    averagePoints: function (games, playerName) {
        var totalPoints = 0;
        games.forEach(function(game) {
            totalPoints+= roundPoints(game.game, playerName);
        });

        return totalPoints / games.length;
    }
}

function roundPoints(game, playerName) {
    var points = 0;
    game.rounds.forEach(function(round) {
        points+= getPlayerPoints(round.roundPlayers, playerName);
    });
    return points;
}

function getPlayerPoints(roundPlayers, playerName) {
    for (var i = 0; i < roundPlayers.length; i++) {
        if (roundPlayers[i].name == playerName) return roundPlayers[i].points;
    }
    return 0;
}