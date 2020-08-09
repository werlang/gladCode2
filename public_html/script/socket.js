export const socket = {
    serverURL: `//${window.location.hostname}:3000`
}

socket.init = function(){
    $.getScript(`${this.serverURL}/socket.io/socket.io.js`, function(){
        try{
            socket.io = io(serverURL, {secure: true})
        }
        catch(e){
            socket.io = null
        }
    })
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
    async function isReady(){
        return await new Promise(resolve => {
            setTimeout(() => {
                if (socket.io && socket.io.connected)
                    resolve(true);
                else
                    resolve(false);
            }, 10);
        });
    }
    while (await isReady() === false);
    return socket;
}