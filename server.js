// Express server with socketio for real-time communication

// Import modules
import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import path from 'path';
import fs from 'fs';
import Chokidar from 'chokidar';

const __dirname = import.meta.dirname;

// Dotenv
import dotenv from 'dotenv';
dotenv.config();

// CONF
const PORT = process.env.PORT   || 3000;
const MEDIA = process.env.MEDIA || path.join(__dirname, 'media');

// Creating express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Last media
let lastMedia = null;

// find newest file in MEDIA recursive
let newestFileTime = 0;
let newestFile = null;
function findNewestFile(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        let stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findNewestFile(fullPath);
        } else {
            if (stat.mtimeMs > newestFileTime) {
                newestFileTime = stat.mtimeMs;
                newestFile = fullPath;
            }
        }
    });
}
findNewestFile(MEDIA);
if (newestFile) {
    lastMedia = path.relative(MEDIA, newestFile);
    console.log('Last media:', lastMedia);
}

// Setting up static www and media folders
app.use(express.static(path.join(__dirname, 'www')));

// static /media
app.use('/media', express.static(MEDIA));


// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'www/index.html'));
});

// Socket.io
io.on('connection', (socket) => {
    console.log('New WebView connection');

    // Send last media
    if (lastMedia) {
        socket.emit('new', lastMedia);
    }
});

// Watch folder for changes (recursive) using Chokidar
const watcher = Chokidar.watch(MEDIA, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    }
});
watcher.on('all', (event, path) => {
    console.log(event, path);
    let relPath = path.replace(MEDIA, '');
    lastMedia = relPath;
    io.emit('new', relPath);
});


// Starting server
server.listen(PORT, () => {
  console.log(`StableView running on port ${PORT}`);
});