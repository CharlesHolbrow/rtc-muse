const path        = require('path');
const http        = require('http');
const Koa         = require('koa');
const mount       = require('koa-mount');
const koaStatic   = require('koa-static');
const IO          = require('socket.io');


const app = new Koa();

 
app.use(function *(next) { console.log(this.path);  yield next; });
app.use(koaStatic('build'));


// app.use BEFORE creating http server
const server  = http.Server(app.callback());
const io      = IO(server);

io.on('join', ( socket ) => {
  console.log( 'join event fired', data );
});


io.on('connection', (socket) => {
  console.log('connection socket:', Object.keys(socket));
  socket.emit('init', socket.id);
  socket.on('disconnect', () => { console.log('connection disconnect', socket.id); });
});

server.listen(process.env.PORT || 3000);
