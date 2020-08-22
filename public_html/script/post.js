import {getDate, post} from "./utils.js"
import {header} from "./header.js";

window.onload = function(){
    header.load()
}

$(document).ready( async function() {
    let data = await post("back_news.php",{
        action: "GET",
        hash: $('#hash').html()
    })
    // console.log(data);

    if (data.status == "EMPTY"){
        window.location.href = "index";
    }
    else if (data.status == "SUCCESS"){
        $('#post').html(`<div class='post'>
            <div class='title'>${data.post.title}</div>
            <div class='time'>Publicado em ${getDate(data.post.time, { month_full: true })}</div>
            <div class='body'>${data.post.body}</div>
        </div>`);

        if (data.prev){
            $('#prev').removeClass('disabled').attr('href', `post/${data.prev}`);
        }
        if (data.next){
            $('#next').removeClass('disabled').attr('href', `post/${data.next}`);
        }
    }

    $('#hash').remove();
});