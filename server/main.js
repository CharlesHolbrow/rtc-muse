const path        = require('path');
const Koa         = require('koa');
const IO          = require('koa-socket');
const mount       = require('koa-mount');
const koaStatic   = require('koa-static');
 

const app = new Koa();
const io  = new IO();

 
app.use(function *(next) { console.log(this.path);  yield next; });
app.use(koaStatic('build'));

 
io.on('join', ( ctx, data ) => { 
  console.log( 'join event fired', data );
});


io.on('connection', function(ctx, data) {
  console.log('connection ctx:', Object.keys(ctx));
  console.log('connection data:', data);
  console.log('connection socket:', Object.keys(ctx.socket));
  ctx.socket.emit('init', data);
  ctx.socket.on('disconnect', () => { console.log('connection disconnect', data); });
});


io.attach(app);
app.listen(process.env.PORT || 3000);
