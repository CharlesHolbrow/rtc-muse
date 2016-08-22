import 'babel-polyfill';

// This guide is usefull for getting up and running with webpack;
// https://leanpub.com/setting-up-es6/read#sec_webpack-babel

// See "Importing modules from npm" in the article below
// http://wesbos.com/javascript-modules/
import 'webrtc-adapter';

import { Handshake } from './Handshake.js';
window.Handshake = Handshake;

import { MuseServerConnection } from './MuseServerConnection.js';
window.MuseServerConnection = MuseServerConnection;

import io from 'socket.io-client';
window.io = io;

const socket  = new io();
const muse    = window.muse = new MuseServerConnection(socket);
const videos  = window.videos = document.getElementById('videos');


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


muse.onAnswerHandshake((handshake) => {
  const videoElement = createVideoElement();

  handshake.onRemoteStream((stream) => {
    videoElement.srcObject = stream;
  });

  handshake.onStateChange((state) => {
    if (state === 'failed') {
      videoElement.remove();
    }
  });

});

