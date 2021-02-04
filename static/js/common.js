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

function steppedHslColor(ratio, alpha) {
    return "hsla(" + 360 * ratio + ', 60%, 55%, ' + alpha + ')';
}

function colorizeDatasets(datasets) {
    for (var i = 0; i < datasets.length; i++) {
        var dataset = datasets[i];

        dataset.accentColor = steppedHslColor(i / datasets.length, 1);
        dataset.accentFadedColor = steppedHslColor(i / datasets.length, 0.2);

        dataset.borderColor = dataset.accentColor;
    }
    return datasets;
}

function showOneGameReport(reportObject) {
    const canvasIdStr = 'oneGameReportBody';
    const pointsOptions = {
        'scales': {
            'xAxes': [{
                'ticks': {
                    'beginAtZero': true
                }
            }]
        },
        'title': {
            display: true,
            text: 'Cumulative points in game per round'
        },
        tooltips: {
            mode: 'index',
            intersect: false,
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        legend: {
            onHover: function(e, legendItem) {
                if (pointsChart.hoveringLegendIndex != legendItem.datasetIndex) {
                    pointsChart.hoveringLegendIndex = legendItem.datasetIndex;
                    for (var i = 0; i < pointsChart.data.datasets.length; i++) {
                        var dataset = pointsChart.data.datasets[i];
                        if (i == legendItem.datasetIndex) {
                            dataset.borderColor = dataset.accentColor;
                        } else {
                            dataset.borderColor = dataset.accentFadedColor;
                        }
                    }
                    pointsChart.update();
                }
            }
        },
    };
    
    const labelsData = reportObject.rounds;

    var datasetsData = [];
    for (var i = 0; i < reportObject.players.length; i++) {
        datasetsData.push({
            label: reportObject.players[i],
            data: reportObject.points[i],
            borderWidth: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            lineTension: 0,
            borderWidth: 3,
        });
    }
    colorizeDatasets(datasetsData);

    var pointsData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.chart.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var pointsChart = new Chart(ctx, {
        type: 'line',
        data: pointsData,
        options: pointsOptions,
    });

    pointsChart.hoveringLegendIndex = -1;
    pointsChart.canvas.addEventListener('mousemove', function(e) {
        if (pointsChart.hoveringLegendIndex >= 0) {
            if (e.layerX < pointsChart.legend.left || pointsChart.legend.right < e.layerX || e.layerY < pointsChart.legend.top || pointsChart.legend.bottom < e.layerY) {
                pointsChart.hoveringLegendIndex = -1;
                for (var i = 0; i < pointsChart.data.datasets.length; i++) {
                    var dataset = pointsChart.data.datasets[i];
                    dataset.borderColor = dataset.accentColor;
                }
                pointsChart.update();
            }
        }
    });
}

function showOneKeepsReport(reportObject) {
    const canvasIdStr = 'oneGameKeepsBody';
    const keepsOptions = {
        'scales': {
            'xAxes': [{
                'ticks': {
                    'beginAtZero': true
                }
            }]
        },
        'title': {
            display: true,
            text: 'Keeps in game by nickname'
        }
    };
    
    const labelsData = reportObject.players;
    const datasets1Data = {
        label: 'All',
        data: reportObject.keeps,
        borderWidth: 1,
        backgroundColor: 'rgba(66,133,244,1.0)',
    };
    const datasets2Data = {
        label: 'Big rounds',
        data: reportObject.keepsBig,
        borderWidth: 1,
        backgroundColor: 'rgba(255,153,0,0.6)',
    };
    const datasets3Data = {
        label: 'Small rounds',
        data: reportObject.keepsSmall,
        borderWidth: 1,
        backgroundColor: 'rgba(255,0,0,0.6)',
    };

    const keepsData = {
        labels: labelsData,
        datasets:[datasets1Data, datasets2Data, datasets3Data],
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.chart.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var keepChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: keepsData,
        options: keepsOptions,
    });
}

function getOneGameReport(gameId) {
    $('#oneGameReportModal').off('shown.bs.modal');
    $('#oneGameReportModal').on('shown.bs.modal', function() {
        var getReportObj = { gameId: gameId };
        socket.emit('get game report', getReportObj, function(gameReportData) {
            console.log(gameReportData);
            showOneGameReport(gameReportData);
            showOneKeepsReport(gameReportData);
        });
    });
    $('#oneGameReportModal').modal('show');
}
