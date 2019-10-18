var socket;

$(document).ready( function(){
    try{
        socket = io('http://localhost:3000');
    }
    catch(e){
        socket = null;
    }
});

function admin_auth(obj){
    socket_request('login', obj).then( (res, err) => {
        if (err) return console.log(err);
        console.log(res);
    });

    $.post("back_login.php", {
        action: "SET",
        admin: JSON.stringify(obj)
    }).done( function(data){
        //console.log(data);
    });
}

async function socket_request(route, data){
    return await $.ajax({
        type: "POST",
        url: "http://localhost:3000/"+ route,
        crossDomain: true,
        data: data,
        dataType: 'json',
        xhrFields: { withCredentials: true },
        success: (response) => response,
        error: (xhr, status) => status
    });
}

async function socket_ready(){
    async function isReady(){
        return await new Promise(resolve => {
            setTimeout(() => {
                if (socket && socket.connected)
                    resolve(true);
                else
                    resolve(false);
            }, 10);
        });
    }
    while (await isReady() === false);
    return socket;
}