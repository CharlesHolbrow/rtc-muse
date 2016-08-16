import 'babel-polyfill';

// This guide is usefull for getting up and running with webpack;
// https://leanpub.com/setting-up-es6/read#sec_webpack-babel

// See "Importing modules from npm" in the article below
// http://wesbos.com/javascript-modules/
import 'webrtc-adapter';
import EventEmitter from 'eventemitter3';
window.EventEmitter = EventEmitter;


import { RemoteVideo } from './RemoteVideo.js';
window.RemoteVideo = RemoteVideo;


import { socket } from './signaling.js';
window.socket = socket;


window.videos = document.getElementById('videos');
const rm1 = window.rm1 = new RemoteVideo(window.videos);
const rm2 = window.rm2 = new RemoteVideo(window.videos);

rm1.emitter.on('localDescription', async (desc)=> {

  // calling setLocalDescription should trigger local 
  // onicecandidate. We must wait to setLocalDescription UNTIL
  // after the offer/answer exchange. could this be done in
  // the onnegotiationneeded callback?
  rm1.pc.setLocalDescription(desc);
  rm2.pc.setRemoteDescription(desc);

  const answer = await rm2.pc.createAnswer();

  console.log('got answer!!!!!', answer);
  rm1.pc.setRemoteDescription(answer);
  rm2.pc.setLocalDescription(answer);
});

rm1.onIceCandidate((rtcIceCandidate) => {
  const candidate = new RTCIceCandidate(rtcIceCandidate);
  rm2.pc.addIceCandidate(candidate);
});

rm2.onIceCandidate((rtcIceCandidate) => {
  // const candidate = new RTCIceCandidate(rtcIceCandidate);
  // rm1.pc.addIceCandidate(candidate);
});

var startButton = document.getElementById('startButton');
startButton.onclick = start;

var localVideo = document.getElementById('localVideo');


var localStream;

function gotStream(stream) {
  console.log('Received local stream');
  localVideo.srcObject = stream;
  // Add localStream to global scope so it's accessible from the
  // browser console
  window.localStream = localStream = stream;
  // callButton.disabled = false;
  rm1.promiseSdpFromStream(localStream).then(() => {console.log('sdp!!!!', arguments)})
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

function hangup() {
  console.log('Ending call');
  rm1.pc.close();
  rm2.pc.close();
}


