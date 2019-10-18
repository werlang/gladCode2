var socket = io('http://localhost:3000');

socket.on('connect', function () {
    var id = socket.io.engine.id;
    //console.log("ID: "+id);
   
    post_socket("back.php", {
        action: "SUM",
        v1: "3",
        v2: 2
    }).then( function(data){
        //console.log(data);

        if (data.error)
            $('body p').html(data.error);
        else
            $('body p').html(data.output);
    });

    socket.emit('query', 'oi');
    socket.on('query', function(msg){
        console.log(msg);
    });
});


function post_socket(file, obj){
    var resp = $.Deferred();

    socket.emit('send back', {file: file, obj: obj});
    socket.on('send back', function(msg){
        return resp.resolve(msg);
    });
    
    return resp.promise();
}
