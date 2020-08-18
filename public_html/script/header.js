import {post} from "./utils.js"
import {google} from "./googlelogin.js"
import {socket} from "./socket.js"
import {translator} from "./translate.js"
import {Message} from "./dialog.js"

const login = {
    logged: false
}

var user

login.wait = async function(){
    if (login.logged){
        translator.language = login.user.speak
        translator.suggest = login.user.preferences.translation == "1" ? true : false
        user = login.user
        return login.user
    }
    else{
        return new Promise( (resolve, reject) => {
            post("back_login.php", {
                action: "GET"
            }).then( data => {
                // console.log(data)
                login.user = data
                login.logged = true
                translator.language = login.user.speak
                translator.suggest = login.user.preferences.translation == "1" ? true : false
                user = login.user
                
                if (!login.user.speak){
                    change_spoken_language(navigator.language.split("-")[0])
                }

                resolve(login.user)
            })
        })
    }
}

login.wait()

export {login}

window.onload = function() {
    $('#menu-button').click( function() {
        $('body').append("<div id='fog'><div id='menu'></div></div>");
        $('#fog #menu').html("<a href='index'><img src='icon/logo.png'></a>"+ $('#h-items').html());
        
        $('#fog').click( function() {
            $('#fog #menu').toggle("slide", 300, function() {
                $('#fog').remove();
            });
        });
        $('#fog #menu').click( function(e) {
            e.stopPropagation();
        });
        $('#fog #login').click( function(){
            googleLogin().then( function(data){
                window.location.href = "news";
            });
        });	
        
        $('#fog #menu').toggle("slide", 300); //precisa jquery ui
    });
    
    $('.drop-menu').hover( function() {
        menu_open($(this));
    });
    $('.drop-menu').mouseleave( function() {
        menu_close();
    });
    $('.drop-menu').click( function() {
        menu_close();
        menu_open($(this));
    });

    function menu_open(element){
        $('.item-container').hide();
        if ($('.item-container.open').length == 0){
            var container = element.find('.item-container');
            container.slideDown().addClass('open');
            
            var left = element.position().left;
            if (element.position().left + container.find('.item').width() > $(window).width())
                left = element.position().left + element.width() - container.width();

            container.css({
                'left': left, 
                'top': element.position().top + element.height()
            });

        }
    }

    function menu_close(){
        $('.item-container').hide();
        $('.item-container').removeClass('open');
    }
    
    google.init();

    $('.mobile #login, .desktop #login').click( function(){
        googleLogin().then( function(data){
            window.location.href = "news";
        });
    });	
    
    login.wait().then( data => {
        if (data.status == "NOTLOGGED")
            $('.mobile #profile, .desktop #login').removeClass('hidden');
        else{
            socket.request('login', {}).then( function(res, err){
                if (err) return console.log(err);
                if (res.session === false){
                    post("back_login.php", {
                        action: "UNSET"
                    }).then( function(data){
                        if (data.status == "LOGOUT")
                            window.location.reload();
                    });
                }
                else
                    $('.mobile #login, .desktop #profile').removeClass('hidden');
            });
        }

        translator.translate($('#header'))

        if (data.logged){
            $('#header #improve.item').click( function() {
                new Message({
                    message: `
                        <p>Qual texto precisa ser melhor traduzido?</p>
                        <input id='original' type='text' class='input'>
                        <p>Qual a tradução adequada para o texto?</p>
                        <input id='suggestion' type='text' class='input'>
                    `,
                    buttons: {ok: "OK", cancel: "Cancelar"},
                    class: "improve-translation-box"
                }).show().click('ok', async function() {
                    let original = $('.improve-translation-box #original').val()
                    let suggestion = $('.improve-translation-box #suggestion').val()
                    
                    let data = await post("back_translation.php", {
                        action: "SUGGEST",
                        original: original,
                        suggestion: suggestion,
                        language: user.speak
                    })
                    // console.log(data)
        
                    new Message({message: "Sugestão enviada"}).show()
                })
            })
        }
        else{
            $('#header #improve.item').hide()
        }
    })

    if ($('#footer').length){
        $('#footer').load("footer.php", async () => {
            await login.wait()
            translator.translate($('#footer'))
        });
    }

    $('#header #language .item').not('#improve').click( async function() {
        change_spoken_language($(this).attr('id').split('-')[1])
    })
}

async function change_spoken_language(lang){
    let data = await post("back_login.php", {
        action: "SPOKEN_LANGUAGE",
        language: lang
    })
    // console.log(data)
    if (data.reload){
        window.location.reload()
    }
}

function decodeHTML(str) {
    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
        '\'': '&#39;'
    };
    for (var i in escapeMap){
        var regexp = new RegExp(escapeMap[i],"g");
        str = str.replace(regexp, i);
    }
    return str;
}