function showNickChanger(gameList) {
    const gameListContainer = $('#chooseNickGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        const gameContainerDiv = $('<div id="gameContainerDiv'+ game.id +'">').addClass('row');
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-4 report-players').html(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, null)+showErrorNames(game.playerNameErrors)));

        const oldNameCol = $('<div></div>').addClass('col-2');
        const oldNameInput = $('<input id="oldName'+game.id+'" type="text">');
        const newNameCol = $('<div></div>').addClass('col-2');
        const newNameInput = $('<input id="newName'+game.id+'" type="text">');
        oldNameCol.append(oldNameInput);
        gameContainerDiv.append(oldNameCol);
        newNameCol.append(newNameInput);
        gameContainerDiv.append(newNameCol);

        const btnId1 = 'changeNick' + game.id;
        const showGameButton = ($('<button id="'+btnId1+'" value="'+game.id+'">').addClass('btn btn-primary change-nick-button').text('Change'));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(showGameButton));

        const btnId2 = 'generateReports' + game.id;
        const generatedStr = game.gameStatistics != null ? new Date(game.gameStatistics.generated).toLocaleString('fi-fi') : 'NULL';
        const generateReportsButton = ($('<button id="'+btnId2+'" value="'+game.id+'">').addClass('btn btn-primary generate-report-button').text('Generate '+generatedStr));
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
    const gameListContainer = $('#chooseGameCollapse');
    console.log(gameList);
    const dateformatoptions = {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    };
    gameList.forEach(function (game) {
        const gameContainerDiv = $('<div id="gameContainerDiv'+ game.id +'">').addClass('row');
        const gameStarted = new Date(game.created).getTime();
        const dateStr = !isNaN(gameStarted) ? new Intl.DateTimeFormat('fi-FI', dateformatoptions).format(gameStarted) : '';
        const winnerName = game.gameStatistics.winnerName;
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
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-4 report-players').html(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, winnerName)));

        const btnId = 'showGameButton' + game.id;
        const showGameButton = ($('<button id="'+btnId+'" value="'+game.id+'">').addClass('btn btn-primary reportGameButton').text('Show report'));
        gameContainerDiv.append(($('<div>').addClass('col-2')).append(showGameButton));

        gameListContainer.append(gameContainerDiv);
    });

    $('.reportGameButton').on('click', function() {
        getOneGameReport(this.value);
    });
}

function showGamesPlayed(reportObject) {
    const node = $('#averageReportCollapse');

    const gamesPlayedReportCanvasName = 'gamesPlayedReportCanvas';
    const reportCanvas = $('<canvas id="'+gamesPlayedReportCanvasName+'"></canvas>');
    node.append(reportCanvas);
    const gamesPlayedReportOptions = {
        scales: {
            y: {
                ticks: {
                    beginAtZero: true,
                }
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Number of all games played by nickname',
            },
        }
    };
    
    const datasetsData = [];
    const playersArr = [];
    const playedGamesArr = [];
    for (var i = 0; i < reportObject.length; i++) {
        playersArr.push(reportObject[i]._id);
        playedGamesArr.push(reportObject[i].count);
    }
    datasetsData.push({
        label: 'played games',
        data: playedGamesArr,
        borderWidth: 1,
        backgroundColor: 'rgba(66,133,244,1.0)',
        borderColor: 'blue',
        borderWidth: 3,
    });
    const barData = {
        labels: playersArr,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == gamesPlayedReportCanvasName) instance.destroy();
    });

    const ctx = document.getElementById(gamesPlayedReportCanvasName);
    const gamesPlayedChart = new Chart(ctx, {
        type: 'bar',
        data: barData,
        options: gamesPlayedReportOptions,
    });

}

function showAveragePointsPerGames(reportObject) {
    const node = $('#averageReportCollapse');

    const averagesReportCanvasName = 'averagesReportCanvas';
    const reportCanvas = $('<canvas id="'+averagesReportCanvasName+'"></canvas>');
    node.append(reportCanvas);
    const averagesReportOptions = {
        scales: {
            y: {
                ticks: {
                    beginAtZero: true,
                }
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Average points of all and equal games played by nickname',
            },
        }
    };
    
    const datasetsData = [];
    const playersArr = [];
    const avgAllArr = [];
    const avgRegularArr = [];
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
        borderColor: 'blue',
        borderWidth: 3,
    });
    datasetsData.push({
        label: 'equal games',
        data: avgRegularArr,
        borderWidth: 1,
        backgroundColor: 'rgba(233,66,66,1.0)',
        borderColor: 'darkred',
        borderWidth: 3,
    });
    const barData = {
        labels: playersArr,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == averagesReportCanvasName) instance.destroy();
    });

    const ctx = document.getElementById(averagesReportCanvasName);
    const gamesPlayedChart = new Chart(ctx, {
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
    return ' <strong>E: '+ errorNames.join(', ')+'</strong>';
}

function oldNameToNewName(oldName) {
    switch (oldName) {
        case '-Lasse-': return '-lasse-';
        case 'Jossu': return 'Johanna';
    }
    return null;
}