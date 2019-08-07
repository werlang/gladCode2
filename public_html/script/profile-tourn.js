var count_refresh_teams = 0, count_refresh_tour_list = 0, count_refresh_glads = 0;
var teamsync = {id: 0, time: 0};

$(document).ready( function(){
	$('#panel #tourn.wrapper #create').click( function() {
		var box = "<div id='fog'><div class='tourn-box'><div id='title'><h2>Criar torneio</h2><div id='public'><label>Público<input type='checkbox' class='checkslider'></label></div></div><input id='name' class='input' placeholder='Identificador do torneio (nome)' maxlength='50'><input type='password' id='pass' class='input' placeholder='senha para ingressar' maxlength='32'><textarea id='desc' class='input' placeholder='Breve descrição...' maxlength='512'></textarea><div id='options'><div id='maxteams'><span>Máximo de equipes</span><input class='input' value='50' maxlength='2'></div><div id='flex-team'><label><input type='checkbox' class='checkslider'>Flex: Mestres podem inscrever mais de um gladiador</label></div></div><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='create' class='button'>CRIAR</button></div></div></div>";
		$('body').append(box);
		create_checkbox($('.tourn-box .checkslider'));
		$('#fog .tourn-box').hide().fadeIn();

		$('.tourn-box #cancel').click( function(){
			$('#fog').remove();
		});
		
		$('.tourn-box #create').click( function(){
			var name = $('.tourn-box #name').val();
			var pass = $('.tourn-box #pass').val();
			var desc = $('.tourn-box #desc').val();
			var max = $('.tourn-box #maxteams input').val();
			var flex = $('.tourn-box #flex-team input').prop('checked');

			$('.tourn-box .input').removeClass('error');
			$('.tourn-box .tip').remove();
			if (name.length < 6){
				$('.tourn-box #name').focus();
				$('.tourn-box #name').addClass('error');
				$('.tourn-box #name').before("<span class='tip'>O identificador precisa ter tamanho 6 ou mais</span>");
			}
			else if (name.match(/[^\w\s]/g)){
				$('.tourn-box #name').focus();
				$('.tourn-box #name').addClass('error');
				$('.tourn-box #name').before("<span class='tip'>O identificador precisa conter somente letras, números ou espaços</span>");
			}
			else if ($('.tourn-box #pass').css('display') != "none" && pass.length == 0){
				$('.tourn-box #pass').focus();
				$('.tourn-box #pass').addClass('error');
				$('.tourn-box #pass').before("<span class='tip'>Digite uma senha, ou torne o torneio público</span>");
			}
			else if (max.match(/[^\d]/g) || max < 2 || max > 50){
				$('.tourn-box #maxteams input').focus();
				$('.tourn-box #maxteams input').addClass('error');
				$('.tourn-box #maxteams input').before("<span class='tip'>Informe um número entre 2 e 50</span>");
			}
			else{
				$.post("back_tournament.php",{
					action: "CREATE",
					name: name,
					pass: pass,
					desc: desc,
					max: max,
					flex: flex
				}).done( function(data){
					if (data != "EXISTS"){
						$('#fog').remove();

						var content = "<p>As equipes deverão entrar com os seguintes dados para se inscrever em seu torneio:</p><div>Identificador: <span>"+ name +"</span></div><div>Senha: <span>"+ pass +"</span></div>";

						if (pass == "")
							content = "<p>As equipes deverão procurar seu torneio na lista de torneios públicos, ou entrar com o seguinte identificador para se inscrever em seu torneio:</p><div>Identificador: <span>"+ name +"</span></div>";

						var box = "<div id='fog'><div id='tourn-message' class='tourn-box'><h2>Torneio registrado</h2>"+ content +"<div id='button-container'><button class='button'>OK</button></div></div></div>";
						$('body').append(box);

						$('#tourn-message .button').click( function(){
							$('#fog').remove();
							refresh_tourn_list();
						});
					}
					else{
						$('.tourn-box #name').focus();
						$('.tourn-box #name').addClass('error');
						$('.tourn-box #name').before("<span class='tip'>Um torneio com este identificador já existe</span>");
					}
				});
			}

		});

		$('.tourn-box #public .checkslider').click( function(){
			$('.tourn-box .input').removeClass('error');
			$('.tourn-box .tip').remove();
			if ($(this).prop('checked'))
				$('.tourn-box #pass').hide().val("");
			else
				$('.tourn-box #pass').show();
		});
	});

	$('#panel #tourn.wrapper #join').click( function() {
		var box = "<div id='fog' class='tourn'><div class='tourn-box'><h2>Ingresso em torneio</h2><p>Informe os dados do torneio que deseja participar</p><input id='name' class='input' placeholder='Identificador do torneio (nome)'><input id='pass' class='input' placeholder='Senha do torneio' type='password'><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='join' class='button'>INGRESSAR</button></div></div></div>";
		$('body').append(box);
		$('.tourn-box #name').focus();
	
		$('.tourn-box #cancel').click( function(){
			$('#fog').remove();
		});
		$('.tourn-box #name, .tourn-box #pass').keyup(function(e){
			if (e.keyCode == 13)
				$('.tourn-box #join').click();
			if (e.keyCode == 27)
				$('#fog').remove();
		});
		$('.tourn-box #join').click( function(){
			var tname = $('.tourn-box #name').val();
			var tpass = $('.tourn-box #pass').val();

			$.post("back_tournament.php",{
				action: "JOIN",
				name: tname,
				pass: tpass
			}).done( function(data){
				//console.log(data);
				data = JSON.parse(data);
				if (data.status == "NOTFOUND"){
					$('.tourn-box #name').focus();
					$('.tourn-box #name, .tourn-box #pass').addClass('error');
					$('.tourn-box .tip').remove();
					$('.tourn-box #name').before("<span class='tip'>Torneio não encontrado</span>");
				}
				else if (data.hash != ''){
					$('.tourn-box #cancel').click();
					window.open('tourn/'+ data.hash);
				}
				else{
					refresh_teams({name: tname, pass: tpass});

					$('.tourn-box').html("<div id='title'><h2>Torneio<span>"+ data.name +"</span></h2><div id='word'>Senha<span>"+ data.pass +"</span></div></div><p>"+ data.description +"</p><h3>Equipes inscritas <span id='count'></span></h3><div class='table'></div><div id='new-container'><button id='new' class='button'>Nova Equipe</button></div><div id='button-container'><button id='delete' class='button' hidden>REMOVER</button><button id='start' class='button' disabled>INICIAR TORNEIO</button><button id='close' class='button'>FECHAR</button></div>");

					if (data.pass == '')
						$('.tourn-box #word').hide();

					$('.tourn-box #close').click( function(){
						$('#fog').remove();
					});

					$('.tourn-box #new').click( function(){
						$('.tourn-box #new').hide().after("<div class='input-button'><input placeholder='Nome da nova equipe' id='name'><button><i class='material-icons'>group_add</i></button></div>");
						$('.tourn-box #name').focus();
						
						$('.tourn-box #name').keyup( function(e){
							if (e.keyCode == 13)
								$('.tourn-box .input-button button').click();
							else if (e.keyCode == 27){
								$('.tourn-box .input-button').remove();
								$('.tourn-box #new').fadeIn();
								$('.tourn-box .tip').remove();
							}
						});

						$('.tourn-box .input-button button').click( function(){
							var name = $('.tourn-box #name').val();
							$('.tourn-box .tip').remove();
							if (name.length < 3){
								$('.tourn-box #name').focus();
								$('.tourn-box .input-button').before("<span class='tip'>Nome muito curto</span>");
							}
							else if ($('.tourn-box .table').html().match(">"+ name +"<")){
								$('.tourn-box #name').focus();
								$('.tourn-box .input-button').before("<span class='tip'>Esta equipe já está registrada</span>");
							}
							else{
								choose_tourn_glad().then( function(gladid){
									if (gladid !== false){
										$.post("back_tournament.php", {
											action: "TEAM_CREATE",
											name: name,
											tname: tname,
											tpass: tpass,
											glad: gladid
										}).done( function(data){
											//console.log(data);
				
											if (data == "NOTFOUND"){
												showMessage("Torneio não encontrado");
											}
											else if (data == "ALREADYIN"){
												showMessage("Já está em um time neste torneio");
											}
											else if (data == "EXISTS"){
												$('.tourn-box #name').focus();
												$('.tourn-box .input-button').before("<span class='tip'>Esta equipe já está registrada</span>");
											}
											else if (data == "FULL"){
												showMessage("Este torneio já esgotou o limite de inscrições");
											}
											else{
												data = JSON.parse(data);

												$('.tourn-box .input-button').remove();
												$('.tourn-box #new').fadeIn();
				
												var box = "<div id='fog' class='message'><div id='tourn-message' class='tourn-box'><h2>Equipe <span>"+ name +"</span> registrada</h2><p>Os mestres deverão informar a seguinte senha para ingressar nesta equipe:</p><div>Senha: <span>"+ data.word +"</span></div><div id='button-container'><button class='button'>OK</button></div></div></div>";
												$('body').append(box);
				
												$('#tourn-message .button').click( function(){
													$('#fog.message').remove();
													$('.tourn-box .table .row').last().click();
												});
		
												refresh_teams({name: tname, pass: tpass});
											}
										});
									}
								});

							}
						});
					});	
				}
			});
		});
	});

});

function refresh_tourn_list(){
    if ($('#panel #battle-mode #tourn.button').hasClass('selected')){
        $.post("back_tournament.php", {
            action: "LIST"
        }).done( function(data){
            //console.log(data);
            if ($('#panel #battle-mode #tourn.button').hasClass('selected')){
                data = JSON.parse(data);
                var open = data.open;
                var mytourn = data.mytourn;

                $('#panel #battle-container #tourn.wrapper #table-open').html("<div class='row head'><div class='cell'>Identificador</div><div class='cell'>Descrição</div><div class='cell'>Equipes</div><div class='cell'>Flex</div></div>");
                for (let i in open){
                    $('#panel #battle-container #tourn.wrapper #table-open').append("<div class='row'><div class='cell' id='name'>"+ open[i].name +"</div><div class='cell'>"+ open[i].description +"</div><div class='cell'>"+ open[i].teams +"/"+ open[i].maxteams +"</div><div class='cell flex'>"+ open[i].flex +"</div></div>");
                }

                $('#mytourn-title').hide();
                if (mytourn.length > 0){
                    $('#panel #battle-container #tourn.wrapper #table-mytourn').html("<div class='row head'><div class='cell'>Identificador</div><div class='cell'>Descrição</div><div class='cell'>Equipes</div><div class='cell'>Flex</div></div>");
                    for (let i in mytourn){
                        $('#panel #battle-container #tourn.wrapper #table-mytourn').append("<div class='row'><div class='cell' id='name'>"+ mytourn[i].name +"</div><div class='cell'>"+ mytourn[i].description +"</div><div class='cell'>"+ mytourn[i].teams +"/"+ mytourn[i].maxteams +"</div><div class='cell flex'>"+ mytourn[i].flex +"</div></div>");
                    }
                    $('#mytourn-title').show();
                }

                $('#panel #battle-container #tourn.wrapper .table .cell.flex').each( function() {
                    if ($(this).html() == "1"){
                        $(this).html("<i class='material-icons md-18 md-green'>done</i>");
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
                        $('.tourn-box #name').val(data.name);
                        $('.tourn-box #pass').val(data.pass);
                        $('.tourn-box #join').click();
                    });
                });
            }

            count_refresh_tour_list++;
            setTimeout( function(){
                count_refresh_tour_list--;
                if (count_refresh_tour_list == 0)
                    refresh_tourn_list();
            }, 10000);
        });
    }
}

function refresh_teams(obj){
    //console.log(obj);
    if ($('#fog.tourn').length){
        $.post("back_tournament.php",{
            action: "LIST_TEAMS",
            name: obj.name,
            pass: obj.pass,
            tourn: obj.tourn
        }).done( function(data){
            //console.log(data);
            var data = JSON.parse(data);
            var teams = data.teams;
            var joined = false;
            if (data.joined)
                joined = data.joined;

            if (teams.length == 0){
                $('.tourn-box .table').html("<div class='row'>Nenhuma equipe inscrita</div>");
                $('.tourn-box h3 #count').html("");
            }
            else{
                //$('.tourn-box #button-container .button').addClass('single');
                $('.tourn-box .table').html("<div class='row head'><div class='cell'>Nome</div><div class='cell'>Gladiadores</div></div>");
                for (let i in teams){
                    $('.tourn-box .table').append("<div class='row'><div class='cell'>"+ teams[i].name +"</div><div class='cell'>"+ teams[i].glads +"/3</div><div class='kick' title='Expulsar equipe'><i class='material-icons'>cancel</i></div></div>");
                    rebind_team_rows(teams[i].id);
                    if (joined && joined === teams[i].id)
                        $('.tourn-box .table .row').last().addClass('signed');
                    else if (teams[i].glads == 3)
                        $('.tourn-box .table .row').last().addClass('full');
                }

                $('.tourn-box h3 #count').html("("+ teams.length +"/"+ data.maxteams +")");
            }

            if (data.filled == true && data.manager == true && teams.length > 1){
                $('.tourn-box #button-container #start').removeProp('disabled');
                $('.tourn-box #button-container #start').off();
                $('.tourn-box #button-container #start').click( function(){
                    showDialog("Deseja iniciar o torneio? Após o início, as equipes não poderão mais ser alteradas",["Sim","NÃO"]).then( function(data){
                        if (data == "Sim"){
                            $.post("back_tournament.php",{
                                action: "START",
                                name: obj.name,
                                pass: obj.pass
                            }).done( function(data){
                                console.log(data);
                                data = JSON.parse(data);
                                if (data.status == "DONE"){
                                    $('.tourn-box #close').click();
                                    window.open('tourn/'+ data.hash);
                                }
                            });
                        }
                    });
                });
            }
            else
                $('.tourn-box #button-container #start').prop('disabled', true);				

            if (data.manager == true && teams.length == 0){
                $('.tourn-box #button-container #delete').show();
                $('.tourn-box #button-container #start').hide();
                $('.tourn-box #button-container #delete').off();
                $('.tourn-box #button-container #delete').click( function(){
                    showDialog("Deseja remover o torneio?",["Sim","NÃO"]).then( function(data){
                        if (data == "Sim"){
                            $.post("back_tournament.php",{
                                action: "DELETE",
                                name: obj.name,
                                pass: obj.pass,
                                tourn: obj.tourn
                            }).done( function(data){
                                //console.log(data);
                                if (data == "DELETED"){
                                    showMessage("Torneio removido");
                                    $('#fog').remove();		
                                    refresh_tourn_list();
                                }
                                else{
                                    showMessage("Um torneio só pode ser removido quando não possuir equipes");
                                }
                            });
                        }
                    });
                });
            }
            else if (data.manager == false){
                $('.tourn-box .table .row .kick').remove();
                $('.tourn-box #button-container #delete').remove();
                $('.tourn-box #button-container #start').remove();
                $('.tourn-box #button-container #close').addClass('single');
            }
            else if (data.manager == true){
                $('.tourn-box #button-container #delete').hide();
                $('.tourn-box #button-container #start').show();
                $('.tourn-box .kick').click( function(e){
                    e.stopPropagation();
                    var team = $(this).parents(".row").find('.cell').eq(0).html();
                    showDialog("Deseja expulsar a equipe <span class='highlight'>"+ team +"</span> do torneio?",["Sim", "Não"]).then( function(data){
                        if (data == "Sim"){
                            $.post("back_tournament.php",{
                                action: "KICK",
                                name: obj.name,
                                pass: obj.pass,
                                teamname: team
                            }).done( function(data){
                                //console.log(data);
                                data = JSON.parse(data);
                                if (data.status == "DONE")
                                    refresh_teams(obj);
                                    showMessage("Equipe <span class='highlight'>"+ team +"</span> removida do torneio");
                            });
                        }
                    });
                });
            }

            if (joined !== false || teams.length >= data.maxteams)
                $('.tourn-box #new-container').hide();
            else
                $('.tourn-box #new-container').show();

            count_refresh_teams++;
            setTimeout( function(){
                count_refresh_teams--;
                if (count_refresh_teams == 0)
                    refresh_teams({name: obj.name, pass: obj.pass, tourn: obj.tourn});
            }, 10000);
        });
    }
}

function rebind_team_rows(teamid){
    $('.tourn-box .table .row').last().click( function(){
        teamsync.time = 0;
        var teamname = $(this).find('.cell').eq(0).html();
        var box = "<div id='fog' class='team'><div class='tourn-box'><div id='title'><h2>Equipe <span>"+ teamname +"</span></h2><div id='word'>Senha<span></span></div></div><h3>Gladiadores inscritos</h3><div class='glad-card-container'></div><div id='button-container'><button id='back' class='button'>VOLTAR</button><button id='join-leave' class='button'>ABANDONAR</button></div></div></div>";
        $('#fog .tourn-box').hide();
        $('body').append(box);

        $('.tourn-box #back').click( function(){
            $('#fog.team').remove();
            $('#fog .tourn-box').fadeIn();
        });

        $('.tourn-box #join-leave').click( function(){
            if ($('.tourn-box #join-leave').html() == "ABANDONAR"){
                showDialog("Tem certeza que deseja sair da equipe <span class='highlight'>"+ teamname +"</span>?",["Não", "SIM"]).then( function(data){
                    if (data == "SIM"){
                        $.post("back_tournament.php", {
                            action: "LEAVE_TEAM",
                            id: teamid
                        }).done( function(data){
                            //console.log(data);
                            data = JSON.parse(data);
                            var tournid = data.tourn;

                            $('#fog.team').remove();

                            var message = "Você não faz mais parte da equipe <span class='highlight'>"+ teamname +"</span>";
                            if (data.status == "REMOVED")
                                message = "A equipe <span class='highlight'>"+ teamname +"</span> foi desmantelada";

                            showMessage(message).then( function(data){
                                $('.tourn-box').fadeIn();
                                refresh_teams({tourn: tournid});
                            });
                        });
                    }
                });
            }
            else{
                choose_tourn_glad().then( function(data){
                    if (data !== false){
                        var gladid = data;
                        showInput("Senha para ingressar na equipe").then( function(data){
                            if (data !== false){
                                var pass = data;
                                $.post("back_tournament.php", {
                                    action: "JOIN_TEAM",
                                    pass: pass,
                                    team: teamid,
                                    glad: gladid
                                }).done( function(data){
                                    //console.log(data);
                                    data = JSON.parse(data);
                                    var tournid = data.tourn;

                                    if (data.status == "FAIL")
                                        showMessage("Senha incorreta");
                                    else if (data.status == "SIGNED")
                                        showMessage("Você já participa de uma equipe deste torneio");
                                    else{
                                        showMessage("Você ingressou na equipe <span class='highlight'>"+ teamname +"</span>").then( function(){
                                            $('.tourn-box .row.signed').click();
                                        });
                                        $('.tourn-box #back').click();
                                        refresh_teams({tourn: tournid});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        refresh_glads(teamid);

    });
}

function refresh_glads(teamid){
    if (teamsync.id != teamid)
        teamsync = {id: teamid, time: 0};
    
    $.post("back_tournament.php", {
        action: "TEAM",
        id: teamid,
        sync: teamsync.time
    }).done( function(data){
        //console.log(data);
        data = JSON.parse(data);

        if (data.status == "DONE"){
            var tname = data.name;
            var word = data.word;
            var flex = data.flex;
            var joined = false;
            teamsync.time = data.sync;
            if (data.joined)
                joined = data.joined;

            data = data.glads;

            if (word)
                $('.tourn-box #word span').html(word);
            else
                $('.tourn-box #word').remove();

            var template = $("<div id='template'></div>").load("glad-card-template.html", function(){
                $('.tourn-box .glad-card-container').html("");
                for (let i in data){
                    $('.tourn-box .glad-card-container').append("<div class='glad-preview'></div>");
                }
                $('.tourn-box .glad-card-container .glad-preview').html(template);
    
                for (let i in data){
                    if (data[i].name){
                        setGladImage($('.tourn-box .glad-card-container') ,i, data[i].skin);
                        $('.tourn-box .glad-preview .info .glad span').eq(i).html(data[i].name);
                        $('.tourn-box .glad-preview .info .attr .str span').eq(i).html(data[i].vstr);
                        $('.tourn-box .glad-preview .info .attr .agi span').eq(i).html(data[i].vagi);
                        $('.tourn-box .glad-preview .info .attr .int span').eq(i).html(data[i].vint);
                        $('.tourn-box .glad-preview').eq(i).data('id',data[i].cod);
                        $('.tourn-box .glad-preview .info .master').eq(i).html(data[i].apelido);

                        if (data[i].owner && data[i].owner === true){
                            $('.tourn-box .glad-preview').eq(i).addClass('mine');
                        }
                    }
                    else{
                        $('.tourn-box .glad-preview').eq(i).addClass('blurred');
                        setGladImage($('.tourn-box .glad-card-container') ,i, '');
                        $('.tourn-box .glad-preview .info .glad span').eq(i).html('??????????');
                        $('.tourn-box .glad-preview .info .attr .str span').eq(i).html('??');
                        $('.tourn-box .glad-preview .info .attr .agi span').eq(i).html('??');
                        $('.tourn-box .glad-preview .info .attr .int span').eq(i).html('??');
                        $('.tourn-box .glad-preview .info .master').eq(i).html(data[i]);
                    }
                }
                $('.glad-preview .code').remove();
                $('.glad-preview').not('.mine').find('.delete-container').remove();

                $('.glad-preview.mine .delete').click( function(){
                    var id = $(this).parents('.mine').data('id');
                    var name = $(this).parents('.mine').find('.row.glad span').html();
                    showDialog("Deseja remover o gladiador <span class='highlight'>"+ name +"</span> da equipe?", ['Sim','Não']).then( function(data){
                        if (data == "Sim"){
                            $.post("back_tournament.php", {
                                action: "REMOVE_GLAD",
                                glad: id,
                                team: teamid
                            }).done( function(data){
                                //console.log(data);
                                data = JSON.parse(data);
                                if (data.status == "REMOVED"){
                                    $('#fog.team').remove();
                                    showMessage("A equipe <span class='highlight'>"+ tname +"</span> foi desmantelada").then( function(){
                                        $('.tourn-box').fadeIn();
                                        refresh_teams({tourn: data.tournid});
                                    });
                                }
                                else if (data.status == "DONE"){
                                    $('.tourn-box #back').click();
                                    showMessage("O gladiador <span class='highlight'>"+ name +"</span> foi removido da equipe").then(function(){
                                        $('.tourn-box .row.signed').click();
                                    });
                                }
                                else
                                    showMessage(data.status);
                            });
                        }
                    });
                });

                for (let i = 0 ; i < 3 - data.length ; i++){
                    $('.tourn-box .glad-card-container').append("<div class='glad-add'><div class='image'></div><div class='info'>Clique para inscrever um novo gladiador</div></div>");
                }
                if ($('.tourn-box .glad-preview.blurred').length > 0){
                    $('.tourn-box .glad-add').addClass('disabled');
                    $('.tourn-box #join-leave').html('INGRESSAR');
                }
                if (flex == "0"){
                    $('.tourn-box .glad-add').addClass('disabled');
                }
                if (joined && $('.tourn-box #join-leave').html() == 'INGRESSAR'){
                    $('.tourn-box #join-leave').remove();
                    $('.tourn-box #button-container .button').addClass('single');
                }

                $('.tourn-box .glad-add').not('.disabled').click( function(){
                    choose_tourn_glad().then( function(gladid){
                        if (gladid !== false){
                            $.post("back_tournament.php", {
                                action: "ADD_GLAD",
                                glad: gladid,
                                team: teamid,
                                pass: word
                            }).done( function(data){
                                //console.log(data);
                                data = JSON.parse(data);
                                if (data.status == "SAMEGLAD")
                                    showMessage("Este gladiador já faz parte da equipe");
                                else if (data.status == "DONE"){
                                    $('#fog.team').remove();
                                    $('.tourn-box .row.signed').click();
                                }
                            });
                        }
                    });
                });
            });
        }

    });
    count_refresh_glads++;
    setTimeout( function(){
        count_refresh_glads--;
        if (count_refresh_glads == 0)
            refresh_glads(teamid);
    }, 10000);
}

function choose_tourn_glad(){
    var response = $.Deferred();

    var box = "<div id='fog' class='glads'><div id='duel-box'><div id='title'>Escolha o gladiador que irá lhe representar no torneio</div><div class='glad-card-container'></div><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='choose' class='button' disabled>ESCOLHER</button></div></div></div>";
    $('body').append(box);

    var template = $("<div id='template'></div>").load("glad-card-template.html", function(){});
    $.post("back_glad.php",{
        action: "GET",
    }).done( function(data){
        data = JSON.parse(data);
        for (var i in data){
            $('#fog.glads .glad-card-container').append("<div class='glad-preview'></div>");
        }
        $('#fog.glads .glad-card-container .glad-preview').html(template);

        for (var i in data){
            setGladImage($('#fog.glads .glad-card-container') ,i, data[i].skin);
            $('#fog.glads .glad-preview .info .glad span').eq(i).html(data[i].name);
            $('#fog.glads .glad-preview .info .attr .str span').eq(i).html(data[i].vstr);
            $('#fog.glads .glad-preview .info .attr .agi span').eq(i).html(data[i].vagi);
            $('#fog.glads .glad-preview .info .attr .int span').eq(i).html(data[i].vint);
            $('#fog.glads .glad-preview').eq(i).data('id',data[i].id);
        }
        $('#fog.glads .glad-preview .code .button').remove();
        $('#fog.glads .glad-preview .delete-container').remove();
        
        $('#fog.glads .glad-preview').click( function(){
            $('#fog.glads #btn-glad-open').removeProp('disabled');
            $('#fog.glads .glad-preview').removeClass('selected');
            $(this).addClass('selected');
            $('#duel-box #choose').removeProp('disabled');
        });
        
        $('#fog.glads .glad-preview').dblclick( function(){
            $('#fog.glads #duel-box #choose').click();
        });
    });
    
    $('#duel-box #cancel').click( function(){
        $('#fog.glads').remove();
        return response.resolve(false);
    });
    $('#duel-box #choose').click( function(){
        var gladid = $('#fog.glads .glad-preview.selected').data('id');
        $('#fog.glads').remove();
        return response.resolve(gladid);
    });

    return response.promise();
}