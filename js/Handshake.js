import 'webrtc-adapter';
/* global RTCPeerConnection */
import EventEmitter from 'eventemitter3';


const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1,
};


export class Handshake {

  constructor(socket, iceId) {
    if (typeof iceId !== 'string')
      throw new Error('Handshake requires an iceId');

    this.socket           = socket;
    this.stunTurnServers  = null;
    this.emitter          = new EventEmitter;
    this.iceId            = iceId;
    this.stream           = null;

    // We are going to save all the iceCandidates. This is not
    // strictly necessary because we can add all the candidates
    // to the peer connection as they are received. However
    // storing them may help with debugging.
    this.incomingIceCandidates = [];
    this.outgoingIceCandidates = [];

    this.pc = new RTCPeerConnection(this.stunTurnServers);
    this.pc.onicecandidate = (event) => {
      // onicecandidate will be called multiple times after we
      // invoke .setLocalDescription
      //
      // The event may or may not contain a .candidate
      // CAUTION: for now we are only emitting the event iff it
      // contains a .candidate
      if (!event.candidate) return;
      this.outgoingIceCandidates.push(event.candidate);
      this.emitter.emit('iceCandidate', event.candidate);
      const data = event.candidate.toJSON();
      data.iceId = this.iceId;
      this.socket.emit('iceCandidate', data);
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      console.log(`ICE connection state: ${state}`);
      this.emitter.emit('stateChange', state);
    };

    // MDN suggest using ontrack instead of onaddstream
    this.pc.ontrack = (event) => {
      console.log(`ontrack with ${event.streams.length} streams`);
      // streams is an array of MediaStream objects
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
      // a stream contains zero or more audio and video tracks
      //
      // To play a stream via a HTML DOM video element, set:
      //
      // videoElement.srcObject = stream
      //
      // If video element does not have the must have .autoplay
      // attribute, we must call .play() manually
      for (const stream of event.streams) {
        this.emitter.emit('remoteStream', stream);
      }
    };
  }

  async promiseDescription() {

    // we cannot createOffer until we have a stream;
    await this.promiseStream();

    // createOffer promises an RTCSessionDescription, which has:
    //
    // .type - 'offer'
    // .sdp  - string that we will send to peers
    this.desc  = await this.pc.createOffer(offerOptions);
    console.log('Created offer successfully');

    // Now we have a SDP description. This will be the 'local
    // description' for this.pc, and the remoteDescription for
    // peers we are connecting to

    this.emitter.emit('localDescription', this.desc);

    // calling setLocalDescription should trigger local 
    // onicecandidate. We must not call addIceCandidate
    // until AFTER the offer/answer exchange.
    //
    // For example, if the remote host calls addIceCandidate
    // before she calls setLocalDescription, an error similar to
    // the one below will be thrown:
    //
    // Failed to add Ice Candidate: Error processing ICE candidate
    //
    // It seems that is okay to call setLocalDescription
    // (which emits the icecandidate events), and then
    // immediately send the ice/candidates to the peer,
    // because by the time the messages arrive at the peer,
    // she will have already set her local and remote
    // descriptions.
    //
    // Note that in one example HTML5 Rocks createOffer is called
    // from the onnegotiationneeded event callback. I can't tell
    // when this fires exactly. So I'm following the flow used in
    // the google code lab example.
    this.pc.setLocalDescription(this.desc);

    // We successfully set the local description. Now we need to
    // send this.desc.sdp to the peer we want to connect to.
    //
    // To serialise, and de-serialize our description promised
    // by the PeerConnection.createOffer call, we will pass a
    // javascript object with the sdp property to a
    // RTCSessionDescription constructor:
    //
    // new RTCSessionDescription({sdp:desc.sdp})
    return this.desc;
  }


  // Our remote peer will send us iceCandidates via the
  // signaling server. When we receive them, pass them into this
  // method.
  addIceCandidateFromPeer(data) {
    const iceCandidate = (data instanceof RTCIceCandidate)
      ? data
      : new RTCIceCandidate(data);

    this.incomingIceCandidates.push(iceCandidate);
    this.pc.addIceCandidate(iceCandidate);
  }

  promiseStream() {
    return new Promise((resolve) => {
      if (this.stream) {
        resolve(this.stream);
        return;
      }
      this.emitter.on('stream', (stream)=> {
        resolve(stream);
      });
    });
  }

  addStream(stream) {
    if (this.stream)
      throw new Error('handshake already has a stream');
    if (!stream)
      throw new Error('No stream provided to addStream method');
    this.pc.addStream(stream);
    this.stream = stream;
    this.emitter.emit('stream', stream);
  }


  close() {
    this.pc.close();
  }

  // register a callback. The argument to the callback will be
  // an RTCIceCandidate with:
  //
  // .candidate - a string that we send to peers
  // .sdpMid  - 'audio' or 'video'
  // .sdpMLineIndex - integer. usually 1
  onIceCandidate(func) {
    this.emitter.on('iceCandidate', func);
  }

  onLocalDescription(func) {
    this.emitter.on('localDescription', func);
  }

  onRemoteStream(func) {
    this.emitter.on('remoteStream', func);
  }

}
