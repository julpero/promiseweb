function initGameListEvent() {
    const chooseGameCollapseEl = document.getElementById('chooseGameCollapse');
    if (chooseGameCollapseEl != null) {
        chooseGameCollapseEl.addEventListener('shown.bs.collapse', function () {
            socket.emit('get games for report', {}, function (response) {
                showGames(response);
            });
            chooseGameCollapseEl.addEventListener('hidden.bs.collapse', function () {
                emptyElementById('chooseGameCollapse');
            });
        });
    }
}

function initAverageEvent() {
    const averageReportCollapseEl = document.getElementById('averageReportCollapse');
    if (averageReportCollapseEl != null) {
        averageReportCollapseEl.addEventListener('shown.bs.collapse', function () {
            socket.emit('get average report', {}, function (response) {
                showAverages(response);
            });
        });
    
        averageReportCollapseEl.addEventListener('hidden.bs.collapse', function () {
            emptyElementById('averageReportCollapse');
        });
    }
}

function initNickChangeEvent() {
    const chooseNickGameCollapseEl = document.getElementById('chooseNickGameCollapse');
    if (chooseNickGameCollapseEl != null) {
        chooseNickGameCollapseEl.addEventListener('shown.bs.collapse', function () {
            socket.emit('get games for report', {}, function (response) {
                showNickChanger(response);
            });
        });
    
        chooseNickGameCollapseEl.addEventListener('hidden.bs.collapse', function () {
            emptyElementById('chooseNickGameCollapse');
        });
    }
}

function initUpdateAllButton() {
    const updateAllGameReportsButtonEl = document.getElementById('updateAllGameReportsButton');
    if (updateAllGameReportsButtonEl != null) {
        updateAllGameReportsButtonEl.addEventListener('click', function() {
            if (window.confirm('Are you sure you wan\'t to update ALL game reports?')) {
                socket.emit('update all game reports', {}, function (response) {
                    console.log(response);
                });
            }
        });
    }
}

function initEvents() {
    initGameListEvent();
    initAverageEvent();
    initNickChangeEvent();
    initUpdateAllButton();
}

function enableButtons() {
    disableButtonsByClass('report-button', false);
    removeClassByClass('report-button', 'disabled');
}

function mainInit() {
    initEvents();
    enableButtons();
}
