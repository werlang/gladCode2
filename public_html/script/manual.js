import {header} from "./header.js"
import { menu } from "./side-menu.js"
import {post} from "./utils.js"

const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

;(async () => {
    header.load()
    await menu.load()

    let loc = window.location.href.split("/")
    loc = loc[loc.length - 1]
    $('#side-menu #'+loc).classList.add('here')
    $('#side-menu #'+loc).click()

    $('#learn').classList.add('here')

    if ($('.block-container')){
        // $$('.block-container').forEach((e,i) => {
        //     const xml = e.innerHTML
        //     e.innerHTML = `<div id='code-ws-${i}' class='block'></div>`

        //     // console.log(xml)
        //     const ws = Blockly.inject(`code-ws-${i}`, {
        //         scrollbars: true,
        //         readOnly: true
        //     })

        //     const xmlDom = Blockly.Xml.textToDom(xml)
        //     Blockly.Xml.domToWorkspace(xmlDom, ws)
        // })
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
        $('#tapot tbody').innerHTML = rows
    })

    post("back_slots.php", {
        action: "ITEMS"
    }).then( data => {
        // console.log(data.potions)

        let rows = ""
        for (let i in data.potions){
            const pot = data.potions[i]
            rows += `<tr><td>${pot.name}</td><td>${pot.lvl}</td><td>${i}</td><td>${pot.description}</td><td>${pot.price} <i class='fas fa-coins silver'></i></td></tr>`
        }
        $('#tpotions tbody').innerHTML = rows
    })
})()
