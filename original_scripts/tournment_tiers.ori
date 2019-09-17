var tier_select = 0;
var tiers = new Array();
var rounds = new Array();
var teamTimeGlad;
var winners = new Array();
var exportjson;
var tournHash;

$(document).ready( function() {

	if ($('#get-tour').html().length > 0){
		tournHash = $('#get-tour').html();
		getTournment();
	}
	$('#get-tour').remove();
	
	$('#t-start').click( function() {
		var ntiers = Math.ceil(Object.keys(teams).length / 5);
		for (i=0 ; i<ntiers ; i++){
			tiers[i] = {};
			tiers[i].bnum = i+1;
			tiers[i].teams = {};
		}

		var c = 0;
		do {
			var nteams = Math.ceil(Object.keys(teams).length);
			var r = getRandom(0,nteams - 1);
			var i = 0;
			for (t in teams){
				if (i == r){
					tiers[c].teams[t] = {};
					tiers[c].teams[t].code = teams[t];
					tiers[c].teams[t].dead = {};
					for (var id in tiers[c].teams[t].code)
						tiers[c].teams[t].dead[id] = false;
					delete teams[t];
					c = (c + 1) % ntiers;
					break;
				}
				i++;
			}
		} while (nteams > 1);
		rounds.push(tiers);
		tournmentStatus();
		saveTournment(1);
		
	});
	
	$(window).keydown(function(event) {
		if(event.ctrlKey && event.altKey && event.keyCode == 74) { //ctrl+alt+j
			teams = {
				'Unbiased Thugs': code,
				'Ceaseless Power': code,
				'Mute Noobs': code,
				'Funny Antagonists': code,
				'Halting Slayers': code,
				'Clever Superpower': code,
				'Tranquil Tyranny': code,
				'Fearless Hooligans': code,
				'Elite Warriors': code,
				'Dear Strategy': code,
				'Godly Squad': code,
				'Learned Exterminators': code,
				'Five Mafia': code,
			};
			
			$('#t-start').removeProp('disabled');
			console.log("JUMP START");
		}
		if(event.ctrlKey && event.altKey && event.keyCode == 68) { //ctrl+alt+d
			var hash = "5e0d6737353d47af3abe76fa52280d86";
			$.post("back_log.php", {
				action: "GET",
				loghash: hash
			})
			.done( function(data){
				orderDeaths(JSON.parse(data));
				console.log("BATTLE TEST");
			});
		}
	});

});

function saveTournment(bnum){
	var bstart = tiers[0].bnum;
	var bend = tiers[tiers.length - 1].bnum;
	if (bnum > bend){
		bend = bend - bstart + bnum;
		bstart = bnum;
	}
	//console.log(teamTimeGlad);
	bnum = {"bnum": bnum, "bstart": bstart, "bend": bend};
	if (!tournHash){
		$.post( "back_tournment.php", {
			round: JSON.stringify(teamTimeGlad),
			bnum: JSON.stringify(bnum),
			winners: JSON.stringify(winners),
			action: "save"
		})
		.done(function( data ) {
			tournHash = data;
		});	
	}
	else{
		$.post( "back_tournment.php", {
			round: JSON.stringify(teamTimeGlad),
			bnum: JSON.stringify(bnum),
			winners: JSON.stringify(winners),
			hash: tournHash,
			action: "save"
		})
		.done(function( data ) {
		});	
	}
}

function getTournment(){
	$.post( "back_tournment.php", {
		hash: tournHash,
		action: "get"
	})
	.done(function( data ) {
		data = JSON.parse(data);
		var bnum = JSON.parse(data.bnum).bnum;		
		var bstart = JSON.parse(data.bnum).bstart;
		var bend = JSON.parse(data.bnum).bend;
		teamTimeGlad = JSON.parse(data.round);
		winners = JSON.parse(data.winners);
		//console.log(winners);

		var ntiers = bend - bstart + 1;

		tier_select = (bnum-bstart)%ntiers;
		tiers = new Array({"bnum": bstart-1});
		var teamsleft = remakeTiers();
		if (teamsleft > 1)
			tournmentStatus();
		else
			tournmentEnd(teamsleft);
	});	
}

function tournmentStatus(){	
	var times;
	if (teamTimeGlad){
		times = new Array();
		for (var i=0 ; i<teamTimeGlad.length ; i++)
			times[teamTimeGlad[i].team] = teamTimeGlad[i].time;

		tempTeamTimeGlad = teamTimeGlad;
		tempTeamTimeGlad.find = function (team) {
			for (var i in tempTeamTimeGlad){
				if (tempTeamTimeGlad[i].team == team)
					return tempTeamTimeGlad[i];
			}
			return false;
		}
	}
	//console.log(teamTimeGlad);

	var tempTeamTimeGlad;
	teamTimeGlad = new Array();
	teamTimeGlad.find = function (team) {
		for (var i in teamTimeGlad){
			if (teamTimeGlad[i].team == team)
				return teamTimeGlad[i];
		}
		return false;
	}

	$('#code-selection').html("<p id='text-intro'>As equipes foram organizadas nos seguintes grupos</p><div id='tiers-container'></div><div id='button-container'><button id='t-link' class='button' title='Mostra o link para continuar o torneio mais tarde'>LINK</button><button id='b-continue' class='button' title='Continuar as batalhas do torneio' disabled>CONTINUAR</button></div>");
	for (i in tiers){
		$('#tiers-container').append("<div class='tier'><div class='title'><span>Batalha "+ tiers[i].bnum +"</span><div class='icons'><div class='glad'><img src='icon/gladcode_icon.png' title='Gladiadores vivos da equipe'></div><div class='time'><img src='icon/clock-icon.png' title='Tempo que sobreviveu na última batalha'></div></div></div></div>");
		for (t in tiers[i].teams){
			var gladleft = 3;
			$('#tiers-container .tier').last().append("<div class='team'><div class='icon'><img src='icon/check.png'></div><span>"+ t +"</span><div class='info'><div class='glad'><div class='g-bar'></div><div class='g-bar'></div><div class='g-bar'></div></div><div class='time'><span></span> s</div></div></div>");
			$('#tiers-container .tier .team').last().hide();
			var e = {"team": t, "time": null, "glads": {}};
			for (g in tiers[i].teams[t].code){
				e.glads[tiers[i].teams[t].code[g].name] = {};
				e.glads[tiers[i].teams[t].code[g].name].code = tiers[i].teams[t].code[g];
				if (tiers[i].teams[t].dead[g]){
					e.glads[tiers[i].teams[t].code[g].name].dead = true;
					gladleft--;
				}
			}
			var glarr = ['','one','two','three'];
			$('#tiers-container .info .glad').last().addClass(glarr[gladleft]);
			if (!times || times[t] == null)
				$('#tiers-container .info .time').last().html("-");
			else if (times[t] >= 1000)
				$('#tiers-container .info .time').last().html("<img class='winner' src='icon/winner-icon.png'>");
			else
				$('#tiers-container .info .time span').last().html(times[t].toFixed(1));
			teamTimeGlad.push(e);
		}
	}
	if (tier_select % tiers.length != 0 && tempTeamTimeGlad){
		for (var i in teamTimeGlad){
			var team = teamTimeGlad[i].team;
			if (teamTimeGlad[i].time == null && tempTeamTimeGlad.find(team).time != null)
				teamTimeGlad[i] = tempTeamTimeGlad.find(team);
		}
	}
	showTeam(0,0);
	//console.log(teamTimeGlad);
	
	if (winners.length > 0){
		$('#tiers-container').append("<div class='tier defeated'><div class='title'><span>Equipes derrotadas</span><div class='icons'><img src='icon/gladcode_icon.png' title='Gladiadores vivos da equipe'></div></div></div>");
		for (var i = winners.length-1 ; i>=0 ; i--){
			$('#tiers-container .tier').last().append("<div class='team'><div class='icon'><img src='icon/close_x.png'></div><span>"+ winners[i] +"</span><div class='info'><div class='glad'><div class='g-bar'></div><div class='g-bar'></div><div class='g-bar'></div></div></div></div>");
		}
	}
	
	function showTeam(t,i){
		if ($('#tiers-container .tier').eq(t).find('.team').eq(i).length){
			setTimeout( function() {
				$('#tiers-container .tier').eq(t).find('.team').eq(i).fadeIn(200, function(){
					if (t < tiers.length-1){
						showTeam(t+1,i);
					}
					else if (i < $('#tiers-container .tier').eq(0).find('.team').length - 1)
						showTeam(0,i+1);
					else{
						$('#b-continue').removeProp('disabled');
						return;
					}
				});
			},300);
		}
		else{
			$('#b-continue').removeProp('disabled');
			return;
		}
	}
	
	$('#b-continue').click( function() {
		chooseGlads();
	});
	$('#t-link').click( function() {
		$('body').append("<div id='fog'><div id='url'><span id='site'>https://gladcode.tk/tournment.php?t=</span><span id='hash'>"+ tournHash +"</span></div></div>");
		$('#url').click( function(){
			copyToClipboard('https://gladcode.tk/tournment.php?t='+ $('#url #hash').html());
			$('#url').html('Link copiado');
			$('#url').addClass('clicked');
			setTimeout(function(){
				$('#fog').remove();
			},1000);
		});
	});
}

function chooseGlads() {
	var team_select = 0;
	$('#code-selection').html("<div id='pre-battle-container'><div id='title'>Batalha "+ tiers[tier_select].bnum +"</div><div id='glad-showcase'></div><div id='team-container'><div id='name'><span></span>, selecione um gladiador para fazer parte da batalha</div><div id='glad-selection'></div></div></div><div id='button-container'><button id='b-select' class='button' title='Selecionar o gladiador escolhido para a equipe' disabled>SELECIONAR</button></div>");
		
	for (t in tiers[tier_select].teams){
		$('#glad-showcase').append("<div class='glad-box empty'><div class='canvas'></div><div class='name'>XXXXXXX</div></div>")
	}
	var teams = new Array();
	var code = new Array();
	for (t in tiers[tier_select].teams)
		teams.push(t);
	
	buildSelection();
	function buildSelection(){
		$('#team-container #name span').html(teams[team_select]);
		$('#team-container #glad-selection').html("");
		for (id in tiers[tier_select].teams[teams[team_select]].code){
			var el = tiers[tier_select].teams[teams[team_select]].code[id];
			var dead = tiers[tier_select].teams[teams[team_select]].dead[id];
			$('#team-container #glad-selection').append("<div class='glad-box'><div class='canvas'></div><div class='name'></div></div>");
			$('#team-container #glad-selection .name').last().html(el.name);
			$('#team-container #glad-selection .glad-box').last().data('id',id);
			if (dead){
				$('#team-container #glad-selection .glad-box').last().addClass('dead');
				appendCanvas( $('#team-container #glad-selection .canvas').last(), el.code, "dead");
			}
			else
				appendCanvas( $('#team-container #glad-selection .canvas').last(), el.code);
		}
		
		$('#glad-selection .glad-box').not('.dead').click( function(){
			$('#glad-selection .glad-box').removeClass('selected');
			$(this).addClass('selected');
			
			if ($('#glad-selection .glad-box.selected').length > 0)
				$('#b-select').removeProp('disabled');
		});
	}
	
	var battleReady = false;
	$('#b-select').click( function() {
		if (!battleReady){
			var target = $('#glad-showcase .glad-box.empty').first();
			target.removeClass('empty');
			
			var id = $('#glad-selection .glad-box.selected').data('id');
			var el = tiers[tier_select].teams[teams[team_select]].code[id];
			appendCanvas( target.find('.canvas'), el.code);
			target.find('.name').html(el.name);
			code.push({"team": teams[team_select], "file": el.file, "code": el.code});
			
			team_select++;
			if (team_select < teams.length){
				$('#b-select').prop('disabled', true);
				buildSelection();
			}
			else{
				$(this).html("INICIAR BATALHA");
				$('#team-container').remove();
				battleReady = true;
			}
		}
		else{
			if (istep){
				clearInterval(istep);
				istep = null;
			}
			startBattle(code);
		}
	});
}

function remakeTiers(){
	var newRound = true;
	var nteams = 0;
	for(var i in teamTimeGlad){
		var gladalive = 0;
		for(var j in teamTimeGlad[i].glads){
			if (!teamTimeGlad[i].glads[j].dead)
				gladalive++;
		}
		if (gladalive > 0)
			nteams++;
		else
			teamTimeGlad[i].inactive = true;
		
		if (teamTimeGlad[i].time == null && i != 'find'){
			newRound = false;
		}
	}
	if (newRound)
		setWinners();
	else
		nteams = teamTimeGlad.length;
	
	var lastbnum = tiers[tiers.length-1].bnum;
	tiers = new Array();
	var ntiers = Math.ceil(nteams/5);
	for (var i=0 ; i<ntiers ; i++){
		tiers[i] = new Array();
		tiers[i].bnum = lastbnum + i + 1;
		tiers[i].teams = new Array();
	}
	
	//console.log(nteams);
	var remteams = nteams;
	var remtiers = ntiers;
	var s = 0;
	for (var j=0 ; j<ntiers ; j++){
		var tintier = Math.ceil(remteams / remtiers);
		//console.log(tintier);
		
		var i = 0;
		while (i<tintier){
			var n = nteams - remteams;
			var teamname = teamTimeGlad[n+i+s].team;
			if (teamTimeGlad[n+i+s].inactive && newRound){
				s++;
			}
			else{
				tiers[j].teams[teamname] = new Array();
				tiers[j].teams[teamname].code = new Array();
				tiers[j].teams[teamname].dead = new Array();
				for (k in teamTimeGlad[n+i+s].glads){
					var id = teamTimeGlad[n+i+s].glads[k].code.file.upload.uuid;
					tiers[j].teams[teamname].code[id] = teamTimeGlad[n+i+s].glads[k].code;
					tiers[j].teams[teamname].dead[id] = teamTimeGlad[n+i+s].glads[k].dead;
				}
				i++;
			}
		}
		remteams -= tintier;
		remtiers--;
	}
	rounds.push(tiers);
	//console.log(rounds);
	
	return nteams;
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function startBattle(code, tries){
	var msg = ["Executando simulação...","Aguardando resposta do servidor"];
	if (tries)
		msg = ["Erro dos dados recebidos","Realizando nova tentativa..."];
	var progbtn = new progressButton($('#b-select'), msg);

	var glads = [];
	var gladReady = 0;
	for (var i in code){
		
		getGladFromCode(code[i].code, code[i].team).then( function(data){
			glads.push(data);
			gladReady++;
		});
	}
	
	var gladWait = setInterval( function(){
		if (gladReady == Object.keys(code).length){
			clearInterval(gladWait);
			//console.log(glads);
			runSimulation(glads).then( function(data){
				//console.log(JSON.stringify(data));
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
							window.location.href = "https://gladcode.tk/playback.php?log="+ hash +"&t="+ tournHash;
							$('#b-continue').click();
						});
						progbtn.kill();
						startloop = true;
						orderDeaths(log);
						tier_select++;
					});
				}
			});				
		}
	}, 10);	
}

function orderDeaths(simulation){
	var steps = [];
	for (var i in simulation){
		$.extend( true, json, simulation[i] ); //merge json objects
		steps.push(JSON.parse(JSON.stringify(json)));
	}
	json = steps;
	//console.log(teamTimeGlad);
	
	//coloca dead em todo mundo
	for (var g in json[0].glads){
		var team = json[0].glads[g].user.replace(/#/g, " ");
		var name = json[0].glads[g].name.replace(/#/g, " ");
		teamTimeGlad.find(team).glads[name].dead = true;
	}
	//atualiza o tempo atual em todos times
	for (var i in json){
		for (var g in json[i].glads){
			var team = json[i].glads[g].user.replace(/#/g, " ");
			if (json[i].glads[g].hp > 0){
				teamTimeGlad.find(team).time = json[i].simtime;
			}
		}
	}
	
	//pra achar o vencedor, pega quem tem o tempo de morte igual ao tempo de fim
	var i = json.length-1;
	var winner = {"id": "tie", "hp": 0};
	for (var g in json[i].glads){
		var end = json[i].simtime;
		var team = json[i].glads[g].user.replace(/#/g, " ");
		var death = teamTimeGlad.find(team).time;
		if (end == death && json[i].glads[g].hp > 0){
			if (!winner.id || winner.hp < json[i].glads[g].hp){
				winner.id = g;
				winner.hp = json[i].glads[g].hp;
			}
			else {
				winner.id = "tie";
			}
		}
	}

	//coloca 1000+time no tempo do vencedor e tira o status morte dele.
	if (winner.id != "tie"){
		for (var g in json[i].glads){
			var team = json[i].glads[g].user.replace(/#/g, " ");
			if (g == winner.id){
				teamTimeGlad.find(team).time += 1000;
				var name = json[i].glads[g].name.replace(/#/g, " ");
				delete teamTimeGlad.find(team).glads[name].dead;
			}
		}
	}
	
	if ((tier_select+1) % tiers.length == 0){
		teamTimeGlad.sort(function(a, b) {
			if (a.time == null)
				return -1;
			else if (b.time == null)
				return 1;
			else if (a.time > b.time)
				return -1;
			else
				return 1;
		});
	}
	
	saveTournment(tiers[tier_select].bnum + 1);
	
	//console.log(teamTimeGlad);
}

function tournmentEnd(teamsleft){
	$('#code-selection').html("<p id='text-intro'>O torneio chegou ao fim e temos os seguintes vencedores</p><div id='tiers-container'><div class='tier'><div class='title'><span>Classificação</span></div></div></div>");
	winners.reverse();
	for (var i = 0 ; i < winners.length ; i++){
		$('#tiers-container .tier').last().append("<div class='team win'><div class='icon'></div><span>"+ winners[i] +"</span></div>");
		$('#tiers-container .tier .team').last().hide();
		if (i == 0 || (i == 1 && teamsleft == 0)){
			$('#tiers-container .tier .team').last().addClass('gold');
			$('#tiers-container .tier .team.gold .icon').append("<img src='icon/gold-medal.png'>");
		}
		else if (i == 1 || (i == 2 && teamsleft == 0)){
			$('#tiers-container .tier .team').last().addClass('silver');
			$('#tiers-container .tier .team.silver .icon').append("<img src='icon/silver-medal.png'>");
		}
		else if (i == 2 || (i == 3 && teamsleft == 0)){
			$('#tiers-container .tier .team').last().addClass('bronze');
			$('#tiers-container .tier .team.bronze .icon').append("<img src='icon/bronze-medal.png'>");
		}
		else{
			$('#tiers-container .tier .team').last().addClass('none');
			$('#tiers-container .tier .team.none .icon').last().html(i+1 +"º");
		}
	}
	showTeam(0);
	
	function showTeam(i){
		var fadetime = 1000;
		if ($('#tiers-container .tier .team').eq(i).length){
			setTimeout( function() {
				$('#tiers-container .tier .team').eq(i).fadeIn(fadetime, function(){
					if (i < $('#tiers-container .tier .team').length - 1)
						showTeam(i+1);
					else
						return;
				});
			},fadetime);
		}
		else{
			return;
		}
	}
}

function setWinners(){
	var alive = 0;
	var namealive;
	for (var i=teamTimeGlad.length-1 ; i>=0 ; i--){
		if (teamTimeGlad[i].inactive && winners.indexOf(teamTimeGlad[i].team) == -1){
			winners.push(teamTimeGlad[i].team);
		}
		else{
			alive++;
			namealive = teamTimeGlad[i].team
		}
	}
	if (alive == 1){
		winners.push(namealive);
	}
	//console.log(winners);
}

