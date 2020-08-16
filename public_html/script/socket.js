import {post} from "./header.js"

export const socket = {
    serverURL: `//${window.location.hostname}:3000`,
    io: null
}

socket.init = async function(){
    // true to avoid entering this more than once
    this.io = true
    
    await $.getScript(`${this.serverURL}/socket.io/socket.io.js`)

    try{
        this.io = io(this.serverURL, {secure: true})
    }
    catch(e){
        this.io = null
    }

    return this
}

socket.admin = function(obj){
    socket.request('login', obj).then( (res, err) => {
        if (err) return console.log(err)
        console.log(res);
        if (res.session == true){
            window.location.reload()
        }
    })
    
    post("back_login.php", {
        action: "SET",
        admin: JSON.stringify(obj)
    })
}

socket.request = async function(route, data){
    return await $.ajax({
        type: "POST",
        url: `${this.serverURL}/${route}`,
        crossDomain: true,
        data: data,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: (response) => response,
        error: (xhr, status) => status
    });
}

socket.isReady = async function(){
    if (!this.io){
        await this.init()
    }
    return await new Promise(resolve => {
        checkAgain()
        function checkAgain(){
            if (socket.io && socket.io.connected){
                resolve(socket)
            }
            else{
                setTimeout(() => {
                    checkAgain()
                }, 10);
            }
        }
    });
}