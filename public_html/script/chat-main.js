import {chat} from "./chat.js"
import {header} from "./header.js"

;(async () => {
    header.load()
    chat.init(document.querySelector('#chat-panel'), {full: true})
})()
