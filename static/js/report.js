function showNickChanger(gameList) {
    const gameListContainer = document.getElementById('chooseNickGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row');
        const gamePlayers = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-4 report-players');
        gamePlayers.innerHTML = gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, null)+showErrorNames(game.playerNameErrors);
        gameContainerDiv.appendChild(gamePlayers);

        const oldNameCol = createElementWithIdAndClasses('div', null, 'col-2');
        const oldNameInput = createElementWithIdAndClasses('input', 'oldName'+game.id, null, { type: 'text' });
        const newNameCol = createElementWithIdAndClasses('div', null, 'col-2');
        const newNameInput = createElementWithIdAndClasses('input', 'newName'+game.id, null, { type: 'text' });
        oldNameCol.appendChild(oldNameInput);
        gameContainerDiv.appendChild(oldNameCol);
        newNameCol.appendChild(newNameInput);
        gameContainerDiv.appendChild(newNameCol);

        const changeNameButton = createElementWithIdAndClasses('button', 'changeNick' + game.id, 'btn btn-primary change-nick-button', { value: game.id });
        changeNameButton.innerText = 'Change';
        changeNameButton.addEventListener('click', function() {
            console.log(this.value);
            const oldName = document.getElementById('oldName'+this.value).value;
            const defNewName = oldNameToNewName(oldName);
            const newName = defNewName != null ? defNewName : document.getElementById('newName'+this.value).value.trim();
    
            if (oldName != newName && newName != '') {
                const nickChangeObj = {
                    gameId: this.value,
                    oldName: oldName ,
                    newName: newName,
                    adminUser: document.getElementById('adminUser').value,
                    adminPass: document.getElementById('adminPass').value
                };
                socket.emit('change nick', nickChangeObj, function() {
                    const getGamesObj = {
                        isSecure: true,
                        adminUser: document.getElementById('adminUser').value,
                        adminPass: document.getElementById('adminPass').value
                    }
                    socket.emit('get games for report', getGamesObj, function (response) {
                        emptyElementById('chooseNickGameCollapse');
                        showNickChanger(response.data);
                    });
                });
            } else {
                alert('New name must be different than old name!');
            }
        });
    
        const changeNameButtonDiv = createElementWithIdAndClasses('div', null, 'col-1');
        changeNameButtonDiv.appendChild(changeNameButton);
        gameContainerDiv.appendChild(changeNameButtonDiv);

        const btnId2 = 'generateReports' + game.id;
        const generatedStr = game.gameStatistics != null ? new Date(game.gameStatistics.generated).toLocaleString('fi-fi') : 'NULL';
        const generateReportsButton = createElementWithIdAndClasses('button', btnId2, 'btn btn-primary generate-report-button', { value: game.id });
        generateReportsButton.innerText = 'Generate '+generatedStr;
        generateReportsButton.addEventListener('click', function() {
            console.log(this.value);
    
            const generateReportObj = {
                gameId: this.value,
                adminUser: document.getElementById('adminUser').value,
                adminPass: document.getElementById('adminPass').value
            };
            socket.emit('generate game statistics', generateReportObj, function(generateResult) {
                console.log(generateResult.passOk);
                const getGamesObj = {
                    isSecure: true,
                    adminUser: document.getElementById('adminUser').value,
                    adminPass: document.getElementById('adminPass').value
                }
                socket.emit('get games for report', getGamesObj, function (response) {
                    emptyElementById('chooseNickGameCollapse');
                    showNickChanger(response.data);
                });
            });
        });
    
        const generateReportsButtonDiv = createElementWithIdAndClasses('div', null, 'col-3');
        generateReportsButtonDiv.appendChild(generateReportsButton);
        gameContainerDiv.appendChild(generateReportsButtonDiv);

        gameListContainer.appendChild(gameContainerDiv);

    });


}

function showGames(gameList) {
    const gameListContainer = document.getElementById('chooseGameCollapse');
    console.log(gameList);
    const dateformatoptions = {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    };
    gameList.forEach(function (game) {
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row');
        const gameStarted = new Date(game.created).getTime();
        const dateStr = !isNaN(gameStarted) ? new Intl.DateTimeFormat('fi-FI', dateformatoptions).format(gameStarted) : '';
        const winnerName = game.gameStatistics.winnerName;
        const reportDateDiv = createElementWithIdAndClasses('div', null, 'col-2 report-date');
        reportDateDiv.innerText = dateStr;
        gameContainerDiv.appendChild(reportDateDiv);

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
        const rulesContainer = createElementWithIdAndClasses('div', null, 'col-4 report-rules');
        rulesContainer.innerText = ruleStr;
        gameContainerDiv.appendChild(rulesContainer);
        const playersContainer = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-4 report-players');
        playersContainer.innerHTML = gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, winnerName);
        gameContainerDiv.appendChild(playersContainer);

        const btnId = 'showGameButton' + game.id;
        const showGameButton = createElementWithIdAndClasses('button', btnId, 'btn btn-primary reportGameButton', { value: game.id });
        showGameButton.innerText = 'Show report';
        showGameButton.addEventListener('click', function() {
            getOneGameReport(this.value);
        });
        const showGameButtonContainer = createElementWithIdAndClasses('div', null, 'col-2');
        showGameButtonContainer.appendChild(showGameButton);
        gameContainerDiv.appendChild(showGameButtonContainer);

        gameListContainer.appendChild(gameContainerDiv);
    });
}

function showGamesPlayed(reportObject) {
    const node = document.getElementById('averageReportCollapse');

    const gamesPlayedReportCanvasName = 'gamesPlayedReportCanvas';
    const reportCanvas = createElementWithIdAndClasses('canvas', gamesPlayedReportCanvasName);
    node.appendChild(reportCanvas);
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
    const node = document.getElementById('averageReportCollapse');

    const averagesReportCanvasName = 'averagesReportCanvas';
    const reportCanvas = createElementWithIdAndClasses('canvas', averagesReportCanvasName);
    node.appendChild(reportCanvas);
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
        avgRegularArr.push(reportObject[i].avgRegular == null ? 0 : reportObject[i].avgRegular.toFixed(1));
    }
    datasetsData.push({
        label: 'all games',
        data: avgAllArr,
        backgroundColor: 'rgba(66,133,244,1.0)',
        borderColor: 'blue',
        borderWidth: 3,
    });
    datasetsData.push({
        label: 'regular games',
        data: avgRegularArr,
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