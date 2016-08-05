import 'webrtc-adapter';
/* global RTCPeerConnection */

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

export class RemoteVideo {

  constructor(parentElement) {
    if (!parentElement)
      throw new Error('RemoteVideo requires parentElement');

    this.parentElement    = parentElement;
    this.videoElement     = null;
    this.stunTurnServers  = null;

    this.createVideoElement();

    this.pc = new RTCPeerConnection(this.stunTurnServers);
    this.pc.onicecandidate = (event) => {
      // onicecandidate will be called multiple times after we
      // invoke .setLocalDescription
      //
      // The event may or may not contain a .candidate
      if (!event.candidate) return;
      console.log('RemoteVideo:onicecandidate', event.candidate.candidate);
    };

    this.pc.oniceconnectionstatechange = (event) => {
      console.log('RemoteVideo:oniceconnectionstatechange', event);
    };
  }

  createVideoElement() {
    if (this.videoElement)
      throw new Error('Already Has Video Element');
    this.videoElement = document.createElement('video');
    this.parentElement.appendChild(this.videoElement);
    this.videoElement.addEventListener('loadmetadata', function() {
      console.log(`loadmetadata ${this.videoWidth} x ${this.videoHeight}`, this);
    });
  }

  addStream(stream) {
    this.pc.addStream(stream);
  }

  async createOffer() {

    // createOffer promises an RTCSessionDescription, which has:
    //
    // .type === 'offer'
    // .sdp
    //
    // the .sdp property is a string that we will send to peers
    this.desc  = await this.pc.createOffer(offerOptions);
    console.log('create offer success', this.desc);

    // Now we have a SDP description. This will be the 'local
    // description' for this.pc, and the remoteDescription for
    // peers we are connecting to

    // calling setLocalDescription should trigger local 
    // onicecandidate
    await this.pc.setLocalDescription(this.desc);

    // We successfully set the local description. Now we need to
    // send this.desc.sdp to the peer we want to connect to.
  }


}
