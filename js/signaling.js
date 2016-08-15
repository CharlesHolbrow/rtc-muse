// Socket.io exports the io variable.
/* global io */

const socket = window.socket = io();
socket.on('init', (arg) => { console.log(`init: ${arg}`); });
