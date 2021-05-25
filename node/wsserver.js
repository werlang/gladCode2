const WebSocket = require('ws');
const server = new WebSocket.Server({
    port: 8080
});

server.clientList = [];
server.actionList = {};
server.roomList = {};

server.on('connection', function (socket) {
    this.clientList.push(socket);
    socket.send(JSON.stringify({
        action: 'connect', data: {
            message: 'Connection to WebSocket server estabilished'
        }
    }));

    socket.on('message', message => {
        message = JSON.parse(message);
        // console.log(message);

        if (message.command) {
            // call join or leave function
            if (['join', 'leave'].includes(message.command)) {
                socket[message.command](message.room);
            }
        }
        else if (message.action && this.actionList[message.action]) {
            this.actionList[message.action](message.data, reply => {
                if (message.timestamp && reply) {
                    // console.log(reply);
                    socket.send(JSON.stringify({ action: `reply-${message.timestamp}`, data: reply }));
                }
            });
        }
    });

    // remove client from list
    socket.on('close', () => {
        this.clientList = this.clientList.filter(s => s !== socket);

        socket.send(JSON.stringify({
            action: 'disconnect', data: {
                message: 'Disconnected from WebSocket server'
            }
        }));
    });

    socket.join = room => {
        if (this.roomList[room]) {
            this.roomList[room].push(socket);
        }
        else {
            this.roomList[room] = [socket];
        }
    }

    socket.leave = room => {
        if (this.roomList[room]) {
            this.roomList[room] = this.roomList[room].filter(e => e != socket);

            if (this.roomList[room] == 0) {
                delete this.roomList[room];
            }
        }
    }

    socket.addAction = (action, callback) => {
        this.actionList[action] = callback;
    }

    if (this.init) {
        this.init(socket);
    }
});

server.emit = function (room = 'everyone', action, data) {
    // console.log({ room: room, action: action, data: data });
    const clients = room == 'everyone' ? this.clientList : (this.roomList[room] || []);
    clients.forEach(c => c.send(JSON.stringify({ action: action, data: data })));
}

module.exports = server;