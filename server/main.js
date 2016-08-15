const path        = require('path');
const http        = require('http');
const Koa         = require('koa');
const koaMount    = require('koa-mount');
const koaStatic   = require('koa-static');
const IO          = require('socket.io');


const app = new Koa();

 
app.use(function *(next) { console.log(this.path);  yield next; });
app.use(koaStatic('build'));


// app.use BEFORE creating http server
const httpServer  = http.Server(app.callback());
const sockServer  = IO(httpServer);

sockServer.on('connection', (socket) => {
  console.log('connection socket:', Object.keys(socket));
  socket.emit('init', socket.id);
  socket.on('disconnect', () => { console.log('connection disconnect', socket.id); });

  socket.on('join', (id) => {

    if (typeof id !== 'string') {
      socket.emit('malformed', 'argument must be a string');
      console.log('bad join req. id:', id);
      return;
    }

    console.log('join', id);

  });
});

httpServer.listen(process.env.PORT || 3000);
