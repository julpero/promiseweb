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
        const oldName = $('#oldName'+this.value).val().trim();
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
    var reportIdName = 'gamesPlayedReport';
    var node = $('#averageReportCollapse');
    var reportRow = $('<div></div').addClass('row');
    var reportCol = $('<div id="'+reportIdName+'"></div').addClass('col');
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
            subtitle: 'number of all games played by nickname',
        },
        axes: {
            x: {
                0: { side: 'bottom', label: 'Player'} // Top x-axis.
            }
        },
        bar: { groupWidth: "90%" }
    };
    var chart = new google.charts.Bar(document.getElementById(reportIdName));
    chart.draw(reportData, google.charts.Bar.convertOptions(options));
}

function showAveragePointsPerGames(reportObject) {
    var reportIdName = 'averagePointsPerGamesReport';
    var node = $('#averageReportCollapse');
    var reportRow = $('<div></div').addClass('row');
    var reportCol = $('<div id="'+reportIdName+'"></div').addClass('col');
    reportRow.append(reportCol);
    node.append(reportRow);

    var reportDataArr = [['Name', 'all games', 'regular games']];
    reportObject.forEach(function (playerGames) {
        reportDataArr.push([playerGames._id, Math.round(playerGames.avgAll), Math.round(playerGames.avgRegular)]);
    });
    var reportData = new google.visualization.arrayToDataTable(reportDataArr);
    var options = {
        height: 400,
        legend: { position: 'none' },
        chart: {
            title: 'Average points',
            subtitle: 'average points of all and regular games played by nickname',
        },
        axes: {
            x: {
                0: { side: 'bottom', label: 'Player'} // Top x-axis.
            }
        },
        bar: { groupWidth: "90%" }
    };
    var chart = new google.charts.Bar(document.getElementById(reportIdName));
    chart.draw(reportData, google.charts.Bar.convertOptions(options));
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