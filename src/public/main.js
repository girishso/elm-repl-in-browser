var term,
    protocol,
    socketURL,
    socket,
    repl_name,
    charWidth,
    charHeight;

var terminalContainer = document.getElementById('terminal-container');

function setTerminalSize () {
  var cols = parseInt(colsElement.value),
      rows = parseInt(rowsElement.value),
      width = (cols * charWidth).toString() + 'px',
      height = (rows * charHeight).toString() + 'px';

  terminalContainer.style.width = width;
  terminalContainer.style.height = height;
  term.resize(cols, rows);
}


createTerminal();

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  term = new Terminal({
    cursorBlink: false
  });
  term.on('resize', function (size) {
    if (!repl_name) {
      return;
    }
    var cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + repl_name + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });
  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';

  term.open(terminalContainer);
  // term.fit();
  term.toggleFullscreen(1);

  var initialGeometry = term.proposeGeometry(),
      cols = initialGeometry.cols,
      rows = initialGeometry.rows;


  fetch('/terminals?cols=' + cols + '&rows=' + rows, {method: 'POST'}).then(function (res) {

    charWidth = Math.ceil(term.element.offsetWidth / cols);
    charHeight = Math.ceil(term.element.offsetHeight / rows);

    res.text().then(function (repl_name) {
      window.repl_name = repl_name;
      socketURL += repl_name;
      socket = new WebSocket(socketURL);
      socket.onopen = runRealTerminal;
      socket.onclose = notify;
      socket.onerror = notify;
    });
  });
}

function notify() {
  alert("connection closed!");
}

function runRealTerminal() {
  term.attach(socket);
  term._initialized = true;
}
