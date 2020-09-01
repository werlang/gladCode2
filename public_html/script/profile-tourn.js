import {socket} from "./socket.js"
import {login} from "./header.js"
import {post} from "./utils.js"
import {translator} from "./translate.js"
import {Message} from "./dialog.js"

(async () => {
    await login.wait()
    await translator.translate([
        "O identificador precisa ter tamanho 6 ou mais",
        "O identificador precisa conter somente letras, números ou espaços",
        "Digite uma senha, ou torne o torneio público",
        "Informe um número entre 2 e 50",
        "Formato de hora inválida",
        "Um torneio com este identificador já existe",
        "As equipes deverão entrar com os seguintes dados para se inscrever em seu torneio",
        "Identificador",
        "Senha",
        "As equipes deverão procurar seu torneio na lista de torneios públicos, ou entrar com o seguinte identificador para se inscrever em seu torneio",
        "Torneio registrado",
        "Torneio não encontrado",
        "Torneio",
        "Equipes inscritas",
        "Nova Equipe",
        "REMOVER",
        "INICIAR TORNEIO",
        "FECHAR",
        "Nome da nova equipe",
        "Nome muito curto",
        "Esta equipe já está registrada",
        "Equipe",
        "registrada",
        "Os mestres deverão informar a seguinte senha para ingressar nesta equipe",
        "Gladiadores inscritos",
        "Gladiadores",
        "VOLTAR",
        "ABANDONAR",
        "Clique para inscrever um novo gladiador",
        "Expulsar equipe",
        "Nenhuma equipe inscrita",
        "Descrição",
        "Equipes",
        "Tem certeza que deseja sair da equipe",
        "Você não faz mais parte da equipe",
        "A equipe",
        "foi desmantelada",
        "Você ingressou na equipe",
        "O gladiador",
        "foi removido da equipe",
        "INGRESSAR",
        "Deseja remover o gladiador",
        "da equipe",
        "de"
    ]).then( () => {
        document.querySelectorAll('.title .of').forEach(e => {
            e.innerHTML = translator.getTranslated("de")
        })
    })
    return true
})()    

var teamsync = {id: 0, time: 0};
var user

$(document).ready( function(){
    socket.isReady().then( () => {
        socket.io.on('tournament list', data =>{
            refresh_tourn_list();
        });
        socket.io.on('tournament teams', data =>{
            refresh_teams(data);
        });
        socket.io.on('tournament glads', data =>{
            refresh_glads(data);
        });

        socket.io.emit('tournament list join', {})
    });

    login.wait().then( data => {
        user = data        
    })

    $('#panel #battle-mode #tourn.button').click( async function(){
        $('#panel #battle-container .wrapper').hide();
        var duel = $('#panel #battle-container #tourn.wrapper');
        if (duel.css('display') == 'none')
            duel.fadeIn();

        refresh_tourn_list();
    });

    $('#panel #tourn.wrapper #create').click( function() {
        var box = `<div id='fog'>
            <div class='tourn window'>
                <div id='title'>
                    <h2>Criar torneio</h2>
                    <div id='public'>
                        <label>Público<input type='checkbox' class='checkslider'></label>
                    </div>
                </div>
                <input id='name' class='input' placeholder='Identificador do torneio (nome)' maxlength='50'><input type='password' id='pass' class='input' placeholder='senha para ingressar' maxlength='32'>
                <textarea id='desc' class='input' placeholder='Breve descrição...' maxlength='512'></textarea>
                <div id='options'>
                    <div id='maxteams' class='col'>
                        <span>Máximo de equipes</span>
                        <input class='input' value='50' maxlength='2'>
                    </div>
                    <div id='maxtime' class='col'>
                        <span>Tempo máximo da rodada</span>
                        <input class='input' value='23h 59m'>
                    </div>
                    <div id='flex-team'><label>
                        <input type='checkbox' class='checkslider' checked>
                        <span>Flex: Mestres podem inscrever mais de um gladiador</span>
                    </label></div>
                </div>
                <div id='button-container'>
                    <button id='cancel' class='button'>Cancelar</button>
                    <button id='create' class='button'>CRIAR</button>
                </div>
            </div>
        </div>`;
        $('body').append(box);

        translator.translate([$('#fog')])

        $('.tourn.window .checkslider').each( function(){
            $(this).after("<div class='checkslider trail'><div class='checkslider thumb'></div></div>").hide()
        })
    
        $('#fog .tourn.window').hide().fadeIn();
        $('#fog .tourn.window #name').focus();

        $('.tourn.window #cancel').click( function(){
            $('#fog').remove();
        });
        
        $('.tourn.window #maxtime .input').on('keydown', function(e){
            e.preventDefault();
            var h = '', m = '';
            var v = $(this).val();

            for (let i in v){
                if (v[i] >= '0' && v[i] <= '9' ){
                    if (v[i] != 0 || i > 0)
                        m += v[i];
                }
            }

            if (e.key >= '0' && e.key <= '9' && m.length < 4){
                m += e.key;
            }
            else if (e.keyCode == 8 || e.keyCode == 46){
                m = m.substr(0, m.length-1);
            }
            if (m.length == 0)
                m = '0';

            h = m.substr(-4, Math.min(2, m.length-2));
            m = m.substr(-2,2);

            if (parseInt(h) > 23)
                h = '23';
            if (h.length == 2 && parseInt(m) > 59)
                m = '59';

            v = m + 'm';
            if (h != '')
                v = h + 'h ' + v;
            $(this).val(v);
        });
        
        function validateMaxtime(){
            var v = $('.tourn.window #maxtime .input').val();
            if (v.split('h ').length == 1)
                v = '00h '+ v;
            var h = v.split('h ')[0];
            var m = v.split('h ')[1].split('m')[0];
            if (parseInt(m) > 59 || parseInt(h) > 23){
                return 0;
            }
            return 1;
        }

        $('.tourn.window #create').click( function(){
            var name = $('.tourn.window #name').val();
            var pass = $('.tourn.window #pass').val();
            var desc = $('.tourn.window #desc').val();
            var maxteams = $('.tourn.window #maxteams input').val();
            var maxtime = $('.tourn.window #maxtime input').val();
            var flex = $('.tourn.window #flex-team input').prop('checked');

            $('.tourn.window .input').removeClass('error');
            $('.tourn.window .tip').remove();

            if (name.length < 6){
                $('.tourn.window #name').focus();
                $('.tourn.window #name').addClass('error');
                $('.tourn.window #name').before(`<span class='tip'>${translator.getTranslated("O identificador precisa ter tamanho 6 ou mais", true)}</span>`);
            }
            else if (name.match(/[^\w\s]/g)){
                $('.tourn.window #name').focus();
                $('.tourn.window #name').addClass('error');
                $('.tourn.window #name').before(`<span class='tip'>${translator.getTranslated("O identificador precisa conter somente letras, números ou espaços", true)}</span>`);
            }
            else if ($('.tourn.window #pass').css('opacity') != "0" && pass.length == 0){
                $('.tourn.window #pass').focus();
                $('.tourn.window #pass').addClass('error');
                $('.tourn.window #pass').before(`<span class='tip'>${translator.getTranslated("Digite uma senha, ou torne o torneio público", true)}</span>`);
            }
            else if (maxteams.match(/[^\d]/g) || maxteams < 2 || maxteams > 50){
                $('.tourn.window #maxteams input').focus();
                $('.tourn.window #maxteams input').addClass('error');
                $('.tourn.window #maxteams input').before(`<span class='tip'>${translator.getTranslated("Informe um número entre 2 e 50", true)}</span>`);
            }
            else if (!validateMaxtime()){
                $('.tourn.window #maxtime input').focus();
                $('.tourn.window #maxtime input').addClass('error');
                $('.tourn.window #maxtime input').before(`<span class='tip'>${translator.getTranslated("Formato de hora inválida", true)}</span>`);
            }
            else{
                $.post("back_tournament.php",{
                    action: "CREATE",
                    name: name,
                    pass: pass,
                    desc: desc,
                    maxteams: maxteams,
                    maxtime: maxtime,
                    flex: flex
                }).done( function(data){
                    if (data != "EXISTS"){
                        $('#fog').remove();

                        var content = `<p>${translator.getTranslated("As equipes deverão entrar com os seguintes dados para se inscrever em seu torneio", true)}:</p>
                        <div>${translator.getTranslated("Identificador")}: <span class='highlight'>${name}</span></div>
                        <div>${translator.getTranslated("Senha")}: <span class='highlight'>${pass}</span></div>`;

                        if (pass == "")
                            content = `<p>${translator.getTranslated("As equipes deverão procurar seu torneio na lista de torneios públicos, ou entrar com o seguinte identificador para se inscrever em seu torneio", true)}:</p>
                            <div>${translator.getTranslated("Identificador")}: <span class='highlight'>${name}</span></div>`;

                        var box = `<div id='fog'><div id='tourn-message' class='tourn window'><h2>${translator.getTranslated("Torneio registrado", true)}</h2>${content}<div id='button-container'><button class='button'>OK</button></div></div></div>`;
                        $('body').append(box);

                        $('#tourn-message .button').click( function(){
                            $('#fog').remove();
                        });
                    }
                    else{
                        $('.tourn.window #name').focus();
                        $('.tourn.window #name').addClass('error');
                        $('.tourn.window #name').before(`<span class='tip'>${translator.getTranslated("Um torneio com este identificador já existe", true)}</span>`);
                    }

                    // translator.bind()
                });
            }

            // translator.bind()
        })

        $('.tourn.window #public .checkslider').click( function(){
            $('.tourn.window .input').removeClass('error');
            $('.tourn.window .tip').remove();
            if ($(this).prop('checked'))
                $('.tourn.window #pass').animate({height:0, opacity: 0}, 500).val("");
            else
                $('.tourn.window #pass').removeAttr('style');
        });
    });

    $('#panel #tourn.wrapper #join').click( function() {
        var box = "<div id='fog' class='tourn'><div class='tourn window'><h2>Ingresso em torneio</h2><p>Informe os dados do torneio que deseja participar</p><input id='name' class='input' placeholder='Identificador do torneio (nome)'><input id='pass' class='input' placeholder='Senha do torneio' type='password'><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='join' class='button'>INGRESSAR</button></div></div></div>";
        $('body').append(box);
        $('.tourn.window #name').focus();
        translator.translate($('#fog.tourn'))

        $('.tourn.window #cancel').click( function(){
            $('#fog').remove();
        });
        $('.tourn.window #name, .tourn.window #pass').keyup(function(e){
            if (e.keyCode == 13)
                $('.tourn.window #join').click();
            if (e.keyCode == 27)
                $('#fog').remove();
        });
        $('.tourn.window #join').click( function(){
            var tname = $('.tourn.window #name').val();
            var tpass = $('.tourn.window #pass').val();

            post("back_tournament.php",{
                action: "JOIN",
                name: tname,
                pass: tpass
            }).then( data => {
                // console.log(data)

                if (data.status == "NOTFOUND"){
                    $('.tourn.window #name').focus();
                    $('.tourn.window #name, .tourn.window #pass').addClass('error');
                    $('.tourn.window .tip').remove();
                    $('.tourn.window #name').before(`<span class='tip'>${translator.getTranslated("Torneio não encontrado", true)}</span>`);
                    // translator.bind()
                }
                else if (data.hash != ''){
                    $('.tourn.window #cancel').click();
                    window.open('tourn/'+ data.hash);
                }
                else{
                    refresh_teams({name: tname, pass: tpass});

                    if (socket){
                        socket.io.emit('tournament join', {
                            tname: tname,
                            tpass: tpass
                        });
                    }

                    $('.tourn.window').html(`<div id='title'>
                        <h2>${translator.getTranslated("Torneio")}<span class='highlight'>${data.name}</span></h2>
                        <div id='word'>${translator.getTranslated("Senha")}<span class='highlight'>${data.pass}</span></div></div>
                        <p>${data.description}</p>
                        <h3>${translator.getTranslated("Equipes inscritas", true)}<span id='count'></span></h3>
                        <div class='table'></div>
                        <div id='new-container'><button id='new' class='button'>${translator.getTranslated("Nova Equipe", true)}</button></div>
                        <div id='button-container'>
                            <button id='delete' class='button' hidden>${translator.getTranslated("REMOVER")}</button>
                            <button id='start' class='button' disabled>${translator.getTranslated("INICIAR TORNEIO", true)}</button>
                            <button id='close' class='button'>${translator.getTranslated("FECHAR")}</button>
                    </div>`);
                    // translator.bind()

                    if (data.pass == '')
                        $('.tourn.window #word').hide();

                    $('.tourn.window #close').click( function(){
                        $('#fog').remove();
                        
                        if (socket){
                            socket.io.emit('tournament leave', {
                                tname: tname,
                                tpass: tpass
                            });
                        }
                    });

                    $('.tourn.window #new').click( function(){
                        $('.tourn.window #new').hide().after(`<div class='input-button'><input placeholder='${translator.getTranslated("Nome da nova equipe", false)}' id='name'><button><i class='fas fa-users'></i></button></div>`);
                        // translator.bind()
                        $('.tourn.window #name').focus();
                        
                        $('.tourn.window #name').keyup( function(e){
                            if (e.keyCode == 13)
                                $('.tourn.window .input-button button').click();
                            else if (e.keyCode == 27){
                                $('.tourn.window .input-button').remove();
                                $('.tourn.window #new').fadeIn();
                                $('.tourn.window .tip').remove();
                            }
                        });

                        $('.tourn.window .input-button button').click( function(){
                            var name = $('.tourn.window #name').val();
                            $('.tourn.window .tip').remove();
                            if (name.length < 3){
                                $('.tourn.window #name').focus();
                                $('.tourn.window .input-button').before(`<span class='tip'>${translator.getTranslated("Nome muito curto", true)}</span>`);
                            }
                            else if ($('.tourn.window .table').html().match(">"+ name +"<")){
                                $('.tourn.window #name').focus();
                                $('.tourn.window .input-button').before(`<span class='tip'>${translator.getTranslated("Esta equipe já está registrada", true)}</span>`);
                            }
                            else{
                                choose_tourn_glad().then( function(data){
                                    if (data !== false){
                                        var gladid = data.glad;
                                        var showcode = data.showcode;
                                        $.post("back_tournament.php", {
                                            action: "TEAM_CREATE",
                                            name: name,
                                            tname: tname,
                                            tpass: tpass,
                                            glad: gladid,
                                            showcode: showcode
                                        }).done( function(data){
                                            // console.log(data);
                
                                            if (data == "NOTFOUND"){
                                                new Message({message: "Torneio não encontrado"}).show();
                                            }
                                            else if (data == "STARTED"){
                                                $('#fog.tourn').remove();
                                                new Message({message: "Este torneio já iniciou"}).show();
                                            }
                                            else if (data == "ALREADYIN"){
                                                new Message({message: "Já está em um time neste torneio"}).show();
                                            }
                                            else if (data == "EXISTS"){
                                                $('.tourn.window #name').focus();
                                                $('.tourn.window .input-button').before("<span class='tip'>Esta equipe já está registrada</span>");
                                            }
                                            else if (data == "FULL"){
                                                new Message({message: "Este torneio já esgotou o limite de inscrições"}).show();
                                            }
                                            else{
                                                data = JSON.parse(data);

                                                $('.tourn.window .input-button').remove();
                                                $('.tourn.window #new').fadeIn();
                
                                                var box = `<div id='fog' class='message'>
                                                    <div id='tourn-message' class='tourn window'>
                                                        <h2>${translator.getTranslated("Equipe")} <span class='highlight'>${name}</span> ${translator.getTranslated("registrada")}</h2>
                                                        <p>${translator.getTranslated("Os mestres deverão informar a seguinte senha para ingressar nesta equipe", true)}:</p>
                                                        <div>${translator.getTranslated("Senha")}: <span class='highlight'>${data.word}</span></div>
                                                        <div id='button-container'><button class='button'>OK</button></div></div></div>`;
                                                $('body').append(box);
                                                // translator.bind()

                                                $('#tourn-message .button').click( function(){
                                                    $('#fog.message').remove();
                                                    $('.tourn.window .table .row.signed').click();
                                                });
                                            }
                                        });
                                    }
                                });

                            }
                            // translator.bind()
                        });
                    });	
                }
            });
        });
    });

    $('#tourn.wrapper .title #offset button').click( function(){
        var step = 10;
        var value;
        if ($(this).parent().hasClass('open'))
            value = 'open';
        if ($(this).parent().hasClass('mine'))
            value = 'mine';

        if ($(this).attr('id') == 'prev')
            tournpage[value].offset -= step;
        if ($(this).attr('id') == 'next')
            tournpage[value].offset += step;

        refresh_tourn_list();
    });

});

var tournpage = {
    mine: {offset: 0},
    open: {offset: 0}
};
function refresh_tourn_list(){
    var step = 10;
    if ($('#panel #battle-mode #tourn.button').hasClass('selected')){
        $.post("back_tournament.php", {
            action: "LIST",
            moffset: tournpage.mine.offset,
            ooffset: tournpage.open.offset
        }).done( function(data){
            // console.log(data);
            if ($('#panel #battle-mode #tourn.button').hasClass('selected')){
                data = JSON.parse(data);
                var open = data.open;
                var mytourn = data.mytourn;

                tournpage.mine.offset = parseInt(data.pages.mine.offset);
                tournpage.mine.total = parseInt(data.pages.mine.total);
                tournpage.mine.end = Math.min(tournpage.mine.total, tournpage.mine.offset + step);

                tournpage.open.offset = parseInt(data.pages.open.offset);
                tournpage.open.total = parseInt(data.pages.open.total);
                tournpage.open.end = Math.min(tournpage.open.total, tournpage.open.offset + step);


                $('#panel #battle-container #tourn.wrapper #offset.mine .start').html(tournpage.mine.offset + 1);
                $('#panel #battle-container #tourn.wrapper #offset.open .start').html(tournpage.open.offset + 1);

                $('#panel #battle-container #tourn.wrapper #offset.mine .end').html(tournpage.mine.end);
                $('#panel #battle-container #tourn.wrapper #offset.open .end').html(tournpage.open.end);

                $('#panel #battle-container #tourn.wrapper #offset.mine .total').html(tournpage.mine.total);
                $('#panel #battle-container #tourn.wrapper #offset.open .total').html(tournpage.open.total);


                $('#panel #battle-container #tourn.wrapper #offset button').removeAttr('disabled');
                if (tournpage.mine.offset == 0)
                    $('#panel #battle-container #tourn.wrapper #offset.mine #prev').prop('disabled', true);
                if (tournpage.open.offset == 0)
                    $('#panel #battle-container #tourn.wrapper #offset.open #prev').prop('disabled', true);
                if (tournpage.mine.end == tournpage.mine.total)
                    $('#panel #battle-container #tourn.wrapper #offset.mine #next').prop('disabled', true);
                if (tournpage.open.end == tournpage.open.total)
                    $('#panel #battle-container #tourn.wrapper #offset.open #next').prop('disabled', true);

                $('#panel #battle-container #tourn.wrapper #table-open').html(`<div class='row head'><div class='cell'>${translator.getTranslated("Identificador")}</div><div class='cell'>${translator.getTranslated("Descrição", true)}</div><div class='cell'>${translator.getTranslated("Equipes")}</div><div class='cell'>Flex</div></div>`);
                for (let i in open){
                    $('#panel #battle-container #tourn.wrapper #table-open').append("<div class='row'><div class='cell' id='name'>"+ open[i].name +"</div><div class='cell'>"+ open[i].description +"</div><div class='cell'>"+ open[i].teams +"/"+ open[i].maxteams +"</div><div class='cell flex'>"+ open[i].flex +"</div></div>");
                }
            
                $('#mytourn.title').hide();
                if (mytourn.length > 0){
                    $('#panel #battle-container #tourn.wrapper #table-mytourn').html(`<div class='row head'><div class='cell'>${translator.getTranslated("Identificador")}</div><div class='cell'>${translator.getTranslated("Descrição", true)}</div><div class='cell'>${translator.getTranslated("Equipes")}</div><div class='cell'>Flex</div></div>`);
                    for (let i in mytourn){
                        $('#panel #battle-container #tourn.wrapper #table-mytourn').append("<div class='row'><div class='cell' id='name'>"+ mytourn[i].name +"</div><div class='cell'>"+ mytourn[i].description +"</div><div class='cell'>"+ mytourn[i].teams +"/"+ mytourn[i].maxteams +"</div><div class='cell flex'>"+ mytourn[i].flex +"</div></div>");
                    }
                    $('#mytourn.title').show();
                }

                $('#panel #battle-container #tourn.wrapper .table .cell.flex').each( function() {
                    if ($(this).html() == "1"){
                        $(this).html("<i class='fas fa-check flex'></i>");
                    }
                    else if ($(this).html() == "0"){
                        $(this).html("");
                    }
                });

                $('#panel #battle-container #tourn.wrapper .table .row').not('.head').click( function(){
                    var name = $(this).find('#name').text();
                    $.post("back_tournament.php",{
                        action: "JOIN",
                        name: name
                    }).done( function(data){
                        //console.log(data);
                        data = JSON.parse(data);

                        $('#tourn.wrapper #join').click();
                        $('.tourn.window #name').val(data.name);
                        $('.tourn.window #pass').val(data.pass);
                        $('.tourn.window #join').click();
                    });
                });

                translator.translate($('#panel #battle-container #tourn.wrapper .row.head'))
            }

        });
    }
}

function refresh_teams(obj){
    //console.log(obj);

    if (obj.remove){
        $('#fog.tourn, #fog.team, #fog.glads').remove();
        new Message({message: "O torneio foi removido"}).show()
    }
    else if (obj.start){
        if ($('#fog.tourn, #fog.team, #fog.glads').length)
            new Message({message: "Este torneio já iniciou"}).show();
        $('#fog.tourn, #fog.team, #fog.glads').remove();
    }
    else if ($('#fog.tourn').length){
        $.post("back_tournament.php",{
            action: "LIST_TEAMS",
            name: obj.name,
            pass: obj.pass,
            tourn: obj.tourn
        }).done( function(data){
            // console.log(data);
            var data = JSON.parse(data);

            if (data.status == "STARTED"){
                var hash = data.hash;
                $('#fog.tourn, #fog.team').remove();
                new Message({
                    message: "Este torneio já iniciou. Deseja acompanhá-lo?",
                    buttons: {yes: "Sim", no: "Não"}
                }).show().click('yes', () => window.open('tourn/'+ hash))
            }
            else{
                var teams = data.teams;
                var joined = false;
                if (data.joined)
                    joined = data.joined;

                if (teams.length == 0){
                    $('.tourn.window .table').html(`<div class='row'>${translator.getTranslated("Nenhuma equipe inscrita", true)}</div>`);
                    $('.tourn.window h3 #count').html("");
                }
                else{
                    //$('.tourn.window #button-container .button').addClass('single');
                    $('.tourn.window .table').html(`<div class='row head'><div class='cell'>Nome</div><div class='cell'>${translator.getTranslated("Gladiadores")}</div></div>`);
                    for (let i in teams){
                        $('.tourn.window .table').append(`<div class='row'><div class='cell'>${teams[i].name}</div><div class='cell'>${teams[i].glads}/3</div><div class='kick' title='${translator.getTranslated("Expulsar equipe", false)}'><i class='fas fa-times-circle'></i></div></div>`);
                        rebind_team_rows(teams[i].id);
                        if (joined && joined === teams[i].id)
                            $('.tourn.window .table .row').last().addClass('signed');
                        else if (teams[i].glads == 3)
                            $('.tourn.window .table .row').last().addClass('full');
                    }

                    $('.tourn.window h3 #count').html(`(${teams.length}/${data.maxteams})`)
                }

                if (data.filled == true && data.manager == true && teams.length > 1){
                    $('.tourn.window #button-container #start').removeAttr('disabled');
                    $('.tourn.window #button-container #start').off();
                    $('.tourn.window #button-container #start').click( function(){
                        new Message({
                            message: "Deseja iniciar o torneio? Após o início, as equipes não poderão mais ser alteradas",
                            buttons: {yes: "Sim", no: "NÃO"}
                        }).show().click('yes', () => {
                            $('.tourn.window #close').click();
                            post("back_tournament.php",{
                                action: "START",
                                name: obj.name,
                                pass: obj.pass
                            }).then( data => {
                                //console.log(data);
                                if (data.status == "DONE"){
                                    var hash = data.hash;
                                    window.open('tourn/'+ hash);

                                    post("back_sendmail.php",{
                                        action: "TOURNAMENT",
                                        hash: hash
                                    })
                                    // .then( data => console.log(data))
                                }
                            });
                        });
                    });
                }
                else
                    $('.tourn.window #button-container #start').prop('disabled', true);				

                if (data.manager == true && teams.length == 0){
                    $('.tourn.window #button-container #delete').show();
                    $('.tourn.window #button-container #start').hide();
                    $('.tourn.window #button-container #delete').off();
                    $('.tourn.window #button-container #delete').click( function(){
                        new Message({
                            message: "Deseja remover o torneio?",
                            buttons: {yes: "Sim", no: "NÃO"}
                        }).show().click('yes', () => {
                            $.post("back_tournament.php",{
                                action: "DELETE",
                                name: obj.name,
                                pass: obj.pass,
                                tourn: obj.tourn
                            }).done( function(data){
                                //console.log(data);
                                data = JSON.parse(data);
                                if (data.status == "DELETED"){
                                    new Message({message: "Torneio removido"}).show()
                                    $('#fog').remove();		
                                }
                                else if (data.status == "STARTED")
                                    new Message({message: "Este torneio já iniciou"}).show()
                                else{
                                    new Message({message: "Um torneio só pode ser removido quando não possuir equipes"}).show()
                                }
                            });
                        });
                    });
                }
                else if (data.manager == false){
                    $('.tourn.window .table .row .kick').remove();
                    $('.tourn.window #button-container #delete').remove();
                    $('.tourn.window #button-container #start').remove();
                    $('.tourn.window #button-container #close').addClass('single');
                }
                else if (data.manager == true){
                    $('.tourn.window #button-container #delete').hide();
                    $('.tourn.window #button-container #start').show();
                    $('.tourn.window .kick').click( function(e){
                        e.stopPropagation();
                        var team = $(this).parents(".row").find('.cell').eq(0).html();
                        new Message({
                            message: `Deseja expulsar a equipe do torneio?`,
                            buttons: {yes: "Sim", no: "Não"}
                        }).show().click('yes', () => {
                            post("back_tournament.php",{
                                action: "KICK",
                                name: obj.name,
                                pass: obj.pass,
                                teamname: team
                            }).then( data => {
                                //console.log(data);
                                if (data.status == "DONE"){
                                    new Message({message: `Equipe removida do torneio`}).show()
                                }
                            })
                        });
                    });
                }

                if (joined !== false || teams.length >= data.maxteams)
                    $('.tourn.window #new-container').hide();
                else
                    $('.tourn.window #new-container').show();
            }
        });
    }
}

function rebind_team_rows(teamid){
    $('.tourn.window .table .row').last().click( function(){
        teamsync.time = 0;
        var teamname = $(this).find('.cell').eq(0).html();
        var box = `<div id='fog' class='team'>
            <div class='tourn window'>
                <div id='title'>
                    <h2>${translator.getTranslated("Equipe")} <span class='highlight'>${teamname}</span></h2>
                    <div id='word'>${translator.getTranslated("Senha")}<span class='highlight'></span></div>
                </div>
                <h3>${translator.getTranslated("Gladiadores inscritos", true)}</h3>
                <div class='glad-card-container'></div>
                <div id='button-container'>
                    <button id='back' class='button'>${translator.getTranslated("VOLTAR")}</button>
                    <button id='join-leave' class='button'>${translator.getTranslated("ABANDONAR")}</button>
                </div>
            </div>
        </div>`;
        $('#fog .tourn.window').hide();
        $('body').append(box);
        // translator.bind()

        if (socket){
            socket.io.emit('team join', {
                team: teamid
            });
        }

        $('.tourn.window #back').click( function(){
            $('#fog.team').remove();
            $('#fog .tourn.window').fadeIn();

            if (socket){
                socket.io.emit('team leave', {
                    team: teamid
                });
            }
        });

        $('.tourn.window #join-leave').click( function(){
            if ($('.tourn.window #join-leave').text() == translator.getTranslated("ABANDONAR", false)){
                new Message({
                    message: `${translator.getTranslated("Tem certeza que deseja sair da equipe")} <span class='highlight'>${teamname}</span>?`,
                    buttons: {no: translator.getTranslated("Não"), yes: translator.getTranslated("SIM")},
                    translate: false
                }).show().click('yes', async () => {
                    let data = await post("back_tournament.php", {
                        action: "LEAVE_TEAM",
                        id: teamid
                    })
                    //console.log(data);

                    $('#fog.team').remove();
                    $('#fog #dialog-box').parents('#fog').remove();
                    
                    if (data.status == "STARTED")
                        (new Message({message: "Este torneio já iniciou"})).show()
                    else{
                        var message = `${translator.getTranslated("Você não faz mais parte da equipe")} <span class='highlight'>${teamname}</span>`;
                        if (data.status == "REMOVED")
                            message = `${translator.getTranslated("A equipe")} <b>${teamname}</b> ${translator.getTranslated("foi desmantelada")}`;

                        (new Message({message: message, translate: false})).show().click('ok', () => {
                            $('.tourn.window').fadeIn();
                        })
                    }
                })
            }
            else{
                choose_tourn_glad().then( function(data){
                    if (data !== false){
                        var gladid = data.glad;
                        var showcode = data.showcode;
                        new Message({
                            message: `Senha para ingressar na equipe`,
                            input: true,
                            buttons: {cancel: "CANCELAR", ok: "OK"}
                        }).show().click('ok', data => {
                            if (data !== false){
                                var pass = data;
                                $.post("back_tournament.php", {
                                    action: "JOIN_TEAM",
                                    pass: pass,
                                    team: teamid,
                                    glad: gladid,
                                    showcode: showcode
                                }).done( function(data){
                                    //console.log(data);
                                    data = JSON.parse(data);
                                    var tournid = data.tourn;

                                    if (data.status == "FAIL")
                                        new Message({message: "Senha incorreta"}).show();
                                    else if (data.status == "STARTED")
                                        new Message({message: "Este torneio já iniciou"}).show();
                                    else if (data.status == "SIGNED")
                                        new Message({message: "Você já participa de uma equipe deste torneio"}).show();
                                    else{
                                        new Message({message: `${translator.getTranslated("Você ingressou na equipe")} <b>${teamname}</b>`}).show().click('ok', () => {
                                            $('.tourn.window .row.signed').click()
                                        })
                                        $('.tourn.window #back').click()
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        refresh_glads({team: teamid});

    });
}

function refresh_glads(args){
    if (args.remove){
        if (socket){
            socket.io.emit('team leave', {
                team: args.team
            });
        }

        if ($('#fog.team, #fog.glads').length)
            new Message({message: "A equipe foi removida"}).show();

        $('#fog.team, #fog.glads').remove();
        $('.tourn.window').fadeIn();
    }
    else{
        var teamid = args.team;

        if (teamsync.id != teamid)
            teamsync = {id: teamid, time: 0};
        
        const gladCardModule = import("./glad-card.js")

        post("back_tournament.php", {
            action: "TEAM",
            id: teamid,
            sync: teamsync.time
        }).then( async data => {
            // console.log(data);

            if (data.status == "DONE"){
                var tname = data.name;
                var word = data.word;
                var flex = data.flex;
                var joined = false;

                teamsync.time = data.sync;
                if (data.joined)
                    joined = data.joined;

                data = data.glads;

                if (word){
                    $('#fog.team .tourn.window #word span.highlight').html(word)
                }
                else{
                    $('#fog.team .tourn.window #word').remove()
                }
                
                await new Promise(resolve => {
                    for (let i in data){
                        if (data[i].name){
                            gladCard.load($('.tourn.window .glad-card-container'), {
                                master: true,
                                remove: true,
                                customLoad: [{
                                    name: data[i].name,
                                    vstr: data[i].vstr,
                                    vagi: data[i].vagi,
                                    vint: data[i].vint,
                                    id: data[i].cod,
                                    user: data[i].apelido,
                                    skin: data[i].skin
                                }],
                                append: true
                            }).then( () => {
                                if (data[i].owner && data[i].owner === true){
                                    $('.tourn.window .glad-preview').eq(i).addClass('mine');
                                }
    
                                $('.glad-preview.mine .delete').click( function(){
                                    var id = $(this).parents('.mine').data('id');
                                    var name = $(this).parents('.mine').find('.row.glad span').html();
                                    new Message({
                                        message: `${translator.getTranslated("Deseja remover o gladiador")} <b>${name}</b> ${translator.getTranslated("da equipe")}?`,
                                        buttons: {yes: translator.getTranslated("Sim"), no: translator.getTranslated("Não")},
                                        translate: false
                                    }).show().click('yes', async () => {
                                        let data = await post("back_tournament.php", {
                                            action: "REMOVE_GLAD",
                                            glad: id,
                                            team: teamid
                                        })
                                        // console.log(data);
            
                                        if (data.status == "STARTED"){
                                            $('#fog.team').remove();
                                            new Message({message: "Este torneio já iniciou"}).show();
                                        }
                                        else if (data.status == "REMOVED"){
                                            $('#fog.team').remove();
                                            new Message({message: `${translator.getTranslated("A equipe")} ${translator.getTranslated("foi desmantelada")}`}).show().click('ok', () => {
                                                $('.tourn.window').fadeIn();
                                            })
                                        }
                                        else if (data.status == "DONE"){
                                            $('.tourn.window #back').click();
                                            new Message({message: `${translator.getTranslated("O gladiador")} <b>${name}</b> ${translator.getTranslated("foi removido da equipe")}`}).show().click('ok', () => {
                                                $('.tourn.window .row.signed').click()
                                            })
                                            
                                        }
                                        else{
                                            new Message({message: data.status}).show()
                                        }
                                    })
                                })

                                resolve(true)
                            })
                        }
                        else{
                            gladCard.load($('.tourn.window .glad-card-container'), {
                                master: true,
                                customLoad: [{
                                    name: '??????????',
                                    vstr: '??',
                                    vagi: '??',
                                    vint: '??',
                                    user: data[i],
                                    skin: ''
                                }],
                                append: true
                            }).then( () => {
                                $('.tourn.window .glad-preview').eq(i).addClass('blurred')

                                resolve(true)
                            })
                        }
                    }

                })

                for (let i = 0 ; i < 3 - data.length ; i++){
                    $('.tourn.window .glad-card-container').append(`<div class='glad-add'><div class='image'></div><div class='info'>${translator.getTranslated("Clique para inscrever um novo gladiador")}</div></div>`);
                }
                if ($('.tourn.window .glad-preview.blurred').length > 0){
                    $('.tourn.window .glad-add').addClass('disabled');
                    $('.tourn.window #join-leave').html(translator.getTranslated("INGRESSAR"));
                }
                if (flex == "0"){
                    $('.tourn.window .glad-add').addClass('disabled');
                }
                if ((joined || data.length >= 3) && $('.tourn.window #join-leave').html() == translator.getTranslated("INGRESSAR", false)){
                    $('#fog.team .tourn.window #join-leave').remove();
                    $('#fog.team .tourn.window #button-container .button').addClass('single');
                }

                $('.tourn.window .glad-add').not('.disabled').click( function(){
                    choose_tourn_glad().then( function(data){
                        //console.log(data);
                        if (data !== false){
                            var gladid = data.glad;
                            var showcode = data.showcode;
                            $.post("back_tournament.php", {
                                action: "ADD_GLAD",
                                glad: gladid,
                                showcode: showcode,
                                team: teamid,
                                pass: word
                            }).done( function(data){
                                //console.log(data);
                                data = JSON.parse(data);
                                if (data.status == "SAMEGLAD")
                                    new Message({message: "Este gladiador já faz parte da equipe"}).show();
                                else if (data.status == "STARTED"){
                                    $('#fog.team').remove();
                                    new Message({message: 'Este torneio já iniciou'}).show();
                                }
                                else if (data.status == "DONE"){
                                    $('#fog.team').remove();
                                    $('.tourn.window .row.signed').click();
                                }
                            });
                        }
                    });
                });
            }

        });
    }
}

function choose_tourn_glad(){
    var response = $.Deferred();

    var box = "<div id='fog' class='glads'><div id='duel-box'><div id='title'>Escolha o gladiador que irá lhe representar no torneio</div><div class='glad-card-container'></div><div id='show-code'><label><input type='checkbox' class='checkslider'>Permitir que minha equipe veja o código do gladiador</label></div><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='choose' class='button' disabled>ESCOLHER</button></div></div></div>";
    $('body').append(box);

    $('#duel-box .checkslider').each( function(){
        $(this).after("<div class='checkslider trail'><div class='checkslider thumb'></div></div>").hide()
    })

    translator.translate($('#fog.glads #duel-box'))

    gladCard.load($('#fog.glads .glad-card-container'), {}).then( () => {
        $('#fog.glads .glad-preview').not('.old').click( function(){
            $('#fog.glads #btn-glad-open').removeAttr('disabled');
            $('#fog.glads .glad-preview').removeClass('selected');
            $(this).addClass('selected');
            $('#duel-box #choose').removeAttr('disabled');
        });
        
        $('#fog.glads .glad-preview').dblclick( function(){
            $('#fog.glads #duel-box #choose').click();
        });
    })        
    
    $('#duel-box #cancel').click( function(){
        $('#fog.glads').remove();
        return response.resolve(false);
    });
    $('#duel-box #choose').click( function(){
        if ($('#fog.glads .glad-preview.selected').length){
            var gladid = $('#fog.glads .glad-preview.selected').data('id');
            var showcode = $('#duel-box input.checkslider').prop('checked');
            $('#fog.glads').remove();
            return response.resolve({glad: gladid, showcode: showcode});
        }
    });

    return response.promise();
}

export {refresh_tourn_list}