var tileD = 32;
var screenW = tileD * 29;
var screenH = tileD * 31;
var screenRatio = screenW/screenH;
var arenaX1 = tileD * 2;
var arenaY1 = tileD * 5;
var arenaD = screenW - (tileD * 2 + tileD * 2);
var arenaRate = arenaD / 25;
var nglad = 0;
var json, loadglads = false, startsim = false;
var loadCache = false;
var stab, gender;
var simtimenow;

var actionlist = [
	{'name': 'fireball', 'value': 0, 'animation': 'cast'},
	{'name': 'teleport', 'value': 1, 'animation': 'cast'},
	{'name': 'charge', 'value': 2, 'animation': 'walk'},
	{'name': 'block', 'value': 3, 'animation': 'cast'},
	{'name': 'assassinate', 'value': 4, 'animation': 'shoot'},
	{'name': 'ambush', 'value': 5, 'animation': 'cast'},
	{'name': 'melee', 'value': 6, 'animation': 'melee'},
	{'name': 'ranged', 'value': 7, 'animation': 'shoot'},
	{'name': 'movement', 'value': 8, 'animation': 'walk'},
	{'name': 'waiting', 'value': 9, 'animation': 'none'},
	{'name': 'none', 'value': 10, 'animation': 'none'}
];
var animationlist = {
	'walk': {
		'start': 8, 'frames': 9},
	'cast': {
		'start': 0, 'frames': 7},
	'shoot': {
		'start': 16, 'frames': 10},
	'stab': {
		'start': 4, 'frames': 8},
	'slash': {
		'start': 12, 'frames': 6},
	'die': {
		'start': 20, 'frames': 6},
};

function phaser_update(step){
	json = step;
	if (nglad == 0 && loadCache)
		nglad = json.glads.length;
}


var game;
function load_phaser(){
	if (game)
		game.destroy();
	game = new Phaser.Game($(document).width(), $(document).height(), Phaser.AUTO, 'canvas-div', { preload: preload, create: create, update: update, render: render });
}

function preload() {
	//
	for (i=0 ; i < hashes.length ; i++){
		game.cache.addSpriteSheet('glad'+i, null, hashes[i], 192, 192);
	}	

	game.load.image("background", 'res/map3.png');
    game.load.image('background_top', 'res/map3_top.png');
    game.load.image('background_walls', 'res/map3_walls.png');
    game.load.image('arrow', 'res/arrow.png');
	game.load.image('mask', 'res/mask.png');
	game.load.spritesheet('fireball', 'res/fireball.png', 64, 64);
	game.load.spritesheet('explosion', 'res/explosion.png', 256, 128);
	game.load.spritesheet('stun', 'res/stun.png', 96, 64);
	game.load.spritesheet('level', 'res/level.png', 192, 192);
	game.load.spritesheet('shield', 'res/shield.png', 192, 192);
	game.load.audio('music', 'res/audio/adventure.mp3');
	game.load.audio('ending', 'res/audio/ending.mp3');
	game.load.audio('victory', 'res/audio/victory.mp3');
	game.load.audio('fireball', 'res/audio/fireball.mp3');
	game.load.audio('explosion', 'res/audio/explosion.mp3');
	game.load.audio('teleport', 'res/audio/teleport.mp3');
	game.load.audio('charge_male', 'res/audio/charge_male.mp3');
	game.load.audio('charge_female', 'res/audio/charge_female.mp3');
	game.load.audio('block', 'res/audio/block.mp3');
	game.load.audio('assassinate', 'res/audio/assassinate.mp3');
	game.load.audio('ambush', 'res/audio/ambush.mp3');
	game.load.audio('ranged', 'res/audio/ranged.mp3');
	game.load.audio('arrow_hit', 'res/audio/arrow_hit.mp3');
	game.load.audio('stun', 'res/audio/stun.mp3');
	game.load.audio('melee', 'res/audio/melee.mp3');
	game.load.audio('lvlup', 'res/audio/lvlup.mp3');
	game.load.audio('death_male', 'res/audio/death_male.mp3');
	game.load.audio('death_female', 'res/audio/death_female.mp3');
	
	game.load.start();
	loadCache = true;
	resize();
	$('#canvas-div canvas').focus();
	game.camera.focusOnXY(screenW * game.camera.scale.x / 2, screenH * game.camera.scale.y / 2);
}

var background, back_top, back_walls;
var layer_walls, layer_ground, layer_poison;

var sprite = new Array();
var sproj = new Array();
var gladArray = new Array();
var projArray = new Array();
var music, ending, victory;
var clones = new Array();

var poison = (Math.sqrt(2*Math.pow(arenaD/2,2)) / arenaRate);
var mask;
var groupglad;

var bar = {};
function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);
	//$('#canvas-div canvas').css('touch-action','pan-y');

	background = game.add.image(0, 0, 'background');
	back_top = game.add.image(0, 0, 'background_top');
	back_walls = game.add.image(0, 0, 'background_walls');

	mask = game.add.image(arenaX1 + arenaD/2 + tileD/2, arenaY1 + arenaD/2 + tileD/2, 'mask');
	mask.anchor.setTo(0.5, 0.5);
	mask.scale.set(arenaRate);
	mask.alpha = 0.3;

	groupglad = game.add.group();
	
	groupglad.add(background);
	groupglad.add(back_top);
	groupglad.add(back_walls);
	groupglad.add(mask);
	
	music = game.add.audio('music', 1, true);
	ending = game.add.audio('ending');
	victory = game.add.audio('victory');

	game.input.mouse.onMouseWheel = zoomWheel;
	
	game.input.onDown.add( function(input){
		if (input.button === Phaser.Mouse.LEFT_BUTTON)
			game.input.mouse.drag = true;
	}, this);
	game.input.mouse.drag = false;
	game.input.onUp.add( function(mouse){
		game.input.mouse.drag = false;
	}, this);

	var graphics = {};
	graphics.back = game.add.graphics(0,0);
	graphics.back.beginFill(0x000000);
	graphics.back.drawRect(-100,0,30,9);

	graphics.hp = game.add.graphics(0,0);
	graphics.hp.beginFill(0xff0000);
	graphics.hp.drawRect(-100,0,30,5);
	
	graphics.ap = game.add.graphics(0,0);
	graphics.ap.beginFill(0x0000ff);
	graphics.ap.drawRect(-100,0,30,4);

	bar.back = game.add.sprite(-100,0, graphics.back.generateTexture());
	bar.back.alpha = 0.15;
	bar.hp = game.add.sprite(-100,0, graphics.hp.generateTexture());
	bar.hp.alpha = 0.4;
	bar.ap = game.add.sprite(-100,0, graphics.ap.generateTexture());
	bar.ap.alpha = 0.4;
}

function update() {
	if (json.poison){
		poison = parseFloat(json.poison);
		
		var rad = poison * arenaRate / Math.sqrt(2*Math.pow(arenaD/2,2));
		var cs = arenaRate * rad * 0.42;
		mask.scale.setTo(cs);
	}
	if (nglad > 0 && !loadglads) {
		loadglads = true;
		for (i=0 ; i<nglad ; i++){
			//console.log(json.glads[i].x);
			sprite[i] = game.add.sprite(arenaX1 + parseFloat(json.glads[i].x) * arenaRate, arenaY1 + parseFloat(json.glads[i].y) * arenaRate, 'glad'+newindex[i]);
			sprite[i].anchor.setTo(0.5, 0.5);
			
			createAnimation(i, 'walk');
			createAnimation(i, 'melee');
			createAnimation(i, 'slash');
			createAnimation(i, 'stab');
			createAnimation(i, 'shoot');
			createAnimation(i, 'cast');
			
			sprite[i].animations.add('die', arrayFill(260,265), 10, false);
			
			groupglad.add(sprite[i]);
						
			gladArray[i] = {
				'x': 0,
				'y': 0,
				'hp': parseFloat(json.glads[i].hp),
				'alive': true,
				'fade': 0,
				'clone': null,
				'invisible': false,
				'stun': false,
				'assassinate': false,
				'level': 1,
				'block': false,
				'charge': false,
				'poison': false,
				'xp': parseInt(json.glads[i].xp),
				'time': false,
			};

			gladArray[i].bars = game.add.bitmapData(game.width, game.height);
			gladArray[i].bars.addToWorld();
		}
		music.play();
		music.volume = 0.1;
		//game.camera.follow(sprite[0]);
	}
	else if (sprite.length > 0){
		if (!startsim){
			startsim = true;
			$('#fog').remove();
			$('#canvas-container').css({'opacity':1});
			resize();	
			pausesim = false;
		}

		if (json && simtimenow != json.simtime){			
			simtimenow = json.simtime;
			for (i=0 ; i<nglad ; i++){
				var x = parseFloat(json.glads[i].x);
				var y = parseFloat(json.glads[i].y);

				var action = parseInt(json.glads[i].action);
				var level = parseInt(json.glads[i].lvl);
				var xp = parseInt(json.glads[i].xp);
				var head = parseFloat(json.glads[i].head);
				var hp = parseFloat(json.glads[i].hp);
				var lockedfor = parseFloat(json.glads[i].lockedfor);
				
				showMessageBaloon(i);

				sprite[i].x = arenaX1 + x * arenaRate;
				sprite[i].y = arenaY1 + y * arenaRate;
				
				showHpApBars(i);

				if (level > gladArray[i].level){
					gladArray[i].level = level;
					var lvlup = game.add.sprite(sprite[i].x, sprite[i].y, 'level');
					lvlup.anchor.setTo(0.5);
					lvlup.scale.setTo(0.4);
					groupglad.add(lvlup);
					lvlup.animations.add('levelup', null, 15, false);
					lvlup.animations.play('levelup', null, false, true);
					game.add.audio('lvlup').play();
				}
				
				if (hp != gladArray[i].hp) {
					//explodiu na cara
					if (actionlist[action].name == 'fireball' && json.glads[i].buffs.burn.timeleft > 0.1){
						var fire = game.add.sprite(sprite[i].x, sprite[i].y, 'explosion');
						fire.anchor.setTo(0.5, 0.5);
						fire.alpha = 0.5;
						fire.width = 5 * arenaRate;
						fire.height = 3 * arenaRate;
						fire.animations.add('explode', null, 15, true);
						fire.animations.play('explode', null, false, true);
						game.add.audio('explosion').play();
					}
						
					gladArray[i].hp = hp;
				}
				
				if (hp <= 0){
					if (gladArray[i].alive){
						sprite[i].animations.play('die');
						if (gender[newindex[i]] == "male"){
							game.add.audio('death_male').play();
						}
						else{
							game.add.audio('death_female').play();
						}
					}
					gladArray[i].alive = false;
				}
				else {
					gladArray[i].alive = true;
					var anim = actionlist[action].animation + '-' + getActionDirection(head);
					if (actionlist[action].name == "movement")
						sprite[i].animations.play(anim);
					else if (actionlist[action].name == "charge"){
						if (!gladArray[i].charge){
							sprite[i].animations.stop();
							sprite[i].animations.play(anim, 50, true);
							gladArray[i].charge = true;
							if (gender[newindex[i]] == "male"){
								game.add.audio('charge_male').play();
							}
							else{
								game.add.audio('charge_female').play();
							}
						}
					}
					else if (actionlist[action] && actionlist[action].animation != 'none' && gladArray[i].time != json.simtime){
						sprite[i].animations.play(anim, Math.max(1/((lockedfor - 0.1)/animationlist[actionlist[action].animation].frames*2), 10));
						gladArray[i].time = json.simtime;
						
						if (actionlist[action].name == "teleport" && gladArray[i].fade == 0){
							gladArray[i].fade = 1;
							gladArray[i].x = sprite[i].x;
							gladArray[i].y = sprite[i].y;
							game.add.audio('teleport').play();
						}
						if (actionlist[action].name == "assassinate"){
							gladArray[i].assassinate = true;
						}
						if (actionlist[action].name == "block"){
							gladArray[i].block = false;
						}
						if (actionlist[action].name == "ranged"){
							game.add.audio('ranged').play();
						}
						if (actionlist[action].name == "melee"){
							game.add.audio('melee').play();
						}
							
					}
				}
				
				//ambush
				if (json.glads[i].buffs.invisible.timeleft > 0.1)
					gladArray[i].invisible = true;
				else
					gladArray[i].invisible = false;
				
				if (gladArray[i].invisible){
					if (sprite[i].alpha >= 1)
						game.add.audio('ambush').play();
					if (sprite[i].alpha > 0.3)
						sprite[i].alpha -= 0.05;
				}
				else if (sprite[i].alpha < 1)
						sprite[i].alpha += 0.05;
					
				//fade do teleport
				if (gladArray[i].fade == 1 && (gladArray[i].x != sprite[i].x || gladArray[i].y != sprite[i].y) ){
					clones.push(game.add.sprite(gladArray[i].x, gladArray[i].y, sprite[i].key, sprite[i].frame));
					clones[clones.length-1].anchor.setTo(0.5, 0.5);
					clones[clones.length-1].alpha = 1;
					sprite[i].alpha = 0;

					gladArray[i].fade = 2;
				}
				else if (gladArray[i].fade == 2){
					sprite[i].alpha += 0.05;
					if (sprite[i].alpha >= 1){
						sprite[i].alpha = 1;
						gladArray[i].fade = 0;
					}
				}

				//clone do teleport
				for (j in clones){
					clones[j].alpha -= 0.05;
					if (clones[j].alpha <= 0){
						clones[j].destroy();
						clones.splice(j,1);
					}
				}
					
				//stun
				if (!gladArray[i].stun && json.glads[i].buffs.stun.timeleft > 0.1 && gladArray[i].alive){
					gladArray[i].stun = game.add.sprite(sprite[i].x, sprite[i].y, 'stun');
					gladArray[i].stun.anchor.setTo(0.5, 1);
					gladArray[i].stun.scale.setTo(0.6);
					groupglad.add(gladArray[i].stun);
					gladArray[i].stun.animations.add('stun', null, 15, true);
					gladArray[i].stun.animations.play('stun', null, true, false);
					game.add.audio('stun').play();
				}
				else if (gladArray[i].stun && (json.glads[i].buffs.stun.timeleft <= 0.1 || !gladArray[i].alive)){
					gladArray[i].stun.destroy();
					gladArray[i].stun = false;
				}
				
				//block
				if (!gladArray[i].block && json.glads[i].buffs.resist.timeleft > 0.1){
					gladArray[i].block = true;
					var shield = game.add.sprite(sprite[i].x, sprite[i].y, 'shield');
					shield.anchor.setTo(0.5);
					shield.scale.setTo(0.4);
					groupglad.add(shield);
					shield.animations.add('shield', null, 15, false);
					shield.animations.play('shield', null, false, true);
					shield.alpha = 0.5;
					game.add.audio('block').play();
				}
				else if (gladArray[i].block && json.glads[i].buffs.resist.timeleft <= 0.1){
					gladArray[i].block = false;
				}
				
				//charge
				if (gladArray[i].charge) {
					if (xp != gladArray[i].xp) {
						sprite[i].animations.currentAnim.speed = 15;
						if (stab[newindex[i]] == "0")
							var anim = 'slash-' + getActionDirection(head);
						else
							var anim = 'stab-' + getActionDirection(head);
						sprite[i].animations.play(anim, 20);
						game.add.audio('melee').play();
					}
					else if (actionlist[action].name != "charge"){
						sprite[i].animations.currentAnim.speed = 15;
						gladArray[i].charge = false;
					}
				}
				
				//poison
				if (Math.sqrt(Math.pow(12.5 - x, 2) + Math.pow(12.5 - y, 2)) >= poison )
					gladArray[i].poison = true;
				else
					gladArray[i].poison = false;
					
				//aplica os tints
				if (json.glads[i].buffs.burn && json.glads[i].buffs.burn.timeleft > 0.1)
					sprite[i].tint = 0xFFB072;
				else if (gladArray[i].poison)
					sprite[i].tint = 0x96FD96;
				else if (gladArray[i].block)
					sprite[i].tint = 0xFFE533;
				else
					sprite[i].tint = 0xFFFFFF;
				
				gladArray[i].xp = xp;
				
				if ($( "#time" ).slider("value") != parseFloat(json.simtime) * 10){
					$( "#time" ).slider("value", parseFloat(json.simtime) * 10);
				}
				
				update_ui(json);
			}
		}
		debugTimer();
	}
	
	var i=0;
	if (json.projectiles && json.projectiles.length > 0) {

		var nproj = json.projectiles.length;
		for (i=0 ; i<nproj ; i++){
			var id = json.projectiles[i].id;
			var type = json.projectiles[i].type;
			var j = findProj(id);
			if (j == -1){
				var spr;
				if (json.projectiles[i].type == 0){ //ranged attack
					spr = game.add.sprite(0, 0, 'arrow');
				}
				else if (json.projectiles[i].type == 1){ //fireball
					spr = game.add.sprite(0, 0, 'fireball');
					spr.animations.add('fireball', arrayFill(0,7), 15, true);
					spr.animations.play('fireball');
					game.add.audio('fireball').play();
				}
				else if (json.projectiles[i].type == 2){ //stun
					spr = game.add.sprite(0, 0, 'arrow');
					spr.tint = 0x00FF00;
				}
				
				//console.log(json.simtime +'-'+ json.projectiles[i].owner);
				if (gladArray[json.projectiles[i].owner] && gladArray[json.projectiles[i].owner].assassinate){
					gladArray[json.projectiles[i].owner].assassinate = false;
					spr = game.add.sprite(0, 0, 'arrow');
					spr.tint = 0xFF0000;
					game.add.audio('assassinate').play();
				}
								
				spr.anchor.setTo(0.5, 0.5);
				j = sproj.length;
				sproj.push({'sprite': spr, 'active': true, 'id': id, 'type': type});
			}
			
			sproj[j].sprite.x = arenaX1 + parseFloat(json.projectiles[i].x) * arenaRate;
			sproj[j].sprite.y = arenaY1 + parseFloat(json.projectiles[i].y) * arenaRate;
			sproj[j].sprite.angle = parseFloat(json.projectiles[i].head) + 90;
			sproj[j].active = true;
		}
	}
	
	for (x in sproj){
		if (sproj[x].active === false) {
			if (sproj[x].type == 1){
				var fire = game.add.sprite(sproj[x].sprite.x, sproj[x].sprite.y, 'explosion');
				fire.anchor.setTo(0.5, 0.5);
				fire.alpha = 0.5;
				fire.width = 5 * arenaRate;
				fire.height = 3 * arenaRate;
				fire.animations.add('explode', null, 15, true);
				fire.animations.play('explode', null, false, true);
				game.add.audio('explosion').play();
			}
			else{
				game.add.audio('arrow_hit').play();
			}
			
			sproj[x].sprite.destroy();
			sproj.splice(x,1);
		}
		else
			sproj[x].active = false;
	}
	
	groupglad.sort('y', Phaser.Group.SORT_ASCENDING);
	for (var i=0 ; i<nglad ; i++){
		if (!gladArray[i].alive)
			groupglad.sendToBack(sprite[i]);
	}
	
	groupglad.sendToBack(mask);
	groupglad.sendToBack(background);
	groupglad.bringToTop(back_top);

	if (game.input.mouse.drag){
		if (game.camera.target){
			$('.ui-glad').removeClass('follow');
			game.camera.unfollow();
		}
		game.camera.view.y -= game.input.speed.y;
		game.camera.view.x -= game.input.speed.x;
	}

	if (game.input.keyboard.isDown(Phaser.Keyboard.NUMPAD_ADD) || game.input.keyboard.isDown(Phaser.Keyboard.EQUALS))
		zoomWheel({deltaY: -1});

	if (game.input.keyboard.isDown(Phaser.Keyboard.NUMPAD_SUBTRACT) || game.input.keyboard.isDown(Phaser.Keyboard.UNDERSCORE))
		zoomWheel({deltaY: 1});

	if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT))
		game.camera.view.x -= 10;

	if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT))
		game.camera.view.x += 10;

	if (game.input.keyboard.isDown(Phaser.Keyboard.UP))
		game.camera.view.y -= 10;

	if (game.input.keyboard.isDown(Phaser.Keyboard.DOWN))
		game.camera.view.y += 10;

}

function render() {
}

function findProj(id){
	for (i in sproj){
		if (sproj[i].id == id)
			return i;
	}
	return -1;
}

function arrayFill(s,e){
	a = new Array();
	for(var i=s ; i<=e ; i++)
		a.push(i);
	return a;
}

function getActionDirection(head){
	if (head >= 45 && head <= 135)
		return 'right';
	else if (head > 135 && head < 225)
		return 'down';
	else if (head >= 225 && head <= 315)
		return 'left';
	else
		return 'up';
}

function createAnimation(glad, action){
	var name;
	var sufix = ['-up', '-left', '-down', '-right'];
	if (action == "melee"){
		if (stab[newindex[glad]] == "0")
			name = 'slash';
		else
			name = 'stab';
		animationlist.melee = animationlist[name];
	}
	else
		name = action;
	for (var i=0 ; i<4 ; i++) {
		var start =  (animationlist[name].start + i) * 13;
		var end = start + animationlist[name].frames - 1;
		sprite[glad].animations.add(action + sufix[i], arrayFill(start, end), 15, false);
	}
}

function update_ui(json){
	var nglad = json.glads.length;
	for (i=0 ; i<nglad ; i++){
		var name = json.glads[i].name;
		var STR = json.glads[i].STR;
		var AGI = json.glads[i].AGI;
		var INT = json.glads[i].INT;
		var hp = parseInt(json.glads[i].hp);
		var maxhp = parseInt(json.glads[i].maxhp);
		var ap = parseInt(json.glads[i].ap);
		var maxap = parseInt(json.glads[i].maxap);
		var lvl = parseInt(json.glads[i].lvl);
		var xp = parseInt(json.glads[i].xp);
		var burn = parseFloat(json.glads[i].buffs.burn.timeleft);
		var resist = parseFloat(json.glads[i].buffs.resist.timeleft);
		var stun = parseFloat(json.glads[i].buffs.stun.timeleft);
		var invisible = parseFloat(json.glads[i].buffs.invisible.timeleft);
		var speed = parseFloat(json.glads[i].buffs.movement.timeleft);
		if (gladArray[i])
			var poison = gladArray[i].poison;
		
		if ($('.glad-name span').eq(i).html() == ""){
			$('.glad-name span').eq(i).html(name);
			$('.glad-portrait').eq(i).append(getSpriteThumb(hashes[newindex[i]],'walk','down'));
		}
		
		if ($('.lvl-value span').eq(i).html() != lvl){
			$('.lvl-value span').eq(i).html(lvl);
			$('.glad-str span').eq(i).html(STR);
			$('.glad-agi span').eq(i).html(AGI);
			$('.glad-int span').eq(i).html(INT);
			
			$('.lvl-value').eq(i).addClass('up');
			let j = i;
			setTimeout( function(){
				$('.lvl-value').eq(j).removeClass('up');
			}, 500);


		}
		
		if ($('.xp-bar .filled').eq(i).width() != xp)
			$('.xp-bar .filled').eq(i).height(xp +'%');
		
		if ($('.hp-bar .filled').eq(i).width() != hp/maxhp*100)
			$('.hp-bar .filled').eq(i).width(hp/maxhp*100 +'%');
		
		if (hp <= 0)
			$('.ui-glad').eq(i).addClass('dead');
		else if ($('.ui-glad').eq(i).hasClass('dead'))
			$('.ui-glad').eq(i).removeClass('dead')
		
		$('.ap-bar .filled').eq(i).width(ap/maxap*100 +'%');
		
		if (burn)
			$('.buff-burn').eq(i).addClass('active');
		else if ($('.buff-burn').eq(i).hasClass('active'))
			$('.buff-burn').eq(i).removeClass('active');
		
		if (resist)
			$('.buff-resist').eq(i).addClass('active');
		else if ($('.buff-resist').eq(i).hasClass('active'))
			$('.buff-resist').eq(i).removeClass('active');
		
		if (stun)
			$('.buff-stun').eq(i).addClass('active');
		else if ($('.buff-stun').eq(i).hasClass('active'))
			$('.buff-stun').eq(i).removeClass('active');

		if (invisible)
			$('.buff-invisible').eq(i).addClass('active');
		else if ($('.buff-invisible').eq(i).hasClass('active'))
			$('.buff-invisible').eq(i).removeClass('active');

		if (speed)
			$('.buff-speed').eq(i).addClass('active');
		else if ($('.buff-speed').eq(i).hasClass('active'))
			$('.buff-speed').eq(i).removeClass('active');

		if (poison)
			$('.buff-poison').eq(i).addClass('active');
		else if ($('.buff-poison').eq(i).hasClass('active'))
			$('.buff-poison').eq(i).removeClass('active');
	}
	
}

var showFPS = false;
var oldTime = null;
var avgFPS = 0, contFPS = 0;
function debugTimer(){
	var intFPS;
	if (showFPS){
		if (!oldTime)
			oldTime = new Date();
		else{
			var newTime = new Date();
			avgFPS += newTime - oldTime;
			contFPS++;
			oldTime = newTime;
		}
		if (!$('#fps').length){
			$('#canvas-container').append("<div id='fps'></fps>")
			intFPS = setInterval( function(){
				$('#fps').html("FPS: "+ parseFloat(1000/(avgFPS/contFPS)).toFixed(1));
				avgFPS = 0;
				contFPS = 0;
			}, 1000);
		}
	}
	else if ($('#fps').length){
			$('#fps').remove();
			clearInterval(intFPS);
	}
}

$(window).keydown(function(event) {
	if(event.keyCode == Phaser.Keyboard.F)
		showFPS = (showFPS + 1) % 2;

	if(event.keyCode == Phaser.Keyboard.B)
		showbars = (showbars + 1) % 2;

	if(event.keyCode == Phaser.Keyboard.M){
		if ($('#ui-container').css('display') == 'flex')
			$('#ui-container').fadeOut();
		else
			$('#ui-container').fadeIn();
	}

	if(event.keyCode == Phaser.Keyboard.SPACEBAR)
		$('#pause').click();

	if(event.keyCode == Phaser.Keyboard.A)
		$('#back-step').click();

	if(event.keyCode == Phaser.Keyboard.D)
		$('#fowd-step').click();

	if(event.keyCode >= Phaser.Keyboard.ONE && event.keyCode <= Phaser.Keyboard.FIVE){
		var i = event.keyCode - Phaser.Keyboard.ONE;
		$('.ui-glad').eq(i).click();
	}

});

function getGladPositionOnCanvas(gladid){
	var ph = (screenH * game.camera.scale.y) / (25 + 6);
	var pw = (screenW * game.camera.scale.x) / (25 + 4);
	
	var x = pw*2 + pw * parseFloat(json.glads[gladid].x);
	var y = ph*5 + ph * parseFloat(json.glads[gladid].y);
	var ct = $('#canvas-div canvas').position().top - game.camera.view.y;
	var cl = $('#canvas-div canvas').position().left;
	return {x: x+cl, y: y+ct};
}

function showMessageBaloon(gladid){
	var message = json.glads[gladid].message;

	if (message != "" && json.glads[gladid].hp > 0){
		var gpos = getGladPositionOnCanvas(gladid);

		if (!$('.baloon.glad-'+ gladid).length)
			$('#canvas-div').append("<div class='baloon glad-"+ gladid +"'>"+ message +"</div>");

		var baloon = $('.baloon.glad-'+ gladid);
		var x = gpos.x + 15 * game.camera.scale.x;
		var y = gpos.y - 15 * game.camera.scale.y - baloon.outerHeight();
		baloon.css({'top': y, 'left': x});
		if (baloon.width() < 200 && baloon.height() >= 50){
			baloon.css({'left': x-230});
			baloon.addClass('left');
		}
		else if (baloon.hasClass('left'))
			baloon.removeClass('left');
	}
	else{
		$('.baloon.glad-'+ gladid).fadeOut( function(){
			$(this).remove();
		});
	}
	
}

var showbars = true;
function showHpApBars(gladid){
	if (gladArray[gladid].bars)
		gladArray[gladid].bars.clear();

	if (showbars && json.glads[gladid].hp > 0){
		var x = arenaX1 + json.glads[gladid].x * arenaRate;
		var y = arenaY1 + json.glads[gladid].y * arenaRate
		var hp = parseFloat(json.glads[gladid].hp);
		var maxhp = parseFloat(json.glads[gladid].maxhp);
		var ap = parseFloat(json.glads[gladid].ap);
		var maxap = parseFloat(json.glads[gladid].maxap);
		var barsize = 30;

		gladArray[gladid].bars.draw(bar.back, x + -barsize/2, y + -35, barsize, 9);
		gladArray[gladid].bars.draw(bar.hp, x + -barsize/2, y + -35, hp/maxhp * barsize, 5);
		gladArray[gladid].bars.draw(bar.ap, x + -barsize/2, y + -30, ap/maxap * barsize, 4);
		
	}
}

function zoomWheel(wheel){
	var scaleValue = 0.03;
	var delta = wheel.deltaY / Math.abs(wheel.deltaY) * scaleValue;
	var canvasW = screenW * (game.camera.scale.x - delta);
	var canvasH = screenH * (game.camera.scale.y - delta);

	var bind = null;
	if ($(window).width() > $(window).height()){
		if (canvasW >= $(window).width())
			bind = "width";
		else if (canvasH <= $(window).height())
			bind = "height";
		else
			bind = "none";
	}
	else{
		if (canvasH >= $(window).height())
			bind = "height";
		else if (canvasW <= $(window).width())
			bind = "width";
		else
			bind = "none";
	}

	if (bind == "width"){
		canvasW = $(window).width();
		canvasH = $(window).width() * screenH/screenW;
		game.camera.scale.x = $(window).width() / screenW;
		game.camera.scale.y = $(window).width() / screenW;
	}
	else if (bind == "height"){
		canvasH = $(window).height();
		canvasW = $(window).height() * screenW/screenH;
		game.camera.scale.x = $(window).height() / screenH;
		game.camera.scale.y = $(window).height() / screenH;
	}
	else{
		game.camera.scale.x -= delta;
		game.camera.scale.y -= delta;
	}

	if (canvasW > $(window).width())
		canvasW = $(window).width();
	if (canvasH > $(window).height())
		canvasH = $(window).height();

	game.scale.setGameSize(canvasW, canvasH);
	game.camera.bounds.width = screenW;
	game.camera.bounds.height = screenH;

	if (bind == "none"){
		var sizeIncrease = screenH * scaleValue;
		if (game.input.y <= game.camera.height/3){
			game.camera.y -= sizeIncrease;
		}
		else if (game.input.y >= game.camera.height*2/3){
			game.camera.y += sizeIncrease;
		}
		else if (delta < 0){
			game.camera.y += sizeIncrease / 2;
		}
		else{
			game.camera.y -= sizeIncrease / 2;
		}
	}
}
