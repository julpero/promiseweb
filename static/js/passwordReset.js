function resetPassword(userName) {
  const resetObj = {
    adminUser: document.getElementById('adminUser').value,
    adminPass: document.getElementById('adminPass').value,
    userToReset: userName
  }
  console.log('reset: ' + userName);
  if (window.confirm('Are you sure that you wan\'t to reset user password?')) {
    socket.emit('reset user password', resetObj, function(response) {
      emptyElementById('resetPasswordsCollapse');
      if (response.passOk && response.deleteOk) {
        const showPlayersObj = {
          adminUser: document.getElementById('adminUser').value,
          adminPass: document.getElementById('adminPass').value
        }
        socket.emit('show players with password', showPlayersObj, function (response) {
          if (response.passOk) {
            listUsers(response.playersWithPassword);
          }
        });
      }
    });
  }
}

function listUsers(userArr) {
  const resetPasswordsCollapseEl = document.getElementById('resetPasswordsCollapse');
  userArr.forEach(user => {
    const userContainerDivRow = createElementWithIdAndClasses('div', null, 'row');
    const userContainerDivCol = createElementWithIdAndClasses('div', null, 'col-10');
    userContainerDivCol.innerText = user;

    const resetPasswdButtonCol = createElementWithIdAndClasses('div', null, 'col-2');
    const resetPasswdButton = createElementWithIdAndClasses('button', null, 'btn btn-primary reportGameButton', { value: user });
    resetPasswdButton.innerText = 'RESET PWD';
    resetPasswdButton.addEventListener('click', function() {
      resetPassword(this.value);
    });

    userContainerDivRow.appendChild(userContainerDivCol);
    resetPasswdButtonCol.appendChild(resetPasswdButton);
    userContainerDivRow.appendChild(resetPasswdButtonCol);
    resetPasswordsCollapseEl.appendChild(userContainerDivRow);
  });
}

function initPasswordChangeEvent() {
  const passwordChangeCollapseEl = document.getElementById('resetPasswordsCollapse');
  if (passwordChangeCollapseEl != null) {
    passwordChangeCollapseEl.addEventListener('shown.bs.collapse', function () {
      const showPlayersObj = {
        adminUser: document.getElementById('adminUser').value,
        adminPass: document.getElementById('adminPass').value
      }
      socket.emit('show players with password', showPlayersObj, function (response) {
          if (!response.passOk) {
            emptyElementById('resetPasswordsCollapse');
          } else {
            listUsers(response.playersWithPassword);
          }
      });
    });
  
    passwordChangeCollapseEl.addEventListener('hidden.bs.collapse', function () {
        emptyElementById('resetPasswordsCollapse');
    });
  }
}

function enableButtons() {
  disableButtonsByClass('report-button', false);
  removeClassByClass('report-button', 'disabled');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mainPasswordInit() {
  initPasswordChangeEvent();
  enableButtons();
}