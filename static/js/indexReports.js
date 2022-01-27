// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push(reportData[i].count);
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((100*(reportData[i].avgKeepPercentage)).toFixed(1));
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((reportData[i].avgPoints).toFixed(1));
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push(reportData[i].playersTotalPoints);
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push(reportData[i].playerTotalWins);
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((100*reportData[i].winPercentage).toFixed(1));
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((100*reportData[i].playerAvgPercentPoints).toFixed(1));
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cardsInHandGraph(reportData) {
    const canvasIdStr = 'cardsInHandGraph';
    const cardsOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
                max: 100,
                min: 0,
            },
            y: {
                stacked: true,
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Cards in game by nickname'
            },
            tooltip: {
                callbacks: {
                    afterTitle: function(context) {
                        let totalKeeps = 0;
                        context.forEach(function (row) {
                            totalKeeps+= row.raw;
                        });
                        return 'Total: '+totalKeeps;
                    }
                }
            }
        }
    };
    
    const labelsData = [];
    const trumpData = [];
    const bigData = [];
    const smallData = [];
    const otherData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        trumpData.push((100*reportData[i].trumpPercentage).toFixed(1));
        bigData.push((100*reportData[i].bigPercentage).toFixed(1));
        smallData.push((100*reportData[i].smallPercentage).toFixed(1));
        otherData.push((100*reportData[i].otherPercentage).toFixed(1));
        colors.push(colorize(name));
    }
    const datasetsTrumpsData = {
        label: 'Trumps',
        data: trumpData,
        borderWidth: 1,
        backgroundColor: 'rgba(255,153,0,0.6)',
    };
    const datasetsBigsData = {
        label: 'Big cards',
        data: bigData,
        borderWidth: 1,
        backgroundColor: 'lightgreen',
    };
    const datasetsSmallsData = {
        label: 'Small cards',
        data: smallData,
        borderWidth: 1,
        backgroundColor: 'lightblue',
    };
    const datasetsOthersData = {
        label: 'Other cards',
        data: otherData,
        borderWidth: 1,
        backgroundColor: 'lightyellow',
    };

    const cardsData = {
        labels: labelsData,
        datasets:[datasetsTrumpsData, datasetsBigsData, datasetsSmallsData, datasetsOthersData],
    };


    Chart.helpers.each(Chart.instances, function(instance){
        if (instance.canvas.id == canvasIdStr) instance.destroy();
    });

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: cardsData,
        options: cardsOptions,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    
    const labelsData = [];
    const valuesData = [];
    const datasetsData = [];
    const colors = [];

    for (let i = 0; i < reportData.length; i++) {
        const name = reportData[i]._id;
        labelsData.push(name);
        valuesData.push((reportData[i].playerAvgScorePoints).toFixed(3));
        colors.push(colorize(name));
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

    const ctx = document.getElementById(canvasIdStr);
    new Chart(ctx, {
        type: 'bar',
        data: graphData,
        options: graphOptions,
    });
}
