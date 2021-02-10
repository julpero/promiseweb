function playedGamesGraph(reportData) {
    const canvasIdStr = 'playedGamesGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Games played by nickname',
            },
            legend: {
                display: false,
            },
        }
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push(reportData[i].count);
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'games played',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

function avgKeepPercentageGraph(reportData) {
    const canvasIdStr = 'avgKeepPercentageGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Average keep percentage by nickname',
            },
            legend: {
                display: false,
            },
        }
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((100*(reportData[i].avgKeepPercentage)).toFixed(1));
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'keep-%',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

function avgPointsGraph(reportData) {
    const canvasIdStr = 'avgPointsGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Average points per game by nickname',
            },
            legend: {
                display: false,
            },
        },
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((reportData[i].avgPoints).toFixed(1));
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'avg points',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

function totalPointsGraph(reportData) {
    const canvasIdStr = 'totalPointsGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Total points by nickname',
            },
            legend: {
                display: false,
            },
        },
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push(reportData[i].playersTotalPoints);
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'points',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

function totalWinsGraph(reportData) {
    const canvasIdStr = 'totalWinsGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Total wins by nickname',
            },
            legend: {
                display: false,
            },
        },
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push(reportData[i].playerTotalWins);
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'wins',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}


function winPercentagesGraph(reportData) {
    const canvasIdStr = 'winPercentagesGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Win percentages by nickname',
            },
            legend: {
                display: false,
            },
        },
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((100*reportData[i].winPercentage).toFixed(1));
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'win-%',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}


function avgPercentagePointsGraph(reportData) {
    const canvasIdStr = 'avgPercentagePointsGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Percentage of points by nickname to win the game',
            },
            legend: {
                display: false,
            },
        },
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((100*reportData[i].playerAvgPercentPoints).toFixed(1));
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'point-%',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}


function scoreGraph(reportData) {
    const canvasIdStr = 'scoreGraph';
    const graphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                }
            },
            y: {
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Score points by nickname',
            },
            legend: {
                display: false,
            },
        },
    };
    
    var labelsData = [];
    var valuesData = [];
    var datasetsData = [];
    var colors = [];

    for (var i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((reportData[i].playerAvgScorePoints).toFixed(3));
        colors.push(StringToColor.next(name));
    }
    datasetsData.push({
        label: 'points',
        data: valuesData,
        borderWidth: 1,
        backgroundColor: colors,
    });

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    var ctx = document.getElementById(canvasIdStr);
    var graphChart = new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}


function liveStatsGraph(reportData) {
    const statsRounds = reportData.rounds;
    const statsData = reportData.stats;
    const canvasIdStr = 'pointsLiveStatsGraph';

    if (liveGraphChart == null || $('#pointsLiveStats').children().length == 0) {
        console.log('create live graph canvas');
        var node = $('#pointsLiveStats');
        node.empty();
        var reportCanvas = $('<canvas id="'+canvasIdStr+'"></canvas>');
        node.append(reportCanvas);
    }

    
    var labelsData = [];
    var datasetsData = [];

    for (var i = 0; i < statsRounds; i++) {
        labelsData.push(i);
    }

    for (var i = 0; i < statsData.length; i++) {
        const name = statsData[i].name;
        var playerKeepPercentage = [];
        var playerAvgPoints = [];
            
        for (var j = 0; j < statsRounds; j++) {
            playerKeepPercentage.push(statsData[i] && statsData[i].stats[j] ? statsData[i].stats[j].kPerc : 0);
            playerAvgPoints.push(statsData[i] && statsData[i].stats[j] ? statsData[i].stats[j].avgPoints : 0);
        }
        const color = StringToColor.next(name);
        const color2 = StringToColor.next(name+'X');
        datasetsData.push({
            label: name + ' keep%',
            data: playerKeepPercentage,
            radius: 2,
            borderWidth: 1,
            borderColor: color,
            backgroundColor: color,
            yAxisID: 'yPercentages',
            tension: 0.2,
        });
        datasetsData.push({
            label: name + ' avgpoints',
            data: playerAvgPoints,
            pointStyle: 'cross',
            borderWidth: 1,
            borderColor: color,
            backgroundColor: color,
            yAxisID: 'yAvgs',
            tension: 0.2,
        });

    }

    const graphData = {
        labels: labelsData,
        datasets: datasetsData,
    };

    console.log(graphData);

    if (liveGraphChart == null) {
        const graphOptions = {
            indexAxis: 'x',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        beginAtZero: true,
                    }
                },
                yPercentages: {
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                    }
                },
                yAvgs: {
                    type: 'linear',
                    position: 'right',
                },
            },
            plugins: {
                title: {
                    display: false,
                    text: 'Score points by nickname',
                },
                legend: {
                    display: false,
                },
            },
        };

        var ctx = document.getElementById(canvasIdStr);
        liveGraphChart = new Chart(ctx, {
            type: 'line',
            data: graphData,
            options: graphOptions,
        });
    } else {
        liveGraphChart.options.animation = false
        liveGraphChart.data = graphData;
        liveGraphChart.update();
    }

}

