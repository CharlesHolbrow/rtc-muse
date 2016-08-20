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

import { RtcMuseServerConnection } from './RtcMuseServerConnection.js';
window.RtcMuseServerConnection = RtcMuseServerConnection;

const rtcMuse = window.rtcMuse = new RtcMuseServerConnection();
const videos = window.videos = document.getElementById('videos');

const handshakeByIceId = window.handshakeByIceId = {};

rtcMuse.socket.on('beginOffer', async (data)=> {
  const iceId = data.iceId;
  const remote = new Handshake(rtcMuse, videos, data.iceId);
  remote.iceId = data.iceId;
  handshakeByIceId[iceId] = remote;
  remote.iceId = iceId;
  remote.onIceCandidate((iceCandidate)=> {
    window.iceCandidate = iceCandidate;
    // this is essentially what we want on the other side:
    // new RTCIceCandidate({candidate: iceCandidate.candidate})
  });
  remote.onLocalDescription((localDescription) => {
    window.localDescription = localDescription;
  });

  // CAUTION: how do we ensure localStream exists?
  const desc = await remote.promiseDescriptionFromStream(localStream);
  // because offerData has the .sdp property, our peer can pass
  // it directly to an RTCSessionDescription constructor.
  const offerData = desc.toJSON();
  offerData.iceId = iceId

  // offerData should not have the following properties:
  // .type .sdp .iceId

  rtcMuse.socket.emit('offer', offerData);
  console.log('Offer sent to signaling server', iceId);
});



rtcMuse.socket.on('createAnswer', async (data) => {
  const remote = new Handshake(rtcMuse, videos, data.iceId);

  handshakeByIceId[data.iceId] = remote;

  const remoteDesc = new RTCSessionDescription(data);
  remote.pc.setRemoteDescription(remoteDesc);

  const answerDesc = await remote.pc.createAnswer({});
  remote.pc.setLocalDescription(answerDesc);

  const answerData = answerDesc.toJSON();
  answerData.iceId = data.iceId;
  rtcMuse.socket.emit('answer', answerData);

  console.log(`created answer for ${data.iceId}`);
});


rtcMuse.socket.on('answer', (data) => {
  console.log(`received answer: ${data.iceId}`);

  if (!handshakeByIceId.hasOwnProperty(data.iceId))
    throw new Error('answer received does not contain a known iceId');

  const handshake = handshakeByIceId[data.iceId];
  const desc = new RTCSessionDescription(data);
  handshake.pc.setRemoteDescription(desc);
});

rtcMuse.socket.on('iceCandidate', (data) => {

  if (!handshakeByIceId.hasOwnProperty(data.iceId))
    throw new Error('iceCandidate received does not contain a known iceId');

  const handshake = handshakeByIceId[data.iceId];
  const iceCandidate = new RTCIceCandidate(data);
  if (!handshake.incomingIceCandidates)
    handshake.incomingIceCandidates = [];
  handshake.incomingIceCandidates.push(iceCandidate);
  handshake.pc.addIceCandidate(iceCandidate);

});

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

