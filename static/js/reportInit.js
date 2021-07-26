function initGameListEvent() {
    document.getElementById('chooseGameCollapse').addEventListener('shown.bs.collapse', function () {
        socket.emit('get games for report', {}, function (response) {
            showGames(response);
        });
    });

    document.getElementById('chooseGameCollapse').addEventListener('hidden.bs.collapse', function () {
        emptyElementById('chooseGameCollapse');
    });
}

function initAverageEvent() {
    document.getElementById('averageReportCollapse').addEventListener('shown.bs.collapse', function () {
        socket.emit('get average report', {}, function (response) {
            showAverages(response);
        });
    });

    document.getElementById('averageReportCollapse').addEventListener('hidden.bs.collapse', function () {
        emptyElementById('averageReportCollapse');
    });
}

function initNickChangeEvent() {
    document.getElementById('chooseNickGameCollapse').addEventListener('shown.bs.collapse', function () {
        socket.emit('get games for report', {}, function (response) {
            showNickChanger(response);
        });
    });

    document.getElementById('chooseNickGameCollapse').addEventListener('hidden.bs.collapse', function () {
        emptyElementById('chooseNickGameCollapse');
    });
}

function initUpdateAllButton() {
    document.getElementById('updateAllGameReportsButton').addEventListener('click', function() {
        if (window.confirm('Are you sure you wan\'t to update ALL game reports?')) {
            socket.emit('update all game reports', {}, function (response) {
                console.log(response);
            });
        }
    });
}

function initEvents() {
    initGameListEvent();
    initAverageEvent();
    initNickChangeEvent();
    initUpdateAllButton();
}

function enableButtons() {
    $('.report-button').classList.remove('disabled');
}

function mainInit() {
    initEvents();
    enableButtons();
}
