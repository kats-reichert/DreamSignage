const fs = require("fs");
const path = require('path');
const crypto = require('crypto');
const folder = './public/content/';
const { logger } = require('./logger.js');

let fileList = [];
let fileHashes = [];
let displaylist = []; 

// init the fileHashes for up to 128 folders
for (var i = 0; i < 128; i++)
  fileHashes.push({});

let io = null;


function setVars(ioVar) {
    io = ioVar;
}

// TODO: Rename the TEMP Variables!!!!
function handleSocketConnection(socket, config, display) {
  //socket.emit("filelist", fileList);
  let temp = []
  let temp2 = {}
  let id = displaylist.indexOf(display)
  temp2.display = display
  temp2.files = fileList[id]
  temp.push (temp2)
  socket.emit("filelist", temp);
  socket.emit("settings", {
    contentIntervall: config.contentIntervall,
    backgroundColor: config.backgroundColor
  });

  socket.on('requpdate', (data) => {
    let temp = [] 
    let temp2 = {}
    let id = displaylist.indexOf(data)
    temp2.display = data
    temp2.files = fileList[id]
    temp.push (temp2)
    socket.emit("filelist", temp);
    socket.emit("settings", {
      contentIntervall: config.contentIntervall 
    });
  });
}

function requireHTTPS(req, res, next) {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next(); 
}

function UpdateContent(subfolders) {
  
  displaylist = subfolders
  subfolders.forEach(element => {
    const subpath = folder + element + '/'
    const files = fs.readdirSync(subpath);
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp', '.svg', '.svgz', '.bmp', '.ico', '.avif', '.mp4', '.webm', '.ogv', '.ogg', '.json'];
    logger.log('info', { message: 'Update Content for: ' + subpath + ' Files: ' + files, label: 'UpdateContent'});
    const newFileHashes = {};
    files.forEach(file => {
      const filePath = path.join(subpath, file);
      const isFile = fs.lstatSync(filePath).isFile();
      const isValidExtension = validExtensions.some(ext => file.toLowerCase().endsWith(ext));
      if (isFile && isValidExtension) {
        newFileHashes[file] = computeFileHash(filePath);
      }
    });
  const id = subfolders.indexOf(element)
  
  // transmit the "urgent" messages as broadcast to all Displays.
  fs.readFile(subpath + 'urgent.txt', 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      logger.log('error', { message: 'Error reading urgent.txt for ' + subpath + ' MSG: ' + err, label: 'UrgentMSG'});
    }
    const text = err ? '' : data.trim();
    logger.log('info', { message: 'Transmitting urgent Message for ' + element + ' MSG: ' + text, label: 'UrgentMSG'});
    io.emit("urgent", { display: element, text });
  });

  // transmit the "info" messages as broadcast to all Displays.
  fs.readFile(subpath + 'info.txt', 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      logger.log('error', { message: 'Error reading info.txt for ' + subpath + ' MSG: ' + err, label: 'InfoMSG'});
    }
    const text = err ? '' : data.trim();
    logger.log('info', { message: 'Transmitting Info message for ' + element + ' MSG: ' + text, label: 'InfoMSG'});
    io.emit("info", { display: element, text });
  });

    const hasChanges = 
      Object.keys(newFileHashes).length !== Object.keys(fileHashes[id]).length || // Different number of files
      Object.keys(newFileHashes).some(fileName => newFileHashes[fileName] !== fileHashes[id][fileName]); // Different file content
  
    fileList[id] = Object.keys(newFileHashes); // Update the fileList
    fileHashes[id] = newFileHashes; // Update the stored hashes for the next comparison


  if (hasChanges) {
    logger.log('info', { message: 'Content changed in folder:  ' + element , label: 'UpdateContent'})
    io.emit("update", element); // Make sure to import the `io` object or pass it as an argument
  }
  });

}

function computeFileHash(filePath) {
    const fileContent = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileContent);
    return hash.digest('hex');
}

module.exports = {
  handleSocketConnection,
  requireHTTPS,
  UpdateContent,
  setVars
};