function validateNewGame(gameOptions) {
    if (gameOptions.humanPlayersCount + gameOptions.botPlayersCount < 2 || gameOptions.humanPlayersCount + gameOptions.botPlayersCount > 6) {
        alert('Total number of players must be between 2 and 5');
        return false;
    }
    if (gameOptions.turnRound > gameOptions.startRound) {
        alert('Turn round must be equal or less than start round');
        return false;
    }
    if (gameOptions.endRound < gameOptions.turnRound) {
        alert('End round must be equal or greater than turn round');
        return false;
    }
    if (gameOptions.humanPlayersCount > 0 && gameOptions.adminName.length  < 3) {
        alert('Your (nick)name must be at least four characters long');
        return false;
    }
    if (gameOptions.humanPlayersCount > 5 && (gameOptions.startRound > 8 || gameOptions.endRound > 8)) {
        alert('For six players eight is maximum start and end round');
        return false;
    }
    return true;
}

function createNewGame(gameOptions) {
    console.log(gameOptions);
    socket.emit('create game', gameOptions, function (createdGameId) {
        if (createdGameId == 'NOT OK') {
            alert('You have already created game!');
        } else {
            console.log('created game with id: '+createdGameId);
            gameId = createdGameId;
            document.getElementById('createGameCollapse').classList.remove('show');
            document.getElementById('joinGameCollapse').classList.add('show');
        }
    });
}

function initcreateNewGameButton() {
    document.getElementById('createNewGameButton').addEventListener('click', function() {
        const gameOptions = {
            humanPlayersCount: getSelectValue('newGameHumanPlayersCount'),
            botPlayersCount: getSelectValue('newGameBotPlayersCount'),
            startRound: getSelectValue('newGameStartRound'),
            turnRound: getSelectValue('newGameTurnRound'),
            endRound: getSelectValue('newGameEndRound'),
            adminName: document.getElementById('newGameMyName').value,
            password: document.getElementById('newGamePassword').value,
            gameStatus: 0,
            humanPlayers: [{ name: document.getElementById('newGameMyName').value, playerId: window.localStorage.getItem('uUID'), active: true}],
            createDateTime: new Date(),
            evenPromisesAllowed: !document.getElementById('noEvenPromises').checked,
            visiblePromiseRound: !document.getElementById('hidePromiseRound').checked,
            onlyTotalPromise: document.getElementById('onlyTotalPromise').checked,
            freeTrump: !document.getElementById('mustTrump').checked,
            hiddenTrump: document.getElementById('hiddenTrump').checked,
            speedPromise: document.getElementById('speedPromise').checked,
            privateSpeedGame: document.getElementById('privateSpeedGame').checked,
            opponentPromiseCardValue: document.getElementById('opponentPromiseCardValue').checked,
            opponentGameCardValue: document.getElementById('opponentGameCardValue').checked,
            hiddenCardsMode: getSelectValue('hiddenCardsMode'),
        };
        if (validateNewGame(gameOptions)) {
            createNewGame(gameOptions);
        }
    });
}

function initRulesCheck() {
    document.getElementById('hidePromiseRound').addEventListener('click', function() {
        if (!document.getElementById('hidePromiseRound').checked) {
            document.getElementById('onlyTotalPromise').checked = false;
        }
    });
    document.getElementById('onlyTotalPromise').addEventListener('click', function() {
        if (document.getElementById('onlyTotalPromise').checked) {
            document.getElementById('hidePromiseRound').checked = true;
        }
    });
}

function validateJoinGame(gameDetails) {
    if (gameDetails.myName.length < 3) {
        alert('(Nick)name must be at least three charcters!');
        return false;
        
    }
    return true;
}

function joinGame(id) {
    if (document.getElementById('myName'+id).value == '-Lasse-') {
        if (window.confirm('Olisiko sittenkin \'-lasse-\' ?')) {
            document.getElementById('myName'+id).value = '-lasse-';
        }
    }
    const gameDetails = { gameId: id,
        myName: document.getElementById('myName'+id).value,
        myId: window.localStorage.getItem('uUID'),
        gamePassword: document.getElementById('password'+id).value,
    };
    if (validateJoinGame(gameDetails)) {
        socket.emit('join game', gameDetails, function (response) {
            console.log(response);
            if (response.joiningResult == 'OK') {
                disableButtonsByClass('joinThisGameButton', true);
                const leaveBtn = document.getElementById('leaveGameButton'+response.joiningResult.gameId);
                if (leaveBtn != null) leaveBtn.disabled = false;
            }
        });
    }
}

function leaveGame(id) {
    const gameDetails = { gameId: id,
        myId: window.localStorage.getItem('uUID'),
    };
    socket.emit('leave game', gameDetails, function (response) {
        console.log(response);
        if (response.leavingResult == 'OK') {
            disableButtonsByClass('joinThisGameButton', true);
            const leaveBtn = document.getElementById('leaveGameButton'+response.leavingResult.gameId);
            if (leaveBtn != null) leaveBtn.disabled = false;
        }
    });
}

function showGames(gameList) {
    const gameListContainer = document.getElementById('joinGameCollapse');
    var firstId = '';
    gameList.forEach(function (game) {
        if (firstId ==  '') firstId = game.id;
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row');
        var ruleStr = game.startRound + '-' + game.turnRound + '-' + game.endRound;
        if (!game.evenPromisesAllowed) ruleStr+= ', no even promises';
        if (!game.visiblePromiseRound) ruleStr+= ', hidden promise round';
        if (game.onlyTotalPromise) ruleStr+= ', only total promise visible';
        if (!game.freeTrump) ruleStr+= ', must trump';
        if (game.hiddenTrump) ruleStr+= ', hidden trump';
        if (game.speedPromise) ruleStr+= ', speed promise';
        if (game.privateSpeedGame) ruleStr+= ', speed game';
        if (game.opponentPromiseCardValue) ruleStr+= ', promise hand value';
        if (game.opponentGameCardValue) ruleStr+= ', game hand value';
        if (game.hiddenCardsMode == 1) ruleStr+= ', show only card in charge';
        if (game.hiddenCardsMode == 2) ruleStr+= ', show card in charge and winning card';
        const ruleDiv = createElementWithIdAndClasses('div', null, 'col-2');
        ruleDiv.innerText = ruleStr;
        gameContainerDiv.appendChild(ruleDiv);

        const playersDiv = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-3');
        playersDiv.innerHTML = gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, null);
        gameContainerDiv.appendChild(playersDiv);

        const myNameDiv = createElementWithIdAndClasses('div', null, 'col-2');
        const myNameInput = createElementWithIdAndClasses('input', 'myName'+game.id, 'newGameMyNameInput', {type: 'text'});
        if (game.imInThisGame) myNameInput.disabled = true;
        myNameDiv.appendChild(myNameInput);
        gameContainerDiv.appendChild(myNameDiv);

        const passwordDiv = createElementWithIdAndClasses('div', null, 'col-2');
        const passwordInput = createElementWithIdAndClasses('input', 'password'+game.id, null, {type: 'text'});
        passwordInput.disabled = true;
        passwordDiv.appendChild(passwordInput);
        gameContainerDiv.appendChild(passwordDiv);

        const joinGameButton = createElementWithIdAndClasses('button', 'joinGameButton' + game.id, 'btn btn-primary joinThisGameButton');
        if (game.imInThisGame) joinGameButton.disabled = true;
        joinGameButton.innerText = 'Join';
        joinGameButton.addEventListener('click', function() {
            joinGame(game.id);
        });
        const joinGameBtnDiv = createElementWithIdAndClasses('div', null, 'col-1');
        joinGameBtnDiv.appendChild(joinGameButton);
        gameContainerDiv.appendChild(joinGameBtnDiv);
        
        const leaveGameButton = createElementWithIdAndClasses('button', 'leaveGameButton' + game.id, 'btn btn-primary leaveThisGameButton');
        if (!game.imInThisGame) leaveGameButton.disabled = true;
        leaveGameButton.innerText = 'Leave';
        leaveGameButton.addEventListener('click', function() {
            leaveGame(game.id);
        });
        const leaveGameBtnDiv = createElementWithIdAndClasses('div', null, 'col-1');
        leaveGameBtnDiv.appendChild(leaveGameButton);
        gameContainerDiv.appendChild(leaveGameBtnDiv);

        gameListContainer.appendChild(gameContainerDiv);


        console.log(game);
        if (firstId !==  '') document.getElementById('myName'+firstId).focus();
    });

    if (firstId == '') {
        gameListContainer.innerText = 'no open games';
    }
}

function initGameListEvent() {
    document.getElementById('joinGameCollapse').addEventListener('shown.bs.collapse', function () {
        socket.emit('get games', {myId: window.localStorage.getItem('uUID')}, function (response) {
            console.log(response);
            showGames(response);
        });
    });

    document.getElementById('joinGameCollapse').addEventListener('hidden.bs.collapse', function () {
        const node = document.getElementById('joinGameCollapse');
        node.innerHTML = '';
    });
}

function initJoinByIdButton() {
    document.getElementById('joinByIdButton').addEventListener('click', function() {
        const uuid = document.getElementById('joinById').value;
        const gameId = document.getElementById('joinGameId').value;
        if (uuid.length == 36 && gameId.length > 5) {
            const joiningDetails = {
                gameId: gameId,
                myId: uuid,
            };
            socket.emit('join game by id', joiningDetails, function (response) {
                console.log('joining game: ', response);
                if (response.joiningResult == 'OK') {
                    window.localStorage.setItem('uUID', response.newId);
                    console.log('new uUID set: ' + response.newId);
                    alert('You can now play as ' + response.newName + '. Please click OK and then refresh this page.');
                }
            });
        }
    });
}

function initLeavingButtons() {
    // document.getElementById('dontLeaveButton').addEventListener('click', function() {
    //     document.getElementById('leaveGameCollapse').collapse;
    // });
    document.getElementById('leaveButton').addEventListener('click', function() {
        document.getElementById('leavingUId').value = window.localStorage.getItem('uUID');
    });
    document.getElementById('leavingGameModal').addEventListener('hidden.bs.modal', function() {
        const uuid = uuidv4();
        console.log('new uUID set: ' + uuid);
        window.localStorage.setItem('uUID', uuid);
        deleteIntervaller();
        const leaveGameObj = {
            gameId: document.getElementById('currentGameId').value,
            playerId: document.getElementById('leavingUId').value
        };
        socket.emit('leave ongoing game', leaveGameObj, function(retVal) {
            if (retVal.leavingResult == 'LEAVED') {
                deleteIntervaller();
                disableButtonsByClass('validPromiseButton', true);
                removeEventByClass('makePromiseButton', 'click', doPromise);
                removeCardEvents();
                alert('You have now left the game. Please click OK and then refresh this page.');
            } else {
                alert('Something went wrong! Try to refresh page and see what happens...');
            }
        });
    });
}

function initChatButton() {
    document.getElementById('sendChatButton').addEventListener('click', function() {
        const newLine = document.getElementById('newChatLine').value.trim();
        const myName = document.getElementById('myName').value.trim();
        if (newLine.length > 0) {
            const chatObj = {
                gameId: document.getElementById('currentGameId').value,
                chatLine: newLine,
                myName: myName,
            }
            socket.emit('write chat', chatObj, function() {
                document.getElementById('newChatLine').value = '';
            });
        }
    });
    document.getElementById('newChatLine').addEventListener('keypress', function(e) {
        if (e.which == 13) {
            const newLine = document.getElementById('newChatLine').value.trim();
            const myName = document.getElementById('myName').value.trim();
            if (newLine.length > 0) {
                const chatObj = {
                    gameId: document.getElementById('currentGameId').value,
                    chatLine: newLine,
                    myName: myName,
                }
                socket.emit('write chat', chatObj, function() {
                    document.getElementById('newChatLine').value = '';
                });
            }
        }
    });
}

function initShowReportButton() {
    document.getElementById('showGameReportButton').addEventListener('click', function() {
        const gameId = document.getElementById('currentGameId').value;
        getOneGameReport(gameId);
    });
}

function initButtons() {
    initcreateNewGameButton();
    initRulesCheck();
    initLeavingButtons();
    initJoinByIdButton();
    initChatButton();
    initShowReportButton();
}

function showFrontPageBars(reportData) {
    console.log('showFrontPageBars');
    playedGamesGraph(reportData.mostGamesPlayed);
    avgKeepPercentageGraph(reportData.avgKeepPercentagePerPlayer);
    avgPointsGraph(reportData.avgPointsPerPlayer);
    totalPointsGraph(reportData.totalPointsPerPlayer);
    totalWinsGraph(reportData.playerTotalWins);
    winPercentagesGraph(reportData.playerWinPercentage);
    scoreGraph(reportData.avgScorePointsPerPlayer);
    if (reportData.avgPercentagePoints) avgPercentagePointsGraph(reportData.avgPercentagePoints);
}

function initShowFrontPageBarsModal(reportData) {
    document.getElementById('commonReportModal').addEventListener('shown.bs.modal', function () {
        console.log('initShowFrontPageBarsModal 2');
        showFrontPageBars(reportData);
    });
}

function initEvents() {
    initGameListEvent();
}

function usedRulesToHtml(usedRulesCount) {
    return 'Even promises were disallowed in ' +usedRulesCount.evenPromisesDisallowedCount+' games<br>' +
    'Promises were hidden in '+usedRulesCount.hiddenPromiseRoundCount+' games<br>' +
    'Only total promise was shown in '+usedRulesCount.onlyTotalPromiseCount+' games<br>' +
    'Playing trump card was mandatory in '+usedRulesCount.mustTrumpCount+' games<br>' +
    'Trump was hidden while promising in '+usedRulesCount.hiddenTrumpCount+' games<br>' +
    'Speed promise rules was enabled in '+usedRulesCount.speedPromiseCount+' games<br>' +
    'Speed card playing games was '+usedRulesCount.privateSpeedGameCount+' times<br>' +
    'Players card value was visible while promising in '+usedRulesCount.opponentPromiseCardValueCount+' games<br>' +
    'Players card value was visible while playing in '+usedRulesCount.opponentGameCardValueCount+' games<br>' +
    'Only card in charge was visible in '+usedRulesCount.showOnlyCardInChargeCount+' games<br>' +
    'Only card in charge and winning card were visible in '+usedRulesCount.showCardInChargeAndWinningCardCount+' games<br>';
}

function playerCountToHtml(playerCount) {
    return 'Three player games was played '+playerCount.threePlayers+' times,<br>' +
    'Four players attended in game '+playerCount.fourPlayers+' times.<br>' +
    playerCount.fivePlayers+' times was played five player games<br>' +
    'and six players played game '+playerCount.sixPlayers+' times.';
}

function melterToHtml(meltingGame) {
    if (meltingGame == null || meltingGame.gameStatistics == null || meltingGame.gameStatistics.spurtAndMelt == null || meltingGame.gameStatistics.spurtAndMelt.melter == null) return '';
    return 'There was a game on '+new Date(meltingGame.createDateTime).toDateString()+' when '+meltingGame.gameStatistics.spurtAndMelt.melter+' led the game by '+meltingGame.gameStatistics.spurtAndMelt.meltGap+' points. After all, '+meltingGame.gameStatistics.winnerName+' won the game...';
}

function spurterToHtml(spurtingGame) {
    if (spurtingGame == null || spurtingGame.gameStatistics == null || spurtingGame.gameStatistics.spurtAndMelt == null || spurtingGame.gameStatistics.spurtAndMelt.spurtGap == null) return '';
    return 'On '+new Date(spurtingGame.createDateTime).toDateString()+' '+spurtingGame.gameStatistics.winnerName+' was '+spurtingGame.gameStatistics.spurtAndMelt.spurtGap+' points behind the leader. Nevertheless '+spurtingGame.gameStatistics.winnerName+' won the game!';
}

function getReportData() {
    socket.emit('get report data', null, function(response) {
        console.log(response);
        initShowFrontPageBarsModal(response);
        const tooltipTemplate = '<div class="tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner tooltip-wide"></div></div>';

        document.getElementById("gamesPlayedInfo").innerHTML = 'Total of '+response.gamesPlayed+' games and '+ response.roundsPlayed +' rounds played so far...';
        document.getElementById("playersTotalInfo").innerHTML = ' ... and '+response.playersTotal+' players hit '+ response.totalCardsHit +' cards in those games.';

        document.getElementById("mostGamesPlayed1").innerHTML = response.mostGamesPlayed[0]._id+' has played in '+response.mostGamesPlayed[0].count+' of those games,';
        document.getElementById("mostGamesPlayed2").innerHTML = response.mostGamesPlayed[1]._id+' attended '+response.mostGamesPlayed[1].count+' times';
        document.getElementById("mostGamesPlayed3").innerHTML = 'and '+response.mostGamesPlayed[2]._id+' '+response.mostGamesPlayed[2].count+' times.';
        var restMostGamesPlayedStr = '';
        for (var i = 3; i < response.mostGamesPlayed.length; i++) {
            restMostGamesPlayedStr+= response.mostGamesPlayed[i]._id+' '+response.mostGamesPlayed[i].count+', ';
        }
        const mostGamesPlayed3El = document.getElementById('mostGamesPlayed3');
        const mostGamesPlayed3Tooltip = new bootstrap.Tooltip(mostGamesPlayed3El);
        // const mostGamesPlayed3Tooltip = new bootstrap.Tooltip .tooltip({title: restMostGamesPlayedStr, template: tooltipTemplate, placement: 'bottom'});

        document.getElementById("avgKeepPercentagePerPlayer1").innerHTML = 'Best keep-% belongs to '+response.avgKeepPercentagePerPlayer[0]._id+' and it is '+(100*response.avgKeepPercentagePerPlayer[0].avgKeepPercentage).toFixed(1)+'.';
        document.getElementById("avgKeepPercentagePerPlayer2").innerHTML = response.avgKeepPercentagePerPlayer[1]._id+' comes to second with '+(100*response.avgKeepPercentagePerPlayer[1].avgKeepPercentage).toFixed(1)+'% of keeps';
        document.getElementById("avgKeepPercentagePerPlayer3").innerHTML = 'and '+response.avgKeepPercentagePerPlayer[2]._id+' has '+(100*response.avgKeepPercentagePerPlayer[2].avgKeepPercentage).toFixed(1)+' keep-%.';
        var restKeepPercentagePerPlayerStr = '';
        for (var i = 3; i < response.avgKeepPercentagePerPlayer.length; i++) {
            restKeepPercentagePerPlayerStr+= response.avgKeepPercentagePerPlayer[i]._id+' '+(100*response.avgKeepPercentagePerPlayer[i].avgKeepPercentage).toFixed(1)+'%, ';
        }
        const avgKeepPercentagePerPlayer3El = document.getElementById('avgKeepPercentagePerPlayer3');
        const avgKeepPercentagePerPlayer3Tooltip = new bootstrap.Tooltip(avgKeepPercentagePerPlayer3El);
        // const avgKeepPercentagePerPlayer3Tooltip = new bootstrap.Tooltip({title: restKeepPercentagePerPlayerStr, template: tooltipTemplate, placement: 'bottom'});

        document.getElementById("totalPointsPerPlayer1").innerHTML = response.totalPointsPerPlayer[0]._id+' has gathered total of '+response.totalPointsPerPlayer[0].playersTotalPoints+' points in all games.';
        document.getElementById("totalPointsPerPlayer2").innerHTML = response.totalPointsPerPlayer[1]._id+'\'s points are '+response.totalPointsPerPlayer[1].playersTotalPoints;
        document.getElementById("totalPointsPerPlayer3").innerHTML = 'and '+response.totalPointsPerPlayer[2]._id+' comes as third with '+response.totalPointsPerPlayer[2].playersTotalPoints+' points.';
        var restPointsPerPlayerStr = '';
        for (var i = 3; i < response.totalPointsPerPlayer.length; i++) {
            restPointsPerPlayerStr+= response.totalPointsPerPlayer[i]._id+' '+response.totalPointsPerPlayer[i].playersTotalPoints+', ';
        }
        const totalPointsPerPlayer3El = document.getElementById('totalPointsPerPlayer3');
        const totalPointsPerPlayer3Tooltip = new bootstrap.Tooltip(totalPointsPerPlayer3El);
        // document.getElementById('totalPointsPerPlayer3').tooltip({title: restPointsPerPlayerStr, template: tooltipTemplate, placement: 'bottom'});

        document.getElementById("avgPointsPerPlayer1").innerHTML = response.avgPointsPerPlayer[0]._id+' played '+response.avgPointsPerPlayer[0].playerTotalGames+' games with avegare of '+response.avgPointsPerPlayer[0].avgPoints.toFixed(1)+' points.';
        document.getElementById("avgPointsPerPlayer2").innerHTML = 'After '+response.avgPointsPerPlayer[1].playerTotalGames+' games '+response.avgPointsPerPlayer[1]._id+'\'s average points are '+response.avgPointsPerPlayer[1].avgPoints.toFixed(1)+'.';
        document.getElementById("avgPointsPerPlayer3").innerHTML = response.avgPointsPerPlayer[2]._id+'\'s average points '+response.avgPointsPerPlayer[2].avgPoints.toFixed(1)+' comes from '+response.avgPointsPerPlayer[2].playerTotalGames+' played games.';
        var restPlayersAvgPointsPerPlayerStr = '';
        for (var i = 3; i < response.avgPointsPerPlayer.length; i++) {
            restPlayersAvgPointsPerPlayerStr+= response.avgPointsPerPlayer[i]._id+' '+response.avgPointsPerPlayer[i].avgPoints.toFixed(1)+', ';
        }
        // document.getElementById('avgPointsPerPlayer3').tooltip({title: restPlayersAvgPointsPerPlayerStr, template: tooltipTemplate, placement: 'bottom'});

        document.getElementById("playerAvgScorePoints1").innerHTML = response.avgScorePointsPerPlayer[0]._id+' is the best player with score points '+response.avgScorePointsPerPlayer[0].playerAvgScorePoints.toFixed(3)+'.';
        document.getElementById("playerAvgScorePoints2").innerHTML = response.avgScorePointsPerPlayer[1]._id+'\'s '+response.avgScorePointsPerPlayer[1].playerAvgScorePoints.toFixed(3)+' score points is enough for the second place.';
        document.getElementById("playerAvgScorePoints3").innerHTML = 'Third but not least is '+response.avgScorePointsPerPlayer[2]._id+'\'s score points '+response.avgScorePointsPerPlayer[2].playerAvgScorePoints.toFixed(3)+'.';
        var restPlayersAvgScorePointsStr = '';
        for (var i = 3; i < response.avgScorePointsPerPlayer.length; i++) {
            restPlayersAvgScorePointsStr+= response.avgScorePointsPerPlayer[i]._id+' '+response.avgScorePointsPerPlayer[i].playerAvgScorePoints.toFixed(3)+', ';
        }
        // document.getElementById('playerAvgScorePoints3').tooltip({title: restPlayersAvgScorePointsStr, template: tooltipTemplate, placement: 'bottom'});
        document.getElementById('playerAvgScorePointsInfo').innerHTML = 'Score point is calculated: (players in game - your rank in game) / (players in game)';

        document.getElementById("playerTotalWins1").innerHTML = response.playerTotalWins[0]._id+' has won '+response.playerTotalWins[0].playerTotalWins+' games.';
        document.getElementById("playerTotalWins2").innerHTML = response.playerTotalWins[1]._id+' has won '+response.playerTotalWins[1].playerTotalWins+' times';
        document.getElementById("playerTotalWins3").innerHTML = 'and '+response.playerTotalWins[2].playerTotalWins+' games ended to '+response.playerTotalWins[2]._id+'\'s celebrations.';
        var restPlayersTotalWinsStr = '';
        for (var i = 3; i < response.playerTotalWins.length; i++) {
            restPlayersTotalWinsStr+= response.playerTotalWins[i]._id+' '+response.playerTotalWins[i].playerTotalWins+', ';
        }
        // document.getElementById('playerTotalWins3').tooltip({title: restPlayersTotalWinsStr, template: tooltipTemplate, placement: 'bottom'});

        document.getElementById("playersWinPercentage1").innerHTML = response.playerWinPercentage[0]._id+' has the best winning percentage of '+(100*response.playerWinPercentage[0].winPercentage).toFixed(1)+'%.';
        document.getElementById("playersWinPercentage2").innerHTML = response.playerWinPercentage[1]._id+'\'s winning percentage is '+(100*response.playerWinPercentage[1].winPercentage).toFixed(1)+'%';
        document.getElementById("playersWinPercentage3").innerHTML = 'and '+response.playerWinPercentage[2]._id+' comes as third by winning '+(100*response.playerWinPercentage[2].winPercentage).toFixed(1)+'% of games.';
        var restPlayersWinPercentageStr = '';
        for (var i = 3; i < response.playerWinPercentage.length; i++) {
            restPlayersWinPercentageStr+= response.playerWinPercentage[i]._id+' '+(100*response.playerWinPercentage[i].winPercentage).toFixed(1)+'%, ';
        }
        // document.getElementById('playersWinPercentage3').tooltip({title: restPlayersWinPercentageStr, template: tooltipTemplate, placement: 'bottom'});

        if (response.avgPercentagePoints != null && response.avgPercentagePoints.length >= 3) {
            document.getElementById("playersPercentagePoints1").innerHTML = response.avgPercentagePoints[0]._id+' gathers average of '+(100*response.avgPercentagePoints[0].playerAvgPercentPoints).toFixed(1)+'% of games winning points.';
            document.getElementById("playersPercentagePoints2").innerHTML = response.avgPercentagePoints[1]._id+'\'s points are '+(100*response.avgPercentagePoints[1].playerAvgPercentPoints).toFixed(1)+'% of winner\'s points';
            document.getElementById("playersPercentagePoints3").innerHTML = 'and '+response.avgPercentagePoints[2]._id+' comes as third by gathering '+(100*response.avgPercentagePoints[2].playerAvgPercentPoints).toFixed(1)+'% of points needed to win games.';
            var restPlayersAvgPercentPointsStr = '';
            for (var i = 3; i < response.avgPercentagePoints.length; i++) {
                restPlayersAvgPercentPointsStr+= response.avgPercentagePoints[i]._id+' '+(100*response.avgPercentagePoints[i].playerAvgPercentPoints).toFixed(1)+'%, ';
            }
            // document.getElementById('playersPercentagePoints3').tooltip({title: restPlayersAvgPercentPointsStr, template: tooltipTemplate, placement: 'bottom'});
        }

        document.getElementById('vanillaGames').innerHTML = response.vanillaGamesCount+' games played with original rules, rules were used:';
        document.getElementById('usedRules').innerHTML = usedRulesToHtml(response.usedRulesCount);
        
        document.getElementById('playerCount').innerHTML = playerCountToHtml(response.playerCount);

        const melterStr = melterToHtml(response.meltingGame);
        if (melterStr != '') {
            const meltGameId = response.meltingGame._id;
            document.getElementById('melterInfo').innerHTML = melterStr;
            document.getElementById('melterInfo').addEventListener('click', function() {
                getOneGameReport(meltGameId);
            });
        }

        const spurterStr = spurterToHtml(response.spurtingGame);
        if (spurterStr != '') {
            const spurtGameId = response.spurtingGame._id;
            document.getElementById('spurterInfo').innerHTML = spurterStr;
            document.getElementById('spurterInfo').addEventListener('click', function() {
                getOneGameReport(spurtGameId);
            });
        }
    });
}

function mainInit() {
    initEvents();
    initButtons();
    getReportData();
}

