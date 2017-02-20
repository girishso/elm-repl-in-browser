let term,
    protocol,
    socketURL,
    socket,
    repl_name,
    charWidth,
    charHeight;

const terminalContainer = document.getElementById('terminal-container');

const setTerminalSize = () => {
  const cols = parseInt(colsElement.value),
      rows = parseInt(rowsElement.value),
      width = (cols * charWidth).toString() + 'px',
      height = (rows * charHeight).toString() + 'px';

  terminalContainer.style.width = width;
  terminalContainer.style.height = height;
  term.resize(cols, rows);
}

const createTerminal = () => {
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
    const cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + repl_name + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });
  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/ws/';

  term.open(terminalContainer);
  term.fit();
  // term.toggleFullscreen(1);

  const initialGeometry = term.proposeGeometry(),
      cols = initialGeometry.cols,
      rows = initialGeometry.rows;


  fetch('/terminals?cols=' + cols + '&rows=' + rows, {method: 'POST'}).then( (res) => {

    if(!res.ok) {
      if(res.status == 429)
        document.getElementById("overlay").innerText = "Too many requests from this IP, please try again after 30 minutes";
      else
        document.getElementById("overlay").innerText = res.statusText;

      notify();
      return;
    }

    charWidth = Math.ceil(term.element.offsetWidth / cols);
    charHeight = Math.ceil(term.element.offsetHeight / rows);

    res.text().then( (repl_name) => {
      window.repl_name = repl_name;
      socketURL += repl_name;
      socket = new WebSocket(socketURL);
      socket.onopen = runRealTerminal;
      socket.onclose = notify;
      socket.onerror = notify;
    });
  }).catch( (err) => {
    document.getElementById("overlay").innerText = err;
    notify();
  });;
}

createTerminal();

const notify = () => {
  terminalContainer.style.opacity = 0.5;
  document.getElementById("overlay").style.display = "block";
}

const runRealTerminal = () => {
  term.attach(socket);
  term._initialized = true;
}
