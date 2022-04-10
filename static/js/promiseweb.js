// eslint-disable-next-line @typescript-eslint/no-unused-vars
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let rnd = window.crypto.getRandomValues(new Uint32Array(1))[0];
        let r = rnd * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
    let index = null;
    cards.forEach(function (card, idx) {
        if (suitToInt(myCard.suit) == card.suit && myCard.rank == (card.rank == 1 ? 14 : card.rank)) {
            index = idx;
            return;
        }
    });
    return index;
}

function getCurrentRoundInd() {
    const roundIndStr = document.getElementById('currentRoundInd').value;
    if (roundIndStr != '') return parseInt(roundIndStr, 10);
    return null;
}

function initOtherPlayers(myRound) {
    const bgColor = window.getComputedStyle(document.body, null).getPropertyValue("background-color");
    myRound.players.forEach(function(player, idx) {
        const playerNameDiv = document.getElementById('player'+otherPlayerMapper(idx, myRound.players)+'NameCol');
        playerNameDiv.innerText = player.name;
        const playerInfoRow = playerNameDiv.parentElement;
        playerInfoRow.style.backgroundImage = 'linear-gradient(90deg,  '+colorize(player.name)+', '+bgColor+')';
    });
}

function drawCards(myRound) {
    drawMyCards(myRound, speedPromise);
    drawTrumpCard(myRound);
    drawOtherPlayerCards(myRound.players, myRound.cardsInRound, myRound.cardsPlayed);
}

function playerHasPlayedCards(playerName, cardsPlayed) {
    let retVal = 0;
    for (let i = 0; i < cardsPlayed.length; i++) {
        for (let j = 0; j < cardsPlayed[i].length; j++) {
            if (cardsPlayed[i][j].name == playerName) retVal++;
        }
    }
    return retVal;
}

function drawOtherPlayerCards(players, cardsInRound, cardsPlayed) {
    for (let i = 0; i < players.length; i++) {
        const deck = Deck();
        if (!players[i].thisIsMe) {
            const playerName = players[i].name;
            const tableIndex = otherPlayerMapper(i, players);
            for (let j = 0; j < cardsInRound - playerHasPlayedCards(playerName, cardsPlayed); j++) {
                const $deckDiv = document.getElementById('player'+tableIndex+'CardCol'+j);
                const card = deck.cards[j];
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
    const trumpsInDeck = document.getElementById('trumpDiv').children.length;
    if (trumpsInDeck > 0) {
        document.getElementById('trumpDiv').children[trumpsInDeck-1].remove();
    }
    
    const $deckDiv = document.getElementById('trumpDiv');
    const deck = Deck();
    const cardIndex = getCardIndex(deck.cards, trumpCard);
    const card = deck.cards[cardIndex];
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
    const trumpCard = myRound.trumpCard;
    const cardsToPlayers = myRound.players.length * myRound.cardsInRound;
    const $deckDiv = document.getElementById('trumpDiv');

    const dummyDeck = Deck();
    for (let i = 52; i > cardsToPlayers; i--) {
        const dummyCard = dummyDeck.cards[i-1];
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
    const deck = Deck();
    if (speedPromise && myRound.myCards.length == 0) {
        for (let i = 0; i < myRound.cardsInRound; i++) {
            const $container = document.getElementById('player0CardCol'+i);
            const card = deck.cards[i];
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
            if (speedPromise) {
                emptyElementById('player0CardCol'+idx);
            }
            const $container = document.getElementById('player0CardCol'+idx);
            const cardIndex = getCardIndex(deck.cards, myCard);
            const card = deck.cards[cardIndex];
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
    const divs = Array.prototype.filter.call(document.querySelectorAll('div.playerNameCol'), (el) => {
        return el.textContent === name;
    });
    if (divs.length == 1) {
        const divId = divs[0].id;
        if (divId.length > 6) {
            const divIdNbrStr = divId.substring(6, 7);
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
    let me = 0;
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
    for (let i = 0; i < myRound.players.length; i++) {
        let chkPos = i + myRound.playerInCharge;
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
    for (let i = 0; i < myRound.players.length; i++) {
        let chkPos = i + myRound.dealerPositionIndex + 1; // next from dealer
        if (chkPos >= myRound.players.length) chkPos-= myRound.players.length;
        if (myRound.players[chkPos].promise == null) {
            // this is next player to promise
            return myRound.players[chkPos].thisIsMe;
        }
    }
    return false;
}

function showThinking(id) {
    document.getElementById('playerTable'+id).classList.add('thinking-red-div');
}

function showMyTurn() {
    document.getElementById('playerTable0').classList.add('thinking-green-div');
}

function hideThinkings() {
    removeElementById('pulsingRow');
    let redDivs = document.getElementsByClassName('thinking-red-div');
    Array.prototype.forEach.call(redDivs, function(el){
        el.classList.remove('thinking-red-div');
    });
    let greenDivs = document.getElementsByClassName('thinking-green-div');
    Array.prototype.forEach.call(greenDivs, function(el){
        el.classList.remove('thinking-green-div');
    });
}

function showWhoIsPromising(myRound) {
    for (let i = 0; i < myRound.players.length; i++) {
        let chkPos = i + myRound.dealerPositionIndex + 1; // next from dealer
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
    for (let i = 0; i < myRound.players.length; i++) {
        let chkPos = i + myRound.playerInCharge;
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
    for (let i = 0; i < myRound.players.length; i++) {
        if (myRound.players[i].promise == null) return false;
    }
    return true;
}

function isEvenPromise(myRound, promise) {
    let totalPromise = 0;
    for (let i = 0; i < myRound.players.length; i++) {
        const player = myRound.players[i];
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
    for (let i = 0; i < myRound.players.length; i++) {
        const player = myRound.players[i];
        if (player.thisIsMe) return player.speedPromisePoints;
    }
    return null;
}

function makeSpeedPromise(speedPromiseObj) {
    socket.emit('speedpromise', speedPromiseObj, function (resultObj) {
        if (resultObj.speedOk) {
            disableButtonsByClass('validPromiseButton', false);
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
        disableButtonsByClass('validPromiseButton', true);
        deleteIntervaller();
        console.log('SPEEDPROMISE!');
        const speedPromiseObj = {
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

function doPromise() {
    console.log('doPromise: '+this.value);
    deleteIntervaller();
    removeEventByClass('makePromiseButton', 'click', doPromise);
    disableButtonsByClass('validPromiseButton', true);
    const promiseDetails = {
        gameId: document.getElementById('currentGameId').value,
        roundInd: getCurrentRoundInd(),
        myId: window.localStorage.getItem('uUID'),
        promise: parseInt(this.value, 10),
    };
    socket.emit('make promise', promiseDetails, function (promiseReturn) {
        hidePromise();
        console.log('promiseReturn:');
        console.log(promiseReturn);
    });
}

function initPromise(myRound, evenPromisesAllowed, speedPromise) {
    emptyElementById('myPromiseCol');
    const node = document.getElementById('myPromiseCol');

    for (let i = 0; i < myRound.cardsInRound + 1; i++) {
        const promiseButton = createElementWithIdAndClasses('button', 'makePromiseButton'+i, 'btn btn-primary makePromiseButton');
        promiseButton.value = i;
        promiseButton.innerText = i;
        node.appendChild(promiseButton);
        if (evenPromisesAllowed || !isEvenPromise(myRound, i)) {
            promiseButton.classList.add('validPromiseButton');
            // promiseButton.setAttribute('disabled', false);
            promiseButton.addEventListener('click', doPromise, {once: true});
        } else {
            promiseButton.classList.add('disabled');
            promiseButton.setAttribute('disabled', true);
        }
    }

    document.getElementById('myPromiseRow').style.display = '';

    if (speedPromise && mySpeedPromisePoints(myRound) > -10) {
        drawMyCards(myRound, speedPromise);
        initSpeedPromiseTimer(myRound);
    }
}

function hidePromise() {
    document.getElementById('myPromiseRow').style.display = 'none';
    emptyElementById('myPromiseCol');
}

function drawSpeedBar(max, now) {
    emptyElementById('speedProgressBar');
    const progressMain = document.getElementById('speedProgressBar');
    const width = (now/max)*100;
    let classStr = "bg-success";
    if (width < 60 && width > 35) {
        classStr = "bg-info";
    } else if (width <= 35 && width > 15) {
        classStr = "bg-warning";
    } else if (width <= 15) {
        classStr = "bg-danger";
    }

    const progressBar = createElementWithIdAndClasses('div', null, 'progress-bar '+classStr);
    progressBar.style.width = width+'%';
    progressMain.appendChild(progressBar);
}

function drawPromiseAsProgress(max, promise, keep) {
    const progressMain = createElementWithIdAndClasses('div', null, 'progress')
    progressMain.style.marginTop = '4px';
    progressMain.style.border = '1px solid black';
    if (promise == keep) {
        const width = (promise/max)*100;
        const progressBar = createElementWithIdAndClasses('div', null, 'progress-bar bg-success');
        progressBar.style.width = width+'%';
        progressMain.appendChild(progressBar);
    }
    if (promise < keep) {
        const widthPromise = (promise/max)*100;
        const widthOver = ((keep-promise)/max)*100;
        const progressBarPromise = createElementWithIdAndClasses('div', null, 'progress-bar bg-success');
        progressBarPromise.style.width = widthPromise+'%';
        const progressBarOver = createElementWithIdAndClasses('div', null, 'progress-bar bg-danger');
        progressBarOver.style.width = widthOver+'%';
        progressMain.appendChild(progressBarPromise);
        progressMain.appendChild(progressBarOver);
    }
    if (promise > keep) {
        const widthKeep = (keep/max)*100;
        const widthRemaining = ((promise-keep)/max)*100;
        const progressBarKeep = createElementWithIdAndClasses('div', null, 'progress-bar bg-success');
        progressBarKeep.style.width = widthKeep+'%';
        const progressBarRemaining = createElementWithIdAndClasses('div', null, 'progress-bar bg-secondary');
        progressBarRemaining.style.width = widthRemaining+'%';
        progressMain.appendChild(progressBarKeep);
        progressMain.appendChild(progressBarRemaining);
    }

    return progressMain;
}

function showPlayerPromises(myRound, showPromise, showSpeedPromise) {
    myRound.players.forEach(function (player, idx) {
        const tableIdx = otherPlayerMapper(idx, myRound.players);
        if (player.promise != null) {
            document.getElementById('player'+tableIdx+'Keeps').innerText = 'k: '+player.keeps;
            const speedPromiseStr = showSpeedPromise ? ' ('+(player.speedPromisePoints == 1 ? '+' : player.speedPromisePoints)+')' : '';
            if (!showPromise && tableIdx != 0) {
                if (showSpeedPromise) document.getElementById('player'+tableIdx+'Promised').innerText = 'p: '+speedPromiseStr;
                return;
            }

            document.getElementById('player'+tableIdx+'Promised').innerText = 'p: '+player.promise+speedPromiseStr;
            if (player.promise == player.keeps) {
                document.getElementById('player'+tableIdx+'Keeps').classList.remove('gamePromiseOver');
                document.getElementById('player'+tableIdx+'Keeps').classList.remove('gamePromiseUnder');
                document.getElementById('player'+tableIdx+'Keeps').classList.add('gamePromiseKeeping');
            }
            if (player.promise < player.keeps) {
                document.getElementById('player'+tableIdx+'Keeps').classList.remove('gamePromiseKeeping');
                document.getElementById('player'+tableIdx+'Keeps').classList.remove('gamePromiseUnder');
                document.getElementById('player'+tableIdx+'Keeps').classList.add('gamePromiseOver');
            }
            if (player.promise > player.keeps) {
                document.getElementById('player'+tableIdx+'Keeps').classList.remove('gamePromiseKeeping');
                document.getElementById('player'+tableIdx+'Keeps').classList.remove('gamePromiseOver');
                document.getElementById('player'+tableIdx+'Keeps').classList.add('gamePromiseUnder');
            }
            emptyElementById('player'+tableIdx+'ProgressBar');
            document.getElementById('player'+tableIdx+'ProgressBar').appendChild(drawPromiseAsProgress(myRound.cardsInRound, player.promise, player.keeps));
            
        } else {
            emptyElementById('player'+tableIdx+'Promised');
            emptyElementById('player'+tableIdx+'Keeps');
        }
    });
    initPromiseTable(myRound.promiseTable);
}

function showCardValues(handValues) {
    handValues.forEach(function(handValue) {
        console.log(handValue);
        const index = mapPlayerNameToTable(handValue.name);
        document.getElementById('player'+index+'StatsCol1').innerText = 'hv: '+handValue.cardValues;
    });
}

function hideCardValues() {
    emptyElementByClass('hand-value-col');
}

function getPromise(myRound, evenPromisesAllowed, speedPromise, opponentPromiseCardValue) {
    checkSmall(myRound.players.length);
    hideThinkings();
    removeClassByClass('activeCardInHand');
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
}

function amIStarterOfPlay(myRound) {
    return myRound.cardInCharge == null;
}

function iHaveSuitInMyHand(suitInCharge, myHand) {
    for (let i = 0; i < myHand.length; i++) {
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
    const rank = card.rank == 14 ? 1 : card.rank;
    let retStr = '.card.';
    retStr+= card.suit + '.rank' + rank;
    return retStr;
}

function rankCard(rank) {
    // note: ace has rank 1 in ui but 14 in server
    if (rank == 1) return 14;
    return rank;
}

function toCard(suit, rank) {
    return {
        suit: suit,
        rank: parseInt(rank, 10),
    }
}

function classToCardMapper(classStr) {
    let classes = classStr.split(/\s+/);
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
    emptyElementById('speedProgressBar');
}

function removeCardEvents() {
    console.log('removeCardEvents');
    removeEventByClass('activeCard', 'click', cardClickEvent);
    removeEventByClass('activeCard', 'touchstart', cardClickEvent, true);
}

function cardClickEvent() {
    removeClassByClass("activeCardInHand");
    removeCardEvents();
    deleteIntervaller();
    const suit = this.getAttribute('cardsuit');
    const rank = this.getAttribute('cardrank');
    const card = toCard(suit, rank);
    console.log('played card: ', card);
    const playDetails = {
        gameId: document.getElementById('currentGameId').value,
        roundInd: getCurrentRoundInd(),
        myId: window.localStorage.getItem('uUID'),
        playedCard: card,
    };
    socket.emit('play card', playDetails, cardPlayedCallback);
}

function initCardEvents(myRound, onlySuit) {
    removeClassByClass('activeCardInHand');
    removeCardEvents();
    let cardsAbleToPlay = 0;
    possibleCards = [];
    for (let i = 0; i < myRound.myCards.length; i++) {
        const card = myRound.myCards[i];
        const cardMapperStr = cardToClassMapper(card);
        const cardMapperStrDiv = 'div'+cardMapperStr;
        const thisCard = document.querySelector(cardMapperStrDiv);
        if (onlySuit == null || card.suit == onlySuit) {
            // activate this card / div
            cardsAbleToPlay++;
            possibleCards.push(cardMapperStr);
            console.log(' mapped to: ' + cardMapperStrDiv);
            thisCard.setAttribute('cardsuit', card.suit);
            thisCard.setAttribute('cardrank', card.rank);
            thisCard.classList.add('activeCard');
            thisCard.classList.add('activeCardInHand');
            thisCard.velocity({backgroundColor: "#ffffff"}, 300);
            thisCard.addEventListener('click', cardClickEvent, {once: true});
            thisCard.addEventListener('touchstart', cardClickEvent, {once: true});
        } else {
            // fade this card
            thisCard.velocity({backgroundColor: "#bbbbbb"}, 300);
        }
    }
    return cardsAbleToPlay;
}

function dimMyCards(myRound, visibility) {
    let bgColor = "ffffff";
    switch (visibility) {
        case 1.0: bgColor = "ffffff"; break;
        case 0.8: bgColor = "dddddd"; break;
        case 0.7: bgColor = "cccccc"; break;
        case 0.6: bgColor = "bbbbbb"; break;
        default: break;
    }
    for (let i = 0; i < myRound.myCards.length; i++) {
        const cardMapperStr = 'div'+cardToClassMapper(myRound.myCards[i]);
        document.querySelector(cardMapperStr).velocity({backgroundColor: "#"+bgColor}, 400);
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
    const playedCards = myRound.cardsPlayed[myRound.cardsPlayed.length-1]; // last is current
    if (playedCards.length == 0) return;

    let winnerName = myRound.playerGoingToWinThisPlay;
    if (winnerName == null || winnerName == undefined) {
        winnerName = winnerOfSinglePlay(playedCards, myRound.trumpCard.suit);
    }

    for (let i = 0; i < playedCards.length; i++) {
        const playerIndex = mapPlayerNameToTable(playedCards[i].name);
        
        let cardPlayedDivs = document.getElementById('player'+playerIndex+'CardPlayedDiv').children;
        if (cardPlayedDivs.length == 1) {
            const cardPlayedDiv = cardPlayedDivs[0];
            if (i == 0) {
                cardPlayedDiv.classList.add('charge-black-div');
            } else if (playedCards[i].name == winnerName) {
                cardPlayedDiv.classList.add('winning-yellow-div');
            } else {
                cardPlayedDiv.classList.remove('winning-yellow-div');
            }
        }
    }
}

function showPlayedCards(myRound) {
    const deck = Deck();
    const dummyDeck = Deck();
    const playedCards = myRound.cardsPlayed[myRound.cardsPlayed.length-1]; // last is current
    if (playedCards.length == 0) return;

    let winnerName = myRound.playerGoingToWinThisPlay;
    if (winnerName == null || winnerName == undefined) {
        winnerName = winnerOfSinglePlay(playedCards, myRound.trumpCard.suit);
    }
    let dummyCardIndex = 0;

    for (let i = 0; i < playedCards.length; i++) {
        const playerIndex = mapPlayerNameToTable(playedCards[i].name);
        const cardPlayed = playedCards[i].card;
        
        const $container = document.getElementById('player'+playerIndex+'CardPlayedDiv');
        const cardIndex = cardPlayed.suit == 'dummy' ? dummyCardIndex++ : getCardIndex(deck.cards, cardPlayed);
        const card = cardPlayed.suit == 'dummy' ? dummyDeck.cards[cardIndex] :  deck.cards[cardIndex];
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
            const cardPlayedDivs = document.getElementById('player'+playerIndex+'CardPlayedDiv').children;
            if (cardPlayedDivs.length == 1) {
                const cardPlayedDiv = cardPlayedDivs[0];
                cardPlayedDiv.classList.add('charge-black-div');
            }
        } else if (playedCards[i].name == winnerName) {
            const cardPlayedDivs = document.getElementById('player'+playerIndex+'CardPlayedDiv').children;
            if (cardPlayedDivs.length == 1) {
                const cardPlayedDiv = cardPlayedDivs[0];
                cardPlayedDiv.classList.add('winning-yellow-div');
            }
        }
    }
}

function showOnlyTotalPromiseInfo(round, show, players) {
    if (show) {
        emptyElementById("totalPromiseInfo");
        let keptSoFar = 0;
        players.forEach(function (player) {
            keptSoFar+= player.keeps;
        });
        document.getElementById("totalPromiseInfo").innerText = 'Promised total: ' + round.totalPromise + '/' + round.cardsInRound + ' (' + keptSoFar + ')';
    } else {
        emptyElementById("totalPromiseInfo");
    }
}

function winnerOfSinglePlay(cardsPlayed, trumpSuit) {
    let winner = cardsPlayed[0].name;
    let winningCard = cardsPlayed[0].card;
    for (let i = 1; i < cardsPlayed.length; i++) {
        let wins = false;
        const currentCard = cardsPlayed[i].card;
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
    emptyElementByClass('cardWonCol');
}

function showWonCards(myRound) {
    const deck = Deck();
    const playerCount = myRound.players.length;
    let cardCount = 0;
    for (let i = 0; i < myRound.cardsPlayed.length; i++) {
        const playedCards = myRound.cardsPlayed[i];
        if (playedCards.length == playerCount) {
            let winnerName = myRound.playerGoingToWinThisPlay;
            if (winnerName == null || winnerName == undefined) {
                winnerName = winnerOfSinglePlay(playedCards, myRound.trumpCard.suit);
            }
            const playerIndex = mapPlayerNameToTable(winnerName);
            const wonIndex = getNextFreeCardWonDiv(playerIndex);
            const $containerTo = document.getElementById('player'+playerIndex+'CardsWon'+wonIndex+'Div');
            for (let j = 0; j < playerCount; j++) {
                const card = deck.cards[cardCount];
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
    removeClassByClass('dealer');
    const indInTable = otherPlayerMapper(myRound.dealerPositionIndex, myRound.players);
    document.getElementById('player'+indInTable+'NameCol').classList.add('dealer');
}

function playSpeedGamerCard(myRound) {
    if (possibleCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * possibleCards.length);
        const className = possibleCards[randomIndex];
        console.log(className);

        const card = classToCardMapper(className);
        console.log(card);
        const playDetails = {
            gameId: myRound.gameId,
            roundInd: myRound.roundInd,
            myId: window.localStorage.getItem('uUID'),
            playedCard: card,
        };
        socket.emit('play card', playDetails, cardPlayedCallback);
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
        removeEventByClass('activeCard', 'click', cardClickEvent);
        removeEventByClass('activeCard', 'touchstart', cardClickEvent, true);
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

function avgRoundPoints(playersArr) {
    const avgRoundPoints = [];
    for (let i = 0; i < playersArr.length; i++) {
        avgRoundPoints.push(playersArr[i].playerStats.playerAvgPointsInRounds);
    }
    return avgRoundPoints;
}

function playRound(myRound, freeTrump, privateSpeedGame, opponentGameCardValue) {
    checkSmall(myRound.players.length);
    hideThinkings();
    hidePromise();
    showDealer(myRound);
    highlightWinningCard(myRound);
    // document.getElementById('myInfoRow').style.display = '';
    if (opponentGameCardValue) {
        showCardValues(myRound.handValues);
    } else {
        hideCardValues();
    }
    if (isMyPlayTurn(myRound)) {
        showMyTurn();
        const cardsAbleToPlay = initCardsToPlay(myRound, freeTrump);
        if (privateSpeedGame) initPrivateSpeedTimer(cardsAbleToPlay, myRound);
    } else {
        removeClassByClass('activeCardInHand');
        showWhoIsPlaying(myRound);
        dimMyCards(myRound, 0.8);
    }
}

function getCardFromDiv(divStr) {
    const div = document.getElementById('' + divStr).children;
    if (div.length == 1) {
        const classStr = div[0].className;
        return classToCardMapper(classStr);
    }
    return null;
}

function getNextFreeCardWonDiv(playerIndex) {
    for (let i = 0; i < 10; i++) {
        if (document.getElementById('player'+playerIndex+'CardsWon'+i+'Div').children.length == 0) return i;
    }
    return 0;
}

async function moveCardFromTableToWinDeck(winnerName, players) {
    const deck = Deck();

    const playerIndex = mapPlayerNameToTable(winnerName);
    const wonIndex = getNextFreeCardWonDiv(playerIndex);
    const $containerTo = document.getElementById('player'+playerIndex+'CardsWon'+wonIndex+'Div');
    const containerToPosition = document.getElementById('player'+playerIndex+'CardsWon'+wonIndex+'Div').getBoundingClientRect();

    const delay = 400;
    const duration = 900;
    const movingCards = [];
    let cardLooper = 0;
    let cardReadyLooper = 0;

    for (let i = 0; i < players.length; i++) {
        const divIdStr = 'player'+i+'CardPlayedDiv';
        const containerFromPosition = document.getElementById(divIdStr).getBoundingClientRect();
        const cardToCheck = getCardFromDiv(divIdStr);
        if (cardToCheck == null) {
            continue;
        }
        const cardIndex = getCardIndex(deck.cards, cardToCheck);
        movingCards[i] = deck.cards[cardIndex];
        emptyElementById(divIdStr);
        
        movingCards[i].mount($containerTo);
        movingCards[i].setSide('front');
        movingCards[i].animateTo({
            delay: 0,
            duration: 0,
            ease: 'quartOut',
            x: parseInt(containerFromPosition.left - containerToPosition.left, 10),
            y: parseInt(containerFromPosition.top - containerToPosition.top, 10),
            rot: randomNegToPos(5),
            onComplete: async function() {
                movingCards[cardLooper].animateTo({
                    delay: delay,
                    duration: duration,
                    ease: 'quartOut',
                    x: randomNegToPos(2),
                    y: randomNegToPos(2),
                    rot: randomNegToPos(5),
                    onComplete: function() {
                        movingCards[cardReadyLooper].setSide('back');
                        cardReadyLooper++;
                    }
                });
                cardLooper++;
            }
        });
    }

    return new Promise(resolve => {
        setTimeout(resolve, (delay+duration+safeMs));
    });

}

function getLastCardContainer(playerIndex) {
    for (let i = 9; i >= 0; i--) {
        const el = document.getElementById('player'+playerIndex+'CardCol'+i);
        if (el != null && el.children.length > 0) return i;
    }
    return 0;
}

function getCurrentCardContainer(card) {
    const cardClassStr = cardToClassMapper(card);
    for (let i = 0; i < 10; i++) {
        const cardCol = document.getElementById('player0CardCol'+i);
        if (cardCol.querySelectorAll(cardClassStr).length == 1) return i;
        // if (.find(cardClassStr).length == 1) return i;
    }
    return 0;
}

async function moveCardFromHandToTable(card, playerName, cardsInThisPlay, hiddenCardsMode) {
    console.log('moveCardFromHandToTable, card:', card);
    const deck = Deck();

    // this is used when last card of play is hit, reveal all played cards
    if (cardsInThisPlay != null) {
        console.log('moveCardFromHandToTable, cardsInThisPlay:', cardsInThisPlay);
        for (let i = 0; i < cardsInThisPlay.length; i++) {
            if (playerName == cardsInThisPlay[i].name) continue; // animate this player card
    
            const thisPlayerIndex = mapPlayerNameToTable(cardsInThisPlay[i].name);
            const divIdStr = 'player'+thisPlayerIndex+'CardPlayedDiv';
            const cardToCheck = getCardFromDiv(divIdStr);
            if (cardToCheck == null || cardToCheck.suit != cardsInThisPlay[i].card.suit || cardToCheck.rank != cardsInThisPlay[i].card.rank) {
                console.log('moveCardFromHandToTable, empty div, cardToCheck: ', cardToCheck);
                emptyElementById(divIdStr);
                const $thisContainerTo = document.getElementById(divIdStr);
                const thisCardIndex = getCardIndex(deck.cards, cardsInThisPlay[i].card);
                const thisCard = deck.cards[thisCardIndex];
                thisCard.mount($thisContainerTo);
                thisCard.setSide('front');
            }
        }
    }

    const cardIndex = card.suit == 'dummy' ? 0 : getCardIndex(deck.cards, card);
    console.log('moveCardFromHandToTable, cardIndex:', cardIndex);
    const movingCard = deck.cards[cardIndex];
    console.log('moveCardFromHandToTable, movingCard:', movingCard);
    
    const playerIndex = mapPlayerNameToTable(playerName);
    console.log('moveCardFromHandToTable, playerIndex:', playerIndex);
    const containerIndex = playerIndex == 0 ? getCurrentCardContainer(card) : getLastCardContainer(playerIndex);
    console.log('moveCardFromHandToTable, containerIndex:', containerIndex);
    emptyElementById('player'+playerIndex+'CardCol'+containerIndex);

    const $containerTo = document.getElementById('player'+playerIndex+'CardPlayedDiv');
    const containerFromPosition = document.getElementById('player'+playerIndex+'CardCol'+containerIndex).getBoundingClientRect();
    const containerToPosition = document.getElementById('player'+playerIndex+'CardPlayedDiv').getBoundingClientRect();

    const delay = (hiddenCardsMode > 0 && cardsInThisPlay != null && cardsInThisPlay.length > 0) ? 1700 : 300;
    const duration = (hiddenCardsMode > 0 && cardsInThisPlay != null && cardsInThisPlay.length > 0) ? 1200 : 800;

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
            if (card.suit != 'dummy') movingCard.setSide('front');
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
        setTimeout(resolve, (delay+duration+safeMs));
    });
}

function initPromiseTable(promiseTable) {
    console.log('initPromiseTable');
    if (document.getElementById('promiseTable').children.length == 0) createPromiseTable(promiseTable);

    const animate = true;

    const tooltippedDivs = document.getElementsByClassName('promTooltip');
    if (tooltippedDivs != null) {
        Array.prototype.forEach.call(tooltippedDivs, function(el) {
                const tooltip = bootstrap.Tooltip.getInstance(el);
                if (tooltip != null) {
                    // disposed elements can't have animations
                    tooltip.dispose();
                }
        });
        console.log('all tooltips disposed');
    }

    for (let i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        let playerKept = 0;
        let playerOver = 0;
        let playerUnder = 0;
        for (let j = 0; j < promiseTable.rounds.length; j++) {
            const cardsInRound = promiseTable.rounds[j].cardsInRound;
            const totalPromise = promiseTable.rounds[j].totalPromise;
            if (totalPromise != null) {
                const el = document.getElementById('promiseTableHeader'+j);
                let tooltipTitle = '';
                if (cardsInRound == totalPromise) {
                    el.classList.remove('promiseOver');
                    el.classList.remove('promiseUnder');
                    el.classList.add('promiseKept');
                    tooltipTitle = 'Even';
                } else if (cardsInRound < totalPromise) {
                    el.classList.remove('promiseKept');
                    el.classList.remove('promiseUnder');
                    el.classList.add('promiseOver');
                    tooltipTitle = 'Over promised, total: ' + totalPromise + '/' + cardsInRound;
                } else {
                    el.classList.remove('promiseKept');
                    el.classList.remove('promiseOver');
                    el.classList.add('promiseUnder');
                    tooltipTitle = 'Under promised, total: ' + totalPromise + '/' + cardsInRound;
                }
                new bootstrap.Tooltip(el, {title: tooltipTitle, animation: animate});
            }
            const promise = promiseTable.promisesByPlayers[i][j];
            const speedPromiseStr = promise.speedPromisePoints != null && promise.speedPromisePoints != 0 ? (promise.speedPromisePoints == 1 ? '+' : promise.speedPromisePoints) : '';
            const promiseStr = (promise != null) ? promise.promise : '&nbsp;';
            const playerPromEl = document.getElementById('player'+i+'Prom'+j);
            playerPromEl.innerHTML = promiseStr;
            if (promise.points != null) {
                playerPromEl.classList.add('promTooltip');
                let tooltipStr = "";
                if (promise.keep == promise.promise) {
                    playerPromEl.classList.add('promiseKept');
                    playerKept++;
                } else if (promise.keep > promise.promise) {
                    playerPromEl.classList.add('promiseOver');
                    tooltipStr = 'won: ' + promise.keep + '/' + promise.promise;
                    playerOver++;
                } else {
                    playerPromEl.classList.add('promiseUnder');
                    tooltipStr = 'won: ' + promise.keep + '/' + promise.promise;
                    playerUnder++;
                }
                if (speedPromiseStr != '') tooltipStr+= ' ('+speedPromiseStr+')';
                new bootstrap.Tooltip(playerPromEl, {title: tooltipStr, animation: animate});
            }
        }
        const promiseNameEl = document.getElementById('player'+i+'PromiseName');
        new bootstrap.Tooltip(promiseNameEl, {title: "kept: " + playerKept + " / over: " + playerOver + " / under: " + playerUnder, animation: animate});
    }
}

function initScoreBoard(promiseTable, gameOver, avgStats) {
    if (document.getElementById('scoreboard').children.length == 0) createScoreboard(promiseTable);
    
    const totalPoints = [];
    for (let i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        let playerPoints = 0;
        for (let j = 0; j < promiseTable.promisesByPlayers[i].length; j++) {
            const currentPoints = promiseTable.promisesByPlayers[i][j].points;
            const avgPoints = avgStats[i][j+1];
            const playerPointsEl = document.getElementById('player'+i+'Points'+j);
            if (currentPoints != null) {
                playerPointsEl.classList.remove('avgHistory');
                const speedPromisePoints = promiseTable.promisesByPlayers[i][j].speedPromisePoints;
                const speedPromiseTotal = promiseTable.promisesByPlayers[i][j].speedPromiseTotal;
                let tooltipStr = 'Total '+currentPoints;
                if (currentPoints != 0) {
                    playerPoints+= currentPoints;
                    playerPointsEl.innerText = playerPoints;
                    playerPointsEl.classList.add('hasPoints');
                } else {
                    playerPointsEl.innerText = '-';
                    playerPointsEl.classList.add('zeroPoints');
                }

                if (speedPromisePoints == 1) {
                    playerPointsEl.classList.add('speedPromiseBonus');
                    tooltipStr+= (currentPoints > 0) ? ', including '+ speedPromiseTotal +' promise bonus' : ', missed promise bonus';
                } else if (speedPromisePoints < 0) {
                    playerPointsEl.classList.add('speedPromisePenalty');
                    tooltipStr+= ', including '+ speedPromiseTotal +' promise penalty'
                }

                tooltipStr+=  ' = '+parseFloat(playerPoints - avgPoints).toFixed(1) + ' points in average';

                new bootstrap.Tooltip(playerPointsEl, {title: tooltipStr});
            } else {
                playerPointsEl.classList.add('avgHistory');
                playerPointsEl.innerText = parseFloat(avgPoints).toFixed(1);
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
        const htmls = document.getElementsByTagName('html');
        Array.prototype.forEach.call(htmls, function(el){
            el.classList.add('html-sm');
        });
        const els = document.getElementsByClassName('cardCol');
        Array.prototype.forEach.call(els, function(el){
            el.classList.add('cardCol-sm');
        });
    } else {
        const els1 = document.getElementsByClassName('html-sm');
        Array.prototype.forEach.call(els1, function(el){
            el.classList.remove('html-sm');
        });
        const els2 = document.getElementsByClassName('cardCol-sm');
        Array.prototype.forEach.call(els2, function(el){
            el.classList.remove('cardCol-sm');
        });
    }
}

async function cardPlayedCallback(gameInfo) {
    document.getElementById('currentGameId').value = gameInfo.id;
    console.log('card played', gameInfo);
    hideThinkings();
    let newRound = false;
    let gameOver = false;

    if (gameInfo.eventInfo != null) {
        console.log('card played, eventInfoType: '+gameInfo.eventInfo.eventInfoType);
        // animate played card
        const playedCard = gameInfo.eventInfo.playedCard;
        const cardPlayedBy = gameInfo.eventInfo.cardPlayedBy;
        const players = gameInfo.humanPlayers;
        newRound = gameInfo.eventInfo.newRound;
        gameOver = gameInfo.eventInfo.gameOver;
        
        await moveCardFromHandToTable(playedCard, cardPlayedBy, gameInfo.eventInfo.cardsInThisPlay, gameInfo.hiddenCardsMode);
        if (gameInfo.eventInfo.newPlay) {
            const winnerName = gameInfo.eventInfo.winnerName;
            await moveCardFromTableToWinDeck(winnerName, players);
        }
    }

    const doReloadInit = gameInfo.reloaded;
    let getRoundIndex = gameInfo.currentRound;
    if (newRound && !gameOver) {
        getRoundIndex++;
    }

    let getRound = {
        gameId: gameInfo.id,
        myId: window.localStorage.getItem('uUID'),
        round: getRoundIndex,
        doReload: doReloadInit,
        newRound: newRound,
        gameOver: gameOver,
        callTimeStamp: new Date(),
    };

    socket.emit('get round', getRound, function(myRound) {
        console.log(myRound);
        const iAmObserver = amIObserver(myRound);
        console.log('iAmObserver', iAmObserver);
        if (iAmObserver) {
            observerInit();
        }
        document.getElementById('myName').value = myRound.myName;
        document.getElementById('currentRoundInd').value = myRound.roundInd;
        if (myRound.gameOver) {
            showPlayerPromises(myRound, true, gameInfo.speedPromise);
            initPromiseTable(myRound.promiseTable);
            initScoreBoard(myRound.promiseTable, myRound.gameOver, avgRoundPoints(myRound.players));
            document.getElementById('showGameReportCollapse').classList.add('show');
            getOneGameReport(gameInfo.id);
            return;
        }
        if (myRound.doReloadInit) {
            console.log('reloading...');
            document.getElementById('gameReportContainer').style.display = 'none';
            document.getElementById('gameChooser').style.display = 'none';
            document.getElementById('gameContainer').style.display = '';
            browserReload(myRound, gameInfo.speedPromise);
            initRuleList(gameInfo);
            initSpeedBar(gameInfo);
        }
        showPlayerPromises(myRound, showPromisesNow(gameInfo, myRound), gameInfo.speedPromise);
        if (myRound.newRound) {
            console.log('newRound');
            clearWonCards();
            browserReload(myRound, gameInfo.speedPromise);
        }
        if (roundPromised(myRound)) {
            showOnlyTotalPromiseInfo(myRound.promiseTable.rounds[myRound.roundInd], gameInfo.onlyTotalPromise, myRound.players);
            playRound(myRound, gameInfo.freeTrump, gameInfo.privateSpeedGame, gameInfo.opponentGameCardValue);
        } else {
            initSpeedBar(gameInfo);
            getPromise(myRound, gameInfo.evenPromisesAllowed, gameInfo.speedPromise, gameInfo.opponentPromiseCardValue);
        }
        if (!iAmObserver && myRound.obsGame && myRound.obsGame.observers && myRound.obsGame.observers.length > 0) {
            document.getElementById('openObserversButton').classList.remove('disabled');
            document.getElementById('openObserversButton').classList.remove('btn-secondary');
            document.getElementById('openObserversButton').classList.add('btn-primary');
        }
    });
}

function browserReload(myRound, speedPromise) {
    initCardTable(myRound);
    initOtherPlayers(myRound);
    initPromiseTable(myRound.promiseTable);
    initScoreBoard(myRound.promiseTable, myRound.gameOver, avgRoundPoints(myRound.players));
    drawCards(myRound, speedPromise);
    showPlayedCards(myRound);
    showWonCards(myRound);
    checkSmall(myRound.players.length);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function appendToChat(text) {
    const currentText = document.getElementById('chatTextArea').value;
    document.getElementById('chatTextArea').value = currentText +'\n'+ text;
    const textArea = document.getElementById('chatTextArea');
    textArea.scrollTop = textArea.scrollHeight;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function newObserverCallback(newObserver) {
    document.getElementById('openObserversButton').classList.remove('disabled');
    document.getElementById('openObserversButton').classList.remove('btn-secondary');
    document.getElementById('openObserversButton').classList.add('btn-warning');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function deleteObservingCallback(deleteObserver) {
    console.log('deleteObservingCallback', deleteObserver);
    if (deleteObserver.obsOk
        && document.getElementById('currentGameId').value == deleteObserver.obsGame.gameId
        && document.getElementById("observersModal").attributes["aria-modal"]
        && document.getElementById("observersModal").attributes["aria-modal"].value == "true") {
            // eslint-disable-next-line no-undef
            showObservers();
    }
    if (deleteObserver.observersCount == 0) {
        document.getElementById('openObserversButton').classList.add('disabled');
        document.getElementById('openObserversButton').classList.remove('btn-warning');
        document.getElementById('openObserversButton').classList.add('btn-secondary');
    }
}

function randomNegToPos(max) {
    return Math.floor(Math.random() * (2*max)) - max;
}

function amIObserver(myRound) {
    if (myRound.players.find(function(player) {
        return player.thisIsMe
    }) == undefined) {
        return true;
    }
    return false;
}

function observerInit() {
    document.getElementById('openObserversButton').classList.add('disabled');
    document.getElementById('toggleLeaveGameCollapseButton').style.display = 'none';
    document.getElementById('toggleLeaveObserveCollapseButton').style.display = '';
}