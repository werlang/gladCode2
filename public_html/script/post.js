import {getDate, post} from "./utils.js"
import {header, login} from "./header.js";
import { translator } from "./translate.js";


;(async () => {
    header.load()
    const loginReady = login.wait()
    loginReady.then( () => translator.translate(document.querySelector("#button-container")) )

    let data = await post("back_news.php",{
        action: "GET",
        hash: document.querySelector('#hash').innerHTML
    })
    // console.log(data);

    if (data.status == "EMPTY"){
        window.location.href = "index"
    }
    else if (data.status == "SUCCESS"){
        document.querySelector('#post').innerHTML = `<div class='post'>
            <div class='title'>${data.post.title}</div>
            <div class='time'>Publicado em ${getDate(data.post.time, { month_full: true })}</div>
            <div class='body'>${data.post.body}</div>
        </div>`

        if (data.prev){
            document.querySelector('#prev').classList.remove('disabled')
            document.querySelector('#prev').href = `post/${data.prev}`
        }
        if (data.next){
            document.querySelector('#next').classList.remove('disabled')
            document.querySelector('#next').href = `post/${data.next}`
        }

        loginReady.then( () => translator.translate(document.querySelector('#post')) )
    }

    document.querySelector('#hash').remove()

})()
