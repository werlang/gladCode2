var startloop = false;
var simRec = new Array();
var json = {};
var hashes, names, newindex = new Array();
var steps = new Array();
var timestep = 0;
var pausesim = true;
var stepIncrement = 1;
var endsim;
var exportjson;
var tries;

$(document).ready( function() {
	$('#canvas-container').hide();

	$('#preview-container').sortable({
		axis: "y",
		scroll: false
    });
	$('#dz-add').droppable({
		accept: '.dz-preview',
		drop: function( event, ui ) {
			$(ui.draggable).trigger('drop');
		}
	});
	
	var code = new Array();
	var dz = new Dropzone("#code-box", {
		url: "back_upload.php",
		paramName: "file",
		maxFilesize: 1,
		maxFiles: 5,
		clickable: '#code-box',
		createImageThumbnails: false,
		addRemoveLinks: true,
		acceptedFiles: ".c,.cpp",
		dictFileTooBig: "O arquivo é muito grande ({{filesize}}MB). Tamanho máximo {{maxFilesize}}MB.",
		dictInvalidFileType: "Você só pode enviar códigos escritos na linguagem C (extensões .c e .cpp).",
		dictCancelUpload: "Cancelar envio",
		dictUploadCanceled: "Envio cancelado",
		dictRemoveFile: "Remover arquivo",
		dictMaxFilesExceeded: "Você só pode enviar até {{maxFiles}} arquivos",
		previewTemplate: "<div class='dz-preview' title='Arraste o gladiador para removê-lo da batalha'></div>",
		accept: function(file, done) {
			done();
		},
		init: function () {
			this.on('addedfile', function (file) {  
				$('#preview-container').append($(file.previewElement));
			});
		},
		success: function(file, response) {
			//console.log(file);
			var id = file.upload.uuid;
			code[id] = filter_response(file, response);
			
			$(file.previewElement).on("drop", function() {
				dz.removeFile(file);
			});
			
			if (code[id].error){
				create_errorPreview($(file.previewElement), file, code[id].error);
				checkDisable();
			}
			else{
				$(file.previewElement).load('../dz-preview-template.html', function(){
					var i = $('.dz-preview').index($(this));
					$(this).find('.name span').html(code[id].file.name);
					$(this).find('.size span').html(code[id].file.size);
					$(this).find('.glad span').html(code[id].name);
					$(this).find('.str span').html(code[id].STR);
					$(this).find('.agi span').html(code[id].AGI);
					$(this).find('.int span').html(code[id].INT);
					appendCanvas($(this).find('.image'), code[id].code);
					checkDisable();
					$(this).find('.rem').click( function(){
						dz.removeFile(file);
					});
				});
			}
			
		},
		error: function(file, errorMessage) {
			var error = new Array();
			error.message = errorMessage;
			error.link = null;
			create_errorPreview($(file.previewElement), file, error);
			$(file.previewElement).on("drop", function() {
				dz.removeFile(file);
			});
		},
		removedfile: function(file) {
			delete code[file.upload.uuid];
			$(file.previewElement).remove();
			if ($(file.previewElement).hasClass('error'))
				checkDisable(true);
			else
				checkDisable();
		},
	});
	
	$('#dz-add').click( function(){
		$('.dz-clickable').click();
	});
	
	var ajaxcall = null;
	$('#b-battle').click( function(e) {
		var progbtn = new progressButton($(this), ["Executando batalha...","Aguardando resposta do servidor"]);
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
						var log = data;
						$.post("back_log.php", {
							action: "SAVE",
							log: JSON.stringify(log),
							single: true,
						}).done( function(data){
							var hash = data;
							showMessage("Batalha concluída. Clique para visualizar").then( function(){
								window.open("https://gladcode.tk/playback.php?log="+ hash);
							});
							progbtn.kill();
						});
					}
				});				
			}
		}, 10);
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
		var isfs = (document.fullscreenElement && document.fullscreenElement !== null) ||
				(document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
				(document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
				(document.msFullscreenElement && document.msFullscreenElement !== null);
		
		if (!isfs){
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
		if (Object.keys(code).length > 1 && $('.dz-preview.error').length == zero)
			$('#b-battle').removeAttr('disabled');
		else if (!$('#b-battle').attr('disabled'))
			$('#b-battle').attr('disabled',true);
	}
	
	$('#plogin').click( function(){
		googleLogin().then( function(data){
			window.location.href = "https://gladcode.tk/profile.php";
		});
	});	
	
});

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
/*
var show_final_score = true;
function start_timer(steps){
	istep = setInterval( function(){
		if (startloop){
			//console.log(steps[timestep]);
			if (timestep < 0)
				timestep = 0;
			if (timestep > steps.length - 1){
				timestep = steps.length - 1;
				var name, id;
				for (i in steps[timestep].glads){
					if (steps[timestep].glads[i].hp > 0 && !$('.ui-glad').eq(i).hasClass('dead')){
						if (!id || hp < steps[timestep].glads[i].hp){
							name = steps[timestep].glads[i].name;
							hp = steps[timestep].glads[i].hp;
							id = i;
						}
					}
				}
				if (!$('#end-message').length && show_final_score){
					if (!id){
						name = "Empate";
					}
					$('#canvas-container').append("<div id='fog'><div id='end-message'><div id='victory'>VITÓRIA</div><div id='image-container'><div id='image'></div><span id='name'>"+ name +"</span></div><div id='button-container'><button id='link' class='button' title='Cria um link para assistir a batalha mais tarde'>LINK</button><button id='b-ok' class='button' title='Continuar assistindo a batalha'>OK</button></div></div></div>");
					$('#end-message #b-ok').click( function() {
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
				music.resume();
			}
			phaser_update(steps[timestep]);
			if (!pausesim){
				timestep += stepIncrement;
			}
		}
	}, 100);	
}
*/

function appendCanvas(obj, file){
	getGladFromCode(file).then( function(data){
		fetchSpritesheet(JSON.parse(data.skin)).then( function(data){
			obj.append(getSpriteThumb(data,'walk','down'));
		});
	});
}

function getGladFromCode(code){
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
}

function calcPointCost(val){
	val = parseInt(val);
	if (val == 0)
		return 0;
	return Math.ceil(val/3) + calcPointCost(val - 1);
}
/*
function copyToClipboard(text) {
	$('body').append("<input type='text' id='icopy' value='"+ text +"'>");
	$('#icopy').select();
	document.execCommand("copy");
	$('#icopy').remove();
}	
*/