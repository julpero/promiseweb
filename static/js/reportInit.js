function initGameListEvent() {
    const chooseGameCollapseEl = document.getElementById('chooseGameCollapse');
    if (chooseGameCollapseEl != null) {
        chooseGameCollapseEl.addEventListener('shown.bs.collapse', function () {
            socket.emit('get games for report', { isSecure: false }, function (response) {
                showGames(response.data);
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
            const getGamesObj = {
                isSecure: true,
                adminUser: document.getElementById('adminUser').value,
                adminPass: document.getElementById('adminPass').value
            }
            socket.emit('get games for report', getGamesObj, function (response) {
                emptyElementById('chooseNickGameCollapse');
                emptyElementById('alertDiv');
                if (response.passOk) {
                    showNickChanger(response.data);
                } else {
                    console.error('Authentication error');
                    showAlert('alertDiv', 'authAlertDiv', 'Authentication error');
                    emptyElementById('chooseNickGameCollapse');
                    bootstrap.Collapse.getInstance(document.getElementById('chooseNickGameCollapse')).hide();
                }
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mainReportInit() {
    initEvents();
    enableButtons();
}
