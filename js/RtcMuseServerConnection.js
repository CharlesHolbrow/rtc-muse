import io from 'socket.io-client';

// Until I decide to move to a full front-end framework
// I enforce a single instance of this class
let instanceCount = 0;


function randomId() {
  return Math.random().toString(36).substr(2, 8);
}


export class RtcMuseServerConnection {
  constructor(socket) {

    // note that even though can can construct a socket by
    // calling 'new io()', the value returned will be an
    // instance of io.Socket
    if (!(socket instanceof io.Socket))
      throw new Error('RtcMuseServerConnection requires a socket instance')

    // Until I decide to move to a full front-end framework
    // I enforce a single instance of this class
    if (++instanceCount > 1)
      throw new Error('Only one instance of RtcMuseServerConnection is allowed');

    this.socket = socket;

    socket.on('beginOffer', (data) => {
      console.log(`we may begin the transaction: ${data.iceId}`);
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
