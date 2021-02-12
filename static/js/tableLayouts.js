
function initTableFor3() {
    console.log('initTableFor3');
    const nodeRow = $('<div></div>').addClass('row');
    const nodeCol = $('<div></div>').addClass('col');

    const row1 = $('<div></div>').addClass('row');
    const col1 = initPlayerTable(1, 'left', 10, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(2, 'right', 10, 5);

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);

    const row2 = $('<div></div>').addClass('row');
    const col21 = $('<div></div>').addClass('col-6');
    const col22 = $('<div></div>').addClass('col-2');
    col22.append(myPlayedCardDiv(0));
    const col23 = $('<div></div>').addClass('col-4');
    
    row2.append(col21);
    row2.append(col22);
    row2.append(col23);

    const row3 = $('<div></div>').addClass('row');
    const col31 = initPlayerTable(0, 'left', 10, 3);
    
    const col32 = $('<div></div>').addClass('col-9');
    const myCardsRow = initMyCardsContainer(10);
    const myPromiseRow = initMyPromiseRow();
    
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
    const nodeRow = $('<div></div>').addClass('row');
    const nodeCol = $('<div></div>').addClass('col');

    const row1 = $('<div></div>').addClass('row');
    const col1 = initPlayerTable(2, 'left', 10, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(3, 'right', 10, 5);

    const row2 = $('<div></div>').addClass('row');
    const col21 = initPlayerTable(1, 'left', 10, 5);

    const col22 = $('<div></div>').addClass('col-7');

    const playerCardRow1 = $('<div></div>').addClass('row');
    const playerCardCol11 = $('<div></div>').addClass('col-1'); // this is empty column
    const playerCardCol12 = $('<div></div>').addClass('col-2');
    playerCardCol12.append(myPlayedCardDiv(0));
    const playerCardCol13 = initPlayerTable(0, 'right', 10, 9);
    playerCardRow1.append(playerCardCol11);
    playerCardRow1.append(playerCardCol12);
    playerCardRow1.append(playerCardCol13);

    col22.append(playerCardRow1);
    col22.append(initMyPromiseRow());
    col22.append(initMyCardsContainer(10));

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);

    row2.append(col21);
    row2.append(col22);

    nodeCol.append(row1);
    nodeCol.append(row2);
    nodeRow.append(nodeCol);
    return nodeRow;
}

function initTableFor5() {
    console.log('initTableFor5');
    const nodeRow = $('<div></div>').addClass('row');
    const nodeCol = $('<div></div>').addClass('col');

    const row1 = $('<div></div>').addClass('row');
    const col1 = initPlayerTable(2, 'left', 10, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(3, 'right', 10, 5);

    const row2 = $('<div></div>').addClass('row');
    const col21 = initPlayerTable(1, 'left', 10, 5);

    const col22 = $('<div></div>').addClass('col-1');

    const col23 = $('<div></div>').addClass('col-1');
    const cardRow = $('<div></div>').addClass('row');
    const carCols = $('<div></div>').addClass('col cardCol');
    const cardRow0 = $('<div></div>').addClass('row');
    const carCols0 = $('<div></div>').addClass('col cardCol');
    
    const cardRow1 = $('<div></div>').addClass('row');
    const carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv(0));
    cardRow1.append(carCols1);
    cardRow.append(carCols);
    cardRow0.append(carCols0);
    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow1);

    const col24 = initPlayerTable(4, 'right', 10, 5);

    const row3 = $('<div></div>').addClass('row');
    const col31 = initPlayerTable(0, 'left', 10, 3);
    
    const col32 = $('<div></div>').addClass('col-9');
    const myCardsRow = initMyCardsContainer(10);
    
    const myPromiseRow = initMyPromiseRow();
    
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

function initTableFor6() {
    console.log('initTableFor6');
    const nodeRow = $('<div></div>').addClass('row');
    const nodeCol = $('<div></div>').addClass('col');

    const row1 = $('<div></div>').addClass('row');
    const col1 = initPlayerTable(2, 'left', 8, 5);
    const col2 = initTrumpTable();
    const col3 = initPlayerTable(3, 'right', 8, 5);

    const row2 = $('<div></div>').addClass('row');
    const col21 = initPlayerTable(1, 'left', 8, 5);

    const col22 = $('<div></div>').addClass('col-1');
    const cardRow221 = $('<div></div>').addClass('row');
    const carCols221 = $('<div></div>').addClass('col cardCol');
    const cardRow222 = $('<div></div>').addClass('row');
    const carCols222 = $('<div></div>').addClass('col cardCol');
    const cardRow1 = $('<div></div>').addClass('row');
    const carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv(0));
    cardRow1.append(carCols1);
    cardRow222.append(carCols222);
    cardRow221.append(carCols221);
    col22.append(cardRow221);
    col22.append(cardRow222);
    col22.append(cardRow1);

    const col23 = $('<div></div>').addClass('col-1');
    const cardRow = $('<div></div>').addClass('row');
    const carCols = $('<div></div>').addClass('col cardCol');
    const cardRow0 = $('<div></div>').addClass('row');
    const carCols0 = $('<div></div>').addClass('col cardCol');
    const cardRow23 = $('<div></div>').addClass('row');
    const carCols23 = $('<div></div>').addClass('col');
    carCols23.append(myPlayedCardDiv(5));
    cardRow23.append(carCols23);
    cardRow.append(carCols);
    cardRow0.append(carCols0);

    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow23);
    col23.append();

    const col24 = initPlayerTable(4, 'right', 8, 5);

    const row3 = $('<div></div>').addClass('row');
    const col31 = initPlayerTable(0, 'left', 8, 2);
    
    const col32 = $('<div></div>').addClass('col-5');
    const myCardsRow = initMyCardsContainer(8);
    
    const myPromiseRow = initMyPromiseRow();
    
    col32.append(myPromiseRow);
    col32.append(myCardsRow);

    const col33 = initPlayerTable(5, 'right', 8, 5);
    col33.append();

    row3.append(col31);
    row3.append(col32);
    row3.append(col33);

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

function initTrumpTable() {
    const nodeCol = $('<div></div>').addClass('col-2');

    const row1= $('<div></div>').addClass('row');
    const col11 = $('<div>Valtti</div>').addClass('col nameCol trumpNameCol');
    const row2= $('<div></div>').addClass('row');
    const col21 = $('<div id="trumpDiv"></div>').addClass('col cardCol trumpCardCol');
    const row3= $('<div></div>').addClass('row');
    const col31 = $('<div id="speedPromiseDiv"></div>').addClass('col speedPromiseCol');
    const row4= $('<div></div>').addClass('row');
    const col41 = $('<div id="totalPromiseInfo"></div>').addClass('col nameCol promisedTotalCol');
    row1.append(col11);
    row2.append(col21);
    row3.append(col31);
    row4.append(col41);
    
    nodeCol.append(row1);
    nodeCol.append(row2);
    nodeCol.append(row3);
    nodeCol.append(row4);
    
    return nodeCol;
}

function initPlayerTable(index, align, maxCards, colCount) {
    const nodeCol = $('<div id="playerTable'+index+'"></div>').addClass('col-'+colCount+' playerTableCol');

    const row1 = $('<div id="player'+index+'row"></div>').addClass('row');

    row1.append($('<div id="player'+index+'NameCol"></div>').addClass('col-3 nameCol playerNameCol'));
    row1.append($('<div id="player'+index+'Promised"></div>').addClass('col-3 playerInfoCol'));
    row1.append($('<div id="player'+index+'Keeps"></div>').addClass('col-2 playerInfoCol'));
    row1.append($('<div id="player'+index+'ProgressBar"></div>').addClass('col-4'));
    
    if (index > 0) {
        const row2 = $('<div></div>').addClass('row');
        for (var i = 0; i < maxCards; i++) {
            var classStr = 'col cardCol';
            if (i == 0) classStr+= ' firstCardCol';
            if (i == maxCards - 1) classStr+= ' lastCardCol';
            row2.append($('<div id="player'+index+'CardCol'+i+'"></div>').addClass(classStr));
        }
    }

    const row3 = $('<div></div>').addClass('row');
    col31 = $('<div></div>').addClass('col cardCol');
    col32 = $('<div></div>').addClass('col cardCol');

    const cardsWonRow = $('<div></div>').addClass('row inner-row');
    for (var i = 0; i < maxCards; i++) {
        const classStr = (i == 0) ? 'col cardCol firstCardCol' : 'col cardCol cardWonCol';
        cardsWonRow.append($('<div id="player'+index+'CardsWon'+i+'Div"></div>').addClass(classStr));
    }
    const playedCardRow = $('<div></div>').addClass('row inner-row');
    
    const statsCol = $('<div id="player'+index+'StatsCol"></div>').addClass('col');
    const statsRow1 = $('<div></div>').addClass('row');
    const statsCol1 = $('<div id="player'+index+'StatsCol1"></div>').addClass('col hand-value-col');
    const statsRow2 = $('<div></div>').addClass('row');
    const statsCol2 = $('<div id="player'+index+'StatsCol2"></div>').addClass('col stats-col');
    const statsRow3 = $('<div></div>').addClass('row');
    const statsCol3 = $('<div id="player'+index+'StatsCol3"></div>').addClass('col stats-col');

    statsRow1.append(statsCol1);
    statsRow2.append(statsCol2);
    statsRow3.append(statsCol3);
    statsCol.append(statsRow1);
    statsCol.append(statsRow2);
    statsCol.append(statsRow3);

    // where are promises and points aligned
    if (align == 'left') {
        playedCardRow.append(statsCol);
        if (index != 0 && index != 5) playedCardRow.append($('<div id="player'+index+'CardPlayedDiv"></div>').addClass('col cardCol playedCardCol'));
        col31.append(cardsWonRow);
        col32.append(playedCardRow);
    }
    if (align == 'right') {
        if (index != 0 && index != 5) playedCardRow.append($('<div id="player'+index+'CardPlayedDiv"></div>').addClass('col cardCol playedCardCol'));
        playedCardRow.append(statsCol);
        col31.append(playedCardRow);
        col32.append(cardsWonRow);
    }

    row3.append(col31);
    row3.append(col32);

    nodeCol.append(row1);
    if (index > 0) nodeCol.append(row2);
    nodeCol.append(row3);

    return nodeCol;
}

function myPlayedCardDiv(index) {
    const nodeRow = $('<div></div>').addClass('row');
    var classStr = 'col cardCol';
    if (index == 5) classStr+= ' firstCardCol';
    const nodeCol = $('<div id="player'+index+'CardPlayedDiv"></div>').addClass(classStr);
    nodeRow.append(nodeCol);
    return nodeRow;
}

function initCardTable(myRound) {
    const node = $('#otherPlayers');
    node.empty();

    const playerCount = myRound.players.length;
    if (playerCount == 3) node.append(initTableFor3());
    if (playerCount == 4) node.append(initTableFor4());
    if (playerCount == 5) node.append(initTableFor5());
    if (playerCount == 6) node.append(initTableFor6());
}

function initOtherPlayers(myRound) {
    myRound.players.forEach(function(player, idx) {
        $('#player'+otherPlayerMapper(idx, myRound.players)+'NameCol').html(player.name);
    });
}

function initMyCardsContainer(maxCards) {
    const node = $('<div></div>').addClass('row myCardsRowClass');
    
    for (var i = 0; i < maxCards; i++) {
        node.append(drawCardCol(i));
    }

    return node;
}

function drawCardCol(idx) {
    const cardCol = $('<div id="player0CardCol'+idx+'">&nbsp;</div>').addClass('col cardCol');
    return cardCol;
}

function initMyPromiseRow() {
    const node = $('<div id="myPromiseRow"></div>').addClass('row myCardsRowClass');
    const col2 = $('<div id="myPromiseCol"></div>').addClass('col promiseButtons');
    
    node.append(col2);

    return node;
}

function createPromiseTable(promiseTable) {
    const node = $('#promiseTable');
    const table = $('<table></table>');
    const tableHeader = $('<thead></thead>');
    const tableHeaderRow = $('<tr></tr>');
    
    tableHeaderRow.append($('<th scope="col"></th>').addClass('promiseTableHeader'));
    for (var i = 0; i < promiseTable.rounds.length; i++) {
        const tableHeaderCol = $('<th scope="col" id="promiseTableHeader'+i+'"></th>').addClass('promiseTableHeader').html(promiseTable.rounds[i].cardsInRound);
        tableHeaderRow.append(tableHeaderCol);
    }
    tableHeader.append(tableHeaderRow);

    const tableBody = $('<tbody></tbody>');
    for (var i = 0; i < promiseTable.promisesByPlayers.length; i++) {
        const tableBodyRow = $('<tr></tr>');
        const playerNameCol = $('<th id="player'+i+'PromiseName" scope="row"></th>').addClass('promiseTableCol playerPromiseNameCol').html(promiseTable.players[i]);
        tableBodyRow.append(playerNameCol);
        for (var j = 0; j < promiseTable.rounds.length; j++) {
            const promiseCol = $('<td id="player'+i+'Prom'+j+'"></td>').addClass('promiseTableCol playerPromiseCol');
            tableBodyRow.append(promiseCol);
        }
        
        tableBody.append(tableBodyRow);
    }
    table.append(tableHeader);
    table.append(tableBody);

    node.append(table);
}

function createScoreboard(promiseTable) {
    const node = $('#scoreboard');
    const table = $('<table></table>');
    const tableHeader = $('<thead></thead>');
    const tableHeaderRow = $('<tr></tr>');
    
    for (var i = 0; i < promiseTable.players.length; i++) {
        const playerName = promiseTable.players[i];
        var playerShortName = playerName;
        if (playerShortName.length > 3) playerShortName = playerShortName.substring(0, 3);
        const tableHeaderCol = $('<th id="tableHeaderName'+i+'" scope="col"></th>').addClass('scoreboardTableHeader').html(playerShortName);
        $(tableHeaderCol).tooltip({title: playerName});
        tableHeaderRow.append(tableHeaderCol);
    }
    tableHeader.append(tableHeaderRow);

    const tableBody = $('<tbody></tbody>');
    for (var i = 0; i < promiseTable.rounds.length; i++) {
        const tableBodyRow = $('<tr></tr>');
        for (var j = 0; j < promiseTable.players.length; j++) {
            const pointCol = $('<td id="player'+j+'Points'+i+'"></td>').addClass('scoreboardTableCol').html('&nbsp;');
            tableBodyRow.append(pointCol);
        }
        
        tableBody.append(tableBodyRow);
    }
    table.append(tableHeader);
    table.append(tableBody);

    node.append(table);
}

function initRuleList(gameInfo) {
    const node = $('#ruleList');
    node.empty();
    if (!gameInfo.evenPromisesAllowed) node.append($('<li></li>').text('no even promises'));
    if (!gameInfo.visiblePromiseRound) node.append($('<li></li>').text('hidden promise round'));
    if (gameInfo.onlyTotalPromise) node.append($('<li></li>').text('only total promise visible'));
    if (!gameInfo.freeTrump) node.append($('<li></li>').text('must play trump'));
    if (gameInfo.hiddenTrump) node.append($('<li></li>').text('hidden trump'));
    if (gameInfo.speedPromise) node.append($('<li></li>').text('speed promise'));
    if (gameInfo.privateSpeedGame) node.append($('<li></li>').text('speed game'));
    if (gameInfo.opponentPromiseCardValue) node.append($('<li></li>').text('hand value in promise'));
    if (gameInfo.opponentGameCardValue) node.append($('<li></li>').text('hand value in game'));
    if (gameInfo.hiddenCardsMode == 1) node.append($('<li></li>').text('show only card in charge'));
    if (gameInfo.hiddenCardsMode == 2) node.append($('<li></li>').text('show card in charge and winning card'));
}

function initSpeedBar(gameInfo) {
    const node = $('#speedPromiseDiv');
    if (gameInfo.privateSpeedGame || gameInfo.speedPromise) {
        if ($('#speedPromiseDiv').children().length == 0) {
            const progressMain = $('<div id="speedProgressBar"></div>').addClass('progress').css({marginTop: "4px", border: "1px solid black"});
            node.append(progressMain);
        }
    } else {
        node.empty();
    }
}
