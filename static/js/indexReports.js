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

