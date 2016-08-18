const path        = require('path');
const http        = require('http');
const crypto      = require('crypto');
const Koa         = require('koa');
const koaMount    = require('koa-mount');
const koaStatic   = require('koa-static');
const koaRoute    = require('koa-route');
const IO          = require('socket.io');


const app         = new Koa();
const httpServer  = http.Server(app.callback());
const sockServer  = IO(httpServer);


// CAUTION: Storing sockets in memory may make it harder to scale our app
const socketsById = {};
const iceTransactions = {};



app.use(koaRoute.post('/emit/:room/:event/:msg?', function*(room, event, msg) {
  console.log('emit:', room, event, msg);
  sockServer.in(room).emit(event, msg);
  this.response.status = 202;
}));


app.use(koaStatic('build'));


// When a socket joins, register the event handlers on it.
sockServer.on('connection', (socket) => {

  // keep track of our active sockets in memory
  socketsById[socket.id] = socket;
  socket.on('disconnect', () => {
    delete socketsById[socket.id];
    console.log('current sockets:', Object.keys(socketsById));
  });

  console.log('current sockets:', Object.keys(socketsById));
  socket.emit('init', socket.id);

  // Clients may request to join a socket.io room
  socket.on('join', (id) => {

    if (typeof id !== 'string') {
      socket.emit('malformed', 'argument must be a string');
      console.log('bad join req. id:', id);
      return;
    }

    console.log('join', id);
    socket.join(id);
    socket.emit('joined', id);

  });


  // If a client wants to make an offer, she calls this method to get a
  // iceId from the server. This iceId must accompany any further requests
  // made by the client as part of this transaction. For example, the
  // client must include the iceId sending iceCandidates and webRtc offer
  socket.on('initiateIceTransaction', (data) => {

    if (typeof data.answerPeerId !== 'string') {
      socket.emit('malformed', 'data.answerPeerId must be a string');
      return;
    }

    if (typeof data.requestId !== 'string') {
      socket.emit('malformed', 'data.requestId must be a string');
      return;
    }

    if (!socketsById.hasOwnProperty(data.answerPeerId)) {
      socket.emit('malformed', 'could not find a peer with id: ' + data.answerPeerId);
      return;
    }

    const iceId = crypto.randomBytes(32).toString('hex');

    iceTransactions[iceId] = {
      iceId: iceId,
      offerSocket: socket,
      answerSocket: socketsById[data.answerPeerId],
    };

    const offerPeerData = {
      iceId: iceId,
      offerPeerId: socket.id,
      answerPeerId: data.answerPeerId,
      // requestId tells the client which request we are
      // responding to
      requestId: data.requestId,
    };

    socket.emit('beginOffer', offerPeerData);

  });


  // After the client invokes 'initiateIceTransaction', she will receive
  // an iceId, and may send us the offers and ice candidates to forward to
  // the answerer.
  socket.on('offer', (data) => {

    if (typeof data.iceId !== 'string') {
      socket.emit('malformed', 'data.iceId must be a string');
      return;
    }

    if (typeof data.sdp !== 'string') {
      socket.emit('malformed', 'data.sdp must be a string');
      return;
    }

    if (!iceTransactions.hasOwnProperty(data.iceId)) {
      socket.emit('malformed', 'no transaction for iceId: ' + data.iceId);
      return;
    }

    const transaction = iceTransactions[data.iceId];
    const peerSocket = transaction.answerSocket;

    // call the 'createAnswer' method on the peer who will respond
    const answerPeerData = {
      iceId: data.iceId,
      sdp: data.sdp,
    }

    peerSocket.emit('createAnswer', answerPeerData);
  });


});

httpServer.listen(process.env.PORT || 3000);
