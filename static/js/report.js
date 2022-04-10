function showNickChanger(gameList) {
    const gameListContainer = document.getElementById('chooseNickGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row game-container-div');
        const gamePlayers = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-4 report-players');
        gamePlayers.innerHTML = gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, null)+showErrorNames(game.playerNameErrors);
        gameContainerDiv.appendChild(gamePlayers);

        const oldNameCol = createElementWithIdAndClasses('div', null, 'col-2');
        const oldNameInput = createElementWithIdAndClasses('input', 'oldName'+game.id, 'oldNameInput', { type: 'text' });
        const newNameCol = createElementWithIdAndClasses('div', null, 'col-2');
        const newNameInput = createElementWithIdAndClasses('input', 'newName'+game.id, 'newNameInput', { type: 'text' });
        oldNameCol.appendChild(oldNameInput);
        gameContainerDiv.appendChild(oldNameCol);
        newNameCol.appendChild(newNameInput);
        gameContainerDiv.appendChild(newNameCol);

        const changeNameButton = createElementWithIdAndClasses('button', 'changeNick' + game.id, 'btn btn-primary change-nick-button', { value: game.id });
        changeNameButton.innerText = 'Change';
        changeNameButton.addEventListener('click', function() {
            console.log(this.value);
            const oldName = document.getElementById('oldName'+this.value).value;
            const defNewName = oldNameToNewName(oldName);
            const newName = defNewName != null ? defNewName : document.getElementById('newName'+this.value).value.trim();
    
            if (oldName != newName && newName != '') {
                const nickChangeObj = {
                    gameId: this.value,
                    oldName: oldName ,
                    newName: newName,
                    adminUser: document.getElementById('adminUser').value,
                    adminPass: document.getElementById('adminPass').value
                };
                socket.emit('change nick', nickChangeObj, function() {
                    const getGamesObj = {
                        isSecure: true,
                        adminUser: document.getElementById('adminUser').value,
                        adminPass: document.getElementById('adminPass').value
                    }
                    socket.emit('get games for report', getGamesObj, function (response) {
                        emptyElementById('chooseNickGameCollapse');
                        showNickChanger(response.data);
                    });
                });
            } else {
                alert('New name must be different than old name!');
            }
        });
    
        const changeNameButtonDiv = createElementWithIdAndClasses('div', null, 'col-1');
        changeNameButtonDiv.appendChild(changeNameButton);
        gameContainerDiv.appendChild(changeNameButtonDiv);

        const btnId2 = 'generateReports' + game.id;
        const generatedStr = game.gameStatistics != null ? new Date(game.gameStatistics.generated).toLocaleString('fi-fi') : 'NULL';
        const generateReportsButton = createElementWithIdAndClasses('button', btnId2, 'btn btn-primary generate-report-button', { value: game.id });
        generateReportsButton.innerText = 'Generate '+generatedStr;
        generateReportsButton.addEventListener('click', function() {
            console.log(this.value);
    
            const generateReportObj = {
                gameId: this.value,
                adminUser: document.getElementById('adminUser').value,
                adminPass: document.getElementById('adminPass').value
            };
            socket.emit('generate game statistics', generateReportObj, function(generateResult) {
                console.log(generateResult.passOk);
                const getGamesObj = {
                    isSecure: true,
                    adminUser: document.getElementById('adminUser').value,
                    adminPass: document.getElementById('adminPass').value
                }
                socket.emit('get games for report', getGamesObj, function (response) {
                    emptyElementById('chooseNickGameCollapse');
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    showNickChanger(response.data);
                });
            });
        });
    
        const generateReportsButtonDiv = createElementWithIdAndClasses('div', null, 'col-3');
        generateReportsButtonDiv.appendChild(generateReportsButton);
        gameContainerDiv.appendChild(generateReportsButtonDiv);

        gameListContainer.appendChild(gameContainerDiv);

    });}

function showErrorNames(errorNames) {
    if (errorNames.length == 0) return '';
    console.log(errorNames);
    return ' <strong>E: '+ errorNames.join(', ')+'</strong>';
}

function oldNameToNewName(oldName) {
    switch (oldName) {
        case '-Lasse-': return '-lasse-';
        case 'Jossu': return 'Johanna';
    }
    return null;
}