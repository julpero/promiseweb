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
    new Chart(ctx, {
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
    new Chart(ctx, {
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

function showGamesToReport(gameList) {
    const gameListContainer = document.getElementById('chooseGameCollapse');
    console.log(gameList);
    const dateFormatOptions = {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    };
    gameList.forEach(function (game) {
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row game-container-div');
        const gameStarted = new Date(game.created).getTime();
        const dateStr = !isNaN(gameStarted) ? new Intl.DateTimeFormat('fi-FI', dateFormatOptions).format(gameStarted) : '';
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

function initGameListEvent() {
    const chooseGameCollapseEl = document.getElementById('chooseGameCollapse');
    if (chooseGameCollapseEl != null) {
        chooseGameCollapseEl.addEventListener('shown.bs.collapse', function () {
            socket.emit('get games for report', { isSecure: false }, function (response) {
                showGamesToReport(response.data);
            });
            chooseGameCollapseEl.addEventListener('hidden.bs.collapse', function () {
                emptyElementById('chooseGameCollapse');
            });
        });
    }
}

function initAverageEvent() {
    const averageReportCollapseEl = document.getElementById('averageReportCollapse');
    if (averageReportCollapseEl != null) {
        averageReportCollapseEl.addEventListener('shown.bs.collapse', function () {
            socket.emit('get average report', {}, function (response) {
                showAverages(response);
            });
        });

        averageReportCollapseEl.addEventListener('hidden.bs.collapse', function () {
            emptyElementById('averageReportCollapse');
        });
    }
}

function initNickChangeEvent() {
    const chooseNickGameCollapseEl = document.getElementById('chooseNickGameCollapse');
    if (chooseNickGameCollapseEl != null) {
        chooseNickGameCollapseEl.addEventListener('shown.bs.collapse', function () {
            const getGamesObj = {
                isSecure: true,
                adminUser: document.getElementById('adminUser').value,
                adminPass: document.getElementById('adminPass').value
            }
            socket.emit('get games for report', getGamesObj, function (response) {
                emptyElementById('chooseNickGameCollapse');
                emptyElementById('alertDiv');
                if (response.passOk) {
                    showNickChanger(response.data);
                } else {
                    console.error('Authentication error');
                    showAlert('alertDiv', 'authAlertDiv', 'Authentication error');
                    emptyElementById('chooseNickGameCollapse');
                    bootstrap.Collapse.getInstance(document.getElementById('chooseNickGameCollapse')).hide();
                }
            });
        });

        chooseNickGameCollapseEl.addEventListener('hidden.bs.collapse', function () {
            emptyElementById('chooseNickGameCollapse');
        });
    }
}

function initUpdateAllButton() {
    const updateAllGameReportsButtonEl = document.getElementById('updateAllGameReportsButton');
    if (updateAllGameReportsButtonEl != null) {
        updateAllGameReportsButtonEl.addEventListener('click', function() {
            if (window.confirm('Are you sure you wan\'t to update ALL game reports?')) {
                socket.emit('update all game reports', {}, function (response) {
                    console.log(response);
                });
            }
        });
    }
}

function initEvents() {
    initGameListEvent();
    initAverageEvent();
    initNickChangeEvent();
    initUpdateAllButton();
}

function enableButtons() {
    disableButtonsByClass('report-button', false);
    removeClassByClass('report-button', 'disabled');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mainReportInit() {
    initEvents();
    enableButtons();
}
