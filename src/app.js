'use strict';

const
  express = require('express'),
  app = express(),
  expressWs = require('express-ws')(app),
  os = require('os'),
  pty = require('pty.js'),
  shortid = require('shortid'),
  spawn = require('child_process').spawn,
  RateLimit = require('express-rate-limit');

// rate limiter
app.enable('trust proxy');


let limiter = new RateLimit({
  windowMs: 30*60*1000, // 30 minutes
  delayAfter: 10, // begin slowing down responses after the first request
  delayMs: 2*1000, // slow down subsequent responses by 2 seconds per request
  max: 15, // start blocking after 30 requests
  message: "Too many requests from this IP, please try again after 30 minutes"
});

//  apply to all requests
app.use("/terminals", limiter);

let terminals = {},
    logs = {};

app.use(express.static(__dirname + '/public'));
app.use("/xterm", express.static(__dirname + '/../node_modules/xterm'));

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.post('/terminals', (req, res) => {
  let cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      repl_name = shortid.generate(),
      term = pty.spawn('docker', ["run", "-it", "-v", __dirname + "/../tmp:/code", "-w", "/code", "--name", repl_name, "--entrypoint", "elm-repl", "codesimple/elm:0.17"], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 32,
        cwd: process.env.PWD,
        env: process.env
      });

  console.log(`Created terminal with PID: ${term.pid}, container: ${repl_name}, size: ${cols}x${rows}`);
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

app.ws('/ws/:repl_name', (ws, req) => {
  let repl_name = req.params.repl_name, term = terminals[repl_name];
  console.log('Connected to terminal ' + repl_name);

  try {
    ws.send(logs[repl_name]);
  } catch (ex) {
    console.error(ex)
    ws.close();
  }

  term.on('data', (data) => {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });

  term.on('exit', (code, signal) => {
    try {
      ws.close();
    } catch (ex) {
      console.error(ex)
    }
  });

  // not executed
  term.on('error', function() {
    console.log("term error");
  });

  ws.on('message', (msg) => {
    try {
      term.write(msg);
    } catch (ex) {
      console.error(ex)
      ws.close();
    }
  });

  // not executed
  ws.on('error', function() {
    console.log("Communication error")
    term.write("\rFail: ");
    term.write("Communication error");
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

// very crude implementation
process.on('uncaughtException', (err) => {
  console.error(1, `Caught exception: ${err}`);
});
