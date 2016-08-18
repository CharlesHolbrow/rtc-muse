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

import { RtcMuseServerConnection } from './RtcMuseServerConnection.js';
window.RtcMuseServerConnection = RtcMuseServerConnection;

const rtcMuse = window.rtcMuse = new RtcMuseServerConnection(rm1);
const videos = window.videos = document.getElementById('videos');

const rm1 = window.rm1 = new RemoteVideo(rtcMuse, videos);
const rm2 = window.rm2 = new RemoteVideo(rtcMuse, videos);


rtcMuse.socket.on('beginOffer', async (data)=> {
  const iceId = data.iceId;
  const remote = new RemoteVideo(rtcMuse, videos);
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
  const sdp = await remote.promiseSdpFromStream(localStream);
  // because offerData has the .sdp property, our peer can pass
  // it directly to an RTCSessionDescription constructor.
  const offerData = { sdp, iceId };
  rtcMuse.socket.emit('offer', offerData);
  console.log('Offer sent to signaling server', iceId);
});

rtcMuse.socket.on('createAnswer', (data) => {
  window.peerOfferData = data;
  console.log(`createing answer for ${data.iceId}`);
});



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
  rm1.promiseSdpFromStream(localStream).then(() => {
    console.log('sdp!!!!', arguments)
  });
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


