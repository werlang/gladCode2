$(document).ready(async function(){
    // got here from train link
    let hash = $('#hash').html()
    $('#hash').remove()

    if (hash){
        await waitLogged()
        if (user.status == "NOTLOGGED"){
            let data = await showDialog("Você precisa realizar o login para ingressar em um treino", ["Login", "Não"])
            if (data == "Não")
                window.location.href = ''
            else if (data == "Login"){
                await googleLogin()
                window.location.reload()
            }
        }

        let data = await post("back_train.php", {
            action: "JOIN",
            hash: hash
        })
        // console.log(data)
        
        let message
        let redirect = true
        
        if (data.status == "JOINED"){
            window.location.href = 'battle.train'
        }
        else if (data.status == "NOTFOUND"){
            message = "Treino não encontrado"
        }
        else if (data.status == "EXPIRED"){
            message = "O código para ingresso deste treino expirou"
        }
        else if (data.status == "ALLOWED"){
            redirect = false
            selectedGlad.choose(hash)
        }
        else if (data.status == "STARTED"){
            redirect = false
        }

        if (redirect){
            let msgbox = showMessage(message)
            $('#fog').addClass('black')
            await msgbox
            window.location.href = "battle.train"
        }
    }
    else
        window.location.href = ''

    socket_ready().then( () => {
        socket.emit('training run join', {
            hash: hash
        });
        socket.on('training refresh', () => {
            training.refresh()
        });

        init_chat($('#chat-panel'), {
            full: false,
            defaultOpen: 900
        });
    })

    await training.show(hash)
})

var selectedGlad = {
    choose: async function(hash){
        this.hash = hash
        var box = `<div id='fog'>
            <div class='glad-box'>
                <div id='title'>Escolha o gladiador que participará do treino</div>
                <div class='glad-card-container'></div>
                <div id='button-container'>
                    <button id='select' class='button' disabled>SELECIONAR</button>
                </div>
            </div>
        </div>`;
        $('body').append(box);

        load_glad_cards($('#fog .glad-card-container'), {
            clickHandler: function(){
                if (!$(this).hasClass('old')){
                    $('#fog #btn-glad-open').removeAttr('disabled');
                    $('#fog .glad-preview').removeClass('selected');
                    $(this).addClass('selected');
                    $('.glad-box #select').removeAttr('disabled');
                }
            },
            dblClickHandler: function(){
                if ($('#fog .glad-card-container .selected').length)
                    $('#fog .glad-box #select').click();
            }
        })
        $('#fog').addClass('black')

        $('#fog .glad-box #select').click( async function(){
            let glad = $('#fog .glad-preview.selected').data('id')
            let data = JSON.parse(await $.post("back_train.php", {
                action: "JOIN",
                hash: hash,
                glad: glad,
                redirect: true
            }))
            // console.log(data)

            if (data.status == "SUCCESS"){
                $('.glad-box').hide()
                await showMessage("Você ingressou no treino")
                window.location.href = 'battle.train'
            }
        });
    }
}

var training = {}

training.show = async function(hash){
    let sendHash = hash
    if (!hash)
        sendhash = this.hash

    let data = await post("back_training_run.php", {
        action: "GET",
        hash: sendHash,
        round: 1
    })
    // console.log(data)

    for (let f in data)
        this[f] = data[f]

    $('#content-box').html(`<h1>Treino <span id='tourn-name'>${this.name}</span></h1><h3 id='tourn-desc'>${this.description}</h3><div id='group-container'></div>`)

    // build teams and groups table
    let i = 0
    for (let gid in this.groups){
        $('#content-box #group-container').append(`<div class='group'>
            <div class='head'>
                <div class='title'>Grupo ${i+1} - <span>Rodada ${this.round}</span></div>
                <div class='icons'>
                    <div class='glad' title='Pontuação da última rodada'><i class='fas fa-star'></i></div>
                    <div class='time' title='Quantos segundos o gladiador sobreviveu'><i class='fas fa-clock'></i></div>
                </div>
            </div>
            <div class='teams-container'></div>
            <div class='foot'><button class='button' disabled></button></div>
        </div>`);
        $('#content-box #group-container .group').eq(i).data('id', gid);

        for (let tid in this.groups[gid]){
            let team = this.groups[gid][tid]
            let myteamclass = '';
            if (team.myteam == true){
                myteamclass = 'myteam';
            }

            $('#content-box #group-container .group .teams-container').eq(i).append(`<div class='team ${myteamclass}'>
                <div class='score'>${parseInt(team.score)}</div>
                <div class='name'>${team.master} - ${team.gladiator}</div>
                <div class='info'>
                    <div class='glad'>0</div>
                    <div class='time'>-</div>
                </div>
            </div>`);
            $('#content-box #group-container .group').eq(i).find('.team').last().data('id', tid);
        }

        i++
    }

    // buld countdown and link to other rounds
    $('#content-box').append(`
    <div id='timeleft' title='Tempo máximo restante até o fim da rodada'>
        <div id='time'>
            <div class='numbers'><span>0</span><span>0</span></div>:
            <div class='numbers'><span>0</span><span>0</span></div>:
            <div class='numbers'><span>0</span><span>0</span></div>
        </div>
        <div id='text'><span>HRS</span><span>MIN</span><span>SEG</span></div>
    </div>
    <div id='button-container'>
        <button class='arrow' id='back-round' title='Rodada anterior' disabled>
            <i class='fas fa-chevron-left'></i>
        </button>
        <button id='prepare' class='button' disabled>ENCERRAR RODADA</button>
        <button class='arrow' id='next-round' title='Próxima rodada' disabled>
            <i class='fas fa-chevron-right'></i>
        </button>
    </div>`);

    if (this.manager){
        $('#content-box #prepare').removeAttr('disabled');
        $('#content-box #prepare').off().click( () => {
            if (!$('#content-box #prepare').attr('disabled')){
                $('#content-box #prepare').html("AGUARDE...").attr('disabled', true);

                post("back_training_run.php", {
                    action: "DEADLINE",
                    hash: this.hash,
                    time: 0,
                    round: 1
                }).then( data => {
                    console.log(data)
                    if (data.status == "SUCCESS"){
                        this.deadline = data.deadline
                        this.refresh()
                    }
                })
            }
        })

        if (this.deadline === null){
            let click = showMessage(`
                <span>Quanto tempo até o início das batalhas da rodada ${this.round}?</span>
                <div id='slider'></div>
            `)

            var roundTime
            $('#dialog-box #slider').slider({
                range: "min",
                min: 0,
                max: 15,
                step: 1,
                value: 5,
                create: function( event, ui ) {
                    var val = $(this).slider('option','value');
                    $(this).find('.ui-slider-handle').html(val + 'm');
                    roundTime = val
                },
                slide: function( event, ui ) {
                    $(this).find('.ui-slider-handle').each( (index, obj) => {
                        $(obj).html(ui.value + 'm');
                        roundTime = ui.value
                    });
                }
            })

            await click
            
            post("back_training_run.php", {
                action: "DEADLINE",
                hash: this.hash,
                time: roundTime,
                round: 1
            }).then( data => {
                // console.log(data)
                if (data.status == "SUCCESS"){
                    this.deadline = data.deadline
                    this.refresh()
                }
            })
        }
    }
    else{
        $('#content-box #prepare').remove();
        $('#button-container .arrow').addClass('nobutton');
    }

    this.counting = 0
    this.refresh()
}

training.countDown = function(timestart){
    var serverleft = new Date(this.deadline) - new Date(this.now)
    if (!timestart)
        timestart = new Date()

    if (this.counting <= 1){
        this.counting++
        setTimeout( () => {
            let timediff = serverleft - (new Date() - timestart)
            let timeleft = msToTime(timediff)

            $('#timeleft .numbers').each( function(index, obj){
                if (parseInt(timeleft[index]) != parseInt($(obj).text())){
                    $(obj).find('span').eq(0).html(timeleft[index].toString()[0])
                    $(obj).find('span').eq(1).html(timeleft[index].toString()[1])
                }
            });

            if (parseInt(timeleft[0]) == 0){
                if (parseInt(timeleft[1]) < 10)
                    $('#timeleft').addClass('red')
                else
                    $('#timeleft').addClass('yellow')
            }
            
            if ($('#group-container .team .icon.green').length == $('#group-container .team').length)
                $('#timeleft .numbers span').html('0')

            this.counting--
            if (timediff > 0){
                this.countDown(timestart)
            }
            else{
                this.refresh()
            }
        }, 1000)
    }

    function msToTime(ms) {
        var s = Math.floor(ms / 1000);
        var m = Math.floor(s / 60);
        s = s % 60;
        var h = Math.floor(m / 60);
        m = m % 60;
      
        if (h < 0)
            h = '00'
        else if (h < 10)
            h = '0' + h;
        
        if (m < 0)
            m = '00'
        else if (m < 10)
            m = '0' + m;
    
        if (s < 0)
            s = '00'
        else if (s < 10)
            s = '0' + s;
            
        return [h,m,s];
    }
}

training.refresh = async function(){
    let data = await post("back_training_run.php", {
        action: "REFRESH",
        hash: this.hash,
        round: 1
    })
    console.log(data)

    this.now = data.now
    this.deadline = data.deadline
    // TODO: recebe score e coloca na pagina.
    for (let gid in this.groups){
        let group = this.groups[gid]
        if (data.groups[gid].locked)
            group.locked = true
        if (data.groups[gid].log){
            group.log = data.groups[gid].log
            for (let ti in group){
                group[ti].score = data.groups[gid][ti].score
                group[ti].time = data.groups[gid][ti].time
            }
        }

        if (!$('#content-box #prepare').attr('disabled') && group.locked)
            $('#content-box #prepare').html("AGUARDE...").attr('disabled', true)
    }

    $('#content-box #group-container .group').each( async (i, obj) => {
        obj = $(obj)
        const id = obj.data('id')

        if (this.groups[id].log){
            obj.find('.foot .button').removeAttr('disabled').html("VISUALIZAR BATALHA");
            obj.find('.foot .button').click( () => {
                window.open('play/'+ this.groups[id].log);
                // $(this).parents('.group').removeClass('hide-info');
            });

            obj.find('.team').each( (_,team) => {
                const tid = $(team).data('id')
                const score = parseFloat(this.groups[id][tid].score)
                const time = parseFloat(this.groups[id][tid].time).toFixed(1)
                if (score == 10)
                    $(team).find('.glad').html(score)
                else
                    $(team).find('.glad').html(score.toFixed(1))
                $(team).find('.time').html(time +'s')
            })
        }
        else if (this.groups[id].locked){
            // groupobj.addClass('hide-info');
            obj.find('.foot .button').html("Grupo pronto. Organizando batalha...");
        }
    })

    if (data.status == "SUCCESS")
        this.countDown()
    else if (data.status == "RUN"){
        const gid = data.run
        let sim = new Simulation({ training: gid })
        let simdata
        await socket_ready()
        socket.emit('tournament run request', {
            hash: this.hash,
            group: gid
        }, async data => {
            console.log(data);
            if (data.permission == 'granted')
                simdata = await sim.run()
        })
    }
    else if (data.status == "LOCK"){
        setTimeout(() => this.refresh(), 2000)
    }
    else if (data.status == "DONE"){
        $('#content-box #prepare').remove();
        $('#button-container .arrow').addClass('nobutton').removeAttr('disabled');

        $('#button-container #back-round').click( () => window.location.href = `train/${this.hash}/${parseInt(this.round)-1}`)
        $('#button-container #next-round').click( () => window.location.href = `train/${this.hash}/${parseInt(this.round)+1}`)

    }
    
}

async function post(path, args){
    return $.post(path, args).then( data => {
        try{
            data = JSON.parse(data)
        } catch(e) {
            return {error: e, data: data}
        }
        return data
    })
}