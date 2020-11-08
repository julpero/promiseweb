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

function createNewGame(socket, gameOptions) {
    console.log(gameOptions);
    socket.emit('create game', gameOptions, function (createdGameId) {
        if (createdGameId == 'NOT OK') {
            alert('You have already created game!');
        } else {
            console.log('created game with id: '+createdGameId);
            gameId = createdGameId;
            $('#joinGameCollapse').collapse('show');
            $('#createGameCollapse').collapse('hide');
        }
    });
    
}

function initcreateNewGameButton(socket) {
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
            humanPlayers: [{ name: $('#newGameMyName').val(), playerId: window.localStorage.getItem('uUID')}],
            createDateTime: new Date(),
            evenPromisesAllowed: !$('#noEvenPromises').prop('checked'),
            visiblePromiseRound: !$('#hidePromiseRound').prop('checked'),
            onlyTotalPromise: $('#onlyTotalPromise').prop('checked'),
            freeTrump: !$('#mustTrump').prop('checked'),
            hiddenTrump: $('#hiddenTrump').prop('checked'),
        };
        if (validateNewGame(gameOptions)) {
            createNewGame(socket, gameOptions);
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

function gamePlayersToStr(players, totalHumans, totalComputers) {
    var retStr = '';
    players.forEach(function (player) {
        retStr+= player.name + ', ';
    });
    for (i = players.length; i < totalHumans; i++) retStr+= '{}, ';
    if (retStr.length > 2) retStr = retStr.substring(0, retStr.length-2);
    if (totalComputers > 0) retStr+= ' (+'+totalComputers+')';
    return retStr;
}

function validateJoinGame(gameDetails) {
    if (gameDetails.myName.length < 3) {
        alert('(Nick)name must be at least three charcters!');
        return false;
        
    }
    return true;
}

function joinGame(socket, id) {
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

function leaveGame(socket, id) {
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

function showGames(socket, gameList) {
    var gameListContainer = $('#joinGameCollapse');
    var firstId = '';
    gameList.forEach(function (game) {
        if (firstId ==  '') firstId = game.id;
        var gameContainerDiv = $('<div id="gameContainerDiv"'+ game.id +'>').addClass('row');
        var ruleStr = game.startRound + '-' + game.turnRound + '-' + game.endRound;
        if (!game.evenPromisesAllowed) ruleStr+= ', no even promises';
        if (!game.visiblePromiseRound) ruleStr+= ', hidden promise round';
        if (game.onlyTotalPromise) ruleStr+= ', only total promise visible';
        if (!game.freeTrump) ruleStr+= ', must trump';
        if (game.hiddenTrump) ruleStr+= ', hidden trump';
        gameContainerDiv.append($('<div>').addClass('col-2').text(ruleStr));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-3').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));
        gameContainerDiv.append(($('<div>').addClass('col-2').append($('<input type="text" id="myName'+game.id+'">').addClass('newGameMyNameInput'))));
        gameContainerDiv.append(($('<div>').addClass('col-2').append($('<input disabled type="text" id="password'+game.id+'">'))));
        var btnId = 'joinGameButton' + game.id;
        var leaveBtnId = 'leaveGameButton' + game.id;
        var joinGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary joinThisGameButton').text('Join'));
        var leaveGameButton = ($('<button id="'+leaveBtnId+'">').addClass('btn btn-primary leaveThisGameButton disabled').text('Leave'));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(joinGameButton));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(leaveGameButton));

        gameListContainer.append(gameContainerDiv);

        $('#'+btnId).on('click', function() {
            joinGame(socket, game.id);
        });
        $('#'+leaveBtnId).on('click', function() {
            leaveGame(socket, game.id);
        });

        console.log(game);
        if (firstId !==  '') $('#myName'+firstId).focus();

    });
}

function initGameListEvent(socket) {
    $('#joinGameCollapse').on('shown.bs.collapse', function () {
        socket.emit('get games', {}, function (response) {
            console.log(response);
            showGames(socket, response);
        });
    });

    $('#joinGameCollapse').on('hidden.bs.collapse', function () {
        const node = document.getElementById('joinGameCollapse');
        node.innerHTML = '';
    });
}

function initJoinByIdButton(socket) {
    $('#joinByIdButton').on('click', function() {
        var uuid = $('#joinById').val();
        var gameId = $('#joinGameId').val();
        if (uuid.length == 36 && gameId.length > 5) {
            window.localStorage.setItem('uUID', uuid);
            console.log('new uUID set: ' + uuid);

            var joiningDetails = { gameId: gameId,
                myId: window.localStorage.getItem('uUID'),
            };
            socket.emit('join game by id', joiningDetails, function (response) {
                console.log('joining game by id: ' + response);
                if (response.joiningResult == 'OK') {
                    alert('You can now play as ' + response.newName + '. Please click OK and then refresh this page.');
                }
            });
        }
    });
}

function initLeavingButtons(socket) {
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
        socket.emit('leave ongoing game', $('#joinGameId').val(), function() {
            alert('You have now left the game. Please click OK and then refresh this page.');
        });
    });
}

function initChatButton(socket) {
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

function initButtons(socket) {
    initcreateNewGameButton(socket);
    initRulesCheck();
    initLeavingButtons(socket);
    initJoinByIdButton(socket);
    initChatButton(socket);
}

function initEvents(socket) {
    initGameListEvent(socket);
}

function mainInit(socket) {
    initEvents(socket);
    initButtons(socket);
}
