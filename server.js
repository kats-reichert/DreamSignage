const express = require("express");
const app = express();
const fs = require("fs");
const path = require('path');
const conf = require("config");
const server = require('http').Server(app);
const logic = require('./logic.js');
const folders = './public/content/'
const { logger } = require('./logger.js')

const io = conf.config.useSSL 
  ? require('socket.io')(https.createServer({
      key: fs.readFileSync(conf.config.sslkey),
      cert: fs.readFileSync(conf.config.sslCert)
    }, app))
  : require('socket.io')(server);
const sslServer = conf.config.useSSL 
  ? https.createServer({
      key: fs.readFileSync(conf.config.sslkey),
      cert: fs.readFileSync(conf.config.sslCert)
    }, app)
  : null;

logic.setVars(io);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, 'public')));

if (conf.config.useSSL) {
  app.use(logic.requireHTTPS);
} 

const directories = source => fs.readdirSync(source, {
  withFileTypes: true
}).reduce((a, c) => {
  c.isDirectory() && a.push(c.name)
  return a
}, [])

// add routing for all subfolders / screens
directories(folders).forEach((element) => app.get(('/' + element), (req, res) => res.render('content', { display: element }  )))

// render all unused routes to the "noting here " Page
app.get('/*', (req, res) => res.render('nothing'));

io.on('connection', (socket) => logic.handleSocketConnection(socket, conf.config , socket.handshake.query.myParam));

// cyclic retransmit all Content data
setInterval(() => logic.UpdateContent(directories(folders)), conf.config.scanIntervall * 1000);

server.listen(conf.config.httpPort, () => console.log(`Listening on port ${conf.config.httpPort} via http`));
if (conf.config.useSSL) {
  const sslPort = conf.config.sslPort;
  sslServer.listen(sslPort, () => console.log(`Listening on port ${sslPort} via https`));
}
// forece the content pages to reload, after the server restarted, 5sek after the files are read - just for safety ;-)
let msg ='restarting server'
setTimeout(function(){ io.emit('restart', msg) }, ((conf.config.scanIntervall * 1000) + 5000));
  