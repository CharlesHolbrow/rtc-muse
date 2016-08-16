import io from 'socket.io-client';
window.io = io;

const socket = window.socket = io();

socket.on('init', (arg) => { console.log(`init: ${arg}`); });
socket.on('malformed', (description) => { console.error(`malformed request: ${description}`); });
socket.on('joined', (id) => { console.log(`joined: ${id}`); });
socket.on('log', (text) => { console.log(text); });
