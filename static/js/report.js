function showNickChanger(gameList) {
    var gameListContainer = $('#chooseNickGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        var gameContainerDiv = $('<div id="gameContainerDiv'+ game.id +'">').addClass('row');
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-4 report-players').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)+showErrorNames(game.playerNameErrors)));

        var oldNameCol = $('<div></div>').addClass('col-2');
        var oldNameInput = $('<input id="oldName'+game.id+'" type="text">');
        var newNameCol = $('<div></div>').addClass('col-2');
        var newNameInput = $('<input id="newName'+game.id+'" type="text">');
        oldNameCol.append(oldNameInput);
        gameContainerDiv.append(oldNameCol);
        newNameCol.append(newNameInput);
        gameContainerDiv.append(newNameCol);

        var btnId = 'changeNick' + game.id;
        var showGameButton = ($('<button id="'+btnId+'" value="'+game.id+'">').addClass('btn btn-primary change-nick-button').text('Change'));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(showGameButton));

        btnId = 'generateReports' + game.id;
        var generatedStr = game.gameStatistics != null ? new Date(game.gameStatistics.generated).toLocaleString('fi-fi') : 'NULL';
        var generateReportsButton = ($('<button id="'+btnId+'" value="'+game.id+'">').addClass('btn btn-primary generate-report-button').text('Generate '+generatedStr));
        gameContainerDiv.append(($('<div>').addClass('col-3')).append(generateReportsButton));

        gameListContainer.append(gameContainerDiv);

    });

    $('.change-nick-button').on('click', function() {
        console.log(this.value);
        const oldName = $('#oldName'+this.value).val();
        const defNewName = oldNameToNewName(oldName);
        const newName = defNewName != null ? defNewName : $('#newName'+this.value).val().trim();

        if (oldName != newName && newName != '') {
            const nickChangeObj = {
                gameId: this.value,
                oldName: oldName ,
                newName: newName,
            };
    
            socket.emit('change nick', nickChangeObj, function() {
                socket.emit('get games for report', {}, function (response) {
                    $('#chooseNickGameCollapse').empty();
                    showNickChanger(response);
                });
            });
        } else {
            alert('New name must be different than old name!');
        }
    });

    $('.generate-report-button').on('click', function() {
        console.log(this.value);

        const generateReportObj = {
            gameId: this.value,
        };
        socket.emit('generate game statistics', generateReportObj, function(gameStatistics) {
            console.log(gameStatistics);
            socket.emit('get games for report', {}, function (response) {
                $('#chooseNickGameCollapse').empty();
                showNickChanger(response);
            });
        });
    });
}

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
        if (game.opponentPromiseCardValue) ruleStr+= ', hand value in promise';
        if (game.opponentGameCardValue) ruleStr+= ', hand value in game';
        if (game.hiddenCardsMode == 1) ruleStr+= ', show only card in charge';
        if (game.hiddenCardsMode == 2) ruleStr+= ', show card in charge and winning card';
        gameContainerDiv.append($('<div>').addClass('col-4 report-rules').text(ruleStr));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-4 report-players').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));

        var btnId = 'showGameButton' + game.id;
        var showGameButton = ($('<button id="'+btnId+'" value="'+game.id+'">').addClass('btn btn-primary reportGameButton').text('Show report'));
        gameContainerDiv.append(($('<div>').addClass('col-2')).append(showGameButton));

        gameListContainer.append(gameContainerDiv);
    });

    $('.reportGameButton').on('click', function() {
        getOneGameReport(this.value);
    });
}

function showGamesPlayed(reportObject) {
    var node = $('#averageReportCollapse');

    const gamesPlayedReportCanvasName = 'gamesPlayedReportCanvas';
    var reportCanvas = $('<canvas id="'+gamesPlayedReportCanvasName+'"></canvas>');
    node.append(reportCanvas);
    const gamesPlayedReportOptions = {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                }
            }]
        },
        title: {
            display: true,
            text: 'Number of all games played by nickname',
        },
    };
    
    var datasetsData = [];
    var playersArr = [];
    var playedGamesArr = [];
    for (var i = 0; i < reportObject.length; i++) {
        playersArr.push(reportObject[i]._id);
        playedGamesArr.push(reportObject[i].count);
    }
    datasetsData.push({
        label: 'played games',
        data: playedGamesArr,
        borderWidth: 1,
        backgroundColor: 'rgba(66,133,244,1.0)',
        borderWidth: 3,
    });
    const barData = {
        labels: playersArr,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.chart.canvas.id == gamesPlayedReportCanvasName) instance.destroy();
    });

    var ctx = document.getElementById(gamesPlayedReportCanvasName);
    var gamesPlayedChart = new Chart(ctx, {
        type: 'bar',
        data: barData,
        options: gamesPlayedReportOptions,
    });

}

function showAveragePointsPerGames(reportObject) {
    var node = $('#averageReportCollapse');

    const averagesReportCanvasName = 'averagesReportCanvas';
    var reportCanvas = $('<canvas id="'+averagesReportCanvasName+'"></canvas>');
    node.append(reportCanvas);
    const averagesReportOptions = {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                }
            }]
        },
        title: {
            display: true,
            text: 'Average points of all and regular games played by nickname',
        },
    };
    
    var datasetsData = [];
    var playersArr = [];
    var avgAllArr = [];
    var avgRegularArr = [];
    for (var i = 0; i < reportObject.length; i++) {
        playersArr.push(reportObject[i]._id);
        avgAllArr.push(reportObject[i].avgAll.toFixed(1));
        avgRegularArr.push(reportObject[i].avgRegular.toFixed(1));
    }
    datasetsData.push({
        label: 'all games',
        data: avgAllArr,
        borderWidth: 1,
        backgroundColor: 'rgba(66,133,244,1.0)',
        borderWidth: 3,
    });
    datasetsData.push({
        label: 'regular games',
        data: avgRegularArr,
        borderWidth: 1,
        backgroundColor: 'rgba(233,66,66,1.0)',
        borderWidth: 3,
    });
    const barData = {
        labels: playersArr,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.chart.canvas.id == averagesReportCanvasName) instance.destroy();
    });

    var ctx = document.getElementById(averagesReportCanvasName);
    var gamesPlayedChart = new Chart(ctx, {
        type: 'bar',
        data: barData,
        options: averagesReportOptions,
    });
}

function showAverages(gameObject) {
    console.log(gameObject);
    showGamesPlayed(gameObject.gamesPlayed);
    showAveragePointsPerGames(gameObject.averagePointsPerGames);
}

function showErrorNames(errorNames) {
    if (errorNames.length == 0) return '';
    console.log(errorNames);
    return ' E: '+ errorNames.join(', ');
}

function oldNameToNewName(oldName) {
    switch (oldName) {
        case '-Lasse-': return '-lasse-';
        case 'Jossu': return 'Johanna';
    }
    return null;
}