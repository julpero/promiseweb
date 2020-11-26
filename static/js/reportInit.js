function initGameListEvent() {
    $('#chooseGameCollapse').on('shown.bs.collapse', function () {
        socket.emit('get games for report', {}, function (response) {
            console.log(response);
            showGames(response);
        });
    });

    $('#chooseGameCollapse').on('hidden.bs.collapse', function () {
        const node = document.getElementById('chooseGameCollapse');
        node.innerHTML = '';
    });
}

function initEvents() {
    initGameListEvent();
}

function mainInit() {
    initEvents();
    // initButtons();
}
