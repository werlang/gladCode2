import {post, getTimeSince, $index} from "./utils.js"
import {translator} from "./translate.js"
import {login} from "./header.js"
import {listRooms, getChatNotification} from "./chat.js"

let translationReady
login.wait().then( () => {
    translationReady = translator.translate([
        "Mensagem",
        "Usuário",
        "Última mensagem"
    ])
})


export const messages = {
    offset: 0,
    total: 0,
    step: 10
}

messages.prev = function(){
    this.offset = this.offset >= this.step ? this.offset - this.step : 0
    this.reload()
}

messages.next = function(){
    this.offset = this.offset < this.total - this.step ? this.offset + this.step : this.total - this.step
    this.reload()
}

messages.reload = async function(){
    listRooms({rebuild: true}).then( () => {
        getChatNotification()
    })

    let data = post("back_message.php",{
        action: "USERS",
        offset: this.offset,
        limit: this.step
    })

    // fill the dummy text
    let rows = ""
    for (let i=0 ; i<this.step ; i++){
        rows += `<div class='row dummy'>
            <div class='cell user'>
                <span class='picture-frame'><div class='picture'></div></span>
                <span class='dummy-text'>??????????????</span>
            </div>
            <div class='cell message'><span class='dummy-text'>????????????????????????</span></div>
            <div class='cell time'><span class='dummy-text'>????????????</span></div>
        </div>`
    }

    await translationReady

    const head = `<div class='row head'><div class='cell user'>${translator.getTranslated("Usuário")}</div><div class='cell message'>${translator.getTranslated("Mensagem")}</div><div class='cell time'>${translator.getTranslated("Última mensagem")}</div></div>`

    document.querySelector("#message-panel .table").innerHTML = `${head}${rows}`

    data = await data
    // console.log(data)

    this.nrows = parseInt(data.nrows)
    this.offset = parseInt(data.offset)
    this.total = parseInt(data.total)

    document.querySelectorAll("#message-panel .page-nav span")[0].textContent = this.offset + 1
    document.querySelectorAll("#message-panel .page-nav span")[1].textContent = this.offset + this.nrows
    document.querySelectorAll("#message-panel .page-nav span")[2].textContent = this.total

    document.querySelector("#message-panel .page-nav").style.display = this.total <= this.step ? "none" : ""
    document.querySelector("#message-panel .page-nav #prev").disabled = this.offset == 0
    document.querySelector("#message-panel .page-nav #next").disabled = this.offset + this.nrows == this.total

    rows = ""
    for (let i=0 ; i<this.step ; i++){
        let row = data.messages[i]
        if (i >= data.messages.length){
            rows += `<div class='row empty'></div>`
        }
        else{
            rows += `<div class='row ${row.isread ? '' : 'unread'}'>
                <div class='cell user'>
                    <span class='picture-frame'><img class='picture' src='${row.picture}'></span>
                    <span class='nick'>${row.nick}</span>
                </div>
                <div class='cell message'>${row.message}</div>
                <div class='cell time'>${getTimeSince(row.time)}</div>
            </div>`
        }
    }

    document.querySelector("#message-panel .table").innerHTML = `${head}${rows}`

    document.querySelectorAll("#message-panel .table .row").forEach( e => {
        if (!e.classList.contains('head') && !e.classList.contains('empty')){
            e.addEventListener('click', async function() {
                const room = data.messages[$index(this) - 1].id
                messages.show(room)
            })
        }
    })
}

messages.show = async function(room){
    document.querySelectorAll('#chat-panel #room-container .room').forEach(e => {
        if (e.dataset.id == room){
            e.click()
        }
    })
}

document.querySelector("#menu #messages").addEventListener('click', () => {
    messages.reload()
})

document.querySelector("#message-panel .page-nav #prev").addEventListener('click', () => {
    messages.prev()
})

document.querySelector("#message-panel .page-nav #next").addEventListener('click', () => {
    messages.next()
})