import { post, waitFor } from "./utils.js"

export const socket = {
    serverURL: window.location.hostname,
    port: '8080',
    nodePort: '3000',
    connected: false,
    actionList: {},
}

socket.connect = function () {
    if (!this.connected) {
        this.ws = new WebSocket(`ws://${this.serverURL}:${this.port}`);

        this.ws.onopen = () => {
            console.log('connected to websocket server');
            this.connected = true;
        }

        this.ws.onclose = () => {
            if (this.connected) {
                console.log('websocket disconnected');
            }
            else {
                console.log('reconnecting to websocket server...');
            }
            this.connected = false;
            setTimeout(() => this.connect(), 1000);
        }

        // run callback event for receiving message for a room
        this.ws.onmessage = event => {
            const msg = JSON.parse(event.data);
            // console.log(msg, this.actionList);

            if (this.actionList[msg.action]) {
                this.actionList[msg.action](msg.message);
            }
        }
    }
}

socket.join = function (room) {
    this.ws.send(JSON.stringify({ command: 'join', room: room }));
}

socket.leave = function (room) {
    this.ws.send(JSON.stringify({ command: 'leave', room: room }));
}

// send message to specific room in the ws server
socket.emit = function (action, data, reply) {
    // console.log({ action: action, data: data });
    const timestamp = new Date().getTime();
    this.ws.send(JSON.stringify({ action: action, data: data, timestamp: timestamp }));
    socket.on(`reply-${timestamp}`, reply);
}

// register callback for when receive message from a specific room
socket.on = function (action, callback) {
    this.actionList[action] = callback;
}


socket.init = async function () {
    this.connect();
    return this;
}

socket.admin = async function (obj) {
    socket.request('login', obj).then((res, err) => {
        if (err) return console.log(err)
        console.log(res);
        if (res.session == true) {
            // window.location.reload()
        }
    })

    const resp = post("back_login.php", {
        action: "SET",
        admin: JSON.stringify(obj)
    })
    // console.log(await resp)
}

socket.request = async function (route, data) {
    // return await $.ajax({
    //     type: "POST",
    //     url: `${this.serverURL}/${route}`,
    //     crossDomain: true,
    //     data: data,
    //     dataType: 'json',
    //     xhrFields: { withCredentials: true },
    //     success: (response) => response,
    //     error: (xhr, status) => status
    // });
    const request = await fetch(`//${this.serverURL}:${this.nodePort}/${route}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(data).toString(),
        credentials: "include"
    })
    return await request.json()
}

socket.isReady = async function () {
    if (!this.connected) {
        await this.init();
    }

    await waitFor(() => this.connected);
    return this;
}