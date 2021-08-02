const bgColor = '#f29ee9';

function initTableFor3() {
    console.log('initTableFor3');
    const nodeRow = createElementWithIdAndClasses('div', null, 'row');
    const nodeCol = createElementWithIdAndClasses('div', null, 'col');

    const row1 = createElementWithIdAndClasses('div', null, 'row');
    const col1 = initPlayerTable(1, 'left', 10, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(2, 'right', 10, 5);

    row1.appendChild(col1);
    row1.appendChild(col2);
    row1.appendChild(col3);

    const row2 = createElementWithIdAndClasses('div', null, 'row');
    const col21 = createElementWithIdAndClasses('div', null, 'col-6');
    const col22 = createElementWithIdAndClasses('div', null, 'col-2');
    col22.appendChild(myPlayedCardDiv(0));
    const col23 = createElementWithIdAndClasses('div', null, 'col-4');
    
    row2.appendChild(col21);
    row2.appendChild(col22);
    row2.appendChild(col23);

    const row3 = createElementWithIdAndClasses('div', null, 'row');
    const col31 = initPlayerTable(0, 'left', 10, 3);
    
    const col32 = createElementWithIdAndClasses('div', null, 'col-9');
    const myCardsRow = initMyCardsContainer(10);
    const myPromiseRow = initMyPromiseRow();
    
    col32.appendChild(myPromiseRow);
    col32.appendChild(myCardsRow);

    row3.appendChild(col31);
    row3.appendChild(col32);
    
    
    nodeCol.appendChild(row1);
    nodeCol.appendChild(row2);
    nodeCol.appendChild(row3);
    nodeRow.appendChild(nodeCol);
    return nodeRow;
}

function initTableFor4() {
    console.log('initTableFor4');
    const nodeRow = createElementWithIdAndClasses('div', null, 'row');
    const nodeCol = createElementWithIdAndClasses('div', null, 'col');

    const row1 = createElementWithIdAndClasses('div', null, 'row');
    const col1 = initPlayerTable(2, 'left', 10, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(3, 'right', 10, 5);

    const row2 = createElementWithIdAndClasses('div', null, 'row');
    const col21 = initPlayerTable(1, 'left', 10, 5);

    const col22 = createElementWithIdAndClasses('div', null, 'col-7');

    const playerCardRow1 = createElementWithIdAndClasses('div', null, 'row');
    const playerCardCol11 = createElementWithIdAndClasses('div', null, 'col-1'); // this is empty column
    const playerCardCol12 = createElementWithIdAndClasses('div', null, 'col-2');
    playerCardCol12.appendChild(myPlayedCardDiv(0));
    const playerCardCol13 = initPlayerTable(0, 'right', 10, 9);
    playerCardRow1.appendChild(playerCardCol11);
    playerCardRow1.appendChild(playerCardCol12);
    playerCardRow1.appendChild(playerCardCol13);

    col22.appendChild(playerCardRow1);
    col22.appendChild(initMyPromiseRow());
    col22.appendChild(initMyCardsContainer(10));

    row1.appendChild(col1);
    row1.appendChild(col2);
    row1.appendChild(col3);

    row2.appendChild(col21);
    row2.appendChild(col22);

    nodeCol.appendChild(row1);
    nodeCol.appendChild(row2);
    nodeRow.appendChild(nodeCol);
    return nodeRow;
}

function initTableFor5() {
    console.log('initTableFor5');
    const nodeRow = createElementWithIdAndClasses('div', null, 'row');
    const nodeCol = createElementWithIdAndClasses('div', null, 'col');

    const row1 = createElementWithIdAndClasses('div', null, 'row');
    const col1 = initPlayerTable(2, 'left', 10, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(3, 'right', 10, 5);

    const row2 = createElementWithIdAndClasses('div', null, 'row');
    const col21 = initPlayerTable(1, 'left', 10, 5);

    const col22 = createElementWithIdAndClasses('div', null, 'col-1');

    const col23 = createElementWithIdAndClasses('div', null, 'col-1');
    const cardRow = createElementWithIdAndClasses('div', null, 'row');
    const carCols = createElementWithIdAndClasses('div', null, 'col cardCol');
    const cardRow0 = createElementWithIdAndClasses('div', null, 'row');
    const carCols0 = createElementWithIdAndClasses('div', null, 'col cardCol');
    
    const cardRow1 = createElementWithIdAndClasses('div', null, 'row');
    const carCols1 = createElementWithIdAndClasses('div', null, 'col');
    carCols1.appendChild(myPlayedCardDiv(0));
    cardRow1.appendChild(carCols1);
    cardRow.appendChild(carCols);
    cardRow0.appendChild(carCols0);
    col23.appendChild(cardRow);
    col23.appendChild(cardRow0);
    col23.appendChild(cardRow1);

    const col24 = initPlayerTable(4, 'right', 10, 5);

    const row3 = createElementWithIdAndClasses('div', null, 'row');
    const col31 = initPlayerTable(0, 'left', 10, 3);
    
    const col32 = createElementWithIdAndClasses('div', null, 'col-9');
    const myCardsRow = initMyCardsContainer(10);
    
    const myPromiseRow = initMyPromiseRow();
    
    col32.appendChild(myPromiseRow);
    col32.appendChild(myCardsRow);

    row3.appendChild(col31);
    row3.appendChild(col32);

    row1.appendChild(col1);
    row1.appendChild(col2);
    row1.appendChild(col3);

    row2.appendChild(col21);
    row2.appendChild(col22);
    row2.appendChild(col23);
    row2.appendChild(col24);

    nodeCol.appendChild(row1);
    nodeCol.appendChild(row2);
    nodeCol.appendChild(row3);
    nodeRow.appendChild(nodeCol);
    return nodeRow;
}

function initTableFor6() {
    console.log('initTableFor6');
    const nodeRow = createElementWithIdAndClasses('div', null, 'row');
    const nodeCol = createElementWithIdAndClasses('div', null, 'col');

    const row1 = createElementWithIdAndClasses('div', null, 'row');
    const col1 = initPlayerTable(2, 'left', 8, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(3, 'right', 8, 5);

    const row2 = createElementWithIdAndClasses('div', null, 'row');
    const col21 = initPlayerTable(1, 'left', 8, 5);

    const col22 = createElementWithIdAndClasses('div', null, 'col-1');
    const cardRow221 = createElementWithIdAndClasses('div', null, 'row');
    const carCols221 = createElementWithIdAndClasses('div', null, 'col cardCol');
    const cardRow222 = createElementWithIdAndClasses('div', null, 'row');
    const carCols222 = createElementWithIdAndClasses('div', null, 'col cardCol');
    const cardRow1 = createElementWithIdAndClasses('div', null, 'row');
    const carCols1 = createElementWithIdAndClasses('div', null, 'col');
    carCols1.appendChild(myPlayedCardDiv(0));
    cardRow1.appendChild(carCols1);
    cardRow222.appendChild(carCols222);
    cardRow221.appendChild(carCols221);
    col22.appendChild(cardRow221);
    col22.appendChild(cardRow222);
    col22.appendChild(cardRow1);

    const col23 = createElementWithIdAndClasses('div', null, 'col-1');
    const cardRow = createElementWithIdAndClasses('div', null, 'row');
    const carCols = createElementWithIdAndClasses('div', null, 'col cardCol');
    const cardRow0 = createElementWithIdAndClasses('div', null, 'row');
    const carCols0 = createElementWithIdAndClasses('div', null, 'col cardCol');
    const cardRow23 = createElementWithIdAndClasses('div', null, 'row');
    const carCols23 = createElementWithIdAndClasses('div', null, 'col');
    carCols23.appendChild(myPlayedCardDiv(5));
    cardRow23.appendChild(carCols23);
    cardRow.appendChild(carCols);
    cardRow0.appendChild(carCols0);

    col23.appendChild(cardRow);
    col23.appendChild(cardRow0);
    col23.appendChild(cardRow23);

    const col24 = initPlayerTable(4, 'right', 8, 5);

    const row3 = createElementWithIdAndClasses('div', null, 'row');
    const col31 = initPlayerTable(0, 'left', 8, 2);
    
    const col32 = createElementWithIdAndClasses('div', null, 'col-5');
    const myCardsRow = initMyCardsContainer(8);
    
    const myPromiseRow = initMyPromiseRow();
    
    col32.appendChild(myPromiseRow);
    col32.appendChild(myCardsRow);

    const col33 = initPlayerTable(5, 'right', 8, 5);

    row3.appendChild(col31);
    row3.appendChild(col32);
    row3.appendChild(col33);

    row1.appendChild(col1);
    row1.appendChild(col2);
    row1.appendChild(col3);

    row2.appendChild(col21);
    row2.appendChild(col22);
    row2.appendChild(col23);
    row2.appendChild(col24);

    nodeCol.appendChild(row1);
    nodeCol.appendChild(row2);
    nodeCol.appendChild(row3);
    nodeRow.appendChild(nodeCol);
    return nodeRow;
}

function initTrumpTable() {
    const nodeCol = createElementWithIdAndClasses('div', null, 'col-2');

    const row1= createElementWithIdAndClasses('div', null, 'row');
    const col11 = createElementWithIdAndClasses('div', null, 'col nameCol trumpNameCol'); //>Valtti</div>').classList.add();
    const row2= createElementWithIdAndClasses('div', null, 'row');
    const col21 = createElementWithIdAndClasses('div', 'trumpDiv', 'col cardCol trumpCardCol');
    const row3= createElementWithIdAndClasses('div', null, 'row');
    const col31 = createElementWithIdAndClasses('div', 'speedPromiseDiv', 'col speedPromiseCol');
    const row4= createElementWithIdAndClasses('div', null, 'row');
    const col41 = createElementWithIdAndClasses('div', 'totalPromiseInfo', 'col nameCol promisedTotalCol');
    row1.appendChild(col11);
    row2.appendChild(col21);
    row3.appendChild(col31);
    row4.appendChild(col41);
    
    nodeCol.appendChild(row1);
    nodeCol.appendChild(row2);
    nodeCol.appendChild(row3);
    nodeCol.appendChild(row4);
    
    return nodeCol;
}

function initPlayerTable(index, align, maxCards, colCount) {
    const nodeCol = createElementWithIdAndClasses('div', 'playerTable'+index, 'col-'+colCount+' playerTableCol');

    const row1 = createElementWithIdAndClasses('div', 'player'+index+'row', 'row');

    row1.appendChild(createElementWithIdAndClasses('div', 'player'+index+'NameCol', 'col-3 nameCol playerNameCol'));
    row1.appendChild(createElementWithIdAndClasses('div', 'player'+index+'Promised', 'col-3 playerInfoCol'));
    row1.appendChild(createElementWithIdAndClasses('div', 'player'+index+'Keeps', 'col-2 playerInfoCol'));
    row1.appendChild(createElementWithIdAndClasses('div', 'player'+index+'ProgressBar', 'col-4'));
    
    var row2 = null;
    if (index > 0) {
        row2 = createElementWithIdAndClasses('div', null, 'row');
        for (var i = 0; i < maxCards; i++) {
            var classStr = 'col cardCol';
            if (i == 0) classStr+= ' firstCardCol';
            if (i == maxCards - 1) classStr+= ' lastCardCol';
            row2.appendChild(createElementWithIdAndClasses('div', 'player'+index+'CardCol'+i, classStr));
        }
    }

    const row3 = createElementWithIdAndClasses('div', null, 'row');
    const col31 = createElementWithIdAndClasses('div', null, 'col cardCol');
    const col32 = createElementWithIdAndClasses('div', null, 'col cardCol');

    const cardsWonRow = createElementWithIdAndClasses('div', null, 'row inner-row');
    for (var i = 0; i < maxCards; i++) {
        const classStr = (i == 0) ? 'col cardCol firstCardCol' : 'col cardCol cardWonCol';
        cardsWonRow.appendChild(createElementWithIdAndClasses('div', 'player'+index+'CardsWon'+i+'Div', classStr));
    }
    const playedCardRow = createElementWithIdAndClasses('div', null, 'row inner-row');
    
    const statsCol = createElementWithIdAndClasses('div', 'player'+index+'StatsCol', 'col');
    const statsRow1 = createElementWithIdAndClasses('div', null, 'row');
    const statsCol1 = createElementWithIdAndClasses('div', 'player'+index+'StatsCol1', 'col hand-value-col');
    const statsRow2 = createElementWithIdAndClasses('div', null, 'row');
    const statsCol2 = createElementWithIdAndClasses('div', 'player'+index+'StatsCol2', 'col stats-col');
    const statsRow3 = createElementWithIdAndClasses('div', null, 'row');
    const statsCol3 = createElementWithIdAndClasses('div', 'player'+index+'StatsCol3', 'col stats-col');

    statsRow1.appendChild(statsCol1);
    statsRow2.appendChild(statsCol2);
    statsRow3.appendChild(statsCol3);
    statsCol.appendChild(statsRow1);
    statsCol.appendChild(statsRow2);
    statsCol.appendChild(statsRow3);

    // where are promises and points aligned
    if (align == 'left') {
        playedCardRow.appendChild(statsCol);
        if (index != 0 && index != 5) playedCardRow.appendChild(createElementWithIdAndClasses('div', 'player'+index+'CardPlayedDiv', 'col cardCol playedCardCol'));
        col31.appendChild(cardsWonRow);
        col32.appendChild(playedCardRow);
    }
    if (align == 'right') {
        if (index != 0 && index != 5) playedCardRow.appendChild(createElementWithIdAndClasses('div', 'player'+index+'CardPlayedDiv', 'col cardCol playedCardCol'));
        playedCardRow.appendChild(statsCol);
        col31.appendChild(playedCardRow);
        col32.appendChild(cardsWonRow);
    }

    row3.appendChild(col31);
    row3.appendChild(col32);

    nodeCol.appendChild(row1);
    if (index > 0) nodeCol.appendChild(row2);
    nodeCol.appendChild(row3);

    return nodeCol;
}

function myPlayedCardDiv(index) {
    const nodeRow = createElementWithIdAndClasses('div', null, 'row');
    var classStr = 'col cardCol';
    if (index == 5) classStr+= ' firstCardCol';
    const nodeCol = createElementWithIdAndClasses('div', 'player'+index+'CardPlayedDiv', classStr);
    nodeRow.appendChild(nodeCol);
    return nodeRow;
}

function initCardTable(myRound) {
    emptyElementById('otherPlayers');
    const node = document.getElementById('otherPlayers');

    const playerCount = myRound.players.length;
    if (playerCount == 3) node.appendChild(initTableFor3());
    if (playerCount == 4) node.appendChild(initTableFor4());
    if (playerCount == 5) node.appendChild(initTableFor5());
    if (playerCount == 6) node.appendChild(initTableFor6());
}

function initOtherPlayers(myRound) {
    myRound.players.forEach(function(player, idx) {
        const playerNameDiv = document.getElementById('player'+otherPlayerMapper(idx, myRound.players)+'NameCol');
        playerNameDiv.innerText = player.name;
        const playerInfoRow = playerNameDiv.parentElement;
        playerInfoRow.style.backgroundImage = 'linear-gradient(90deg,  '+colorize(player.name)+', '+bgColor+')';
    });
}

function initMyCardsContainer(maxCards) {
    const node = createElementWithIdAndClasses('div', null, 'row myCardsRowClass');
    
    for (var i = 0; i < maxCards; i++) {
        node.appendChild(drawCardCol(i));
    }

    return node;
}

function drawCardCol(idx) {
    const cardCol = createElementWithIdAndClasses('div', 'player0CardCol'+idx, 'col cardCol');
    cardCol.innerHTML = '&nbsp;';
    return cardCol;
}

function initMyPromiseRow() {
    const node = createElementWithIdAndClasses('div', 'myPromiseRow', 'row myCardsRowClass');
    const col2 = createElementWithIdAndClasses('div', 'myPromiseCol', 'col promiseButtons');
    
    node.appendChild(col2);

    return node;
}

function createPromiseTable(promiseTable) {
    const node = document.getElementById('promiseTable');
    const table = document.createElement('table');
    const tableHeader = document.createElement('thead');
    const tableHeaderRow = document.createElement('tr');
    
    tableHeaderRow.appendChild(createElementWithIdAndClasses('th', null, 'promiseTableHeader', {scope: 'col'}));
    for (var i = 0; i < promiseTable.rounds.length; i++) {
        const tableHeaderCol = createElementWithIdAndClasses('th', 'promiseTableHeader'+i, 'promiseTableHeader', {scope: 'col'});
        tableHeaderCol.innerText = promiseTable.rounds[i].cardsInRound;
        tableHeaderRow.appendChild(tableHeaderCol);
    }
    tableHeader.appendChild(tableHeaderRow);

    const tableBody = document.createElement('tbody');
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        const tableBodyRow = document.createElement('tr');
        const playerNameCol = createElementWithIdAndClasses('th', 'player'+i+'PromiseName', 'promiseTableCol playerPromiseNameCol', {scope: 'row'});
        playerNameCol.style.backgroundImage = 'linear-gradient(90deg,  '+colorize(promiseTable.players[i])+', '+bgColor+')';
        playerNameCol.innerText = promiseTable.players[i];
        tableBodyRow.appendChild(playerNameCol);
        for (var j = 0; j < promiseTable.rounds.length; j++) {
            const promiseCol = createElementWithIdAndClasses('td', 'player'+i+'Prom'+j, 'promiseTableCol playerPromiseCol');
            tableBodyRow.appendChild(promiseCol);
        }
        
        tableBody.appendChild(tableBodyRow);
    }
    table.appendChild(tableHeader);
    table.appendChild(tableBody);

    node.appendChild(table);
}

function createScoreboard(promiseTable) {
    const node = document.getElementById('scoreboard');
    const table = document.createElement('table');
    const tableHeader = document.createElement('thead');
    const tableHeaderRow = document.createElement('tr');
    
    for (var i = 0; i < promiseTable.players.length; i++) {
        const playerName = promiseTable.players[i];
        var playerShortName = playerName;
        if (playerShortName.length > 3) playerShortName = playerShortName.substring(0, 3);
        const tableHeaderCol = createElementWithIdAndClasses('th', 'tableHeaderName'+i, 'scoreboardTableHeader', {scope: 'col'});
        tableHeaderCol.style.backgroundImage = 'linear-gradient(90deg,  '+colorize(playerName)+', '+bgColor+')';
        tableHeaderCol.innerText = playerShortName;
        const tableHeaderColTooltip = new bootstrap.Tooltip(tableHeaderCol, {title: playerName});
        tableHeaderRow.appendChild(tableHeaderCol);
    }
    tableHeader.appendChild(tableHeaderRow);

    const tableBody = document.createElement('tbody');
    for (var i = 0; i < promiseTable.rounds.length; i++) {
        const tableBodyRow = document.createElement('tr');
        for (var j = 0; j < promiseTable.players.length; j++) {
            const pointCol = createElementWithIdAndClasses('td', 'player'+j+'Points'+i, 'scoreboardTableCol');
            pointCol.innerHTML = '&nbsp;';
            tableBodyRow.appendChild(pointCol);
        }
        
        tableBody.appendChild(tableBodyRow);
    }
    table.appendChild(tableHeader);
    table.appendChild(tableBody);

    node.appendChild(table);
}

function liElementWithText(text) {
    const el = document.createElement('li');
    el.innerText = text;
    return el;
}

function initRuleList(gameInfo) {
    emptyElementById('ruleList');
    const node = document.getElementById('ruleList');
    if (!gameInfo.evenPromisesAllowed) node.appendChild(liElementWithText('no even promises'));
    if (!gameInfo.visiblePromiseRound) node.appendChild(liElementWithText('hidden promise round'));
    if (gameInfo.onlyTotalPromise) node.appendChild(liElementWithText('only total promise visible'));
    if (!gameInfo.freeTrump) node.appendChild(liElementWithText('must play trump'));
    if (gameInfo.hiddenTrump) node.appendChild(liElementWithText('hidden trump'));
    if (gameInfo.speedPromise) node.appendChild(liElementWithText('speed promise'));
    if (gameInfo.privateSpeedGame) node.appendChild(liElementWithText('speed game'));
    if (gameInfo.opponentPromiseCardValue) node.appendChild(liElementWithText('hand value in promise'));
    if (gameInfo.opponentGameCardValue) node.appendChild(liElementWithText('hand value in game'));
    if (gameInfo.hiddenCardsMode == 1) node.appendChild(liElementWithText('show only card in charge'));
    if (gameInfo.hiddenCardsMode == 2) node.appendChild(liElementWithText('show card in charge and winning card'));
}

function initSpeedBar(gameInfo) {
    const node = document.getElementById('speedPromiseDiv');
    if (gameInfo.privateSpeedGame || gameInfo.speedPromise) {
        if (document.getElementById('speedPromiseDiv').children.length == 0) {
            const progressMain = createElementWithIdAndClasses('div', 'speedProgressBar', 'progress');
            progressMain.style.marginTop = '4px';
            progressMain.style.border = '1px solid black';
            node.appendChild(progressMain);
        }
    } else {
        emptyElementById('speedPromiseDiv');
    }
}
