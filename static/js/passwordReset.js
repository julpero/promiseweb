function initPasswordChangeEvent() {
  const passwordChangeCollapseEl = document.getElementById('resetPasswordsCollapse');
  if (passwordChangeCollapseEl != null) {
    passwordChangeCollapseEl.addEventListener('shown.bs.collapse', function () {
          socket.emit('show players with password', {adminPass: document.getElementById('adminPass').value}, function (response) {
              console.log(response);
              if (!response.passOk) {
                emptyElementById('resetPasswordsCollapse');
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

function mainInit() {
  initPasswordChangeEvent();
  enableButtons();
}