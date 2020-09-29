function validateNewGame(gameOptions) {
    if (gameOptions.humanPlayersCount + gameOptions.botPlayersCount < 2 || gameOptions.humanPlayersCount + gameOptions.botPlayersCount > 5) {
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
    return true;
}

function createNewGame(socket, gameOptions) {
    console.log(gameOptions);
    //var socket = io();
    socket.emit('create game', gameOptions);
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
        };
        if (validateNewGame(gameOptions)) createNewGame(socket, gameOptions);
    });
}

function gamePlayersToStr(players, totalHumans, totalComputers) {
    var retStr = '';
    players.forEach(function (player) {
        retStr+= player.name + ', ';
    });
    for (i = players.length; i < totalHumans; i++) retStr+= '{}, ';
    if (retStr.length > 2) retStr = retStr.substring(0, retStr.length-2);
    return retStr;
}

function validateJoinGame(gameDetails) {
    return true;
}

function joinGame(socket, id) {
    //var socket = io();
    var gameDetails = { gameId: id,
        myName: $('#myName'+id).val(),
        gamePassword: $('#password'+id).val(),
    };
    if (validateJoinGame(gameDetails)) {
        socket.emit('join game', gameDetails, function (response) {
            console.log(response);

        });
    }
}

function showGames(socket, gameList) {
    var gameListContainer = $('#joinGameCollapse');
    gameList.forEach(function (game) {
        var gameContainer = $('<div id="game' + game.id + '">').addClass('card card-body');
        var gameContainerDiv = $('<div>').addClass('row');
        gameContainerDiv.append($('<div>').addClass('col-2').text(game.startRound + '-' + game.turnRound + '-' + game.endRound));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-3').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));
        gameContainerDiv.append(($('<div>').addClass('col-3').append($('<input type="text" id="myName'+game.id+'">'))));
        gameContainerDiv.append(($('<div>').addClass('col-3').append($('<input disabled type="text" id="password'+game.id+'">'))));
        var btnId = 'joinGameButton' + game.id;
        var joinGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary').text('Join game'));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(joinGameButton));

        gameListContainer.append(gameContainer.append(gameContainerDiv));

        $('#'+btnId).on('click', function() {
            joinGame(socket, game.id);
        });

        console.log(game);
    });
}

function initGameListEvent(socket) {
    $('#joinGameCollapse').on('shown.bs.collapse', function () {
        //var socket = io();
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

function initButtons(socket) {
    initcreateNewGameButton(socket);
}

function initEvents(socket) {
    initGameListEvent(socket);
}

function mainInit(socket) {
    initEvents(socket);
    initButtons(socket);
}