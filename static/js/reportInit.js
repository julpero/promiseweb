function initGameListEvent() {
    $('#chooseGameCollapse').on('shown.bs.collapse', function () {
        socket.emit('get games for report', {}, function (response) {
            showGames(response);
        });
    });

    $('#chooseGameCollapse').on('hidden.bs.collapse', function () {
        $('#chooseGameCollapse').empty();
    });
}

function initAverageEvent() {
    $('#averageReportCollapse').on('shown.bs.collapse', function () {
        socket.emit('get average report', {}, function (response) {
            showAverages(response);
        });
    });

    $('#averageReportCollapse').on('hidden.bs.collapse', function () {
        $('#averageReportCollapse').empty();
    });
}

function initEvents() {
    initGameListEvent();
    initAverageEvent();
}

function mainInit() {
    initEvents();
    // initButtons();
}
