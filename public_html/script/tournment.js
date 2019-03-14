var startloop = false;
var simRec = new Array();
var json = {};
var hashes, names, newindex = new Array();
var steps = new Array();
var timestep = 0;
var pausesim = true;
var stepIncrement = 1;
var endsim;
var code = {};
var teams = {};
var ajaxcall = null;
var istep;


$(document).ready( function() {
	$('#canvas-container').hide();

	$('#footer-wrapper').addClass('white');
	
	var dz = new Dropzone("#code-box", {
		url: "back_upload.php",
		paramName: "file",
		maxFilesize: 1,
		maxFiles: 3,
		clickable: '#dz-add',
		createImageThumbnails: false,
		addRemoveLinks: true,
		acceptedFiles: ".c,.cpp",
		dictFileTooBig: "O arquivo é muito grande ({{filesize}}MB). Tamanho máximo {{maxFilesize}}MB.",
		dictInvalidFileType: "Você só pode enviar códigos escritos na linguagem C (extensões .c e .cpp).",
		dictCancelUpload: "Cancelar envio",
		dictUploadCanceled: "Envio cancelado",
		dictRemoveFile: "Remover arquivo",
		dictMaxFilesExceeded: "A equipe é composta de {{maxFiles}} gladiadores",
		previewTemplate: "<div class='dz-preview glad-preview'></div>",
		accept: function(file, done) {
			done();
		},
		init: function () {
			this.on('addedfile', function (file) {  
				$('#code-box').append($(file.previewElement));
			});
		},
		success: function(file, response) {
			//console.log(file);
			var id = file.upload.uuid;
			code[id] = filter_response(file, response);
			for (var i in code){
				if (i != id && code[i].name == code[id].name)
					code[id].error = {"message": "Cada gladiador em uma mesma equipe precisa possuir nomes diferentes"};
			}
						
			if (code[id].error){
				create_errorPreview($(file.previewElement), file, code[id].error);
				$(file.previewElement).click( function(){
					$(file.previewElement).fadeOut(function(){
						dz.removeFile(file);
						checkDisable();
					});
				});
				checkDisable();
			}
			else{
				$(file.previewElement).load('../dz-tournment-template.html', function(){
					var i = $('.dz-preview').index($(this));
					$(this).find('.name span').html(code[id].file.name);
					$(this).find('.size span').html(code[id].file.size);
					$(this).find('.glad span').html(code[id].name);
					$(this).find('.str span').html(code[id].STR);
					$(this).find('.agi span').html(code[id].AGI);
					$(this).find('.int span').html(code[id].INT);
					appendCanvas($(this).find('.image'), code[id].code);
					checkDisable();
					$(this).find('.delete').click( function(){
						$(this).parents('.dz-preview').fadeOut(function(){
							dz.removeFile(file);
						});
					});
				});
			}
			
		},
		error: function(file, errorMessage) {
			var error = new Array();
			error.message = errorMessage;
			error.link = null;
			if ($('.dz-preview').length > 3)
				dz.removeFile(file);
			else{
				create_errorPreview($(file.previewElement), file, error);
				$(file.previewElement).click( function(){
					$(file.previewElement).fadeOut(function(){
						dz.removeFile(file);
						checkDisable();
					});
				});
			}
			checkDisable();

		},
		removedfile: function(file) {
			delete code[file.upload.uuid];
			$(file.previewElement).remove();
			if ($(file.previewElement).hasClass('error'))
				checkDisable(true);
			else
				checkDisable();
			
			if ($('.dz-preview').length >= 3)
				$('#dz-add').hide();
			else
				$('#dz-add').show();
		},
		complete: function(file) {
			if ($('.dz-preview').length >= 3)
				$('#dz-add').hide();
			else
				$('#dz-add').show();
		},
	});
	
	$('#add-team').click( function(e) {
		
		if (ajaxcall)
			ajaxcall.abort();
		
		$('body').append("<div id='fog'><div id='team-name-window'><p>Informe o nome da equipe</p><input type='text' class='input' placeholder='Nome da equipe'><div class='button-container'><button id='btn-ok' class='button'>OK</button><button id='btn-cancel' class='button'>CANCELAR</button></div></div></div>");
		$('#team-name-window').hide().fadeIn();
		$('#team-name-window input').focus();
		
		$('#team-name-window input').keypress( function(e){
			if (e.which == 13)
				$('#team-name-window #btn-ok').click();
		});
		
		$('#team-name-window #btn-cancel').click( function() {
			$('#fog').remove();
		});

		var readyInsert = false;
		$('#team-name-window #btn-ok').click( function() {
			if ($('#team-name-window input').val().length >= 4){
				readyInsert = true;
				var teamname = $('#team-name-window input').val();
				$('#fog').remove();
			}
			else{
				$('#team-name-window').addClass('error');
				$('#team-name-window p').html("Nome muito curto.")
				$('#team-name-window input').focus();
			}
		
			if (readyInsert){
				var progbtn = new progressButton($('#add-team'), ["Testando gladiadores...","Aguardando resposta do servidor"]);
				var glads = [];
				var gladReady = 0;
				for (var i in code){
					getGladFromCode(code[i].code).then( function(data){
						glads.push(data);
						gladReady++;
					});
				}
				
				var gladWait = setInterval( function(){
					if (gladReady == Object.keys(code).length){
						clearInterval(gladWait);
						//console.log(glads);
						runSimulation(glads).then( function(data){
							//console.log(data);
							if (data == "ERROR"){
								progbtn.kill();
							}
							else{
								insertTeam(teamname);
								progbtn.kill();
							}
						});				
					}
				}, 10);
			}
		});
	});
	
	var stepprogi = 4, stepprog = [-10,-5,-2,-1,1,2,5,10];
	$('#back-step').click( function(){
		if (pausesim){
			if (stepIncrement > 0)
				stepIncrement = -1;
			else if (timestep > 0)
				stepIncrement *= 1.15;
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
	});
	$('#fowd-step').click( function(){
		if (pausesim){
			if (stepIncrement < 0)
				stepIncrement = 1;
			else if (timestep < $('#time').slider("option","max") - 1)
				stepIncrement *= 1.15;
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
	
	function checkDisable(errorEl) {
		var zero = 0;
		if (errorEl === true)
			zero = 1;
		if (Object.keys(code).length == 3 && $('.dz-preview.error').length == zero){
			$('#add-team').removeAttr('disabled');
		}
		else if (!$('#add-team').attr('disabled'))
			$('#add-team').attr('disabled',true);

	}
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

function insertTeam(name){
	$('#team-name-window input').val("");

	if ($('#added-teams').hasClass('empty'))
		$('#added-teams').removeClass('empty');
	
	$('#added-teams').show('slow').append("<div class='team-name added'><div class='delete' title='Remove a equipe cadastrada'>X</div><span>"+ name +"</span></div>");
	$('#fog').remove();
	
	teams[name] = new Array();
	teams[name] = code;
	
	code = new Array();
	
	$('.dz-preview').slideUp('fast', function(){
		$('#code-box .delete').click();	
	});
	
	$('#added-teams .team-name.added').last().hide().fadeIn();
	$('#added-teams .team-name.added').last().find('.delete').click( function(){
		var par = $(this).parents('.team-name.added');
		par.fadeOut(function(){
			par.remove();
			if ($('#added-teams .team-name.added').length == 0)
				$('#added-teams').addClass('empty')
		});
		if (teams[par.find('span').html()])
			delete teams[par.find('span').html()];
		if (Object.keys(teams).length <= 1)
			$('#t-start').prop('disabled', true);
	});
	
	if (Object.keys(teams).length > 1)
		$('#t-start').removeProp('disabled');
}

function createTerminal(title, message){
	$('body').append("<div id='fog'><div id='code-window'><div id='title'><span>"+ title +"</span><div id='close'></div></div><pre></pre></div></div>");
	$('#code-window #close').click( function() {
		$('#fog').remove();
	});
	$('#code-window pre').html(message);
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
					$('#canvas-container').append("<div id='fog'><div id='end-message'><div id='victory'>VITÓRIA</div><div id='image-container'><div id='image'></div><div id='name-team-container'><span id='name'>"+ name +"</span><span id='team'>"+ team +"</span></div></div><div id='button-container'><button id='link' class='button' title='Cria um link para assistir a batalha mais tarde'>LINK</button><button id='continuar' class='button' title='Continuar o torneio'>TORNEIO</button><button class='button' id='retornar' title='Retornar para a batalha'>OK</button></div></div></div>");
					$('#end-message #continuar').click( function() {
						setFullScreen(false);
						show_final_score = false;
						$('#fog').remove();
						$('#canvas-container').hide();
						$('#code-selection').show();
						clearInterval(istep);
						if (tier_select >= tiers.length){
							tier_select = 0;
							var teamsleft = remakeTiers();
							if (teamsleft > 1)
								tournmentStatus();
							else
								tournmentEnd(teamsleft);
						}
						else
							chooseGlads();
					});
					$('#end-message #retornar').click( function() {
						show_final_score = false;
						$('#fog').remove();
					});
					var hashlink = null;
					var img = new Image();
					img.src = 'res/ellipsis.svg';
					$('#end-message #link').click( function() {
						if (!hashlink){
							var newhash = new Array();
							for (var i in hashes)
								newhash[i] = hashes[newindex[i]];
							$.post( "back_log.php", {
								log: JSON.stringify(exportjson),
								spritesheets: JSON.stringify(newhash)
							})
							.done(function( data ) {
								hashlink = data;
								$('#url #hash').html(data);
							});
						}
						$('#end-message').hide();
						$('#fog').append("<div id='url'><span id='site'>https://gladcode.tk/playback.php?log=</span><span id='hash'></span></div>");
						if (hashlink)
							$('#url #hash').html(hashlink);
						else
							$('#url #hash').html($(img));
						$('#url').click( function(){
							if (hashlink){
								copyToClipboard('https://gladcode.tk/playback.php?log='+ $('#url #hash').html());
								$('#url').html('Link copiado');
								$('#url').addClass('clicked');
								setTimeout(function(){
									$('#url').remove();
									$('#end-message').fadeIn(500);
								},1000);
							}
						});
					});
					if (id)
						getAvatar(id, $('#end-message #image'));
					$('#end-message').hide();
					$('#end-message').fadeIn(1000);
					music.pause();
					victory.play();
				}
			}
			else if (!show_final_score){
				$('#fog').remove();
				show_final_score = true;
				if (music)
					music.resume();
			}
			phaser_update(steps[timestep]);
			if (!pausesim){
				timestep += stepIncrement;
			}
		}
	}, 100);	
}

function copyToClipboard(text) {
	$('body').append("<input type='text' id='icopy' value='"+ text +"'>");
	$('#icopy').select();
	document.execCommand("copy");
	$('#icopy').remove();
}	

function getAvatar(i, obj){
	var canvas = document.createElement("canvas");
	canvas.setAttribute("width", 64);
	canvas.setAttribute("height", 64);
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	img = new Image();
	if (hashes[newindex[i]] == ""){
		img.src = '../res/glad.png';
		ctx.drawImage(img, 0, 10*64, 64, 64, 0, 0, 64, 64);
	}
	else{
		img.src = '../spritesheet/'+ hashes[newindex[i]] +'.png';
		ctx.drawImage(img, 64, 10*192 + 64, 64, 64, 0, 0, 64, 64);
	}
	obj.append(canvas);
}

function getFoldername(){
	var i, name = "";
	for (i=0 ; i<10 ; i++){
		name = name + ((Math.random()*9).toFixed(0)).toString();
	}
	return name;
}

function create_ui(nglad){
	$('#ui-container').html("");
	for (i=0 ; i<nglad ; i++){
		$('#ui-container').append("<div class='ui-glad'></div>");
		$('.ui-glad').last().load("../ui_template.html", function(){
		});
	}
}

var spritesheets = {};
function appendCanvas(obj, file, status){
	if (!spritesheets[file]){
		getGladFromCode(file).then( function(data){
			fetchSpritesheet(JSON.parse(data.skin)).then( function(data){
				spritesheets[file] = data;
				appendThumb(obj,data);
			});
		});
	}
	else{
		var data = spritesheets[file];
		appendThumb(obj,data);
	}
	
	function appendThumb(obj,data){
		var move = 'walk';
		var direction = 'down';
		if (status == 'dead'){
			move = 'die';
			direction = 'up';
		}
		obj.append(getSpriteThumb(data,move,direction));
	}
}

function getGladFromCode(code, team){
	var response = $.Deferred();
	$.post('back_glad.php', {
		action: "FILE",
		code: code
	})
	.done(function(data){
		//console.log(data);
		data = JSON.parse(data);
		if (data.skin)
			data.skin = JSON.stringify(data.skin);
		if (team)
			data.user = team;
		return response.resolve(data);
	});
	return response.promise();
}


function filter_response(file, str){
	str = str.replace(/(\/\/[\w\W]*?\n)/g, "//comment\n"); //remove comentários
	str = str.replace(/(\/\*[\w\W]*?\*\/)/g, "//comment\n");

	var code = new Array();
	code.code = str;
	code.file = file;
	var error = new Array();
	if (!(/setName\([\w\W]*?\);|mudaNome\([\w\W]*?\);/g).exec(str)){
		error.message = "Função setName (nome do gladiador) não encontrada ou com erro.";
		error.link = "https://gladcode.tk/function.php?f=setname";
	}
	else if (!(/setName\("([\w À-ú]{3,20}?)"\);|mudaNome\("([\w À-ú]{3,20}?)"\);/g).exec(str)){
		error.message = "O nome do gladiador precisa ser composto de caracteres alfanuméricos e possuir tamanho entre 3 e 20.";
		error.link = "https://gladcode.tk/function.php?f=setname";
	}
	else if (!(/setSTR\([\w\W]*?\);|mudaFOR\([\w\W]*?\);/g).exec(str)){
		error.message = "Função setSTR (força do gladiador) não encontrada ou com erro.";
		error.link = "https://gladcode.tk/function.php?f=setstr";
	}
	else if (!(/setSTR\((\d{1,2})\);|mudaFOR\((\d{1,2})\);/g).exec(str)){
		error.message = "A força do gladiador precisa ser um número inteiro entre 0 e 10.";
		error.link = "https://gladcode.tk/function.php?f=setstr";
	}
	else if (!(/setAGI\([\w\W]*?\);|mudaAGI\([\w\W]*?\);/g).exec(str)){
		error.message = "Função setAGI (agilidade do gladiador) não encontrada ou com erro.";
		error.link = "https://gladcode.tk/function.php?f=setagi";
	}
	else if (!(/setAGI\((\d{1,2})\);|mudaAGI\((\d{1,2})\);/g).exec(str)){
		error.message = "A agilidade do gladiador precisa ser um número inteiro entre 0 e 10.";
		error.link = "https://gladcode.tk/function.php?f=setagi";
	}
	else if (!(/setINT\([\w\W]*?\);|mudaINT\([\w\W]*?\);/g).exec(str)){
		error.message = "Função setINT (inteligência do gladiador) não encontrada ou com erro.";
		error.link = "https://gladcode.tk/function.php?f=setint";
	}
	else if (!(/setINT\((\d{1,2})\);|mudaINT\((\d{1,2})\);/g).exec(str)){
		error.message = "A inteligência do gladiador precisa ser um número inteiro entre 0 e 10.";
		error.link = "https://gladcode.tk/function.php?f=setint";
	}
	else{
		code.name = (/setName\("([\w À-ú]+?)"\);|mudaNome\("([\w À-ú]+?)"\);/g).exec(str);
		code.STR = (/setSTR\((\d{1,2})\);|mudaFOR\((\d{1,2})\);/g).exec(str);
		code.AGI = (/setAGI\((\d{1,2})\);|mudaAGI\((\d{1,2})\);/g).exec(str);
		code.INT = (/setINT\((\d{1,2})\);|mudaINT\((\d{1,2})\);/g).exec(str);
		
		if (code.name[1])
			code.name = code.name[1];
		else if (code.name[2])
			code.name = code.name[2];
		
		if (code.STR[1])
			code.STR = code.STR[1];
		else if (code.STR[2])
			code.STR = code.STR[2];

		if (code.AGI[1])
			code.AGI = code.AGI[1];
		else if (code.AGI[2])
			code.AGI = code.AGI[2];

		if (code.INT[1])
			code.INT = code.INT[1];
		else if (code.INT[2])
			code.INT = code.INT[2];

		if ((/setSpritesheet\("(\w{32})"\);|mudaAparencia\("(\w{32})"\);/g).exec(str)){
			code.sprite = (/setSpritesheet\("(\w{32})"\);|mudaAparencia\("(\w{32})"\);/g).exec(str);
			
			if (code.sprite[1])
				code.sprite = code.sprite[1];
			else if (code.sprite[2])
				code.sprite = code.sprite[2];
		}
		else
			code.sprite = "";
		
		console.log(code);
		if (calcPointCost(code.STR) + calcPointCost(code.AGI) + calcPointCost(code.INT) != 25){
			error.message = "O somatório do custo dos pontos de atributos do gladiador é diferente de 25.";
			error.link = "https://gladcode.tk/manual.php#nav-atrib";
			code.error = error;
		}
		
		return code;
	}
	
	code.error = error;
	return code;
	
}

function create_errorPreview(preview, file, error){
	preview.addClass('error');
	preview.html("<div class='row file'><div class='name'>Arquivo:<span></span></div><div class='size'>Tamanho:<span></span>B</div></div><div class='row message'>Erro:<span></span></div><div class='row link'>Para saber mais acesse:<span></span></div>");
	preview.find('.message span').html(error.message);
	if (!error.link)
		preview.find('.link').remove();
	else
		preview.find('.link span').html("<a target='_blank' href='"+ error.link +"'>"+ error.link +"</a>");
	preview.find('.name span').html(file.name);
	preview.find('.size span').html(file.size);
	preview.click( function() {
		
	});
}

function calcPointCost(val){
	val = parseInt(val);
	if (val == 0)
		return 0;
	return Math.ceil(val/3) + calcPointCost(val - 1);
}