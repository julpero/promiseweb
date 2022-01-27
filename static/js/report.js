function showNickChanger(gameList) {
    const gameListContainer = document.getElementById('chooseNickGameCollapse');
    console.log(gameList);
    gameList.forEach(function (game) {
        const gameContainerDiv = createElementWithIdAndClasses('div', 'gameContainerDiv'+ game.id, 'row');
        const gamePlayers = createElementWithIdAndClasses('div', 'gamePlayers' + game.id, 'col-4 report-players');
        gamePlayers.innerHTML = gamePlayersToStr(game.humanPlayers, game.humanPlayersCount, game.computerPlayersCount, null)+showErrorNames(game.playerNameErrors);
        gameContainerDiv.appendChild(gamePlayers);

        const oldNameCol = createElementWithIdAndClasses('div', null, 'col-2');
        const oldNameInput = createElementWithIdAndClasses('input', 'oldName'+game.id, null, { type: 'text' });
        const newNameCol = createElementWithIdAndClasses('div', null, 'col-2');
        const newNameInput = createElementWithIdAndClasses('input', 'newName'+game.id, null, { type: 'text' });
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
                };
        
                socket.emit('change nick', nickChangeObj, function() {
                    socket.emit('get games for report', {}, function (response) {
                        emptyElementById('chooseNickGameCollapse');
                        showNickChanger(response);
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
            };
            socket.emit('generate game statistics', generateReportObj, function(gameStatistics) {
                console.log(gameStatistics);
                socket.emit('get games for report', {}, function (response) {
                    emptyElementById('chooseNickGameCollapse');
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    showNickChanger(response);
                });
            });
        });
    
        const generateReportsButtonDiv = createElementWithIdAndClasses('div', null, 'col-3');
        generateReportsButtonDiv.appendChild(generateReportsButton);
        gameContainerDiv.appendChild(generateReportsButtonDiv);

        gameListContainer.appendChild(gameContainerDiv);

    });
}

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