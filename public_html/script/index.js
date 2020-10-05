import {socket} from "./socket.js"
import {login, header} from "./header.js"
import {google} from "./googlelogin.js"
import {translator} from "./translate.js"
import {Message} from "./dialog.js"

window.admin_auth = socket.admin

$(document).ready( function() {
    $('#section-2 .card').mouseenter( function() {
        var name = $(this).find('.title img').attr('src').split('/')[1].split('.')[0];
        $(this).find('.title img').attr('src','image/'+ name +'.gif');
    }).mouseleave( function() {
        var name = $(this).find('.title img').attr('src').split('/')[1].split('.')[0];
        $(this).find('.title img').attr('src','image/'+ name +'.png');
    });	
    
    $('#account').click( function(){
        google.login().then(function(data) {
            window.location.href = "news";
        });
    });
    
    $('#section-2 .card .video').click( function() {
        var hash = $(this).find('.thumb').attr('src').split('/')[4];
        
        $('body').append("<div id='fog'><div id='video-container'><iframe width='100%' height='100%' src='https://www.youtube.com/embed/"+ hash +"' frameborder='0' allowfullscreen></iframe><div id='remove'></div></div></div>");
        $('#fog').hide().fadeIn(1000);
        $('#fog').click( function(){
            $('#fog').remove();
        });
    });
    
    if ($('#loginhash').length){
        const loginMessage = {
            messages: {
                message: "Faça login para visualizar sua mensagem",
                link: "messages"
            },
            friends: {
                message: "Faça login para ver seus pedidos de amizade",
                link: "friends"
            },
            battle: {
                message: "Faça login para visualizar suas batalhas e desafios",
                link: "battle"
            },
            default: {
                message: "Faça login para ir para o seu perfil",
                link: "news"
            }
        }

        const tab = loginMessage[$('#loginhash').html()] ? loginMessage[$('#loginhash').html()] : loginMessage.default
        $('#loginhash').remove()

        new Message({
            message: tab.message,
            buttons: {cancel: "Cancelar", ok: "LOGIN"}
        }).show().click('ok', () => {
            google.login().then( () => {
                window.location.href = tab.link
            });
        })
    }
});

header.load().then( () => {
    $('#header').addClass('big');
    $('#header-container').addClass('small');
})

;(async () => {
    await login.wait()
    document.querySelectorAll(".card").forEach(e => {
        // console.log(e)
        translator.translate(e)
    })

})()