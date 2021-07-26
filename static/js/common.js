function gamePlayersToStr(players, totalHumans, totalComputers, winnerName) {
    var retStr = '';
    players.forEach(function (player) {
        retStr+= (player.name == winnerName) ? '<strong>'+player.name + '</strong>, ' : player.name + ', ';
    });
    for (i = players.length; i < totalHumans; i++) retStr+= '{}, ';
    if (retStr.length > 2) retStr = retStr.substring(0, retStr.length-2);
    if (totalComputers > 0) retStr+= ' (+'+totalComputers+')';
    return retStr;
}

// --- //
// Takes any string and converts it into a #RRGGBB color.
var StringToColor = (function(){
    var instance = null;

    return {
    next: function stringToColor(str) {
        if(instance === null) {
            instance = {};
            instance.stringToColorHash = {};
            instance.nextVeryDifferntColorIdx = 0;
            instance.veryDifferentColors = ["#000000","#00FF00","#0000FF","#FF0000","#01FFFE","#FFA6FE","#FFDB66","#006401","#010067","#95003A","#007DB5","#FF00F6","#FFEEE8","#774D00","#90FB92","#0076FF","#D5FF00","#FF937E","#6A826C","#FF029D","#FE8900","#7A4782","#7E2DD2","#85A900","#FF0056","#A42400","#00AE7E","#683D3B","#BDC6FF","#263400","#BDD393","#00B917","#9E008E","#001544","#C28C9F","#FF74A3","#01D0FF","#004754","#E56FFE","#788231","#0E4CA1","#91D0CB","#BE9970","#968AE8","#BB8800","#43002C","#DEFF74","#00FFC6","#FFE502","#620E00","#008F9C","#98FF52","#7544B1","#B500FF","#00FF78","#FF6E41","#005F39","#6B6882","#5FAD4E","#A75740","#A5FFD2","#FFB167","#009BFF","#E85EBE"];
        }

        if(!instance.stringToColorHash[str])
            instance.stringToColorHash[str] = instance.veryDifferentColors[instance.nextVeryDifferntColorIdx++];

            return instance.stringToColorHash[str];
        }
    }
})();

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
    const annotations = reportObject.smallStart == null && reportObject.smallEnd == null ? [] : [
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
    ];
    
    const pointsOptions = {
        responsive: true,
        maintainAspectRatio: false,
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
                annotations: annotations,
            }
        }
    };
    
    const labelsData = reportObject.rounds;

    const datasetsData = [];
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

    const ctx = document.getElementById(canvasIdStr);
    const pointsChart = new Chart(ctx, {
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
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
                max: reportObject.rounds.length-1,
                min: 0,
            },
            y: {
                stacked: true,
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Keeps in game by nickname'
            },
            tooltip: {
                callbacks: {
                    afterTitle: function(context) {
                        var totalKeeps = 0;
                        context.forEach(function (row) {
                            totalKeeps+= row.raw;
                        });
                        return 'Total: '+totalKeeps;
                    }
                }
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

    const ctx = document.getElementById(canvasIdStr);
    const keepChart = new Chart(ctx, {
        type: 'bar',
        data: keepsData,
        options: keepsOptions,
    });
}

function showOnePointsReport(reportObject) {
    const canvasIdStr = 'oneGamePointsBody';
    const pointsOptions = {
        responsive: true,
        maintainAspectRatio: false,
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
            },
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    afterTitle: function(context) {
                        var totalPoints = 0;
                        context.forEach(function (row) {
                            totalPoints+= row.raw;
                        });
                        return 'Total: '+totalPoints;
                    }
                }
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

    const ctx = document.getElementById(canvasIdStr);
    const pointsChart = new Chart(ctx, {
        type: 'bar',
        data: pointsData,
        options: pointsOptions,
    });
}

function getOneGameReport(gameId) {
    document.getElementById('oneGameReportModal').off('shown.bs.modal');
    document.getElementById('oneGameReportModal').addEventListener('shown.bs.modal', function() {
        const getReportObj = { gameId: gameId };
        socket.emit('get game report', getReportObj, function(gameReportData) {
            console.log(gameReportData);
            showOneGameReport(gameReportData);
            showOneKeepsReport(gameReportData);
            showOnePointsReport(gameReportData);
        });
    });
    document.getElementById('oneGameReportModal').modal('show');
}

function emptyElementById(elId) {
    let el = document.getElementById(elId);
    if (el == null) return;
    while (el.firstChild)
        el.removeChild(el.firstChild);
}

function emptyElementByClass(className) {
    let els = document.getElementsByClassName(className);
    Array.prototype.forEach.call(els, function(el, i) {
        while (el.firstChild)
            el.removeChild(el.firstChild);
    });
}

function removeElementById(elName) {
    let el = document.getElementById(elName);
    if (el != null)
        el.parentNode.removeChild(el);
}

function setValidPromiseButtons(disabled) {
    let validPromiseButtons = document.getElementsByClassName('validPromiseButton');
    Array.prototype.forEach.call(validPromiseButtons, function(el, i) {
        el.disabled = disabled;
    });
}

function createElementWithIdAndClasses(elType, elId, classes, opt) {
    const el = document.createElement(elType);
    if (elId != null)
        el.setAttribute('id', elId);
    if (classes !== undefined) {
        const classArr = classes.split(' ');
        Array.prototype.forEach.call(classArr, function(classStr, i) {
            el.classList.add(classStr);
        });
    }

    if (opt !== undefined) {
        for (const [key, value] of Object.entries(opt)) {
            el.setAttribute(key, value);
        }
    }
    return el;
}

function removeClassByClass(searchClass, removeClass) {
    if (removeClass == undefined) removeClass = searchClass;
    const els = document.getElementsByClassName(searchClass);
    Array.prototype.forEach.call(els, function(el, i) {
        el.classList.remove(removeClass);
    });
}

function removeEventByClass(className, eventName, functionName) {
    const els = document.getElementsByClassName(className);
    Array.prototype.forEach.call(els, function(el, i) {
        el.removeEventListener(eventName, functionName, false);
    });
}
