var code;
var startloop = false;
var json = {};
var hashes = [], newindex = new Array();
var steps = new Array();
var timestep = 0;
var pausesim = true;
var stepIncrement = 1;
var istep;
var tournHash;

$(document).ready( function() {
	if ($('#tourn').html().length){
		tournHash = $('#tourn').html();
	}
	$('#tourn').remove();
	
	if ($('#log').html().length){
		var log;
		
		if ($('#log').html().length > 32)
			showMessage('Erro na URL');
		else
			queryLog();
		
		function queryLog(){
			$.post( "back_log.php", { 
				action: "GET",
				loghash: $('#log').html()
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
						
						console.log(log);
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
	if ($(window).height() > $(window).width()){
		$('#canvas-div canvas').css({'max-width': '100%', 'max-height': $('#canvas-div canvas').width() / screenRatio});
		
	}
	else
		$('#canvas-div canvas').css({'max-height': '100%', 'max-width': $('#canvas-div canvas').height() * screenRatio});
}

var show_final_score = true;
function start_timer(steps){
	istep = setInterval( function(){
		if (startloop){
			$('#canvas-container').css('opacity',1);
			$('#canvas-container').fadeIn(1000);
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
					$('#canvas-container').append("<div id='fog'><div id='end-message'><div id='victory'>VITÓRIA</div><div id='image-container'><div id='image'></div><div id='name-team-container'><span id='name'>"+ name +"</span><span id='team'>"+ team +"</span></div></div><div id='button-container'><button class='button' id='retornar' title='Retornar para a batalha'>OK</button></div></div></div>");
					$('#end-message #retornar').click( function() {
						show_final_score = false;
						$('#fog').remove();
						if (tournHash)
							window.location.href = "https://gladcode.tk/tournment.php?t="+ tournHash;
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
	for (i=0 ; i<nglad ; i++){
		$('#ui-container').append("<div class='ui-glad'></div>");
		$('.ui-glad').last().load("../ui_template.html", function(){
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
