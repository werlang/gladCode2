import {post, $index} from "./utils.js"
import {Message} from "./dialog.js"
import {header} from "./header.js"

const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

header.load()

window.onload = async function(){

    let version = (await post("back_update.php",{
        action: "GET"
    })).version.map(e => parseInt(e))
    // console.log(version)

    $('#version #current').innerHTML = version.join('.')
    if (!version[2]){
        version[2] = 0
    }
    $('#version #new').value = [version[0], version[1], parseInt(version[2])+1].join('.')

    $('#version #type select').addEventListener('change', function(){
        let selected = $index(this.querySelector('option:checked'))
        let newversion;
        if (selected == 0)
            newversion = [parseInt(version[0])+1, 0];
        else if (selected == 1)
            newversion = [version[0], parseInt(version[1])+1];
        else if (selected == 2){
            if (!version[2])
                version[2] = 0;
            newversion = [version[0], version[1], parseInt(version[2])+1];
        }
        $('#version #new').value = newversion.join('.');
    });
    
    $('#update #send.button').addEventListener('click', function(){
        post("back_update.php", {
            action: "SET",
            version: $('#version #new').value,
            keepup: $('#keep-updated input').checked,
            pass: $('#pass-div input').value
        }).then( function(data){
            // console.log(data);
            if (data.status != "WRONGPASS"){
                var changes = $('#changes textarea').value;
                changes = changes.replace(/\r?\n/g, '<br/>');
                //console.log(changes);
                new Message({message: `Mensagem enviada. Aguarde. Não clique mais de uma vez antes de dar status 500 no console.`}).show();

                post("back_sendmail.php",{
                    action: "UPDATE",
                    version: $('#version #new').value,
                    summary: changes,
                    postlink: $('#postlink input').value
                }).then( function(data){
                    console.log(data);
                    try{
                        data = JSON.parse(data);
                        new Message({message: `Versão do sistema atualizada`}).show();
                    }
                    catch(e){
                        console.log(e);
                        new Message({message: `Erro`}).show();
                    }
                    $('button').removeAttribute('disabled');
                });
            }
            else{
                alert("Wrong Password");
            }
        });
    });

    $('#side-menu #translate').addEventListener('click', function() {
        update_translation_table()
    })

    $('#side-menu #posts').addEventListener('click', function() {
        update_news_table(quill)
    })

    $$('#side-menu .item').forEach(e => e.addEventListener('click', function() {
        let id = this.getAttribute('id')

        $$('#side-menu .item').forEach(e => e.classList.remove('selected'))
        this.classList.add('selected')

        $$(`.content-box`).forEach(e => e.classList.remove('visible'))
        $(`#${id}.content-box`).classList.add('visible')
    }))

    let quill = new Quill('#posts #editor', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                    [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                    ['link', 'image'],
                    ['clean']                                         // remove formatting button
                ],
                handlers: {
                    image: function(){
                        let range = this.quill.getSelection();
                        let value = prompt('What is the image URL');
                        if(value){
                            this.quill.insertEmbed(range.index, 'image', value, Quill.sources.USER);
                        }
                    }
                }
            }
        },
    })

    quill.on('text-change', function(delta, oldDelta, source) {
        $('#posts #html').value = $('#posts #editor .ql-editor').innerHTML
    })

    $('#posts #preview').addEventListener('click', function(){
        if ($('#posts #html').classList.contains('visible')){
            $('#posts #html').classList.remove('visible') 
            this.textContent = "Ver HTML"
        }
        else{
            $('#posts #html').classList.add('visible')
            this.textContent = "Ocultar HTML"
        }
    })

    $('#posts #send').addEventListener('click', async function(){
        let html = $('#posts #html').value
        let title = $('#posts #title').value

        if (!title.length){
            $('#posts #title').focus()
            createToast("Insira um título", "error")
        }
        else if (!html.length){
            createToast("Informe o conteúdo", "error")
        }
        else{
            let hash = false
            if ($('#posts #send').textContent == 'EDITAR'){
                hash = $('#posts .table tr.selected td')[0].textContent
            }

            let data = await post("back_news.php", {
                action: "POST",
                title: title,
                html: html,
                hash: hash
            })
            console.log(data)
            quill.setText('')

            createToast("Notícia publicada", "success")
        }

        

    })

}

function update_translation_table(){
    post("back_translation.php", {
        action: "GET SUGGESTIONS"
    }).then( data => {
        // console.log(data)

        if (data.status == "SUCCESS"){
            let str = ""
            for (let i in data.suggestions){
                let row = data.suggestions[i]
                str += `<tr>
                    <td><span>${row.user}</span></td>
                    <td><span>${row.original}</span></td>
                    <td><span>${row.suggestion}</span></td>
                    <td><span>${row.language}</span></td>
                    <td><span>${row.time}</span></td>
                </tr>`
            }
            $('#translate .table tbody').innerHTML = str

            $$('#translate .table tr').forEach(e => e.addEventListener('click', function() {
                let index = $index(this)
                let s = data.suggestions[index]
                let msg = new Message({
                    message: `<h3>Original:</h3><p>${s.original}</p><h3>Sugestão:</h3><p>${s.suggestion}</p>Aceitar sugestão?`,
                    buttons: {yes: "Sim", no: "Não", cacel: "Cancelar"},
                    class: "skip-translation"
                }).show()

                msg.click('yes', () => {
                    resolve_suggestion(s.id, 'yes')
                })
                
                msg.click('no', () => {
                    resolve_suggestion(s.id, 'no')
                })

                function resolve_suggestion(id, answer){
                    post("back_translation.php", {
                        action: "RESOLVE",
                        answer: answer,
                        id: id
                    }).then( data => {
                        // console.log(data)
                        update_translation_table()
                    })
                }
            }))
        }
    })
}

function update_news_table(quill){
    post("back_news.php", {
        action: "LIST"
    }).then( data => {
        // console.log(data)

        if (data.status == "SUCCESS"){
            let str = ""
            for (let i in data.posts){
                let row = data.posts[i]
                str += `<tr>
                    <td><span>${row.hash}</span></td>
                    <td><span>${row.title}</span></td>
                    <td><span>${row.time}</span></td>
                </tr>`
            }
            $('#posts .table tbody').innerHTML = str

            $$('#posts .table tr').forEach(e => e.addEventListener('click', function() {
                if (this.classList.contains('selected')){
                    $$('#posts .table tr').forEach(e => e.classList.remove('selected'))
                    $('#posts #title').value = ''
                    quill.setText('')
                    $('#posts #send').textContent = 'POSTAR'
                }
                else{
                    $$('#posts .table tr').forEach(e => e.classList.remove('selected'))
                    this.classList.add('selected')

                    let index = $index(this)
                    let post = data.posts[index].body
                    let title = data.posts[index].title
                    $('#posts #title').value = title
                    quill.setContents(quill.clipboard.convert(post), 'silent')
                    $('#posts #send').textContent = 'EDITAR'
                    $('#posts #html').value = $('#posts #editor .ql-editor').innerHTML
                }
                
            }))
        }
    })
}