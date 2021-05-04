const WebSocket = require('ws');
export const server = new WebSocket.Server({
    port: 8080
});

server.clientList = [];
server.actionList = {};
server.roomList = {};

server.on('connection', function (socket) {
    this.clientList.push(socket);
    socket.send(JSON.stringify({ action: 'connect', data: {
        message: 'Connection to WebSocket server estabilished'
    } }));

    socket.on('message', message => {
        message = JSON.parse(message);
        
        if (message.command){
            // call join or leave function
            if (['join', 'leave'].includes(message.command)) {
                this[message.command](message.room, socket);
            }
        }
        else if (message.action && this.actionList[message.action]){
            this.actionList[message.action](data);
        }        
    });
    
    // remove client from list
    socket.on('close', () => {
        this.clientList = this.clientList.filter(s => s !== socket);

        socket.send(JSON.stringify({ action: 'disconnect', data: {
            message: 'Disconnected from WebSocket server'
        } }));    
    });
});

server.join = function(room, client) {
    if (this.roomList[room]){
        this.roomList[room].push(client);
    }
    else{
        this.roomList[room] = [client];
    }
}

server.leave = function(room, client) {
    if (this.roomList[room]){
        this.roomList[room] = this.roomList[room].filter(e => e != client);

        if (this.roomList[room] == 0){
            delete this.roomList[room];
        }
    }
}

server.emit = function(room = 'everyone', action, data) {
    const clients = room == 'everyone' ? this.clientList : (this.roomList[room] || []);
    clients.forEach(c => c.send(JSON.stringify({ action: action, data: data })));
}

server.addAction = function(action, callback){
    this.actionList[action] = callback;
}

