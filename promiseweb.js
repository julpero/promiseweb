function validateNewGame(gameOptions) {
    if (gameOptions.humanPlayers + gameOptions.botPlayers < 2 || gameOptions.humanPlayers + gameOptions.botPlayers > 5) {
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
    if (gameOptions.playerName.length  < 3) {
        alert('Your (nick)name must be at least four characters long');
        return false;
    }
    return true;
}

function createNewGame(gameOptions) {
    console.log(gameOptions);
    var socket = io();
    socket.emit('create game', gameOptions);
}

function initcreateNewGameButton() {
    $('#createNewGameButton').on('click', function() {
        var gameOptions = {
            humanPlayers: parseInt($('#newGameHumanPlayersCount option:selected')[0].value, 10),
            botPlayers: parseInt($('#newGameBotPlayersCount option:selected')[0].value, 10),
            startRound: parseInt($('#newGameStartRound option:selected')[0].value, 10),
            turnRound: parseInt($('#newGameTurnRound option:selected')[0].value, 10),
            endRound: parseInt($('#newGameEndRound option:selected')[0].value, 10),
            playerName: $('#newGameMyName').val(),
            password: $('#newGamePassword').val(),
        };
        if (validateNewGame(gameOptions)) createNewGame(gameOptions);
    });
}
function initGetGamesButton() {
    $('#getGamesButton').on('click', function() {
        console.log('getting games');
        var socket = io();
        socket.emit('get games');
    });
}

function initButtons() {
    initcreateNewGameButton();
    initGetGamesButton();
}