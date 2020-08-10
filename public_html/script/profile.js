import {login, post} from "./header.js"
import {socket} from "./socket.js"
import {translator} from "./translate.js"
import {assets} from "./assets.js"
import * as dropzone from "./dropzone.js"
import * as croppie from "./croppie.js"
import {chat} from "./chat.js"
import {Message, createToast} from "./dialog.js"
import {gladCard} from "./glad-card.js"
import * as potions from "./profile-potions.js"
import {Simulation, ProgressButton} from "./runSim.js"
import {stats} from "./stats_func.js"

var user

var tipArray = [
    "Obrigado por fazer parte da versão beta da gladCode",
    "Enquanto seu gladiador tiver menos de 1000 de renome, ele perderá menos renome",
    "Se você for o vencedor de uma batalha, seu gladiador ganhará muito renome",
    "Mesmo quando perder uma batalha, o gladiador pode ganhar renome, dependendo do tempo que ficou vivo",
    "Ser um dos primeiros a morrer é a receita para perder grandes quantidades de renome",
    "Se estiver enfrentando gladiadores mais fortes, o seu tende a ganhar mais renome",
    "Gladiadores de renome semelhante são automaticamente selecionados para se enfrentar",
    "Observe o comportamento de seus inimigos, e tente adaptar a lógica do seu gladiador para derrotá-los",
    "Quando você está offline, seus gladiadores podem ser desafiados. Eles podem subir ou descer no ranking",
    "Você pode ver as últimas batalhas que seus gladiadores participaram no menu HISTÓRICO",
    "Você pode procurar por usuários ou enviar mensagens para seus amigos no menu AMIGOS",
    "Participar de batalhas concede experiência para o mestre, que lhe permite recrutar mais gladiadores",
    "Está com dúvida em algo? pergunte na página do facebook ou comunidade do reddit da gladCode",
    "Quer conversar com outros mestres? Interaja de WhatsApp ou chat da gladCode",
    "Assista o replay de suas batalhas, assim você entende melhor o comportamentos de seus gladiadores",
    "A documentação é a melhor maneira de compreender como uma função funciona. Tem exemplos!",
    "Não entendeu algo sobre o funcionamento da gladCode? O manual da simulação está ali à sua disposição",
    "Ali no menu BATALHA, Você pode desafiar seus amigos para duelos de 1x1 para ver quem é o melhor",
    "No menu BATALHA, você pode criar ou participar de um torneio. Junte seus amigos e convide-os",
    "O chat da gladCode é o meio mais prático de compartilhar código e conhecer outros mestres. Experimente",
    "Já viu que têm um botão de preferências nas batalhas, que te permite ajustar várias coisas legais?",

    "A habilidade FIREBALL é efetiva no longo prazo, pois queima o inimigo aos poucos",
    "A habilidade TELEPORT te envia para qualquer lugar. Mas cuide o gás tóxico",
    "A habilidade CHARGE é ótima para se aproximar dos inimigos e causa um bom dano pela distância percorrida",
    "A habilidade BLOCK é menos efetiva quando você leva dano pelas costas",
    "A habilidade ASSASSINATE causa muito dano se você conseguir pegar o oponente desprevinido",
    "A habilidade AMBUSH é ótima tanto para se livrar de perigos como para iniciar um combate",

    "Cuide para nunca ficar na zona do gás tóxico. Mesmo o gladiador mais forte sucumbe nela rapidamente",
    "É bom garantir o centro da arena, mas cuidado para não virar alvo de vários inimigos",
    "Fugir das batalhas te mantém vivo, mas te deixa atrasado no poder que os níveis te concede",
    "Cada um dos três atributos te concede características essenciais para todo tipo de gladiador",
    "Sem FORÇA, um gladiador tem pouca vida, e morre rapidamente",
    "Sem AGILIDADE, um gladiador é lento, tanto em seus ataques como em seus movimentos",
    "Sem INTELIGÊNCIA, um gladiador não consegue lançar muitas habilidades",
    "Com uma boa estratégia, você pode criar gladiadores híbridos que se beneficiam de várias habilidades",
    "Se você tem pouca vida, jamais deixe um inimigo chegar muito perto de você",
    "Se você é um mago, não fique parado. Ser atordoado pode te custar a vida",
    "Se você é um guerreiro, abuse do BLOCK, ele é a ferramenta que te deixará vivo",
    "Uma FIREBALL arremessada em uma área com mais de um inimigo fará todos levarem dano de queimadura",

    "Ganhe moedas de prata por iniciar batalhas ranqueadas",
    "As primeiras 20 batalhas no intervalo de 24 horas rendem mais moedas de prata",
    "No menu POÇÕES você pode acessar todos itens disponíveis no apotecário",
    "Aumente o nível do seu apotecário para ganhar acesso a mais e melhores itens",
    "Os itens encomendados no apotecário ficam disponíveis para uso em todas suas batalhas",
    "Aumente seu nível de mestre para desbloquear mais espeços para encomandar poções",
    "Use a poção de vitalidade para impedir que seu gladiador morra",
    "Use a poção de concentração quando seu gladiador necessitar com urgência de pontos de habilidade",
    "Quer dar uma melhorada em algum de seus atributos? O tônico fortificate é o que você precisa",
    "Você tira melhor proveito do elixir da sabedoria quando usa ele assim que seu gladiador ganha um nível"
];

$(document).ready( function(){
    $('#header-container').addClass('small-profile');
    $('#header-profile').addClass('here');

    assets.fill();
    
    var preferences = ["friend","message","update","duel","tourn","translation"];

    login.wait().then( data => {
        user = data
        // console.log(user);

        if ($('#tab').length){
            var id = $('#tab').html();
            $('#'+ id).click();
            $('#tab').remove();
        }
        else
            $('#menu #profile').click();
        $('#profile-ui #picture img').attr('src',user.foto);
        $('#profile-ui #nickname').html(user.apelido);

        // remove money until premium account is enabled
        $('#menu #currencies #money').remove()
        $('#menu #currencies').removeClass('hidden')
        // $('#menu .curr span').html(`R$ ${parseFloat(user.credits).toFixed(2)}`)
        $('#menu #currencies #silver span').html(parseInt(user.silver))
        // if (parseFloat(user.credits) < 0){
        //     $('#menu .curr span').addClass('debit').attr('title', 'Recarregar créditos').click( () => {
        //         rechargeCredits()
        //     })
        // }

        var language = $('#profile-panel #language select');
        language.selectmenu().val(user.language).selectmenu('refresh');


        checkNotifications();

        socket.isReady().then( () => {
            //console.log("socket ready");
            socket.on('profile notification', data =>{
                //console.log("server message");
                checkNotifications();
            });
        });
        
        post("back_glad.php", {
            action: "GET"
        }).then( data => {
            if (data.length == 0){
                new Message({
                    message: `Você ainda não possui nenhum gladiador cadastrado. Deseja ir para o editor de gladiadores?`, 
                    buttons: {yes: "Sim", no: "Não, obrigado"}
                }).show().click('yes', () => {
                    window.location.href = "editor";
                });
            }
        });

        translator.translate(tipArray).then( data => {
            tipArray = data
        })

        translator.translate([
            'meses',
            'dias',
            'horas',
            'minutos',
            "RECORTAR IMAGEM",
            "Nenhuma batalha para mostrar",
            "Gladiador",
            "Renome",
            "Data",
            "Nenhum item neste espaço",
            "de",
            "Deseja excluir o gladiador",
            "Sim",
            "Não",
            "SIM",
            "NÃO",
            "Última atividade",
            "Aceitar solicitação",
            "Recusar solicitação",
            "Enviar mensagem",
            "Enviar convite de amizade",
            "Mensagem para",
            "Olá...",
            "CANCELAR",
            "Clique para criar um novo gladiador",
            "atualizar",
        ]).then( data => {
            // console.log($('#tourn .title #offset .of').length)
            $('#tourn .title #offset .of').html(translator.getTranslated("de"))

            // translator.bind()
        })
        
        $('#panel').hide()
        translator.translate([$('#menu'), $('#panel')]).then( () => {
            $('#panel').show()
        })

    });

    $('#menu .item').click( function(){
        if (!$(this).hasClass('disabled')){
            var menu = $(this);
            $('#panel .content').removeClass('open');
            $.each($('#panel').find('.content'), function(){
                if ($(this).data('menu') == menu.attr('id'))
                    $(this).addClass('open');
            });
            $('#menu .item').removeClass('here');
            $(this).addClass('here');
        }
    });
    
    $('#menu #news').click( function() {
        $.post("back_news.php",{
            action: "READ",
            page: 0
        }).done( function(data){
            // console.log(data);
            data = JSON.parse(data);

            $('#panel #news-container').html("");
            for (let i in data.posts){
                $('#panel #news-container').append(`<div class='post'>
                    <div class='share' title='Compartilhar'><i class='fas fa-share-alt'></i></div>
                    <div class='title'>${data.posts[i].title}</div>
                    <div class='time'>Publicado em ${getMessageTime(data.posts[i].time, { month_full: true })}</div>
                    <div class='body'>${data.posts[i].post}</div>
                </div>`);
                $('#panel #news-container .share').last().click( () => {
                    $('body').append(`<div id='fog'>
                        <div id='link-box'>
                            <h3>Link da publicação</h3>
                            <input value='https://gladcode.dev/post/${data.posts[i].id}' readonly>
                            <button>COPIAR</button>
                        </div>
                    </div>`);
                    translator.translate($('#fog'))

                    $('#fog').hide().fadeIn();
                    $('#fog').click( () => {
                        $('#fog').remove();
                    });

                    $('#link-box').click( e => {
                        e.stopPropagation();
                    });

                    $('#link-box button').click( () => {
                        $('#link-box input').select();
                        document.execCommand("copy");
                        createToast("Link da publicação copiado para área de transferência", "success");
                    });
                });
            }
            translator.translate($('#panel #news-container'))
        });
    });

    $('#menu #profile').click( function() {
        $('#nickname .input').val(user.apelido);

        for (var i in preferences){
            if (user.preferences[preferences[i]] == "1")
                $('#profile-panel #pref-'+ preferences[i] +' input.checkslider').prop('checked', true);
        }
    });

    $('#profile-panel #pref-translation input.checkslider').click( function() {
        if ($('#profile-panel #pref-translation input.checkslider').prop('checked')){
            $('#profile-panel #translation-tip').slideDown()
        }
        else{
            $('#profile-panel #translation-tip').fadeOut()
        }
    })

    $('#profile-panel .button').click( function(){
        $('#profile-panel .button').prop('disabled',true);

        for (var i in preferences){
            if ($('#profile-panel #pref-'+ preferences[i] +' input.checkslider').prop('checked'))
                user.preferences[preferences[i]] = "1";
            else
                user.preferences[preferences[i]] = "0";
        }
        
        $.post("back_login.php", {
            action: "UPDATE",
            nickname: $('#nickname .input').val(),
            picture: user.foto,
            preferences: JSON.stringify(user.preferences),
            language: $('#language select').val()
        })
        .done( function(data){
            //console.log(data);
            data = JSON.parse(data);
            if (data.status == "SUCCESS"){
                new Message({ message: "Informações atualizadas" }).show();
                $('#profile-panel .button').removeAttr('disabled');
                user.apelido = $('#nickname .input').val();
                $('#profile-ui #nickname').html(user.apelido);
                $('#profile-ui #picture img').attr('src',user.foto);
            }
            else if (data.status == "EXISTS"){
                new Message({ message: "Outro usuário já escolheu este nome" }).show().click('ok', function(){
                    $('#nickname .input').focus().select();
                });
                $('#profile-panel .button').removeAttr('disabled');
                
            }
        });
    });

    $('#menu #glads').click( function() {
        $('#glads-container .glad-preview, #glads-container .glad-add').addClass('to-remove')

        gladCard.load($('#glads-container .glad-card-container'), {
            remove: true,
            code: true,
            editor: true
        }).then( async () => {
            $('#glads-container .to-remove').remove()

            if ($('#glads-container .glad-preview').length > 0){
                $('#menu #battle').removeClass('disabled')
            }

            $('#glads-container .glad-preview.old .code .button').html(`{'${translator.getTranslated("atualizar")}'}`)
            $('#glads-container .glad-preview.old .code .button').click( () => {
                new Message({ message: `A simulação da gladCode foi atualizada, e o código do gladiador precisa ser testado e salvo novamente para que ele volte a participar das batalhas` }).show()
            })
            

            $('#glads-container .glad-preview .delete').click( function(){
                var card = $(this).parents('.glad-preview')
                new Message({
                    message: `${translator.getTranslated("Deseja excluir o gladiador")} <b>${card.find('.glad span').html()}</b>?`,
                    buttons: {yes: translator.getTranslated("Sim"), no: translator.getTranslated("Não")},
                    translate: false
                }).show().click('yes', () => {
                    card.fadeOut(function(){
                        card.remove()
                    })
                    post("back_glad.php",{
                        action: "DELETE",
                        id: card.data('id')
                    }).done( () => {
                        //console.log(data);
                        $('#glads-container .glad-preview').last().after(`<div class='glad-add'><div class='image'></div><div class='info'>${translator.getTranslated("Clique para criar um novo gladiador")}</div></div>`)
                        $('#glads-container .glad-add').first().click( function(){
                            window.location.href = "newglad"
                        })
                    });
                })
            })

            let gladlots = [1, 10, 20, 30, 40, 50]
            let nglads = $('#glads-container .glad-preview').length
            let maxglads = 6
            for (let i=nglads ; i < maxglads ; i++){
                let info = "Clique para criar um novo gladiador"
                let inactive = ''
                if (user.lvl < gladlots[i]){
                    info = `Atinja o nível ${gladlots[i]} de mestre para desbloquear este gladiador`
                    inactive = 'inactive'
                }
                let card = `<div class='glad-add ${inactive}'><div class='image'></div><div class='info'>${info}</div></div>`
                $('#glads-container .glad-card-container').append(card)
            }

            translator.translate($('.glad-add'))
            
            $('#glads-container .glad-add').not('.inactive').click( () => {
                window.location.href = "newglad"
            })
        })
    })
    
    $('#menu #battle').click( function() {

        $('#match-find').prop('disabled',true);
        if (!$(this).hasClass('disabled')){
            $.post("back_glad.php",{
                action: "GET",
            }).done( function(data){
                //console.log(data);
                data = JSON.parse(data);

                $('#battle-container .glad-preview').addClass('to-remove')
                gladCard.load($('#battle-container .glad-card-container'), {
                    mmr: true
                }).then( () => {
                    $('#battle-container .glad-preview.to-remove').remove()

                    $('#battle-container .glad-preview').click( function(){
                        var card = $(this);
                        if (!$(this).hasClass('old')){
                            $('#battle-container .glad-preview').removeClass('selected');
                            $(this).addClass('selected');
                            $('#match-find').removeAttr('disabled');
                        }
                        else{
                            new Message({
                                message: `Este gladiador precisa ser atualizado. Deseja abri-lo no editor?`, 
                                buttons: {yes: 'Sim', no: 'Não'} 
                            }).show().click('yes', () => {
                                window.open(`glad-${card.data('id')}`);
                            });
                        }
                    });

                })
            })

        }

        check_challenges()
    });

    $('#panel #battle-mode .button').click( function(){
        $('#panel #battle-mode .button').removeClass('selected');
        $(this).addClass('selected');
    });

    $('#panel #battle-mode #ranked.button').click( function(){
        $('#panel #battle-container .wrapper').hide();
        var ranked = $('#panel #battle-container #ranked.wrapper');
        if (ranked.css('display') == 'none')
            ranked.fadeIn();
    });

    $('#panel #battle-mode #duel.button').click( function(){
        $('#panel #battle-container .wrapper').hide();
        var duel = $('#panel #battle-container #duel.wrapper');
        if (duel.css('display') == 'none')
            duel.fadeIn();
    });

    $('#panel #duel.wrapper .input').on('input', function(){
        var text = $('#panel #duel.wrapper .input').val();
        filter_friends(text);
    });
    filter_friends("");
    function filter_friends(text){
        $.post('back_friends.php', {
            action: "FILTER",
            text: text
        }).done( function(data){
            //console.log(data);
            data = JSON.parse(data);
            $('#panel #duel.wrapper #table-friends').html("");
            for (let i in data){
                var row = "<div class='row'><div class='cell image'><img src='"+ data[i].picture +"'></div><div class='cell nick'>"+ data[i].nick +"</div></div>";
                $('#panel #duel.wrapper #table-friends').append(row);
                $('#panel #duel.wrapper #table-friends .row').last().data('user', data[i].user);
            }
            $('#panel #duel.wrapper #table-friends .row').click( function(){
                $('#panel #duel.wrapper #table-friends .row').removeClass('selected');
                $(this).addClass('selected');
                $('#panel #duel.wrapper #challenge').removeAttr('disabled');
            });
        });
    }
    $('#panel #duel.wrapper #challenge').click( function() {
        var userid = $('#panel #duel.wrapper #table-friends .row.selected').data('user');
        var nick = $('#panel #duel.wrapper #table-friends .row.selected .cell.nick').text();
        create_duel_box(nick, userid);
    });

    $('#panel #battle-mode #tourn.button').click( async function(){
        $('#panel #battle-container .wrapper').hide();
        var duel = $('#panel #battle-container #tourn.wrapper');
        if (duel.css('display') == 'none')
            duel.fadeIn();

        refresh_tourn_list();
    });

    $('#panel #battle-mode #train.button').click( function(){
        $('#panel #battle-container .wrapper').hide();
        var train = $('#panel #battle-container #train.wrapper');
        if (train.css('display') == 'none')
            train.fadeIn();

        trainList.refresh();
    })

    if ($('#subtab').length){
        let subtab = $('#subtab').html()
        $('#subtab').remove()
        $(`#panel #battle-mode #${subtab}.button`).click()
    }

    $.post("back_glad.php",{
        action: "GET",
    }).done( function(data){
        if (JSON.parse(data).length == 0)
            $('#menu #battle').addClass('disabled');
    });

    $('#battle-container #match-find').click( async function() {
        var progbtn = new ProgressButton($(this), await translator.translate(["Executando batalha...","Aguardando resposta do servidor"]));
        
        var selGlad = $('#battle-container .glad-preview.selected');
        var thisglad = {
            'id': selGlad.data('id'),
            'name': selGlad.data('name'),
            'skin': selGlad.data('skin'),
            'code': selGlad.data('code'),
            'user': selGlad.data('user'),
            'vstr': selGlad.data('vstr'),
            'vagi': selGlad.data('vagi'),
            'vint': selGlad.data('vint'),
            'mmr': selGlad.data('mmr'),
        }

        let oldStatus = {
            lvl: user.lvl,
            xp: {
                value: parseFloat(user.xp),
                total: getXpToNextLvl()
            },
            silver: user.silver,
            mmr: thisglad.mmr,
            glad: thisglad.id
        }

        $.post("back_match.php", {
            action: "MATCH",
            id: thisglad.id
        }).done( function(data){
            var glads = JSON.parse(data);
            glads.push(thisglad);
            //console.log(glads);
            var preBattleInt
            preBattleShow(glads).then( data => preBattleInt = data)
            
            new Simulation({
                ranked: true,
                origin: "ranked",
                terminal: true
            }).run().then( function(data){
                // console.log(data);
                if (data.error){
                    progbtn.kill()
                    window.location.reload()
                }
                else{
                    let hash = data.simulation

                    stats.save(hash)

                    clearInterval(preBattleInt);
                    progbtn.kill();

                    $('#fog').remove();
                    $('#menu #battle').click();

                    afterBattleShow(hash, oldStatus)
                }
            });
            
        });
        
    });
    
    var msgpage = 1;
    $('#message-panel #prev').click( function(){
        msgpage--;
        reload_messages();
    });
    $('#message-panel #next').click( function(){
        msgpage++;
        reload_messages();
    });
    $('#menu #messages').click( function() {
        reload_messages();
    });
    function reload_messages(){
        //checkNotifications();
        $('#message-panel #full-message').remove();
        $('#message-panel .table').show();
        $.post("back_message.php",{
            action: "GET",
            page: msgpage
        })
        .done( function(data){
            //console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(error){
                console.log(error);
            }

            var meta = data.meta;
            data = data.info;

            if (meta.total == 0)
                $('#message-panel .table').html("Você ainda não possui mensagens");
            else{
                $('#message-panel #page-title span').eq(0).html(meta.start);
                $('#message-panel #page-title span').eq(1).html(meta.end);
                $('#message-panel #page-title span').eq(2).html(meta.total);

                if (meta.page == 1)
                    $('#message-panel #prev').prop("disabled", true);
                else
                    $('#message-panel #prev').removeAttr("disabled");
                if (meta.end == meta.total)
                    $('#message-panel #next').prop("disabled", true);
                else
                    $('#message-panel #next').removeAttr("disabled");

                $('#message-panel .table').html("");
                for (var i in data){
                    $('#message-panel .table').append("<div class='row'><div class='cell user'>"+ data[i].nick +"</div><div class='cell message'>"+ data[i].message +"</div><div class='cell time'>"+ getMessageTime(data[i].time, { short: true }) +"</div></div>");
                    if (data[i].isread == "0")
                        $('#message-panel .table .row').last().addClass('unread');
                }
                $('#message-panel .table .row').click( function(){
                    var i = $('#message-panel .table .row').index($(this));
                    var id = data[i].id;
                    var message = data[i].message;
                    var time = getMessageTime(data[i].time);
                    var nick = data[i].nick;
                    var picture = data[i].picture;
                    $('#message-panel').append("<div id='full-message'><div class='row head'><div class='image'><img src='"+ picture +"'></div><div class='user'>"+ nick +"</div><div class='time'>"+ time +"</div></div><div class='row body'><div class='message'>"+ message +"</div></div><div class='row buttons'><button class='button' id='back'><img src='icon/back.png'><span>Retornar</span></button><button class='button' id='reply'><img src='icon/reply.png'><span>Responder</span></button><button class='button' id='unread'><img src='icon/unread.png'><span>Marcar não lido</span></button><button class='button' id='delete'><img src='icon/delete2.png'><span>Excluir</span></button></div></div>");
                    $('#message-panel #full-message').hide();
                    $('#message-panel .table').fadeOut( function(){
                        $('#message-panel #full-message').toggle('scale');
                    });
                    $.post("back_message.php",{
                        action: "READ",
                        id: id,
                        value: 1
                    });
                    
                    $('#message-panel #back').click( function(){
                        $('#menu #messages').click();
                    });
                    $('#message-panel #reply').click( function(){
                        $('#message-panel #full-message .row.buttons').hide();
                        $('#message-panel #full-message').append("<div class='row reply'><textarea class='input'></textarea><div class='row buttons'><button class='button' id='send'><img src='icon/reply.png'><span>Enviar</span></button><button class='button' id='cancel'><img src='icon/delete2.png'><span>Descartar</span></button></div></div>");
                        $('#message-panel #full-message .reply').hide().fadeIn();
                        $('#message-panel #full-message .input').focus();
                        $('#message-panel #full-message .input').on('input', function(){
                            var offset = this.offsetHeight - this.clientHeight;
                            if ($(this).height() >= 300)
                                $(this).height(300);
                            else
                                $(this).css('height', 'auto').css('height', this.scrollHeight + offset);
                        });
                        
                        $('#message-panel #full-message #send').click( function(){
                            var message = $('#message-panel #full-message .input').val();
                            $.post("back_message.php",{
                                action: "REPLY",
                                replyid: id,
                                message: message
                            })
                            .done( function(){
                                $('#menu #messages').click();

                                $.post("back_sendmail.php", {
                                    action: "MESSAGE",
                                    replyid: id,
                                    message: message
                                })
                                .done( function(data){
                                    //console.log(data);
                                });
                            });
                        });
                        $('#message-panel #full-message #cancel').click( function(){
                            $('#message-panel #full-message .row.reply').remove();
                            $('#message-panel #full-message .row.buttons').show();
                        });
                    });
                    $('#message-panel #unread').click( function(){
                        $.post("back_message.php",{
                            action: "READ",
                            id: id,
                            value: 0
                        })
                        .done( function(){
                            $('#menu #messages').click();
                        });
                    });
                    $('#message-panel #delete').click( function(){
                        $.post("back_message.php",{
                            action: "DELETE",
                            id: id
                        })
                        .done( function(){
                            $('#menu #messages').click();
                        });
                    });
                });
            }
        });
    }
    
    $('#friend-panel #request, #friend-panel #friends').addClass('hidden');

    $('#menu #friends').click( function() {
        $.post("back_friends.php",{
            action: "GET"
        })
        .done( async function(data) {
            data = JSON.parse(data);
            //console.log(data);
            if (data.pending.length > 0)
                $('#friend-panel #request').removeClass('hidden');
            if (data.confirmed.length > 0)
                $('#friend-panel #friends').removeClass('hidden');

            $('#friend-panel #request .table').html("");
            for (var i in data.pending){
                var nick = data.pending[i].nick;
                var id = data.pending[i].id;
                var picture = data.pending[i].picture;
                var lvl = data.pending[i].lvl;
                $('#friend-panel #request .table').append(`<div class='row'>
                    <div class='cell lvl-container'>
                        <img title='Nível' src='res/star.png'><span>${lvl}</span>
                    </div>
                    <div class='cell image-container'>
                        <img src='${picture}'>
                    </div>
                    <div class='cell user'>${nick}</div>
                    <div class='button-container'>
                        <div class='check' title='${translator.getTranslated("Aceitar solicitação", false)}'></div>
                        <div class='close' title='${translator.getTranslated("Recusar solicitação", false)}'></div>
                    </div>
                </div>`);
                $('#friend-panel #request .table .row').last().data('id', id);
            }

            $('#friend-panel #friends .table').html("");
            for (var i in data.confirmed){
                var nick = data.confirmed[i].nick;
                var user = data.confirmed[i].user;
                var lvl = data.confirmed[i].lvl;
                var id = data.confirmed[i].id;
                var picture = data.confirmed[i].picture;
                var active = last_active_string(data.confirmed[i].active);
                $('#friend-panel #friends .table').append(`<div class='row'>
                    <div class='cell lvl-container'>
                        <img title='Nível' src='res/star.png'><span>${lvl}</span>
                    </div>
                    <div class='cell image-container'>
                        <img src='${picture}'>
                    </div>
                    <div class='cell'>${nick}</div>
                    <div class='cell last-active'>
                        <span class='label'>${translator.getTranslated("Última atividade")}</span>
                        <span>${active}</span>
                    </div>
                    <div class='button-open'></div>
                </div>`);
                $('#friend-panel #friends .table .row').last().data({'id': id, 'user': user, 'nick': nick});
            }
            
            $('#friend-panel .check, #friend-panel .close').click( function() {
                var answer = "NO";
                if ($(this).hasClass('check'))
                    answer = "YES";
                $.post("back_friends.php", {
                    action: "REQUEST",
                    answer: answer,
                    id: $(this).parents('.row').data('id')
                }).done( function(data){
                    $('#menu #friends').click();
                });
            });
            
            $('#friend-panel #friends .button-open').click( function() {
                close_friend_menu();
                var button = $(this)
                $('#friend-panel #friends .button-open').removeClass('open');
                $(this).addClass('open');
                var menu = $('#friend-panel #friends .options');
                menu.css({
                    'top': button.position().top,
                    'left': button.position().left + button.width()
                }).hide().animate({
                    height: "toggle",
                    width: "toggle",
                    left: button.position().left - menu.width() + button.width()
                }, 500, function(){
                    menu.addClass('open');
                });
            });

        });
    });

    $(window).click( function(e){
        var menu = $('#friend-panel #friends .options');
        if (menu.hasClass('open'))
            close_friend_menu();
    });

    function close_friend_menu(){
        var button = $('#friend-panel #friends .button-open.open');
        var menu = $('#friend-panel #friends .options');
        menu.removeClass('open');
        button.removeClass('open');
        menu.removeAttr('style');
    }

    $('#friend-panel #friends .unfriend').click( function() {
        var button = $('#friend-panel #friends .button-open.open')
        var row = button.parents('.row')
        var id = button.parents('.row').data('id')
        var nick = button.parents('.row').data('nick')
        new Message({
            message: `Deseja remover <b>${nick}</b> da sua lista de amigos?`,
            buttons: {yes: "Sim", no: "Não"}
        }).show().click('yes', () => {
            post("back_friends.php", {
                action: "DELETE",
                user: id
            }).then( data => {
                //console.log(data);
                row.remove()
            })
        })
    })
    $('#friend-panel #friends .message').click( function() {
        var button = $('#friend-panel #friends .button-open.open');
        bind_send_message(button);
    });
    
    $('#friend-panel #friends .duel').click( function() {
        var button = $('#friend-panel #friends .button-open.open');
        var nick = button.parents('.row').data('nick');
        var userid = button.parents('.row').data('user');

        create_duel_box(nick, userid);
    });

    function create_duel_box(nick, userid){
        var box = `<div id='fog'>
            <div id='duel-box'>
                <div id='title'>Escolha o gladiador que duelará contra <span class='highlight'>${nick}</span> em nome da sua honra</div>
                <div class='glad-card-container'></div>
                <div id='button-container'>
                    <button id='cancel' class='button'>Cancelar</button><button id='invite' class='button' disabled>DESAFIAR</button>
                </div>
            </div>
        </div>`;
        $('body').append(box);
        translator.translate($('#fog'))

        gladCard.load($('#fog .glad-card-container'), {
            clickHandler: function(){
                $('#fog #btn-glad-open').removeAttr('disabled');
                $('#fog .glad-preview').removeClass('selected');
                $(this).addClass('selected');
                $('#duel-box #invite').removeAttr('disabled');
            },
            dblClickHandler: function(){
                $('#fog #duel-box #invite').click();
            }
        });

        $('#duel-box #cancel').click( function(){
            $('#fog').remove();
        });
        $('#duel-box #invite').click( function(){
            var gladid = $('#fog .glad-preview.selected').data('id');
            var gladname = $('#fog .glad-preview.selected .info .glad span').html();
            $.post("back_duel.php",{
                action: "CHALLENGE",
                glad: gladid,
                friend: userid
            }).done( function(data){
                data = JSON.parse(data);
                $('#fog').remove();
                if (data.status == "EXISTS"){
                    new Message({ message: `Já existe um desafio de duelo contra <b>${nick}</b> usando o gladiador <b>${gladname}</b>.` }).show();					
                }
                else if (data.status == "OK"){
                    new Message({ message: `Desafio enviado para <b>${nick}</b>. Assim que uma resposta for dada você será notificado.` }).show();
                    
                    $.post("back_sendmail.php",{
                        action: "DUEL",
                        friend: userid,
                    }).done( function(data){
                        //console.log(data);
                    });
                }
                else{
                    // console.log(data);
                }
            });
        });
    }

    $('#friend-panel input').on('input', function() {
        var text = $(this).val();
        $.post("back_friends.php", {
            action: "SEARCH",
            text: text,
        })
        .done( function(data){
            //console.log(data);
            data = JSON.parse(data);
            $('#friend-panel #search .table').html("");
            for (var i in data){
                var nick = data[i].nick;
                var userid = data[i].user;
                var email = data[i].email;

                $('#friend-panel #search .table').append(`<div class='row'>
                    <div class='cell'>${nick}</div>
                    <div class='cell button-container'>
                        <div class='send-message' title='${translator.getTranslated("Enviar mensagem", false)}'></div>
                        <div class='add-friend' title='${translator.getTranslated("Enviar convite de amizade", false)}'></div>
                    </div>
                </div>`);
                $('#friend-panel #search .table .row').last().data({
                    user: userid,
                    nick: nick,
                    email: email
                });
            }
            $('#friend-panel #search .add-friend').click( function() {
                var nick = $(this).parents('.row').data('nick');
                var email = $(this).parents('.row').data('email');
                var userid = $(this).parents('.row').data('user');

                $.post("back_friends.php", {
                    action: "ADD",
                    user: userid
                })
                .done( function(data){
                    if (data == "EXISTS"){
                        new Message({ message: `O usuário <b>${nick}</b> já está em sua lista de amigos` }).show()
                    }
                    else{
                        new Message({ message: `Convite enviado para <b>${nick}</b>` }).show()

                        $.post("back_sendmail.php", {
                            action: "FRIEND",
                            friend: email,
                        })
                        .done( function(data){
                            //console.log(data);
                        });
                    }
                });
            });
            $('#friend-panel #search .send-message').click( function() {
                bind_send_message($(this));
            });
        });
    });
    
    function bind_send_message(elem){
        var userid = elem.parents('.row').data('user');
        var nick = elem.parents('.row').data('nick');
        new Message({
            message: `${translator.getTranslated("Mensagem para")} <b>${nick}</b>:`,
            buttons: {
                cancel: translator.getTranslated("CANCELAR"),
                ok: translator.getTranslated("OK")
            },
            translate: false,
            textarea: {
                placeholder: translator.getTranslated("Olá...", false),
                // maxlength: 2048
            }
        }).show().click('ok', data => {
            if (data){
                var message = data;
                $.post("back_message.php", {
                    action: "SEND",
                    id: userid,
                    message: message
                })
                .done( function(data){
                    //console.log(data);
                    new Message({ message: "Mensagem enviada" }).show()
                    
                    $.post("back_sendmail.php", {
                        action: "MESSAGE",
                        receiver: userid,
                        message: message,
                    })
                    .done( function(data){
                        //console.log(data);
                    });
                });
            }
        });
    }

    $('#menu #logout').click( function() {
        googleLogout().then( function(){
            window.location.href = 'index';
        });
    });
        
    $('#img-preview-container').hide();
    
    $("#img-upload").dropzone({
        url: "#",
        acceptedFiles: "image/*",
        previewTemplate: "<div class='dz-preview'></div>",
        accept: function(file, done) {
            done();
        },
        init: function () {
            this.on('addedfile', function (file) {  
                $('.dz-preview').remove();
                $('#img-preview-container').append($(file.previewElement));
                $('#img-preview-container').fadeIn();
            });
        },
        success: function(file, response) {
            //console.log(file);
            var img = new Image();
            img.src = file.dataURL;
            img.onload = function(){
                $('.dz-preview').html(`<button id='crop-image' class='button'>RECORTAR IMAGEM</button><img src='${img.src}'>`)
                translator.translate($('.dz-preview'))
                var crop = new Croppie($('.dz-preview img')[0], {
                    viewport: { width: 150, height: 150 },
                    boundary: { width: 300, height: 300 },
                });
                $('.cr-slider').addClass('slider');
                $('#crop-image').on('click', function() {
                    crop.result('base64').then(function(dataImg) {
                        var data = [{ image: dataImg }, { name: 'myimgage.jpg' }];
                        // use ajax to send data to php
                        //console.log(dataImg);
                        $('#img-upload').css({
                            'background-image': "url("+ dataImg +")",
                            'background-size': 'cover'
                        });
                        user.foto = dataImg;
                        //console.log(dataImg);
                        $('#img-preview-container').hide();
                    });
                });
            }
        },
        error: function(file, errorMessage) {
        },
        removedfile: function(file) {
        },
        complete: function(file) {
        },
    });

    chat.init($('#chat-panel'), {
        full: false
    });

    // radio
    $('.radio').parents('label').wrap("<div class='radio'></div>");
    $('.radio label').addClass('option').append("<div class='border'><div class='inner'></div></div>");

    // checkbox
    $('.checkslider').each( function(){
        $(this).after("<div class='checkslider trail'><div class='checkslider thumb'></div></div>").hide()
    })

});

async function checkNotifications(){
    return $.post("back_notification.php", {
        action: "GET"
    }).done( function(data){
        // console.log(data);
        try{
            data = JSON.parse(data);
        }
        catch(e){
            console.log(e);
        }

        $('#profile-ui #lvl span').html(data.user.lvl);
        user.lvl = data.user.lvl
        var xpneeded = getXpToNextLvl()
        var xp = parseInt(data.user.xp);
        user.xp = data.user.xp
        $('#profile-ui #xp #filled').width(xp/xpneeded*100 + "%");

        $('#currencies #silver span').html(data.user.silver)
        user.silver = data.user.silver

        $('#messages .notification').html(data.messages);
        if (parseInt(data.messages) == 0)
            $('#messages .notification').addClass('empty');
        else
            $('#messages .notification').removeClass('empty');

        var news = parseInt(data.news);
        $('#news .notification').html(news);
        if (news == 0)
            $('#news .notification').addClass('empty');
        else
            $('#news .notification').removeClass('empty');
            
        var newfriends = parseInt(data.friends);
        $('#friends .notification').html(newfriends);
        if (newfriends == 0)
            $('#friends .notification').addClass('empty');
        else
            $('#friends .notification').removeClass('empty');
            
        var grem = parseInt(data.glads.remaining);
        var gobs = parseInt(data.glads.obsolete);
        $('#glads .notification').html(grem + gobs);
        if (grem + gobs == 0)
            $('#glads .notification').addClass('empty');
        else
            $('#glads .notification').removeClass('empty');
        
        let duels = parseInt(data.duels)
        $('#battle .notification').html(duels).addClass('empty')
        $('#battle-container #duel .notification').html(duels).addClass('empty')
        if ($('#battle-container #duel-challenge .table .row').length != duels){
            check_challenges()
        }
        if (duels > 0){
            $('#battle .notification').html(duels).removeClass('empty')
            $('#battle-container #duel .notification').html(duels).removeClass('empty')
        }

        let reports = {
            ranked: parseInt(data.reports.ranked),
            duel: parseInt(data.reports.duel)
        }
        reports.total = reports.ranked + reports.duel
        $('#report .notification').html(reports.total)
        $('#report .notification').addClass('empty');
        $('#report-container #ranked.tab .notification').addClass('empty')
        $('#report-container #duel.tab .notification').addClass('empty')
        if (reports.total > 0){
            $('#report .notification').removeClass('empty');

            if (reports.ranked > 0){
                $('#report-container #ranked.tab .notification').removeClass('empty')
            }
            if (reports.duel > 0){
                $('#report-container #duel.tab .notification').removeClass('empty')
            }
        }
    
    });
}

function afterBattleShow(hash, oldStatus){
    // console.log(oldStatus)
    $('#fog').remove()
    $('body').append(`<div id='fog'>
        <div id='after-battle'>
            <div class='row'>
                <div class='col'>
                    <div class='glad-card-container'></div>
                    <div id='bonus'>
                        <div>Bônus <i class='fas fa-coins silver'></i> (<span id='nbattles'>0</span>/20)</div>
                        <div>Próximo em: <span id='nextbonus'>00:00:00</span></div>
                    </div>
                </div>
                <div class='col'>
                    <h2>Batalha concluída</h2>
                    <div class='row group'>
                        <div class='col'>
                            <span>Seu nível</span>
                            <div id='lvl'><span class='value'></span><span id='plusone' class='hidden'>(+1)</span></div>
                        </div>
                        <div class='col'>
                            <span>Experiência</span>
                            <div id='xp-text'><span id='xp-now'></span><span id='xp-increase'></span>/<span id='xp-total'></span></div>
                            <div id='xp-bar-container'>
                                <div id='xp-bar'><div id='filled'></div></div>
                            </div>
                        </div>
                    </div>
                    <div class='row group'>
                        <div class='col'>
                            <span>Renome</span>
                            <div id='renown-now' class='skip-translation'><span class='svg hidden'>icon/crown.svg</span><span class='value'></span></div>
                            <span id='renown-total'></span>
                        </div>
                        <div class='col'>
                            <span>Prata</span>
                            <div id='silver-now' class='skip-translation'><span class='svg hidden'>icon/coin.svg</span><span class='value'></span></div>
                            <span id='silver-total'></span>
                        </div>
                    </div>
                </div>
            </div>
            <div id='button-container'>
                <button id='code'><i class='fas fa-code'></i><span>EDITAR GLADIADOR</span></button>
                <button id='close'><i class='fas fa-times'></i><span>FECHAR JANELA</span></button>
                <button id='watch'><i class='fas fa-eye'></i><span>VISUALIZAR BATALHA</span></button>
            </div>
        </div>
    </div>`)

    translator.translate($('#after-battle'))

    $('#fog #after-battle span.svg').each( function() {
        load_svg($(this))
    })

    post("back_notification.php", {
        action: "SUMMARY",
        hash: hash
    }).then( data => {
        // console.log(data)

        $('#fog #after-battle #lvl .value').html(data.lvl)

        let xpincrease = data.xp - oldStatus.xp.value
        if (oldStatus.lvl != data.lvl){
            $('#fog #after-battle #lvl #plusone').removeClass('hidden')
            xpincrease = (parseFloat(data.xp) + parseFloat(oldStatus.xp.total) - parseFloat(oldStatus.xp.value)).toFixed(0)
        }

        let time = 1500
        let steps = 100

        new valueAnimator({
            time: time,
            steps: steps,
            start: 0,
            end: xpincrease,
            onStep: data => {
                if (data != 0){
                    $('#fog #after-battle #xp-increase').html(`(+${parseInt(data)})`)
                }
            }
        }).run()

        new valueAnimator({
            time: time,
            steps: steps,
            start: oldStatus.xp.value,
            end: data.xp,
            onStep: data => {
                $('#fog #after-battle #xp-now').html(parseInt(data))
            }
        }).run()

        new valueAnimator({
            time: time,
            steps: steps,
            start: oldStatus.xp.value / oldStatus.xp.total * 100,
            end: data.xp / getXpToNextLvl() * 100,
            onStep: data => {
                $('#fog #after-battle #xp-bar #filled').css('width', `${data}%`)
            }
        }).run()
        $('#fog #after-battle #xp-total').html(parseInt(getXpToNextLvl()))

        new valueAnimator({
            time: time,
            steps: steps,
            start: 0,
            end: data.silver - oldStatus.silver,
            onStep: data => {
                $('#fog #after-battle #silver-now .value').html(`+${parseInt(data)}`)
            }
        }).run()

        new valueAnimator({
            time: time,
            steps: steps,
            start: oldStatus.silver,
            end: data.silver,
            onStep: data => {
                $('#fog #after-battle #silver-total').html(data.toFixed(0))
            }
        }).run()

        let mmrdiff = parseInt(data.glad.mmr) - parseInt(oldStatus.mmr)
        if (mmrdiff > 0){
            $('#fog #after-battle #renown-now .value').addClass('green')
        }
        else if (mmrdiff < 0){
            $('#fog #after-battle #renown-now .value').addClass('red')
        }

        new valueAnimator({
            time: time,
            steps: steps,
            start: 0,
            end: mmrdiff,
            onStep: data => {
                data = mmrdiff > 0 ? `+${parseInt(data)}` : parseInt(data)
                $('#fog #after-battle #renown-now .value').html(data)
            }
        }).run()

        new valueAnimator({
            time: time,
            steps: steps,
            start: oldStatus.mmr,
            end: data.glad.mmr,
            onStep: data => {
                $('#fog #after-battle #renown-total').html(parseInt(data))
            }
        }).run()

        gladCard.load($('#fog #after-battle .glad-card-container'), { customLoad: [data.glad]})

        $('#fog #after-battle #nbattles').text(20 - data.battles.total)
        if (data.battles.total == 20){
            $('#fog #after-battle #nbattles').addClass('red')
        }

        timeCounter($('#fog #after-battle #nextbonus'), data.battles.next)

        $('#fog #after-battle #code').click( () => {
            window.open(`glad-${data.glad.id}`)
        })
    })

    $('#fog #after-battle #close').click( () => {
        $('#fog').remove()
    })

    $('#fog #after-battle #watch').click( () => {
        window.open(`play/${hash}`)
    })
}

function timeCounter(obj, time){
    tick()
    function tick(){
        setTimeout( function() {
            let m = parseInt(parseInt(time) / 60)
            let s = parseInt(time) % 60
            let h = parseInt(m / 60)
            m = m % 60
        
            if (h < 10){
                h = `0${h}`
            }
            if (m < 10){
                m = `0${m}`
            }
            if (s < 10){
                s = `0${s}`
            }

            time--

            if (time > 0 && obj.length){
                obj.text(`${h}:${m}:${s}`)
                tick()
            }
        }, 1000)
    }
}

class valueAnimator{
    constructor(args){
        this.time = args.time ? args.time : 1000
        this.steps = args.steps ? args.steps : 100
        this.start = args.start ? parseFloat(args.start) : 0
        this.end = args.end ? parseFloat(args.end) : 0
        this.value = this.start
        
        this.onStep = args.onStep ? args.onStep : null
    }

    run(){
        return new Promise( (resolve,reject) => {
            let interval = this.time / this.steps
            let valueStep = (this.end - this.start) / this.steps

            tick(this, interval, valueStep)
            function tick(animator, interval, valueStep){
                let now = new Date()
                setTimeout( () => {
                    animator.value += valueStep
        
                    if (animator.onStep){
                        animator.onStep(animator.value)
                    }

                    if ((animator.value < animator.end && animator.start < animator.end) || (animator.value > animator.end && animator.start > animator.end)){
                        tick(animator, interval, valueStep)
                    }
                    else{
                        resolve(true)
                    }
                }, interval - (new Date() - now))
            }
        })
    }
}



async function preBattleShow(glads){
    //console.log(glads);
    $('#fog').remove();
    $('body').append("<div id='fog'><div id='pre-battle-show'><div class='glad-card-container'></div></div></div>");
    $('#fog').hide();

    gladCard.load($('#pre-battle-show .glad-card-container'), {
        master: true,
        customLoad: [{
            skin: glads[i].skin,
            name: glads[i].name,
            vstr: glads[i].vstr,
            vagi: glads[i].vagi,
            vint: glads[i].vint,
            user: glads[i].user
        }]
    }).then( () => {
        $('#pre-battle-show').append("<div id='tips'><span></span></div><div id='progress'></div>");
        $('#pre-battle-show #tips').html(tipArray[parseInt(Math.random() * tipArray.length)]);
        $('#fog').fadeIn();
    })
    
    var timeElapsed = 0;
    var preBattleInt = setInterval( function(){
        var buttonWidth = $('#battle-container #match-find').width();
        var barWidth = $('#battle-container #match-find #bar').width();
        var progress = barWidth / buttonWidth;
        var size = $('#pre-battle-show').height() * progress;
        $('#pre-battle-show #progress').css({
            'height': size,
            'margin-top': -size
        });
        if (progress >= 1)
            clearInterval(preBattleInt);
        
        var tipTime = 10; 
        if ((timeElapsed / 100) % tipTime == 0){
            var i = parseInt(Math.random() * tipArray.length);
            $('#pre-battle-show #tips').html(tipArray[i]);
        }
        timeElapsed++;
        
    }, 10);
    return preBattleInt;
}


function last_active_string(min){
    min = parseInt(min);
    var hour = parseInt(min/60);
    min = min%60;
    var day = parseInt(hour/24);
    hour = hour%24;
    var month = parseInt(day/30);
    day = day%30;
    
    if (month > 0)
        return month +" "+ translator.getTranslated("meses", false);
    else if (day > 0)
        return day +" "+ translator.getTranslated("dias", false);
    else if (hour > 0)
        return hour +" "+ translator.getTranslated("horas", false);
    else
        return min +" "+ translator.getTranslated("minutos", false);
}

function getMessageTime(msgTime, args){
    var short = false;
    var month_full = false;
    if (args){
        if (args.short)
            short = true;
        if (args.month_full)
            month_full = true;
    } 

    if (short){
        var now = new Date();
        msgTime = new Date(msgTime);
        
        var secNow = Math.round(now.getTime() / 1000);
        var secMsg = Math.round(msgTime.getTime() / 1000);
        
        var diff = (secNow - secMsg) / 60;
        return last_active_string(diff);
    }
    else{
        var months = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"
        ];
        if (!month_full){
            for (let i in months)
                months[i] = months[i].toLowerCase().slice(0,3);
        }

        let t = new Date(msgTime);
        var string = t.getDate() +' de '+ months[t.getMonth()] +' de '+ t.getFullYear() +' às '+ ('0'+t.getHours()).slice(-2) +':'+ ('0'+t.getMinutes()).slice(-2);
        return string;
    }
}

async function check_challenges(){
    let data = await post("back_duel.php",{
        action: "GET"
    })
    // console.log(data);

    if (data.status == "SUCCESS"){
        data = data.duels;

        $('#duel-challenge').addClass('hidden');
        if (data.length >= 1)
            $('#duel-challenge').removeClass('hidden');

        $('#duel-challenge .table').html("");
        for (var i in data){
            var nick = data[i].nick;
            var time = data[i].time;
            var lvl = data[i].lvl;
            var picture = data[i].picture;
            $('#duel-challenge .table').append(`<div class='row'>
                <div class='cell lvl-container'>
                    <img src='res/star.png' title='Nível'><span>${lvl}</span>
                </div>
                <div class='cell image-container'><img src='${picture}'></div>
                <div class='cell user'>${nick}</div>
                <div class='cell time' title='${getMessageTime(time)}'>${getMessageTime(time, { short: true })}</div>
                <div class='button-container'>
                    <div class='accept' title='Aceitar desafio'></div>
                    <div class='refuse' title='Recusar desafio'></div>
                </div>
            </div>`);
            $('#duel-challenge .table .row').last().data('id', data[i].id);
        }

        $('#duel-challenge .table .refuse').click( function(){
            var row = $(this).parents('.row');
            var id = row.data('id');
            $.post("back_duel.php",{
                action: "DELETE",
                id: id,
            }).done( function(data){
                //console.log(data);
                data = JSON.parse(data);
                if (data.status == "OK"){
                    new Message({ message: "Desafio recusado" }).show();
                    row.remove();
                    if ($('#duel-challenge .table .row').length == 0)
                        $('#duel-challenge').addClass('hidden');
                }
            });
        })

        $('#duel-challenge .table .accept').click( function(){
            var row = $(this).parents('.row');
            var nick = row.find('.user').html();
            var id = row.data('id');
    
            var box = "<div id='fog'><div id='duel-box'><div id='title'>Escolha o gladiador que duelará contra <span class='highlight'>"+ nick +"</span> em nome da sua honra</div><div class='glad-card-container'></div><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='duel' class='button' disabled>DUELAR</button></div></div></div>";
            $('body').append(box);
    
            gladCard.load($('#fog .glad-card-container'), {
                clickHandler: function(){
                    if (!$(this).hasClass('old')){
                        $('#fog #btn-glad-open').removeAttr('disabled');
                        $('#fog .glad-preview').removeClass('selected');
                        $(this).addClass('selected');
                        $('#duel-box #duel').removeAttr('disabled');
                    }
                },
                dblClickHandler: function(){
                    if ($('#fog .glad-card-container .selected').length)
                        $('#fog #duel-box #duel').click();
                }
            });

            $('#fog #duel-box #duel').click( function(){
                var myglad = $('#fog .glad-preview.selected').data('id');
                var progbtn = new ProgressButton($(this), ["Executando batalha...","Aguardando resposta do servidor"]);
                runSimulation({
                    duel: id,
                    glads: myglad,
                    origin: "duel"
                }).then( function(data){
                    progbtn.kill();
                    $('#fog').remove();
                    var log = data;
                    new Message({ message: "Duelo concluído. Clique para visualizar a batalha." }).show().click('ok', function(){
                        window.open(`play/${log}`)
                    })
                    $('#battle').click();
                });
            });

            $('#fog #duel-box #cancel').click( function(){
                $('#fog').remove();
            });

        });
    }
}

function getXpToNextLvl(){
    return (parseInt(user.lvl) * 1.9 + 1) * 130;
}

function load_svg(e){
    $.get(e.html(), null, null, 'text').then( data => e.removeClass('hidden').html(data))
}
