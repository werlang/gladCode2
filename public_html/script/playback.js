var code;
var startloop = false;
var json = {};
var hashes = [], newindex = new Array();
var steps = new Array();
var timestep = 0;
var pausesim = true;
var stepIncrement = 1;
var istep;
var tournHash, loghash;

$(document).ready( function() {

	$('#footer-wrapper').addClass('white');

	if ($('#tourn').html().length){
		tournHash = $('#tourn').html();
	}
	$('#tourn').remove();
	
	if ($('#log').html().length){
		var log;
		
		if ($('#log').html().length > 32)
			showMessage('Erro na URL');
		else{
			loghash = $('#log').html();
			queryLog();
		}
		
		function queryLog(){
			$.post( "back_log.php", { 
				action: "GET",
				loghash: loghash
			}).done( function(data){
				//console.log(data);
				if (data == "NULL"){
					if (tournHash)
						window.location.href = "https://gladcode.tk/tournment.php?t="+ tournHash;
					else
						window.location.href = "https://gladcode.tk";
				}
				else{
					var e;
					try{
						log = JSON.parse(data);
					}
					catch(error){
						e = error;
						console.log(error);
					}
					if (e){
						queryLog();
					}
					else{
						var glads = log[0].glads;
						stab = [];
						gender = [];
						
						//console.log(log);
						for (var i in glads){
							//console.log(glads[i].skin);
							var skin = glads[i].skin;
							keepOrder(i,hashes,skin);
							skin = JSON.parse(skin);
							
							stab[i] = "0";
							gender[i] = "male";
							for (var j in skin){
								var item = getImage(skin[j]);
								if (item.move == 'thrust')
									stab[i] = "1";
								if (item.id == 'female')
									gender[i] = "female";
							}
						}
						
						function keepOrder(i, hashes, skin){
							fetchSpritesheet(skin).then( function(data){
								hashes[i] = data;
							});
						}
						
						var waitHash = setInterval( function(){
							if (hashes.length == glads.length){
								clearInterval(waitHash);
								startBattle(log);
							}
						}, 10);
					}
				}
			});
		}
	}
	$('#log').remove();
	
	var stepprogi = 4, stepprog = [-10,-5,-2,-1,1,2,5,10];
	$('#back-step').click( function(){
		if (pausesim){
			if (stepIncrement > 0)
				stepIncrement = -1;
			else if (timestep > 0)
				stepIncrement *= 1.10;
			timestep += Math.round(stepIncrement);
			$('#fowd-step .speed').html("");
			$('#back-step .speed').html(Math.round(stepIncrement));
		}
		else{
			if (stepprogi > 0)
				stepprogi--;
			stepIncrement = stepprog[stepprogi];
			
			if (stepprogi <= 3){
				$('#fowd-step .speed').html("");
				$('#back-step .speed').html(stepprog[stepprogi]+ 'x');
			}
			else{
				$('#back-step .speed').html("");
				$('#fowd-step .speed').html(stepprog[stepprogi]+ 'x');
			}
		}
		clearInterval(istep);
		start_timer(steps);
	});
	$('#fowd-step').click( function(){
		if (pausesim){
			if (stepIncrement < 0)
				stepIncrement = 1;
			else if (timestep < $('#time').slider("option","max") - 1)
				stepIncrement *= 1.10;
			timestep += Math.round(stepIncrement);
			$('#back-step .speed').html("");
			$('#fowd-step .speed').html("+"+ Math.round(stepIncrement));
		}
		else{
			if (stepprogi < stepprog.length - 1)
				stepprogi++;
			stepIncrement = stepprog[stepprogi];
			
			if (stepprogi <= 3){
				$('#fowd-step .speed').html("");
				$('#back-step .speed').html(stepprog[stepprogi]+ 'x');
			}
			else{
				$('#back-step .speed').html("");
				$('#fowd-step .speed').html(stepprog[stepprogi]+ 'x');
			}
		}
		clearInterval(istep);
		start_timer(steps);
	});
	$('#pause').click( function(){
		stepIncrement = 1;
		stepprogi = 4;
		if (pausesim){
			pausesim = false;
			$('#pause #img-play').hide();
			$('#pause #img-pause').show();
			$('#back-step .speed').html('-1x');
			$('#fowd-step .speed').html('1x');
		}
		else{
			pausesim = true;
			$('#pause #img-pause').hide();
			$('#pause #img-play').show();
			stepIncrement = 1;
			stepprogi = 4;
			$('#back-step .speed').html('-1');
			$('#fowd-step .speed').html('+1');
		}
		clearInterval(istep);
		start_timer(steps);
	});
	$('#fullscreen').click( function(){
		setFullScreen(!isFullScreen());
	});

	$('#help').click( function(){
		$('body').append("<div id='fog'><div id='help-window' class='blue-window'><div id='content'><h2>Controle da câmera</h2><div class='table'><div class='row'><div class='cell'><img src='icon/mouse_drag.png'>/<img src='icon/arrows_keyboard.png'></div><div class='cell'>Mover a câmera</div></div><div class='row'><div class='cell'><img src='icon/mouse_scroll.png'>/<img src='icon/plmin_keyboard.png'></div><div class='cell'>Zoom da arena</div></div><div class='row'><div class='cell'><img src='icon/select_glad.png'>/<img src='icon/numbers_keyboard.png'></div><div class='cell'>Acompanhar um gladiador</div></div></div><h2>Teclas de atalho</h2><div class='table'><div class='row'><div class='cell'><span class='key'>M</span></div><div class='cell'>Mostrar/ocultar molduras</div></div><div class='row'><div class='cell'><span class='key'>B</span></div><div class='cell'>Mostrar/ocultar barras de hp e ap</div></div><div class='row'><div class='cell'><span class='key'>F</span></div><div class='cell'>Mostrar/ocultar taxa de atualização</div></div><div class='row'><div class='cell'><span class='key'>ESPAÇO</span></div><div class='cell'>Parar/Continuar simulação</div></div><div class='row'><div class='cell'><span class='key'>A</span></div><div class='cell'>Retroceder simulação</div></div><div class='row'><div class='cell'><span class='key'>D</span></span></div><div class='cell'>Avançar simulação</div></div></div></div><div id='button-container'><button class='button' id='ok'>OK</button></div></div></div>");

		$('#help-window #ok').click( function(){
			$('#fog').remove();
		});
	});

	$('#settings').click( function(){
		$('body').append("<div id='fog'><div id='settings-window' class='blue-window'><h2>Preferências</h2><div class='check-container'><div id='pref-bars'><label><input type='checkbox' class='checkslider'>Mostrar barras de hp e ap</label></div><div id='pref-frames'><label><input type='checkbox' class='checkslider'>Mostrar molduras dos gladiadores</label></div><div id='pref-fps'><label><input type='checkbox' class='checkslider'>Mostrar taxa de atualização da tela (FPS)</label></div></div><div id='button-container'><button class='button' id='ok'>OK</button></div></div></div>");

		if (showbars)
			$('#pref-bars input').prop('checked', true);
		if ($('#ui-container').css('display') == 'flex')
			$('#pref-frames input').prop('checked', true);
		if (showFPS)
			$('#pref-fps input').prop('checked', true);

		$('.checkslider').each( function(){
			create_checkbox($(this));
		});
	
		$('#settings-window #ok').click( function(){
			$('#fog').remove();
		});

		$('#pref-bars input').change( function(){
			if ($(this).prop('checked'))
				showbars = true;
			else
				showbars = false;
		});

		$('#pref-frames input').change( function(){
			if ($(this).prop('checked'))
				$('#ui-container').fadeIn();
			else
				$('#ui-container').fadeOut();
		});

		$('#pref-fps input').change( function(){
			if ($(this).prop('checked'))
				showFPS = true;
			else
				showFPS = false;
		});		
	});
	
	$( "#time" ).slider({
		range: "min",
		min: 0,
		max: 0,
		value: timestep,
		create: function( event, ui ) {
			$(this).append("<div class='ui-slider-time'></div>");
		},
		change: function( event, ui ) {
			var h = Math.floor(ui.value/600);
			var m = Math.floor(ui.value/10)%60;
			if (m < 10)
				m = "0"+ m;
			var time = h +":"+ m;
			$(this).find('.ui-slider-time').html(time);
			$(this).find('.ui-slider-time').css('left', $(this).find('.ui-slider-handle').css('left'));
		},
		slide: function( event, ui ) {
			timestep = ui.value;
		}
	});

	$([window, document]).focusin(function(){
		//console.log("entrou");
	}).focusout(function(){
		pausesim = false; //coloca false na var
		$('#pause').click(); //clica no botao e pause fica true
	});	
});

function isFullScreen(){
	var isfs = (document.fullscreenElement && document.fullscreenElement !== null) ||
		(document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
		(document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
		(document.msFullscreenElement && document.msFullscreenElement !== null);
	if (isfs)
		return true;
	else
		return false;
}

function setFullScreen(state){
	if (state){
		var elem = document.getElementById("canvas-container");
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		}
		else if (elem.mozRequestFullScreen) { /* Firefox */
			elem.mozRequestFullScreen();
		}
		else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
			elem.webkitRequestFullscreen();
		}
		else if (elem.msRequestFullscreen) { /* IE/Edge */
			elem.msRequestFullscreen();
		}
	}
	else{
		if (document.exitFullscreen) {
			document.exitFullscreen();
		}
		else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
		else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		}
		else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	}
	
}

$(window).resize( function() {
	resize();
});

function resize() {
	var canvasH = $(window).height();
	var canvasW = $(window).height() * screenW/screenH;
	game.scale.setGameSize(canvasW, canvasH);
	if ($(window).width() > $(window).height()){
		game.camera.scale.x = $(window).height() / screenH;
		game.camera.scale.y = $(window).height() / screenH;
	}
	else{
		game.camera.scale.x = $(window).width() / screenW;
		game.camera.scale.y = $(window).width() / screenW;
	}	
	game.camera.bounds.width = screenW;
	game.camera.bounds.height = screenH;

}

var show_final_score = true;
function start_timer(steps){
	istep = setInterval( function(){
		if (startloop){
			//console.log(steps[timestep]);
			if (timestep < 0)
				timestep = 0;
			if (timestep > steps.length - 1){
				timestep = steps.length - 1;
				var name, team, id, hp;
				for (i in steps[timestep].glads){
					if (steps[timestep].glads[i].hp > 0 && !$('.ui-glad').eq(i).hasClass('dead')){
						if (!id || hp < steps[timestep].glads[i].hp){
							name = steps[timestep].glads[i].name;
							hp = steps[timestep].glads[i].hp;
							team = steps[timestep].glads[i].user;
							id = i;
						}
					}
				}
				if (!$('#end-message').length && show_final_score){
					if (!id){
						name = "Empate";
						team = "";
					}
					$('body').append("<div id='fog'><div id='end-message'><div id='victory'>VITÓRIA</div><div id='image-container'><div id='image'></div><div id='name-team-container'><span id='name'>"+ name +"</span><span id='team'>"+ team +"</span></div></div><div id='button-container'><button class='button' id='retornar' title='Retornar para a batalha'>OK</button><button class='button small' id='share' title='Compartilhar'><img src='icon/share.png'></button></div></div></div>");
					$('#end-message #retornar').click( function() {
						show_final_score = false;
						$('#fog').remove();
						if (tournHash)
							window.location.href = "https://gladcode.tk/tournment.php?t="+ tournHash;
					});

					$('#end-message #share').click( function() {
						$('#end-message').hide();

						var link = "gladcode.tk/play/"+ loghash;

						var twitter = "<a id='twitter' class='button' title='Compartilhar pelo Twitter' href='https://twitter.com/intent/tweet?text=Veja%20esta%20batalha:&url=https://"+ link +"&hashtags=gladcode' target='_blank'><img src='icon/twitter.png'></a>";

						var facebook = "<a id='facebook' class='button' title='Compartilhar pelo Facebook' href='https://www.facebook.com/sharer/sharer.php?u="+ link +"' target='_blank'><img src='icon/facebook.png'></a>";

						var whatsapp = "<a id='whatsapp' class='button' title='Compartilhar pelo Whatsapp' href='https://api.whatsapp.com/send?text=Veja esta batalha:%0a"+ link +"%0a%23gladcode' target='_blank'><img src='icon/whatsapp.png'></a>";

						$('#fog').append("<div id='url'><div id='link'><span id='title'>Compartilhar batalha</span><span id='site'>gladcode.tk/play/</span><span id='hash'>"+ loghash +"</span></div><div id='social'><div id='getlink' class='button' title='Copiar link'><img src='icon/link.png'></div>"+ twitter + facebook + whatsapp +"</div><button id='close' class='button'>OK</button></div>");
						
						$('#url #social #getlink').click( function(){
							copyToClipboard(link);
							$('#url #hash').html('Link copiado');
							$('#url #hash').addClass('clicked');
							setTimeout(function(){
								$('#url #hash').removeClass('clicked');
								$('#url #hash').html(loghash);
							},500);
						});
						
						$('#url #close').click( function(){
							$('#url').remove();
							$('#end-message').show();
						});
					});

					if (id)
						$('#end-message #image').html(getSpriteThumb(hashes[newindex[id]],'walk','down'));
					$('#end-message').hide();
					$('#end-message').fadeIn(1000);
					music.pause();
					victory.play();
				}
			}
			else if (!show_final_score){
				$('#fog').remove();
				show_final_score = true;
				music.resume();
			}
			phaser_update(steps[timestep]);
			if (!pausesim){
				timestep += stepIncrement / Math.abs(stepIncrement);
			}
		}
	}, 100 / Math.abs(stepIncrement));	
}

function create_ui(nglad){
	$('#ui-container').html("");
	for (let i=0 ; i<nglad ; i++){
		$('#ui-container').append("<div class='ui-glad'></div>");
		$('.ui-glad').last().load("ui_template.html", function(){
			$(this).click( function(){
				if ($(this).hasClass('follow') || $(this).hasClass('dead')){
					game.camera.unfollow();
					$('.ui-glad').removeClass('follow');
				}
				else{
					game.camera.follow(sprite[i]);
					$('.ui-glad').removeClass('follow');
					$(this).addClass('follow');
				}
			});
		});
	}
}

function startBattle(simulation){
	json = {};
			
	startloop = false;
	
	load_phaser();

	//console.log(simulation[0]);
	create_ui(simulation[0].glads.length);
	$( "#time" ).slider("option", "max", simulation.length);
	for (i=0 ; i<simulation[0].glads.length ; i++){
		simulation[0].glads[i].name = simulation[0].glads[i].name.replace(/#/g," "); //destroca os # nos nomes por espaços
		simulation[0].glads[i].user = simulation[0].glads[i].user.replace(/#/g," ");
		newindex[i] = i;
	}

	for (var i in simulation){
		json.projectiles = {};
		$.extend( true, json, simulation[i] ); //merge json objects
		steps.push(JSON.parse(JSON.stringify(json)));
		//console.log(simulation[i]);
	}

	startloop = true;
	start_timer(steps);
}
