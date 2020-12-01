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


function showOneGameReport(reportObject) {
    var reportIdName = 'oneGameReportBody';
    var reportData = new google.visualization.DataTable();
    reportData.addColumn('number', 'Round');
    reportObject.players.forEach(function(player) {
        reportData.addColumn('number', player);
    });
    reportData.addRows(reportObject.points);

    var options = {
        height: 500,
        width: 1000,
        legend: { position: 'right' },
        chart: {
            title: 'Points in game',
            subtitle: 'cumulative points per round',
        },
        axes: {
            x: {
                0: { side: 'bottom', label: 'Round'}
            }
        },
    };
    var chart = new google.charts.Line(document.getElementById(reportIdName));
    chart.draw(reportData, google.charts.Line.convertOptions(options));
}

function showOneKeepsReport(reportObject) {
    var reportIdName = 'oneGameKeepsBody';
    var reportDataArr = [['Name', 'Keeps']];
    for (var i = 0; i < reportObject.players.length; i++) {
        reportDataArr.push([reportObject.players[i], reportObject.keeps[i]]);
    }
    var reportData = new google.visualization.arrayToDataTable(reportDataArr);
    var options = {
        height: 200,
        width: 1000,
        legend: { position: 'none' },
        chart: {
            title: 'Keeps in game',
            subtitle: 'number of keeps by nickname',
        },
        bar: { groupWidth: "80%" },
        bars: 'horizontal',
    };
    var chart = new google.charts.Bar(document.getElementById(reportIdName));
    chart.draw(reportData, google.charts.Bar.convertOptions(options));
}

function getOneGameReport(gameId) {
    var getReportObj = { gameId: gameId };
    socket.emit('get game report', getReportObj, function(gameReportData) {
        console.log(gameReportData);
        showOneGameReport(gameReportData);
        showOneKeepsReport(gameReportData);
        $('#oneGameReportModal').modal('toggle');
    });
}
