$(document).ready( function(){
    $('#header-container').addClass('small-profile');
    $('#header-profile').addClass('here');

    fill_assets();
    
    var preferences = ["friend","message","update","duel","tourn"];

    waitLogged().then(user => {
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

        var language = $('#profile-panel #language select');
        language.selectmenu().val(user.language).selectmenu('refresh');


        checkNotifications();

        socket_ready().then( () => {
            //console.log("socket ready");
            socket.on('profile notification', data =>{
                //console.log("server message");
                checkNotifications();
            });
        });
        
        $.post("back_glad.php", {
            action: "GET"
        }).done( function(data){
            if (JSON.parse(data).length == 0)
            showDialog("Você ainda não possui nenhum gladiador cadastrado. Deseja ir para o editor de gladiadores?",["Sim","Não, obrigado"]).then( function(data){
                if (data == "Sim")
                    window.location.href = "editor";
            });
        });

    });
        
    function checkNotifications(){
        $.post("back_notification.php", {
        }).done( function(data){
            // console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(e){
                console.log(e);
            }

            $('#profile-ui #lvl span').html(data.user.lvl);
            var xpneeded = (parseInt(data.user.lvl) * 4.5 - 2.0) * 130;
            var xp = parseInt(data.user.xp);
            $('#profile-ui #xp #filled').width(xp/xpneeded*100 + "%");
            
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
            
            var duels = parseInt(data.duels);
            $('#battle .notification').html(duels);
            if (duels == 0)
                $('#battle .notification').addClass('empty');
            else
                $('#battle .notification').removeClass('empty');

            var reports = parseInt(data.reports.ranked) + parseInt(data.reports.duel);
            $('#report .notification').html(reports);
            if (reports == 0)
                $('#report .notification').addClass('empty');
            else
                $('#report .notification').removeClass('empty');
        
        });
    }

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
            action: "GET",
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
                            <input value='https://gladcode.tk/post/${data.posts[i].id}' readonly>
                            <button>COPIAR</button>
                        </div>
                    </div>`);

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
                        create_toast("Link da publicação copiado para área de transferência", "success");
                    });
                });
            }
        });
    });

    $('#menu #profile').click( function() {
        $('#nickname .input').val(user.apelido);

        for (var i in preferences){
            if (user.preferences[preferences[i]] == "1")
                $('#email #pref-'+ preferences[i] +' input.checkslider').prop('checked', true);
        }
    });

    $('#profile-panel .button').click( function(){
        $('#profile-panel .button').prop('disabled',true);

        for (var i in preferences){
            if ($('#email #pref-'+ preferences[i] +' input.checkslider').prop('checked'))
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
                showMessage("Informações atualizadas");
                $('#profile-panel .button').removeAttr('disabled');
                user.apelido = $('#nickname .input').val();
                $('#profile-ui #nickname').html(user.apelido);
                $('#profile-ui #picture img').attr('src',user.foto);
            }
            else if (data.status == "EXISTS"){
                showMessage("Outro usuário já escolheu este nome").then( function(){
                    $('#nickname .input').focus().select();
                });
                $('#profile-panel .button').removeAttr('disabled');
                
            }
        });
    });

    $('#menu #glads').click( function() {
        $.post("back_glad.php",{
            action: "GET",
        }).done( function(data){
            //console.log(data);
            data = JSON.parse(data);
            
            var template = $("<div id='template'></div>").load("glad-card-template.html", function(){
                $('#glads-container .glad-preview').remove();
                if (data.length > 0)
                    $('#menu #battle').removeClass('disabled');
                for (var i in data){
                    $('#glads-container .glad-card-container').append("<div class='glad-preview'></div>");
                }
                $('#glads-container .glad-card-container .glad-preview').html(template);
                for (var i in data){
                    setGladImage($('#glads-container'), i, data[i].skin);
                    $('#glads-container .glad-preview .info .glad span').eq(i).html(data[i].name);
                    $('#glads-container .glad-preview .info .attr .str span').eq(i).html(data[i].vstr);
                    $('#glads-container .glad-preview .info .attr .agi span').eq(i).html(data[i].vagi);
                    $('#glads-container .glad-preview .info .attr .int span').eq(i).html(data[i].vint);
                    $('#glads-container .glad-preview').eq(i).data('id',data[i].id);
                    $('#glads-container .glad-preview').eq(i).data('code',data[i].code);
                    $('#glads-container .glad-preview').eq(i).data('blocks',data[i].blocks);
                    if(data[i].oldversion){
                        $('#glads-container .glad-preview').eq(i).addClass('old');
                        $('#glads-container .glad-preview .code .button').eq(i).html("{'atualizar'}");
                    }
                    $('#glads-container .glad-preview .delete').eq(i).click( function(){
                        var card = $(this).parents('.glad-preview');
                        showDialog(
                            "Deseja excluir o gladiador <span class='highlight'>"+ card.find('.glad span').html() +"</span>?",
                            ["Sim","Não"])
                        .then( function(data){
                            if (data == "Sim"){
                                card.fadeOut(function(){
                                    card.remove();
                                });
                                $.post("back_glad.php",{
                                    action: "DELETE",
                                    id: card.data('id')
                                }).done( function(data){
                                    //console.log(data);
                                    $('#glads-container .glad-preview').last().after("<div class='glad-add'><div class='image'></div><div class='info'>Clique para criar um novo gladiador</div></div>");
                                    $('#glads-container .glad-add').first().click( function(){
                                        window.location.href = "newglad";
                                    });
                                });
                            }
                        });
                        //console.log(card.data('id'));
                    });
                    $('#glads-container .glad-preview .code .button').eq(i).click( function(){
                        var card = $(this).parents('.glad-preview');
                        if ($(this).parents('.glad-preview').hasClass('old')){
                            var name = $(this).parents('.info').find('.glad span').html();
                            showDialog("A simulação da gladCode foi atualizada, e o código do gladiador <span class='highlight'>"+ name +"</span> precisa ser testado e salvo novamente para que ele volte a participar das batalhas. Clique em <span class='highlight'>OK</span> para abrir o editor",["Cancelar","OK"]).then( function(data){
                                if (data == "OK")
                                    window.open("glad-"+ card.data('id'));
                            });
                        }
                        else{
                            if (card.data('blocks')){
                                let xml = decodeHTML(card.data('blocks'))
                                $('body').append("<div id='fog'><div id='code-box'><div class='close'>X</div><div id='code-ws'></div><div id='button-container'><button id='editor' class='button'>Abrir no editor</button></div></div></div>");
    
                                // console.log(xml)
                                let ws = Blockly.inject('code-ws', {
                                    scrollbars: true,
                                    readOnly: true
                                });
                        
                                xmlDom = Blockly.Xml.textToDom(xml);
                                Blockly.Xml.domToWorkspace(xmlDom, ws);
                            }
                            else{
                                var code = card.data('code');
                                //console.log(code);

                                let language = "c";
                                if (code.indexOf("def loop():") != -1)
                                    language = "python";
                            

                                $('body').append(`<div id='fog'><div id='code-box'><div class='close'>X</div><pre class='line-numbers language-${language}'><code class='language-${language}'>${code}</code></pre><div id='button-container'><button id='editor' class='button'>Abrir no editor</button></div></div></div>`);
                                Prism.highlightElement($('code')[0]);
                            }
    
                            $('#fog').click( function(){
                                $(this).remove();
                            });
                            $('#code-box').click( function(e){
                                e.stopPropagation();
                            });
                            $('#code-box .close').click( function(e){
                                $('#fog').click();
                            });
                            $('#editor').click( function(){
                                window.open("glad-"+ card.data('id'));
                                $('#fog').click();
                            });
                        }
                    });
                    
                }
            });
            //console.log(user.lvl);
            var initglads = 1;
            var gladsinterval = 10;
            var maxglads = 6;
            $('#glads-container .glad-add').remove();
            for (var i = data.length ; i < maxglads ; i++){
                $('#glads-container .glad-card-container').append("<div class='glad-add'><div class='image'></div><div class='info'></div></div>");
                if (i < initglads + Math.floor(user.lvl/gladsinterval)){
                    $('#glads-container .glad-add .info').last().html("Clique para criar um novo gladiador");
                    $('#glads-container .glad-add').last().click( function(){
                        window.location.href = "newglad";
                    });
                }
                else{
                    var lvl = (i - initglads + 1)*gladsinterval;
                    $('#glads-container .glad-add .info').last().html("Atinja o nível "+ lvl +" de mestre para desbloquear este gladiador");
                    $('#glads-container .glad-add').last().addClass('inactive');
                }
            }
        });
    });
    
    $('#menu #battle').click( function() {

        $('#match-find').prop('disabled',true);
        if (!$(this).hasClass('disabled')){
            $.post("back_glad.php",{
                action: "GET",
            }).done( function(data){
                //console.log(data);
                data = JSON.parse(data);

                var template = $("<div id='template'></div>").load("glad-card-template.html", function(){
                    $('#battle-container .glad-preview').remove();
                    for (var i in data){
                        $('#battle-container .glad-card-container').append("<div class='glad-preview'></div>");
                    }
                    $('#battle-container .glad-card-container .glad-preview').html(template);
                    for (var i in data){
                        setGladImage($('#battle-container'), i, data[i].skin);
                        $('#battle-container .glad-preview .info .glad span').eq(i).html(data[i].name);
                        $('#battle-container .glad-preview .info .attr .str span').eq(i).html(data[i].vstr);
                        $('#battle-container .glad-preview .info .attr .agi span').eq(i).html(data[i].vagi);
                        $('#battle-container .glad-preview .info .attr .int span').eq(i).html(data[i].vint);
                        $('#battle-container .glad-preview').eq(i).data('id',data[i].id);
                        $('#battle-container .glad-preview').eq(i).data('code',data[i].code);
                        $('#battle-container .glad-preview').eq(i).data('name',data[i].name);
                        $('#battle-container .glad-preview').eq(i).data('skin',data[i].skin);
                        $('#battle-container .glad-preview').eq(i).data('user',data[i].user);
                        $('#battle-container .glad-preview').eq(i).data('vstr',data[i].vstr);
                        $('#battle-container .glad-preview').eq(i).data('vagi',data[i].vagi);
                        $('#battle-container .glad-preview').eq(i).data('vint',data[i].vint);
                        $('#battle-container .glad-preview').eq(i).data('mmr',data[i].mmr);
                        $('#battle-container .glad-preview .info .glad').eq(i).after("<div class='row mmr' title='Renome'><span>"+ parseInt(data[i].mmr) +"</span><img src='icon/winner-icon.png'></div>");
                        if(data[i].oldversion)
                            $('#battle-container .glad-preview').eq(i).addClass('old');
                    }
                    $('.glad-preview .delete').remove();
                    $('.glad-preview .code').remove();
                    
                    $('#battle-container .glad-preview').click( function(){
                        var card = $(this);
                        if (!$(this).hasClass('old')){
                            $('#battle-container .glad-preview').removeClass('selected');
                            $(this).addClass('selected');
                            $('#match-find').removeAttr('disabled');
                        }
                        else{
                            showDialog("Este gladiador precisa ser atualizado. Deseja abri-lo no editor?", ['Sim', 'Não']).then( function(data){
                                if (data == 'Sim')
                                window.open(`glad-${card.data('id')}`);
                            });
                        }
                    });
                });
            });

        }

        $.post("back_duel.php",{
            action: "GET"
        })
        .done( function(data) {
            //console.log(data);
            data = JSON.parse(data);
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
                        showMessage("Desafio recusado");
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
        
                load_glad_cards($('#fog .glad-card-container'), {
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
                    var progbtn = new progressButton($(this), ["Executando batalha...","Aguardando resposta do servidor"]);
                    runSimulation({
                        duel: id,
                        glads: myglad,
                    }).then( function(data){
                        progbtn.kill();
                        $('#fog').remove();
                        var log = data;
                        showMessage("Duelo concluído. Clique para visualizar a batalha.").then( function(){
                            window.open("play/"+ log);
                        });
                        $('#battle').click();
                    });
                });

                $('#fog #duel-box #cancel').click( function(){
                    $('#fog').remove();
                });

            });
        });
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

    $('#panel #battle-mode #tourn.button').click( function(){
        $('#panel #battle-container .wrapper').hide();
        var duel = $('#panel #battle-container #tourn.wrapper');
        if (duel.css('display') == 'none')
            duel.fadeIn();

        refresh_tourn_list();

        if (socket){
            socket.emit('tournament list join', {});
        }        
    });

    $('#menu #report').click( function() {
        reload_reports();
    });

    $('#report-container .tab').click( function(){
        $('#report-container .tab').removeClass('selected');
        $(this).addClass('selected');

        reload_reports();
    });
    var reportpage = {
        battles: 1,
        duels: 1,
        favorites: 1
    };
    $('#report-container #prev').click( function(){
        if ($('#bhist-container .tab.selected').html() == "Batalhas")
            reportpage.battles--;
        else if ($('#bhist-container .tab.selected').html() == "Duelos")
            reportpage.duels--;

        reload_reports();
    });
    $('#report-container #next').click( function(){
        if ($('#bhist-container .tab.selected').html() == "Batalhas")
            reportpage.battles++;
        else if ($('#bhist-container .tab.selected').html() == "Duelos")
            reportpage.duels++;

        reload_reports();
    });

    function reload_reports(){
        var pstart, pend, ptotal;
        if ($('#bhist-container .tab.selected').html() == "Batalhas"){
            $.post("back_report.php", {
                action: "GET",
                read: true,
                page: reportpage.battles,
            }).done( function(data){
                // console.log(data);
                var e;
                try{
                    data = JSON.parse(data);
                }
                catch(error){
                    //console.log(error);
                    e = error;
                }
                if (e || data.length == 0)
                    $('#bhist-container .table').hide();
                else{
                    pstart = data.start;
                    pend = data.end;
                    ptotal = data.total;
                    data = data.reports;

                    bind_report_pages();

                    if (ptotal == 0)
                        $('#bhist-container .table').html("<p>Você ainda não possui batalhas</p>");
                    else{
                        $('#bhist-container .table').html("<div class='row head'><div class='cell'>Gladiador</div><div class='cell reward'>Renome</div><div class='cell time'>Data</div></div>");
                        for (var i in data){
                            var star = {class: "far", title: "Guardar nos favoritos"};
                            if (data[i].favorite)
                                star = {class: "fas", title: "Tirar dos favoritos"};

                            $('#bhist-container .table').append(`<div class='row'>
                            <div class='cell favorite' title='${star.title}'><i class='${star.class} fa-star'></i></div>
                            <div class='cell glad'>${data[i].gladiator}</div>
                            <div class='cell reward'>${parseFloat(data[i].reward).toFixed(1)}</div>
                            <div class='cell time' title='${getMessageTime(data[i].time)}'>${getMessageTime(data[i].time, { short: true })}</div>
                            <div class='playback' title='Visualizar batalha'>
                                <a target='_blank' href='play/${data[i].hash}'><img src='icon/eye.png'></a>
                            </div></div>`);
                            $('#bhist-container .favorite').last().data('id', data[i].id);
                            
                            if (data[i].isread == "0")
                                $('#bhist-container .table .row').last().addClass('unread');
                            else
                                $('#bhist-container .table .row').last().removeClass('unread');
                            if (data[i].reward < 0)
                                $('#bhist-container .table .reward').last().addClass('red');
                            else if (data[i].reward > 0){
                                var obj = $('#bhist-container .table .reward').last();
                                obj.addClass('green');
                                obj.html("+"+ obj.html());
                            }
                                
                        }
                        
                        $('#bhist-container .favorite').click( function(){
                            var id = $(this).data('id');
                            if ($(this).find('i').hasClass('fas')){
                                $(this).find('i').removeClass('fas').addClass('far').attr('title', "Guardar nos favoritos");
                                post_favorite(id, false, '');
                            }
                            else{
                                var star = $(this);
                                showInput("Informe um comentário sobre esta batalha").then( function(data){
                                    if (data !== false){
                                        star.find('i').removeClass('far').addClass('fas').attr('title', "Tirar dos favoritos");
                                        post_favorite(id, true, data);
                                    }
                                });
                            }

                            function post_favorite(id, fav, comment){
                                $.post("back_report.php", {
                                    action: "FAVORITE",
                                    favorite: fav,
                                    id: id,
                                    comment: comment
                                }).done( function(data){
                                    // console.log(data);
                                });
                            }
                        });
                    }
                }
            });
        }
        else if ($('#bhist-container .tab.selected').html() == "Duelos"){
            $.post("back_duel.php", {
                action: "REPORT",
                page: reportpage.duels,
            }).done( function(data){
                //console.log(data);
                var e;
                try{
                    data = JSON.parse(data);
                }
                catch(error){
                    console.log(error);
                    e = error;
                }
                if (e || data.length == 0)
                    $('#bhist-container').hide();
                else{
                    pstart = data.start;
                    pend = data.end;
                    ptotal = data.total;

                    bind_report_pages();

                    if (ptotal == 0)
                        $('#bhist-container .table').html("<p>Você ainda não possui duelos</p>");
                    else{
                        data = data.output;
                        $('#bhist-container .table').html("<div class='row head'><div class='cell'>Gladiador</div><div class='cell'>Oponente</div><div class='cell'>Mestre</div><div class='cell time'>Data</div></div>");
                        for (var i in data){
                            $('#bhist-container .table').append(`<div class='row'>
                                <div class='cell glad'>${data[i].glad}</div>
                                <div class='cell enemy'>${data[i].enemy}</div>
                                <div class='cell'>${data[i].user}</div>
                                <div class='cell time' title='${getMessageTime(data[i].time)}'>${getMessageTime(data[i].time, { short: true })}</div>
                                <div class='playback' title='Visualizar batalha'>
                                    <a target='_blank' href='play/${data[i].log}'><img src='icon/eye.png'></a>
                                </div>
                            </div>`);							

                            if (data[i].isread == "0")
                                $('#bhist-container .table .row').last().addClass('unread');
                            else
                                $('#bhist-container .table .row').last().removeClass('unread');

                            if (data[i].glad == null)
                                $('#bhist-container .table .row .glad').last().html("Gladiador Esquecido").addClass('forgotten');
                            if (data[i].enemy == null){
                                if (data[i].log == null){
                                    $('#bhist-container .table .row .enemy').last().html("???");
                                    $('#bhist-container .table .row').last().find('.playback').remove();
                                    $('#bhist-container .table .row').last().append("<div class='remove' title='Cancelar desafio'>X</div>")
                                    $('#bhist-container .table .row').last().find('.remove').data('id',data[i].id).click(function(){
                                        var id = $(this).data('id');
                                        $.post("back_duel.php",{
                                            action: "DELETE",
                                            id: id,
                                        }).done(function(data){
                                            showMessage("Desafio cancelado");
                                            reload_reports();
                                        });
                                    });
                                }
                                else
                                    $('#bhist-container .table .row .enemy').last().html("Gladiador Esquecido").addClass('forgotten');
                            }
                            
                        }
                    }

                }
            });

        }
        else if ($('#bhist-container .tab.selected').html() == "Favoritos"){
            $.post("back_report.php", {
                action: "GET",
                favorites: true
            }).done( function(data){
                // console.log(data);
                var e;
                try{
                    data = JSON.parse(data);
                }
                catch(error){
                    //console.log(error);
                    e = error;
                }
                if (e || data.length == 0)
                    $('#bhist-container .table').hide();
                else{
                    pstart = data.start;
                    pend = data.end;
                    ptotal = data.total;
                    data = data.reports;

                    bind_report_pages();

                    if (ptotal == 0)
                        $('#bhist-container .table').html("<p>Selecione suas batalhas favoritas para aparecer nesta tabela. Assim você também as protege de serem apagadas quando ficarem muito antigas</p>");
                    else{
                        $('#bhist-container .table').html(`<div class='row head'>
                            <div class='cell'>Gladiador</div>
                            <div class='cell comment'>Comentário</div>
                            <div class='cell time'>Data</div>
                        </div>`);
                        for (var i in data){
                            var star = {class: "far", title: "Guardar nos favoritos"};
                            if (data[i].favorite)
                                star = {class: "fas", title: "Tirar dos favoritos"};

                            $('#bhist-container .table').append(`<div class='row'>
                                <div class='cell favorite' title='${star.title}'><i class='${star.class} fa-star'></i></div>
                                <div class='cell glad'>${data[i].gladiator}</div>
                                <div class='cell comment'>${data[i].comment}</div>
                                <div class='cell time' title='${getMessageTime(data[i].time)}'>${getMessageTime(data[i].time, { short: true })}</div>
                                <div class='playback' title='Visualizar batalha'>
                                    <a target='_blank' href='play/${data[i].hash}'><img src='icon/eye.png'></a>
                                </div>
                            </div>`);
                            $('#bhist-container .favorite').last().data('id', data[i].id);

                            if (data[i].isread == "0")
                                $('#bhist-container .table .row').last().addClass('unread');
                            else
                                $('#bhist-container .table .row').last().removeClass('unread');
                            if (data[i].reward < 0)
                                $('#bhist-container .table .reward').last().addClass('red');
                            else if (data[i].reward > 0){
                                var obj = $('#bhist-container .table .reward').last();
                                obj.addClass('green');
                                obj.html("+"+ obj.html());
                            }
                                
                        }
                        
                        $('#bhist-container .favorite').click( function(){
                            var id = $(this).data('id');
                            showDialog("Remover esta batalha dos favoritos?",["Sim","Não"]).then( data => {
                                if (data == "Sim"){
                                    $(this).parent().remove();
                                    $.post("back_report.php", {
                                        action: "FAVORITE",
                                        favorite: false,
                                        id: id,
                                        comment: ''
                                    }).done( function(data){
                                        // console.log(data);
                                    });
                                }
                            });
                        });
                    }
                }
            });
        }

        function bind_report_pages(){
            $('#report-container #page-title span').eq(0).html(pstart);
            $('#report-container #page-title span').eq(1).html(pend);
            $('#report-container #page-title span').eq(2).html(ptotal);
            
            if (pstart == 1)
                $('#report-container #prev').prop('disabled',true);
            else
                $('#report-container #prev').removeAttr('disabled');
                
            if (pend == ptotal)
                $('#report-container #next').prop('disabled',true);
            else
                $('#report-container #next').removeAttr('disabled');
        }

    }

    $.post("back_glad.php",{
        action: "GET",
    }).done( function(data){
        if (JSON.parse(data).length == 0)
            $('#menu #battle').addClass('disabled');
    });

    $('#battle-container #match-find').click( function() {
        var progbtn = new progressButton($(this), ["Executando batalha...","Aguardando resposta do servidor"]);
        
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
        };
        $.post("back_match.php", {
            action: "MATCH",
            id: thisglad.id
        }).done( function(data){
            var glads = JSON.parse(data);
            glads.push(thisglad);
            //console.log(glads);
            var preBattleInt = preBattleShow(glads);
            
            runSimulation({
                ranked: true,
            }).then( function(data){
                //console.log(data);
                if (data == "ERROR"){
                    progbtn.kill();
                    window.location.reload();
                }
                else{
                    var hash = data;

                    save_stats(hash);

                    $('#pre-battle-show #tips').html(`<span>Batalha concluída. Escolha uma opção:</span>
                        <i id='view' title='Visualizar batalha' class='fas fa-eye'></i>
                        <i id='close' title='Fechar janela' class='fas fa-times'></i>`);
                    clearInterval(preBattleInt);
                    $('#pre-battle-show').addClass('complete');

                    $('#pre-battle-show i').click( function(){
                        if ($(this).attr('id') == 'view')
                            window.open("play/"+ hash);
                        
                        $('#fog').remove();
                        $('#menu #battle').click();
                    });

                    progbtn.kill();
                }
            });
            
        });
        
    });

    var rankpage = 1;
    var ranksearch = "";
    $('#ranking-container #prev').click( function(){
        rankpage--;
        reload_ranking();
    });
    $('#ranking-container #next').click( function(){
        rankpage++;
        reload_ranking();
    });
    $('#menu #ranking').click( function() {
        reload_ranking();
    });

    $('#ranking-container #search .input').on('input', function(e){
        ranksearch = $(this).val();
        rankpage = 1;
        reload_ranking();
    });
    
    function reload_ranking(){
        $.post("back_rank.php",{
            page: rankpage,
            search: ranksearch
        })
        .done( function(data){
            //console.log(data);
            try{
                data = JSON.parse(data);
            }
            catch(error){
                console.log(error);
            }
            
            $('#ranking-container .table').html("<div class='row head'><div class='cell position'></div><div class='cell'>Gladiador</div><div class='cell'>Mestre</div><div class='cell mmr'>Renome</div></div>");
            
            var gstart = data.start;
            var gend = data.end;
            var gtotal = data.total;
            rankpage = data.page;
            data = data.glads;
            
            for (var i in data){
                var pos = data[i].rank;
                
                var rowrank = '';
                if (pos == 1)
                    rowrank = 'gold';
                else if (pos == 2)
                    rowrank = 'silver';
                else if (pos == 3)
                    rowrank = 'bronze';
                
                $('#ranking-container .table').append("<div class='row "+ rowrank +"'><div class='cell position'>"+ pos +"º</div><div class='cell'>"+ data[i].glad +"</div><div class='cell'>"+ data[i].user +"</div><div class='cell mmr'><span class='change24'>"+ Math.abs(parseInt(data[i].change24)) +"</span>"+ parseInt(data[i].mmr) +"</div></div>");
                if (user.apelido == data[i].user)
                    $('#ranking-container .table .row').last().addClass('mine');
                if (parseInt(data[i].change24) > 0){
                    $('#ranking-container .table .mmr .change24').last().addClass('green');
                    $('#ranking-container .table .mmr .change24').last().prepend("<img src='icon/arrow-up-green.png'>");
                }
                else if (parseInt(data[i].change24) < 0){
                    $('#ranking-container .table .mmr .change24').last().addClass('red');
                    $('#ranking-container .table .mmr .change24').last().prepend("<img src='icon/arrow-up-green.png'>");
                }
            }
                            
            $('#ranking-container #page-title span').eq(0).html(gstart);
            $('#ranking-container #page-title span').eq(1).html(gend);
            $('#ranking-container #page-title span').eq(2).html(gtotal);
            
            if (gstart == 1)
                $('#ranking-container #prev').prop('disabled',true);
            else
                $('#ranking-container #prev').removeAttr('disabled');
                
            if (gend == gtotal)
                $('#ranking-container #next').prop('disabled',true);
            else
                $('#ranking-container #next').removeAttr('disabled');
        });
    }
    
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
        .done( function(data) {
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
                        <div class='check' title='Aceitar solicitação'></div>
                        <div class='close' title='Recusar solicitação'></div>
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
                        <span class='label'>Última atividade</span>
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
        var button = $('#friend-panel #friends .button-open.open');
        var row = button.parents('.row');
        var id = button.parents('.row').data('id');
        var nick = button.parents('.row').data('nick');
        showDialog("Deseja remover <span class='highlight'>"+ nick +"</span> da sua lista de amigos?",["Sim","Não"]).then( function(data){
            if (data == "Sim"){
                $.post("back_friends.php", {
                    action: "DELETE",
                    user: id
                })
                .done( function(data){
                    //console.log(data);
                    row.remove();
                });
            }
        });
    });
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

        load_glad_cards($('#fog .glad-card-container'), {
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
                    showMessage("Já existe um desafio de duelo contra <span class='highlight'>"+ nick +"</span> usando o gladiador <span class='highlight'>"+ gladname +"</span>.");					
                }
                else if (data.status == "OK"){
                    showMessage("Desafio enviado para <span class='highlight'>"+ nick +"</span>. Assim que uma resposta for dada você será notificado.");
                    
                    $.post("back_sendmail.php",{
                        action: "DUEL",
                        friend: userid,
                    }).done( function(data){
                        //console.log(data);
                    });
                }
                else
                    console.log(data);
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
                        <div class='send-message' title='Enviar mensagem'></div>
                        <div class='add-friend' title='Enviar convite de amizade'></div>
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
                    if (data == "EXISTS")
                        showMessage("O usuário <span class='highlight'>"+ nick +"</span> já esté em sua lista de amigos");
                    else{
                        showMessage("Convite enviado para <span class='highlight'>"+ nick +"</span>");

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
        showTextArea("Mensagem para <span class='highlight'>"+ nick +"</span>:","Olá...",2048).then( function(data){
            if (data){
                var message = data;
                $.post("back_message.php", {
                    action: "SEND",
                    id: userid,
                    message: message
                })
                .done( function(data){
                    //console.log(data);
                    showMessage("Mensagem enviada");
                    
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
                $('.dz-preview').html("<button id='crop-image' class='button'>RECORTAR IMAGEM</button><img src='"+ img.src +"'>");
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

    init_chat($('#chat-panel'), {
        full: false
    });
});

function preBattleShow(glads){
    //console.log(glads);
    $('#fog').remove();
    $('body').append("<div id='fog'><div id='pre-battle-show'><div class='glad-card-container'></div></div></div>");
    $('#fog').hide();
    for (var i in glads){
        $('#pre-battle-show .glad-card-container').append("<div class='glad-preview'></div>");
    }
    var template = $("<div id='template'></div>").load("glad-card-template.html", function(){
        $('#pre-battle-show .glad-card-container .glad-preview').html(template);		
        for (var i in glads){
            setGladImage($('#pre-battle-show'), i, glads[i].skin);
            $('#pre-battle-show .glad-preview .info .glad span').eq(i).html(glads[i].name);
            $('#pre-battle-show .glad-preview .info .glad').eq(i).after("<div class='row user'><span>"+ glads[i].user +"</span></div>");
            $('#pre-battle-show .glad-preview .info .user').eq(i).after("<div class='row mmr'><span>"+ parseInt(glads[i].mmr) +"</span><img src='icon/winner-icon.png'></div>");
            $('#pre-battle-show .glad-preview .info .attr .str span').eq(i).html(glads[i].vstr);
            $('#pre-battle-show .glad-preview .info .attr .agi span').eq(i).html(glads[i].vagi);
            $('#pre-battle-show .glad-preview .info .attr .int span').eq(i).html(glads[i].vint);
        }
        $('#pre-battle-show .glad-preview .delete-container').remove();
        $('#pre-battle-show .glad-preview .row.code').remove();
        $('#pre-battle-show').append("<div id='tips'><span></span></div><div id='progress'></div>");
        $('#pre-battle-show #tips').html(tipArray[parseInt(Math.random() * tipArray.length)]);
        $('#fog').fadeIn();
    });
    
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
        "Uma FIREBALL arremessada em uma área com mais de um inimigo fará todos levarem dano de queimadura"
    ];

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
        return month +" meses";
    else if (day > 0)
        return day +" dias";
    else if (hour > 0)
        return hour +" horas";
    else
        return min +" minutos";
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

        t = new Date(msgTime);
        var string = t.getDate() +' de '+ months[t.getMonth()] +' de '+ t.getFullYear() +' às '+ ('0'+t.getHours()).slice(-2) +':'+ ('0'+t.getMinutes()).slice(-2);
        return string;
    }
}

function validate_skin(selectedArray){
    for (var i in selectedArray){
        if (selectedArray[i].parent == "shape"){
            return true;
        }
    }
    return false;
}