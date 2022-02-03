function getSelectValue(selectName) {
    const sel = document.getElementById(selectName);
    return parseInt(sel.options[sel.selectedIndex].value, 10);
}

function gamePlayersToDiv(players, totalHumans) {
    const retDiv = createElementWithIdAndClasses('div', null, 'row');
    const playerCol = createElementWithIdAndClasses('div', null, 'col');
    const playerList = createElementWithIdAndClasses('ul', null, 'list-unstyled');
    players.forEach(function (player) {
        const playerItem = createElementWithIdAndClasses('li', null, 'player-in-game-item');
        playerItem.innerText = player.name;
        playerList.appendChild(playerItem);
    });
    for (let i = players.length; i < totalHumans; i++) {
        const emptyPlayerItem = createElementWithIdAndClasses('li', null);
        emptyPlayerItem.innerText = '{}';
        playerList.appendChild(emptyPlayerItem);
    }
    playerCol.appendChild(playerList);
    retDiv.appendChild(playerCol);
    return retDiv;
}


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
    if (gameOptions.humanPlayersCount > 0 && gameOptions.adminName.length < 4) {
        alert('Your (nick)name must be at least four characters long');
        return false;
    }
    if (gameOptions.humanPlayersCount > 0 && gameOptions.userPassword1.length  < 4) {
        alert('Password must be at least four characters long');
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
        } else if (createdGameId == 'PWDFAILS') {
            alert('Password doesn\'t match!');
        } else if (createdGameId == 'PWDMISMATCH') {
            alert('Passwords doesn\'t match!');
        } else if (createdGameId == 'PWD2EMPTY') {
            alert('New username, enter password to both fields!');
        } else if (createdGameId == 'PWDSHORT') {
            alert('Password must be at least four characters long!');
        } else {
            console.log('created game with id: '+createdGameId);
            gameId = createdGameId;
            document.getElementById('openJoinGameDialogButton').click();
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
            userPassword1: document.getElementById('password1').value,
            userPassword2: document.getElementById('password2').value,
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
    if (gameDetails.myName.length < 4) {
        alert('(Nick)name must be at least four charcters!');
        return false;
    }
    if (gameDetails.myPass1.length < 4) {
        alert('Password must be at least four characters long!');
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
    const gameDetails = {
        gameId: id,
        myName: document.getElementById('myName'+id).value,
        myPass1: document.getElementById('myPass1'+id).value,
        myPass2: document.getElementById('myPass2'+id).value,
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
            } else if (response.joiningResult == 'PWDMISMATCH') {
                alert('Passwords doesn\'t match!');
            } else if (response.joiningResult == 'PWD2EMPTY') {
                alert('New username, enter password to both fields!');
            } else if (response.joiningResult == 'PWDSHORT') {
                alert('Password must be at least four characters long!');
            } else if (response.joiningResult == 'PWDFAILS') {
                alert('Password doesn\'t match!');
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

function createRulesElement(game) {
    const ruleContainerRow = createElementWithIdAndClasses('div', null, 'row');
    const ruleContainerCol = createElementWithIdAndClasses('div', null, 'col');
    ruleContainerCol.innerText = game.startRound + '-' + game.turnRound + '-' + game.endRound;

    const rules = [];

    if (!game.evenPromisesAllowed) rules.push('no even promises');
    if (!game.visiblePromiseRound) rules.push('hidden promise round');
    if (game.onlyTotalPromise) rules.push('only total promise visible');
    if (!game.freeTrump) rules.push('must trump');
    if (game.hiddenTrump) rules.push('hidden trump');
    if (game.speedPromise) rules.push('speed promise');
    if (game.privateSpeedGame) rules.push('speed game');
    if (game.opponentPromiseCardValue) rules.push('promise hand value');
    if (game.opponentGameCardValue) rules.push('game hand value');
    if (game.hiddenCardsMode == 1) rules.push('show only card in charge');
    if (game.hiddenCardsMode == 2) rules.push('show card in charge and winning card');
    
    if (rules.length > 0) {
        const ulList = createElementWithIdAndClasses('ul', null);
        for (let i = 0; i < rules.length; i++) {
            const liItem = createElementWithIdAndClasses('li', null);
            liItem.innerText = rules[i];
            ulList.appendChild(liItem);
        }
        ruleContainerCol.appendChild(ulList);
    }

    ruleContainerRow.appendChild(ruleContainerCol);
    return ruleContainerRow;
}

function deleteGame(gameId, deleteFromDB) {
    const deleteObj = {
        gameToDelete: gameId,
        deleteFromDB: deleteFromDB,
        adminUser: document.getElementById('observerName').value,
        adminPass: document.getElementById('observerPass').value
  }
    socket.emit('delete game', deleteObj, function (response) {
        console.log(response);
        if (response.deleteOk) {
            socket.emit('get ongoing games', {myId: window.localStorage.getItem('uUID')}, function (response) {
                showOnGoingGames(response);
            });
        }
    });
}

function showGames(gameList) {
    const gameListContainer = document.getElementById('joinGameCollapse');
    let firstId = '';
    gameList.forEach(function (game) {
        if (firstId ==  '') firstId = game.id;
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row gameContainerRow');
        const ruleDiv = createElementWithIdAndClasses('div', null, 'col-2');
        const rulesElement = createRulesElement(game);
        ruleDiv.appendChild(rulesElement);
        gameContainerDiv.appendChild(ruleDiv);

        const playersDiv = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-1');
        playersDiv.appendChild(gamePlayersToDiv(game.humanPlayers, game.humanPlayersCount));
        gameContainerDiv.appendChild(playersDiv);

        const myNameDiv = createElementWithIdAndClasses('div', null, 'col-3 form-floating');
        const myNameInput = createElementWithIdAndClasses('input', 'myName'+game.id, 'newGameMyNameInput form-control', {type: 'text', placeholder: 'name'});
        const myNameLabel = createElementWithIdAndClasses('label', null, null, {for: 'myName'+game.id});
        myNameLabel.innerText = '(Nick)name';
        if (game.imInThisGame) myNameInput.disabled = true;
        myNameDiv.appendChild(myNameInput);
        myNameDiv.appendChild(myNameLabel);
        gameContainerDiv.appendChild(myNameDiv);

        const myPassDiv = createElementWithIdAndClasses('div', null, 'col-3');
        const myPassDivRow1 = createElementWithIdAndClasses('div', null, 'row');
        const myPassDivCol1 = createElementWithIdAndClasses('div', null, 'col form-floating');
        const myPassDivRow2 = createElementWithIdAndClasses('div', null, 'row');
        const myPassDivCol2 = createElementWithIdAndClasses('div', null, 'col form-floating');
        const myPassInput1 = createElementWithIdAndClasses('input', 'myPass1'+game.id, 'newGameMyPass1 form-control', {type: 'password', placeholder: 'password'});
        const myPassLabel1 = createElementWithIdAndClasses('label', null, null, {for: 'myPass1'+game.id});
        myPassLabel1.innerText = 'Password';
        const myPassInput2 = createElementWithIdAndClasses('input', 'myPass2'+game.id, 'newGameMyPass2 form-control', {type: 'password', placeholder: 'password'});
        const myPassLabel2 = createElementWithIdAndClasses('label', null, null, {for: 'myPass2'+game.id});
        myPassLabel2.innerText = 'Re-type password if first time user';
        if (game.imInThisGame) myPassInput1.disabled = true;
        if (game.imInThisGame) myPassInput2.disabled = true;
        myPassDivCol1.appendChild(myPassInput1);
        myPassDivCol1.appendChild(myPassLabel1);
        myPassDivCol2.appendChild(myPassInput2);
        myPassDivCol2.appendChild(myPassLabel2);
        myPassDivRow1.appendChild(myPassDivCol1);
        myPassDivRow2.appendChild(myPassDivCol2);
        myPassDiv.appendChild(myPassDivRow1);
        myPassDiv.appendChild(myPassDivRow2);
        gameContainerDiv.appendChild(myPassDiv);

        const passwordDiv = createElementWithIdAndClasses('div', null, 'col-2 form-floating');
        const passwordInput = createElementWithIdAndClasses('input', 'password'+game.id, 'form-control', {type: 'text', placeholder: 'password'});
        const myPasswordLabel = createElementWithIdAndClasses('label', null, null, {for: 'myPass1'+game.id});
        myPasswordLabel.innerText = 'Game password';
        passwordInput.disabled = true;
        passwordDiv.appendChild(passwordInput);
        passwordDiv.appendChild(myPasswordLabel);
        gameContainerDiv.appendChild(passwordDiv);

        const joinGameButton = createElementWithIdAndClasses('button', 'joinGameButton' + game.id, 'btn btn-primary joinThisGameButton');
        if (game.imInThisGame) joinGameButton.disabled = true;
        joinGameButton.innerText = 'Join';
        joinGameButton.addEventListener('click', function() {
            joinGame(game.id);
        });
        const joinGameBtnDiv = createElementWithIdAndClasses('div', null, 'col-1');
        
        const leaveGameButton = createElementWithIdAndClasses('button', 'leaveGameButton' + game.id, 'btn btn-primary leaveThisGameButton');
        if (!game.imInThisGame) leaveGameButton.disabled = true;
        leaveGameButton.innerText = 'Leave';
        leaveGameButton.addEventListener('click', function() {
            leaveGame(game.id);
        });
        const buttonsDiv = createElementWithIdAndClasses('div', null, 'btn-group', {role: 'group'});
        buttonsDiv.appendChild(joinGameButton);
        buttonsDiv.appendChild(leaveGameButton);
        joinGameBtnDiv.appendChild(buttonsDiv);
        gameContainerDiv.appendChild(joinGameBtnDiv);

        gameListContainer.appendChild(gameContainerDiv);

        console.log(game);
        if (firstId !==  '') document.getElementById('myName'+firstId).focus();
    });

    if (firstId == '') {
        gameListContainer.innerText = 'no open games';
    }
}

function showOnGoingGames(gameList) {
    console.log(gameList);
    const onGoingGameListContainer = document.getElementById('observeGameCollapse');

    if (!document.getElementById('observerName')) {
        const loginRow = createElementWithIdAndClasses('div', null, 'row');
        const loginCol1 = createElementWithIdAndClasses('div', null, 'col form-floating');
        const loginInputText = createElementWithIdAndClasses('input', 'observerName', 'form-control', { type: 'text', placeholder: 'observerPH'});
        const loginInputLabel = createElementWithIdAndClasses('label', null, null, { for: 'observerName' });
        loginInputLabel.innerText = 'login name';
        loginCol1.appendChild(loginInputText);
        loginCol1.appendChild(loginInputLabel);
        loginRow.appendChild(loginCol1);
        const loginCol2 = createElementWithIdAndClasses('div', null, 'col form-floating');
        const loginInputPass = createElementWithIdAndClasses('input', 'observerPass', 'form-control', { type: 'password', placeholder: 'observerPW'});
        const loginInputPassLabel = createElementWithIdAndClasses('label', null, null, { for: 'observerPass' });
        loginInputPassLabel.innerText = 'password';
        loginCol2.appendChild(loginInputPass);
        loginCol2.appendChild(loginInputPassLabel);
        loginRow.appendChild(loginCol2);
        onGoingGameListContainer.appendChild(loginRow);
    }
    
    removeElementById('gamesContainerDiv');
    const gamesContainerDiv = createElementWithIdAndClasses('div', 'gamesContainerDiv', 'row', { style: "overflow-y:auto; height: 700px;" });

    const dateformatoptions = {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    };
    let currentStatus = -1;
    gameList.forEach(function (game) {
        const gameStatus = game.gameStatus;
        if (currentStatus != -1 && currentStatus != gameStatus) {
            const statusDividerRow = createElementWithIdAndClasses('div', null, 'row');
            const statusDividerCol = createElementWithIdAndClasses('div', null, 'col');
            const statusDividerHr = createElementWithIdAndClasses('hr', null, null);
            statusDividerCol.appendChild(statusDividerHr);
            statusDividerRow.appendChild(statusDividerCol);
            gamesContainerDiv.appendChild(statusDividerRow);
        }
        currentStatus = gameStatus;
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row');
        const gameStarted = new Date(game.created).getTime();
        const dateStr = !isNaN(gameStarted) ? new Intl.DateTimeFormat('fi-FI', dateformatoptions).format(gameStarted) : '';
        const reportDateDiv = createElementWithIdAndClasses('div', null, 'col-3 report-date');
        reportDateDiv.innerText = dateStr;
        gameContainerDiv.appendChild(reportDateDiv);

        const playersContainer = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-5 report-players');
        playersContainer.innerHTML = gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, null);
        gameContainerDiv.appendChild(playersContainer);

        if (gameStatus == 1) {
            // ongoing games
            const btnId = 'observeGameButton' + game.id;
            const observeGameButton = createElementWithIdAndClasses('button', btnId, 'btn btn-primary observeGameButton', { value: game.id });
            observeGameButton.innerText = 'Observe game';
            observeGameButton.addEventListener('click', function() {
                // eslint-disable-next-line no-undef
                //observeGame(this.value);
            });
            const observeGameButtonContainer = createElementWithIdAndClasses('div', null, 'col-2');
            observeGameButtonContainer.appendChild(observeGameButton);
            gameContainerDiv.appendChild(observeGameButtonContainer);
    
            const deleteBtnId = 'deleteGameButton' + game.id;
            const deleteGameButton = createElementWithIdAndClasses('button', deleteBtnId, 'btn btn-primary deleteGameButton', { value: game.id });
            deleteGameButton.innerText = 'Delete game';
            deleteGameButton.addEventListener('click', function() {
                deleteGame(this.value, false);
            });
            const deleteGameButtonContainer = createElementWithIdAndClasses('div', null, 'col-2');
            deleteGameButtonContainer.appendChild(deleteGameButton);
            gameContainerDiv.appendChild(deleteGameButtonContainer);
        } else {
            // deleted and created games
            const deleteBtnId = 'totalDeleteGameButton' + game.id;
            const deleteGameButton = createElementWithIdAndClasses('button', deleteBtnId, 'btn btn-primary totalDeleteGameButton', { value: game.id });
            deleteGameButton.innerText = 'Total delete game';
            deleteGameButton.addEventListener('click', function() {
                deleteGame(this.value, true);
            });
            const deleteGameButtonContainer = createElementWithIdAndClasses('div', null, 'col-2');
            deleteGameButtonContainer.appendChild(deleteGameButton);
            gameContainerDiv.appendChild(deleteGameButtonContainer);
        }

        gamesContainerDiv.appendChild(gameContainerDiv);
    });
    onGoingGameListContainer.appendChild(gamesContainerDiv);
}


function initGameListEvent() {
    document.getElementById('joinGameCollapse').addEventListener('shown.bs.collapse', function () {
        emptyElementById('joinGameCollapse');
        socket.emit('get games', {myId: window.localStorage.getItem('uUID')}, function (response) {
            showGames(response);
        });
    });

    document.getElementById('joinGameCollapse').addEventListener('hidden.bs.collapse', function () {
        emptyElementById('joinGameCollapse');
    });
}

function initOnGoingGameListEvent() {
    document.getElementById('observeGameCollapse').addEventListener('shown.bs.collapse', function () {
        socket.emit('get ongoing games', {myId: window.localStorage.getItem('uUID')}, function (response) {
            showOnGoingGames(response);
        });
    });

    document.getElementById('observeGameCollapse').addEventListener('hidden.bs.collapse', function () {
        emptyElementById('observeGameCollapse');
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
    document.getElementById('sendChatButton').addEventListener('click', sendChat);
    document.getElementById('newChatLine').addEventListener('keypress', function(e) {
        if (e.which == 13) {
            sendChat();
        }
    });
}

function sendChat() {
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
    if (reportData.cardsInHandCount) cardsInHandGraph(reportData.cardsInHandCount);
}

function initShowFrontPageBarsModal(reportData) {
    document.getElementById('commonReportModal').addEventListener('shown.bs.modal', function () {
        console.log('initShowFrontPageBarsModal 2');
        showFrontPageBars(reportData);
    });
}

function initEvents() {
    initGameListEvent();
    initOnGoingGameListEvent();
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

class dataObj {
    games = undefined;
    keepP = undefined;
    avgPoints = undefined;
    totalPoints = undefined;
    scorePoints = undefined;
    wons = undefined;
    winP = undefined;
    bigZeroTryP = undefined;
    bigZeroKeepP = undefined;
    smallNotZeroTryP = undefined;
    smallNotZeroKeepP = undefined;
    winningPP = undefined;
}

function generateTabulatorData(reportData) {
    const dataMap = new Map();
    for (let i = 0; i < reportData.mostGamesPlayed.length; i++) {
        const name = reportData.mostGamesPlayed[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).games = reportData.mostGamesPlayed[i].count;
    }
    for (let i = 0; i < reportData.avgKeepPercentagePerPlayer.length; i++) {
        const name = reportData.avgKeepPercentagePerPlayer[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).keepP = reportData.avgKeepPercentagePerPlayer[i].avgKeepPercentage*100;
    }
    for (let i = 0; i < reportData.avgPointsPerPlayer.length; i++) {
        const name = reportData.avgPointsPerPlayer[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).avgPoints = reportData.avgPointsPerPlayer[i].avgPoints;
    }
    for (let i = 0; i < reportData.avgPercentagePoints.length; i++) {
        const name = reportData.avgPercentagePoints[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).winningPP = reportData.avgPercentagePoints[i].playerAvgPercentPoints*100;
    }
    for (let i = 0; i < reportData.avgScorePointsPerPlayer.length; i++) {
        const name = reportData.avgScorePointsPerPlayer[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).scorePoints = reportData.avgScorePointsPerPlayer[i].playerAvgScorePoints;
    }
    for (let i = 0; i < reportData.totalPointsPerPlayer.length; i++) {
        const name = reportData.totalPointsPerPlayer[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).totalPoints = reportData.totalPointsPerPlayer[i].playersTotalPoints;
    }
    for (let i = 0; i < reportData.playerTotalWins.length; i++) {
        const name = reportData.playerTotalWins[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).wons = reportData.playerTotalWins[i].playerTotalWins;
    }
    for (let i = 0; i < reportData.playerWinPercentage.length; i++) {
        const name = reportData.playerWinPercentage[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).winP = reportData.playerWinPercentage[i].winPercentage*100;
    }
    for (let i = 0; i < reportData.avgZerosPerPlayer.length; i++) {
        const name = reportData.avgZerosPerPlayer[i]._id;
        if (!dataMap.has(name)) dataMap.set(name, new dataObj());
        dataMap.get(name).bigZeroTryP = (reportData.avgZerosPerPlayer[i].totalBigZeroKeeps+reportData.avgZerosPerPlayer[i].totalBigZeroFails)*100/reportData.avgZerosPerPlayer[i].totalBigRounds;
        dataMap.get(name).bigZeroKeepP = reportData.avgZerosPerPlayer[i].totalBigZeroKeeps*100/(reportData.avgZerosPerPlayer[i].totalBigZeroKeeps+reportData.avgZerosPerPlayer[i].totalBigZeroFails);
        dataMap.get(name).smallNotZeroTryP = (reportData.avgZerosPerPlayer[i].totalSmallNotZeroKeeps+reportData.avgZerosPerPlayer[i].totalSmallNotZeroFails)*100/reportData.avgZerosPerPlayer[i].totalSmallRounds;
        dataMap.get(name).smallNotZeroKeepP = reportData.avgZerosPerPlayer[i].totalSmallNotZeroKeeps*100/(reportData.avgZerosPerPlayer[i].totalSmallNotZeroKeeps+reportData.avgZerosPerPlayer[i].totalSmallNotZeroFails);
    }
    console.log(dataMap);
    const retArr = [];
    let count = 1;
    dataMap.forEach((v, k) => {
        console.log(k);
        console.log(v);
        const retVal = {
            id: count,
            name: k,
            games: v.games,
            keepP: v.keepP,
            avgPoints: v.avgPoints,
            totalPoints: v.totalPoints,
            winningPP: v.winningPP,
            scorePoints: v.scorePoints,
            wons: v.wons,
            winP: v.winP,
            bigZeroTryP: v.bigZeroTryP,
            bigZeroKeepP: v.bigZeroKeepP,
            smallNotZeroTryP: v.smallNotZeroTryP,
            smallNotZeroKeepP: v.smallNotZeroKeepP,
        }
        retArr.push(retVal);
        count++;
    });
    console.log(retArr);
    return retArr;
}

function getMaxValuesFromReportData(reportData) {
    const maxValues = {
        games: 0,
        avgPoints: 0,
        totalPoints: 0,
        scorePoints: 0,
        wons: 0,
        winP: 0,
    }
    for (let i = 0; i < reportData.mostGamesPlayed.length; i++) {
        maxValues.games = Math.max(maxValues.games, reportData.mostGamesPlayed[i].count);
    }
    for (let i = 0; i < reportData.avgPointsPerPlayer.length; i++) {
        maxValues.avgPoints = Math.max(maxValues.avgPoints, reportData.avgPointsPerPlayer[i].avgPoints);
    }
    for (let i = 0; i < reportData.avgScorePointsPerPlayer.length; i++) {
        maxValues.scorePoints = Math.max(maxValues.scorePoints, reportData.avgScorePointsPerPlayer[i].playerAvgScorePoints);
    }
    for (let i = 0; i < reportData.totalPointsPerPlayer.length; i++) {
        maxValues.totalPoints = Math.max(maxValues.totalPoints, reportData.totalPointsPerPlayer[i].playersTotalPoints);
    }
    for (let i = 0; i < reportData.playerTotalWins.length; i++) {
        maxValues.wons = Math.max(maxValues.wons, reportData.playerTotalWins[i].playerTotalWins);
    }
    for (let i = 0; i < reportData.playerWinPercentage.length; i++) {
        maxValues.winP = Math.max(maxValues.winP, reportData.playerWinPercentage[i].winPercentage*100);
    }
    return maxValues;
}

function showTabulatorReport(reportData) {
    const maxValues = getMaxValuesFromReportData(reportData);
    const colorArr = [
        '#FF0000',
        '#FF1100',
        '#FF2200',
        '#FF3300',
        '#FF4400',
        '#FF5500',
        '#FF6600',
        '#FF7700',
        '#FF8800',
        '#FF9900',
        '#FFAA00',
        '#FFBB00',
        '#FFCC00',
        '#FFDD00',
        '#FFEE00',
        '#FFFF00',
        '#EEFF00',
        '#DDFF00',
        '#CCFF00',
        '#BBFF00',
        '#AAFF00',
        '#99FF00',
        '#88FF00',
        '#77FF00',
        '#66FF00',
        '#55FF00',
        '#44FF00',
        '#33FF00',
        '#22FF00',
        '#11FF00',
        '#00FF00'
    ]
    console.log(maxValues);
    const columnDefs = [
        { title:"(Nick)Name", field:"name", sorter:"string" },
        { title:"Games", field:"games", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: maxValues.games,
            color: colorArr,
            legend: function (val) { return val; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Keep-%", field:"keepP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: 100,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"AvgPoints", field:"avgPoints", sorter:"number", formatter:"progress", formatterParams: {
            min: 90,
            max: maxValues.avgPoints,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1); },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"TotalPoints", field:"totalPoints", sorter:"number", formatter:"progress", formatterParams: {
            min: 90,
            max: maxValues.totalPoints,
            color: colorArr,
            legend: function (val) { return val; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"ScorePoints", field:"scorePoints", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: maxValues.scorePoints,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(3); },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Wons", field:"wons", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: maxValues.wons,
            color: colorArr,
            legend: function (val) { return val; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Win-%", field:"winP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: maxValues.winP,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"% of winning points", field:"winningPP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: 100,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Tries Big 0", field:"bigZeroTryP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: 100,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Keeps Big 0", field:"bigZeroKeepP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: 100,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Tries Small not 0", field:"smallNotZeroTryP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: 100,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
        { title:"Keeps Small not 0", field:"smallNotZeroKeepP", sorter:"number", formatter:"progress", formatterParams: {
            min: 0,
            max: 100,
            color: colorArr,
            legend: function (val) { return parseFloat(val).toFixed(1)+"%"; },
            legendColor:"#000000",
            legendAlign:"left",
        } },
    ];
    
    const tabledata = generateTabulatorData(reportData);

    new Tabulator("#tabulatorRepotrGrid", {
        //height:500, // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
        data:tabledata, //assign data to table
        layout:"fitColumns", //fit columns to width of table (optional)
        columns:columnDefs,
    });
}

function getReportData() {
    socket.emit('get report data', null, function(response) {
        console.log(response);
        showTabulatorReport(response);
        initShowFrontPageBarsModal(response);

        document.getElementById("gamesPlayedInfo").innerHTML = 'Total of '+response.gamesPlayed+' games and '+ response.roundsPlayed +' rounds played so far...';
        document.getElementById("playersTotalInfo").innerHTML = ' ... and '+response.playersTotal+' players hit '+ response.totalCardsHit +' cards in those games.';

        document.getElementById('vanillaGames').innerHTML = response.vanillaGamesCount+' games played with original rules, otherwise rules were used:';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mainInit() {
    initEvents();
    initButtons();
    getReportData();
}

