import 'babel-polyfill';

// This guide is usefull for getting up and running with webpack;
// https://leanpub.com/setting-up-es6/read#sec_webpack-babel

// See "Importing modules from npm" in the article below
// http://wesbos.com/javascript-modules/
import 'webrtc-adapter';
import EventEmitter from 'eventemitter3';
window.EventEmitter = EventEmitter;

import { Handshake } from './Handshake.js';
window.Handshake = Handshake;

import { MuseServerConnection } from './MuseServerConnection.js';
window.MuseServerConnection = MuseServerConnection;

import io from 'socket.io-client';
window.io = io;

const socket  = new io();
const muse    = window.muse = new MuseServerConnection(socket);
const videos  = window.videos = document.getElementById('videos');


var localVideo = document.getElementById('localVideo');
var startButton = document.getElementById('startButton');
startButton.onclick = start;


var localStream;

function gotStream(stream) {
  console.log('Received local stream');
  localVideo.srcObject = stream;
  // Add localStream to global scope so it's accessible from the
  // browser console
  window.localStream = localStream = stream;

}

function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

