import io from 'socket.io-client';
window.io = io;

export const socket = io();


socket.on('init', (id) => {
  document.getElementById('socket-id').innerHTML = id;
});

socket.on('beginTransaction', (data) => {
  console.log('we may begin the transaction:', data);
});

socket.on('malformed', (description) => { console.error(`malformed request: ${description}`); });
socket.on('joined', (id) => { console.log(`joined: ${id}`); });
socket.on('log', (text) => { console.log(text); });


document.getElementById('connect-form').onsubmit = (event) => {
  event.preventDefault();
  const peerId = document.getElementById('peerId').value;
  if (peerId.lenght <= 8)
    throw new Error('Id not long enough');
  socket.emit('requestTransaction', { peerId });
}