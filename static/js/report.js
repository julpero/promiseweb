function showGames(gameList) {
    var gameListContainer = $('#chooseGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        var gameContainerDiv = $('<div id="gameContainerDiv'+ game.id +'">').addClass('row');
        var dateStr = game.created;
        gameContainerDiv.append($('<div>').addClass('col-2 report-date').text(dateStr));

        var ruleStr = game.startRound + '-' + game.turnRound + '-' + game.endRound;
        if (!game.evenPromisesAllowed) ruleStr+= ', no even promises';
        if (!game.visiblePromiseRound) ruleStr+= ', hidden promise round';
        if (game.onlyTotalPromise) ruleStr+= ', only total promise visible';
        if (!game.freeTrump) ruleStr+= ', must trump';
        if (game.hiddenTrump) ruleStr+= ', hidden trump';
        if (game.speedPromise) ruleStr+= ', speed promise';
        if (game.privateSpeedGame) ruleStr+= ', speed game';
        gameContainerDiv.append($('<div>').addClass('col-4 report-rules').text(ruleStr));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-4 report-players').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));

        var btnId = 'showGameButton' + game.id;
        var showGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary joinThisGameButton').text('Show report'));
        gameContainerDiv.append(($('<div>').addClass('col-2')).append(showGameButton));

        gameListContainer.append(gameContainerDiv);

    });
}

function showAverageGamesPlayed(reportObject) {
    var node = $('#averageReportCollapse');
    var reportRow = $('<div></div').addClass('row');
    var reportCol = $('<div id="averageGamesPlayed"></div').addClass('col');
    reportRow.append(reportCol);
    node.append(reportRow);

    var reportDataArr = [['Name', 'Played']];
    reportObject.forEach(function (playerGames) {
        reportDataArr.push([playerGames._id, playerGames.count]);
    });
    var reportData = new google.visualization.arrayToDataTable(reportDataArr);
    var options = {
        height: 400,
        legend: { position: 'none' },
        chart: {
            title: 'Games played',
            subtitle: 'number of games played by nickname',
        },
        axes: {
            x: {
                0: { side: 'bottom', label: 'Player'} // Top x-axis.
            }
        },
        bar: { groupWidth: "90%" }
    };
    var chart = new google.charts.Bar(document.getElementById('averageGamesPlayed'));
    chart.draw(reportData, google.charts.Bar.convertOptions(options));
}

function showAverages(gameObject) {
    console.log(gameObject);
    showAverageGamesPlayed(gameObject.gamesPlayed);
}