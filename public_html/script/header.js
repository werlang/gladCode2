import {post} from "./utils.js"
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
                const items = document.querySelector('#h-items')
                items.querySelectorAll('.drop-menu .item-container').forEach(e => e.removeAttribute('style'))
    
                document.querySelector('body').insertAdjacentHTML('afterbegin', `<div id='fog'>
                    <div id='menu'>
                        <a href='index'><img src='icon/logo.png'></a>
                        ${items.innerHTML}
                    </div>
                </div>`)

                document.querySelectorAll('#menu #language .item:not(#improve)').forEach(e => {
                    e.addEventListener('click', () => {
                        change_spoken_language(e.id.split('-')[1])
                    })
                })    

                login.wait().then( data => {
                    if (data.logged){
                        document.querySelector('#menu #improve.item').addEventListener('click', bind_suggestion)
                    }
                    else{
                        document.querySelector('#menu #improve.item').style.display = 'none'
                    }
                })

                const fog = document.querySelector('#fog')
                const menu = fog.querySelector('#menu')
                menu.style.display = 'block'

                fog.addEventListener('click', () => {
                    menu.classList.remove('open')

                    setTimeout(() => {
                        fog.remove()
                    }, 300);
                })

                menu.addEventListener('click', e => {
                    e.stopPropagation()
                })

                fog.querySelector('#login').addEventListener('click', async () => {
                    const {google} = await import("./googlelogin.js")
                    await google.login()
                    window.location.href = "news"
                })
                
                setTimeout(() => {
                    menu.classList.add('open')
                }, 10);
            })
            
            // menu open and close
            document.querySelectorAll('.drop-menu').forEach(e => {
                e.addEventListener('mouseenter', () => {
                    const itemHeight = 50
                    const itemCont = e.querySelector('.item-container')

                    itemCont.style.display = 'block'
                    itemCont.classList.add('open')
                    itemCont.style.top = e.offsetTop + itemHeight + 'px'

                    if (itemCont.offsetLeft + itemCont.offsetWidth > window.innerWidth){
                        itemCont.style.left = e.offsetLeft + e.offsetWidth - itemCont.offsetWidth + 'px'
                    }
                    
                    setTimeout( () => {
                        itemCont.style.height = itemCont.querySelectorAll('.item').length * itemHeight + 'px'
                    }, 10)
                })

                e.addEventListener('mouseleave', () => {
                    // const itemHeight = 50
                    const itemCont = e.querySelector('.item-container')

                    itemCont.style.display = 'none'
                    itemCont.classList.remove('open')
                    itemCont.style.height = 0
                })

            })
    
            document.querySelectorAll('.mobile #login, .desktop #login').forEach(e => {
                e.addEventListener('click', async () => {
                    const {google} = await import("./googlelogin.js")
                    await google.login()
                    window.location.href = "news"
                })
            })
                    
            document.querySelectorAll('#header #language .item:not(#improve)').forEach(e => {
                e.addEventListener('click', () => {
                    change_spoken_language(e.id.split('-')[1])
                })
            })
            
            login.wait().then( data => {
                // console.log(data)
                if (data.status == "NOTLOGGED"){
                    document.querySelector('.mobile #profile').classList.remove('hidden')
                    document.querySelector('.desktop #login').classList.remove('hidden')
                }
                else{
                    socket.request('login', {}).then( function(res, err){
                        if (err) return console.log(err)
                        // console.log(res)
                        if (res.session === false){
                            post("back_login.php", {
                                action: "UNSET"
                            }).then( function(data){
                                if (data.status == "LOGOUT"){
                                    window.location.reload()
                                }
                            });
                        }
                        else{
                            document.querySelector('.mobile #login').classList.remove('hidden')
                            document.querySelector('.desktop #profile').classList.remove('hidden')
                        }
                    })
                }
            
                if (data.logged){
                    document.querySelector('#header #improve.item').addEventListener('click', bind_suggestion)
                }
                else{
                    document.querySelector('#header #improve.item').style.display = 'none'
                }
    
                translator.translate(document.querySelector('#header'))
            })

            function bind_suggestion() {
                const msg = new Message({
                    message: `
                        <p>Qual texto precisa ser melhor traduzido?</p>
                        <input id='original' type='text' class='input'>
                        <p>Qual a tradução adequada para o texto?</p>
                        <input id='suggestion' type='text' class='input'>
                    `,
                    buttons: {ok: "OK", cancel: "Cancelar"},
                    class: "improve-translation-box",
                    preventKill: true
                }).show()
                msg.click('ok', async () => {
                    const original = document.querySelector('.improve-translation-box #original').value
                    const suggestion = document.querySelector('.improve-translation-box #suggestion').value
                    
                    const data = await post("back_translation.php", {
                        action: "SUGGEST",
                        original: original,
                        suggestion: suggestion,
                        language: login.user.speak
                    })
                    // console.log(data)
        
                    new Message({message: "Sugestão enviada"}).show()
                })
                msg.click(null, () => msg.kill())
            }

            
        })
        
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

// function decodeHTML(str) {
//     var escapeMap = {
//         '&': '&amp;',
//         '<': '&lt;',
//         '>': '&gt;',
//         '"': '&quot;',
//         "'": '&#x27;',
//         '`': '&#x60;',
//         '\'': '&#39;'
//     };
//     for (var i in escapeMap){
//         var regexp = new RegExp(escapeMap[i],"g");
//         str = str.replace(regexp, i);
//     }
//     return str;
// }

export {login, header}