$(document).ready( function(){
    var tabs = {
        pages: {
            limit: 10,
            geral: { offset: 0 }
        }
    }

    tabs.show = async function(){
        let data = await post("back_rank.php", {
            action: "GET TABS",
        })
        // console.log(data)
        $('#ranking-container #tab-container .tab.user').remove()
        for (let i in data.tags){
            let tag = data.tags[i]
            $('#ranking-container #tab-container #add-tab').before(`<div class='tab user'>${tag}</div>`)
            this.pages[tag] = { offset: 0 }
        }

        if (!user.premium){
            $('#ranking-container #tab-container #add-tab').hide()
        }

        this.bind()
    }

    tabs.bind = function(){
        $('#ranking-container #tab-container .tab').not('#add-tab').off().click( async function(){
            if (!$(this).hasClass('selected')){
                $('#ranking-container #tab-container .tab').removeClass('selected');
                $(this).addClass('selected');

                if (user.premium){
                    $('#ranking-container #tab-container .tab.user i.close').remove()
                    $('#ranking-container #tab-container .tab.user.selected').append(`<i class='fas fa-times close'></i>`)

                    $('#ranking-container #tab-container .tab.user.selected .close').click( () => {
                        let tab = $('#ranking-container #tab-container .tab.selected')
                        let name = tab.text()
                        let message = new Message({
                            message: `Deseja remover a aba <b>#${name}</b>`,
                            buttons: {yes: "SIM", no: "NÃO"}
                        })
                        message.show()
                        message.click('yes', async () => {
                            let data = await post("back_rank.php", {
                                action: "WATCH TAB",
                                name: name,
                                remove: true
                            })
                            // console.log(data)
                            if (data.status == "SUCCESS"){
                                tabs.show()
                                create_toast(`Aba #${name} removida`, "success")
                                $('#ranking-container #tab-container #tab-general').click()
                            }
                        })
                    })
                }

                let tab = $(this).text().toLowerCase()
                
                tabs.fetch({
                    id: tab,
                    offset: tabs.pages[tab].offset,
                    search: $('#ranking-container #search .input').val()
                })
            }
        })
    }

    tabs.init = function(){
        $('#ranking-container #tab-container #add-tab').click( async function(){
            if (!user.premium){
                new Message({
                    message: `
                        <h3>Transforme seu perfil em uma conta de tutor</h3>
                        <img id='school' src='image/school.png'>
                        <p>Adicione e remova tags para monitorar o desempenho de seus alunos nos treinos.</p>
                        <p>Gere rankings personalizados e aumente o engajamento.</p>
                        `,
                    buttons: { no: "NÃO", yes: "SABER MAIS" }
                }).show().click('yes', () => {
                    window.open('about#plans')
                })
                $('#dialog-box').addClass('school large')
            }
            else if (parseFloat(user.credits) <= 0){
                noCredit()
            }
            else{
                // create a message box with in input
                let input = new Message({
                    message: `Nome da <b>#hashtag</b> que deseja rastrear`,
                    buttons: {ok: "OK", cancel: "CANCELAR"},
                    input: {placeholder: "suahashtag"},
                    preventKill: true
                })
                input.show()
                $('#dialog-box .input').wrap("<div class='wrapper'></div>").before("<span><b>#</b></span>").focus()
                // when button ok is clicked
                input.click('ok', async data => {
                    let text = data.input.toLowerCase()
                    if (text == ''){
                        input.kill()
                    }
                    // check if the input has only alphanumeric
                    else if (match = text.match(/^#{0,1}([a-z0-9_]+)$/)){
                        input.kill()
                        tabs.add(match[1])
                    }
                    else{
                        create_toast("A #hashtag deve conter somente letras, números e underline", "error")
                    }
                })
                input.click('cancel', () => {
                    input.kill()
                })
            }
        })
    
    }

    tabs.add = async function(name){
        let data = await post("back_rank.php", {
            action: "WATCH TAB",
            name: name,
            add: true
        })
        // console.log(data)
        if (data.status == "SUCCESS"){
            create_toast(`Aba #${name} criada`, "success")
        }
        else if (data.status == "NOPREMIUM"){
            create_toast(`Esta função só pode ser usada por contas verificadas de instituições de ensino`, "error")
            user.premium = false
        }
        else if (data.status == "NOCREDITS"){
            create_toast("Você não possui créditos para utilizar essa função", "error")
            user.credits = 0
        }

        this.show()
    }

    tabs.fetch = async function({
        id = 'geral',
        limit = this.pages.limit,
        offset = 0,
        search = ""
        }){

        this.pages[id].offset = offset

        if (id == 'geral'){
            $('#ranking-container .table').html("<div class='row head'><div class='cell position'></div><div class='cell'>Gladiador</div><div class='cell'>Mestre</div><div class='cell mmr'>Renome</div></div>")

            for (let i=0 ; i<limit ; i++){
                $('#ranking-container .table').append(`<div class='row dummy'>
                    <div class='cell position'><span class='dummy-text'>00°</span></div>
                    <div class='cell'><span class='dummy-text'>GLADNAME</span></div>
                    <div class='cell'><span class='dummy-text'>USERNAME</span></div>
                    <div class='cell mmr'><span class='dummy-text'>0000</span></div>
                </div>`)
            }

            $('#ranking-container .page-nav button').prop('disabled',true)

            let data = await post("back_rank.php",{
                action: "GET",
                offset: offset,
                search: search
            })
            // console.log(data);

            $('#ranking-container .table .row').not('.head').remove()

            this.pages[id].total = data.total

            if (data.total < offset){
                this.fetch({
                    id: id,
                    offset: 0,
                    search: search
                })
                return
            }

            for (let i=0 ; i<limit ; i++){
                if (offset + i < data.total){
                    let row = data.ranking[i]
                    $('#ranking-container .table').append(`<div class='row'>
                        <div class='cell position'>${row.position}º</div>
                        <div class='cell'>${row.glad}</div>
                        <div class='cell'>${row.master}</div>
                        <div class='cell mmr'><span class='change24'>${Math.abs(parseInt(row.change24))}</span>${parseInt(row.mmr)}</div>
                    </div>`)

                    if (user.apelido == row.master){
                        $('#ranking-container .table .row').last().addClass('mine')
                    }
                    if (parseInt(row.change24) > 0){
                        $('#ranking-container .table .mmr .change24').last().addClass('green')
                        $('#ranking-container .table .mmr .change24').last().prepend("<img src='icon/arrow-up-green.png'>")
                    }
                    else if (parseInt(row.change24) < 0){
                        $('#ranking-container .table .mmr .change24').last().addClass('red')
                        $('#ranking-container .table .mmr .change24').last().prepend("<img src='icon/arrow-up-green.png'>")
                    }
                }
                else{
                    $('#ranking-container .table').append(`<div class='row dummy'>
                        <div class='cell position'></div>
                        <div class='cell'></div>
                        <div class='cell'></div>
                        <div class='cell mmr'></div>
                    </div>`)
                }
            }
        }
        else{
            $('#ranking-container .table').html("<div class='row head'><div class='cell position'></div><div class='cell'>Mestre</div><div class='cell mmr'><i class='fas fa-star' title='Pontuação total'></i></div><div class='cell mmr'><i class='fas fa-clock' title='Tempo médio dos treinos'></i></div></div>")

            for (let i=0 ; i<limit ; i++){
                $('#ranking-container .table').append(`<div class='row dummy'>
                    <div class='cell position'><span class='dummy-text'>00°</span></div>
                    <div class='cell'><span class='dummy-text'>USERNAME</span></div>
                    <div class='cell mmr'><span class='dummy-text'>00</span></div>
                    <div class='cell mmr'><span class='dummy-text'>000.0s</span></div>
                </div>`)
            }

            $('#ranking-container .page-nav button').prop('disabled',true)

            let data = await post("back_rank.php", {
                action: "FETCH",
                tab: id,
                search: search
            })
            // console.log(data)
                        
            $('#ranking-container .table .row').not('.head').remove()

            this.pages[id].total = data.ranking.length

            // if you switch tabs and the result total is lesser than the actual tab index
            if (data.ranking.length < offset){
                this.fetch({
                    id: id,
                    offset: 0,
                    search: search
                })
                return
            }

            for (let i=0 ; i<limit ; i++){
                if (data.ranking[offset + i]){
                    let row = data.ranking[offset + i]
                    $('#ranking-container .table').append(`<div class='row'>
                        <div class='cell position'>${row.position}º</div>
                        <div class='cell'>${row.nick}</div>
                        <div class='cell mmr'>${row.score}</div>
                        <div class='cell mmr'>${row.time.toFixed(1)}s</div>
                    </div>`)

                    if (user.id == row.id){
                        $('#ranking-container .table .row').last().addClass('mine')
                    }
                }
                else{
                    $('#ranking-container .table').append(`<div class='row dummy'>
                        <div class='cell position'></div>
                        <div class='cell'></div>
                        <div class='cell mmr'></div>
                        <div class='cell mmr'></div>
                    </div>`)
                }
            }
            
        }

        $('#ranking-container .page-nav span').eq(0).html(this.pages[id].total == 0 ? 0 : offset + 1)
        $('#ranking-container .page-nav span').eq(1).html(Math.min(offset + limit, this.pages[id].total))
        $('#ranking-container .page-nav span').eq(2).html(this.pages[id].total)
        
        if (offset > 0){
            $('#ranking-container #prev').removeAttr('disabled')
        }
            
        if (offset + limit < this.pages[id].total){
            $('#ranking-container #next').removeAttr('disabled')
        }

    }

    tabs.pages.next = function(){
        let id = ($('#ranking-container .tab.selected').text()).toLowerCase()
        let search = $('#ranking-container #search .input').val()
        if (id){
            let move = tabs.pages[id].offset + tabs.pages.limit
            tabs.fetch({
                id: id,
                offset: move,
                search: search
            })
        }
    }

    tabs.pages.prev = function(){
        let id = ($('#ranking-container .tab.selected').text()).toLowerCase()
        let search = $('#ranking-container #search .input').val()
        if (id){
            let move = tabs.pages[id].offset - tabs.pages.limit
            tabs.fetch({
                id: id,
                offset: move,
                search: search
            })
        }
    }

    $('#menu #ranking').click(  async function() {
        tabs.show()
        let data = await post("back_rank.php", {action: "MAXMINE"})
        let page_offset = Math.floor(data.offset / tabs.pages.limit) * tabs.pages.limit
        if ($('#ranking-container .table').html() != "")
            page_offset = tabs.pages.geral.offset
        $('#ranking-container #tab-container #tab-general').click()
        tabs.fetch({offset: page_offset})
    });

    $('#ranking-container #prev').click( function(){
        tabs.pages.prev()
    });

    $('#ranking-container #next').click( function(){
        tabs.pages.next()
    });

    $('#ranking-container #search .input').on('input', function(e){
        tabs.fetch({
            id: $('#ranking-container .tab.selected').text().toLowerCase(),
            search: $(this).val()
        })
    });

    tabs.init()

})

function noCredit(){
    new Message({
        message: `
            <h3>Você não possui créditos suficientes</h3>
            <div id='credit'><i class='fas fa-credit-card'></i></div>
            <p>Recarregue seus créditos para poder continuar usando as funções da sua conta de tutor.</p>
            `,
        buttons: { no: "CANCELAR", yes: "RECARREGAR" }
    }).show().click('yes', () => {
        rechargeCredits()
    })
    $('#dialog-box').addClass('school')
}

function rechargeCredits(){
    console.log("TODO: recarregar créditos")
}

// API: 4E4C730C2525B23004CB1FA8001D06C5

// token: ae118152-d009-43e4-b20e-4f213c5a3fd4043efb8346d187e94cba6bc14211d2738272-a66d-489b-bf37-c5f8602c6f03