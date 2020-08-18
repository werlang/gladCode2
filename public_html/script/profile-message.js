import {post, getTimeSince, $index} from "./utils.js"
import {translator} from "./translate.js"
import {login} from "./header.js"

let translationReady
login.wait().then( () => {
    translationReady = translator.translate([
        "Mensagem",
        "Usuário",
        "Última mensagem"
    ])
})


export const messages = {
    offset: 0,
    total: 0,
    step: 10
}

messages.prev = function(){
    this.offset = this.offset >= this.step ? this.offset - this.step : 0
    this.reload()
}

messages.next = function(){
    this.offset = this.offset < this.total - this.step ? this.offset + this.step : this.total - this.step
    this.reload()
}

messages.reload = async function(){
    let data = post("back_message.php",{
        action: "USERS",
        offset: this.offset,
        limit: this.step
    })

    // fill the dummy text
    let rows = ""
    for (let i=0 ; i<this.step ; i++){
        rows += `<div class='row'>
            <div class='cell'>??????????????</div>
            <div class='cell'>????????????????????????</div>
            <div class='cell'>????????????</div>
        </div>`
    }

    await translationReady

    const head = `<div class='row head'><div class='cell user'>${translator.getTranslated("Usuário")}</div><div class='cell message'>${translator.getTranslated("Mensagem")}</div><div class='cell time'>${translator.getTranslated("Última mensagem")}</div></div>`

    document.querySelector("#message-panel .table").innerHTML = `${head}${rows}`

    data = await data
    // console.log(data)

    this.nrows = parseInt(data.nrows)
    this.offset = parseInt(data.offset)
    this.total = parseInt(data.total)

    document.querySelectorAll("#message-panel .page-nav span")[0].textContent = this.offset + 1
    document.querySelectorAll("#message-panel .page-nav span")[1].textContent = this.offset + this.nrows
    document.querySelectorAll("#message-panel .page-nav span")[2].textContent = this.total

    const prevButton = document.querySelector("#message-panel .page-nav #prev")
    const nextButton = document.querySelector("#message-panel .page-nav #next")
    
    if (this.total <= this.step){
        document.querySelector("#message-panel .page-nav").style.display = "none"
    }
    else{
        document.querySelector("#message-panel .page-nav").style.display = ""

        if (this.offset == 0){
            prevButton.setAttribute("disabled", "disabled")
        }
        else {
            prevButton.removeAttribute("disabled")
        }

        if (this.offset + this.nrows == this.total){
            nextButton.setAttribute("disabled", "disabled")
        }
        else {
            nextButton.removeAttribute("disabled")
        }
    }

    rows = ""
    for (let i=0 ; i<this.step ; i++){
        let row = data.messages[i]
        if (i >= data.messages.length){
            rows += `<div class='row empty'></div>`
        }
        else{
            rows += `<div class='row ${row.isread ? '' : 'unread'}'>
                <div class='cell user'>
                    <span class='picture-frame'><img class='picture' src='${row.picture}'></span>
                    <span class='nick'>${row.nick}</span>
                </div>
                <div class='cell message'>${row.message}</div>
                <div class='cell time'>${getTimeSince(row.time)}</div>
            </div>`
        }
    }

    document.querySelector("#message-panel .table").innerHTML = `${head}${rows}`

    document.querySelectorAll("#message-panel .table .row").forEach( e => {
        if (!e.classList.contains('head') && !e.classList.contains('empty')){
            e.addEventListener('click', async function() {
                const user = data.messages[$index(this) - 1].id
                const nick = e.querySelector(".nick").textContent
                const picture = e.querySelector(".picture").src

                const messages = await post("back_message.php", {
                    action: "MESSAGES",
                    user: user
                })
                // console.log(messages)

                // prepend window to view-area
                let chatWindow = document.querySelector('#chat-panel #chat-window')
                if (!chatWindow){
                    chatWindow = document.createElement("div")
                    chatWindow.id = 'chat-window'
                    const parent = document.querySelector('#chat-panel #view-area')
                    parent.insertBefore(chatWindow, parent.firstChild)
                }

                document.querySelectorAll('#chat-panel .room').forEach(e => {
                    e.classList.remove('open')
                    e.classList.remove('visible')
                })

                document.querySelector('#chat-ui #show-hide').click()

                
                
                const newRoom = document.createElement("div")
                newRoom.classList.add('room', 'visible', 'open')
                newRoom.innerHTML = `<div id="title"><i class="fas fa-chevron-right"></i><span class="name">${nick}</span></div>`
                document.querySelector('#chat-panel #room-container').appendChild(newRoom)

                let baloons = ""
                for (let i in messages.messages){
                    const msg = messages.messages[i]
                    const prevMsg = messages.messages[i-1]

                    baloons += `<div class='baloon-container ${msg.me ? 'me' : ''} ${i>0 && msg.sender == prevMsg.sender ? 'sequence' : ''}'>
                        <div class='baloon'>
                            <div class='point'></div>
                            <div class='avatar'><img src='${picture}'></div>
                            <div class='right'>
                                <span class='name'></span>
                                <div class='message'>
                                    <span class='text'>${msg.message}</span>
                                    <span class='time'>${msg.time}</span>
                                </div>
                            </div>
                        </div>
                    </div>`
                }

                chatWindow.innerHTML = baloons
                chatWindow.scrollTop = chatWindow.scrollHeight

                document.querySelector('#chat-panel #chat-ui #message-box').focus()

                newRoom.addEventListener('click', () => {
                    chatWindow.parentNode.removeChild(chatWindow)
                    newRoom.parentNode.removeChild(newRoom)

                    document.querySelectorAll('#chat-panel .room').forEach(e => {
                        e.classList.add('visible')
                    })
                })
            })
        }
    })
}

document.querySelector("#menu #messages").addEventListener('click', () => {
    messages.reload()
})

document.querySelector("#message-panel .page-nav #prev").addEventListener('click', () => {
    messages.prev()
})

document.querySelector("#message-panel .page-nav #next").addEventListener('click', () => {
    messages.next()
})


function reload_messages(){
    //checkNotifications();
    $('#message-panel #full-message').remove();
    $('#message-panel .table').show();
    $.post("back_message.php",{
        action: "GET",
        page: msgpage
    })
    .done( function(data){
        //console.log(data);
        try{
            data = JSON.parse(data);
        }
        catch(error){
            console.log(error);
        }

        var meta = data.meta;
        data = data.info;

        if (meta.total == 0)
            $('#message-panel .table').html("Você ainda não possui mensagens");
        else{
            $('#message-panel #page-title span').eq(0).html(meta.start);
            $('#message-panel #page-title span').eq(1).html(meta.end);
            $('#message-panel #page-title span').eq(2).html(meta.total);

            if (meta.page == 1)
                $('#message-panel #prev').prop("disabled", true);
            else
                $('#message-panel #prev').removeAttr("disabled");
            if (meta.end == meta.total)
                $('#message-panel #next').prop("disabled", true);
            else
                $('#message-panel #next').removeAttr("disabled");

            $('#message-panel .table').html("");
            for (var i in data){
                $('#message-panel .table').append("<div class='row'><div class='cell user'>"+ data[i].nick +"</div><div class='cell message'>"+ data[i].message +"</div><div class='cell time'>"+ getMessageTime(data[i].time, { short: true }) +"</div></div>");
                if (data[i].isread == "0")
                    $('#message-panel .table .row').last().addClass('unread');
            }
            $('#message-panel .table .row').click( function(){
                var i = $('#message-panel .table .row').index($(this));
                var id = data[i].id;
                var message = data[i].message;
                var time = getMessageTime(data[i].time);
                var nick = data[i].nick;
                var picture = data[i].picture;
                $('#message-panel').append("<div id='full-message'><div class='row head'><div class='image'><img src='"+ picture +"'></div><div class='user'>"+ nick +"</div><div class='time'>"+ time +"</div></div><div class='row body'><div class='message'>"+ message +"</div></div><div class='row buttons'><button class='button' id='back'><img src='icon/back.png'><span>Retornar</span></button><button class='button' id='reply'><img src='icon/reply.png'><span>Responder</span></button><button class='button' id='unread'><img src='icon/unread.png'><span>Marcar não lido</span></button><button class='button' id='delete'><img src='icon/delete2.png'><span>Excluir</span></button></div></div>");
                $('#message-panel #full-message').hide();
                $('#message-panel .table').fadeOut( function(){
                    $('#message-panel #full-message').toggle('scale');
                });
                $.post("back_message.php",{
                    action: "READ",
                    id: id,
                    value: 1
                });
                
                $('#message-panel #back').click( function(){
                    $('#menu #messages').click();
                });
                $('#message-panel #reply').click( function(){
                    $('#message-panel #full-message .row.buttons').hide();
                    $('#message-panel #full-message').append("<div class='row reply'><textarea class='input'></textarea><div class='row buttons'><button class='button' id='send'><img src='icon/reply.png'><span>Enviar</span></button><button class='button' id='cancel'><img src='icon/delete2.png'><span>Descartar</span></button></div></div>");
                    $('#message-panel #full-message .reply').hide().fadeIn();
                    $('#message-panel #full-message .input').focus();
                    $('#message-panel #full-message .input').on('input', function(){
                        var offset = this.offsetHeight - this.clientHeight;
                        if ($(this).height() >= 300)
                            $(this).height(300);
                        else
                            $(this).css('height', 'auto').css('height', this.scrollHeight + offset);
                    });
                    
                    $('#message-panel #full-message #send').click( function(){
                        var message = $('#message-panel #full-message .input').val();
                        $.post("back_message.php",{
                            action: "REPLY",
                            replyid: id,
                            message: message
                        })
                        .done( function(){
                            $('#menu #messages').click();

                            $.post("back_sendmail.php", {
                                action: "MESSAGE",
                                replyid: id,
                                message: message
                            })
                            .done( function(data){
                                //console.log(data);
                            });
                        });
                    });
                    $('#message-panel #full-message #cancel').click( function(){
                        $('#message-panel #full-message .row.reply').remove();
                        $('#message-panel #full-message .row.buttons').show();
                    });
                });
                $('#message-panel #unread').click( function(){
                    $.post("back_message.php",{
                        action: "READ",
                        id: id,
                        value: 0
                    })
                    .done( function(){
                        $('#menu #messages').click();
                    });
                });
                $('#message-panel #delete').click( function(){
                    $.post("back_message.php",{
                        action: "DELETE",
                        id: id
                    })
                    .done( function(){
                        $('#menu #messages').click();
                    });
                });
            });
        }
    });
}