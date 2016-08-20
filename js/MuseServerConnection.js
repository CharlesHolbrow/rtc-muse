import io from 'socket.io-client';

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

    this.handshakes = {};
    this.socket = socket;

    socket.on('malformed', (description) => { console.error(`malformed request: ${description}`); });
    socket.on('joined', (id) => { console.log(`joined: ${id}`); });
    socket.on('log', (text) => { console.log(text); });


    // The server asked us to make a peer connection, call
    // .createOffer, and send that offer back to the server
    socket.on('createOffer', async (data) => {
      console.log(`we may begin the transaction: ${data.iceId}`);

      // CAUTION: how do we actually want to do this?
      const videos    = document.getElementById('videos');

      const iceId     = data.iceId;
      const handshake = new Handshake(socket, videos, data.iceId);
      handshake.iceId = iceId;

      // we keep track of all the handshakes on this socket
      this.handshakes[iceId]  = handshake;

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

      const videos = document.getElementById('videos');
      const handshake = new Handshake(socket, videos, data.iceId);

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


    // Currently constructing more than one instance of this
    // class will cause bugs due to the interaction with hard
    // coded html elements accessed below.

    socket.on('init', (id) => {
      document.getElementById('socket-id').innerHTML = id;
    });

    document.getElementById('connect-form').onsubmit = (event) => {
      event.preventDefault();
      const answerPeerId = document.getElementById('peerId').value;
      const requestId = randomId();
      if (answerPeerId.length <= 8)
        throw new Error('Id not long enough');

      socket.emit('initiateIceTransaction', {
        answerPeerId,
        requestId,
      });
    }
  }
}