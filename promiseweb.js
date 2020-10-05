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
        console.log('created game with id: '+createdGameId);
        gameId = createdGameId;
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
    if (totalComputers > 0) retStr+= ' (+'+totalComputers+')';
    return retStr;
}

function validateJoinGame(gameDetails) {
    return true;
}

function joinGame(socket, id) {
    //var socket = io();
    var gameDetails = { gameId: id,
        myName: $('#myName'+id).val(),
        myId: window.localStorage.getItem('uUID'),
        gamePassword: $('#password'+id).val(),
    };
    if (validateJoinGame(gameDetails)) {
        socket.emit('join game', gameDetails, function (response) {
            console.log(response);
            if (response == 'OK') {
                // var $container = document.getElementById('gameTable');
                // var deck = Deck();
                // deck.mount($container);

                // deck.cards.forEach(function (card, i) {
                //     card.setSide('front')
                    
                //     // explode
                //     card.animateTo({
                //         delay: 1000 + i * 2, // wait 1 second + i * 2 ms
                //         duration: 500,
                //         ease: 'quartOut',
                        
                //         x: Math.random() * window.innerWidth - window.innerWidth / 2,
                //         y: Math.random() * window.innerHeight - window.innerHeight / 2
                //     })
                // })
            }
        });
    }
}

function showGames(socket, gameList) {
    var gameListContainer = $('#joinGameCollapse');
    var firstId = '';
    gameList.forEach(function (game) {
        if (firstId ==  '') firstId = game.id;
        var gameContainerDiv = $('<div id="gameContainerDiv"'+ game.id +'>').addClass('row');
        gameContainerDiv.append($('<div>').addClass('col-2').text(game.startRound + '-' + game.turnRound + '-' + game.endRound));
        gameContainerDiv.append($('<div id="gamePlayers' + game.id + '">').addClass('col-3').text(gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount)));
        gameContainerDiv.append(($('<div>').addClass('col-3').append($('<input type="text" id="myName'+game.id+'">'))));
        gameContainerDiv.append(($('<div>').addClass('col-3').append($('<input disabled type="text" id="password'+game.id+'">'))));
        var btnId = 'joinGameButton' + game.id;
        var joinGameButton = ($('<button id="'+btnId+'">').addClass('btn btn-primary').text('Join game'));
        gameContainerDiv.append(($('<div>').addClass('col-1')).append(joinGameButton));

        gameListContainer.append(gameContainerDiv);

        $('#'+btnId).on('click', function() {
            joinGame(socket, game.id);
        });

        console.log(game);
        if (firstId !==  '') $('#myName'+firstId).focus();

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
    drawOtherPlayerCards(deck, myRound.players, myRound.cardsInRound, cardsDrawn);

}

function drawOtherPlayerCards(deck, players, cardsInRound, cardsDrawn) {
    for (var i = 1; i < players.length; i++) {
        for (j = 0; j < cardsInRound; j++) {
            var $deckDiv = document.getElementById('player'+i+'CardCol'+j);
            for (d = 0; d < 52; d++) {
                if ($.inArray(d, cardsDrawn) == -1) {
                    var card = deck.cards[d];
                    cardsDrawn.push(d);
                    card.mount($deckDiv);
                    card.setSide('back');
                    break;
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
}

function drawMyCards(deck, myCards, cardsDrawn) {
    
    var myCardsRow = $('#myCardsRow');
    
    for (var i = 0; i < 10; i++) {
        myCardsRow.append(drawCardCol(i));
    }

    myCards.forEach(function (myCard, idx) {
        var $container = document.getElementById('myCardCol'+idx);
        var cardIndex = getCardIndex(deck.cards, myCard);
        var card = deck.cards[cardIndex];
        cardsDrawn.push(cardIndex);
        card.mount($container);
        card.setSide('front');
    });
}

function drawCardCol(idx) {
    var cardCol = $('<div id="myCardCol'+idx+'">&nbsp;</div>').addClass('col-1').addClass('cardCol').css({height: '25vh'});;
    return cardCol;
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

function initPlayTableFor3() {
    var row1= $('<div></div>').addClass('row');
    var col1 = $('<div id="player1TableDiv"></div>').addClass('col-5');
    var col2 = $('<div></div>').addClass('col-2');
    var col3 = $('<div id="player2TableDiv"></div>').addClass('col-5');
    var col4 = $('<div></div>').addClass('col-4');
    var col5 = $('<div id="player0TableDiv"></div>').addClass('col-4');
    var col6 = $('<div></div>').addClass('col-4');
    row1.append(col1);
    row1.append(col2);
    row1.append(col3);
    row1.append(col4);
    row1.append(col5);
    row1.append(col6);

    return row1;
}

function initMiddleTable(playerCount) {
    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col');

    var row11= $('<div></div>').addClass('row');
    var col11 = $('<div id="trumpDiv"></div>').addClass('col');
    row11.append(col11);
    col1.append(row11);

    if (playerCount == 3) col1.append(initPlayTableFor3());
    // if (playerCount == 4) col1.append(initPlayTableFor4());
    // if (playerCount == 5) col1.append(initPlayTableFor5());
    
    row1.append(col1);

    return row1;
}

function initPlayerTable(index, align) {
    var row1 = $('<div id="player'+index+'row"></div>').addClass('row');
    var col1 = $('<div id="player'+index+'NameCol"></div>').addClass('col-12');
    
    row1.append(col1);
    for (var i = 0; i < 12; i++) {
        row1.append($('<div id="player'+index+'CardCol'+i+'"></div>').addClass('col-1'));
    }

    if (align == 'left') {
        row1.append($('<div id="player'+index+'Promised"></div>').addClass('col-2'));
        row1.append($('<div id="player'+index+'Keeps"></div>').addClass('col-2'));
        row1.append($('<div id="player'+index+'WonDeck"></div>').addClass('col-8'));
    }
    if (align == 'right') {
        row1.append($('<div id="player'+index+'WonDeck"></div>').addClass('col-8'));
        row1.append($('<div id="player'+index+'Promised"></div>').addClass('col-2'));
        row1.append($('<div id="player'+index+'Keeps"></div>').addClass('col-2'));
    }

    return row1;
}

function initTableFor3() {
    console.log('initTableFor3');
    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-4').css({height: '55vh'});
    col1.append(initPlayerTable(1, 'left'));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initMiddleTable(3));
    var col3 = $('<div></div>').addClass('col-4').css({height: '55vh'});
    col3.append(initPlayerTable(2, 'right'));

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);
    return row1;
}

function initCardTable(myRound) {
    var node = $('#otherPlayers');
    node.html('');

    const playerCount = myRound.players.length;
    if (playerCount == 3) node.append(initTableFor3());
    // if (playerCount == 4) node.append(initTableFor4());
    // if (playerCount == 5) node.append(initTableFor5());
}

function initOtherPlayers(myRound) {
    myRound.players.forEach(function(player, idx) {
        if (!player.thisIsMe) {
            $('#player'+otherPlayerMapper(idx, myRound.players)+'NameCol').html(player.name);
        }
    });
}

function isMyPlayTurn(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.dealerPosition + 1; // next from dealer
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].promise == null) {
            // this is next player to promise
            console.log('isMyPromiseTurn: '+ myRound.players[chkPos].thisIsMe);
            return myRound.players[chkPos].thisIsMe;
        }
    }
    return false;
}

function isMyPromiseTurn(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var chkPos = i + myRound.dealerPosition + 1; // next from dealer
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].promise == null) {
            // this is next player to promise
            console.log('isMyPromiseTurn: '+ myRound.players[chkPos].thisIsMe);
            return myRound.players[chkPos].thisIsMe;
        }
    }
    return false;
}

function roundPromised(myRound) {
    
}

function initPromise(socket, myRound) {
    var node = $('#myPromiseCol');

    for (var i = 0; i < myRound.cardsInRound + 1; i++) {
        node.append($('<button id="makePromiseButton'+i+'" value="'+i+'"></button>').addClass('btn btn-primary').css({margin: '5px'}).text(i));
        $('#makePromiseButton'+i).on('click', function() {
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
    $('#myPromiseCol').html('');
}

function showPlayerPromises(myRound) {
    myRound.players.forEach(function (player, idx) {
        if (player.promise != null) {
            var tableIdx = otherPlayerMapper(idx, myRound.players);
            $('#player'+tableIdx+'Promised').html(player.promise);
        }
    });
}

function getPromise(socket, myRound) {
    if (isMyPromiseTurn(myRound)) {
        initPromise(socket, myRound);
    } else {
        hidePromise();
    }
    showPlayerPromises(myRound);
}