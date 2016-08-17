import 'webrtc-adapter';
/* global RTCPeerConnection */
import EventEmitter from 'eventemitter3';


const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1,
};


export class RemoteVideo {

  constructor(rtcMuse, parentElement) {
    if (!parentElement)
      throw new Error('RemoteVideo requires parentElement');

    this.parentElement    = parentElement;
    this.rtcMuse          = rtcMuse;
    this.socket           = rtcMuse.socket;
    this.videoElement     = null;
    this.stunTurnServers  = null;
    this.emitter          = new EventEmitter;

    this.createVideoElement();

    this.pc = new RTCPeerConnection(this.stunTurnServers);
    this.pc.onicecandidate = (event) => {
      // onicecandidate will be called multiple times after we
      // invoke .setLocalDescription
      //
      // The event may or may not contain a .candidate
      // CAUTION: for now we are only emitting the event iff it
      // contains a .candidate
      if (!event.candidate) return;
      this.emitter.emit('iceCandidate', event.candidate);
    };

    this.pc.oniceconnectionstatechange = (event) => {
      console.log('RemoteVideo:oniceconnectionstatechange', this.pc.iceConnectionState, event);
      this.emitter.emit('stateChange', this.pc.iceConnectionState);
    };

    this.pc.onaddstream = (event) => {
      this.videoElement.srcObject = event.stream;
    }
  }

  createVideoElement() {
    if (this.videoElement)
      throw new Error('Already Has Video Element');

    this.videoElement = document.createElement('video');
    // Setting autoplay = true is important. We can set the
    // srcObject of the video element without playing the video,
    // and in chrome we see the video, but the playback is very
    // choppy unless it is playing.
    this.videoElement.autoplay = true;
    this.parentElement.appendChild(this.videoElement);
    this.videoElement.addEventListener('loadmetadata', function() {
      console.log(`loadmetadata ${this.videoWidth} x ${this.videoHeight}`, this);
    });
  }

  promiseSdpFromStream(stream) {
    this.pc.addStream(stream);
    return this.promiseSdpOffer();
  }

  async promiseSdpOffer() {

    // createOffer promises an RTCSessionDescription, which has:
    //
    // .type - 'offer'
    // .sdp  - string that we will send to peers
    this.desc  = await this.pc.createOffer(offerOptions);
    console.log('create offer success', this.desc);

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
    return this.desc.sdp;
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

}
