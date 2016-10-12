'use strict';

const
  express = require('express'),
  app = express(),
  expressWs = require('express-ws')(app),
  os = require('os'),
  pty = require('pty.js'),
  shortid = require('shortid'),
  spawn = require('child_process').spawn;


let terminals = {},
    logs = {};

app.use(express.static(__dirname + '/public'));
app.use("/xterm", express.static(__dirname + '/../node_modules/xterm'));


app.post('/terminals', (req, res) => {
  let cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      repl_name = shortid.generate(),
      term = pty.spawn('docker', ["run", "-it", "--name", repl_name, "--entrypoint", "elm-repl", "codesimple/elm:0.17"], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.PWD,
        env: process.env
      });

  console.log(`Created terminal with PID: ${term.pid}, container: ${repl_name}`);
  // console.log(simpleStringify(term));
  terminals[repl_name] = term;
  logs[repl_name] = '';
  term.on('data', (data) => {
    logs[repl_name] += data;
  });
  res.send(repl_name);
  res.end();
});

app.post('/terminals/:repl_name/size', (req, res) => {
  let term = terminals[req.params.repl_name],
      pid = parseInt(term.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows);

  term.resize(cols, rows);
  console.log('Resized terminal ' + req.params.repl_name + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.ws('/terminals/:repl_name', (ws, req) => {
  let repl_name = req.params.repl_name, term = terminals[repl_name];
  console.log('Connected to terminal ' + repl_name);
  ws.send(logs[repl_name]);

  term.on('data', (data) => {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });

  term.on('exit', (code, signal) => {
    ws.close();
  });

  ws.on('message', (msg) => {
    term.write(msg);
  });

  ws.on('close',  () => {
    try {
      let stop_container = spawn('docker', ["rm", "-f", repl_name]);
      stop_container.on( 'close', code => {
          console.log("stop_container exited with code " + code );
      });
      stop_container.stdout.on( 'data', data => {
          console.log( `stdout: ${data}` );
      });

      stop_container.stderr.on( 'data', data => {
          console.log( `stderr: ${data}` );
      });
      // Clean things up
      delete terminals[repl_name];
      delete logs[repl_name];
    } catch(ex) {
      console.error(ex)
    }
  });
});

var port = process.env.PORT || 3000,
    host = '127.0.0.1';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);

// helpers

let simpleStringify = (object) => {
    let simpleObject = {};
    for (let prop in object ){
        if (!object.hasOwnProperty(prop)){
            continue;
        }
        if (typeof(object[prop]) == 'object'){
            continue;
        }
        if (typeof(object[prop]) == 'function'){
            continue;
        }
        simpleObject[prop] = object[prop];
    }
    return JSON.stringify(simpleObject); // returns cleaned up JSON
};