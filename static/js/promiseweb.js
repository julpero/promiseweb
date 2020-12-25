var avgStatsChart = null;
const avgStatsOptions = {
    backgroundColor: '#45a173',
    height: 145,
    chartArea: {width: '99%', height: 145},
    legend: { position: 'none' },
    hAxis: {
        textPosition: 'in',
    },
    vAxis: {
        textPosition: 'in',
        minValue: 0,
        title: '',
    },
};

var keepStatsChart = null;
const keepStatsOptions = {
    backgroundColor: '#45a173',
    height: 145,
    chartArea: {width: '99%', height: 145},
    legend: { position: 'none' },
    hAxis: {
        textPosition: 'in',
    },
    vAxis: {
        textPosition: 'in',
        minValue: 0,
        maxValue: 100,
        title: '',
    },
};

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
    drawMyCards(myRound, speedPromise);
    drawTrumpCard(myRound);
    drawOtherPlayerCards(myRound.players, myRound.cardsInRound, myRound.cardsPlayed);
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

function drawOtherPlayerCards(players, cardsInRound, cardsPlayed) {
    for (var i = 0; i < players.length; i++) {
        var deck = Deck();
        if (!players[i].thisIsMe) {
            var playerName = players[i].name;
            var tableIndex = otherPlayerMapper(i, players);
            for (j = 0; j < cardsInRound - playerHasPlayedCards(playerName, cardsPlayed); j++) {
                var $deckDiv = document.getElementById('player'+tableIndex+'CardCol'+j);
                var card = deck.cards[j];
                card.mount($deckDiv);
                card.setSide('back');
                card.animateTo({
                    x: randomNegToPos(2),
                    y: randomNegToPos(2),
                    delay: 0,
                    duration: 0,
                    rot: randomNegToPos(5),
                });
            }
        }
    }
}

function revealTrumpCard(trumpCard) {
    $('#trumpDiv')[0].children[$('#trumpDiv')[0].children.length-1].remove();
    
    var $deckDiv = document.getElementById('trumpDiv');
    var deck = Deck();
    var cardIndex = getCardIndex(deck.cards, trumpCard);
    var card = deck.cards[cardIndex];
    card.mount($deckDiv);
    card.setSide('front');
    card.animateTo({
        x: randomNegToPos(2),
        y: randomNegToPos(2),
        delay: 0,
        duration: 0,
        rot: randomNegToPos(5)+15,
    });
}

function drawTrumpCard(myRound) {
    var trumpCard = myRound.trumpCard;
    var cardsToPlayers = myRound.players.length * myRound.cardsInRound;
    var $deckDiv = document.getElementById('trumpDiv');

    var dummyDeck = Deck();
    for (var i = 52; i > cardsToPlayers; i--) {
        var dummyCard = dummyDeck.cards[i-1];
        dummyCard.mount($deckDiv);
        dummyCard.animateTo({
            x: randomNegToPos(5),
            y: randomNegToPos(5),
            delay: 0,
            duration: 0,
            rot: randomNegToPos(5)-25,
        });
    }

    if (trumpCard != null) {
        revealTrumpCard(trumpCard);
    }
}

function drawMyCards(myRound, speedPromise) {
    var deck = Deck();
    if (speedPromise && myRound.myCards.length == 0) {
        for (var i = 0; i < myRound.cardsInRound; i++) {
            var $container = document.getElementById('player0CardCol'+i);
            var card = deck.cards[i];
            card.mount($container);
            card.setSide('back');
            card.animateTo({
                x: randomNegToPos(2),
                y: randomNegToPos(2),
                delay: 0,
                duration: 0,
                rot: randomNegToPos(5),
            });
        }
    } else {
        myRound.myCards.forEach(function (myCard, idx) {
            if (speedPromise) $('#player0CardCol'+idx).empty();
            var $container = document.getElementById('player0CardCol'+idx);
            var cardIndex = getCardIndex(deck.cards, myCard);
            var card = deck.cards[cardIndex];
            card.mount($container);
            card.setSide('front');
            card.animateTo({
                x: randomNegToPos(2),
                y: randomNegToPos(2),
                delay: 0,
                duration: 0,
                rot: randomNegToPos(5),
            });
        });    
    }
}

function mapPlayerNameToTable(name) {
    var divs = $('.playerNameCol').filter(function() {
        return $(this).text() === name;
    });
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
            return myRound.players[chkPos].thisIsMe;
        }
    }
    return false;
}

function showThinking(id) {
    $('#playerTable'+id).addClass('thinking-red-div');
}

function showMyTurn() {
    $('#playerTable0').addClass('thinking-green-div');
}

function hideThinkings() {
    $('#pulsingRow').remove();
    $('.thinking-red-div').removeClass('thinking-red-div');
    $('.thinking-green-div').removeClass('thinking-green-div');
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

function isEvenPromise(myRound, promise) {
    var totalPromise = 0;
    for (var i = 0; i < myRound.players.length; i++) {
        var player = myRound.players[i];
        if (!player.thisIsMe && player.promise == null) return false;
        if (player.promise != null) totalPromise+= player.promise;
    }
    return totalPromise + promise == myRound.cardsInRound;
}

function speedPromiseTimerTick(speedPromiseValue) {
    if (speedPromiseValue == 1) return promiseBonusTickTime;
    if (speedPromiseValue == 0) return promiseNormalTickTime;
    return promisePenaltyTickTime;
}

function mySpeedPromisePoints(myRound) {
    for (var i = 0; i < myRound.players.length; i++) {
        var player = myRound.players[i];
        if (player.thisIsMe) return player.speedPromisePoints;
    }
    return null;
}

function makeSpeedPromise(speedPromiseObj) {
    socket.emit('speedpromise', speedPromiseObj, function (resultObj) {
        if (resultObj.speedOk) {
            $('.validPromiseButton').prop('disabled', false);
            if (resultObj.fullSpeedPromises) {
                // now player already get maximum thinking penalty
            } else {
                // start next thinking timer
                initSpeedPromiseTimer(resultObj.round);
            }
        } else {
            alert('Oops, something went wrong... Please refesh this page.\n\n'+resultObj.debug);
            console.log(resultObj);
        }
    });
}

function speedPromiser(myRound) {
    usedTime = parseInt(window.localStorage.getItem('usedTime'), 10);
    usedTime+= intervalTime;
    window.localStorage.setItem('usedTime', usedTime);
    if (usedTime > timerTime) {
        $('.validPromiseButton').prop('disabled', true);
        deleteIntervaller();
        console.log('SPEEDPROMISE!');
        var speedPromiseObj = {
            gameId: myRound.gameId,
            roundInd: myRound.roundInd,
            myId: window.localStorage.getItem('uUID'),
        }
        makeSpeedPromise(speedPromiseObj);
    } else {
        drawSpeedBar(timerTime, timerTime-usedTime);
    }
}

function initSpeedPromiseTimer(myRound) {
    timerTime = speedPromiseTimerTick(mySpeedPromisePoints(myRound));
    console.log('timerTime (s): ', timerTime/1000);
    usedTime = window.localStorage.getItem('usedTime');
    if (usedTime == null) {
        usedTime = 0;
        window.localStorage.setItem('usedTime', usedTime);
    } else {
        usedTime = parseInt(usedTime, 10);
    }
    drawSpeedBar(timerTime, timerTime-usedTime);
    intervaller = setInterval(speedPromiser, intervalTime, myRound);
}

function initPromise(myRound, evenPromisesAllowed, speedPromise) {
    $('#myPromiseCol').empty();
    var node = $('#myPromiseCol');

    for (var i = 0; i < myRound.cardsInRound + 1; i++) {
        var promiseButton = $('<button id="makePromiseButton'+i+'" value="'+i+'"></button>').addClass('btn btn-primary makePromiseButton').text(i);
        node.append(promiseButton);
        if (evenPromisesAllowed || !isEvenPromise(myRound, i)) {
            promiseButton.addClass(' validPromiseButton');
            promiseButton.prop('disabled', false);
            $('#makePromiseButton'+i).on('click', function() {
                deleteIntervaller();
                $('.makePromiseButton').off('click');
                $('.validPromiseButton').prop('disabled', true);
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
        } else {
            promiseButton.addClass('disabled');
            promiseButton.prop('disabled', true);
        }
    }

    $('#myPromiseRow').show();

    if (speedPromise && mySpeedPromisePoints(myRound) > -10) {
        drawMyCards(myRound, speedPromise);
        initSpeedPromiseTimer(myRound);
    }
}

function hidePromise() {
    $('#myPromiseRow').hide();
    $('#myPromiseCol').empty();
}

function drawSpeedBar(max, now) {
    var progressMain = $('#speedProgressBar');
    progressMain.empty();
    var width = (now/max)*100;
    var classStr = "bg-success";
    if (width < 60 && width > 35) {
        classStr = "bg-info";
    } else if (width <= 35 && width > 15) {
        classStr = "bg-warning";
    } else if (width <= 15) {
        classStr = "bg-danger";
    }

    var progressBar = $('<div></div>').addClass('progress-bar '+classStr).css({width: width+"%"});
    progressMain.append(progressBar);
}

function drawPromiseAsProgress(max, promise, keep) {
    var progressMain = $('<div></div>').addClass('progress').css({marginTop: "4px", border: "1px solid black"});
    if (promise == keep) {
        var width = (promise/max)*100;
        var progressBar = $('<div></div>').addClass('progress-bar bg-success').css({width: width+"%"});
        progressMain.append(progressBar);
    }
    if (promise < keep) {
        var widthPromise = (promise/max)*100;
        var widthOver = ((keep-promise)/max)*100;
        var progressBarPromise = $('<div></div>').addClass('progress-bar bg-success').css({width: widthPromise+"%"});
        var progressBarOver = $('<div></div>').addClass('progress-bar bg-danger').css({width: widthOver+"%"});
        progressMain.append(progressBarPromise);
        progressMain.append(progressBarOver);
    }
    if (promise > keep) {
        var widthKeep = (keep/max)*100;
        var widthRemaining = ((promise-keep)/max)*100;
        var progressBarKeep = $('<div></div>').addClass('progress-bar bg-success').css({width: widthKeep+"%"});
        var progressBarRemaining = $('<div></div>').addClass('progress-bar bg-secondary').css({width: widthRemaining+"%"});
        progressMain.append(progressBarKeep);
        progressMain.append(progressBarRemaining);
    }

    return progressMain;
}

function showPlayerPromises(myRound, showPromise, showSpeedPromise) {
    myRound.players.forEach(function (player, idx) {
        var tableIdx = otherPlayerMapper(idx, myRound.players);
        if (player.promise != null) {
            $('#player'+tableIdx+'Keeps').html('k: '+player.keeps);
            var speedPromiseStr = showSpeedPromise ? ' ('+(player.speedPromisePoints == 1 ? '+' : player.speedPromisePoints)+')' : '';
            if (!showPromise && tableIdx != 0) {
                if (showSpeedPromise) $('#player'+tableIdx+'Promised').html('p: '+speedPromiseStr);
                return;
            }

            $('#player'+tableIdx+'Promised').html('p: '+player.promise+speedPromiseStr);
            if (player.promise == player.keeps) {
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseOver');
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseUnder');
                $('#player'+tableIdx+'Keeps').addClass('gamePromiseKeeping');
            }
            if (player.promise < player.keeps) {
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseKeeping');
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseUnder');
                $('#player'+tableIdx+'Keeps').addClass('gamePromiseOver');
            }
            if (player.promise > player.keeps) {
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseKeeping');
                $('#player'+tableIdx+'Keeps').removeClass('gamePromiseOver');
                $('#player'+tableIdx+'Keeps').addClass('gamePromiseUnder');
            }
            $('#player'+tableIdx+'ProgressBar').empty();
            $('#player'+tableIdx+'ProgressBar').append(drawPromiseAsProgress(myRound.cardsInRound, player.promise, player.keeps));
            
        } else {
            $('#player'+tableIdx+'Promised').empty();
            $('#player'+tableIdx+'Keeps').empty();
        }
    });
    initPromiseTable(myRound.promiseTable);
}

function showCardValues(handValues) {
    handValues.forEach(function(handValue) {
        console.log(handValue);
        var index = mapPlayerNameToTable(handValue.name);
        $('#player'+index+'StatsCol1').text('hv: '+handValue.cardValues);
    });
}

function hideCardValues() {
    $('.hand-value-col').empty();
}

function getPromise(myRound, evenPromisesAllowed, speedPromise, opponentPromiseCardValue) {
    checkSmall(myRound.players.length);
    hideThinkings();
    showDealer(myRound);
    if (opponentPromiseCardValue) showCardValues(myRound.handValues);
    if (isMyPromiseTurn(myRound)) {
        showMyTurn();
        initPromise(myRound, evenPromisesAllowed, speedPromise);
        dimMyCards(myRound, 1.0);
    } else {
        hidePromise();
        showWhoIsPromising(myRound);
        dimMyCards(myRound, 0.7);
    }
    showLiveStats(myRound);
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

function showPromisesNow(gameInfo, myRound) {
    if (gameInfo.onlyTotalPromise) return false;
    if (!gameInfo.visiblePromiseRound) {
        return roundPromised(myRound);
    }
    return true;
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

    classes = classStr.split(/\./);
    if (classes[2] && classes[3]) {
        return {
            suit: classes[2],
            rank: rankCard(parseInt(classes[3].substring(4), 10)),
        }
    }
    return null;
}

function usedTimeOk(usedTime) {
    if (usedTime == null || usedTime == undefined || usedTime === '') {
        return false;
    }
    return true;
}

function deleteIntervaller() {
    if (intervaller != null) clearInterval(intervaller);
    window.localStorage.removeItem('usedTime');
    timerTime = null;
    usedTime = null;
    $('#speedProgressBar').empty();
}

function initCardEvents(myRound, onlySuit) {
    var cardsAbleToPlay = 0;
    possibleCards = [];
    for (var i = 0; i < myRound.myCards.length; i++) {
        var cardMapperStr = cardToClassMapper(myRound.myCards[i]);
        if (onlySuit == null || myRound.myCards[i].suit == onlySuit) {
            // activate this card / div
            cardsAbleToPlay++;
            possibleCards.push(cardMapperStr);
            // console.log('activate this card / div: ' + myRound.myCards[i].suit + ' ' + myRound.myCards[i].rank);
            // console.log(' mapped to: ' + cardMapperStr);
            $(cardMapperStr+' ').animate({backgroundColor: "#ffffff"}, 300);
            $(cardMapperStr).on('click touchstart', function () {
                $('.card').off('click touchstart');
                deleteIntervaller();

                var card = classToCardMapper(this.className);
                var playDetails = { gameId: myRound.gameId,
                    roundInd: myRound.roundInd,
                    myId: window.localStorage.getItem('uUID'),
                    playedCard: card,
                };
                socket.emit('play card', playDetails, function (playReturn) {
                    // this is now disabled on server side
                    console.log('playReturn:');
                    console.log(playReturn);
                });
            });
        } else {
            // fade this card
            $(cardMapperStr+' ').animate({backgroundColor: "#bbbbbb"}, 300);
        }
    }
    return cardsAbleToPlay;
}

function dimMyCards(myRound, visibility) {
    var bgColor = "ffffff";
    switch (visibility) {
        case 1.0: bgColor = "ffffff"; break;
        case 0.8: bgColor = "dddddd"; break;
        case 0.7: bgColor = "cccccc"; break;
        case 0.6: bgColor = "bbbbbb"; break;
        default: break;
    }
    for (var i = 0; i < myRound.myCards.length; i++) {
        var cardMapperStr = cardToClassMapper(myRound.myCards[i]);
        $(cardMapperStr+' ').animate({backgroundColor: "#"+bgColor}, 400);
    }
}

function initCardsToPlay(myRound, freeTrump) {
    if (amIStarterOfPlay(myRound)) {
        // i can play any card i want
        return initCardEvents(myRound);
    } else if (!iHaveSuitInMyHand(myRound.cardInCharge.suit, myRound.myCards)) {
        if (freeTrump) {
            return initCardEvents(myRound);
        } else {
            if (iHaveSuitInMyHand(myRound.trumpCard.suit, myRound.myCards)) {
                // i have to play trump card
                return initCardEvents(myRound, myRound.trumpCard.suit);
            } else {
                return initCardEvents(myRound);
            }
        }
    } else {
        // i can play only suit of card in charge
        return initCardEvents(myRound, myRound.cardInCharge.suit);
    }    
}

function highlightWinningCard(myRound) {
    var playedCards = myRound.cardsPlayed[myRound.cardsPlayed.length-1]; // last is current
    if (playedCards.length == 0) return;

    var winnerName = myRound.playerGoingToWinThisPlay ?? winnerOfSinglePlay(playedCards, myRound.trumpCard.suit);

    for (var i = 0; i < playedCards.length; i++) {
        var playerIndex = mapPlayerNameToTable(playedCards[i].name);
        
        var cardPlayedDivs = $('#player'+playerIndex+'CardPlayedDiv').children();
        if (cardPlayedDivs.length == 1) {
            var cardPlayedDiv = cardPlayedDivs[0];
            if (i == 0) {
                $(cardPlayedDiv).addClass('charge-black-div');
            } else if (playedCards[i].name == winnerName) {
                $(cardPlayedDiv).addClass('winning-yellow-div');
            } else {
                $(cardPlayedDiv).removeClass('winning-yellow-div');
            }
        }
    }
}

function showPlayedCards(myRound) {
    var deck = Deck();
    var dummyDeck = Deck();
    const playedCards = myRound.cardsPlayed[myRound.cardsPlayed.length-1]; // last is current
    if (playedCards.length == 0) return;

    const winnerName = myRound.playerGoingToWinThisPlay ?? winnerOfSinglePlay(playedCards, myRound.trumpCard.suit);
    var dummyCardIndex = 0;

    for (var i = 0; i < playedCards.length; i++) {
        const playerIndex = mapPlayerNameToTable(playedCards[i].name);
        const cardPlayed = playedCards[i].card;
        
        var $container = document.getElementById('player'+playerIndex+'CardPlayedDiv');
        const cardIndex = cardPlayed.suit == 'dummy' ? dummyCardIndex++ : getCardIndex(deck.cards, cardPlayed);
        var card = cardPlayed.suit == 'dummy' ? dummyDeck.cards[cardIndex] :  deck.cards[cardIndex];
        card.mount($container);
        cardPlayed.suit == 'dummy' ? card.setSide('back') : card.setSide('front');
        card.animateTo({
            x: randomNegToPos(2),
            y: randomNegToPos(2),
            delay: 0,
            duration: 0,
            rot: randomNegToPos(5),
        });

        if (i == 0) {
            // starter, lets highlight starter card
            var cardPlayedDivs = $('#player'+playerIndex+'CardPlayedDiv').children();
            if (cardPlayedDivs.length == 1) {
                var cardPlayedDiv = cardPlayedDivs[0];
                $(cardPlayedDiv).addClass('charge-black-div');
            }
        } else if (playedCards[i].name == winnerName) {
            var cardPlayedDivs = $('#player'+playerIndex+'CardPlayedDiv').children();
            if (cardPlayedDivs.length == 1) {
                var cardPlayedDiv = cardPlayedDivs[0];
                $(cardPlayedDiv).addClass('winning-yellow-div');
            }
        }
    }
}

function showOnlyTotalPromiseInfo(round, show, players) {
    if (show) {
        $("#totalPromiseInfo").empty();
        var keptSoFar = 0;
        players.forEach(function (player) {
            keptSoFar+= player.keeps;
        });
        $("#totalPromiseInfo").text('Promised total: ' + round.totalPromise + '/' + round.cardsInRound + ' (' + keptSoFar + ')');
    } else {
        $("#totalPromiseInfo").empty();
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
            var winnerName = myRound.playerGoingToWinThisPlay ?? winnerOfSinglePlay(playedCards, myRound.trumpCard.suit);
            var playerIndex = mapPlayerNameToTable(winnerName);
            var wonIndex = getNextFreeCardWonDiv(playerIndex);
            var $containerTo = document.getElementById('player'+playerIndex+'CardsWon'+wonIndex+'Div');
            for (var j = 0; j < playerCount; j++) {
                var card = deck.cards[cardCount];
                card.mount($containerTo);
                card.animateTo({
                    x: randomNegToPos(2),
                    y: randomNegToPos(2),
                    delay: 0,
                    duration: 0,
                    rot: randomNegToPos(5),
                })
                cardCount++;
            }
        }
    }
}

function showDealer(myRound) {
    $('.dealer').removeClass('dealer');
    var indInTable = otherPlayerMapper(myRound.dealerPositionIndex, myRound.players);
    $('#player'+indInTable+'NameCol').addClass('dealer');
}

function playSpeedGamerCard(myRound) {
    if (possibleCards.length > 0) {
        var randomIndex = Math.floor(Math.random() * possibleCards.length);
        var className = possibleCards[randomIndex];
        console.log(className);

        var card = classToCardMapper(className);
        console.log(card);
        var playDetails = { gameId: myRound.gameId,
            roundInd: myRound.roundInd,
            myId: window.localStorage.getItem('uUID'),
            playedCard: card,
        };
        socket.emit('play card', playDetails, function (playReturn) {
            // this is now disabled on server side
            console.log('playReturn:');
            console.log(playReturn);
        });
    } else {
        possibleCards = [];
    }
}

function privateSpeedGamer(myRound) {
    if (!usedTimeOk(timerTime) || isNaN(timerTime)) {
        alert('Oops... Something wrong with timerTime (privateSpeedGamer), please reload browser...\n\n'+timerTime);
    }
    usedTime = parseInt(window.localStorage.getItem('usedTime'), 10);
    if (!usedTimeOk(usedTime) || isNaN(usedTime)) {
        alert('Oops... Something wrong with usedTime (privateSpeedGamer), please reload browser...\n\n'+usedTime);
    }
    usedTime+= intervalTime;
    window.localStorage.setItem('usedTime', usedTime);
    if (usedTime > timerTime) {
        $('.card').off('click touchstart');
        deleteIntervaller();
        console.log('PLAY!');
        playSpeedGamerCard(myRound);
    } else {
        drawSpeedBar(timerTime, timerTime-usedTime);
    }
}

function initPrivateSpeedTimer(cardsAbleToPlay, myRound) {
    timerTime = Math.min(Math.max(cardsAbleToPlay * 1500, 4000), Math.max(myRound.cardsInRound * 800, 4000));
    if (!usedTimeOk(timerTime) || isNaN(timerTime)) {
        alert('Oops... Something wrong with timerTime (initPrivateSpeedTimer), please reload browser...\n\n'+timerTime);
    }
    console.log('timerTime (s): ', timerTime/1000);
    usedTime = window.localStorage.getItem('usedTime');
    if (!usedTimeOk(usedTime)) {
        usedTime = 0;
        window.localStorage.setItem('usedTime', usedTime);
    } else {
        usedTime = parseInt(usedTime, 10);
        if (!usedTimeOk(usedTime) || isNaN(usedTime)) {
            alert('Oops... Something wrong with usedTime (initPrivateSpeedTimer), please reload browser...\n\n'+usedTime);
        }
    }
    drawSpeedBar(timerTime, timerTime-usedTime);
    intervaller = setInterval(privateSpeedGamer, intervalTime, myRound);
}

function findMinMaxPoints(arr) {
    let min = arr[0].avgPoints, max = arr[0].avgPoints;
  
    for (let i = 1, len=arr.length; i < len; i++) {
        let v = arr[i].avgPoints;
        min = (v < min) ? v : min;
        max = (v > max) ? v : max;
    }
    return [min, max];
}

function showPlayersAvgPointsStats(playerKeeps, playersEqualKeeps) {
    const reportColName = 'avgPointsStats';
    var reportDataArr = [['Player', 'Avg points in all previous rounds', {type: "string", role: "tooltip"}, 'Avg points in equal previous rounds', {type: "string", role: "tooltip"}]];
    for (var i = 0; i < playerKeeps.length; i++) {
        if (Object.keys(playerKeeps[i]).length <= 1) {
            reportDataArr.push([playerKeeps[i]._id, 0, '', 0, '']);
        } else {
            const avgPoints = playerKeeps[i].avgPoints;
            const avgPointsTooltip = 'average of '+ playerKeeps[i].avgPoints.toFixed(2) +' points\nin all previous '+ playerKeeps[i].total +' rounds';
            const equalAvgPoints = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? playersEqualKeeps[i].avgPoints : 0;
            const equalAvgPointsTooltip = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? 'average of '+ (equalAvgPoints).toFixed(2) +' points\nin all equal previous '+ playersEqualKeeps[i].total +' rounds' : 'no equal data yet';
            reportDataArr.push([playerKeeps[i]._id, avgPoints, avgPointsTooltip, equalAvgPoints, equalAvgPointsTooltip]);
        }
    }
    
    const avgStatsReportData = new google.visualization.arrayToDataTable(reportDataArr);

    avgStatsChart = new google.visualization.ColumnChart(document.getElementById(reportColName));
    avgStatsChart.draw(avgStatsReportData, avgStatsOptions);
}

function updatePlayersAvgPointsStats(playerKeeps, playersEqualKeeps) {
    var reportDataArr = [['Player', 'Avg points in all previous rounds', {type: "string", role: "tooltip"}, 'Avg points in equal previous rounds', {type: "string", role: "tooltip"}]];
    for (var i = 0; i < playerKeeps.length; i++) {
        if (Object.keys(playerKeeps[i]).length <= 1) {
            reportDataArr.push([playerKeeps[i]._id, 0, '', 0, '']);
        } else {
            const avgPoints = playerKeeps[i].avgPoints;
            const avgPointsTooltip = 'average of '+ playerKeeps[i].avgPoints.toFixed(2) +' points\nin all previous '+ playerKeeps[i].total +' rounds';
            const equalAvgPoints = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? playersEqualKeeps[i].avgPoints : 0;
            const equalAvgPointsTooltip = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? 'average of '+ (equalAvgPoints).toFixed(2) +' points\nin all equal previous '+ playersEqualKeeps[i].total +' rounds' : 'no equal data yet';
            reportDataArr.push([playerKeeps[i]._id, avgPoints, avgPointsTooltip, equalAvgPoints, equalAvgPointsTooltip]);
        }
    }

    const avgStatsReportData = new google.visualization.arrayToDataTable(reportDataArr);
    avgStatsChart.draw(avgStatsReportData, avgStatsOptions);
}

function showPlayersKeepPercentStats(playerKeeps, playersEqualKeeps) {
    const reportColName = 'keepPercentStats';
    var reportDataArr = [['Player', 'Keep percent in previous rounds', {type: "string", role: "tooltip"}, 'Keep percent in previous equal rounds', {type: "string", role: "tooltip"}]];
    for (var i = 0; i < playerKeeps.length; i++) {
        if (Object.keys(playerKeeps[i]).length <= 1) {
            reportDataArr.push([playerKeeps[i]._id, 0, '', 0, '']);
        } else {
            const keepPercentage = 100 * (playerKeeps[i].keeps/playerKeeps[i].total);
            const keepPercentageTooltip = 'keep percentage '+ (keepPercentage).toFixed(1) +'%\nin all previous '+ playerKeeps[i].total +' rounds';
            const keepEqualPercentage = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? 100 * (playersEqualKeeps[i].keeps/playersEqualKeeps[i].total) : 0;
            const keepEqualPercentageTooltip = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? 'keep percentage '+ (keepEqualPercentage).toFixed(1) +'%\nin all equal previous '+ playersEqualKeeps[i].total +' rounds' : 'no equal data yet';
            reportDataArr.push([playerKeeps[i]._id, keepPercentage, keepPercentageTooltip, keepEqualPercentage, keepEqualPercentageTooltip]);
        }
    }
    
    const keepsStatsReportData = new google.visualization.arrayToDataTable(reportDataArr);

    keepStatsChart = new google.visualization.ColumnChart(document.getElementById(reportColName));
    keepStatsChart.draw(keepsStatsReportData, keepStatsOptions);
}

function updatePlayersKeepPercentStats(playerKeeps, playersEqualKeeps) {
    var reportDataArr = [['Player', 'Keep percent in previous rounds', {type: "string", role: "tooltip"}, 'Keep percent in previous equal rounds', {type: "string", role: "tooltip"}]];
    for (var i = 0; i < playerKeeps.length; i++) {
        if (Object.keys(playerKeeps[i]).length <= 1) {
            reportDataArr.push([playerKeeps[i]._id, 0, '', 0, '']);
        } else {
            const keepPercentage = 100 * (playerKeeps[i].keeps/playerKeeps[i].total);
            const keepPercentageTooltip = 'keep percentage '+ (keepPercentage).toFixed(1) +'%\nin all previous '+ playerKeeps[i].total +' rounds';
            const keepEqualPercentage = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? 100 * (playersEqualKeeps[i].keeps/playersEqualKeeps[i].total) : 0;
            const keepEqualPercentageTooltip = playersEqualKeeps != null && playersEqualKeeps[i] != null && playersEqualKeeps[i].total > 0 ? 'keep percentage '+ (keepEqualPercentage).toFixed(1) +'%\nin all equal previous '+ playersEqualKeeps[i].total +' rounds' : 'no equal data yet';
            reportDataArr.push([playerKeeps[i]._id, keepPercentage, keepPercentageTooltip, keepEqualPercentage, keepEqualPercentageTooltip]);
        }
    }
    
    const keepsStatsReportData = new google.visualization.arrayToDataTable(reportDataArr);
    keepStatsChart.draw(keepsStatsReportData, keepStatsOptions);
}

function showPlayerAvgPoints(playerInd, playerAvgPoints, min, max) {
    const reportColName = 'player'+playerInd+'StatsCol2';
    $('#'+reportColName).text('avg: '+playerAvgPoints.toFixed(2));
}

function showPlayerKeepPrecent(playerInd, keeps, total) {
    const reportColName = 'player'+playerInd+'StatsCol3';
    const keepPercent = 100 * (keeps / total);
    $('#'+reportColName).text('kp: '+keepPercent.toFixed(1)+'%');
}

function showPlayerKeepStats(playerKeeps) {
    const minMaxPoints = findMinMaxPoints(playerKeeps);
    const minAvgPoints = Math.min(0, minMaxPoints[0]);
    const maxAvgPoints = minMaxPoints[1];
    playerKeeps.forEach(function (playerKeep) {
        const playerInd = mapPlayerNameToTable(playerKeep._id);
        showPlayerAvgPoints(playerInd, playerKeep.avgPoints, minAvgPoints, maxAvgPoints);
        showPlayerKeepPrecent(playerInd, playerKeep.keeps, playerKeep.total);
    });
}

function showLiveStats(myRound) {
    if (myRound.statistics == null) return;
    if (myRound.statistics.playersKeeps != null) {
        //showPlayerKeepStats(myRound.statistics.playersKeeps);
        if (avgStatsChart == null) {
            showPlayersAvgPointsStats(myRound.statistics.playersKeeps, myRound.statistics.playersEqualKeeps);
        } else {
            updatePlayersAvgPointsStats(myRound.statistics.playersKeeps, myRound.statistics.playersEqualKeeps);
        }
        if (keepStatsChart == null) {
            showPlayersKeepPercentStats(myRound.statistics.playersKeeps, myRound.statistics.playersEqualKeeps);
        } else {
            updatePlayersKeepPercentStats(myRound.statistics.playersKeeps, myRound.statistics.playersEqualKeeps);
        }
    }
}

function playRound(myRound, freeTrump, privateSpeedGame, opponentGameCardValue) {
    checkSmall(myRound.players.length);
    hideThinkings();
    hidePromise();
    showDealer(myRound);
    highlightWinningCard(myRound);
    $('#myInfoRow').show();
    if (opponentGameCardValue) {
        showCardValues(myRound.handValues);
    } else {
        hideCardValues();
    }
    if (isMyPlayTurn(myRound)) {
        showMyTurn();
        var cardsAbleToPlay = initCardsToPlay(myRound, freeTrump);
        if (privateSpeedGame) initPrivateSpeedTimer(cardsAbleToPlay, myRound);
    } else {
        showWhoIsPlaying(myRound);
        dimMyCards(myRound, 0.8);
    }
    showLiveStats(myRound);
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

    var delay = 400;
    var duration = 900;
    var movingCards = [];

    for (var i = 0; i < players.length; i++) {
        var containerFromPosition = $('#player'+i+'CardPlayedDiv').offset();
        var cardToCheck = getCardFromDiv('player'+i+'CardPlayedDiv');
        if (cardToCheck == null) {
            continue;
        }
        var cardIndex = getCardIndex(deck.cards, cardToCheck);
        movingCards[i] = deck.cards[cardIndex];
        $('#player'+i+'CardPlayedDiv').empty();
        
        movingCards[i].mount($containerTo);
        movingCards[i].animateTo({
            delay: 0,
            duration: 0,
            ease: 'quartOut',
            x: parseInt(containerFromPosition.left - containerToPosition.left, 10),
            y: parseInt(containerFromPosition.top - containerToPosition.top, 10),
            rot: randomNegToPos(5),
            onComplete: async function() {
                for (var j = 0; j < movingCards.length; j++) {
                    movingCards[j].animateTo({
                        delay: delay,
                        duration: duration,
                        ease: 'quartOut',
                        x: randomNegToPos(2),
                        y: randomNegToPos(2),
                        rot: randomNegToPos(5),
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

async function moveCardFromHandToTable(card, playerName, cardsInThisPlay) {
    var deck = Deck();

    if (cardsInThisPlay != null)
    {
        for (var i = 0; i < cardsInThisPlay.length; i++) {
            if (playerName == cardsInThisPlay[i].name) continue;
    
            const thisPlayerIndex = mapPlayerNameToTable(cardsInThisPlay[i].name);
            var $thisContainerTo = document.getElementById('player'+thisPlayerIndex+'CardPlayedDiv');
            const cardToCheck = getCardFromDiv('player'+thisPlayerIndex+'CardPlayedDiv');
            if (cardToCheck == null || cardToCheck.suit != cardsInThisPlay[i].card.suit || cardToCheck.rank != cardsInThisPlay[i].card.rank) {
                $('#player'+thisPlayerIndex+'CardPlayedDiv').empty();
                const thisCardIndex = getCardIndex(deck.cards, cardsInThisPlay[i].card);
                const thisCard = deck.cards[thisCardIndex];
                thisCard.mount($thisContainerTo);
                thisCard.setSide('front');
            }
        }
    }

    const cardIndex = card.suit == "dummy" ? 0 : getCardIndex(deck.cards, card);
    const movingCard = deck.cards[cardIndex];

    const playerIndex = mapPlayerNameToTable(playerName);
    const containerIndex = playerIndex == 0 ? getCurrentCardContainer(card) : getLastCardContainer(playerIndex);
    $('#player'+playerIndex+'CardCol'+containerIndex).empty();

    // var $containerFrom = document.getElementById('player'+playerIndex+'CardCol'+containerIndex);
    var $containerTo = document.getElementById('player'+playerIndex+'CardPlayedDiv');
    const containerFromPosition = $('#player'+playerIndex+'CardCol'+containerIndex).offset();
    const containerToPosition = $('#player'+playerIndex+'CardPlayedDiv').offset();

    const delay = (cardsInThisPlay != null) ? 1700 : 300;
    const duration = (cardsInThisPlay != null) ? 1200 : 800;

    movingCard.mount($containerTo);
    movingCard.setSide('back');
    movingCard.animateTo({
        delay: 0,
        duration: 0,
        ease: 'quartOut',
        x: parseInt(containerFromPosition.left - containerToPosition.left, 10),
        y: parseInt(containerFromPosition.top - containerToPosition.top, 10),
        rot: randomNegToPos(5),
        onComplete: async function() {
            if (card.suit != "dummy") movingCard.setSide('front');
            movingCard.animateTo({
                delay: delay,
                duration: duration,
                ease: 'quartOut',
                x: randomNegToPos(2),
                y: randomNegToPos(2),
                rot: randomNegToPos(5),
            });
        }
    });

    return new Promise(resolve => {
        setTimeout(resolve, (delay+duration+500));
    });
}

function initPromiseTable(promiseTable) {
    console.log('initPromiseTable');
    if ($('#promiseTable').children().length == 0) createPromiseTable(promiseTable);

    $('.promiseTableHeader').tooltip('dispose');
    $('.playerPromiseCol').tooltip('dispose');
    $('.playerPromiseNameCol').tooltip('dispose');
    
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        var playerKept = 0;
        var playerOver = 0;
        var playerUnder = 0;
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
                    $('#promiseTableHeader'+j).tooltip({title: "Over promised, total: " + totalPromise + "/" + cardsInRound});
                } else {
                    $('#promiseTableHeader'+j).removeClass('promiseKept');
                    $('#promiseTableHeader'+j).removeClass('promiseOver');
                    $('#promiseTableHeader'+j).addClass('promiseUnder');
                    $('#promiseTableHeader'+j).tooltip({title: "Under promised, total: " + totalPromise + "/" + cardsInRound});
                }
            }
            var promise = promiseTable.promisesByPlayers[i][j];
            var speedPromiseStr = promise.speedPromisePoints != null && promise.speedPromisePoints != 0 ? (promise.speedPromisePoints == 1 ? '+' : promise.speedPromisePoints) : '';
            var promiseStr = (promise != null) ? promise.promise : '&nbsp;';
            $('#player'+i+'Prom'+j).html(promiseStr);
            if (promise.points != null) {
                var tooltipStr = "";
                if (promise.keep == promise.promise) {
                    $('#player'+i+'Prom'+j).addClass('promiseKept');
                    playerKept++;
                } else if (promise.keep > promise.promise) {
                    $('#player'+i+'Prom'+j).addClass('promiseOver');
                    tooltipStr = 'won: ' + promise.keep + '/' + promise.promise;
                    playerOver++;
                } else {
                    $('#player'+i+'Prom'+j).addClass('promiseUnder');
                    tooltipStr = 'won: ' + promise.keep + '/' + promise.promise;
                    playerUnder++;
                }
                if (speedPromiseStr != '') tooltipStr+= ' ('+speedPromiseStr+')';
                $('#player'+i+'Prom'+j).tooltip({title: tooltipStr});
            }
        }
        $('#player'+i+'PromiseName').tooltip({title: "kept: " + playerKept + " / over: " + playerOver + " / under: " + playerUnder});
    }
}

function initScoreBoard(promiseTable, gameOver) {
    if ($('#scoreboard').children().length == 0) createScoreboard(promiseTable);
    
    var totalPoints = [];
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        var playerPoints = 0;
        for (var j = 0; j < promiseTable.promisesByPlayers[i].length; j++) {
            var currentPoints = promiseTable.promisesByPlayers[i][j].points;
            if (currentPoints != null) {
                var speedPromisePoints = promiseTable.promisesByPlayers[i][j].speedPromisePoints;
                var speedPromiseTotal = promiseTable.promisesByPlayers[i][j].speedPromiseTotal;
                var tooltipStr = 'Total '+currentPoints;
                if (currentPoints != 0) {
                    playerPoints+= currentPoints;
                    $('#player'+i+'Points'+j).html(playerPoints);
                    $('#player'+i+'Points'+j).addClass('hasPoints')
                } else {
                    $('#player'+i+'Points'+j).html('-');
                    $('#player'+i+'Points'+j).addClass('zeroPoints')
                }
                if (speedPromisePoints == 1) {
                    $('#player'+i+'Points'+j).addClass('speedPromiseBonus');
                    tooltipStr+= (currentPoints > 0) ? ', including '+ speedPromiseTotal +' promise bonus' : ', missed promise bonus';
                } else if (speedPromisePoints < 0) {
                    $('#player'+i+'Points'+j).addClass('speedPromisePenalty');
                    tooltipStr+= ', including '+ speedPromiseTotal +' promise penalty'
                }
                $('#player'+i+'Points'+j).tooltip({title: tooltipStr});
            }
        }
        totalPoints.push(playerPoints);
    }

    if (gameOver) {
        console.log(totalPoints);
    }
}

function checkSmall(playerCount) {
    if (playerCount > 4) {
        $('html').addClass('html-sm');
        $('.cardCol').addClass('cardCol-sm');
    } else {
        $('.html-sm').removeClass('html-sm');
        $('.cardCol-sm').removeClass('cardCol-sm');
    }
}

function printPointStats(players) {
    if ($('#pointsStats').children().length > 0) return;

    const reportColName = 'pointsStats';
    var reportDataArr = [['Player', 'Points in previous games', {type: "string", role: "tooltip"}, 'Points in previous equal games', {type: "string", role: "tooltip"}]];
    for (var i = 0; i < players.length; i++) {
        const allGamesSum = players[i].playerStats.playersAllGames.reduce((a, b) => a + b, 0);
        const allGamesCount = players[i].playerStats.playersAllGames.length;
        const allGamesAvg = allGamesSum/allGamesCount;
        const equalGamesSum = players[i].playerStats.playersEqualGames.reduce((a, b) => a + b, 0);
        const equalGamesCount = players[i].playerStats.playersEqualGames.length;
        const equalGamesAvg = equalGamesSum/equalGamesCount;
        const allGamesTooltip = 'avg points  '+ (allGamesAvg).toFixed(1) +'\nin all previous '+ allGamesCount +' games';
        const equalGamesTooltip = 'avg points  '+ (equalGamesAvg).toFixed(1) +'\nin all previous '+ equalGamesCount +' equal games';
        reportDataArr.push([players[i].name, allGamesAvg, allGamesTooltip, equalGamesAvg, equalGamesTooltip]);
    }
    
    const pointStatsReportData = new google.visualization.arrayToDataTable(reportDataArr);
    const pointStatsOptions = {
        backgroundColor: '#45a173',
        height: 145,
        // theme: 'maximized',
        chartArea: {width: '99%', height: 145},
        legend: { position: 'none' },
        hAxis: {
            textPosition: 'in',
        },
        vAxis: {
            textPosition: 'in',
            minValue: 0,
            // maxValue: 100,
            title: '',
        },
    };
    
    var pointStatsChart = new google.visualization.ColumnChart(document.getElementById(reportColName));
    pointStatsChart.draw(pointStatsReportData, pointStatsOptions);

}

function browserReload(myRound, speedPromise) {
    initCardTable(myRound);
    initOtherPlayers(myRound);
    initPromiseTable(myRound.promiseTable);
    initScoreBoard(myRound.promiseTable, myRound.gameOver);
    drawCards(myRound, speedPromise);
    showPlayedCards(myRound);
    showWonCards(myRound);
    checkSmall(myRound.players.length);
    printPointStats(myRound.players)
}

function appendToChat(text) {
    $('#chatTextArea').val($('#chatTextArea').val() +'\n'+ text);
    var textArea = document.getElementById('chatTextArea');
    textArea.scrollTop = textArea.scrollHeight;
}

function randomNegToPos(max) {
    return Math.floor(Math.random() * (2*max)) - max;
}