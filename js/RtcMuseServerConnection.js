import io from 'socket.io-client';
window.io = io;

let instanceCount = 0;

function randomId() {
  return Math.random().toString(36).substr(2, 8);
}

export class RtcMuseServerConnection {
  constructor() {

    // Until I decide to move to a full front-end framework
    // I enforce a single instance of this class
    if (++instanceCount > 1)
      throw new Error('Only one instance of RtcMuseServerConnection is allowed');

    const socket = io();
    this.socket = socket;

    socket.on('beginOffer', (data) => {
      console.log('we may begin the transaction:', data);
    });

    socket.on('malformed', (description) => { console.error(`malformed request: ${description}`); });
    socket.on('joined', (id) => { console.log(`joined: ${id}`); });
    socket.on('log', (text) => { console.log(text); });

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
