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
const transactions = {};


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


  socket.on('requestTransaction', (data) => {

    if (typeof data.peerId !== 'string') {
      socket.emit('malformed', 'data.peerId must be a string');
      return;
    }

    if (!socketsById.hasOwnProperty(data.peerId)) {
      socket.emit('malformed', 'could not find a peer with id: ' + data.peerId);
      return;
    }

    const transactionId = crypto.randomBytes(32).toString('hex');

    transactions[transactionId] = {
      offerSocket: socket,
      answerSocket: socketsById[data.peerId],
    }

    data.transactionId = transactionId;
    socket.emit('beginTransaction', data);

  });


  socket.on('offer', (data) => {});


});

httpServer.listen(process.env.PORT || 3000);
