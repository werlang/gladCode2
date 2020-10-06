import {header, login} from "./header.js"
import { menu } from "./side-menu.js"
import {post} from "./utils.js"
import {loader} from "./loader.js"
import {translator} from "./translate.js"

;(async () => {
    login.wait().then(async () => {
        await translator.translate(document.querySelector('#content-box'))
        loader.load('Prism')
    })

    header.load()

    await menu.load(document.querySelector('#side-menu'))

    document.querySelector('#learn').classList.add('here')

    if (document.querySelector('.block-container')){
        loader.load('Blockly').then( module => {
            const Blockly = module.Blockly
            document.querySelectorAll('.block-container').forEach((e,i) => {
                const xml = e.innerHTML
                e.innerHTML = `<div id='code-ws-${i}' class='block'></div>`

                // console.log(xml)
                const ws = Blockly.inject(`code-ws-${i}`, {
                    scrollbars: true,
                    readOnly: true
                })

                const xmlDom = Blockly.Xml.textToDom(xml)
                Blockly.Xml.domToWorkspace(xmlDom, ws)
            })
        })
    }

    post("back_slots.php", {
        action: "UPGRADE",
        command: "COSTS"
    }).then( data => {
        // console.log(data)
        let rows = ""
        for (let i in data.prices){
            const price = i == 0 ? '-' : `${data.prices[i-1]} <i class='fas fa-coins silver'></i>`
            const time = data.times[i]
            rows += `<tr><td>${parseInt(i)+1}</td><td>${time}h</td><td>${price}</td></tr>`
        }
        document.querySelector('#tapot tbody').innerHTML = rows
    })

    post("back_slots.php", {
        action: "ITEMS"
    }).then( async data => {
        // console.log(data.potions)

        const translations = []
        for (let i in data.potions){
            translations.push(data.potions[i].name)
            translations.push(data.potions[i].description)
        }
        await translator.translate(translations)

        let rows = ""
        for (let i in data.potions){
            const pot = data.potions[i]
            rows += `<tr><td>${translator.getTranslated(pot.name)}</td><td>${pot.lvl}</td><td>${i}</td><td>${translator.getTranslated(pot.description)}</td><td>${pot.price} <i class='fas fa-coins silver'></i></td></tr>`
        }
        document.querySelector('#tpotions tbody').innerHTML = rows
    })
})()
