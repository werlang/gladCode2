import {socket} from "./socket.js"
// import * as _ from "./emoji.js"
import {post, getTimeSince} from "./utils.js"
import {createToast} from "./dialog.js"
import {header, login} from "./header.js"
import { translator } from "./translate.js"
import { loader } from "./loader.js"

const translatorReady = (async () => {
    await login.wait()
    await translator.translate([
        "Mostrar/Esconder Chat",
        "Abir chat em nova aba",
        "Mais usados",
        "Carinhas e Pessoas",
        "Animais e Natureza",
        "Alimentos",
        "Esportes e Atividades",
        "Viagens e Lugares",
        "Objetos",
        "Símbolos",
        "Bandeiras",
        "Digite sua mensagem. /help para instruções",
        "Enviar mensagem",
        "Ajuda",
        "LISTAGEM DE SALAS PÚBLICAS",
        "Nome",
        "NOME",
        "Descrição",
        "LISTAGEM DE PARTICIPANTES DA SALA",
        "Autoridade",
        "Na sala desde",
        "Último login",
        "Total de",
        "participantes",
        "COMANDOS DO CHAT",
        "Comando",
        "Abre janela para inserção de código",
        "Janela de upload de imagens",
        "Mostra todas salas públicas",
        "Mostra todos membros da sala",
        "O mesmo que",
        "Entra na SALA (caso exista)",
        "Cria a SALA (caso não exista)",
        "Opcional",
        "Torna a sala privada",
        "Insere uma descrição para a sala",
        "sala",
        "teste",
        "descrição da sala",
        "SALA",
        "Sai da SALA",
        "Sai da sala atualmente aberta",
        "Torna-se o líder da sala aberta, caso os líderes estejam há muito inativos",
        "MEMBRO",
        "Membro",
        "Torna o MEMBRO um líder da sala aberta",
        "fulaninho",
        "Remove MEMBRO da SALA (Precisa ser Líder). Se estiver dentro de uma sala, não é necessário o argumento SALA",
        "Remove permissão do MEMBRO de ver mensagens da sala (Precisa ser Líder)",
        "Devolve a permissão do MEMBRO de participar normalmente da sala (Precisa ser Líder)",
        "Edita informações da sala",
        "Indica qual sala será editada. Quando está dentro de uma sala, não é necessário",
        "Altera o nome da sala",
        "Altera a descrição da sala",
        "Torna a sala pública",
        "novo nome",
        "Editar código",
        "Visualizar imagem",
        "Editor de código",
        "Confirmar",
        "MOSTRAR",
        "LINHAS",
        "Líder"
    ])
    return true
})()

var sendingBuffer = [];
var clearToSend = true;
var emoji;
var recentEmoji = [];
var visitedRooms = {};
var uploadWidget = {};
var scrolling = false;

export const chat = {
    started: false
}

chat.init = async function(wrapper, options){
    await translatorReady

    var leftButtons = '';
    var full = 'full';

    if (options && options.full === false){
        full = '';
        leftButtons = `<div class='button-container'>
            <i class='fas fa-exchange-alt' title='${translator.getTranslated("Mostrar/Esconder Chat", false)}' id='show-hide'></i>
            <i class='fas fa-external-link-alt' title='${translator.getTranslated("Abir chat em nova aba", false)}' id='open-new'></i>
        </div>`;
    }

    var str = `<div id='room-container'></div>
        <div id='view-area'>
            <div id='emoji-ui'>
                <div id='emoji-container'></div>
                <div id='category-buttons'>
                    <i id='recent' class='fas fa-star selected' title='${translator.getTranslated("Mais usados", false)} (CTRL+🔢)'></i>
                    <i id='smile' class='fas fa-grin-alt' title='${translator.getTranslated("Carinhas e Pessoas", false)}'></i>
					<i id='animals' class='fas fa-paw' title='${translator.getTranslated("Animais e Natureza", false)}'></i>
                    <i id='food' class='fas fa-hamburger' title='${translator.getTranslated("Alimentos", false)}'></i>
                    <i id='activities' class='fas fa-futbol' title='${translator.getTranslated("Esportes e Atividades", false)}'></i>
                    <i id='places' class='fas fa-map-marked-alt' title='${translator.getTranslated("Viagens e Lugares", false)}'></i>
                    <i id='objects' class='fas fa-lightbulb' title='${translator.getTranslated("Objetos", false)}'></i>
                    <i id='symbols' class='fas fa-icons' title='${translator.getTranslated("Símbolos", false)}'></i>
                    <i id='flags' class='fas fa-flag' title='${translator.getTranslated("Bandeiras", false)}'></i>
                </div>
            </div>
            <div id='chat-ui'>
                ${leftButtons}
                <div id='message-box' data-placeholder='${translator.getTranslated("Digite sua mensagem. /help para instruções", false)}' contentEditable></div>
                <div class='button-container'>
                    <i class='far fa-comment-dots hidden' title='${translator.getTranslated("Enviar mensagem", false)} (Enter)' id='send'></i>
                    <i class='far fa-question-circle' title='${translator.getTranslated("Ajuda", false)}' id='help'></i>
                    <i class='far fa-grin-alt' title='Emojis (CTRL+E)' id='emoji'></i>
                </div>
            </div>
        </div>`;

    wrapper.addClass(full);
    wrapper.addClass('preload');

    var defaultOpen = 1340;
    if (options && options.defaultOpen)
        defaultOpen = options.defaultOpen;
        
    if ($(window).width() < defaultOpen && !$('#chat-panel').hasClass('full'))
        wrapper.addClass('hidden');

    wrapper.html(str);
    setTimeout( () => {
        wrapper.removeClass('preload');
    }, 1000);
    

    chat.started = true;
}

chat.isStarted = async function(){
    async function isReady(){
        return await new Promise(resolve => {
            setTimeout(() => {
                if (chat.started)
                    resolve(true);
                else
                    resolve(false);
            }, 100);
        });
    }
    while (await isReady() === false);
    return true;
}

$(document).ready( function(){
    chat.isStarted().then( () => {
        socket.isReady().then( function() {
            socket.request('login', {}).then( function(res, err){
                if (err) return console.log(err);
                // console.log(res);
                if (res.session === true){
                    listRooms({rebuild: true}).then( () => {
                        getChatNotification();
                    });
                }
                else{
                    if (!$('#chat-panel').hasClass('full'))
                        $('#chat-panel').addClass('hidden');
                    else if (!$('#dialog-box').length){
                        new Message({
                            message: `Faça login na gladCode para participar do chat`,
                            buttons: {ok: "LOGIN"}
                        }).show().click('ok', async () => {
                            const google = await loader.load('google')
                            await google.login()
                            window.location.reload()
                        })
                    }
                    $('#chat-panel').click( () => {
                        if (!$('#dialog-box').length){
                            new Message({
                                message: "Faça login na gladCode para participar do chat",
                                buttons: {cancel: "Cancelar", ok: "LOGIN"}
                            }).show().click('ok', async () => {
                                const google = await loader.load('google')
                                await google.login()
                                window.location.reload()
                            })
                        }
                    });
                }
            });

            socket.io.on('chat notification', (data) => {
                getChatNotification();
                if ($('#chat-panel .room.open').data('id') == data.room){
                    getChatMessages({room: data.room, sync: true});
                }
            });
            socket.io.on('chat personal', data => {
                let msg
                if (data.status == "KICK"){
                    msg = `Você foi removido da sala ${data.room_name}`;
                    listRooms({remove: data.room_name});
                }
                else if (data.status == "BAN"){
                    msg = `Você foi banido da sala ${data.room_name}`;
                    listRooms({remove: data.name});
                }
                else if (data.status == "UNBAN"){
                    msg = `Seu banimento da sala ${data.room_name} foi removido`
                }
                createToast(msg, "info");
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

        post("back_chat.php", {
            action: "EMOJI"
        }).then( data => {
            // console.log(data);
            
            if (data.status != "NOTLOGGED" && data.emoji != '')
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
                    var e = emojiStr[i][j].img;
                    if (i == 0 && j < 10){
                        let n = (parseInt(j) + 1) % 10;
                        e = `<div class='shortcut'><span class='number'>${n}</span>${emojiStr[i][j].img}</div>`;
                    }
                    $('#chat-panel #emoji-container #categ-'+ i).append(e);
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
                else{
                    $('#chat-panel #emoji-container #categ-0 .title').after($(this).clone(true));
                    $('#chat-panel #emoji-container #categ-0 .emoji-outer').eq(0).wrap("<div class='shortcut'></div>").before("<span class='number'></span>");

                    $('#chat-panel #emoji-container #categ-0 .shortcut').each( function(i,obj){
                        if (i < 10)
                            $(obj).find('.number').html((i + 1) % 10);
                        else if (!$(obj).hasClass('hidden'))
                            $(obj).addClass('hidden');
                    });

                }

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
            var codes = $('#chat-panel #chat-ui #message-box').data('code');
            var imgs = $('#chat-panel #chat-ui #message-box').data('img');
            $('#chat-panel #chat-ui #message-box > span').each( function(){
                if ($(this).hasClass('emoji-outer')){
                    text += $(this).data('unicode');
                }
                //cehck if there is code to be sent
                else if ($(this).find('.code-icon').length){
                    var parent = $(this);
                    parent.find('.code-icon').each( function() {
                        var id = $(this).attr('id');
                        parent.html(parent.html().replace(/<img class="code-icon" [\w\W]+?>/, escape(`<code>${codes[id]}</code>`)));
                    });
                    text += unescape(parent.text());
                }
                //check if there are images to be sent
                else if ($(this).find('.img-icon').length){
                    var parent = $(this);
                    parent.find('.img-icon').each( function() {
                        var id = $(this).attr('id');
                        parent.html(parent.html().replace(/<img class="img-icon" [\w\W]+?>/, escape(`<img src='${imgs[id]}'>`)));
                    });
                    text += unescape(parent.text());
                }
                else
                    text += $(this).text();
            } );
            $('#chat-panel #chat-ui #message-box').data('code', {});
            $('#chat-panel #chat-ui #message-box').data('img', {});

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
                        var room = $('#chat-panel .room.open').data('id') || false;

                        if (message != ''){
                            // console.log("send: "+message);
                            post("back_chat.php", {
                                action: "SEND",
                                message: message,
                                room: room,
                                emoji: recentEmoji
                            }).then( function(data){
                                // console.log(data);
                                //recentEmoji = [];
                                clearToSend = true;
                                let status = data.status;
                                if (status == "UNKNOWN"){
                                    createToast("Comando desconhecido", "error");
                                }
                                else if (status == "DIRECT"){
                                    createToast("Comandos desabilitados em mensagens diretas", "info");
                                }
                                else if (status == "LEFT"){
                                    listRooms({remove: data.name});
                                    createToast("Você saiu da sala "+ data.name, "success");
                                }
                                else if (status == "JOINED"){
                                    listRooms({insert: data.name});
                                    createToast("Bem-vindo à sala "+ data.name, "success");
                                }
                                else if (status == "CREATED"){
                                    listRooms({insert: data.name});
                                    createToast("Sala "+ data.name +" criada", "success");
                                }
                                else if (status == "EDITED"){
                                    listRooms({});
                                    createToast("Sala atualizada", "success");
                                }
                                else if (status == "NOTFOUND")
                                    createToast("Sala não encontrada", "error");
                                else if (status == "NOPERMISSION")
                                    createToast("Você não possui permissão para realizar esta ação", "error");
                                else if (status == "PROMOTED")
                                    createToast("O usuário "+ data.target +" foi promovido", "success");
                                else if (status == "MAXPROMOTION")
                                    createToast("O usuário "+ data.target +" não pode mais ser promovido", "info");
                                else if (status == "NOTARGET"){
                                    if (data.command == 'ban' || data.command == 'promote')
                                        createToast("O usuário "+ data.target +" não foi encontrado na sala", "error");
                                    else
                                        createToast("O usuário "+ data.target +" não está banido", "info");
                                }
                                else if (status == "ALREADYBANNED")
                                    createToast(data.target +" já está banido da sala", "error");
                                else if (status == "BANNED")
                                    createToast("Você foi banido desta sala e não pode enviar mensagens", "info");
                                else if (status == "SILENCED")
                                    createToast("Você foi silenciado até " + data.time, "info");
                                else if (status == "NOROOM")
                                    createToast("Entre em uma sala antes", "info");
                                else if (status == "EXISTS")
                                    createToast("A sala "+ data.name +" já existe", "info");
                                else if (status == "ACTIVE")
                                    createToast("Os líderes desta sala estão ativos", "info");
                                else if (status == "RESTRICTED")
                                    createToast("Você possui restrições a esta sala e não poderá assumir seu comando", "error");
                                else if (status == "LIST"){
                                    if (data.room){
                                        var table = [
                                            [{data: translator.getTranslated("LISTAGEM DE SALAS PÚBLICAS"), class: "head"}],
                                            [{data: translator.getTranslated("Nome"), class: "head half"}, {data: "#", class: "head small"}, {data: translator.getTranslated("Descrição"), class: "head"}],
                                        ];
                                        for (let i in data.room){
                                            table.push([{data: data.room[i].name, class: "half"}, {data: data.room[i].members, class: "small"}, {data: data.room[i].description}]);
                                        }
                                    }
                                    else if (data.user){
                                        var table = [
                                            [{data: translator.getTranslated("LISTAGEM DE PARTICIPANTES DA SALA"), class: "head"}],
                                            [{data: translator.getTranslated("Autoridade"), class: "head half"}, {data: translator.getTranslated("Nome"), class: "head"}, {data: translator.getTranslated("Na sala desde"), class: "head half"}, {data: translator.getTranslated("Último login"), class: "head half"}],
                                        ];
                                        for (let i in data.user){
                                            table.push([{data: translator.getTranslated(data.user[i].privilege == "0" ? "Líder" : "Membro"), class: "half"}, {data: data.user[i].apelido}, {data: data.user[i].since, class: "half"}, {data: getTimeSince(data.user[i].login), class: "half"}]);
                                        }
                                        table.push([{data: `${translator.getTranslated("Total de")} ${data.user.length} ${translator.getTranslated("participantes")}`}]);
                                    }
                                    sendChatTable(table)
                                }
                                else if (status == "SENT" && data.mail){
                                    post("back_sendmail.php", {
                                        action: "MESSAGE",
                                        receiver: data.user,
                                        message: message,
                                    }).then( function(data){
                                        // console.log(data);
                                    })
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
                [{data: translator.getTranslated("COMANDOS DO CHAT"), class: "head"}],
                [{data: translator.getTranslated("Comando"), class: "head half"}, {data: translator.getTranslated("Descrição"), class: "head"}],
                [{data: "<>", class: "half"}, {data: translator.getTranslated("Abre janela para inserção de código"), class: ""}],
                [{data: "!@", class: "half"}, {data: translator.getTranslated("Janela de upload de imagens"), class: ""}],
                [{data: "/show rooms", class: "half"}, {data: translator.getTranslated("Mostra todas salas públicas"), class: ""}],
                [{data: "/show users", class: "half"}, {data: translator.getTranslated("Mostra todos membros da sala"), class: ""}],
                [{data: "/list", class: "half"}, {data: `${translator.getTranslated("O mesmo que")} /show<br>Ex: /list rooms`, class: ""}],
                [{data: `/join ${translator.getTranslated("SALA")}`, class: "half"}, {data: `${translator.getTranslated("Entra na SALA (caso exista)")}<br>Ex: /join gladcode`, class: ""}],
                [{data: `/create ${translator.getTranslated("SALA")} [-pvt] [-d DESC]`, class: "half"}, {data: `${translator.getTranslated("Cria a SALA (caso não exista)")}<br>-pvt => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Torna a sala privada")}<br>-d DESC => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Insere uma descrição para a sala")}<br>Ex: /create ${translator.getTranslated("sala teste")} -d ${translator.getTranslated("descrição da sala")} -pvt`, class: ""}],
                [{data: `/leave ${translator.getTranslated("SALA")}`, class: "half"}, {data: `${translator.getTranslated("Sai da SALA")}<br>Ex: /leave gladcode`, class: ""}],
                [{data: "/leave", class: "half"}, {data: translator.getTranslated("Sai da sala atualmente aberta"), class: ""}],
                [{data: "/claim", class: "half"}, {data: translator.getTranslated("Torna-se o líder da sala aberta, caso os líderes estejam há muito inativos"), class: ""}],
                [{data: `/promote ${translator.getTranslated("MEMBRO")}`, class: "half"}, {data: `${translator.getTranslated("Torna o MEMBRO um líder da sala aberta")}<br>Ex: /promote ${translator.getTranslated("fulaninho")}`, class: ""}],
                [{data: `/kick ${translator.getTranslated("MEMBRO")} [-r ${translator.getTranslated("SALA")}]`, class: "half"}, {data: `${translator.getTranslated("Remove MEMBRO da SALA (Precisa ser Líder). Se estiver dentro de uma sala, não é necessário o argumento SALA")}.<br>Ex: /kick ${translator.getTranslated("fulaninho")}`, class: ""}],
                [{data: `/ban ${translator.getTranslated("MEMBRO")}`, class: "half"}, {data: `${translator.getTranslated("Remove permissão do MEMBRO de ver mensagens da sala (Precisa ser Líder)")}<br>Ex: /ban ${translator.getTranslated("fulaninho")}`, class: ""}],
                [{data: `/unban ${translator.getTranslated("MEMBRO")}`, class: "half"}, {data: `${translator.getTranslated("Devolve a permissão do MEMBRO de participar normalmente da sala (Precisa ser Líder)")}<br>Ex: /unban ${translator.getTranslated("fulaninho")}`, class: ""}],
                [{data: `/edit [-r ${translator.getTranslated("SALA")}] [-n ${translator.getTranslated("NOME")}] [-d DESC] [-pvt | -pub]`, class: "half"}, {data: `${translator.getTranslated("Edita informações da sala")}.<br>-r ${translator.getTranslated("SALA")} => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Indica qual sala será editada. Quando está dentro de uma sala, não é necessário")}.<br>-n ${translator.getTranslated("NOME")} => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Altera o nome da sala")}<br>-d DESC => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Altera a descrição da sala")}<br>-pvt => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Torna a sala privada")}<br>-pub => (${translator.getTranslated("Opcional")}) ${translator.getTranslated("Torna a sala pública")}<br>Ex: /edit -n ${translator.getTranslated("novo nome")} -d ${translator.getTranslated("descrição da sala")} -pub`, class: ""}],
            ];

            sendChatTable(table)
        });

        $('#chat-panel #message-box').keydown( function(e){
            var input = $(this);
            //insere o primeiro span pro texto ir dentro
            if (input.find('span').length == 0)
                input.append("<span></span>");
            input.find('span').last().focus();
        
            if (e.ctrlKey && e.keyCode == 'E'.charCodeAt(0)){ //CTRL+E
                $('#chat-panel #emoji').click();
                e.preventDefault();
            }

            //CTRL+NUM insere um emoji dos favoritos
            var pos = '1234567890'.indexOf(String.fromCharCode(e.keyCode));
            if (e.ctrlKey && pos != -1){
                e.preventDefault();
                $('#chat-panel #emoji-container #categ-0 .emoji-outer').eq(pos).click();
            }
        });
        $('#chat-panel #message-box').keyup( function(e){
            var input = $(this);
            //key enter
            if(e.keyCode == 13) {
                $('#chat-panel #send').click();
                e.preventDefault();
            }

            //hide or show help button
            if (input.text() == ''){
                $('#chat-panel #send').addClass('hidden');
                $('#chat-panel #help').removeClass('hidden');
            }
            else if ($('#chat-panel #send').hasClass('hidden')){
                $('#chat-panel #send').removeClass('hidden');
                $('#chat-panel #help').addClass('hidden');
            }

            //sesarch for <> to replace for code
            if ((/&lt;&gt;/).test(input.html())){
                var id = getRandomId(5);
                input.find('span').each( function() {
                    var newtext = $(this).html().replace(/&lt;&gt;/, "");
                    $(this).html(newtext);
                });
                input.append(`<span><img class="code-icon" id="code-icon-${id}" src="icon/code.png" title="${translator.getTranslated("Editar código", false)}"></span><span></span>`);

                //setCaretEndDiv($('#chat-panel #message-box')[0]);
                $('#chat-panel #message-box span').last().focus();

                $(`#chat-ui .code-icon`).click( function() {
                    create_code_modal($(this));
                });

                if (!input.data('code'))
                    input.data('code',{});

                create_code_modal($(`#code-icon-${id}`));
            }

            //search for !@ to replace for image
            if ((/\!\@/).test(input.html())){
                var id = getRandomId(5);
                input.find('span').each( function() {
                    var newtext = $(this).html().replace(/\!\@/, "");
                    $(this).html(newtext);
                });
                input.append(`<span><img class="img-icon" id="img-icon-${id}" title="${translator.getTranslated("Visualizar imagem", false)}" src="icon/img.png"></span><span></span>`);

                $('#chat-panel #message-box span').last().focus();

                if (!input.data('img'))
                    input.data('img',{});

                upload_image().then( data => {
                    //console.log(data);
                    if (data !== false){
                        input.append("<span></span>");
                        var dataimg = input.data('img');
                        dataimg[`img-icon-${id}`] = data;
                        input.data('img', dataimg);
                        $(`.img-icon`).off().click( function(){
                            var thisid = $(this).attr('id');
                            window.open( input.data('img')[thisid] );
                        });
                    }
                    else{
                        $(`#img-icon-${id}`).remove();
                    }
                    //wait time until widget disappear
                    setTimeout( function(){
                        setCaretEndDiv($('#chat-panel #message-box')[0]);
                    }, 300);
                    
                });
                
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
    });
});

function create_code_modal(obj){
    $('body').append(`<div id='fog'>
        <div id='code-modal'>
            <div id='title'>
                <span><img src='icon/code.png'>${translator.getTranslated("Editor de código")}</span>
                <div id='button-container'>
                    <button id='ok' class='button' title='${translator.getTranslated("Confirmar", false)} (CTRL+Enter)'></button>
                    <button id='cancel' class='button' title='${translator.getTranslated("Cancelar", false)} (ESC)'></button>
                </div>
            </div>
            <textarea id='terminal' spellcheck='false'></textarea>
        </div>
    </div>`);
    $('#fog').hide().fadeIn();
    var data = obj.parents('#message-box').data('code');

    if (data[obj.attr('id')])
        $('#fog #terminal').val(data[obj.attr('id')]);

    $('#fog #terminal').focus();
    $('#fog #terminal').outerHeight($('#fog #terminal')[0].scrollHeight);


    $('#code-modal #cancel').click( () => {
        if (!data[obj.attr('id')])
            obj.remove();
        $('#fog').remove();
        setCaretEndDiv($('#chat-panel #message-box')[0])
    });

    $('#code-modal #ok').click( () => {
        var code = $('#code-modal #terminal').val();
        if (code != '')
            data[obj.attr('id')] = code;
        else
            obj.remove();
        $('#fog').remove();
        setCaretEndDiv($('#chat-panel #message-box')[0])
    });

    //events that need to occur before default behaviour
    $('#code-modal #terminal').on('keydown', function(e){
        var terminal = $('#code-modal #terminal');

        if (e.keyCode == 9){ //tab
            e.preventDefault();
            if (e.shiftKey)
                insertTab(terminal, true);
            else
                insertTab(terminal);
        }
    });
    $('#code-modal #terminal').on('keyup', function(e){
        var terminal = $('#code-modal #terminal');
        terminal.outerHeight(terminal[0].scrollHeight);

        if (e.keyCode == 27) //esc
            $('#code-modal #cancel').click();
        else if (e.ctrlKey && e.keyCode == 13) //ctrl+enter
            $('#code-modal #ok').click();
    });
}

function sendChatTable(json){
    //console.log(json);
    let table = ""
    for (let i in json){
        let row = ""
        for (let j in json[i]){
            let data = json[i][j].data.replaceAll("<br>", "</div><div class='subrow'>")
            row += `<div class='cell ${json[i][j].class || ''}'><div class='subrow'>${data}</div></div>`
        }
        table += `<div class='row'>${row}</div>`
    }
    $('#chat-panel #chat-window').append(`<div class='chat-table'>${table}</div>`)
    $('#chat-panel #chat-window .chat-table').last().hide().fadeIn(600, () => translator.bind())
}

async function listRooms(arg){
    await new Promise( (resolve, reject) => {
        let directnames = post("back_message.php", {
            action: "NAMES"
        })

        socket.io.emit('chat rooms', async function(data){
            // console.log(data);

            directnames = (await directnames).rooms

            var rebuild = false;
            if (arg && arg.rebuild)
                rebuild = true;

            if (rebuild){
                $('#chat-panel #room-container').html("");

                var room = data.room;
                for (let i in room){
                    const name = room[i].direct ? directnames[room[i].name] : room[i].name

                    $('#chat-panel #room-container').append(`<div class='room visible ${room[i].direct ? 'direct' : ''}'>
                        <div id='title'>
                            <span class='notification hide'>0</span>
                            <i class='fas fa-chevron-right'></i>
                            <span class='name'>${name}</span>
                        </div>
                    </div>`);
                    document.querySelector('#chat-panel #room-container').lastElementChild.dataset.id = room[i].id
                    $('#chat-panel #room-container .room').last().data({ id: room[i].id }).css({order: i});
                    visitedRooms[room[i].id] = room[i].visited;
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
                            const name = data.room[j].direct ? directnames[data.room[j].name] : data.room[j].name
                            currentRoms[i].order = j
                            currentRoms[i].name = name
                        }
                    }
                };

                if (arg && arg.remove){
                    // console.log(arg.remove)
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
                                <i class='fas fa-chevron-right'></i>
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

            resolve();
        });
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
            visited: JSON.stringify(visitedRooms)
        }).done( function(data){
            // console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(e){
                console.log(data);
                console.log(e);
            }
    
            if (data.status == "SUCCESS"){
                var notif = data.notifications;
                $('#chat-panel .room').each( function(){
                    var id = $(this).data('id');
    
                    var notif_val = parseInt(notif[id]);
                    if (notif_val > 0 && !$(this).hasClass('open')){
                        $(this).find('#title .notification').removeClass('hide').html(notif_val);
                        $(this).find('#title i').addClass('hide');
    
                        if (notif_val >= 1000)
                            $(this).find('#title .notification').addClass('small');
                        else if ($(this).find('#title .notification').hasClass('small'))
                            $(this).find('#title .notification').removeClass('small');
                    }
                });
            }
        });
    });

}

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
            sync: sync,
            visited: visitedRooms[id]
        }).done( function(data){
            //console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(e){
                console.log(data);
                console.log(e);
            }
            if (data.visited || (!visitedRooms[id] && data.visited) )
                visitedRooms[id] = data.visited;

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
                            
                            //replace code tag
                            messages[i].message = messages[i].message.replace(/&lt;code&gt;([\w\W]*?)&lt;\/code&gt;/g, "<pre class='language-c'><code>$1</code></pre>");

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

                            var baloon;
                            if (prepend){
                                $('#chat-panel #chat-window').prepend(str);
                                baloon = $('#chat-panel #chat-window .baloon-container').first();
                            }
                            else{
                                $('#chat-panel #chat-window').append(str);
                                baloon = $('#chat-panel #chat-window .baloon-container').last();
                                baloon.hide().fadeIn(600);
                                
                            }

                            baloon.data('id', messages[i].id);

                            //place code on the baloon
                            baloon.find('code').each( function() {
                                var lines = ($(this).text().match(/\n/g) || []).length + 1;
                                Prism.highlightElement(this);

                                if (!$(this).parents('.baloon-container').hasClass('me'))
                                    $(this).addClass('dark');
                                if ($(this).height() <= 150){
                                    $(this).parent().addClass('brief');
                                }
                                else{
                                    var pre = $(this).parent();
                                    pre.addClass('collapsed').append(`<button class='expand'><i class='plus far fa-plus-square'></i><span>{ ... } ${translator.getTranslated("MOSTRAR")} ${lines} ${translator.getTranslated("LINHAS")}</span></button>`);

                                    rebind();
                                    function rebind(){
                                        pre.find('.expand').click( function() {
                                            pre.removeClass('collapsed').hide().slideDown();
                                            $(this).find('.plus').removeClass('fa-plus-square').addClass('fa-minus-square');
                                            $(this).addClass('open').off().click( function(){
                                                pre.slideUp( function(){
                                                    pre.addClass('collapsed').show();
                                                });
                                                $(this).find('.plus').removeClass('fa-minus-square').addClass('fa-plus-square');
                                                $(this).removeClass('open').off();
                                                rebind();
                                            });
                                        }); 
                                    }
                                }
                            });

                            var expression = /((?:http(?:s)?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=,;]*))/gi;
                            var regex = new RegExp(expression);
                            var html = baloon.find('.text').html();

                            //replace img tag
                            if (html.match(/&lt;img src='([\w\W]+?)'&gt;/g)){
                                baloon.find('.text').html(html.replace(/&lt;img src='([\w\W]+?)'&gt;/g, `<a href='$1' target='_blank'><img class='chat-img' src='$1'></a>`));
                                baloon.find('.text').html(html.replace(/&lt;img src='([\w\W]+?)'&gt;/g, `<a href='$1' target='_blank'><img class='chat-img' src='$1'></a>`));
                            }
                            //replace b64 image
                            else if (html.match(/(data:image\/(?:jpeg|png);base64[\w\W]+)/)){
                                baloon.find('.text').html(html.replace(/(data:image\/(?:jpeg|png);base64[\w\W]+)/, `<img class='chat-img' src='$1'>`));
                            }

                            //check for url
                            else if (html.match(regex) && !html.match(/\<span class=\"emoji/)){
                                var url = html.match(regex)[0];
                                testImage(baloon, url).then( resp => {
                                    var html = resp.baloon.find('.text').html();
                                    if (resp.status === true){
                                        //url is image
                                        resp.baloon.find('.text').html(html.replace(resp.url, `<a href='${resp.url}' target='_blank'><img class='chat-img' src='${resp.url}'></a>`));
                                    }
                                    else{
                                        //normal url, not image. put link tag
                                        if (html.search(/(?:http(?:s)?:\/\/.)/) != -1)
                                            resp.baloon.find('.text').html(html.replace(regex, "<a href='$1' target='_blank'>$1</a>"));
                                        else
                                            resp.baloon.find('.text').html(html.replace(regex, "<a href='//$1' target='_blank'>$1</a>"));
                                    }
                                })
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

function getRandomId(size){
    var str = '';
    for (let i=0 ; i<size ; i++){
        var c = '';
        var n = Math.floor(Math.random()*36);
        if (n <= 25)
            c = String.fromCharCode(n + 97);
        else
            c = String.fromCharCode(n - 26 + 48);
        str += c;
    }
    return str;
}

function setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    }
}

function setCaretToPos (input, pos) {
    setSelectionRange(input, pos, pos);
}

function insertTab(obj, reverse){
    var start = obj[0].selectionStart;
    var end = obj[0].selectionEnd;
    var text = obj.val();

    if (start == end){
        if (reverse){
            var lastT = text.substr(0, start).lastIndexOf('\t');
            text = text.substr(0, lastT) + text.substr(lastT + 1, start - lastT - 1) + text.substr(end);
            obj.val(text);
            setCaretToPos(obj[0], start - 1);
        }
        else{
            text = text.substr(0, start) + '\t' + text.substr(end, text.length - end);
            obj.val(text);
            setCaretToPos(obj[0], start + 1);
        }
    }
    else if (!reverse){
        var selection = text.substr(start, end - start);
        var tabs = 0;
        selection = selection.replace(/([\w\W]*?\n)/gm, function(match){
            tabs++;
            return '\t' + match;
        });
        text = text.substr(0, start) + selection + text.substr(end, text.length - end);
        obj.val(text);
        setSelectionRange(obj[0], start, end + tabs);
    }
    //shift tab
    else{
        var selection = text.substr(start, end - start);
        var tabs = 0;
        selection = selection.replace(/^(\t|[ ]{2})/gm, function(p1){
            tabs += p1.length;
            return '';
        });
        console.log(selection);
        text = text.substr(0, start) + selection + text.substr(end, text.length - end);
        obj.val(text);
        setSelectionRange(obj[0], start, end - tabs);
    }
}

function setCaretEndDiv(input){
    let range = document.createRange();//Create a range (a range is a like the selection but invisible)
    range.selectNodeContents(input);//Select the entire contents of the element with the range
    range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
    //range.setStart(input.firstChild, 2);
    //range.setEnd(input.firstChild, 2);
    let selection = window.getSelection();//get the selection object (allows you to change selection)
    selection.removeAllRanges();//remove any selections already made
    selection.addRange(range);//make the range you have just created the visible selection
}

async function testImage(baloon, url) {
    return await new Promise( resolve => {
        var img = new Image();

        img.onerror = img.onabort = function() {
            callback(url, "error");
        };

        img.onload = function() {
            callback(url, "success");
        };
    
        function callback(url, status){
            if (status == "success")
                resolve({baloon: baloon, url: url, status: true});
            else
                resolve({baloon: baloon, url: url, status: false});
        }
        
        img.src = url;

    });
}

async function start_cloudinary(){
    await loader.load('cloudinary')
    return cloudinary.createUploadWidget({
        cloudName: "dd0mjuhdb",
        uploadPreset: "fvbkdtsp",
        sources: [
            "local",
            "url",
            "camera",
            "facebook",
            "dropbox",
            "instagram"
        ],
        showAdvancedOptions: false,
        cropping: false,
        multiple: false,
        defaultSource: "local",
        styles: {
            palette: {
                window: "#FFFFFF",
                windowBorder: "#90A0B3",
                tabIcon: "#00638D",
                menuIcons: "#5A616A",
                textDark: "#000000",
                textLight: "#FFFFFF",
                link: "#00638D",
                action: "#FF620C",
                inactiveTabIcon: "#0E2F5A",
                error: "#F44235",
                inProgress: "#0078FF",
                complete: "#20B832",
                sourceBg: "#E4EBF1"
            },
            fonts: {
                default: null,
                "'Roboto', sans-serif": {
                    url: "https://fonts.googleapis.com/css?family=Roboto&display=swap",
                    active: true
                }
            }
        }
    },
    function(error, result) { 
        //console.log(result);
        if(error){
            //console.log(error);
            uploadWidget.status = 'error';
        }
        else if (!uploadWidget.status){
            if (result.event == 'success'){
                uploadWidget.status = 'success';
                uploadWidget.info = result.info;
            }
            else if (result.event == 'close')
                uploadWidget.status = 'close';
        }

    });
}
async function upload_image(){
    if (!uploadWidget.widget){
        uploadWidget.widget = await start_cloudinary()
    }
    
    uploadWidget.widget.open();

    return await new Promise( resolve => {
        time();
        function time(){
            setTimeout( function(){
                //console.log(uploadWidget);
                if (!uploadWidget.status)
                    time();
                else if (uploadWidget.info){
                    var url = uploadWidget.info.secure_url;
                    uploadWidget = {widget: uploadWidget.widget};
                    resolve(url);
                }
                else{
                    uploadWidget = {widget: uploadWidget.widget};
                    resolve(false);
                }

            }, 300);
        }
    });
}

function sendChatMessage({text}){
    $('#chat-panel #message-box').html(`<span>${text}</span>`)
    $('#chat-panel #send').click()
}

export {listRooms, getChatNotification, sendChatMessage}