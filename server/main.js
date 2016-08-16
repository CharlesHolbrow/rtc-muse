const path        = require('path');
const http        = require('http');
const Koa         = require('koa');
const koaMount    = require('koa-mount');
const koaStatic   = require('koa-static');
const koaRoute    = require('koa-route');
const IO          = require('socket.io');


const app         = new Koa();
const httpServer  = http.Server(app.callback());
const sockServer  = IO(httpServer);


app.use(koaRoute.post('/emit/:room/:event/:msg?', function*(room, event, msg) {
  console.log('emit:', room, event, msg);
  sockServer.in(room).emit(event, msg);
  this.response.status = 202;
}));


app.use(koaStatic('build'));

sockServer.on('connection', (socket) => {
  console.log('connection socket:', socket.id);
  socket.emit('init', socket.id);
  socket.on('disconnect', () => { console.log('connection disconnect', socket.id); });

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
});

httpServer.listen(process.env.PORT || 3000);
