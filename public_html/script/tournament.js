var count_refresh = 0;
var hash;

$(document).ready( function() {
    hash = $('#hash').html();
    $('#hash').remove();

    $.post("back_tournament_run.php", {
        action: "GET",
        hash: hash
    }).done( function(data){
        //console.log(data);
        data = JSON.parse(data);

        if (data.status == "NOTFOUND")
            window.location.href = 'index';
        else{
            $('#content-box').html("<h1>Torneio <span id='tourn-name'>"+ data.tournament.name +"</span></h1><h3 id='tourn-desc'>"+ data.tournament.description +"</h3><div id='group-container'></div>");

            var groupid = 0;
            var groupindex = 1;
            var hasteam = false;
            for (let i in data.teams){
                if (parseInt(data.teams[i].group) != groupid){
                    groupid = parseInt(data.teams[i].group);
                    $('#content-box #group-container .group').last().append("<div class='foot'><button class='button' disabled>Aguardando <span class='number'></span> mestre<span class='plural'>s</span></button></div>");
                    
                    $('#content-box #group-container').append("<div class='group'><div class='head'><div class='title'>Grupo "+ groupindex +" - <span>Rodada "+ data.tournament.round +"</span></div><div class='icons'><div class='glad'><img src='icon/gladcode_icon.png'></div><div class='time'><img src='icon/clock-icon.png'></div></div></div></div>");
                    $('#content-box #group-container .group').last().data('id', groupid);

                    groupindex++;
                }

                var myteamclass = '';
                var myteam;
                if (data.teams[i].myteam == true){
                    myteamclass = 'myteam';
                    hasteam = true;
                    myteam = data.teams[i].name;
                }

                $('#content-box #group-container .group').last().append("<div class='team "+ myteamclass+"'><div class='icon'><i class='material-icons'>hourglass_empty</i></div><div class='name'>"+ data.teams[i].name +"</div><div class='info'><div class='glad'><div class='g-bar'></div><div class='g-bar'></div><div class='g-bar'></div></div><div class='time'>-</div></div></div>");
                $('#content-box #group-container .team').last().data('id', data.teams[i].id);

            }
            $('#content-box #group-container .group').last().append("<div class='foot'><button class='button' disabled>Aguardando <span class='number'></span> mestre<span class='plural'>s</span></button></div>");

            refresh_round();

            if (hasteam){
                $('#content-box').append("<div id='button-container'><button id='prepare' class='button'>PREPARAR-SE</button></div>");

                $('#content-box #prepare').click( function(){
                    $('body').append("<div id='fog'><div class='float-box'><div id='text'>Olá <span class='highlight'>"+ data.nick +"</span>, você precisa escolher um gladiador para representar a equipe <span class='highlight'>"+ myteam +"</span> na rodada <span class='highlight'>"+ data.tournament.round +"</span> do torneio</div><div class='glad-card-container'></div><div id='button-container'><button id='cancel' class='button'>AINDA NÃO</button><button id='choose' class='button' disabled>ESCOLHER</button></div></div></div>");

                    
                    $.post("back_tournament_run.php", {
                        action: "GLADS",
                        hash: hash
                    }).done( function(data){
                        //console.log(JSON.parse(data));
                        data = JSON.parse(data);
                       
                        if (data == "NOTFOUND"){
                            showMessage("Lista de gladiadores não encontrada");
                        }
                        else{
                            load_glad_cards($('.float-box .glad-card-container'), {
                                customLoad: data.glads,
                                code: true,
                                master: true,
                                dead: true,
                                clickHandler: function(){
                                    if (!$(this).hasClass('dead')){
                                        $('.float-box #choose').removeProp('disabled');
                                        $('.float-box .glad-preview').removeClass('selected');
                                        $(this).addClass('selected');
                                    }
                                }, 
                                dblClickHandler: function(){
                                    if (!$(this).hasClass('dead'))
                                        $('.float-box #choose').click();
                                }
                            }).then( function(){
                            });
                        }
                        
                    });
        
                    $('.float-box #cancel').click( function(){
                        $('#fog').remove();
                    });

                    $('.float-box #choose').click( function(){
                        var gladid = $('.float-box .glad-preview.selected').data('id');
                        var gladname = $('.float-box .glad-preview.selected .info .glad span').html();
                        $.post("back_tournament_run.php", {
                            action: "CHOOSE",
                            id: gladid,
                            hash: hash
                        }).done( function(data){
                            //console.log(data);
                            data = JSON.parse(data);

                            if (data.status == "DEAD")
                                showMessage("Este gladiador está gravemente ferido e não poderá mais participar deste torneio");
                            else if (data.status == "SUCCESS"){
                                $('#fog').remove();
                                showMessage("Sua equipe escolheu o gladiador <span class='highlight'>"+ gladname +"</span> para participar desta rodada. Assim que todas equipes escolherem seus representantes a batalha iniciará.");
                            }
                        });

                    });

                });
            }
        }
    });
});

function refresh_round(){
    $.post("back_tournament_run.php", {
        action: "REFRESH",
        hash: hash
    }).done( function(data){
        console.log(data);
        data = JSON.parse(data);
        
        $('#content-box #group-container .team').each( function(){
            var i = $(this).data('id');

            var lasttime = data.teams[i].lasttime;
            if (lasttime == null)
                lasttime = '-';
    
            var alive = ['', 'one', 'two', 'three'];
            alive = alive[data.teams[i].alive];
    
            var iconready = {icon: 'hourglass_empty', class: ''};
            if (data.teams[i].ready)
                iconready = {icon: "check", class: 'green'};

            $(this).find('.icon i').html(iconready.icon);
            $(this).find('.icon').attr('class', "icon "+ iconready.class);

            $(this).find('.info .glad').attr('class', 'glad '+ alive);
            $(this).find('.info .time').html(lasttime);
        });

        $('#content-box #group-container .group').each( function(){
            var i = $(this).data('id');

            if (data.groups[i].status == "DONE"){
                $(this).find('.foot .button').html("VISUALIZAR BATALHA");
                $(this).find('.foot .button').removeProp('disabled');
                $(this).find('.foot .button').click( function(){
                    window.open('play/'+ data.groups[i].hash);
                });
            }
            else if (data.groups[i].status == "LOCK" || data.groups[i].status == "RUN"){
                $(this).find('.foot .button').html("Grupo pronto. Organizando batalha...");
                if (data.groups[i].status == "RUN"){
                    console.log(i);
                    runSimulation({
						tournament: i
					}).then( function(data){
                        console.log(data);
					});
                }
            }
            else if (data.groups[i].status == "WAIT"){
                $(this).find('.foot .button .number').html(data.groups[i].value);
                if (data.groups[i].value == 1)
                    $(this).find('.foot .button').addClass('one');
            }
        });

    });

    count_refresh++;
    setTimeout( function(){
        count_refresh--;
        if (count_refresh == 0)
            refresh_round();
    }, 5000);

}

