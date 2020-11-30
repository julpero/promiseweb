function showGames(gameList) {
    var gameListContainer = $('#chooseGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        var gameContainerDiv = $('<div id="gameContainerDiv'+ game.id +'">').addClass('row');
        var ruleStr = game.startRound + '-' + game.turnRound + '-' + game.endRound;
        if (!game.evenPromisesAllowed) ruleStr+= ', no even promises';
        if (!game.visiblePromiseRound) ruleStr+= ', hidden promise round';
        if (game.onlyTotalPromise) ruleStr+= ', only total promise visible';
        if (!game.freeTrump) ruleStr+= ', must trump';
        if (game.hiddenTrump) ruleStr+= ', hidden trump';
        if (game.speedPromise) ruleStr+= ', speed promise';
        if (game.privateSpeedGame) ruleStr+= ', speed game';
        gameContainerDiv.append($('<div>').addClass('col-2').text(ruleStr));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-3').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));

        var btnId = 'showGameButton' + game.id;
        var showGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary joinThisGameButton').text('Show report'));
        gameContainerDiv.append(($('<div>').addClass('col-2')).append(showGameButton));

        gameListContainer.append(gameContainerDiv);

    });
}