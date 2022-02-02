function gamePlayersToStr(players, totalHumans, totalComputers, winnerName) {
    var retStr = '';
    players.forEach(function (player) {
        retStr+= (player.name == winnerName) ? '<strong>'+player.name + '</strong>, ' : player.name + ', ';
    });
    for (let i = players.length; i < totalHumans; i++) retStr+= '{}, ';
    if (retStr.length > 2) retStr = retStr.substring(0, retStr.length-2);
    if (totalComputers > 0) retStr+= ' (+'+totalComputers+')';
    return retStr;
}

function gamePlayersToDiv(players, totalHumans) {
    const retDiv = createElementWithIdAndClasses('div', null, 'row');
    const playerCol = createElementWithIdAndClasses('div', null, 'col');
    const playerList = createElementWithIdAndClasses('ul', null, 'list-unstyled');
    players.forEach(function (player) {
        const playerItem = createElementWithIdAndClasses('li', null, 'player-in-game-item');
        playerItem.innerText = player.name;
        playerList.appendChild(playerItem);
    });
    for (let i = players.length; i < totalHumans; i++) {
        const emptyPlayerItem = createElementWithIdAndClasses('li', null);
        emptyPlayerItem.innerText = '{}';
        playerList.appendChild(emptyPlayerItem);
    }
    playerCol.appendChild(playerList);
    retDiv.appendChild(playerCol);
    return retDiv;
}

// function color2(str) {
//     let rgb = [];
//     // Changing non-hexadecimal characters to 0
//     str = [...str].map(c => (/[0-9A-Fa-f]/g.test(c)) ? c : 0).join('');
//     // Padding string with zeroes until it adds up to 3
//     while (str.length % 3) str += '0';

//     // Dividing string into 3 equally large arrays
//     for (let i = 0; i < str.length; i += str.length / 3)
//         rgb.push(str.slice(i, i + str.length / 3));

//     // Formatting a hex color from the first two letters of each portion
//     return `#${rgb.map(string => string.slice(0, 2)).join('')}`;
// }

function increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

function colorize(str) {
    for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 3) - hash));
    const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16);
    return '#' + Array(6 - color.length + 1).join('0') + color;
}

function colorizeDatasets(datasets) {
    for (var i = 0; i < datasets.length; i++) {
        var dataset = datasets[i];

        dataset.accentColor = colorize(datasets[i].label);
        dataset.accentFadedColor = increase_brightness(colorize(datasets[i].label), 75);

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


function showCardsReport(reportObject) {
    const canvasIdStr = 'cardsByPlayerBody';
    const cardsOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
                max: reportObject.bigCards[0]+reportObject.otherCards[0]+reportObject.smallCards[0]+reportObject.trumps[0],
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
    const datasetsTrumpsData = {
        label: 'Trumps',
        data: reportObject.trumps,
        borderWidth: 1,
        backgroundColor: 'rgba(255,153,0,0.6)',
    };
    const datasetsBigsData = {
        label: 'Big cards',
        data: reportObject.bigCards,
        borderWidth: 1,
        backgroundColor: 'lightgreen',
    };
    const datasetsSmallsData = {
        label: 'Small cards',
        data: reportObject.smallCards,
        borderWidth: 1,
        backgroundColor: 'lightblue',
    };
    const datasetsOthersData = {
        label: 'Other cards',
        data: reportObject.otherCards,
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
    const cardsChart = new Chart(ctx, {
        type: 'bar',
        data: cardsData,
        options: cardsOptions,
    });
}

function getOneGameReport(gameId) {
    const reportModalEl = document.getElementById('oneGameReportModal');
    reportModalEl.addEventListener('shown.bs.modal', function() {
        const getReportObj = { gameId: gameId };
        socket.emit('get game report', getReportObj, function(gameReportData) {
            console.log(gameReportData);
            showOneGameReport(gameReportData);
            showOneKeepsReport(gameReportData);
            showOnePointsReport(gameReportData);
            showCardsReport(gameReportData);
        });
    });
    const bsModal = bootstrap.Modal.getOrCreateInstance(reportModalEl);
    bsModal.show();
}

function getCurrentRoundInd() {
    const roundIndStr = document.getElementById('currentRoundInd').value;
    if (roundIndStr != '') return parseInt(roundIndStr, 10);
    return null;
}

function emptyElementById(elId) {
    const el = document.getElementById(elId);
    if (el == null) return;
    while (el.firstChild)
        el.removeChild(el.firstChild);
}

function emptyElementByClass(className) {
    const els = document.getElementsByClassName(className);
    Array.prototype.forEach.call(els, function(el, i) {
        while (el.firstChild)
            el.removeChild(el.firstChild);
    });
}

function removeElementById(elName) {
    const el = document.getElementById(elName);
    if (el != null)
        el.parentNode.removeChild(el);
}

function disableButtonsByClass(btnClass, disabled) {
    const buttons = document.getElementsByClassName(btnClass);
    Array.prototype.forEach.call(buttons, function(el, i) {
        el.disabled = disabled;
    });
}

function createElementWithIdAndClasses(elType, elId, classes, opt) {
    const el = document.createElement(elType);
    if (elId != null)
        el.setAttribute('id', elId);
    if (classes !== undefined && classes !== null) {
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
    if (removeClass == undefined || removeClass == null || !removeClass) removeClass = searchClass;
    const els = document.getElementsByClassName(searchClass);
    Array.prototype.forEach.call(els, function(el, i) {
        el.classList.remove(removeClass);
    });
}

function removeEventByClass(className, eventName, functionName, removeClass) {
    const els = document.getElementsByClassName(className);
    Array.prototype.forEach.call(els, function(el, i) {
        el.removeEventListener(eventName, functionName, false);
        if (removeClass) el.classList.remove(className);
    });
}

function getSelectValue(selectName) {
    const sel = document.getElementById(selectName);
    return parseInt(sel.options[sel.selectedIndex].value, 10);
}

function showAlert(divId, alertId, alertText) {
    const alertContainer = document.getElementById(divId);
    const alertDiv = createElementWithIdAndClasses('div', alertId, 'alert alert-warning alert-dismissible fade show', { role: 'alert' });
    const alertCloseButton = createElementWithIdAndClasses('button', null, 'btn-close close-alert-button', { 'data-bs-dismiss': 'alert', 'aria-label': 'Close'  })

    alertDiv.innerText = alertText;
    alertDiv.appendChild(alertCloseButton);
    alertContainer.appendChild(alertDiv);
    new bootstrap.Alert(alertDiv);
}