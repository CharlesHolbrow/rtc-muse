import io from 'socket.io-client';

import EventEmitter from 'eventemitter3';
import { Handshake } from './Handshake.js';

// Until I decide to move to a full front-end framework
// I enforce a single instance of this class
let instanceCount = 0;


function randomId() {
  return Math.random().toString(36).substr(2, 8);
}


export class MuseServerConnection {
  constructor(socket) {

    // note that even though can can construct a socket by
    // calling 'new io()', the value returned will be an
    // instance of io.Socket
    if (!(socket instanceof io.Socket))
      throw new Error('MuseServerConnection requires a socket instance')

    // Until I decide to move to a full front-end framework
    // I enforce a single instance of this class
    if (++instanceCount > 1)
      throw new Error('Only one instance of RtcMuseServerConnection is allowed');

    this.emitter    = new EventEmitter();
    this.handshakes = {};
    this.promises   = {};
    this.socket     = socket;

    socket.on('joined', (id) => { console.log(`joined: ${id}`); });
    socket.on('log', (text) => { console.log(text); });
    socket.on('malformed', (description) => {
      console.error(`malformed request: ${description}`);
    });


    // The server asked us to make a peer connection, call
    // .createOffer, and send that offer back to the server
    socket.on('createOffer', async (data) => {

      if (!this.promises.hasOwnProperty(data.requestId))
        console.warn('received createOffer request without valid requestId');

      console.log(`we may begin the transaction: ${data.iceId}`);

      const iceId     = data.iceId;
      const handshake = new Handshake(socket, data.iceId);
      handshake.onRemoteStream((stream) => {
        this.emitter.emit('remoteStream', stream);
      })
      handshake.iceId = iceId;

      // we keep track of all the handshakes on this socket
      this.handshakes[iceId]  = handshake;

      if (this.promises[data.requestId]) {
        this.promises[data.requestId].resolve(handshake);
        delete this.promises[data.requestId];
      }

      // CAUTION: how do we ensure localStream exists?
      const desc = await handshake.promiseDescriptionFromStream(window.localStream);
      // because offerData has the .sdp property, our peer can pass
      // it directly to an RTCSessionDescription constructor.
      const offerData = desc.toJSON();
      offerData.iceId = iceId

      // offerData should not have the following properties:
      // .type .sdp .iceId

      socket.emit('offer', offerData);
      console.log('Offer sent to signaling server', iceId);
    });


    // The server asked us to create an answer, and send it back
    socket.on('createAnswer', async (data) => {

      const handshake = new Handshake(socket, data.iceId);
      handshake.onRemoteStream((stream) => {
        this.emitter.emit('remoteStream', stream);
      })

      this.handshakes[data.iceId] = handshake;

      const remoteDesc = new RTCSessionDescription(data);
      handshake.pc.setRemoteDescription(remoteDesc);

      const answerDesc = await handshake.pc.createAnswer({});
      handshake.pc.setLocalDescription(answerDesc);

      const answerData = answerDesc.toJSON();
      answerData.iceId = data.iceId;
      this.socket.emit('answer', answerData);

      console.log(`created answer for ${data.iceId}`);
    });


    // We received an answer from the server
    socket.on('answer', (data) => {
      console.log(`received answer: ${data.iceId}`);

      if (!this.handshakes.hasOwnProperty(data.iceId))
        throw new Error('answer received does not contain a known iceId');

      const handshake = this.handshakes[data.iceId];
      const desc = new RTCSessionDescription(data);
      handshake.pc.setRemoteDescription(desc);
    });


    socket.on('iceCandidate', (data) => {
      if (!this.handshakes.hasOwnProperty(data.iceId))
        throw new Error('iceCandidate received does not contain a known iceId');

      const handshake = this.handshakes[data.iceId];
      handshake.addIceCandidateFromPeer(data);
    });

    socket.on('fail', (data) => {
      if (!this.promises.hasOwnProperty(data.requestId))
        console.warn('received fail event without valid requestId');
      this.promises[data.requestId].reject(data);
    });

    // Currently constructing more than one instance of this
    // class will cause bugs due to the interaction with hard
    // coded html elements accessed below.

    socket.on('init', (id) => {
      document.getElementById('socket-id').innerHTML = id;
    });
  }

  promiseHandshake(answerPeerId) {

    if (typeof answerPeerId !== 'string')
      throw new Error('promiseHandshake requires a answerPeerId');

    const requestId = randomId();
    const promise = new Promise((resolve, reject) => {
      this.promises[requestId] = { resolve, reject };
    });

    // The server must answer this method with 'createOffer' or
    // 'fail'. The answer must include the requestId
    this.socket.emit('initiateIceTransaction', {
      requestId,
      answerPeerId,
    });

    return promise;
  }

  onRemoteStream(func) {
    this.emitter.on('remoteStream', func);
  }
}
