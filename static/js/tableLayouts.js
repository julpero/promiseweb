
function initTableFor3() {
    console.log('initTableFor3');
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-5');
    col1.append(initPlayerTable(1, 'left', 10));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());
    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(2, 'right', 10));

    row1.append(col1);
    row1.append(col2);
    row1.append(col3);

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-6');
    var col22 = $('<div></div>').addClass('col-2');
    col22.append(myPlayedCardDiv(0));
    var col23 = $('<div></div>').addClass('col-4');
    
    row2.append(col21);
    row2.append(col22);
    row2.append(col23);

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-3');
    col31.append(initPlayerTable(0, 'left', 10));
    
    var col32 = $('<div></div>').addClass('col-9');
    var myCardsRow = initMyCardsContainer(10);
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
    col1.append(initPlayerTable(2, 'left', 10));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());

    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(3, 'right', 10));

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-5');
    col21.append(initPlayerTable(1, 'left', 10));

    var col22 = $('<div></div>').addClass('col-1');

    var col23 = $('<div></div>').addClass('col-1');
    var cardRow = $('<div></div>').addClass('row');
    var carCols = $('<div></div>').addClass('col cardCol');
    var cardRow0 = $('<div></div>').addClass('row');
    var carCols0 = $('<div></div>').addClass('col cardCol');
    
    var cardRow1 = $('<div></div>').addClass('row');
    var carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv(0));
    cardRow1.append(carCols1);
    cardRow.append(carCols);
    cardRow0.append(carCols0);
    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow1);

    var col24 = $('<div></div>').addClass('col-5');

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-3');
    col31.append(initPlayerTable(0, 'left', 10));
    
    var col32 = $('<div></div>').addClass('col-9');
    var myCardsRow = initMyCardsContainer(10);
    
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
    console.log('initTableFor5');
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-5');
    col1.append(initPlayerTable(2, 'left', 10));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());

    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(3, 'right', 10));

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-5');
    col21.append(initPlayerTable(1, 'left', 10));

    var col22 = $('<div></div>').addClass('col-1');

    var col23 = $('<div></div>').addClass('col-1');
    var cardRow = $('<div></div>').addClass('row');
    var carCols = $('<div></div>').addClass('col cardCol');
    var cardRow0 = $('<div></div>').addClass('row');
    var carCols0 = $('<div></div>').addClass('col cardCol');
    
    var cardRow1 = $('<div></div>').addClass('row');
    var carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv(0));
    cardRow1.append(carCols1);
    cardRow.append(carCols);
    cardRow0.append(carCols0);
    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow1);

    var col24 = $('<div></div>').addClass('col-5');
    col24.append(initPlayerTable(4, 'right', 10));

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-3');
    col31.append(initPlayerTable(0, 'left', 10));
    
    var col32 = $('<div></div>').addClass('col-9');
    var myCardsRow = initMyCardsContainer(10);
    
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

function initTableFor6() {
    console.log('initTableFor6');
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1 = $('<div></div>').addClass('row');
    var col1 = $('<div></div>').addClass('col-5');
    col1.append(initPlayerTable(2, 'left', 8));
    var col2 = $('<div></div>').addClass('col-2');
    col2.append(initTrumpTable());

    var col3 = $('<div></div>').addClass('col-5');
    col3.append(initPlayerTable(3, 'right', 8));

    var row2 = $('<div></div>').addClass('row');
    var col21 = $('<div></div>').addClass('col-5');
    col21.append(initPlayerTable(1, 'left', 8));

    var col22 = $('<div></div>').addClass('col-1');
    var cardRow221 = $('<div></div>').addClass('row');
    var carCols221 = $('<div></div>').addClass('col cardCol');
    var cardRow222 = $('<div></div>').addClass('row');
    var carCols222 = $('<div></div>').addClass('col cardCol');
    var cardRow1 = $('<div></div>').addClass('row');
    var carCols1 = $('<div></div>').addClass('col');
    carCols1.append(myPlayedCardDiv(0));
    cardRow1.append(carCols1);
    cardRow222.append(carCols222);
    cardRow221.append(carCols221);
    col22.append(cardRow221);
    col22.append(cardRow222);
    col22.append(cardRow1);

    var col23 = $('<div></div>').addClass('col-1');
    var cardRow = $('<div></div>').addClass('row');
    var carCols = $('<div></div>').addClass('col cardCol');
    var cardRow0 = $('<div></div>').addClass('row');
    var carCols0 = $('<div></div>').addClass('col cardCol');
    var cardRow23 = $('<div></div>').addClass('row');
    var carCols23 = $('<div></div>').addClass('col');
    carCols23.append(myPlayedCardDiv(5));
    cardRow23.append(carCols23);
    cardRow.append(carCols);
    cardRow0.append(carCols0);

    col23.append(cardRow);
    col23.append(cardRow0);
    col23.append(cardRow23);
    col23.append();

    var col24 = $('<div></div>').addClass('col-5');
    col24.append(initPlayerTable(4, 'right', 8));

    var row3 = $('<div></div>').addClass('row');
    var col31 = $('<div></div>').addClass('col-2');
    col31.append(initPlayerTable(0, 'left', 8));
    
    var col32 = $('<div></div>').addClass('col-5');
    var myCardsRow = initMyCardsContainer(8);
    
    var myPromiseRow = initMyPromiseRow();
    
    col32.append(myPromiseRow);
    col32.append(myCardsRow);

    var col33 = $('<div></div>').addClass('col-5');
    col33.append(initPlayerTable(5, 'right', 8));

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
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col');

    var row1= $('<div></div>').addClass('row');
    var col11 = $('<div>Valtti</div>').addClass('col nameCol trumpNameCol');
    var row2= $('<div></div>').addClass('row');
    var col21 = $('<div id="trumpDiv"></div>').addClass('col cardCol trumpCardCol');
    row1.append(col11);
    row2.append(col21);
    
    nodeCol.append(row1);
    nodeCol.append(row2);
    
    nodeRow.append(nodeCol);

    return nodeRow;
}

function initPlayerTable(index, align, maxCards) {
    var nodeRow = $('<div></div>').addClass('row');
    var nodeCol = $('<div></div>').addClass('col playerTableCol');

    var row1 = $('<div id="player'+index+'row"></div>').addClass('row');
    var col1 = $('<div id="player'+index+'NameCol"></div>').addClass('col nameCol playerNameCol');
    row1.append(col1);
    row1.append($('<div id="player'+index+'Promised"></div>').addClass('col'));
    row1.append($('<div id="player'+index+'Keeps"></div>').addClass('col'));
    
    if (index > 0) {
        var row2 = $('<div></div>').addClass('row');
        for (var i = 0; i < maxCards; i++) {
            var classStr = 'col cardCol';
            if (i == 0) classStr+= ' firstCardCol';
            if (i == maxCards - 1) classStr+= ' lastCardCol';
            row2.append($('<div id="player'+index+'CardCol'+i+'"></div>').addClass(classStr));
        }
    }

    var row3 = $('<div></div>').addClass('row');
    col31 = $('<div></div>').addClass('col cardCol');
    col32 = $('<div></div>').addClass('col cardCol');

    var cardsWonRow = $('<div></div>').addClass('row');
    for (var i = 0; i < maxCards; i++) {
        var classStr = (i == 0) ? 'col cardCol firstCardCol' : 'col cardCol cardWonCol';
        cardsWonRow.append($('<div id="player'+index+'CardsWon'+i+'Div"></div>').addClass(classStr));
    }
    var playedCardRow = $('<div></div>').addClass('row');
    
    // where are promises and points aligned
    if (align == 'left') {
        playedCardRow.append($('<div id="player'+index+'Thinking"></div>').addClass('col'));
        if (index != 0 && index != 5) playedCardRow.append($('<div id="player'+index+'CardPlayedDiv"></div>').addClass('col cardCol playedCardCol'));
        col31.append(cardsWonRow);
        col32.append(playedCardRow);
    }
    if (align == 'right') {
        if (index != 0 && index != 5) playedCardRow.append($('<div id="player'+index+'CardPlayedDiv"></div>').addClass('col cardCol playedCardCol'));
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

function myPlayedCardDiv(index) {
    var nodeRow = $('<div></div>').addClass('row');
    var classStr = 'col cardCol';
    if (index == 5) classStr+= ' firstCardCol';
    var nodeCol = $('<div id="player'+index+'CardPlayedDiv"></div>').addClass(classStr);
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
    if (playerCount == 6) node.append(initTableFor6());
}

function initOtherPlayers(myRound) {
    myRound.players.forEach(function(player, idx) {
        if (!player.thisIsMe || true) {
            $('#player'+otherPlayerMapper(idx, myRound.players)+'NameCol').html(player.name);
        }
    });
}
