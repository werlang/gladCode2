import {header, login} from "./header.js"
import {translator} from "./translate.js"

export const menu = {}

menu.load = async function(menuEl){
    if (!menuEl){
        menuEl = document.querySelector("#side-menu")
    }
    await header.load()

    const search = document.querySelector('#header #search')
    if (search){
        search.classList.add('visible');
        search.addEventListener('click', function(){
            if (search.classList.contains('visible')){
                menuEl.classList.add('mobile')

                setTimeout( () => {
                    menuEl.classList.add('open')
                    menuEl.querySelector('input').focus()
                }, 10)

                menuEl.querySelectorAll('a').forEach(e => e.addEventListener('click', () => {
                    menuEl.classList.remove('mobile')
                    menuEl.classList.remove('open')
                }))
            }
        })
    }

    return new Promise( resolve => {
        fetch("side-menu.html").then( async response => {
            const content = await response.text()
            menuEl.innerHTML = content

            login.wait().then( user => {
                if (user.speak != "pt"){
                    document.querySelector("#docs-ptbr").nextElementSibling.remove()
                    document.querySelector("#docs-ptbr").remove()

                    // get function names
                    fetch("script/functions.json").then(async response => {
                        const funcs = await response.json()

                        // translator ignore function names
                        document.querySelectorAll("#side-menu a").forEach(e => {
                            if (e.href.indexOf("function/") != -1){
                                let name = e.innerHTML

                                const filename = e.href.split("function/")[1].split('.')
                                if (filename.length > 1 && filename[1] == 'blk'){
                                    name = funcs[filename[0]].name.block[user.speak]
                                }
    
                                e.innerHTML = `<ignore>${name}</ignore>`
                            }
                        })
                    })


                    translator.translate(menuEl)
                }
            })

            document.addEventListener('scroll', () => {
                this.scroll()
            })
    
            const icon = "<i class='fas fa-chevron-right'></i>";
            menuEl.querySelectorAll('li').forEach(e => {
                if (e.nextElementSibling && e.nextElementSibling.tagName == "UL"){
                    e.insertAdjacentHTML('afterbegin', icon)
                }
                e.classList.remove('visible')
                
                if (e.querySelector("i")){
                    e.querySelector("i").classList.remove('open')
                }
            })
            
            menuEl.querySelectorAll('#side-menu > ul > li').forEach(e => e.classList.add('visible'))
            
            const input = menuEl.querySelector('#search input')
            input.addEventListener('input', () => {
                menuEl.querySelectorAll('li').forEach(e => {
                    e.classList.remove('visible')
                    if (e.querySelector('i')){
                        e.querySelector('i').classList.remove('open')
                    }
                })
    
                const text = input.value
                if (text.length <= 1){
                    document.querySelectorAll('#side-menu > ul > li').forEach(e => e.classList.add('visible'))
                    menu.scroll()
                }
                else{
                    const pattern = new RegExp(`[\\w]*${text}[\\w]*`,"ig")
                    menuEl.querySelectorAll('li').forEach(e => {
                        if (e.textContent.match(pattern)){
                            e.classList.add('visible')
                            const prev = e.parentNode.previousElementSibling
                            prev.classList.add('visible')
                            prev.parentNode.previousElementSibling.classList.add('visible')
                        }
                        if (e.classList.contains("visible")){
                            e.querySelectorAll('i').forEach(e => e.classList.add('open'))
                        }
                    });
                }
            });
    
            menuEl.querySelectorAll('li').forEach(e => e.addEventListener('click', () => {
                const list = [...e.nextElementSibling.children]
                if (list.some(e => {return e.classList.contains('visible')})){
                    list.forEach(e => {
                        e.classList.remove('visible')
                        e.querySelectorAll("li.visible").forEach(e => e.classList.remove('visible'))
                        e.querySelectorAll("i.open").forEach(e => e.classList.remove('open'))

                        if (e.querySelector('i')){
                            e.querySelector('i').classList.remove('open')
                        }
                    })
    
                    e.querySelector('i').classList.remove('open')
                }
                else{
                    list.forEach(e => e.classList.add('visible'))

                    if (e.querySelector('i')){
                        e.querySelector('i').classList.add('open')
                    }
                }
            }))
    
            resolve(true)
        })
    })
}

menu.scroll = function() {
    const loc = window.location.href.split("/").slice(-1)[0].split("#")[0]

    let elWinner
    document.querySelectorAll('#side-menu a').forEach(e => {
        const link = e.href.split("/").slice(-1)[0].split("#")
        const element = document.querySelector(`#${link[1]}`)
        if (link[0] == loc && link[1] && element){
            const dist = document.querySelector('html').scrollTop - element.offsetTop
            // console.log(dist, element)
            if (dist <= 0 && !elWinner){
                elWinner = e.parentNode
            }
        }
    })

    if (elWinner){
        // console.log(elWinner)
        const menu = document.querySelector('#side-menu')
        menu.querySelectorAll('li.here').forEach(e => {
            e.classList.remove('here')
            const icon = e.querySelector('i')
            if (icon && icon.classList.contains('open')){
                icon.click()
            }
        })
        elWinner.classList.add('here')
        menu.scrollTop = elWinner.offsetTop - 50

        recursiveOpen(elWinner)
        function recursiveOpen(element){
            const icon = element.querySelector('i')
            if (icon && !icon.classList.contains('open')){
                element.click()
            }

            const prev = element.parentNode.previousElementSibling
            if (prev.tagName == "LI"){
                recursiveOpen(prev)
            }
        }
    }
}
