$(document).ready( async function(){
    var version = [];
    
    $.post("back_update.php",{
        action: "GET"
    }).done( function(data){
        version = JSON.parse(data);
        $('#version #current').html(version.join('.'));
        if (!version[2])
            version[2] = 0;
        $('#version #new').val([version[0], version[1], parseInt(version[2])+1].join('.'));
    });
    
    $('#version #type select').change( function(){
        var options = $(this).find('option');
        var selected = options.index($(this).find('option:selected'));
        var newversion;
        if (selected == 0)
            newversion = [parseInt(version[0])+1, 0];
        else if (selected == 1)
            newversion = [version[0], parseInt(version[1])+1];
        else if (selected == 2){
            if (!version[2])
                version[2] = 0;
            newversion = [version[0], version[1], parseInt(version[2])+1];
        }
        $('#version #new').val(newversion.join('.'));
    });
    
    $('#update #send.button').click( function(){
        $.post("back_update.php",{
            action: "SET",
            version: $('#version #new').val(),
            keepup: $('#keep-updated input').prop('checked'),
            pass: $('#pass-div input').val(),
        }).done( function(data){
            //console.log(data);
            if (data != "WRONGPASS"){
                var changes = $('#changes textarea').val();
                changes = changes.replace(/\r?\n/g, '<br/>');
                //console.log(changes);
                showMessage("Mensagem enviada. Aguarde. Não clique mais de uma vez antes de dar status 500 no console.");

                $.post("back_sendmail.php",{
                    action: "UPDATE",
                    version: $('#version #new').val(),
                    summary: changes,
                    postlink: $('#postlink input').val()
                }).done( function(data){
                    console.log(data);
                    try{
                        data = JSON.parse(data);
                        showMessage("Versão do sistema atualizada");
                    }
                    catch(e){
                        console.log(e);
                        showMessage("Erro");
                    }
                    $('button').removeAttr('disabled');
                });
            }
            else{
                alert("Wrong Password");
            }
        });
    });

    $('#side-menu #translate').click( function() {
        update_translation_table()
    })

    $('#side-menu #posts').click( function() {
        update_news_table(quill)
    })

    $('#side-menu .item').click( function() {
        let id = $(this).attr('id')

        $('#side-menu .item').removeClass('selected')
        $(this).addClass('selected')

        $(`.content-box`).removeClass('visible')
        $(`#${id}.content-box`).addClass('visible')
    })

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
        // console.log(delta, oldDelta)
        $('#posts #html').val($('#posts #editor .ql-editor').html())
    })

    $('#posts #preview').click( function(){
        if ($('#posts #html').hasClass('visible')){
            $('#posts #html').removeClass('visible')
            $(this).text("Ver HTML")
        }
        else{
            $('#posts #html').addClass('visible')
            $(this).text("Ocultar HTML")
        }
    })

    $('#posts #send').click( async function(){
        let html = $('#posts #html').val()
        let title = $('#posts #title').val()

        if (!title.length){
            $('#posts #title').focus()
            create_toast("Insira um título", "error")
        }
        else if (!html.length){
            create_toast("Informe o conteúdo", "error")
        }
        else{
            let hash = false
            if ($('#posts #send').text() == 'EDITAR'){
                hash = $('#posts .table tr.selected td').eq(0).text()
            }

            let data = await post("back_news.php", {
                action: "POST",
                title: title,
                html: html,
                hash: hash
            })
            console.log(data)
            quill.setText('')

            create_toast("Notícia publicada", "success")
        }

        

    })

})

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
            $('#translate .table tbody').html(str)

            $('#translate .table tr').click( function() {
                let index = $('#translate .table tr').index($(this)) - 1
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
            })
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
            $('#posts .table tbody').html(str)

            $('#posts .table tr').click( function() {
                if ($(this).hasClass('selected')){
                    $('#posts .table tr').removeClass('selected')

                    $('#posts #title').val('')
                    quill.setText('')
                    $('#posts #send').text('POSTAR')
                }
                else{
                    $('#posts .table tr').removeClass('selected')
                    $(this).addClass('selected')

                    let index = $('#posts .table tr').index($(this)) - 1
                    let post = data.posts[index].body
                    let title = data.posts[index].title
                    $('#posts #title').val(title)
                    quill.setContents(quill.clipboard.convert(post), 'silent')
                    $('#posts #send').text('EDITAR')
                }
                
            })
        }
    })
}