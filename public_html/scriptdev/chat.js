sendingBuffer = [];
clearToSend = true;
var emoji;
var recentEmoji = [];

$(document).ready( function(){
    chat_started().then( () => {
        socket_ready().then( function() {
            socket_request('login', {}).then( function(res, err){
                if (err) return console.log(err);
                //console.log(res);
                if (res.session === true){
                    listRooms({rebuild: true}).then( () => {
                        getChatNotification();
                    });
                }
                else{
                    $('#chat-panel').click( () => {
                        if (!$('#dialog-box').length){
                            showDialog("Faça login na gladCode para participar do chat",["Cancelar","LOGIN"]).then( function(data){
                                if (data == "LOGIN"){
                                    googleLogin().then(function(data) {
                                        window.location.reload();
                                    });
                                }
                            });
                        }
                    });
                }
            });

            socket.on('chat notification', (data) => {
                getChatNotification();
                if ($('#chat-panel .room.open').data('id') == data.room){
                    getChatMessages({room: data.room, sync: true});
                }
            });
        });

        //prepare emojis
        emoji = new EmojiConvertor();
        emoji.use_sheet = true;
        emoji.supports_css = true;
        emoji.img_set = "google";
        emoji.img_sets.google.sheet = "https://cdn.jsdelivr.net/npm/emoji-datasource-google@4.1.0/img/google/sheets-128/64.png";
        emoji.init_unified();

        var emoji_categ = ["Smileys & People", "Animals & Nature", "Food & Drink", "Activities", "Travel & Places", "Objects", "Symbols", "Flags"];
        var emojiStr = [];

        $.post("back_chat.php", {
            action: "EMOJI"
        }).done( data => {
            //console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(e){
                data = {emoji: ''};
            }
            if (data.emoji != '')
                recentEmoji = JSON.parse(data.emoji);

            emojiStr.push([]);
            for (let i in recentEmoji){
                emojiStr[0].push({img: emoji.replace_unified(recentEmoji[i]), unicode: recentEmoji[i], order: i});
            }

            $('#chat-panel #emoji-container').append("<div id='categ-0' class='categ-container'></div>");
            for (let i in emoji_categ){
                var i1 =  Math.floor(i) + 1;
                $('#chat-panel #emoji-container').append("<div id='categ-"+ i1 +"' class='categ-container'></div>");
                emojiStr.push([]);
            }
        
            for (let i in emoji.map.unicode){
                var categ = emoji.map.unicode[i].category;
                var categi = emoji_categ.indexOf(categ) + 1;
        
                if (categi != 0){
                    emojiStr[categi].push({img: emoji.replace_unified(i), unicode: i, order: emoji.map.unicode[i].order});
                }
            }
        
            for (let i=0 ; i< emoji_categ.length+1 ; i++){
                emojiStr[i].sort( function(a, b){
                    return a.order - b.order;
                });
                $('#chat-panel #emoji-container #categ-'+ i).append("<div class='title'>"+ $('#emoji-ui #category-buttons i').eq(i).attr('title') +"</div>");

                //remove repeated that for some reason emoji.map prints
                for (let j in emojiStr[i]){
                    while(j < emojiStr[i].length - 1 && emojiStr[i][j].img == emojiStr[i][Math.floor(j)+1].img)
                        emojiStr[i].splice(j, 1);
                }
                for (let j in emojiStr[i]){
                    $('#chat-panel #emoji-container #categ-'+ i).append(emojiStr[i][j].img);
                    $('#chat-panel #emoji-container #categ-'+ i +' .emoji-outer').last().data('unicode', emojiStr[i][j].unicode);
                }
            }

            var preventScroll = false;
            $('#chat-panel #emoji-container').scroll( function(){
                if (!preventScroll){
                    for (let i = $(this).find('.categ-container').length-1 ; i>=0 ; i--){
                        var ct = $(this).find('.categ-container').eq(i).position().top - $(this).position().top;
                        if(ct <= 10){
                            $('#chat-panel #category-buttons i').removeClass('selected');
                            $('#chat-panel #category-buttons i').eq(i).addClass('selected');
                            break;
                        }
                    }
                }
            });
        
            $('#chat-panel #category-buttons i').click( function(){
                preventScroll = true;
                $('#chat-panel #emoji-container').scrollTop(0);
                var i = $('#chat-panel #category-buttons i').index($(this));
                var ct = $('#chat-panel #emoji-container .categ-container').eq(i).position().top - $('#chat-panel #emoji-container').position().top;
                $('#chat-panel #emoji-container').scrollTop(ct);
                preventScroll = false;
            });
            
            $('#chat-panel #emoji-container .emoji-outer').click( function(){
                var t = $('#chat-panel #message-box').html();
                var e = $(this).data('unicode');
        
                let pos = -1;
                if (recentEmoji)
                    pos = recentEmoji.indexOf(e);

                if (pos != -1)
                    recentEmoji.splice(pos, 1);
                else
                    $('#chat-panel #emoji-container #categ-0 .title').after($(this).clone(true));

                if (recentEmoji)
                    recentEmoji.unshift(e);

                $('#chat-panel #message-box').append( emoji.replace_unified(e) );
                $('#chat-panel #message-box .emoji-outer').attr('contenteditable', false);
                $('#chat-panel #message-box .emoji-outer').last().data('unicode', e);
                $('#chat-panel #message-box').append("<span>0</span>");
                
                //gambiarra pra conseguir colocar o cursor na posição final da caixa: da problema quando o span ta vazio
                var sel = window.getSelection();
                window.getSelection().collapse($('#chat-panel #message-box span').last()[0].firstChild, 0);
                $('#chat-panel #message-box span').last().html("<span></span>"); //esse span interno previne que adicione um <br> ao apagar o emoji depois do primeiro???? gambiarra
            });
        });

        $('#chat-panel #send').click( function(){
            var text = '';
            $.each( $('#chat-panel #chat-ui #message-box > span'), function(i,obj){
                if ($(obj).hasClass('emoji-outer'))
                    text += $(obj).data('unicode');
                else
                    text += $(obj).text();
            } );

            if (text == '/help'){
                $('#chat-panel #help').click();
                $('#chat-panel #chat-ui #message-box').html("").focus();
            }   
            else{

                sendingBuffer.push(text);   
                $('#chat-panel #chat-ui #message-box').html("").focus();

                if ($('#chat-panel .button-container #emoji').hasClass('selected'))
                    $('#chat-panel .button-container #emoji').click();
            
                sendMessage();

                function sendMessage(){
                    if (clearToSend){
                        clearToSend = false;
                        var message = sendingBuffer.shift();
                        var room = $('#chat-panel .room.open').data('id');

                        if (message != '' && room != ''){
                            //console.log("send: "+message);
                            $.post("back_chat.php", {
                                action: "SEND",
                                message: message,
                                room: room,
                                emoji: recentEmoji
                            }).done( function(data){
                                //console.log(data);

                                try {
                                    data = JSON.parse(data);
                                }
                                catch(e){
                                    console.log(data);
                                    console.log(e);
                                }

                                recentEmoji = [];
                                clearToSend = true;
                                var status = data.status;
                                if (status == "UNKNOWN"){
                                    create_toast("Comando desconhecido", "error");
                                }
                                else if (status == "LEFT"){
                                    listRooms({remove: data.name});
                                    create_toast("Você saiu da sala "+ data.name, "success");
                                }
                                else if (status == "JOINED"){
                                    listRooms({insert: data.name});
                                    create_toast("Bem-vindo à sala "+ data.name, "success");
                                }
                                else if (status == "CREATED"){
                                    listRooms({insert: data.name});
                                    create_toast("Sala "+ data.name +" criada", "success");
                                }
                                else if (status == "EDITED"){
                                    listRooms({});
                                    create_toast("Sala atualizada", "success");
                                }
                                else if (status == "NOTFOUND")
                                    create_toast("Sala não encontrada", "error");
                                else if (status == "NOPERMISSION")
                                    create_toast("Você não possui permissão para realizar esta ação", "error");
                                else if (status == "PROMOTED")
                                    create_toast("O usuário "+ data.target +" foi promovido", "success");
                                else if (status == "MAXPROMOTION")
                                    create_toast("O usuário "+ data.target +" não pode mais ser promovido", "info");
                                else if (status == "NOTARGET"){
                                    if (data.command == 'ban')
                                        create_toast("O usuário "+ data.target +" não foi encontrado na sala", "error");
                                    else
                                        create_toast("O usuário "+ data.target +" não está banido", "info");
                                }
                                else if (status == "ALREADYBANNED")
                                    create_toast(data.target +" já está banido da sala", "error");
                                else if (status == "BANNED")
                                    create_toast("Você foi banido desta sala e não pode enviar mensagens", "info");
                                else if (status == "SILENCED")
                                    create_toast("Você foi silenciado até " + data.time, "info");
                                else if (status == "NOROOM")
                                    create_toast("Entre em uma sala antes", "info");
                                else if (status == "EXISTS")
                                    create_toast("A sala "+ data.name +" já existe", "info");
                                else if (status == "ACTIVE")
                                    create_toast("Os líderes desta sala estão ativos", "info");
                                else if (status == "RESTRICTED")
                                    create_toast("Você possui restrições a esta sala e não poderá assumir seu comando", "error");
                                else if (status == "LIST"){
                                    if (data.room){
                                        var table = [
                                            [{data: "LISTAGEM DE SALAS PÚBLICAS", class: "head"}],
                                            [{data: "Nome", class: "head half"}, {data: "#", class: "head small"}, {data: "Descrição", class: "head"}],
                                        ];
                                        for (let i in data.room){
                                            table.push([{data: data.room[i].name, class: "half"}, {data: data.room[i].members, class: "small"}, {data: data.room[i].description}]);
                                        }
                                    }
                                    else if (data.user){
                                        var table = [
                                            [{data: "LISTAGEM DE PARTICIPANTES DA SALA", class: "head"}],
                                            [{data: "Autoridade", class: "head half"}, {data: "Nome", class: "head"}, {data: "Na sala desde", class: "head half"}, {data: "Último login", class: "head half"}],
                                        ];
                                        for (let i in data.user){
                                            table.push([{data: data.user[i].privilege, class: "half"}, {data: data.user[i].apelido}, {data: data.user[i].since, class: "half"}, {data: data.user[i].login, class: "half"}]);
                                        }
                                        table.push([{data: "Total de "+ data.user.length +" participantes"}]);
                                    }
                                    sendChatTable(table);
                                }

                                if (sendingBuffer.length > 0){
                                    sendMessage();
                                }
                            
                            });
                        }
                        else
                            clearToSend = true;
                    }
                }
            }
        });

        $('#chat-panel #help').click( () => {
            if ($('#chat-panel #chat-window').length == 0){
                $('#chat-panel #view-area').prepend(`<div id='chat-window'></div>`);
            }

            var table = [
                [{data: "COMANDOS DO CHAT", class: "head"}],
                [{data: "Comando", class: "head half"}, {data: "Descrição", class: "head"}],
                [{data: "/show rooms", class: "half"}, {data: "Mostra todas salas públicas", class: ""}],
                [{data: "/show users", class: "half"}, {data: "Mostra todos membros da sala", class: ""}],
                [{data: "/list", class: "half"}, {data: "O mesmo que /show<br>Ex: /list rooms", class: ""}],
                [{data: "/join SALA", class: "half"}, {data: "Entra na SALA (caso exista)<br>Ex: /join gladcode", class: ""}],
                [{data: "/create SALA [-pvt] [-d DESC]", class: "half"}, {data: "Cria a SALA (caso não exista)<br>-pvt => (Opcional) Torna a sala privada<br>-d DESC => (Opcional) Insere uma descrição para a sala<br>Ex: /create sala teste -d descrição da sala -pvt", class: ""}],
                [{data: "/leave SALA", class: "half"}, {data: "Sai da SALA<br>Ex: /leave gladcode", class: ""}],
                [{data: "/leave", class: "half"}, {data: "Sai da sala atualmente aberta", class: ""}],
                [{data: "/claim", class: "half"}, {data: "Torna-se o líder da sala aberta, caso os líderes estejam há muito inativos", class: ""}],
                [{data: "/promote MEMBRO", class: "half"}, {data: "Torna o MEMBRO um líder da sala aberta<br>Ex: /promote fulaninho", class: ""}],
                [{data: "/ban MEMBRO", class: "half"}, {data: "Remove permissão do MEMBRO de ver mensagens da sala (Precisa ser Líder)<br>Ex: /ban fulaninho", class: ""}],
                [{data: "/unban MEMBRO", class: "half"}, {data: "Devolve a permissão do MEMBRO de participar normalmente da sala (Precisa ser Líder)<br>Ex: /unban fulaninho", class: ""}],
                [{data: "/edit [-n NOME] [-d DESC] [-pvt | -pub]", class: "half"}, {data: "Edita informações da sala.<br>-n NOME => (Opcional) Altera o nome da sala<br>-d DESC => (Opcional) Altera a descrição da sala<br>-pvt => (Opcional) Torna a sala privada<br>-pub => (Opcional) Torna a sala pública<br>Ex: /edit -n novo nome -d descrição da sala -pub", class: ""}],
            ];

            sendChatTable(table);
        });

        $('#chat-panel #chat-ui').keyup( function(e){
            var input = $(this).find('#message-box');
            //key enter
            if(e.keyCode == 13) {
                $('#chat-panel #send').click();
                e.preventDefault();
            }

            if (input.text() == ''){
                $('#chat-panel #send').addClass('hidden');
                $('#chat-panel #help').removeClass('hidden');
            }
            else if ($('#chat-panel #send').hasClass('hidden')){
                $('#chat-panel #send').removeClass('hidden');
                $('#chat-panel #help').addClass('hidden');
            }
            
        });

        $('#chat-panel #show-hide').click( () => {
            if ($('#chat-panel').hasClass('hidden')){
                $('#chat-panel').removeClass('hidden');
            }
            else{
                if ($('#chat-panel .room.open').length)
                    $('#chat-panel .room.open').click();

                $('#chat-panel').addClass('hidden');

                if ($('#chat-panel .button-container #emoji').hasClass('selected'))
                    $('#chat-panel .button-container #emoji').click();
            }
        });

        $('#chat-panel #open-new').click( function(){
            window.open('chat');
            $('#chat-panel #show-hide').click();
        });

        $('#chat-panel #emoji').click( function(){
            if ($('#chat-panel.full').length || $('#chat-panel .room.open').length){
                if ($(this).hasClass('selected')){
                    $(this).removeClass('selected');
                    $('#chat-panel #emoji-ui').removeClass('visible');
                }
                else{
                    $(this).addClass('selected');
                    $('#chat-panel #emoji-ui').addClass('visible');
                }
            }
        });

        $('#chat-panel #message-box').on('keydown', function(e){
            if ($(this).find('span').length == 0)
                $(this).append("<span></span>");
            $(this).find('span').last().focus();

        });
    });
});

function sendChatTable(json){
    $('#chat-panel #chat-window').append("<div class='chat-table'></div>");
    var table = $('#chat-panel #chat-window .chat-table').last().hide().fadeIn(600);
    //console.log(json);
    for (let i in json){
        table.append("<div class='row'></div>");
        var row = table.find('.row').last();
        for (let j in json[i]){
            cclass = '';
            if (json[i][j].class)
                cclass = json[i][j].class;
            row.append("<div class='cell "+ cclass +"'>"+ json[i][j].data +"</div>");
        }
    }
}

async function listRooms(arg){
    await socket.emit('chat rooms', function(data){
        //console.log(data);

        var rebuild = false;
        if (arg && arg.rebuild)
            rebuild = true;

        if (rebuild){
            $('#chat-panel #room-container').html("");

            var room = data.room;
            for (let i in room){
                $('#chat-panel #room-container').append(`<div class='room visible'>
                    <div id='title'>
                        <span class='notification hide'>0</span>
                        <i class='material-icons'>chevron_right</i>
                        <span class='name'>${room[i].name}</span>
                    </div>
                </div>`);
                $('#chat-panel #room-container .room').last().data({ id: room[i].id }).css({order: i});
                bind_room_click($('#chat-panel #room-container .room').last());
            }

            $('#chat-panel #chat-window').remove();
        }
        else{
            var currentRoms = [];
            $('#chat-panel #room-container .room').each( (i, obj) => {
                currentRoms.push({
                    id: $(obj).data('id'),
                    name: $(obj).find('.name').html()
                });
            });

            for (let i in currentRoms){
                for (let j in data.room){
                    if (data.room[j].id == currentRoms[i].id){
                        currentRoms[i].order = j;
                        currentRoms[i].name = data.room[j].name;
                    }
                }
            };

            if (arg && arg.remove){
                for (let i in currentRoms){
                    if (currentRoms[i].name.toLowerCase() == arg.remove.toLowerCase()){
                        var target = $('#chat-panel #room-container .room').eq(i);
                        if (target.hasClass('open')){
                            $('#chat-panel #chat-window').remove();
                            $('#chat-panel .room').addClass('visible');
                        }
                        target.remove();
                        currentRoms.splice(i, 1);
                        break;
                    }
                }
            }
            else if (arg && arg.insert){
                for (let i in data.room){
                    if (data.room[i].name.toLowerCase() == arg.insert.toLowerCase()){
                        currentRoms.push({
                            id: data.room[i].id,
                            name: data.room[i].name,
                            order: i,
                        });
                        break;
                    }
                }
            }

            for(let i in currentRoms){
                var room = $('#chat-panel #room-container .room').eq(i);
                if (currentRoms[i].id == room.data('id')){
                    room.css({order: currentRoms[i].order})
                    if (room.find('.name').html() != currentRoms[i].name)
                        room.find('.name').html(currentRoms[i].name);
                }
                else{
                    $('#chat-panel #room-container').append(`<div class='room visible'>
                        <div id='title'>
                            <span class='notification hide'>0</span>
                            <i class='material-icons'>chevron_right</i>
                            <span class='name'>${currentRoms[i].name}</span>
                        </div>
                    </div>`);
                    var newroom = $('#chat-panel #room-container .room').last();
                    newroom.data({ id: currentRoms[i].id }).css({order: currentRoms[i].order});
                    bind_room_click(newroom);
                    newroom.click();
                }
            }

        }
    });

    return true;

    function bind_room_click(room){
        room.click( function(e){
            if (!$('#chat-panel').hasClass('hidden')){
                if ($('#chat-panel #emoji-ui').hasClass('visible'))
                    $('#chat-panel #chat-ui #emoji').click();

                if (!$('#chat-panel').hasClass('full') || !$(this).hasClass('open')){
                    var reopen = true;
                    if (!$('#chat-panel').hasClass('full') && $(this).hasClass('open'))
                        reopen = false;

                    $('#chat-panel #chat-window').remove();
                    $('#chat-panel .room').removeClass('open');
                    $('#chat-panel .room').addClass('visible');
                    $(this).find('#title i').removeClass('hide');

                    if (reopen){
                        $('#chat-panel #view-area').prepend("<div id='chat-window'></div>");
                        $(this).addClass('open');
                        $('#chat-panel .room').not($(this)).removeClass('visible');
                        $(this).find('#title .notification').addClass('hide').html("0");
                        getChatMessages({room: room.data('id')});
                        $('#chat-panel #chat-ui #message-box').focus();
                    }

                    $('#chat-window').scroll( function(){
                        if ($('#chat-window .baloon').length){
                            var postop = $('#chat-window .baloon').first().position().top;
                            if (postop > -100){
                                getChatMessages({room: room.data('id'), prepend: true});
                            }
                        }
                    });
                }
            }
            else{
                $('#chat-panel #show-hide').click();
            }
        });
    }
}

function getChatNotification(){
    listRooms().then( () =>{
        $.post("back_chat.php", {
            action: "NOTIFICATIONS",
        }).done( function(data){
            //console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(e){
                console.log(data);
                console.log(e);
            }
    
            if (data.status == "SUCCESS"){
                var notif = data.notifications;
                $.each( $('#chat-panel .room'), function(i,obj){
                    var id = $(obj).data('id');
    
                    var notif_val = parseInt(notif[id]);
                    if (notif_val > 0 && !$(obj).hasClass('open')){
                        $(obj).find('#title .notification').removeClass('hide').html(notif_val);
                        $(obj).find('#title i').addClass('hide');
    
                        if (notif_val >= 1000)
                            $(obj).find('#title .notification').addClass('small');
                        else if ($(obj).find('#title .notification').hasClass('small'))
                            $(obj).find('#title .notification').removeClass('small');
                    }
                });
            }
        });
    });

}

var scrolling = false;
function getChatMessages(options){
    var id = options.room;
    if (id && !scrolling){ //tem janela aberta
        scrolling = true;
        var firstid = 0;
        var prepend = false;
        if (options && options.prepend === true){
            prepend = true;
            firstid = $('#chat-panel #chat-window .baloon-container').first().data('id');
        }
        var sync = false;
        if (options && options.sync)
            sync = true;

        $.post("back_chat.php", {
            action: "MESSAGES",
            id: id,
            first: firstid,
            sync: sync
        }).done( function(data){
            //console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(e){
                console.log(data);
                console.log(e);
            }

            scrolling = false;
            
            if ($('#chat-panel #chat-window')[0]){
                var oldHeight = $('#chat-panel #chat-window')[0].scrollHeight;
                var oldPos = $('#chat-panel #chat-window')[0].scrollTop;
            }

            var nowid = $('#chat-panel .room.open').data('id'); 
            if (data.status == "SUCCESS"){
                if ($('#chat-panel #chat-window').length && nowid == id){
                    if (prepend)
                        var messages = data.messages;
                    else
                        var messages = data.messages.reverse();
                    for (let i in messages){
                        if (messages[i].system == 1){
                            var str = "<div class='baloon-container system'><div class='baloon'>"+ messages[i].message +"</div></div>";
                            if (prepend){
                                $('#chat-panel #chat-window').prepend(str);
                                $('#chat-panel #chat-window .baloon-container').first().data('id', messages[i].id);
                            }
                            else{
                                $('#chat-panel #chat-window').append(str);
                                $('#chat-panel #chat-window .baloon-container').last().data('id', messages[i].id);
                            }
                        }
                        else{
                            messages[i].message = emoji.replace_unified(messages[i].message);
                            var hasText = '';
                            if (messages[i].message.replace(/<span class="emoji[\w\W]+?<\/span><\/span>/g, "") == "")
                                hasText = 'no-text';

                            var me = '';
                            if (messages[i].me)
                                me = 'me';
                            var sequence = '';

                            //check who is the last baloon
                            var lastid = $('#chat-panel .baloon').length - 1;

                            //if not prepend and last baloon is from me
                            if (!prepend && $('#chat-panel .baloon-container').eq(lastid).find('.name').html() == messages[i].apelido)
                                sequence = 'sequence';

                            //if prepending and first baloon is from same person than previous
                            if (prepend && $('#chat-panel .baloon-container').eq(0).find('.name').html() == messages[i].apelido)
                                $('#chat-panel .baloon-container').eq(0).addClass('sequence');

                            /*
                            var visible = '';
                            if ($('#chat-panel .baloon-container').last().find('.name').html() == messages[i].apelido){
                                $('#chat-panel .baloon-container').last().find('.avatar').removeClass('visible');
                            }
                            visible = 'visible';
                            */
                                
                            var str = `<div class='baloon-container ${me} ${sequence} ${hasText}'>
                                <div class='baloon'>
                                    <div class='point'></div>
                                    <div class='avatar'><img src='${messages[i].foto}'></div>
                                    <div class='right'>
                                        <span class='name'>${messages[i].apelido}</span>
                                        <div class='message'>
                                            <span class='text'>${messages[i].message}</span>
                                            <span class='time'>${messages[i].time}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>`;

                            if (prepend){
                                $('#chat-panel #chat-window').prepend(str);
                                $('#chat-panel #chat-window .baloon-container').first().data('id', messages[i].id);
                            }
                            else{
                                $('#chat-panel #chat-window').append(str);
                                $('#chat-panel #chat-window .baloon-container').last().hide().fadeIn(600);
                                $('#chat-panel #chat-window .baloon-container').last().data('id', messages[i].id);
                            }

                        }
                        
                    }

                    if (prepend){
                        //keep same scroll position
                        var newHeight = $('#chat-panel #chat-window')[0].scrollHeight;
                        var lastHeight = newHeight - oldHeight;
                        var newPos = lastHeight + oldPos;
                        $('#chat-panel #chat-window').scrollTop(newPos);
                    }
                    else
                        $('#chat-panel #chat-window').scrollTop($('#chat-panel #chat-window')[0].scrollHeight);
                    
                }
            }

        });
    }       
}

var chatStarted = false;
function init_chat(wrapper, options){
    var leftButtons = '';
    var full = 'full';

    if (options && options.full === false){
        full = '';
        leftButtons = `<div class='button-container'>
            <i class='material-icons' title='Mostrar/Esconder Chat' id='show-hide'>swap_horiz</i>
            <i class='material-icons' title='Abir chat em nova aba' id='open-new'>open_in_new</i>
        </div>`;
    }

    var str = `<div id='room-container'></div>
        <div id='view-area'>
            <div id='emoji-ui'>
                <div id='emoji-container'></div>
                <div id='category-buttons'>
                    <i id='recent' class='material-icons selected' title='Mais usados'>star</i>
                    <i id='smile' class='material-icons' title='Carinhas e Pessoas'>emoji_emotions</i>
					<i id='animals' class='material-icons' title='Animais e Natureza'>pets</i>
                    <i id='food' class='material-icons' title='Alimentos'>fastfood</i>
                    <i id='activities' class='material-icons' title='Esportes e Atividades'>sports_esports</i>
                    <i id='places' class='material-icons' title='Viagens e Lugares'>emoji_transportation</i>
                    <i id='objects' class='material-icons' title='Objetos'>emoji_objects</i>
                    <i id='symbols' class='material-icons' title='Símbolos'>emoji_symbols</i>
                    <i id='flags' class='material-icons' title='Bandeiras'>flag</i>
                </div>
            </div>
            <div id='chat-ui'>
                ${leftButtons}
                <div id='message-box' data-placeholder='Digite sua mensagem. /help para instruções' contentEditable></div>
                <div class='button-container'>
                    <i class='material-icons hidden' title='Enviar mensagem (Enter)' id='send'>send</i>
                    <i class='material-icons' title='Ajuda' id='help'>help_outline</i>
                    <i class='material-icons' title='Emojis' id='emoji'>insert_emoticon</i>
                </div>
            </div>
        </div>`;

    wrapper.addClass(full);
    wrapper.addClass('preload');

    if ($(window).width() < 1340 && !$('#chat-panel').hasClass('full'))
        wrapper.addClass('hidden');

    wrapper.html(str);
    setTimeout( () => {
        wrapper.removeClass('preload');
    }, 1000);
    

    chatStarted = true;
}

async function chat_started(){
    async function isReady(){
        return await new Promise(resolve => {
            setTimeout(() => {
                if (chatStarted)
                    resolve(true);
                else
                    resolve(false);
            }, 100);
        });
    }
    while (await isReady() === false);
    return true;
}