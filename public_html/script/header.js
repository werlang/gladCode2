import {post} from "./utils.js"
import {google} from "./googlelogin.js"
import {socket} from "./socket.js"
import {translator} from "./translate.js"
import {Message} from "./dialog.js"

const login = {
    logged: false
}

login.wait = async function(){
    if (login.logged){
        translator.language = login.user.speak
        translator.suggest = login.user.preferences.translation == "1" ? true : false
        return login.user
    }
    else{
        return new Promise( (resolve, reject) => {
            post("back_login.php", {
                action: "GET"
            }).then( data => {
                // console.log(data)
                login.user = data
                translator.language = login.user.speak
                
                if (data.status == "SUCCESS"){
                    login.logged = true
                    translator.suggest = login.user.preferences.translation == "1" ? true : false
                }

                if (!login.user.speak){
                    change_spoken_language(navigator.language.split("-")[0])
                }

                resolve(login.user)
            })
        })
    }
}

const header = {}

header.load = async function() {
    return new Promise( resolve => {
        fetch("header.html").then( async response => {
            const header = await response.text()
            document.querySelector('body').insertAdjacentHTML('afterbegin', header)
            resolve(true)
            
            document.querySelector('#menu-button').addEventListener('click', () => {
                const items = document.querySelector('#h-items').innerHTML
                document.querySelector('body').insertAdjacentHTML('afterbegin', `<div id='fog'>
                    <div id='menu'>
                        <a href='index'><img src='icon/logo.png'></a>
                        ${items}
                    </div>
                </div>`)
                
                document.querySelector('#fog').addEventListener('click', () => {
                    $('#fog #menu').toggle("slide", 300, function() {
                        $('#fog').remove();
                    });
                })

                document.querySelector('#fog #menu').addEventListener('click', e => {
                    e.stopPropagation()
                })

                document.querySelector('#fog #login').addEventListener('click', () => {
                    google.login().then( function(data){
                        window.location.href = "news"
                    })
                })
                
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
    
            $('.mobile #login, .desktop #login').click( function(){
                google.login().then( function(data){
                    window.location.href = "news";
                });
            });	
                    
            $('#header #language .item').not('#improve').click( async function() {
                change_spoken_language($(this).attr('id').split('-')[1])
            })
            
            login.wait().then( data => {
                // console.log(data)
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
                                language: login.user.speak
                            })
                            // console.log(data)
                
                            new Message({message: "Sugestão enviada"}).show()
                        })
                    })
                }
                else{
                    $('#header #improve.item').hide()
                }
    
                translator.translate(document.querySelector('#header'))
            })
            
        })
    
        google.init()
    
        const footer = document.querySelector('#footer')
        if (footer){
            fetch("footer.html").then(async response => {
                const text = await response.text()
                footer.insertAdjacentHTML('afterbegin', text)
                await login.wait()
                translator.translate(footer.querySelector('#img-container'))
            })
        }

    })
}

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

export {login, header}