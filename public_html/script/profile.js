var user;
$(document).ready( function(){
	$('#header-container').addClass('small-profile');
	$('#header-profile').addClass('here');

	fill_assets();
	
	var preferences = ["friend","message","update","duel"];
	var picture
	$.post("back_login.php", {
		action: "GET"
	})
	.done( function(data){
		user = JSON.parse(data);
		if ($('#tab').length){
			var id = $('#tab').html();
			$('#'+ id).click();
			$('#tab').remove();
		}
		else
			$('#menu #profile').click();
		$('#profile-ui #picture img').attr('src',user.foto);
		$('#profile-ui #nickname').html(user.apelido);
		checkNotifications();
		
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
		//mantem atividade
		$.post("back_notification.php", {
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
			if (!e){
				$('#profile-ui #lvl span').html(data.user.lvl);
				var xpneeded = (parseInt(data.user.lvl) * 4.5 - 2.0) * 130;
				var xp = parseInt(data.user.xp);
				$('#profile-ui #xp #filled').width(xp/xpneeded*100 + "%");
				
				$('#messages .notification').html(data.messages);
				if (parseInt(data.messages) == 0)
					$('#messages .notification').addClass('empty');
				else
					$('#messages .notification').removeClass('empty');

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
				
				var notbattle = parseInt(data.reports) + parseInt(data.duels)
				if (notbattle >= 10)
					$('#battle .notification').html("...");
				else
					$('#battle .notification').html(notbattle);
				if (notbattle == 0)
					$('#battle .notification').addClass('empty');
				else
					$('#battle .notification').removeClass('empty');
			}
			setTimeout( function(){
				checkNotifications();
			}, 10000);
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
			preferences: JSON.stringify(user.preferences)
		})
		.done( function(data){
			//console.log(data);
			if (data == "DONE"){
				showMessage("Informações atualizadas");
				$('#profile-panel .button').removeProp('disabled');
				user.apelido = $('#nickname .input').val();
				$('#profile-ui #nickname').html(user.apelido);
				$('#profile-ui #picture img').attr('src',user.foto);
			}
			else if (data == "EXISTS"){
				showMessage("Outro usuário já escolheu este nome").then( function(){
					$('#nickname .input').focus().select();
				});
				$('#profile-panel .button').removeProp('disabled');
				
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
										window.location.href = "editor";
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
							showDialog("A simulação da gladCode foi atualizada, e o código do gladiador <span class='highlight'>"+ name +"</span> precisa ser testado e salvo novamente para que ele volte a participar das batalhas. Clique no botão para abrir o editor",["Cancelar","OK"]).then( function(data){
								if (data == "OK")
									window.open("glad-"+ card.data('id'));
							});
						}
						else{
							var code = card.data('code');
							//console.log(code);
							$('body').append("<div id='fog'><div id='code-box'><div class='close'>X</div><pre class='line-numbers language-c'><code class='language-c'>"+ code +"</code></pre><div id='button-container'><button id='editor' class='button'>Abrir no editor</button></div></div></div>");
							Prism.highlightElement($('code')[0]);
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
						window.location.href = "editor";
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
	
	$('#battle-container .tab').click( function(){
		$('#battle-container .tab').removeClass('selected');
		$(this).addClass('selected');

		reload_reports();
	});

	var reportpage = {
		battles: 1,
		duels: 1,
		favorites: 1
	};
	$('#battle-container #prev').click( function(){
		if ($('#bhist-container .tab.selected').html() == "Batalhas")
			reportpage.battles--;
		else if ($('#bhist-container .tab.selected').html() == "Duelos")
			reportpage.duels--;

		reload_reports();
	});
	$('#battle-container #next').click( function(){
		if ($('#bhist-container .tab.selected').html() == "Batalhas")
			reportpage.battles++;
		else if ($('#bhist-container .tab.selected').html() == "Duelos")
			reportpage.duels++;

		reload_reports();
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
						if (!$(this).hasClass('old')){
							$('#battle-container .glad-preview').removeClass('selected');
							$(this).addClass('selected');
							$('#match-find').removeProp('disabled');
						}
					});
				});
			});

			reload_reports();
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
				$('#duel-challenge .table').append("<div class='row'><div class='cell lvl-container'><img src='res/star.png' title='Nível'><span>"+ lvl +"</span></div><div class='cell image-container'><img src='"+ picture +"'></div><div class='cell user'>"+ nick +"</div><div class='cell time' title='"+ getMessageTime(time, true) +"'>"+ getMessageTime(time, false) +"</div><div class='button-container'><div class='accept' title='Aceitar desafio'></div><div class='refuse' title='Recusar desafio'></div></div></div>");
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
					if (data == "OK"){
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
		
				var template = $("<div id='template'></div>").load("glad-card-template.html", function(){});
				$.post("back_glad.php",{
					action: "GET",
				}).done( function(data){
					data = JSON.parse(data);
					for (var i in data){
						$('#fog .glad-card-container').append("<div class='glad-preview'></div>");
					}
					$('#fog .glad-card-container .glad-preview').html(template);
		
					for (var i in data){
						setGladImage($('#fog .glad-card-container') ,i, data[i].skin);
						$('#fog .glad-preview .info .glad span').eq(i).html(data[i].name);
						$('#fog .glad-preview .info .attr .str span').eq(i).html(data[i].vstr);
						$('#fog .glad-preview .info .attr .agi span').eq(i).html(data[i].vagi);
						$('#fog .glad-preview .info .attr .int span').eq(i).html(data[i].vint);
						$('#fog .glad-preview').eq(i).data('id',data[i].id);
					}
					$('#fog .glad-preview .code .button').remove();
					$('#fog .glad-preview .delete-container').remove();
					
					$('#fog .glad-preview').click( function(){
						$('#fog #btn-glad-open').removeProp('disabled');
						$('#fog .glad-preview').removeClass('selected');
						$(this).addClass('selected');
						$('#duel-box #duel').removeProp('disabled');
					});
					
					$('#fog .glad-preview').dblclick( function(){
						$('#fog #duel-box #duel').click();
					});

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
	
	function reload_reports(){
		var pstart, pend, ptotal;
		if ($('#bhist-container .tab.selected').html() == "Batalhas"){
			$.post("back_report.php", {
				action: "GET",
				read: true,
				page: reportpage.battles,
			}).done( function(data){
				//console.log(data);
				var e;
				try{
					data = JSON.parse(data);
				}
				catch(error){
					//console.log(error);
					e = error;
				}
				if (e || data.length == 0)
					$('#bhist-container').hide();
				else{
					pstart = data.start;
					pend = data.end;
					ptotal = data.total;
					data = data.reports;
					bind_report_pages();

					$('#bhist-container .table').html("<div class='row head'><div class='cell'>Gladiador</div><div class='cell reward'>Renome</div><div class='cell time'>Data</div></div>");
					for (var i in data){
						$('#bhist-container .table').append("<div class='row'><div class='cell glad'>"+ data[i].gladiator +"</div><div class='cell reward'>"+ (parseFloat(data[i].reward)).toFixed(1) +"</div><div class='cell time' title='"+ getMessageTime(data[i].time, true) +"'>"+ getMessageTime(data[i].time) +"</div><div class='playback' title='Visualizar batalha'><a target='_blank' href='play/"+ data[i].hash +"'><img src='icon/eye.png'></a></div></div>")
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

					data = data.output;
					$('#bhist-container .table').html("<div class='row head'><div class='cell'>Gladiador</div><div class='cell'>Oponente</div><div class='cell'>Mestre</div><div class='cell time'>Data</div></div>");
					for (var i in data){
						$('#bhist-container .table').append("<div class='row'><div class='cell glad'>"+ data[i].glad +"</div><div class='cell enemy'>"+ data[i].enemy +"</div><div class='cell'>"+ data[i].user +"</div><div class='cell time' title='"+ getMessageTime(data[i].time, true) +"'>"+ getMessageTime(data[i].time) +"</div><div class='playback' title='Visualizar batalha'><a target='_blank' href='play/"+ data[i].log +"'><img src='icon/eye.png'></a></div></div>");							

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
			});

		}

		function bind_report_pages(){
			$('#battle-container #page-title span').eq(0).html(pstart);
			$('#battle-container #page-title span').eq(1).html(pend);
			$('#battle-container #page-title span').eq(2).html(ptotal);
			
			if (pstart == 1)
				$('#battle-container #prev').prop('disabled',true);
			else
				$('#battle-container #prev').removeProp('disabled');
				
			if (pend == ptotal)
				$('#battle-container #next').prop('disabled',true);
			else
				$('#battle-container #next').removeProp('disabled');
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
				}
				else{
					var hash = data;

					save_stats(hash);

					$('#pre-battle-show #tips').html("Batalha concluída. Clique para visualizar");
					clearInterval(preBattleInt);
					$('#pre-battle-show').addClass('complete');
					$('#pre-battle-show').click( function(){
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
				$('#ranking-container #prev').removeProp('disabled');
				
			if (gend == gtotal)
				$('#ranking-container #next').prop('disabled',true);
			else
				$('#ranking-container #next').removeProp('disabled');
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

			$('#message-panel #page-title span').eq(0).html(meta.start);
			$('#message-panel #page-title span').eq(1).html(meta.end);
			$('#message-panel #page-title span').eq(2).html(meta.total);

			if (meta.page == 1)
				$('#message-panel #prev').prop("disabled", true);
			else
				$('#message-panel #prev').removeProp("disabled");
			if (meta.end == meta.total)
				$('#message-panel #next').prop("disabled", true);
			else
				$('#message-panel #next').removeProp("disabled");

			$('#message-panel .table').html("");
			for (var i in data){
				$('#message-panel .table').append("<div class='row'><div class='cell user'>"+ data[i].nick +"</div><div class='cell message'>"+ data[i].message +"</div><div class='cell time'>"+ getMessageTime(data[i].time) +"</div></div>");
				if (data[i].isread == "0")
					$('#message-panel .table .row').last().addClass('unread');
			}
			$('#message-panel .table .row').click( function(){
				var i = $('#message-panel .table .row').index($(this));
				var id = data[i].id;
				var message = data[i].message;
				var time = getMessageTime(data[i].time, true);
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
				$('#friend-panel #request .table').append("<div class='row'><div class='cell lvl-container'><img title='Nível' src='res/star.png'><span>"+ lvl +"</span></div><div class='cell image-container'><img src='"+ picture +"'></div><div class='cell user'>"+ nick +"</div><div class='button-container'><div class='check' title='Aceitar solicitação'></div><div class='close' title='Recusar solicitação'></div></div></div>");
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
				$('#friend-panel #friends .table').append("<div class='row'><div class='cell lvl-container'><img title='Nível' src='res/star.png'><span>"+ lvl +"</span></div><div class='cell image-container'><img src='"+ picture +"'></div><div class='cell'>"+ nick +"</div><div class='cell last-active'><span class='label'>Última atividade</span><span>"+ active +"</span></div><div class='button-open'></div></div>");
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
				})
				.done( function(data){
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
		menu.removeProp('style');
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

		var box = "<div id='fog'><div id='duel-box'><div id='title'>Escolha o gladiador que duelará contra <span class='highlight'>"+ nick +"</span> em nome da sua honra</div><div class='glad-card-container'></div><div id='button-container'><button id='cancel' class='button'>Cancelar</button><button id='invite' class='button' disabled>DESAFIAR</button></div></div></div>";
		$('body').append(box);

		var template = $("<div id='template'></div>").load("glad-card-template.html", function(){});
		$.post("back_glad.php",{
			action: "GET",
		}).done( function(data){
			data = JSON.parse(data);
			for (var i in data){
				$('#fog .glad-card-container').append("<div class='glad-preview'></div>");
			}
			$('#fog .glad-card-container .glad-preview').html(template);

			for (var i in data){
				setGladImage($('#fog .glad-card-container') ,i, data[i].skin);
				$('#fog .glad-preview .info .glad span').eq(i).html(data[i].name);
				$('#fog .glad-preview .info .attr .str span').eq(i).html(data[i].vstr);
				$('#fog .glad-preview .info .attr .agi span').eq(i).html(data[i].vagi);
				$('#fog .glad-preview .info .attr .int span').eq(i).html(data[i].vint);
				$('#fog .glad-preview').eq(i).data('id',data[i].id);
			}
			$('#fog .glad-preview .code .button').remove();
			$('#fog .glad-preview .delete-container').remove();
			
			$('#fog .glad-preview').click( function(){
				$('#fog #btn-glad-open').removeProp('disabled');
				$('#fog .glad-preview').removeClass('selected');
				$(this).addClass('selected');
				$('#duel-box #invite').removeProp('disabled');
			});
			
			$('#fog .glad-preview').dblclick( function(){
				$('#fog #duel-box #invite').click();
			});
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
				$('#fog').remove();
				if (data == "EXISTS"){
					showMessage("Já existe um desafio de duelo contra <span class='highlight'>"+ nick +"</span> usando o gladiador <span class='highlight'>"+ gladname +"</span>.");					
				}
				else if (data == "OK"){
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
	});

	$('#friend-panel input').on('input', function() {
		var text = $(this).val();
		$.post("back_friends.php", {
			action: "SEARCH",
			text: text,
		})
		.done( function(data){
			data = JSON.parse(data);
			//console.log(data);
			$('#friend-panel #search .table').html("");
			for (var i in data){
				var nick = data[i].nick;
				var userid = data[i].user;
				$('#friend-panel #search .table').append("<div class='row'><div class='cell'>"+ nick +"</div><div class='cell button-container'><div class='send-message' title='Enviar mensagem'></div><div class='add-friend' title='Enviar convite de amizade'></div></div></div>");
				$('#friend-panel #search .table .row').last().data({'user': userid, 'nick': nick});
			}
			$('#friend-panel #search .add-friend').click( function() {
				var nick = $(this).parents('.row').data('nick');
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
							friend: userid,
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
						console.log(data);
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
		"Você pode ver as últimas batalhas que seus gladiadores participaram no menu BATALHA",
		"Você pode procurar por usuários ou enviar mensagens para seus amigos no menu AMIGOS",
		"Participar de batalhas concede experiência para o mestre, que lhe concede uma série de benefícios",
		"Está com dúvida em algo? pergunte na página do facebook ou comunidade do reddit da gladCode",
		"Seja um membro ativo da comunidade comentando e dando sua opinião no facebook ou reddit",
		"Assista o replay de suas batalhas, assim você entende melhor o comportamentos de seus gladiadores",
		"A documentação é a melhor maneira de compreender como uma função funciona. Tem exemplos!",
		"Não entendeu algo sobre o funcionamento da gladCode? O manual da simulação está ali à sua disposição",
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

function setGladImage(parent, index, skin){
	fetchSpritesheet(skin).then( function(data){
		parent.find('.glad-preview .image').eq(index).html(getSpriteThumb(data,'walk','down'));
	});
}

function getImage(id){
	for (var i in images){
		if (images[i].id == id)
			return images[i];
	}
	return false;
}

function getSpriteThumb(spritesheet, move, direction){
	var dirEnum = {
		'walk': 8,
		'cast': 0,
		'thrust': 4,
		'slash': 12,
		'shoot': 16,
		'up': 0,
		'left': 1,
		'down': 2,
		'right': 3,
	};
	var line = dirEnum[move] + dirEnum[direction];

	var thumb = document.createElement("canvas");
	thumb.setAttribute("width", 64);
	thumb.setAttribute("height", 64);
	var ctx = thumb.getContext("2d");
	ctx.drawImage(spritesheet, 64, line*192 + 64, 64, 64, 0, 0, 64, 64); //10: linha do walk down
	return thumb;
}

function fetchSpritesheet(json) {
	var response = $.Deferred();
	var move = {
		'walk': {'sprites': 9, 'line': 8},
		'cast': {'sprites': 7, 'line': 0},
		'thrust': {'sprites': 8, 'line': 4},
		'slash': {'sprites': 6, 'line': 12},
		'shoot': {'sprites': 13, 'line': 16},
	};

	var errorload = false;
	try{
		json = JSON.parse(json);
	}
	catch(error){
		errorload = true;
		json = {};
	}

	var spritesheet = document.createElement("canvas");
	spritesheet.setAttribute("width", 192 * 13);
	spritesheet.setAttribute("height", 192 * 21);
	var spritectx = spritesheet.getContext("2d");
	
	var imgReady = 0;
	var selectedArray = [];
	for (var i in json){
		if (getImage(json[i]))
			selectedArray.push(getImage(json[i]));
	}
	if (!validate_skin(selectedArray))
		errorload = true;
	
	if (!errorload){
		selectedArray.sort(function(a, b){
			if (a.layer == null)
				return -1;
			else if (b.layer == null)
				return 1;
			else{
				if (typeof a.layer === 'object')
					a.layer = a.layer.down;
				if (typeof b.layer === 'object')
					b.layer = b.layer.down;
				return a.layer - b.layer;
			}
		});
		
		spritectx.clearRect(0, 0, spritesheet.width, spritesheet.height);
		var img = new Array();
		for(var i=0 ; i < selectedArray.length ; i++){
			if (selectedArray[i] && selectedArray[i].path != '' && !selectedArray[i].png){
				img[i] = new Image();	
				img[i].src = "sprite/Universal-LPC-spritesheet/" + selectedArray[i].path;
				img[i].onload = function() {
					imgReady++;
					if (imgReady == selectedArray.length){
						drawSprite();
						return response.resolve(spritesheet);
					}
				};
			}
			else{
				imgReady++;
				if (imgReady == selectedArray.length){
					drawSprite();
					return response.resolve(spritesheet);
				}
			}
		}
			
		function drawSprite() {
			for(var i=0 ; i < selectedArray.length ; i++){
				if (img[i]){
					if (selectedArray[i].oversize){
						var line = move[selectedArray[i].move].line;
						var sprites = move[selectedArray[i].move].sprites;
						for (var k=0 ; k<4 ; k++){
							for (var j=0 ; j<sprites ; j++){
								spritectx.drawImage(img[i], j*192, k*192, 192, 192, j*192, line*192 + k*192, 192, 192);
							}
						}
					}
					else{
						for (var k=0 ; k<21 ; k++){
							for (var j=0 ; j<13 ; j++){
								spritectx.drawImage(img[i], j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64);
							}
						}
					}
				}
			}
		}
	}
	else{
		var img = new Image();	
		img.src = "res/glad.png";
		img.onload = function() {
			for (var k=0 ; k<21 ; k++){
				for (var j=0 ; j<13 ; j++){
					spritectx.drawImage(img, j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64);
				}
			}
			return response.resolve(spritesheet);
		};
	}
	return response.promise();
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

function getMessageTime(msgTime, detailed){
	if (detailed){
		var months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
		t = new Date(msgTime);
		var string = t.getDate() +' de '+ months[t.getMonth()] +' de '+ t.getFullYear() +' às '+ ('0'+t.getHours()).slice(-2) +':'+ ('0'+t.getMinutes()).slice(-2);
		return string;
	}
	else{
		var now = new Date();
		msgTime = new Date(msgTime);
		
		var secNow = Math.round(now.getTime() / 1000);
		var secMsg = Math.round(msgTime.getTime() / 1000);
		
		var diff = (secNow - secMsg) / 60;
		return last_active_string(diff);
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