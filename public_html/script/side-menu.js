import {header, login} from "./header.js"
import {translator} from "./translate.js"

export const menu = {}

menu.load = async function(menuEl){
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

            login.wait().then( () => translator.translate(menuEl))

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
                    e.querySelector('i').classList.remove('open')
                })
    
                const text = input.value
                if (text.length <= 1){
                    document.querySelectorAll('#side-menu > ul > li').forEach(e => e.classList.add('visible'))
                }
                else{
                    const pattern = new RegExp(`[\\w]*${text}[\\w]*`,"ig")
                    menuEl.querySelectorAll('li').forEach(e => {
                        if (e.textContent.match(pattern)){
                            e.classList.add('visible')
                            e.parentNode.previousElementSibling.classList.add('visible').parentNode.previousElementSibling.classList.add('visible')
                        }
                        if (e.style.display != 'none'){
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
    let loc = window.location.href.split("/")
    loc = loc[loc.length - 1].split("#")[0]

    let elWinner
    document.querySelectorAll('#side-menu a').forEach(e => {
        const link = e.href.split("/")
        const page = link[link.length - 1].split("#")[0]
        const item = link[link.length - 1].split("#")[1]

        const element = document.querySelector(`#${item}`)
        if (page == loc && item && element){
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
        menu.querySelectorAll('li.here').forEach(e => e.classList.remove('here'))
        elWinner.classList.add('here')

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
