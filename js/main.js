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


function createVideoElement() {
  const videoElement = document.createElement('video');
  // Setting autoplay = true is important. We can set the
  // srcObject of the video element without playing the video,
  // and in chrome we see the video, but the playback is very
  // choppy unless it is playing.
  videoElement.autoplay = true;
  videoElement.addEventListener('loadmetadata', function() {
    console.log(`loadmetadata ${this.videoWidth} x ${this.videoHeight}`, this);
  });
  videos.appendChild(videoElement);
  return videoElement;
}

window.v1 = createVideoElement();
muse.onRemoteStream((stream) => { window.v1.srcObject = stream; });


document.getElementById('connect-form').onsubmit = async (event) => {
  event.preventDefault();
  const answerPeerId = document.getElementById('peerId').value;
  if (answerPeerId.length <= 8)
    throw new Error('Id not long enough');

  const result = await muse.promiseHandshake(answerPeerId);
  console.log('promise result:', result);
}


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

