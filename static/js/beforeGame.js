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
            $('#createGameCollapse').collapse('hide');
            $('#joinGameCollapse').collapse('show');
        }
    });
    
}

function initcreateNewGameButton() {
    $('#createNewGameButton').on('click', function() {
        var gameOptions = {
            humanPlayersCount: parseInt($('#newGameHumanPlayersCount option:selected')[0].value, 10),
            botPlayersCount: parseInt($('#newGameBotPlayersCount option:selected')[0].value, 10),
            startRound: parseInt($('#newGameStartRound option:selected')[0].value, 10),
            turnRound: parseInt($('#newGameTurnRound option:selected')[0].value, 10),
            endRound: parseInt($('#newGameEndRound option:selected')[0].value, 10),
            adminName: $('#newGameMyName').val(),
            password: $('#newGamePassword').val(),
            gameStatus: 0,
            humanPlayers: [{ name: $('#newGameMyName').val(), playerId: window.localStorage.getItem('uUID'), active: true}],
            createDateTime: new Date(),
            evenPromisesAllowed: !$('#noEvenPromises').prop('checked'),
            visiblePromiseRound: !$('#hidePromiseRound').prop('checked'),
            onlyTotalPromise: $('#onlyTotalPromise').prop('checked'),
            freeTrump: !$('#mustTrump').prop('checked'),
            hiddenTrump: $('#hiddenTrump').prop('checked'),
            speedPromise: $('#speedPromise').prop('checked'),
            privateSpeedGame: $('#privateSpeedGame').prop('checked'),
            opponentPromiseCardValue: $('#opponentPromiseCardValue').prop('checked'),
            opponentGameCardValue: $('#opponentGameCardValue').prop('checked'),
            hiddenCardsMode: parseInt($('#hiddenCardsMode option:selected')[0].value, 10),
        };
        if (validateNewGame(gameOptions)) {
            createNewGame(gameOptions);
        }
    });
}

function initRulesCheck() {
    $('#hidePromiseRound').on('click', function() {
        if (!$('#hidePromiseRound').prop('checked')) {
            $('#onlyTotalPromise').prop('checked', false);
        }
    });
    $('#onlyTotalPromise').on('click', function() {
        if ($('#onlyTotalPromise').prop('checked')) {
            $('#hidePromiseRound').prop('checked', true);
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
    var gameDetails = { gameId: id,
        myName: $('#myName'+id).val(),
        myId: window.localStorage.getItem('uUID'),
        gamePassword: $('#password'+id).val(),
    };
    if (validateJoinGame(gameDetails)) {
        socket.emit('join game', gameDetails, function (response) {
            console.log(response);
            if (response.joiningResult == 'OK') {
                $('.joinThisGameButton').prop('disabled', true);
                $('#leaveGameButton'+response.joiningResult.gameId).prop('disabled', false);
            }
        });
    }
}

function leaveGame(id) {
    var gameDetails = { gameId: id,
        myId: window.localStorage.getItem('uUID'),
    };
    socket.emit('leave game', gameDetails, function (response) {
        console.log(response);
        if (response.leavingResult == 'OK') {
            $('.joinThisGameButton').prop('disabled', true);
            $('#leaveGameButton'+response.leavingResult.gameId).prop('disabled', false);
        }
    });
}

function showGames(gameList) {
    var gameListContainer = $('#joinGameCollapse');
    var firstId = '';
    gameList.forEach(function (game) {
        if (firstId ==  '') firstId = game.id;
        var gameContainerDiv = $('<div id="gameContainerDiv'+ game.id +'">').addClass('row');
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
        gameContainerDiv.append($('<div>').addClass('col-2').text(ruleStr));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-3').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));
        var joinBtnStatus = game.imInThisGame ? ' disabled' : '';
        gameContainerDiv.append(($('<div>').addClass('col-2').append($('<input type="text" id="myName'+game.id+'"'+joinBtnStatus+'>').addClass('newGameMyNameInput'))));
        gameContainerDiv.append(($('<div>').addClass('col-2').append($('<input disabled type="text" id="password'+game.id+'">'))));
        var btnId = 'joinGameButton' + game.id;
        var leaveBtnId = 'leaveGameButton' + game.id;
        var joinGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary joinThisGameButton'+joinBtnStatus).text('Join'));
        var leaveBtnStatus = !game.imInThisGame ? ' disabled' : '';
        var leaveGameButton = ($('<button id="'+leaveBtnId+'">').addClass('btn btn-primary leaveThisGameButton'+leaveBtnStatus).text('Leave'));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(joinGameButton));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(leaveGameButton));

        gameListContainer.append(gameContainerDiv);

        $('#'+btnId).on('click', function() {
            joinGame(game.id);
        });
        $('#'+leaveBtnId).on('click', function() {
            leaveGame(game.id);
        });

        console.log(game);
        if (firstId !==  '') $('#myName'+firstId).focus();

    });
}

function initGameListEvent() {
    $('#joinGameCollapse').on('shown.bs.collapse', function () {
        socket.emit('get games', {myId: window.localStorage.getItem('uUID')}, function (response) {
            console.log(response);
            showGames(response);
        });
    });

    $('#joinGameCollapse').on('hidden.bs.collapse', function () {
        const node = document.getElementById('joinGameCollapse');
        node.innerHTML = '';
    });
}

function initJoinByIdButton() {
    $('#joinByIdButton').on('click', function() {
        var uuid = $('#joinById').val();
        var gameId = $('#joinGameId').val();
        if (uuid.length == 36 && gameId.length > 5) {
            var joiningDetails = { gameId: gameId,
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
    $('#dontLeaveButton').on('click', function() {
        $('#leaveGameCollapse').collapse('hide');
    });
    $('#leaveButton').on('click', function() {
        $('#leavingUId').val(window.localStorage.getItem('uUID'));
    });
    $('#leavingGameModal').on('hidden.bs.modal', function() {
        var uuid = uuidv4();
        console.log('new uUID set: ' + uuid);
        window.localStorage.setItem('uUID', uuid);
        deleteIntervaller();
        var leaveGameObj = { gameId: $('#currentGameId').val(), playerId: $('#leavingUId').val()};
        socket.emit('leave ongoing game', leaveGameObj, function(retVal) {
            if (retVal.leavingResult == 'LEAVED') {
                deleteIntervaller();
                $('.validPromiseButton').prop('disabled', true);
                $('.makePromiseButton').off('click');
                $('.card').off('click touchstart');
                alert('You have now left the game. Please click OK and then refresh this page.');
            } else {
                alert('Something went wrong! Try to refresh page and see what happens...');
            }
        });
    });
}

function initChatButton() {
    $('#sendChatButton').on('click', function() {
        var newLine = $('#newChatLine').val().trim();
        var myName = $('#myName').val().trim();
        if (newLine.length > 0) {
            var chatObj = {
                gameId: $('#currentGameId').val(),
                chatLine: newLine,
                myName: myName,
            }
            socket.emit('write chat', chatObj, function() {
                $('#newChatLine').val('');
            });
        }
    });
    $('#newChatLine').on('keypress', function(e) {
        if (e.which == 13) {
            var newLine = $('#newChatLine').val().trim();
            var myName = $('#myName').val().trim();
            if (newLine.length > 0) {
                var chatObj = {
                    gameId: $('#currentGameId').val(),
                    chatLine: newLine,
                    myName: myName,
                }
                socket.emit('write chat', chatObj, function() {
                    $('#newChatLine').val('');
                });
            }
        }
    });
}

function initShowReportButton() {
    $('#showGameReportButton').on('click', function() {
        var gameId = $('#currentGameId').val();
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

function initEvents() {
    initGameListEvent();
}


function getReportData() {
    socket.emit('get report data', null, function(response) {
        console.log(response);
        $("#gamesPlayedInfo").html('Total of '+response.gamesPlayed+' games played so far...');
        $("#playersTotalInfo").html(' ... and '+response.playersTotal+' players in those games.');
        $("#mostGamesPlayed1").html(response.mostGamesPlayed[0]._id+' has played in '+response.mostGamesPlayed[0].count+' of those games,');
        $("#mostGamesPlayed2").html(response.mostGamesPlayed[1]._id+' attended '+response.mostGamesPlayed[1].count+' times,');
        $("#mostGamesPlayed3").html('and '+response.mostGamesPlayed[2]._id+' '+response.mostGamesPlayed[2].count+' times.');
    });
}

function mainInit() {
    initEvents();
    initButtons();
    //getReportData();
}
