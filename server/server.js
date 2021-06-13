const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const { generateMessage, generateLocationMessage } = require('./utils/message');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');
const port = process.env.PORT || 5000;
const publicPath = path.join(__dirname, '../public/');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();
app.use(express.static(publicPath));

io.on('connection', (socket) => {
    console.log('New user connected ...');

    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('proper name and room name format are required!');
        }
        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);
        console.log(socket.id + ' has connected to the CHAT');
        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage', generateMessage('admin', 'welcome to Anna Dhan chat box , wait for your service-man!'));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('admin', `${params.name} just joined the ${params.room} chat!`));
        callback();
    })
    socket.on('typing', (data) => {
        var user = users.getUser(socket.id);
        socket.broadcast.to(user.room).emit('typing', data = `${user.name} is typing ...`);
    })
    socket.on('createMessage', (message, callback) => {
        var user = users.getUser(socket.id);
        if (user && isRealString(message.text)) {
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
        }

        callback();
    })
    socket.on('createLocationMessage', (coords) => {
        var user = users.getUser(socket.id);
        if (user) {
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, `${coords.latitude}, ${coords.longitude}`));
        }
    })

    socket.on('disconnect', function() {
        const user = users.removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('admin', `${user.name} has left the ${user.room} room!`));
        }
        console.log('Disconnected from server ...');
    })
});

server.listen(port, () => {
    console.log(`Server is running on port ${port} ...`);
})