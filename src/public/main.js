var term,
    protocol,
    socketURL,
    socket,
    repl_name,
    charWidth,
    charHeight;

var terminalContainer = document.getElementById('terminal-container'),
    optionElements = {
      cursorBlink: document.querySelector('#option-cursor-blink')
    },
    colsElement = document.getElementById('cols'),
    rowsElement = document.getElementById('rows');

function setTerminalSize () {
  var cols = parseInt(colsElement.value),
      rows = parseInt(rowsElement.value),
      width = (cols * charWidth).toString() + 'px',
      height = (rows * charHeight).toString() + 'px';

  terminalContainer.style.width = width;
  terminalContainer.style.height = height;
  term.resize(cols, rows);
}

colsElement.addEventListener('change', setTerminalSize);
rowsElement.addEventListener('change', setTerminalSize);

optionElements.cursorBlink.addEventListener('change', createTerminal);

document.getElementById("paste-btn").addEventListener("click", function(e) {
  getContentFromClipboard();
})

terminalContainer.addEventListener('paste', handlePaste);
createTerminal();

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  term = new Terminal({
    cursorBlink: optionElements.cursorBlink.checked
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
  term.fit();

  var initialGeometry = term.proposeGeometry(),
      cols = initialGeometry.cols,
      rows = initialGeometry.rows;

  colsElement.value = cols;
  rowsElement.value = rows;

  fetch('/terminals?cols=' + cols + '&rows=' + rows, {method: 'POST'}).then(function (res) {

    charWidth = Math.ceil(term.element.offsetWidth / cols);
    charHeight = Math.ceil(term.element.offsetHeight / rows);

    res.text().then(function (repl_name) {
      window.repl_name = repl_name;
      socketURL += repl_name;
      socket = new WebSocket(socketURL);
      socket.onopen = runRealTerminal;
      // socket.onclose = runFakeTerminal;
      socket.onclose = notify;
      socket.onerror = runFakeTerminal;
    });
  });
}

function notify() {
  alert("connection closed!");
}

function runRealTerminal() {
  term.attach(socket);
  term._initialized = true;

  // term.on('paste', function (data, ev) {
  //   alert(data);
  //   term.write(data);
  // });

}

function getContentFromClipboard() {
    var result = '';
    var sandbox = document.getElementById('sandbox');
    sandbox.value = '';
    sandbox.select();
    if (document.execCommand('paste')) {
        result = sandbox.value;
        console.log('got value from sandbox: ' + result);
    }
    sandbox.value = '';
    if(result != "")
      alert(result);
    return result;
}

function handlePaste (e) {
    var clipboardData, pastedData;

    // Stop data actually being pasted into div
    e.stopPropagation();
    e.preventDefault();

    // Get pasted data via clipboard API
    clipboardData = (e.originalEvent || e).clipboardData || window.clipboardData;
    pastedData = clipboardData.getData('text/plain');

    // Do whatever with pasteddata
    alert(pastedData);
}
