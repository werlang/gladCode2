import {header, login} from "./header.js";
import {menu} from "./side-menu.js";
import { translator } from "./translate.js";

;(async () => {
    const translatorReady = new Promise( async resolve => {
        await login.wait()
        await translator.translate(document.querySelector("#content"))
        resolve(true)
    })

    await header.load()
    await menu.load(document.querySelector("#side-menu"))

    document.querySelector('#learn').classList.add('here')

    fetch(`script/functions.json`).then(async response => {
        const data = await response.json()

        let translations = []
        for (let i in data){
            translations.push(data[i].description.brief)
        }
        await translatorReady
        await translator.translate(translations)

        const page = window.location.href.split("/").splice(-1,1)[0].split("#")[0]

        document.querySelectorAll('.t-funcs a').forEach(e => {
            let match = e.href.split("/").slice(-1)[0]

            let fakePath = 'function'
            let nameLang = 'default'
            let ext = ''
            if (page == 'docs-blocks'){
                nameLang = 'block'
                ext = '.blk'
            }
            else if (page == 'docs-ptbr'){
                fakePath = 'funcao'
                nameLang = 'pt'
            }

            e.href = `${fakePath}/${match}${ext}`
            e.innerHTML = `<ignore>${data[match].name[nameLang]}</ignore>`
            e.parentNode.nextElementSibling.innerHTML = translator.getTranslated(data[match].description.brief)
        })

    })
})()