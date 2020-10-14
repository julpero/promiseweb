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
    var gameId;
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
        };
        if (validateNewGame(gameOptions)) {
            createNewGame(socket, gameOptions);
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
                $('#leaveGameButton'+joiningResult.gameId).prop('disabled', false);
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
            $('#leaveGameButton'+leavingResult.gameId).prop('disabled', false);
        }
    });
}

function showGames(socket, gameList) {
    var gameListContainer = $('#joinGameCollapse');
    var firstId = '';
    gameList.forEach(function (game) {
        if (firstId ==  '') firstId = game.id;
        var gameContainerDiv = $('<div id="gameContainerDiv"'+ game.id +'>').addClass('row');
        gameContainerDiv.append($('<div>').addClass('col-1').text(game.startRound + '-' + game.turnRound + '-' + game.endRound));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-3').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));
        gameContainerDiv.append(($('<div>').addClass('col-2').append($('<input type="text" id="myName'+game.id+'">').addClass('newGameMyNameInput'))));
        gameContainerDiv.append(($('<div>').addClass('col-2').append($('<input disabled type="text" id="password'+game.id+'">'))));
        var btnId = 'joinGameButton' + game.id;
        var leaveBtnId = 'leaveGameButton' + game.id;
        var joinGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary joinThisGameButton').text('Join'));
        var leaveGameButton = ($('<button id="'+leaveBtnId+'">').addClass('btn btn-primary leaveThisGameButton disabled').text('Leave'));
        gameContainerDiv.append(($('<div>').addClass('col-2')).append(joinGameButton));
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
            alert('You have now leaved game. Please click OK and then refresh this page.');
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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function suitToInt(suit) {
    if (suit == 'spades') return 0;
    if (suit == 'hearts') return 1;
    if (suit == 'clubs') return 2;
    if (suit == 'diamonds') return 3;
    return null;
}

function getCardIndex(cards, myCard) {
    var index = null;
    cards.forEach(function (card, idx) {
        if (suitToInt(myCard.suit) == card.suit && myCard.rank == (card.rank == 1 ? 14 : card.rank)) {
            index = idx;
            return;
        }
    });
    return index;
}

function drawCards(myRound) {
    var deck = Deck();
    var cardsDrawn = [];
    drawMyCards(deck, myRound.myCards, cardsDrawn);
    drawTrumpCard(deck, myRound.trumpCard, cardsDrawn);
    drawOtherPlayerCards(deck, myRound.players, myRound.cardsInRound, cardsDrawn, myRound.cardsPlayed);
}

function playerHasPlayedCards(playerName, cardsPlayed) {
    var retVal = 0;
    for (var i = 0; i < cardsPlayed.length; i++) {
        for (var j = 0; j < cardsPlayed[i].length; j++) {
            if (cardsPlayed[i][j].name == playerName) retVal++;
        }
    }
    return retVal;
}

function drawOtherPlayerCards(deck, players, cardsInRound, cardsDrawn, cardsPlayed) {
    for (var i = 0; i < players.length; i++) {
        if (!players[i].thisIsMe) {
            var playerName = players[i].name;
            var tableIndex = otherPlayerMapper(i, players);
            for (j = 0; j < cardsInRound - playerHasPlayedCards(playerName, cardsPlayed); j++) {
                var $deckDiv = document.getElementById('player'+tableIndex+'CardCol'+j);
                for (d = 0; d < 52; d++) {
                    if ($.inArray(d, cardsDrawn) == -1) {
                        var card = deck.cards[d];
                        cardsDrawn.push(d);
                        card.mount($deckDiv);
                        card.setSide('back');
                        card.animateTo({
                            delay: 0,
                            duration: 0,
                            rot: Math.floor(Math.random() * 10) - 5,
                        });
                        break;
                    }
                }
            }
        }
    }
}


function drawTrumpCard(deck, trumpCard, cardsDrawn) {
    var $deckDiv = document.getElementById('trumpDiv');
    var cardIndex = getCardIndex(deck.cards, trumpCard);
    var card = deck.cards[cardIndex];
    cardsDrawn.push(cardIndex);
    card.mount($deckDiv);
    card.setSide('front');
    card.animateTo({
        delay: 0,
        duration: 0,
        rot: Math.floor(Math.random() * 10) - 5,
    });
}

function initMyPromiseRow() {
    var node = $('<div id="myPromiseRow"></div>').addClass('row myCardsRowClass');
    var col1 = $('<div></div>').addClass('col-1');
    var col2 = $('<div id="myPromiseCol"></div>').addClass('col-10');
    var col3 = $('<div></div>').addClass('col-1');
    
    node.append(col1);
    node.append(col2);
    node.append(col3);

    return node;

}

function initMyCardsContainer() {
    var node = $('<div></div>').addClass('row myCardsRowClass');
    
    for (var i = 0; i < 10; i++) {
        node.append(drawCardCol(i));
    }

    return node;
}

function drawMyCards(deck, myCards, cardsDrawn) {

    myCards.forEach(function (myCard, idx) {
        var $container = document.getElementById('player0CardCol'+idx);
        var cardIndex = getCardIndex(deck.cards, myCard);
        var card = deck.cards[cardIndex];
        cardsDrawn.push(cardIndex);
        card.mount($container);
        card.setSide('front');
        card.animateTo({
            delay: 0,
            duration: 0,
            rot: Math.floor(Math.random() * 10) - 5,
        });
    });
}

function drawCardCol(idx) {
    var cardCol = $('<div id="player0CardCol'+idx+'">&nbsp;</div>').addClass('col cardCol');
    return cardCol;
}

function mapPlayerNameToTable(name) {
    var divs = $('.playerNameCol:contains("'+name+'")');
    if (divs.length == 1) {
        var divId = divs[0].id;
        if (divId.length > 6) {
            var divIdNbrStr = divId.substring(6, 7);
            return parseInt(divIdNbrStr, 10);
        }
    }

    return 0;
}

function otherPlayerMapper(idFrom, players) {
    // map myRound players to div id
    // i, my self is position 0
    // and then first player on my left is position 1 and so on

    // first find me
    var me = 0;
    players.forEach(function (player, idx) {
        if (player.thisIsMe) {
            me = idx;
            return;
        }
    });

    if (me == 0) {
        return idFrom;
    } else if (me == idFrom) {
        return 0;
    } else {
        return (me < idFrom) ? idFrom - me : idFrom + players.length - me;
    }
}

function initTrumpTable() {
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row11= $('<div></div>').addClass('row');
    var col11 = $('<div>Valtti</div>').addClass('col nameCol');
    var col12 = $('<div></div>').addClass('w-100');
    var col13 = $('<div id="trumpDiv"></div>').addClass('col cardCol');
    row11.append(col11);
    row11.append(col12);
    row11.append(col13);
    
    nodeCol.append(row11);
    
    nodeRow.append(nodeCol);

    return nodeRow;
}

function initPlayerTable(index, align) {
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col playerTableCol');

    var row1 = $('<div id="player'+index+'row"></div>').addClass('row');
    var col1 = $('<div id="player'+index+'NameCol"></div>').addClass('col nameCol playerNameCol');
    row1.append(col1);
    row1.append($('<div id="player'+index+'Promised"></div>').addClass('col'));
    row1.append($('<div id="player'+index+'Keeps"></div>').addClass('col'));
    
    if (index > 0) {
        var row2 = $('<div></div>').addClass('row');
        for (var i = 0; i < 12; i++) {
            row2.append($('<div id="player'+index+'CardCol'+i+'"></div>').addClass('col cardCol'));
        }
    }

    var row3 = $('<div></div>').addClass('row');
    col31 = $('<div></div>').addClass('col cardCol');
    col32 = $('<div></div>').addClass('col cardCol');

    var cardsWonRow = $('<div></div>').addClass('row');
    for (var i = 0; i < 10; i++) {
        cardsWonRow.append($('<div id="player'+index+'CardsWon'+i+'Div"></div>').addClass('col cardCol cardWonCol'));
    }
    var playedCardRow = $('<div></div>').addClass('row');
    
    // where are promises and points aligned
    if (align == 'left') {
        playedCardRow.append($('<div id="player'+index+'Thinking"></div>').addClass('col'));
        if (index != 0) playedCardRow.append($('<div id="player'+index+'CardPlayedDiv"></div>').addClass('col cardCol'));
        col31.append(cardsWonRow);
        col32.append(playedCardRow);
    }
    if (align == 'right') {
        if (index != 0) playedCardRow.append($('<div id="player'+index+'CardPlayedDiv"></div>').addClass('col cardCol'));
        playedCardRow.append($('<div id="player'+index+'Thinking"></div>').addClass('col'));
        col31.append(playedCardRow);
        col32.append(cardsWonRow);
    }

    row3.append(col31);
    row3.append(col32);

    nodeCol.append(row1);
    if (index > 0) nodeCol.append(row2);
    nodeCol.append(row3);

    nodeRow.append(nodeCol);
    return nodeRow;
}

function myPlayedCardDiv() {
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div id="player0CardPlayedDiv"></div>').addClass('col cardCol');
    nodeRow.append(nodeCol);
    return nodeRow;
}

function initTableFor3() {
    console.log('initTableFor3');
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-5');
    col1.append(initPlayerTable(1, 'left'));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());
    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(2, 'right'));

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-6');
    var col22 = $('<div></div>').addClass('col-2');
    col22.append(myPlayedCardDiv());
    var col23 = $('<div></div>').addClass('col-4');
    
    row2.append(col21);
    row2.append(col22);
    row2.append(col23);

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-3');
    col31.append(initPlayerTable(0, 'left'));
    
    var col32 = $('<div></div>').addClass('col-9');
    var myCardsRow = initMyCardsContainer();
    var myPromiseRow = initMyPromiseRow();
    
    col32.append(myPromiseRow);
    col32.append(myCardsRow);

    row3.append(col31);
    row3.append(col32);
    
    
    nodeCol.append(row1);
    nodeCol.append(row2);
    nodeCol.append(row3);
    nodeRow.append(nodeCol);
    return nodeRow;
}

function initTableFor4() {
    console.log('initTableFor4');
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-5');
    col1.append(initPlayerTable(2, 'left'));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());

    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(3, 'right'));

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-5');
    col21.append(initPlayerTable(1, 'left'));

    var col22 = $('<div></div>').addClass('col-1');

    var col23 = $('<div></div>').addClass('col-1');
    var cardRow = $('<div></div>').addClass('row');
    var carCols = $('<div></div>').addClass('col cardCol');
    var cardRow0 = $('<div></div>').addClass('row');
    var carCols0 = $('<div></div>').addClass('col cardCol');
    
    var cardRow1 = $('<div></div>').addClass('row');
    var carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv());
    cardRow1.append(carCols1);
    cardRow.append(carCols);
    cardRow0.append(carCols0);
    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow1);

    var col24 = $('<div></div>').addClass('col-5');

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-3');
    col31.append(initPlayerTable(0, 'left'));
    
    var col32 = $('<div></div>').addClass('col-9');
    var myCardsRow = initMyCardsContainer();
    
    var myPromiseRow = initMyPromiseRow();
    
    col32.append(myPromiseRow);
    col32.append(myCardsRow);

    row3.append(col31);
    row3.append(col32);

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);

    row2.append(col21);
    row2.append(col22);
    row2.append(col23);
    row2.append(col24);

    nodeCol.append(row1);
    nodeCol.append(row2);
    nodeCol.append(row3);
    nodeRow.append(nodeCol);
    return nodeRow;
}


function initTableFor5() {
    console.log('initTableFor4');
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-5');
    col1.append(initPlayerTable(2, 'left'));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());

    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(3, 'right'));

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-5');
    col21.append(initPlayerTable(1, 'left'));

    var col22 = $('<div></div>').addClass('col-1');

    var col23 = $('<div></div>').addClass('col-1');
    var cardRow = $('<div></div>').addClass('row');
    var carCols = $('<div></div>').addClass('col cardCol');
    var cardRow0 = $('<div></div>').addClass('row');
    var carCols0 = $('<div></div>').addClass('col cardCol');
    
    var cardRow1 = $('<div></div>').addClass('row');
    var carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv());
    cardRow1.append(carCols1);
    cardRow.append(carCols);
    cardRow0.append(carCols0);
    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow1);

    var col24 = $('<div></div>').addClass('col-5');
    col24.append(initPlayerTable(4, 'right'));

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-3');
    col31.append(initPlayerTable(0, 'left'));
    
    var col32 = $('<div></div>').addClass('col-9');
    var myCardsRow = initMyCardsContainer();
    
    var myPromiseRow = initMyPromiseRow();
    
    col32.append(myPromiseRow);
    col32.append(myCardsRow);

    row3.append(col31);
    row3.append(col32);

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);

    row2.append(col21);
    row2.append(col22);
    row2.append(col23);
    row2.append(col24);

    nodeCol.append(row1);
    nodeCol.append(row2);
    nodeCol.append(row3);
    nodeRow.append(nodeCol);
    return nodeRow;
}


function initCardTable(myRound) {
    var node = $('#otherPlayers');
    node.html('');

    const playerCount = myRound.players.length;
    if (playerCount == 3) node.append(initTableFor3());
    if (playerCount == 4) node.append(initTableFor4());
    if (playerCount == 5) node.append(initTableFor5());
}

function initOtherPlayers(myRound) {
    myRound.players.forEach(function(player, idx) {
        if (!player.thisIsMe || true) {
            $('#player'+otherPlayerMapper(idx, myRound.players)+'NameCol').html(player.name);
        }
    });
}

function isMyPlayTurn(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.playerInCharge;
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].cardPlayed == null) {
            // this is next player to play
            console.log('isMyPlayTurn: '+ myRound.players[chkPos].thisIsMe);
            return myRound.players[chkPos].thisIsMe;
        }
    }
    return false;
}

function isMyPromiseTurn(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.dealerPositionIndex + 1; // next from dealer
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].promise == null) {
            // this is next player to promise
            console.log('isMyPromiseTurn: '+ myRound.players[chkPos].thisIsMe);
            return myRound.players[chkPos].thisIsMe;
        }
    }
    return false;
}

function getThinkinDiv(type) {
    var nodeRow = $('<div id="pulsingRow"></div>');
    var nodeCol = $('<div id="pulsingCol"></div>').addClass('thinking'+type);
    nodeRow.append(nodeCol);
    return nodeRow;
}

function showThinking(id) {
    $('#player'+id+'Thinking').append(getThinkinDiv('red'));
}

function showMyTurn() {
    $('#player0Thinking').append(getThinkinDiv('green'));
}

function hideThinkings() {
    $('#pulsingRow').remove();
}

function showWhoIsPromising(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.dealerPositionIndex + 1; // next from dealer
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].promise == null) {
            // this is next player to promise
            showThinking(otherPlayerMapper(chkPos, myRound.players));
            return;
        }
    }
    return;
}

function showWhoIsPlaying(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.playerInCharge;
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].cardPlayed == null) {
            // this player is playing
            showThinking(otherPlayerMapper(chkPos, myRound.players));
            return;
        }
    }
    return;
}

function roundPromised(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        if (myRound.players[i].promise == null) return false;
    }
    return true;
}

function initPromise(socket, myRound) {
    $('#myPromiseCol').empty();
    var node = $('#myPromiseCol');

    for (var i = 0; i < myRound.cardsInRound + 1; i++) {
        node.append($('<button id="makePromiseButton'+i+'" value="'+i+'"></button>').addClass('btn btn-primary makePromiseButton').text(i));
        $('#makePromiseButton'+i).on('click', function() {
            $('.makePromiseButton').off('click');
            var promiseDetails = { gameId: myRound.gameId,
                roundInd: myRound.roundInd,
                myId: window.localStorage.getItem('uUID'),
                promise: this.value,
            };
            socket.emit('make promise', promiseDetails, function (promiseReturn) {
                hidePromise();
                console.log('promiseReturn:');
                console.log(promiseReturn);
            });
        });
    }

    $('#myPromiseRow').show();
}

function hidePromise() {
    $('#myPromiseRow').hide();
    $('#myPromiseCol').empty();
}

function showPlayerPromises(myRound) {
    myRound.players.forEach(function (player, idx) {
        var tableIdx = otherPlayerMapper(idx, myRound.players);
        if (player.promise != null) {
            $('#player'+tableIdx+'Promised').html('prom: '+player.promise);
            $('#player'+tableIdx+'Keeps').html('keep: '+player.keeps);
            if (player.promise == player.keeps) {
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseOver');
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseUnder');
                if (!$('#player'+tableIdx+'Keeps').hasClass('gamePromiseKeeping')) $('#player'+tableIdx+'Keeps').addClass('gamePromiseKeeping');
            }
            if (player.promise < player.keeps) {
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseKeeping');
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseUnder');
                if (!$('#player'+tableIdx+'Keeps').hasClass('gamePromiseOver')) $('#player'+tableIdx+'Keeps').addClass('gamePromiseOver');
            }
            if (player.promise > player.keeps) {
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseKeeping');
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseOver');
                if (!$('#player'+tableIdx+'Keeps').hasClass('gamePromiseUnder')) $('#player'+tableIdx+'Keeps').addClass('gamePromiseUnder');
            }
        } else {
            $('#player'+tableIdx+'Promised').empty();
            $('#player'+tableIdx+'Keeps').empty();
        }
    });
    initPromiseTable(myRound.promiseTable);
}

function getPromise(socket, myRound) {
    hideThinkings();
    if (isMyPromiseTurn(myRound)) {
        showMyTurn();
        initPromise(socket, myRound);
        dimMyCards(myRound, 1.0);
    } else {
        hidePromise();
        showWhoIsPromising(myRound);
        dimMyCards(myRound, 0.7);
    }
}

function amIStarterOfPlay(myRound) {
    return myRound.cardInCharge == null;
}

function iHaveSuitInMyHand(suitInCharge, myHand) {
    for (var i = 0; i < myHand.length; i++) {
        if (myHand[i].suit == suitInCharge) return true;
    }
    return false;
}

function cardToClassMapper(card) {
    // note: ace has rank 1 in ui but 14 in server
    var rank = card.rank == 14 ? 1 : card.rank;
    var retStr = '.card.';
    retStr+= card.suit + '.rank' + rank;
    return retStr;
}

function rankCard(rank) {
    // note: ace has rank 1 in ui but 14 in server
    if (rank == 1) return 14;
    return rank;
}

function classToCardMapper(classStr) {
    var classes = classStr.split(/\s+/);
    if (classes[1] && classes[2]) {
        return {
            suit: classes[1],
            rank: rankCard(parseInt(classes[2].substring(4), 10)),
        }
    }
    return null;
}

function initCardEvents(socket, myRound, onlySuit) {
    for (var i = 0; i < myRound.myCards.length; i++) {
        var cardMapperStr = cardToClassMapper(myRound.myCards[i]);
        if (onlySuit == null || myRound.myCards[i].suit == onlySuit) {
            // activate this card / div
            console.log('activate this card / div: ' + myRound.myCards[i].suit + ' ' + myRound.myCards[i].rank);
            console.log(' mapped to: ' + cardMapperStr);
            $(cardMapperStr+' ').fadeTo('slow', 1);
            $(cardMapperStr).on('click', function () {
                $('.card').off('click');
                console.log(this.className);
                var card = classToCardMapper(this.className);
                console.log(card);
                var playDetails = { gameId: myRound.gameId,
                    roundInd: myRound.roundInd,
                    myId: window.localStorage.getItem('uUID'),
                    playedCard: card,
                };
                socket.emit('play card', playDetails, function (playReturn) {
                    console.log('playReturn:');
                    console.log(playReturn);
                });
            });
        } else {
            // fade this card
            $(cardMapperStr+' ').fadeTo('slow', 0.6);
        }
    }
}

function dimMyCards(myRound, visibility) {
    for (var i = 0; i < myRound.myCards.length; i++) {
        var cardMapperStr = cardToClassMapper(myRound.myCards[i]);
        $(cardMapperStr+' ').fadeTo(400, visibility);
    }
}

function initCardsToPlay(socket, myRound) {
    if (amIStarterOfPlay(myRound) || !iHaveSuitInMyHand(myRound.cardInCharge.suit, myRound.myCards)) {
        // i can play any card i want
        initCardEvents(socket, myRound);
    } else {
        // i can play only suit of card in charge
        initCardEvents(socket, myRound, myRound.cardInCharge.suit);
    }    
}    

function showPlayedCards(myRound) {
    var deck = Deck();
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.dealerPositionIndex + 1; // next from dealer
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].cardPlayed != null) {
            var divId = otherPlayerMapper(chkPos, myRound.players);
            // var lastPlayed = chkPos;
            var cardPlayed = myRound.players[chkPos].cardPlayed;

            var $container = document.getElementById('player'+divId+'CardPlayedDiv');
            var cardIndex = getCardIndex(deck.cards, cardPlayed);
            var card = deck.cards[cardIndex];
            card.mount($container);
            card.setSide('front');
            card.animateTo({
                delay: 0,
                duration: 0,
                rot: Math.floor(Math.random() * 10) - 5,
            });
        }
    }
}

function winnerOfSinglePlay(cardsPlayed, trumpSuit) {
    var winner = cardsPlayed[0].name;
    var winningCard = cardsPlayed[0].card;
    for (var i = 1; i < cardsPlayed.length; i++) {
        var wins = false;
        var currentCard = cardsPlayed[i].card;
        if (winningCard.suit == trumpSuit) {
            // has to be bigger trump to win
            wins = currentCard.suit == trumpSuit && currentCard.rank > winningCard.rank;
        } else if (currentCard.suit == trumpSuit) {
            // wins with any trump
            wins = true;
        } else {
            // wins if greater rank of same suit
            wins = currentCard.suit == winningCard.suit && currentCard.rank > winningCard.rank;
        }
        if (wins) {
            winner = cardsPlayed[i].name;
            winningCard = currentCard;
        }
    }

    return winner;
}

function clearWonCards() {
    $('.cardWonCol').empty();
}

function showWonCards(myRound) {
    var deck = Deck();
    var playerCount = myRound.players.length;
    var cardCount = 0;
    for (var i = 0; i < myRound.cardsPlayed.length; i++) {
        var playedCards = myRound.cardsPlayed[i];
        if (playedCards.length == playerCount) {
            var winnerName = winnerOfSinglePlay(playedCards, myRound.trumpCard);
            var playerIndex = mapPlayerNameToTable(winnerName);
            var wonIndex = getNextFreeCardWonDiv(playerIndex);
            var $containerTo = document.getElementById('player'+playerIndex+'CardsWon'+wonIndex+'Div');
            for (var j = 0; j < playerCount; j++) {
                var card = deck.cards[cardCount];
                card.mount($containerTo);
                card.animateTo({
                    delay: 0,
                    duration: 0,
                    rot: Math.floor(Math.random() * 10) - 5,
                })
                cardCount++;
            }
        }
    }
}

function playRound(socket, myRound) {
    hideThinkings();
    hidePromise();
    $('#myInfoRow').show();
    if (isMyPlayTurn(myRound)) {
        showMyTurn();
        initCardsToPlay(socket, myRound);
    } else {
        showWhoIsPlaying(myRound);
        dimMyCards(myRound, 0.8);
    }
}

function getCardFromDiv(divStr) {
    var div = $('#' + divStr).children();
    if (div.length == 1) {
        var classStr = div[0].className;
        return classToCardMapper(classStr);
    }
    return null;
}


function getNextFreeCardWonDiv(playerIndex) {
    for (var i = 0; i < 10; i++) {
        if ($('#player'+playerIndex+'CardsWon'+i+'Div').children().length == 0) return i;
    }
    return 0;
}

async function moveCardFromTableToWinDeck(winnerName, players) {
    var deck = Deck();

    var playerIndex = mapPlayerNameToTable(winnerName);
    var wonIndex = getNextFreeCardWonDiv(playerIndex);
    var $containerTo = document.getElementById('player'+playerIndex+'CardsWon'+wonIndex+'Div');
    var containerToPosition = $('#player'+playerIndex+'CardsWon'+wonIndex+'Div').offset();

    var delay = 200;
    var duration = 1000;
    var movingCards = [];

    for (var i = 0; i < players.length; i++) {
        // var $containerFrom = document.getElementById('player'+i+'CardPlayedDiv');
        var containerFromPosition = $('#player'+i+'CardPlayedDiv').offset();
        var cardIndex = getCardIndex(deck.cards, getCardFromDiv('player'+i+'CardPlayedDiv'));
        movingCards[i] = deck.cards[cardIndex];
        $('#player'+i+'CardPlayedDiv').empty();
        
        movingCards[i].mount($containerTo);
        movingCards[i].animateTo({
            delay: 0,
            duration: 0,
            ease: 'quartOut',
            x: parseInt(containerFromPosition.left - containerToPosition.left, 10),
            y: parseInt(containerFromPosition.top - containerToPosition.top, 10),
            rot: Math.floor(Math.random() * 10) - 5,
            onComplete: function() {
                for (var j = 0; j < movingCards.length; j++) {
                    movingCards[j].animateTo({
                        delay: delay,
                        duration: duration,
                        ease: 'quartOut',
                        x: 0,
                        y: 0,
                        rot: Math.floor(Math.random() * 10) - 5,
                    });
                }
                
            }
        });
    }
    return new Promise(resolve => {
        setTimeout(resolve, (delay+duration+500));
    });

}

function getLastCardContainer(playerIndex) {
    for (var i = 9; i >= 0; i--) {
        if ($('#player'+playerIndex+'CardCol'+i).children().length > 0) return i;
    }
    return 0;
}

function getCurrentCardContainer(card) {
    var cardClassStr = cardToClassMapper(card);
    for (var i = 0; i < 10; i++) {
        if ($('#player0CardCol'+i).find(cardClassStr).length == 1) return i;
    }
    return 0;
}

async function moveCardFromHandToTable(card, playerName) {
    var deck = Deck();
    var cardIndex = getCardIndex(deck.cards, card);
    var movingCard = deck.cards[cardIndex];

    var playerIndex = mapPlayerNameToTable(playerName);
    var containerIndex = playerIndex == 0 ? getCurrentCardContainer(card) : getLastCardContainer(playerIndex);
    $('#player'+playerIndex+'CardCol'+containerIndex).empty();

    // var $containerFrom = document.getElementById('player'+playerIndex+'CardCol'+containerIndex);
    var $containerTo = document.getElementById('player'+playerIndex+'CardPlayedDiv');
    var containerFromPosition = $('#player'+playerIndex+'CardCol'+containerIndex).offset();
    var containerToPosition = $('#player'+playerIndex+'CardPlayedDiv').offset();

    var delay = 400;
    var duration = 1000;

    movingCard.mount($containerTo);
    movingCard.animateTo({
        delay: 0,
        duration: 0,
        ease: 'quartOut',
        x: parseInt(containerFromPosition.left - containerToPosition.left, 10),
        y: parseInt(containerFromPosition.top - containerToPosition.top, 10),
        rot: Math.floor(Math.random() * 10) - 5,
        onComplete: async function() {
            movingCard.setSide('front');
            movingCard.animateTo({
                delay: delay,
                duration: duration,
                ease: 'quartOut',
                x: 0,
                y: 0,
                rot: Math.floor(Math.random() * 10) - 5,
            });
        }
    });


    return new Promise(resolve => {
        setTimeout(resolve, (delay+duration+200));
    });

}

function createPromiseTable(promiseTable) {
    var node = $('#promiseTable');
    var table = $('<table></table>');
    var tableHeader = $('<thead></thead>');
    var tableHeaderRow = $('<tr></tr>');
    
    tableHeaderRow.append($('<th scope="col"></th>').addClass('promiseTableHeader'));
    for (var i = 0; i < promiseTable.rounds.length; i++) {
        var tableHeaderCol = $('<th scope="col" id="promiseTableHeader'+i+'"></th>').addClass('promiseTableHeader').html(promiseTable.rounds[i].cardsInRound);
        tableHeaderRow.append(tableHeaderCol);
    }
    tableHeader.append(tableHeaderRow);

    var tableBody = $('<tbody></tbody>');
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        var tableBodyRow = $('<tr></tr>');
        var playerNameCol = $('<th scope="row"></th>').addClass('promiseTableCol').html(promiseTable.players[i]);
        tableBodyRow.append(playerNameCol);
        for (var j = 0; j < promiseTable.rounds.length; j++) {
            var promiseCol = $('<td id="player'+i+'Prom'+j+'"></td>').addClass('promiseTableCol');
            tableBodyRow.append(promiseCol);
        }
        
        tableBody.append(tableBodyRow);
    }
    table.append(tableHeader);
    table.append(tableBody);

    node.append(table);
}

function initPromiseTable(promiseTable) {
    console.log('initPromiseTable');
    if ($('#promiseTable').children().length == 0) createPromiseTable(promiseTable);
    
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        for (var j = 0; j < promiseTable.rounds.length; j++) {
            var cardsInRound = promiseTable.rounds[j].cardsInRound;
            var totalPromise = promiseTable.rounds[j].totalPromise;
            if (totalPromise != null) {
                if (cardsInRound == totalPromise) {
                    $('#promiseTableHeader'+j).removeClass('promiseOver');
                    $('#promiseTableHeader'+j).removeClass('promiseUnder');
                    $('#promiseTableHeader'+j).addClass('promiseKept');
                    $('#promiseTableHeader'+j).tooltip({title: "Even"});
                } else if (cardsInRound < totalPromise) {
                    $('#promiseTableHeader'+j).removeClass('promiseKept');
                    $('#promiseTableHeader'+j).removeClass('promiseUnder');
                    $('#promiseTableHeader'+j).addClass('promiseOver');
                    $('#promiseTableHeader'+j).tooltip({title: "Over promised, total: " + totalPromise});
                } else {
                    $('#promiseTableHeader'+j).removeClass('promiseKept');
                    $('#promiseTableHeader'+j).removeClass('promiseOver');
                    $('#promiseTableHeader'+j).addClass('promiseUnder');
                    $('#promiseTableHeader'+j).tooltip({title: "Under promised, total: " + totalPromise});
                }
            }
            var promise = promiseTable.promisesByPlayers[i][j];
            var promiseStr = (promise != null) ? promise.promise : '&nbsp;';
            $('#player'+i+'Prom'+j).html(promiseStr);
            if (promise.points != null) {
                if (promise.keep == promise.promise) {
                    if (!$('#player'+i+'Prom'+j).hasClass('promiseKept')) $('#player'+i+'Prom'+j).addClass('promiseKept');
                } else if (promise.keep > promise.promise) {
                    if (!$('#player'+i+'Prom'+j).hasClass('promiseOver')) $('#player'+i+'Prom'+j).addClass('promiseOver');
                } else {
                    if (!$('#player'+i+'Prom'+j).hasClass('promiseUnder')) $('#player'+i+'Prom'+j).addClass('promiseUnder');
                }
            }
        }
    }
}


function createScoreboard(promiseTable) {
    var node = $('#scoreboard');
    var table = $('<table></table>');
    var tableHeader = $('<thead></thead>');
    var tableHeaderRow = $('<tr></tr>');
    
    for (var i = 0; i < promiseTable.players.length; i++) {
        var playerName = promiseTable.players[i];
        var playerShortName = playerName;
        if (playerShortName.length > 3) playerShortName = playerShortName.substring(0, 3);
        var tableHeaderCol = $('<th scope="col" data-toggle="tooltip" data-placement="left" title="'+playerName+'"></th>').addClass('scoreboardTableHeader').html(playerShortName);
        tableHeaderRow.append(tableHeaderCol);
    }
    tableHeader.append(tableHeaderRow);

    var tableBody = $('<tbody></tbody>');
    for (var i = 0; i < promiseTable.rounds.length; i++) {
        var tableBodyRow = $('<tr></tr>');
        for (var j = 0; j < promiseTable.players.length; j++) {
            var pointCol = $('<td id="player'+j+'Points'+i+'"></td>').addClass('scoreboardTableCol').html('&nbsp;');
            tableBodyRow.append(pointCol);
        }
        
        tableBody.append(tableBodyRow);
    }
    table.append(tableHeader);
    table.append(tableBody);

    node.append(table);
}


function initScoreBoard(promiseTable, gameOver) {
    if ($('#scoreboard').children().length == 0) createScoreboard(promiseTable);
    
    var totalPoints = [];
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        var playerPoints = 0;
        for (var j = 0; j < promiseTable.promisesByPlayers[i].length; j++) {
            var currentPoints = promiseTable.promisesByPlayers[i][j].points;
            if (currentPoints > 0) {
                playerPoints+= currentPoints;
                $('#player'+i+'Points'+j).html(playerPoints);
                if (!$('#player'+i+'Points'+j).hasClass('hasPoints')) $('#player'+i+'Points'+j).addClass('hasPoints')
            } else if (currentPoints == 0) {
                $('#player'+i+'Points'+j).html('-');
                if (!$('#player'+i+'Points'+j).hasClass('zeroPoints')) $('#player'+i+'Points'+j).addClass('zeroPoints')
            }
        }
        totalPoints.push(playerPoints);
    }

    if (gameOver) {
        console.log(totalPoints);
    }
    
}

function browserReload(myRound) {
    initCardTable(myRound);
    initOtherPlayers(myRound);
    initPromiseTable(myRound.promiseTable);
    initScoreBoard(myRound.promiseTable, myRound.gameOver);
    drawCards(myRound);
    showPlayedCards(myRound);
    showWonCards(myRound);
}


function appendToChat(text) {
    $('#chatTextArea').val($('#chatTextArea').val() +'\n'+ text);
    var textArea = document.getElementById('chatTextArea');
    textArea.scrollTop = textArea.scrollHeight;
}