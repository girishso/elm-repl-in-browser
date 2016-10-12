# elm-repl-in-browser
Sources for http://elmrepl.cuberoot.in/

Runs `elm-repl` on server in a docker container and shares with browser using `xterm.js`.

## Run locally

Needs `docker` installed.

Clone the repo.

```
npm i
PORT=3000 npm start
```

The server should be running on http://127.0.0.1:3000

## Development

Needs `webpack` installed globally.

Clone the repo.

```
npm i
webpack
PORT=3000 npm start
```

The server should be running on http://127.0.0.1:3000


## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## License
MIT License
