import {chat} from "./chat.js"
import {header} from "./header.js"
import {loader} from "./loader.js"

;(async () => {
    header.load()
    await loader.load('jquery')
    chat.init(document.querySelector('#chat-panel'), {full: true})
})()
