var count_refresh = 0;
var hash, round;

$(document).ready( function() {
    hash = $('#hash').html();
    round = $('#round').html();
    $('#hash, #round').remove();

    $.post("back_tournament_run.php", {
        action: "GET",
        hash: hash,
        round: round
    }).done( function(data){
        //console.log(data);
        data = JSON.parse(data);

        if (data.status == "REDIRECT"){
            window.location.href = 'tourn/'+ hash +'/'+ data.round;
        }
        else if (data.status == "NOTFOUND"){
            window.location.href = 'index';
        }
        else if (data.status == "END"){
            $('#content-box').html("<h1>Classificação final</h1><h3>O torneio <span id='tourn-name'>"+ data.tournament +"</span> chegou ao fim e esta foi a classificação obtida pelas equipes</h3><div id='ranking-container'></div><div id='button-container'><button id='back-round' class='button'>RODADA ANTERIOR</button></div>");

            for (let i in data.ranking){
                var c = parseInt(i)+1;
                $('#content-box #ranking-container').append("<div class='team'><div class='ordinal'>"+ c +"º</div><div class='name'>"+ data.ranking[i] +"</div></div>");

                if (c == 1)
                    $('#content-box #ranking-container .team').last().addClass('gold');
                else if (c == 2)
                    $('#content-box #ranking-container .team').last().addClass('silver');
                else if (c == 3)
                    $('#content-box #ranking-container .team').last().addClass('bronze');
            }
            $('#content-box #ranking-container .team.gold .ordinal').html("<img class='icon' src='icon/gold-medal.png'>");
            $('#content-box #ranking-container .team.silver .ordinal').html("<img class='icon' src='icon/silver-medal.png'>");
            $('#content-box #ranking-container .team.bronze .ordinal').html("<img class='icon' src='icon/bronze-medal.png'>");

            $('#content-box #back-round').click( function(){
                window.location.href = 'tourn/'+ hash +'/'+ data.maxround;
            });
        }
        else{
            $('#content-box').html("<h1>Torneio <span id='tourn-name'>"+ data.tournament.name +"</span></h1><h3 id='tourn-desc'>"+ data.tournament.description +"</h3><div id='group-container'></div>");

            var hasteam = false;
            var groupindex = 0;
            var groups = {};
            for (let i in data.teams){
                var groupid = data.teams[i].group;

                if (!(data.teams[i].group in groups)){
                    groups[groupid] = groupindex;
                    $('#content-box #group-container').append("<div class='group'><div class='head'><div class='title'>Grupo "+ parseInt(groupindex+1) +" - <span>Rodada "+ data.tournament.round +"</span></div><div class='icons'><div class='glad'><img src='icon/gladcode_icon.png'></div><div class='time'><img src='icon/clock-icon.png'></div></div></div><div class='teams-container'></div><div class='foot'><button class='button' disabled>Aguardando <span class='number'></span> mestre<span class='plural'>s</span></button></div></div>");
                    $('#content-box #group-container .group').eq(groupindex).data('id', groupid);
                    groupindex++;
                }

                var myteamclass = '';
                var myteam;
                if (data.teams[i].myteam == true){
                    myteamclass = 'myteam';
                    hasteam = true;
                    myteam = data.teams[i].name;
                }

                $('#content-box #group-container .group .teams-container').eq(groups[groupid]).append("<div class='team "+ myteamclass+"'><div class='icon'><i class='material-icons'>hourglass_empty</i></div><div class='name'>"+ data.teams[i].name +"</div><div class='info'><div class='glad'><div class='g-bar'></div><div class='g-bar'></div><div class='g-bar'></div></div><div class='time'>-</div></div></div>");
                $('#content-box #group-container .group').eq(groups[groupid]).find('.team').last().data('id', data.teams[i].id);

            }

            $('#content-box').append("<div id='button-container'><button id='back-round' class='button'>RODADA ANTERIOR</button><button id='prepare' class='button' disabled>PREPARAR-SE</button></div>");

            refresh_round();

            var round = data.tournament.round;
            if (round == 1)
                $('#content-box #back-round').remove();
            else{
                $('#content-box #back-round').click( function(){
                    window.location.href = 'tourn/'+ hash +'/'+ parseInt(round - 1);
                });
            }


            if (hasteam){
                $('#content-box #prepare').html("PREPARAR-SE").removeProp('disabled');

                if (data.locked)
                    $('#content-box #prepare').prop('disabled', true).html("Aguarde a nova rodada");

                var round = data.tournament.round;
                var nick = data.nick;

                $('#content-box #prepare').off().click( function(){
                    $.post("back_tournament_run.php", {
                        action: "GLADS",
                        hash: hash,
                        round: round
                    }).done( function(data){
                        //console.log(data);
                        data = JSON.parse(data);
                       
                        if (data.status == "LOCK"){
                            showMessage("Tarde demais. Seu grupo já encerrou as inscrições");
                            $('#content-box #prepare').prop('disabled', true).html("Aguarde a nova rodada");
                        }
                        else if (data.status == "NOTFOUND"){
                            showMessage("Lista de gladiadores não encontrada");
                        }
                        else{
                            $('body').append("<div id='fog'><div class='float-box'><div id='text'>Olá <span class='highlight'>"+ nick +"</span>, você precisa escolher um gladiador para representar a equipe <span class='highlight'>"+ myteam +"</span> na rodada <span class='highlight'>"+ round +"</span> do torneio</div><div class='glad-card-container'></div><div id='button-container'><button id='cancel' class='button'>AINDA NÃO</button><button id='choose' class='button' disabled>ESCOLHER</button></div></div></div>");

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
                                    else if (data.status == "OLD")
                                        showMessage("Este gladiador está desatualizado e não pode ser escolhido. Para atualizá-lo, altere ele no editor e salve-o");
                                    else if (data.status == "SUCCESS"){
                                        $('#fog').remove();
                                        showMessage("Sua equipe escolheu o gladiador <span class='highlight'>"+ gladname +"</span> para participar desta rodada. Assim que todas equipes escolherem seus representantes a batalha iniciará.");
                                    }
                                });
            
                            });

                            load_glad_cards($('.float-box .glad-card-container'), {
                                customLoad: data.glads,
                                code: true,
                                master: true,
                                dead: true,
                                clickHandler: function(){
                                    if (!$(this).hasClass('dead') && !$(this).hasClass('old')){
                                        $('.float-box #choose').removeProp('disabled');
                                        $('.float-box .glad-preview').removeClass('selected');
                                        $(this).addClass('selected');
                                    }
                                }, 
                                dblClickHandler: function(){
                                    if (!$(this).hasClass('dead') && !$(this).hasClass('old'))
                                        $('.float-box #choose').click();
                                }
                            }).then( function(){
                            });
                        }
                        
                    });

                });
            }
            else
                $('#content-box #prepare').hide();
        }
        
    });
});

function refresh_round(){
    $.post("back_tournament_run.php", {
        action: "REFRESH",
        hash: hash,
        round: round,
    }).done( function(data){
        //console.log(data);
        data = JSON.parse(data);
        
        $('#content-box #group-container .team').each( function(){
            if (!$(this).parents('.group').hasClass('hide-info')){
                var i = $(this).data('id');
                var lasttime = data.teams[i].lasttime;
                if (lasttime == null)
                    lasttime = '-';
                else if (parseFloat(lasttime) >= 1000){
                    lasttime = "<img class='win' src='icon/winner-icon.png'>";
                }
                else
                    lasttime = parseFloat(lasttime).toFixed(1);
        
                var alive = ['', 'one', 'two', 'three'];
                alive = alive[data.teams[i].alive];
        
                var iconready = {icon: 'hourglass_empty', class: ''};
                if (data.teams[i].ready)
                    iconready = {icon: "check", class: 'green'};

                $(this).find('.icon i').html(iconready.icon);
                $(this).find('.icon').attr('class', "icon "+ iconready.class);

                $(this).find('.info .glad').attr('class', 'glad '+ alive);
                $(this).find('.info .time').html(lasttime);
            }
        });

        $('#content-box #group-container .group').each( function(){
            var i = $(this).data('id');

            if (data.groups[i].status == "DONE"){
                $(this).find('.foot .button').removeProp('disabled').html("VISUALIZAR BATALHA");
                $(this).find('.foot .button').click( function(){
                    window.open('play/'+ data.groups[i].hash);
                    $(this).parents('.group').removeClass('hide-info');
                });
            }
            else if (data.groups[i].status == "LOCK" || data.groups[i].status == "RUN"){
                $(this).addClass('hide-info');
                $(this).find('.foot .button').html("Grupo pronto. Organizando batalha...");
                if (data.groups[i].status == "RUN"){
                    runSimulation({
                        tournament: i
                    }).then( function(data){
                        //console.log(data);
                        if (data != "ERROR"){
                            $.post("back_tournament_run.php",{
                                action: "UPDATE",
                                hash: hash
                            }).done( function(data){
                                console.log(data);
                            });
                        }
                        else
                            showMessage("ERROR");
                    });
                }
            }
            else if (data.groups[i].status == "WAIT"){
                $(this).find('.foot .button .number').html(data.groups[i].value);
                if (data.groups[i].value == 1)
                    $(this).find('.foot .button').addClass('one');
            }
        });

        if (data.status == "NEXT" || data.status == "END"){
            $('#content-box #prepare').removeProp('disabled').show();

            if (data.status == "END"){
                $('#content-box #prepare').html("CLASSIFICAÇÃO FINAL");
                $('#content-box #prepare').off().click( function(){
                    window.location.href = 'tourn/'+ hash +'/0';
                });
            }
            else{
                $('#content-box #prepare').html("PRÓXIMA RODADA");
                $('#content-box #prepare').off().click( function(){
                    var newround = parseInt(round) + 1;
                    window.location.href = 'tourn/'+ hash +'/'+ newround;
                });
            }
        }

    });

    count_refresh++;
    setTimeout( function(){
        count_refresh--;
        if (count_refresh == 0)
            refresh_round();
    }, 5000);

}

