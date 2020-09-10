import {post, getDate} from "./utils.js"
import {translator} from "./translate.js"
import {Message} from "./dialog.js"
import { login } from "./header.js"

const translatorReady = (async () => {
    await login.wait()
    await translator.translate([
        "Oponente",
        "Mestre",
        "Visualizar batalha",
        "Guardar nos favoritos",
        "Tirar dos favoritos",
        "Comentário",
        "de",
        "Você ainda não possui duelos",
        "Cancelar desafio",
        "Selecione suas batalhas favoritas para aparecer nesta tabela. Assim você também as protege de serem apagadas quando ficarem muito antigas",
        "Gladiador Esquecido",
        "Renome",
        "Data"
    ])
    return true
})()

const tabs = {
    pages: {
        limit: 10,
        battles: { name: 'Batalhas', offset: 0 },
        duels: { name: 'Duelos', offset: 0 },
        favorites: { name: 'Favoritos', offset: 0 },
    }
}

document.querySelector('#menu #report').addEventListener('click', async () => {
    document.querySelector('#report-container .tab.selected').click()
})

let tabNames = ["Batalhas", "Duelos", "Favoritos"]


tabs.init = function(){
    $('#report-container #tab-container .tab').click( async e => {
        let tabDOM = $(e.currentTarget)
        let dummy = true
        if ($('#report-container #tab-container .tab.selected').text() == tabDOM.text()){
            dummy = false
        }

        $('#report-container #tab-container .tab').removeClass('selected');
        tabDOM.addClass('selected');
        
        let id = this.getId(tabNames[tabDOM.index('.tab')])
        let check = $('#report-container #unread input:checked').length == 1
        tabs.fetch({
            id: id,
            offset: this.pages[id].offset,
            dummy: dummy,
            unread: check
        })
    })
}

tabs.getId = function(name){
    for (let i in this.pages){
        if (this.pages[i].name == name)
            return i
    }
    return false
}

tabs.fetch = async function({
    id = 'battles',
    limit = this.pages.limit,
    offset = 0,
    unread = false,
    dummy = true
    }){

    await translatorReady 

    document.querySelectorAll('.page-nav .of').forEach(e => {
        e.innerHTML = translator.getTranslated("de")
    })
    
    this.pages[id].offset = offset
    $('#report-container #unread').hide()

    if (id == 'battles'){
        $('#report-container #unread').show()

        if (dummy){
            $('#bhist-container .table').html(`<div class='row head'><div class='cell'>${translator.getTranslated("Gladiador")}</div><div class='cell reward'>${translator.getTranslated("Renome")}</div><div class='cell time'>${translator.getTranslated("Data")}</div></div>`)

            // translator.bind()
            for (let i=0 ; i<limit ; i++){
                $('#bhist-container .table').append(`<div class='row dummy'>
                    <div class='cell favorite'><span class='dummy-text'><i class='far fa-star'></i></span></div>
                    <div class='cell glad'><span class='dummy-text'>GLADIATOR</span></div>
                    <div class='cell reward'><span class='dummy-text'>+00.0</span></div>
                    <div class='cell time'><span class='dummy-text'>0 TEMPO</span></div>
                </div>`)
            }
        }

        $('#report-container .page-nav button').prop('disabled',true)

        let data = await post("back_report.php",{
            action: "GET",
            offset: offset,
            read: true,
            unread_only: unread
        })
        // console.log(data);

        if (data.status == "SUCCESS"){
            if (!dummy){
                $('#bhist-container .table').html(`<div class='row head'><div class='cell'>${translator.getTranslated("Gladiador")}</div><div class='cell reward'>${translator.getTranslated("Renome")}</div><div class='cell time'>${translator.getTranslated("Data")}</div></div>`)

                // translator.bind()
            }

            $('#report-container .table .row').not('.head').remove()

            this.pages[id].total = data.total

            if (data.total <= offset && data.total > 0){
                this.fetch({
                    id: id,
                    offset: 0
                })
                return
            }

            for (let i=0 ; i<limit ; i++){
                if (data.total == 0 && i == 0){
                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell'><h3>${translator.getTranslated('Nenhuma batalha para mostrar')}</h3></div>
                    </div>`);

                    // translator.bind()
                }
                else if (offset + i < data.total){
                    let row = data.reports[i]
                    let star = {class: "far", title: translator.getTranslated("Guardar nos favoritos", false)};
                    if (row.favorite)
                        star = {class: "fas", title: translator.getTranslated("Tirar dos favoritos", false)};

                    let unread = ''
                    if (row.isread == "0")
                        unread = 'unread'

                    let reward = {class: "", value: `${parseFloat(row.reward).toFixed(1)}`}
                    if (parseFloat(row.reward) < 0){
                        reward.class = "red"
                    }
                    else if (parseFloat(row.reward) > 0){
                        reward.class = "green"
                        reward.value = `+${reward.value}`
                    }

                    let visual = ``
                    if (!row.expired){
                        visual = `<div class='playback' title='${translator.getTranslated("Visualizar batalha", false)}'>
                            <a target='_blank' href='play/${row.hash}'><img src='icon/eye.png'></a>
                        </div>`
                    }
                    $('#bhist-container .table').append(`<div class='row ${unread}'>
                        <div class='cell favorite' title='${star.title}'><i class='${star.class} fa-star'></i></div>
                        <div class='cell glad'>${row.gladiator}</div>
                        <div class='cell reward ${reward.class}'>${reward.value}</div>
                        <div class='cell time' title='${getDate(row.time)}'>${getDate(row.time, { short: true })}</div>
                        ${visual}
                    </div>`);
                    $('#bhist-container .favorite').last().data('id', row.id);
                }
                else{
                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell favorite'></div>
                        <div class='cell glad'></div>
                        <div class='cell reward'></div>
                        <div class='cell time'></div>
                    </div>`)
                }
            }

            $('#bhist-container .favorite').click( function(){
                var id = $(this).data('id');
                if ($(this).find('i').hasClass('fas')){
                    $(this).find('i').removeClass('fas').addClass('far').attr('title', translator.getTranslated("Guardar nos favoritos", false));
                    post_favorite(id, false, '');
                }
                else{
                    var star = $(this);
                    new Message({
                        message: "Informe um comentário sobre esta batalha",
                        buttons: {ok: "OK", cancel: "CANCEL"},
                        input: { placeholder: "Comentário..." }
                    }).show().click('ok', data => {
                        star.find('i').removeClass('far').addClass('fas').attr('title', translator.getTranslated("Tirar dos favoritos", false));
                        post_favorite(id, true, data.input);
                    })
                }

                function post_favorite(id, fav, comment){
                    post("back_report.php", {
                        action: "FAVORITE",
                        favorite: fav,
                        id: id,
                        comment: comment
                    }).then( function(data){
                        // console.log(data);
                    });
                }
            });
        }
    }
    if (id == 'favorites'){

        if (dummy){
            $('#bhist-container .table').html(`<div class='row head'>
                <div class='cell'>${translator.getTranslated("Gladiador")}</div>
                <div class='cell comment'>${translator.getTranslated("Comentário")}</div>
                <div class='cell time'>${translator.getTranslated("Data")}</div>
            </div>`)

            for (let i=0 ; i<limit ; i++){
                $('#bhist-container .table').append(`<div class='row dummy'>
                    <div class='cell favorite'><span class='dummy-text'><i class='fas fa-star'></i></span></div>
                    <div class='cell glad'><span class='dummy-text'>GLADIADOR</span></div>
                    <div class='cell comment'><span class='dummy-text'>COMENTÁRIO DE EXEMPLO</span></div>
                    <div class='cell time'><span class='dummy-text'>0 TEMPO</span></div>
                </div>`)
            }
        }

        $('#report-container .page-nav button').prop('disabled',true)

        let data = await post("back_report.php",{
            action: "GET",
            offset: offset,
            favorites: true
        })
        // console.log(data);

        if (data.status == "SUCCESS"){

            if (!dummy){
                $('#bhist-container .table').html(`<div class='row head'>
                    <div class='cell'>${translator.getTranslated("Gladiador")}</div>
                    <div class='cell comment'>${translator.getTranslated("Comentário")}</div>
                    <div class='cell time'>${translator.getTranslated("Data")}</div>
                </div>`)
            }

            $('#report-container .table .row').not('.head').remove()

            this.pages[id].total = data.total

            if (data.total <= offset && data.total > 0){
                this.fetch({
                    id: id,
                    offset: 0
                })
                return
            }

            for (let i=0 ; i<limit ; i++){
                if (data.total == 0 && i == 0){
                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell'><h3>${translator.getTranslated("Selecione suas batalhas favoritas para aparecer nesta tabela. Assim você também as protege de serem apagadas quando ficarem muito antigas")}</h3></div>
                    </div>`);
                }
                else if (offset + i < data.total){
                    let row = data.reports[i]
                    let star = {class: "far", title: translator.getTranslated("Guardar nos favoritos", false)}
                    if (row.favorite){
                        star = {class: "fas", title: translator.getTranslated("Tirar dos favoritos", false)}
                    }

                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell favorite' title='${star.title}'><i class='${star.class} fa-star'></i></div>
                        <div class='cell glad'>${row.gladiator}</div>
                        <div class='cell comment'>${row.comment}</div>
                        <div class='cell time' title='${getDate(row.time)}'>${getDate(row.time, { short: true })}</div>
                        <div class='playback' title='${translator.getTranslated("Visualizar batalha", false)}'>
                            <a target='_blank' href='play/${row.hash}'><img src='icon/eye.png'></a>
                        </div>
                    </div>`)
                    $('#bhist-container .favorite').last().data('id', row.id);
                }
                else{
                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell favorite'></div>
                        <div class='cell glad'></div>
                        <div class='cell comment'></div>
                        <div class='cell time'></div>
                    </div>`)
                }
            }

            $('#bhist-container .favorite').click( e => {
                var row = $(e.currentTarget)
                var id = row.data('id');
                new Message({
                    message: "Remover esta batalha dos favoritos?",
                    buttons: {yes: "Sim", no: "Não"}
                }).show().click('yes', async () => {
                    row.parent().remove();
                    await post("back_report.php", {
                        action: "FAVORITE",
                        favorite: false,
                        id: id,
                        comment: ''
                    })

                    this.fetch({
                        id: 'favorites',
                        offset: this.pages.favorites.offset
                    })
                })       
            });
        }
    }
    if (id == 'duels'){
        if (dummy){
            $('#bhist-container .table').html(`<div class='row head'><div class='cell'>${translator.getTranslated("Gladiador")}</div><div class='cell'>${translator.getTranslated("Oponente")}</div><div class='cell'>${translator.getTranslated("Mestre")}</div><div class='cell time'>${translator.getTranslated("Data")}</div></div>`)

            for (let i=0 ; i<limit ; i++){
                $('#bhist-container .table').append(`<div class='row dummy'>
                    <div class='cell glad'><span class='dummy-text'>GLADIADOR</span></div>
                    <div class='cell enemy'><span class='dummy-text'>GLADIADOR</span></div>
                    <div class='cell'><span class='dummy-text'>USUÁRIO</span></div>
                    <div class='cell time'><span class='dummy-text'>0 TEMPO</span></div>
                </div>`)
            }
        }

        $('#report-container .page-nav button').prop('disabled',true)

        let data = await post("back_duel.php", {
            action: "REPORT",
            offset: offset
        })
        // console.log(data);

        if (data.status == "SUCCESS"){
            if (!dummy){
                $('#bhist-container .table').html(`<div class='row head'><div class='cell'>${translator.getTranslated("Gladiador")}</div><div class='cell'>${translator.getTranslated("Oponente")}</div><div class='cell'>${translator.getTranslated("Mestre")}</div><div class='cell time'>${translator.getTranslated("Data")}</div></div>`)
            }    

            $('#report-container .table .row').not('.head').remove()

            this.pages[id].total = data.total

            if (data.total <= offset && data.total > 0){
                this.fetch({
                    id: id,
                    offset: 0
                })
                return
            }

            for (let i=0 ; i<limit ; i++){
                if (data.total == 0 && i == 0){
                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell'><h3>${translator.getTranslated("Você ainda não possui duelos")}</h3></div>
                    </div>`);
                }
                else if (offset + i < data.total){
                    let row = data.duels[i]

                    let unread = ''
                    if (row.isread == "0" || (!row.enemy && !row.log)){
                        unread = 'unread'
                    }

                    let glad = {
                        me: {class: "", value: row.glad},
                        enemy: {class: "", value: row.enemy},
                    }
                    if (!row.glad){
                        glad.me = {class: "forgotten", value: translator.getTranslated("Gladiador Esquecido", false)}
                    }

                    let tail = `<div class='playback' title='${translator.getTranslated("Visualizar batalha", false)}'>
                        <a target='_blank' href='play/${row.log}'><img src='icon/eye.png'></a>
                    </div>`
                    if (!row.enemy){
                        if (row.log){
                            glad.enemy = {class: "forgotten", value: translator.getTranslated("Gladiador Esquecido", false)}
                        }
                        else{
                            glad.enemy.value = "???"
                            tail = `<div class='remove' title='${translator.getTranslated("Cancelar desafio", false)}'>X</div>`
                        }
                    }

                    $('#bhist-container .table').append(`<div class='row ${unread}'>
                        <div class='cell glad ${glad.me.class}'>${glad.me.value}</div>
                        <div class='cell enemy ${glad.enemy.class}'>${glad.enemy.value}</div>
                        <div class='cell'>${row.user}</div>
                        <div class='cell time' title='${getDate(row.time)}'>${getDate(row.time, { short: true })}</div>
                        ${tail}
                    </div>`)
                    $('#bhist-container .row').last().data('id', row.id)

                    $('#bhist-container .table .row').last().find('.remove').click( async e => {
                        let button = $(e.currentTarget)
                        var id = button.parents('.row').data('id')
                        await post("back_duel.php",{
                            action: "DELETE",
                            id: id,
                        })
                        
                        new Message({ message: "Desafio cancelado" }).show()
                        this.fetch({
                            id: 'duels',
                            offset: this.pages.duels.offset
                        })
                    })
                }
                else{
                    $('#bhist-container .table').append(`<div class='row'>
                        <div class='cell glad'></div>
                        <div class='cell enemy'></div>
                        <div class='cell'></div>
                        <div class='cell time'></div>
                    </div>`)
                }
            }
        }
    }

    $('#report-container .page-nav .start').html(this.pages[id].total == 0 ? 0 : offset + 1)
    $('#report-container .page-nav .end').html(Math.min(offset + limit, this.pages[id].total))
    $('#report-container .page-nav .total').html(this.pages[id].total)
    
    if (offset > 0){
        $('#report-container #prev').removeAttr('disabled')
    }
        
    if (offset + limit < this.pages[id].total){
        $('#report-container #next').removeAttr('disabled')
    }
}

tabs.pages.next = function({ unread = false }){
    let id = tabs.getId(tabNames[$('#report-container .tab.selected').index('.tab')])
    if (id){
        let move = tabs.pages[id].offset + tabs.pages.limit

        if (unread)
            move = 0

        tabs.fetch({
            id: id,
            offset: move,
            unread: unread
        })
    }
}

tabs.pages.prev = function({ unread = false }){
    let id = tabs.getId(tabNames[$('#report-container .tab.selected').index('.tab')])
    if (id){
        let move = tabs.pages[id].offset - tabs.pages.limit

        if (unread)
            move = 0

        tabs.fetch({
            id: id,
            offset: move,
            unread: unread
        })
    }
}

$('#report-container #prev').click( function(){
    let check = $('#report-container #unread input:checked').length == 1
    tabs.pages.prev({ unread: check })
});

$('#report-container #next').click( function(){
    let check = $('#report-container #unread input:checked').length == 1
    tabs.pages.next({ unread: check })
});

$('#report-container #unread input').click( function(){
    let check = $(this).filter(':checked').length == 1
    let id = tabs.getId(tabNames[$('#report-container .tab.selected').index('.tab')])
    if (id == 'battles'){
        let offset = tabs.pages[id].offset
        if (check)
            offset = 0

        tabs.fetch({
            id: id,
            offset: offset,
            unread: check
        })
    }
})

;(async () => {
    tabs.init()
    document.querySelector('#report-container .tab.selected').click()
})()
