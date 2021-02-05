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
        scales: {
            x: {
                ticks: {
                    beginAtZero: true
                }
            }
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        plugins: {
            title: {
                display: true,
                text: 'Cumulative points in game per round'
            },
            tooltip: {
                mode: 'index',
                intersect: false,
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
            annotation: {
                annotations: [
                    {
                        type: 'box',
                        drawTime: 'beforeDatasetsDraw',
                        display: true,
                        xScaleID: 'x',
                        yScaleID: 'y',
                        xMin: reportObject.smallStart,
                        xMax: reportObject.smallEnd,
                        borderColor: 'lightgreen',
                        borderWidth: 1,
                        backgroundColor: '#E5FFE5',
                    }
                ]
            }
        }
    };
    
    const labelsData = reportObject.rounds;

    var datasetsData = [];
    for (var i = 0; i < reportObject.players.length; i++) {
        datasetsData.push({
            label: reportObject.players[i],
            data: reportObject.points[i],
            fill: 'origin',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            lineTension: 0,
            borderWidth: 3,
            hoverBorderWidth: 5,
        });
    }
    colorizeDatasets(datasetsData);

    const pointsData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
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
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
                ticks: {
                    beginAtZero: true
                }
            },
            y: {
                stacked: true,
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Keeps in game by nickname'
            }
        }
    };
    
    const labelsData = reportObject.players;
    const datasetsBigData = {
        label: 'Big rounds',
        data: reportObject.keepsBig,
        borderWidth: 1,
        backgroundColor: 'rgba(255,153,0,0.6)',
    };
    const datasetsSmallData = {
        label: 'Small rounds',
        data: reportObject.keepsSmall,
        borderWidth: 1,
        backgroundColor: 'lightgreen',
    };

    const keepsData = {
        labels: labelsData,
        datasets:[datasetsBigData, datasetsSmallData],
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var keepChart = new Chart(ctx, {
        type: 'bar',
        data: keepsData,
        options: keepsOptions,
    });
}

function showOnePointsReport(reportObject) {
    const canvasIdStr = 'oneGamePointsBody';
    const pointsOptions = {
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
                ticks: {
                    beginAtZero: true
                }
            },
            y: {
                stacked: true,
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Points in game by nickname'
            }
        }
    };
    
    const labelsData = reportObject.players;
    const datasetsBigData = {
        label: 'Big rounds',
        data: reportObject.pointsBig,
        borderWidth: 1,
        backgroundColor: 'rgba(255,153,0,0.6)',
    };
    const datasetsSmallData = {
        label: 'Small rounds',
        data: reportObject.pointsSmall,
        borderWidth: 1,
        backgroundColor: 'lightgreen',
    };

    const pointsData = {
        labels: labelsData,
        datasets:[datasetsBigData, datasetsSmallData],
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var pointsChart = new Chart(ctx, {
        type: 'bar',
        data: pointsData,
        options: pointsOptions,
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
            showOnePointsReport(gameReportData);
        });
    });
    $('#oneGameReportModal').modal('show');
}
