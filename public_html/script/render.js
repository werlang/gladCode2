import { assets } from "./assets.js"

const glads = {
    loaded: false,

    load: async function(info){
        glads.members = []

        const ready = []
        info.forEach((e,i) => {
            ready.push(new Promise(async resolve => {
                const skin = JSON.parse(e.skin)
                this.members.push({
                    id: i,
                    name: e.name,
                    user: e.user,
                    skin: skin,
                    spritesheet: await assets.fetchSpritesheet(e.skin),
                    gender: skin.some(s => s == 'female' ) ? 'female' : 'male',
                    move: skin.some(s => {
                        const item = assets.getImage(s)
                        return item.move && item.move == 'thrust'
                    }) ? 'stab' : 'slash',
                    str: e.STR,
                    agi: e.AGI,
                    int: e.INT,
                    hp: e.hp,
                    maxhp: e.maxhp,
                    ap: e.ap,
                    maxap: e.maxap
                })
                resolve(true)
            }))
        })

        Promise.all(ready).then(() => this.loaded = true)

        return true
    },

    wait: async function() {
        return this.loaded ? true : new Promise( resolve => setTimeout( async () => resolve(await this.wait()), 10))
    }
}

const render = {
    init: async function(){
        if (this.game){
            return true
        }

        this.game = new Phaser.Game({
            width: document.querySelector('body').offsetWidth,
            height: document.querySelector('body').offsetHeight,
            renderer: Phaser.WEBGL_MULTI,
            parent: 'canvas-div',
            antialias: true,
            multitexture: true,
            enableDebug: false,
            state: {
                preload: () => {
                    // TODO: arrumar o progress
                    this.game.load.onLoadStart.add(() => {
                        document.querySelector('#loadbar #status').innerHTML = "Preparando recursos"
                        document.querySelector('#loadbar #second .bar').style.width = '0px'
                    }, this)
                    this.game.load.onFileComplete.add( progress => {
                        document.querySelector('#loadbar #status').innerHTML = "Carregando recursos"
                        document.querySelector('#loadbar #second .bar').style.width = `${progress}%`
                        document.querySelector('#loadbar #main .bar').style.width = `${50 + progress / 2}%`
                    }, this)
                    this.game.load.onLoadComplete.add(() => document.querySelector('#loadbar #status').innerHTML = "Tudo pronto", this)

                    glads.wait().then( () => {
                        for (let i=0 ; i < glads.members.length ; i++){
                            try{
                                this.game.cache.addSpriteSheet(`glad${glads.members[i].id}`, null, glads.members[i].spritesheet, 192, 192)
                            }
                            catch(e){
                                console.log(e)
                                console.log(glads)
                            }
                        }	
                    })

                    this.game.load.atlas('atlas_crowd', 'res/atlas_crowd.png', 'res/atlas_crowd.json')
                    this.game.load.atlas('atlas_effects', 'res/atlas_effects.png', 'res/atlas_effects.json')
                    this.game.load.atlas('background', 'res/layers.png', 'res/layers.json')

                    this.game.load.audio('music', 'res/audio/adventure.mp3')
                    this.game.load.audio('ending', 'res/audio/ending.mp3')
                    this.game.load.audio('victory', 'res/audio/victory.mp3')
                    this.game.load.audio('fireball', 'res/audio/fireball.mp3')
                    this.game.load.audio('explosion', 'res/audio/explosion.mp3')
                    this.game.load.audio('teleport', 'res/audio/teleport.mp3')
                    this.game.load.audio('charge_male', 'res/audio/charge_male.mp3')
                    this.game.load.audio('charge_female', 'res/audio/charge_female.mp3')
                    this.game.load.audio('block', 'res/audio/block.mp3')
                    this.game.load.audio('assassinate', 'res/audio/assassinate.mp3')
                    this.game.load.audio('ambush', 'res/audio/ambush.mp3')
                    this.game.load.audio('ranged', 'res/audio/ranged.mp3')
                    this.game.load.audio('arrow_hit', 'res/audio/arrow_hit.mp3')
                    this.game.load.audio('stun', 'res/audio/stun.mp3')
                    this.game.load.audio('melee', 'res/audio/melee.mp3')
                    this.game.load.audio('lvlup', 'res/audio/lvlup.mp3')
                    this.game.load.audio('heal', 'res/audio/heal.mp3')
                    this.game.load.audio('mana', 'res/audio/mana.mp3')
                    this.game.load.audio('tonic', 'res/audio/tonic.mp3')
                    this.game.load.audio('elixir', 'res/audio/elixir.mp3')
                    this.game.load.audio('death_male', 'res/audio/death_male.mp3')
                    this.game.load.audio('death_female', 'res/audio/death_female.mp3')
                    this.game.load.spritesheet('dummy', 'res/glad.png', 64, 64)

                    this.game.load.start()
                    this.preload = true
                    // simulation.resize()
                    document.querySelector('#canvas-div canvas').focus()
                    
                    if (this.game.camera){
                        this.game.camera.focusOnXY(this.screenW * this.game.camera.scale.x / 2, this.screenH * this.game.camera.scale.y / 2)
                    }

                },

                create: () => {
                    this.game.physics.startSystem(Phaser.Physics.ARCADE);
                    
                    this.groups = {}
                    this.groups.glad = this.game.add.group();
                    this.groups.gas = this.game.add.group();
                    this.groups.npc = []
                    this.groups.npc.push(this.game.add.group());
                    this.groups.npc.push(this.game.add.group());

                    this.groups.glad.add(this.groups.gas);
                    this.groups.glad.add(this.groups.npc[0]);
                    this.groups.glad.add(this.groups.npc[1]);

                    this.layers = []
                    for (let i=0 ; i<=3 ; i++){
                        this.layers.push(this.game.add.image(0, 0, 'background', 'layer_'+ i));
                        this.groups.glad.add(this.layers[i]);
                    }
                    
                    this.music = {}
                    this.music.main = this.game.add.audio('music', 0.5, true);
                    this.music.ending = this.game.add.audio('ending');
                    this.music.victory = this.game.add.audio('victory');

                    window.addEventListener("wheel", event => {
                        if (event.path[0].closest('#canvas-div')){
                            zoomWheel({ deltaY: event.deltaY });
                        }
                    });

                    this.game.input.onDown.add( input => {
                        if (input.button === Phaser.Mouse.LEFT_BUTTON){
                            this.game.input.mouse.drag = true;
                        }
                    }, this);
                    this.game.input.mouse.drag = false;
                    this.game.input.onUp.add( () => {
                        this.game.input.mouse.drag = false;
                    }, this);

                    initBars();

                    fillPeople();
                    
                    for (let n in this.npc){
                        const v = this.npc[n]

                        const pos = getPosArena(v.x, v.y, true);
                        v.sprite = {};
                        
                        if (n.match(/royalguard\d/g) || n.match(/commonguard\d/g) || n.match(/archer\d/g)){
                            v.sprite.body = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');
                            v.sprite.gear = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');

                            if (n.match(/archer\d/g)){
                                const frames = [0,1,2,2,1,0];
                                const prefix = {
                                    body: `dummy_grey_${v.gender}_`,
                                    gear: `archer_${v.gender}_`
                                };
                                                
                                v.sprite.body.animations.add('guard', buildFrames(prefix.body, frames, v.start.body, 2), v.time, false);
                                v.sprite.gear.animations.add('guard', buildFrames(prefix.gear, frames, v.start.gear), v.time, false);
                                this.game.time.events.repeat(Phaser.Timer.SECOND * v.interval, 1000, function(){
                                    v.sprite.body.animations.play('guard');
                                    v.sprite.gear.animations.play('guard');
                                }, this);
                            }
                            else if (n.match(/royalguard\d/g)){
                                const frames = [-1,0,1,0];
                                const prefix = {
                                    body: `dummy_grey_${v.gender}_`,
                                    gear: `royal_${v.gender}_`
                                };

                                v.sprite.body.animations.add('guard', buildFrames(prefix.body, frames, v.start.body, 2), v.time, false);
                                v.sprite.gear.animations.add('guard', buildFrames(prefix.gear, frames, v.start.gear), v.time, false);
                                this.game.time.events.repeat(Phaser.Timer.SECOND * v.interval, 1000, function(){
                                    v.sprite.body.animations.play('guard');
                                    v.sprite.gear.animations.play('guard');
                                }, this);
                            }
                            else if (n.match(/commonguard\d/g)){
                                const frames = [0,1];
                                const prefix = {
                                    body: `dummy_grey_${v.gender}_`,
                                    gear: `guard_${v.gender}_`
                                };

                                v.sprite.body.animations.add('guard', buildFrames(prefix.body, frames, v.start.body, 2), v.time, true);
                                v.sprite.gear.animations.add('guard', buildFrames(prefix.gear, frames, v.start.gear, 0, {start: 0, end: 3}), v.time, true);
                                v.sprite.body.animations.play('guard');
                                v.sprite.gear.animations.play('guard');
                            }
                            v.sprite.body.animations.play('guard');
                            v.sprite.gear.animations.play('guard');
                        }
                        else if (n == 'king' || n == 'queen'){
                            v.sprite.body = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');

                            const frames = [0,1,0];
                            const prefix = {
                                body: `dummy_grey_${v.gender}_`,
                                gear: `guard_${v.gender}_`,
                                hair: `hair_${v.gender}_${v.hair.style}_0`
                            };

                            v.sprite.body.animations.add('watch', buildFrames(prefix.body, frames, v.start.body, 2), v.time, false);
                            v.sprite.body.animations.play('watch');
                            this.game.time.events.repeat(Phaser.Timer.SECOND * v.interval, 1000, function(){
                                v.sprite.body.animations.play('watch');
                            }, this);

                            if (v.color){
                                v.sprite.gear = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd', n + '-blue');
                            }
                            else{
                                v.sprite.gear = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd', n + '-red');
                            }

                            if (v.hair.style != 'no_hair'){
                                v.sprite.hair = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd', prefix.hair + v.start.hair);
                            }
                        }
                        else{
                            v.sprite.body = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');

                            if (v.hair.style != 'no_hair'){
                                v.sprite.hair = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');
                            }

                            v.sprite.shirt = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');
                            v.sprite.pants = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');
                            v.sprite.shoes = this.game.add.sprite(pos.x, pos.y, 'atlas_crowd');
                        }

                        for (let i in v.sprite){
                            this.groups.npc[v.layer-1].add(v.sprite[i]);
                            v.sprite[i].scale.setTo(this.game.camera.scale.x, this.game.camera.scale.y);
                            v.sprite[i].anchor.setTo(0.5, 0.5);

                            if (i == 'hair' && v.hair.style != 'no_hair'){
                                const prefix = `hair_${v.gender}_${v.hair.style}_`;
                                let anim = v.cheer ? v.anim.hair : [0];
                                v.sprite[i].animations.add('cheer', buildFrames(prefix, anim, v.start.hair, 2), v.time, true);
                                v.sprite[i].tint = v.hair.color;
                            }
                            else if (i == 'shoes'){
                                const prefix = `shoes_${v.gender}_`;
                                const digits = v.gender == "male" ? 1 : 2
                                v.sprite[i].animations.add('cheer', buildFrames(prefix, [0], v.start.shoes, digits), v.time, true);
                            }
                            else{
                                let prefix;

                                if (i == 'body'){
                                    v.sprite[i].tint = v.skin.tint;
                                    prefix = `cheer_${v.gender}_`;
                                }
                                else if (i == 'pants' || i == 'shirt'){
                                    v.sprite[i].tint = clothesColor();
                                    let n = '';
                                    if (i == 'shirt' && v.gender == 'female'){
                                        n = parseInt(Math.random() * 2 + 1);
                                    }
                                    prefix = `cheer_${i}${n}_${v.gender}_`;
                                }
                                
                                v.sprite[i].animations.add('cheer', buildFrames(prefix, [0,1], v.start.body, 2), v.time, true);
                            }

                            if (v.cheer){
                                v.sprite[i].animations.play('cheer');
                            }
                        }
                    } 
                },
                
                update: () => {

                }
            }
        })

        this.tileD = 32 // size of a single tile
        this.screenW = this.tileD * 42 // how many tiles there is in the entire image
        this.screenH = this.tileD * 49
        this.screenRatio = this.screenW / this.screenH
        this.arenaX1 = this.tileD * 8 // how many tiles until the start of the arena
        this.arenaY1 = this.tileD * 14
        this.arenaD = this.screenW - (2 * this.arenaX1) // tiles not valid in the left and right side
        this.arenaRate = this.arenaD / 25
            
        return true
    },        
}

const actionList = [
    { name: 'fireball',     value: 0,   animation: 'cast' },
    { name: 'teleport',     value: 1,   animation: 'cast' },
    { name: 'charge',       value: 2,   animation: 'walk' },
    { name: 'block',        value: 3,   animation: 'cast' },
    { name: 'assassinate',  value: 4,   animation: 'shoot' },
    { name: 'ambush',       value: 5,   animation: 'cast' },
    { name: 'melee',        value: 6,   animation: 'melee' },
    { name: 'ranged',       value: 7,   animation: 'shoot' },
    { name: 'movement',     value: 8,   animation: 'walk' },
    { name: 'waiting',      value: 9,   animation: 'none' },
    { name: 'none',         value: 10,  animation: 'none' },
    { name: 'potion',       value: 11,  animation: 'cast' }
]

function zoomWheel(wheel){
    const scaleValue = 0.05;
    const delta = 1 - wheel.deltaY / Math.abs(wheel.deltaY) * scaleValue;
    let canvasW = render.screenW * (render.game.camera.scale.x * delta);
    let canvasH = render.screenH * (render.game.camera.scale.y * delta);

    const point = {
        x: (render.game.input.mouse.input.x + render.game.camera.x) / render.game.camera.scale.x,
        y: (render.game.input.mouse.input.y + render.game.camera.y) / render.game.camera.scale.y,
    }

    let bind = null;
    if (window.outerWidth > window.outerHeight){
        bind = canvasH <= window.outerHeight ? "height" : "none";
    }
    else{
        bind = canvasW <= window.outerWidth ? "width" : "none";
    }

    if (bind == "width"){
        canvasW = window.outerWidth;
        canvasH = window.outerWidth * render.screenH / render.screenW;
        render.game.camera.scale.x = window.outerWidth / render.screenW;
        render.game.camera.scale.y = window.outerWidth / render.screenW;
    }
    else if (bind == "height"){
        canvasH = window.outerHeight;
        canvasW = window.outerHeight * render.screenW / render.screenH;
        render.game.camera.scale.x = window.outerHeight / render.screenH;
        render.game.camera.scale.y = window.outerHeight / render.screenH;
    }
    else{
        render.game.camera.scale.x *= delta;
        render.game.camera.scale.y *= delta;
    }

    if (canvasW > window.outerWidth){
        canvasW = window.outerWidth;
    }
    if (canvasH > window.outerHeight){
        canvasH = window.outerHeight;
    }

    render.game.scale.setGameSize(canvasW, canvasH);
    render.game.camera.bounds.width = render.screenW;
    render.game.camera.bounds.height = render.screenH;

    if (bind == "none"){
        const mx = render.game.input.mouse.input.x;
        const my = render.game.input.mouse.input.y;
        const sx = render.game.camera.scale.x;
        const sy = render.game.camera.scale.y;

        render.game.camera.x = point.x * sx - mx;
        render.game.camera.y = point.y * sy - my;
    }
    document.querySelector('.baloon').remove();
}

function initBars(){
    const graphics = {};
    graphics.back = render.game.add.graphics(0,0);
    graphics.back.beginFill(0x000000);
    graphics.back.drawRect(-100,0,30,9);

    graphics.hp = render.game.add.graphics(0,0);
    graphics.hp.beginFill(0xff0000);
    graphics.hp.drawRect(-100,0,30,5);
    
    graphics.ap = render.game.add.graphics(0,0);
    graphics.ap.beginFill(0x0000ff);
    graphics.ap.drawRect(-100,0,30,4);

    render.bars = {}
    render.bars.back = graphics.back.generateTexture();
    render.bars.back.alpha = 0.15;
    render.bars.hp = graphics.hp.generateTexture();
    render.bars.hp.alpha = 0.4;
    render.bars.ap = graphics.ap.generateTexture();
    render.bars.ap.alpha = 0.4;
}

function fillPeople(){
    const realmColor = Math.floor(Math.random() * 2);

    render.npc = {
        king: 			{x: 20, y: 7.3, start: {body: 0, hair: 2}, heading: 'down', gender: 'male', color: realmColor, time: 5, interval: (Math.random() * 2 + 3)},
        queen:			{x: 21, y: 7.3, start: {body: 0, hair: 4}, heading: 'down', gender: 'female', color: realmColor, time: 5, interval: (Math.random() * 2 + 3)},
        counselor1:		{x: 19, y: 6.7, start: {body: 4}, heading: 'down', gender: 'male'},
        counselor2:		{x: 22, y: 6.7, start: {body: 4}, heading: 'down', gender: 'male'},
        royalguard1:	{x: 16, y: 4, start: {gear: 2, body: 4}, heading: 'down', time: Math.random() * 0.4 + 0.6, interval: (Math.random() * 6 + 8)},
        royalguard2:	{x: 25, y: 4, start: {gear: 2, body: 4}, heading: 'down', time: Math.random() * 0.4 + 0.6, interval: (Math.random() * 6 + 8)},
        archer1:		{x: 4, y: 3, start: {gear: 3, body: 9}, heading: 'down', time: 8, interval: (Math.random() * 2 + 7)},
        archer2:		{x: 39, y: 1, start: {gear: 3, body: 9}, heading: 'down', time: 8, interval: (Math.random() * 2 + 7)},
        archer3:		{x: 21, y: 39, start: {gear: 0, body: 6}, heading: 'up', time: 8, interval: (Math.random() * 2 + 7)},
        commonguard1:	{x: 2, y: 9, start: {gear: 2, body: 4}, heading: 'down', time: Math.random() * 0.1 + 0.1},
        commonguard2:	{x: 39, y: 9, start: {gear: 1, body: 3}, heading: 'left', time: Math.random() * 0.1 + 0.1},
        commonguard3:	{x: 2, y: 40, start: {gear: 3, body: 5}, heading: 'right', time: Math.random() * 0.1 + 0.1},
        commonguard4:	{x: 39, y: 40, start: {gear: 0, body: 2}, heading: 'up', time: Math.random() * 0.1 + 0.1},
    };	

    const gender = [{name: 'male', anims: 3, prob: 0.7}, {name: 'female', anims: 2, prob: 0.3}];

    for (let name in render.npc){
        const npc = render.npc[name]
        npc.layer = 1;
        if (!npc.skin){
            npc.skin = skinColor(name);
        }
        if (!npc.gender){
            npc.gender = gender[weightedRoll([gender[0].prob, gender[1].prob])].name;
        }
        npc.hair = getHair(npc.skin.name, npc.gender);
    }
    
    const arenaSpaces = [
        //left top
        {x: 2.4, y: 10.1, axis: 1, capacity: 29, fill: 0.3, heading: 'right', layer: 1},
        {x: 3.4, y: 10.4, axis: 1, capacity: 29, fill: 0.4, heading: 'right', layer: 1},

        //left bottom
        {x: 5.4, y: 11, axis: 1, capacity: 29, fill: 0.5, heading: 'right', layer: 1},
        {x: 6.4, y: 11.3, axis: 1, capacity: 28, fill: 0.6, heading: 'right', layer: 1},

        //right bottom
        {x: 34.6, y: 11.3, axis: 1, capacity: 28, fill: 0.6, heading: 'left', layer: 1},
        {x: 35.6, y: 11, axis: 1, capacity: 29, fill: 0.5, heading: 'left', layer: 1},

        //right top
        {x: 37.6, y: 11.5, axis: 1, capacity: 29, fill: 0.4, heading: 'left', layer: 1},
        {x: 38.6, y: 11.2, axis: 1, capacity: 29, fill: 0.3, heading: 'left', layer: 1},


        //top top left
        {x: 8, y: 5, axis: 0, capacity: 6, fill: 0.7, heading: 'down', layer: 1},
        {x: 8.1, y: 5.5, axis: 0, capacity: 7, fill: 0.8, heading: 'down', layer: 2},

        //top bottom left
        {x: 8, y: 9, axis: 0, capacity: 8, fill: 0.5, heading: 'down', layer: 1},
        {x: 8.1, y: 9.5, axis: 0, capacity: 8, fill: 0.6, heading: 'down', layer: 2},

        //top top right
        {x: 28, y: 5, axis: 0, capacity: 6, fill: 0.7, heading: 'down', layer: 1},
        {x: 26.9, y: 5.5, axis: 0, capacity: 7, fill: 0.8, heading: 'down', layer: 2},

        //top bottom right
        {x: 26, y: 9, axis: 0, capacity: 8, fill: 0.5, heading: 'down', layer: 1},
        {x: 25.9, y: 9.5, axis: 0, capacity: 8, fill: 0.6, heading: 'down', layer: 2},


        //bottom botom left
        {x: 7, y: 39.5, axis: 0, capacity: 10, fill: 0.6, heading: 'up', layer: 1},

        //bottom top left
        {x: 5, y: 40.5, axis: 0, capacity: 12, fill: 0.4, heading: 'up', layer: 2},

        //bottom bottom right
        {x: 25, y: 39.5, axis: 0, capacity: 10, fill: 0.6, heading: 'up', layer: 1},

        //bottom top right
        {x: 25, y: 40.5, axis: 0, capacity: 12, fill: 0.4, heading: 'up', layer: 2},
    ];

    const headArray = {up: [0, 8, 16], left: [2, 10, 18], down: [4, 12, 20], right: [6, 14, 22]};

    const shoesanim = {
        male: {up: 0, left: 3, down: 1, right: 4},
        female: {up: 0, left: 2, down: 4, right: 6}
    };

    const hairinfo = {
        start: {
            male: [
                {up: 0, left: 1, down: 2, right: 3},
                {up: 0, left: 1, down: 2, right: 3},
                {up: 4, left: 6, down: 8, right: 10}],
            female: [
                {up: 0, left: 2, down: 4, right: 6},
                {up: 8, left: 9, down: 10, right: 11}]
        },
        anim: {
            male: [[0,0], [0,0], [0,1]],
            female: [[0,1], [0,0]]
        }
    };

    let n = 0;
    arenaSpaces.forEach(a => {
        for (let i=0 ; i < a.capacity ; i++){
            if (Math.random() < a.fill){
                const skin = skinColor();
                const genderroll = gender[weightedRoll([gender[0].prob, gender[1].prob])];
                const animroll = Math.floor(Math.random() * genderroll.anims);
                
                render.npc[`people${n}`] = {
                    x: a.x + (a.axis == 0 ? i : 0),
                    y: a.y + (a.axis == 1 ? i : 0),
                    heading: a.heading,
                    time: Math.random()*6 + 2,
                    layer: a.layer,
                    skin: skin,
                    gender: genderroll.name,
                    hair: getHair(skin.name, genderroll.name),
                    anims: genderroll.anims,
                    start: {
                        body: headArray[a.heading][animroll],
                        shoes: shoesanim[genderroll.name][a.heading],
                        hair: hairinfo.start[genderroll.name][animroll][a.heading]
                    },
                    cheer: true,
                    anim: {
                        hair: hairinfo.anim[genderroll.name][animroll]
                    }
                };
                n++;
            }
        }

    })

    function skinColor(name){
        const skins = {
            light: {chance: 0.35, tint: '0xfdd5b7'},
            black: {chance: 0.1, tint: '0x61382d'},
            tanned: {chance: 0.25, tint: '0xfdd082'},
            dark: {chance: 0.2, tint: '0xba8454'},
            darkelf: {chance: 0.05, tint: '0xaeb3ca'},
            red_orc: {chance: 0.05, tint: '0x568b33'},
        };
    
        if (name == 'king' || name == 'queen'){
            skins.darkelf.chance = 0;
            skins.red_orc.chance = 0;
            skins.light.chance = 0.4;
            skins.tanned.chance = 0.3;
        }
    
        let s = Math.random();
        for (let i in skins){
            if (s < skins[i].chance){
                return {name: i, tint: skins[i].tint};
            }
            else{
                s -= skins[i].chance;
            }
        }
    }
    
    function getHair(skin, gender){
        const chances = {
            // change to be [redhead, blonde]. else is brunette
            color: {
                light: [0.1, 0.25],
                black: [0, 0],
                tanned: [0.05, 0.15],
                dark: [0, 0.05],
                darkelf: [0.2, 0.4],
                red_orc: [0.1, 0.1]
            },
            style: {
                // change for each skin tone
                male: {
                    light: [0.25, 0.3, 0.1, 0.05, 0.3, 0.1],
                    black: [0.05, 0.05, 0.2, 0.4, 0.1, 0.4],
                    tanned: [0.35, 0.2, 0.1, 0.05, 0.3, 0.1],
                    dark: [0.15, 0.1, 0.2, 0.3, 0.25, 0.3],
                    darkelf: [0.3, 0.1, 0, 0, 0, 0.8],
                    red_orc: [0.15, 0, 0.3, 0.05, 0.1, 0.5]
                },
                female: {
                    light: [0.3, 0.05, 0.3, 0.3, 0.2, 0],
                    black: [0.1, 0.6, 0.15, 0.3, 0.3, 0.02],
                    tanned: [0.3, 0.2, 0.3, 0.3, 0.2, 0.01],
                    dark: [0.2, 0.3, 0.2, 0.2, 0.3, 0.02],
                    darkelf: [0.1, 0, 0.1, 0.4, 0.3, 0.2],
                    red_orc: [0.1, 0.05, 0.1, 0.2, 0.3, 0.2]
                }
            }
        }

        let r=0, g=0, b=0;
        const s = Math.random();
        //redhead
        if (s < chances.color[skin][0]){
            r = Math.random() * 90 + 110;
            g = Math.random() * 55 + 70;
            b = Math.random() * 25 + 55;
        }
        //blonde
        else if (s < chances.color[skin][1] + chances.color[skin][0]){
            r = Math.random() * 70 + 160;
            g = r * 0.8;
        }
        //brunette - black
        else{
            r = Math.random() * 70 + 30;
            g = r * 0.75;
            b = Math.random() * 30 + 20;
        }
        r = Math.round(r).toString(16);
        g = Math.round(g).toString(16);
        b = Math.round(b).toString(16);

        r = r.length < 2 ? `0${r}` : r;
        g = g.length < 2 ? `0${g}` : g;
        b = b.length < 2 ? `0${r}` : b;

        const color = `0x${r}${g}${b}`;

        const hairstyle = {
            male: ['ponytail', 'parted', 'mohawk', 'jewfro', 'bedhead', 'no_hair'],
            female: ['long', 'jewfro', 'loose', 'longknot', 'pixie', 'no_hair']
        };

        const h = weightedRoll(chances.style[gender][skin]);
        const style = hairstyle[gender][h];

        //console.log(color);
        return {color: color, style: style};
    }

    function weightedRoll(probs){
        const sum = probs.reduce((p,c) => p + c)
        probs = probs.map(e => e / sum)

        let roll = Math.random();
        for (let i in probs){
            if (roll < probs[i]){
                return i;
            }
            else{
                roll -= probs[i];
            }
        }

        return -1;
    }

}

function clothesColor(){
    let r = 0, g = 0, b = 0, v = 0;
    //pure color
    let s = Math.random();
    if (s < 0.15){
        v = Math.round(Math.random() * 200 + 50 ).toString(16);
        r = v;
        g = v;
        b = v;
    }
    else{
        if (s < 0.5){
            let c = Math.random();
            if (c < 0.4){
                r = 230;
            }
            else if (c < 0.6){
                g = 180;
            }
            else{
                b = 200;
            }
        }
        else{
            r = 150;
            g = 150;
            b = 150;
        }

        r = Math.round(Math.random() * r).toString(16);
        g = Math.round(Math.random() * g).toString(16);
        b = Math.round(Math.random() * b).toString(16);
    }

    r = r.length < 2 ? `0${r}` : r;
    g = g.length < 2 ? `0${g}` : g;
    b = b.length < 2 ? `0${b}` : b;

    const color = `0x${r}${g}${b}`;
    //console.log(color);
    return color;
}

function getPosArena(x, y, absolute=false){
    x = (x + 0.5) * render.tileD;
    y = (y + 0.5) * render.tileD;
    if (!absolute){
        x += render.arenaX1;
        y += render.arenaY1;
    }

    return {x: x, y: y};
}

function buildFrames(prefix, frames, start=0, digits=0, loop){
    const strings = [];
    for (let i in frames){
        let p = frames[i] + start;
        if (loop && p > loop.end){
            p = loop.start;
        }
        const n = '0000000'.slice(Math.log10(Math.max(1, p))+1, digits) + p;
        strings.push(prefix + n);
    }

    return strings;
}

export { render, glads, actionList }

// var loadglads = false, startsim = false;
// var stab, gender;
// var simtimenow;
// var dt = 0;

// var animationlist = {
//     'walk': {
//         'start': 8, 'frames': 9},
//     'cast': {
//         'start': 0, 'frames': 7},
//     'shoot': {
//         'start': 16, 'frames': 10},
//     'stab': {
//         'start': 4, 'frames': 8},
//     'slash': {
//         'start': 12, 'frames': 6},
//     'die': {
//         'start': 20, 'frames': 6},
// };

// var layers = [];

// var sprite = new Array();
// var sproj = new Array();
// var gladArray = new Array();
// var projArray = new Array();
// var music, ending, victory; // this.music.main, ending, victory
// var clones = new Array();

// var poison = (Math.sqrt(2*Math.pow(arenaD/2,2)) / arenaRate);
// var gasl = [];
// var groupglad, groupgas; // turned into render.groups.glad
// var groupnpc = [];
// var bar = {};
// var npc;
// var audio = {};
// var textures;

// //function created to debug code. pass argument 's' when you want to start measure and 'e' when to end.
// //it gives the average time per second the code takes to execute
// var mt, ma = null, ta=0, tc=0;
// function measureTime(m){
//     if (!ma)
//         ma = new Date();

//     if (m == 's')
//         mt = new Date();
//     else if (m == 'e'){
//         ta += new Date() - mt;
//         tc++;
//         if (new Date() - ma >= 1000){
//             console.log(ta/tc);
//             ma = null;
//             tc = 0;
//             ta = 0;
//         }
//     }
// }

// var gasld = 4; //gas layer depth
// var gaspl = 25; //gas per layer
function update() {
//     if (json.poison){
//         poison = parseFloat(json.poison);
        
//         var gasadv = Math.sqrt(2*Math.pow(arenaD/2,2)) / arenaRate / poison;

//         if (gasadv >= 1 && (gasl.length == 0 || (17-poison) / gasld > gasl.length - 1)){
//             var gas = [];
//             for (let j = 0 ; j< gaspl ; j++){
//                 gas.push(game.add.image(0,0, 'atlas_effects', 'gas/gas'));
//                 gas[j].anchor.setTo(0.5, 0.5);
//                 gas[j].scale.setTo(gas[j].width / arenaRate * 3); //size = 1p
//                 gas[j].rotSpeed = Math.random() * 1 - 0.5;
//                 gas[j].alpha = 0;
//                 groupgas.add(gas[j]);
//             }
//             gasl.push(gas);
//         }
//         for (let i=0 ; i<gasl.length ; i++){
//             for (let j=0 ; j<gasl[i].length ; j++){
//                 var radi = 360 / gasl[i].length * j;
//                 radi = radi * Math.PI / 180;
//                 let x = 12.5 + (poison + i*gasld + gasl[i][j].width/2 / arenaRate ) * Math.sin(radi);
//                 let y = 12.5 + (poison + i*gasld + gasl[i][j].height/2 / arenaRate) * Math.cos(radi);
//                 gasl[i][j].angle += gasl[i][j].rotSpeed;
//                 if (gasl[i][j].alpha < 1) 
//                     gasl[i][j].alpha += 0.005;
//                 gasl[i][j].x = arenaX1 + x * arenaRate;
//                 gasl[i][j].y = arenaY1 + y * arenaRate;
//             }
//         }
    
//     }
    
//     if (nglad > 0 && !loadglads) {
//         loadglads = true;
//         for (let i=0 ; i<nglad ; i++){
//             //console.log(json.glads[i].x);
//             //if (textures.length < game.renderer.maxTextures){
//                 //game.renderer.currentBatchedTextures.push('glad'+newindex[i]);
//             //}

//             sprite[i] = game.add.sprite(arenaX1 + parseFloat(json.glads[i].x) * arenaRate, arenaY1 + parseFloat(json.glads[i].y) * arenaRate, 'glad'+newindex[i]);
//             sprite[i].anchor.setTo(0.5, 0.5);
            
//             createAnimation(i, 'walk');
//             createAnimation(i, 'melee');
//             createAnimation(i, 'slash');
//             createAnimation(i, 'stab');
//             createAnimation(i, 'shoot');
//             createAnimation(i, 'cast');
            
//             sprite[i].animations.add('die', arrayFill(260,265), 10, false);
            
//             groupglad.add(sprite[i]);
                        
//             gladArray[i] = {
//                 x: 0,
//                 y: 0,
//                 hp: parseFloat(json.glads[i].hp),
//                 alive: true,
//                 fade: 0,
//                 clone: null,
//                 invisible: false,
//                 stun: false,
//                 assassinate: false,
//                 level: 1,
//                 block: false,
//                 charge: false,
//                 poison: false,
//                 xp: parseInt(json.glads[i].xp),
//                 time: false,
//                 sprites: {},
//                 dmgfloat: 0
//             };

//             //var w = arenaX1 + 25 * arenaRate;
//             //var h = arenaY1 + 25 * arenaRate;
//             //gladArray[i].bars = game.add.bitmapData(w,h);
//             //gladArray[i].bars.addToWorld();
//         }
//         music.play();
//         music.volume = prefs.sound.music;
//     }
//     else if (sprite.length > 0){
//         if (!startsim){
//             startsim = true;
//             $('#fog').remove();
//             $('#canvas-container').css({'opacity':1});
//             resize();	
//             pausesim = false;
//         }

//         if (json && simtimenow != json.simtime){
            
//             for (let i=0 ; i<nglad ; i++){
//                 var x = parseFloat(json.glads[i].x);
//                 var y = parseFloat(json.glads[i].y);

//                 var action = parseInt(json.glads[i].action);
//                 var level = parseInt(json.glads[i].lvl);
//                 var xp = parseInt(json.glads[i].xp);
//                 var head = parseFloat(json.glads[i].head);
//                 var hp = parseFloat(json.glads[i].hp);
//                 var lockedfor = parseFloat(json.glads[i].lockedfor);

//                 sprite[i].x = arenaX1 + x * arenaRate;
//                 sprite[i].y = arenaY1 + y * arenaRate;

//                 showMessageBaloon(i);
//                 showHpApBars(i);
//                 showBreakpoint(i);

//                 //lvlup
//                 if (level != gladArray[i].level){
//                     gladArray[i].level = level;
//                     var lvlup = addSprite(gladArray[i], 'lvlup', sprite[i].x, sprite[i].y);
//                     lvlup.anchor.setTo(0.5, 0.35);
//                     lvlup.animations.play('lvlup', null, false, true);
//                     groupglad.add(lvlup);
//                     playAudio('lvlup', prefs.sound.sfx);
//                 }

//                 // used potion
//                 if (actionList[action].name == 'potion') {
//                     gladArray[i].potion = json.glads[i].code.split("-")[1]
//                 }
//                 else{
//                     gladArray[i].potion = false;
//                 }

//                 //took damage
//                 if (hp != gladArray[i].hp) {
//                     //explodiu na cara
//                     if (actionList[action].name == 'fireball'){
//                         let pos = json.glads[i].code.split('fireball(')[1].split(')')[0].split(',')
//                         let x = parseFloat(pos[0])
//                         let y = parseFloat(pos[1])
//                         if (Math.sqrt(Math.pow(x - json.glads[i].x, 2) + Math.pow(y - json.glads[i].y, 2)) <= 2){
//                             // console.log(Math.sqrt(Math.pow(x - json.glads[i].x) + Math.pow(y - json.glads[i].y)))
//                             var fire = addSprite(gladArray[i], 'explode', sprite[i].x, sprite[i].y);
//                             fire.anchor.setTo(0.5, 0.5);
//                             fire.alpha = 0.5;
//                             fire.width = 5 * arenaRate;
//                             fire.height = 3 * arenaRate;
//                             fire.animations.play('explode', null, false, true);
//                             playAudio('explosion', prefs.sound.sfx);
//                         }
//                     }
                    
//                     if (prefs.text){
//                         var dmg = gladArray[i].hp - hp;
//                         var color = "#ffffff";
//                         var floattime = 400;
//                         var fill_color = "#000000";

//                         if (dmg < 0){
//                             fill_color = "#2dbc2d";
//                             dmg = -dmg;
//                         }
//                         else if (json.glads[i].buffs.burn && json.glads[i].buffs.burn.timeleft > 0.1){
//                             color = "#d36464";
//                             floattime = 100;
//                         }
//                         else if (gladArray[i].poison)
//                             color = "#7ae67a";
//                         else if (gladArray[i].block)
//                             color = "#9c745a";

//                         gladArray[i].dmgfloat += dmg;

//                         if (gladArray[i].dmgfloat > 0.01 * json.glads[i].maxhp){
//                             new FloatingText(this, {
//                                 text: gladArray[i].dmgfloat.toFixed(0),
//                                 animation: 'up',
//                                 textOptions: {
//                                     fontSize: 16,
//                                     fill: fill_color,
//                                     stroke: color,
//                                     strokeThickness: 3
//                                 },
//                                 x: sprite[i].x,
//                                 y: sprite[i].y - 20,
//                                 timeToLive: floattime // ms
//                             });

//                             gladArray[i].dmgfloat = 0;
//                         }
//                     }

//                     gladArray[i].hp = hp;

//                 }
                
//                 if (hp <= 0){
//                     if (gladArray[i].alive){
//                         sprite[i].animations.play('die');
//                         if (gender[newindex[i]] == "male"){
//                             playAudio('death_male', prefs.sound.sfx);
//                         }
//                         else{
//                             playAudio('death_female', prefs.sound.sfx);
//                         }
//                     }
//                     gladArray[i].alive = false;
//                 }
//                 // play standard glad animation
//                 else {
//                     gladArray[i].alive = true;

//                     var anim = actionList[action].animation + '-' + getActionDirection(head);
//                     if (actionList[action].name == "movement"){
//                         sprite[i].animations.play(anim);
//                     }
//                     else if (actionList[action].name == "charge"){
//                         if (!gladArray[i].charge){
//                             sprite[i].animations.stop();
//                             sprite[i].animations.play(anim, 50, true);
//                             gladArray[i].charge = true;
//                             if (gender[newindex[i]] == "male"){
//                                 playAudio('charge_male', prefs.sound.sfx);
//                             }
//                             else{
//                                 playAudio('charge_female', prefs.sound.sfx);
//                             }
//                         }
//                     }
//                     else if (actionList[action] && actionList[action].animation != 'none' && gladArray[i].time != json.simtime){
//                         var frames = animationlist[actionList[action].animation].frames;
//                         //lockedfor + 0,1 porque quando chega nesse ponto já descontou do turno atual
//                         //e multiplica por 2 porque os locked dos ataques são divididos em 2 partes
//                         var timelocked = lockedfor + 0.1;
//                         if (actionList[action].name == "ranged" || actionList[action].name == "melee")
//                             timelocked *= 2;
//                         var actionspeed = Math.max(10, frames / timelocked);
    
//                         //console.log({action: actionspeed, name: json.glads[i].name, lock: lockedfor});

//                         sprite[i].animations.stop();
//                         sprite[i].animations.play(anim, actionspeed);
//                         gladArray[i].time = json.simtime;
                        
//                         if (actionList[action].name == "teleport" && gladArray[i].fade == 0){
//                             gladArray[i].fade = 1;
//                             gladArray[i].x = sprite[i].x;
//                             gladArray[i].y = sprite[i].y;
//                             playAudio('teleport', prefs.sound.sfx);
//                         }
//                         if (actionList[action].name == "assassinate"){
//                             gladArray[i].assassinate = true;
//                         }
//                         if (actionList[action].name == "block"){
//                             gladArray[i].block = false;
//                         }
//                         if (actionList[action].name == "ranged"){
//                             playAudio('ranged', prefs.sound.sfx);
//                         }
//                         if (actionList[action].name == "melee"){
//                             playAudio('melee', prefs.sound.sfx);
//                         }
//                     }
//                 }
                
//                 //ambush
//                 if (json.glads[i].buffs.invisible.timeleft > 0.1)
//                     gladArray[i].invisible = true;
//                 else
//                     gladArray[i].invisible = false;
                
//                 if (gladArray[i].invisible){
//                     if (sprite[i].alpha >= 1)
//                         playAudio('ambush', prefs.sound.sfx);
//                     if (sprite[i].alpha > 0.3)
//                         sprite[i].alpha -= 0.05;
//                 }
//                 else if (sprite[i].alpha < 1)
//                         sprite[i].alpha += 0.05;
                    
//                 //fade do teleport
//                 if (gladArray[i].fade == 1 && (gladArray[i].x != sprite[i].x || gladArray[i].y != sprite[i].y) ){
//                     clones.push(game.add.sprite(gladArray[i].x, gladArray[i].y, sprite[i].key, sprite[i].frame));
//                     clones[clones.length-1].anchor.setTo(0.5, 0.5);
//                     clones[clones.length-1].alpha = 1;
//                     sprite[i].alpha = 0;

//                     gladArray[i].fade = 2;
//                 }
//                 else if (gladArray[i].fade == 2){
//                     sprite[i].alpha += 0.05;
//                     if (sprite[i].alpha >= 1){
//                         sprite[i].alpha = 1;
//                         gladArray[i].fade = 0;
//                     }
//                 }

//                 //clone do teleport
//                 for (j in clones){
//                     clones[j].alpha -= 0.05;
//                     if (clones[j].alpha <= 0){
//                         clones[j].destroy();
//                         clones.splice(j,1);
//                     }
//                 }
                    
//                 //stun
//                 if (!gladArray[i].stun && json.glads[i].buffs.stun.timeleft > 0.1 && gladArray[i].alive){
//                     gladArray[i].stun = addSprite(gladArray[i], 'stun', sprite[i].x, sprite[i].y);
//                     gladArray[i].stun.anchor.setTo(0.5, 1);
//                     gladArray[i].stun.scale.setTo(0.6);
//                     gladArray[i].stun.animations.play('stun', null, true, false);
//                     playAudio('stun', prefs.sound.sfx);
//                 }
//                 else if (gladArray[i].stun && (json.glads[i].buffs.stun.timeleft <= 0.1 || !gladArray[i].alive)){
//                     gladArray[i].stun.kill();
//                     gladArray[i].stun = false;
//                 }
                
//                 //block
//                 if (!gladArray[i].block && json.glads[i].buffs.resist.timeleft > 0.1){
//                     gladArray[i].block = true;
//                     var shield = addSprite(gladArray[i], 'shield', sprite[i].x, sprite[i].y);
//                     shield.anchor.setTo(0.5);
//                     groupglad.add(shield);
//                     shield.animations.play('shield', null, false, true);
//                     shield.alpha = 0.5;
//                     playAudio('block', prefs.sound.sfx);
//                 }
//                 else if (gladArray[i].block && json.glads[i].buffs.resist.timeleft <= 0.1){
//                     gladArray[i].block = false;
//                 }

//                 // potion
//                 if (actionList[action].name == "potion" && gladArray[i].potion){
//                     // console.log(gladArray[i].potion)
//                     let name, alpha = 1, scale = 1
//                     if (gladArray[i].potion == 'hp'){
//                         name = 'heal'
//                     }
//                     else if (gladArray[i].potion == 'ap'){
//                         name = 'mana'
//                         alpha = 0.5
//                     }
//                     else if (gladArray[i].potion == 'atr'){
//                         name = 'tonic'
//                         scale = 0.7
//                     }
//                     else if (gladArray[i].potion == 'xp'){
//                         name = 'elixir'
//                     }
                    
//                     // console.log(name)
//                     var potion = addSprite(gladArray[i], name, sprite[i].x, sprite[i].y);
//                     potion.anchor.setTo(0.5);
//                     potion.scale.setTo(scale);
//                     groupglad.add(potion);
//                     potion.animations.play(name, null, false, true);
//                     potion.alpha = alpha;
//                     playAudio(name, prefs.sound.sfx);
//                 }
                
//                 //charge
//                 if (gladArray[i].charge) {
//                     if (xp != gladArray[i].xp) {
//                         sprite[i].animations.currentAnim.speed = 15;
//                         if (stab[newindex[i]] == "0")
//                             var anim = 'slash-' + getActionDirection(head);
//                         else
//                             var anim = 'stab-' + getActionDirection(head);
//                         sprite[i].animations.stop();
//                         sprite[i].animations.play(anim, 20);
//                         playAudio('melee', prefs.sound.sfx);
//                     }
//                     else if (actionList[action].name != "charge"){
//                         sprite[i].animations.currentAnim.speed = 15;
//                         gladArray[i].charge = false;
//                     }
//                 }
                
//                 //poison
//                 if (Math.sqrt(Math.pow(12.5 - x, 2) + Math.pow(12.5 - y, 2)) >= poison )
//                     gladArray[i].poison = true;
//                 else
//                     gladArray[i].poison = false;
                    
//                 //aplica os tints
//                 if (json.glads[i].buffs.burn && json.glads[i].buffs.burn.timeleft > 0.1)
//                     sprite[i].tint = 0xFFB072;
//                 else if (gladArray[i].poison)
//                     sprite[i].tint = 0x96FD96;
//                 else if (gladArray[i].block)
//                     sprite[i].tint = 0xFFE533;
//                 else
//                     sprite[i].tint = 0xFFFFFF;
                
//                 gladArray[i].xp = xp;

//                 if (timeSlider != Math.floor(json.simtime)){
//                     timeSlider = json.simtime;
//                     $( "#time" ).slider("value", parseFloat(json.simtime) * 10);
//                 }
//             }
            
//             update_ui(json);
//         }
        
//         debugTimer();
//     }
    
//     if (simtimenow != json.simtime ){
//         var i=0;

//         if (json.projectiles && json.projectiles.length > 0) {

//             var nproj = json.projectiles.length;
//             for (let i=0 ; i<nproj ; i++){
//                 var id = json.projectiles[i].id;
//                 var type = json.projectiles[i].type;
//                 var j = findProj(id);
//                 if (j == -1){
//                     var spr;
//                     if (json.projectiles[i].type == 0){ //ranged attack
//                         spr = newProjectile('arrow');
//                     }
//                     else if (json.projectiles[i].type == 1){ //fireball
//                         spr = newProjectile('fireball');
//                         spr.animations.play('fireball');
//                         playAudio('fireball', prefs.sound.sfx);
//                     }
//                     else if (json.projectiles[i].type == 2){ //stun
//                         spr = newProjectile('arrow');
//                         spr.tint = 0x00FF00;
//                     }
                    
//                     //console.log(json.simtime +'-'+ json.projectiles[i].owner);
//                     if (gladArray[json.projectiles[i].owner] && gladArray[json.projectiles[i].owner].assassinate){
//                         gladArray[json.projectiles[i].owner].assassinate = false;
//                         spr = newProjectile('arrow');
//                         spr.tint = 0xFF0000;
//                         playAudio('assassinate', prefs.sound.sfx);
//                     }
                                    
//                     spr.anchor.setTo(0.5, 0.5);
//                     j = sproj.length;
//                     sproj.push({'sprite': spr, 'active': true, 'id': id, 'type': type});
//                 }
                
//                 sproj[j].sprite.x = arenaX1 + parseFloat(json.projectiles[i].x) * arenaRate;
//                 sproj[j].sprite.y = arenaY1 + parseFloat(json.projectiles[i].y) * arenaRate;
//                 sproj[j].sprite.angle = parseFloat(json.projectiles[i].head) + 90;
//                 sproj[j].active = true;
//             }
//         }
        
//         //calculate projectile hit
//         for (let x in sproj){
//             if (sproj[x].active === false) {
//                 if (sproj[x].type == 1){
//                     var fire = newProjectile('explode', sproj[x].sprite.x, sproj[x].sprite.y);
//                     fire.anchor.setTo(0.5, 0.5);
//                     fire.alpha = 0.5;
//                     fire.width = 5 * arenaRate;
//                     fire.height = 3 * arenaRate;
//                     fire.animations.play('explode', null, false, true);
//                     playAudio('explosion', prefs.sound.sfx);
//                 }
//                 else{
//                     playAudio('arrow_hit', prefs.sound.sfx);
//                 }
                
//                 sproj[x].sprite.kill();
//                 sproj.splice(x,1);
//             }
//             else
//                 sproj[x].active = false;
//         }

//         groupglad.sort('y', Phaser.Group.SORT_ASCENDING);
//         for (var i=0 ; i<nglad ; i++){
//             if (!gladArray[i].alive)
//                 groupglad.sendToBack(sprite[i]);
//         }

//         groupglad.sendToBack(layers[0]);
//         groupglad.bringToTop(groupgas);
//         groupglad.bringToTop(layers[1]);
//         groupglad.bringToTop(groupnpc[0]);
//         groupglad.bringToTop(layers[2]);
//         groupglad.bringToTop(groupnpc[1]);
//         groupglad.bringToTop(layers[3]);
//     }

//     if (game.input.mouse.drag){
//         if (game.camera.target){
//             $('.ui-glad').removeClass('follow');
//             game.camera.unfollow();
//             $('#details').remove();
//         }
//         game.camera.view.y -= game.input.speed.y;
//         game.camera.view.x -= game.input.speed.x;
//         $('.baloon').remove();
//     }

//     if (game.input.keyboard.isDown(Phaser.Keyboard.NUMPAD_ADD) || game.input.keyboard.isDown(Phaser.Keyboard.EQUALS))
//         zoomWheel({deltaY: -1});

//     if (game.input.keyboard.isDown(Phaser.Keyboard.NUMPAD_SUBTRACT) || game.input.keyboard.isDown(Phaser.Keyboard.UNDERSCORE))
//         zoomWheel({deltaY: 1});

//     if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT))
//         game.camera.view.x -= 10;

//     if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT))
//         game.camera.view.x += 10;

//     if (game.input.keyboard.isDown(Phaser.Keyboard.UP))
//         game.camera.view.y -= 10;

//     if (game.input.keyboard.isDown(Phaser.Keyboard.DOWN))
//         game.camera.view.y += 10;

    
//     simtimenow = json.simtime;
}

// function findProj(id){
//     for (i in sproj){
//         if (sproj[i].id == id)
//             return i;
//     }
//     return -1;
// }

// function arrayFill(s,e){
//     a = new Array();
//     for(var i=s ; i<=e ; i++)
//         a.push(i);
//     return a;
// }

// function getActionDirection(head){
//     if (head >= 45 && head <= 135)
//         return 'right';
//     else if (head > 135 && head < 225)
//         return 'down';
//     else if (head >= 225 && head <= 315)
//         return 'left';
//     else
//         return 'up';
// }

// function createAnimation(glad, action){
//     var name;
//     var sufix = ['-up', '-left', '-down', '-right'];
//     if (action == "melee"){
//         if (stab[newindex[glad]] == "0")
//             name = 'slash';
//         else
//             name = 'stab';
//         animationlist.melee = animationlist[name];
//     }
//     else
//         name = action;
//     for (var i=0 ; i<4 ; i++) {
//         var start =  (animationlist[name].start + i) * 13;
//         var end = start + animationlist[name].frames - 1;
//         sprite[glad].animations.add(action + sufix[i], arrayFill(start, end), 15, false);
//     }
// }

// var oldTime = null;
// var avgFPS = 0, contFPS = 0;
// var avgFPS5 = [];
// function debugTimer(){
//     if (prefs.fps){
//         if (!oldTime)
//             oldTime = new Date();
//         else{
//             var newTime = new Date();
//             avgFPS += newTime - oldTime;
//             contFPS++;
//             oldTime = newTime;
//         }
//         if (!$('#fps').length){
//             $('#canvas-container').append("<div id='fps'></fps>");
//             intFPS();
//         }
//         function intFPS(){
//             setTimeout( function() {
//                 if (contFPS > 0){
//                     avgFPS = 1000/(avgFPS/contFPS);
//                     contFPS = 0;

//                     //calculate average FPS in last 5 seconds
//                     avgFPS5.push(avgFPS);
//                     if (avgFPS5.length > 5)
//                         avgFPS5.splice(0,1);
//                     avgFPS = 0;
//                     for (let i in avgFPS5)
//                         avgFPS += avgFPS5[i];
//                     avgFPS /= avgFPS5.length;

//                     $('#fps').html("FPS: "+ parseFloat(avgFPS).toFixed(1));
//                 }
                
//                 if ($('#fps').length)
//                     intFPS();
//                 else{
//                     avgFPS5 = [];
//                     avgFPS = 0;
//                     contFPS = 0;
//                 }
//             }, 1000);
//         }
//     }
//     else if ($('#fps').length){
//         $('#fps').remove();
//     }
// }

// $(window).keydown(function(event) {
//     if(event.keyCode == Phaser.Keyboard.S){
//         $('#sound').click();
//     }

//     if(event.keyCode == Phaser.Keyboard.F){
//         prefs.fps = (prefs.fps + 1) % 2;
    
//         post("back_play.php", {
//             action: "SET_PREF",
//             show_fps: (prefs.fps == 1)
//         });
//     }

//     if(event.keyCode == Phaser.Keyboard.B){
//         prefs.bars = (prefs.bars + 1) % 2;
    
//         post("back_play.php", {
//             action: "SET_PREF",
//             show_bars: (prefs.bars == 1)
//         });
//     }

//     if(event.keyCode == Phaser.Keyboard.M){
//         if (prefs.frames){
//             $('#ui-container').fadeOut();
//             prefs.frames = false;
//         }
//         else{
//             $('#ui-container').fadeIn();
//             prefs.frames = true;
//         }

//         post("back_play.php", {
//             action: "SET_PREF",
//             show_frames: prefs.frames
//         });
//     }

//     if(event.keyCode == Phaser.Keyboard.T){
//         prefs.text = (prefs.text + 1) % 2;

//         post("back_play.php", {
//             action: "SET_PREF",
//             show_text: (prefs.text == 1)
//         });
//     }

//     if(event.keyCode == Phaser.Keyboard.SPACEBAR)
//         $('#pause').click();

//     if(event.keyCode == Phaser.Keyboard.A)
//         $('#back-step').click();

//     if(event.keyCode == Phaser.Keyboard.D)
//         $('#fowd-step').click();

//     if(event.keyCode >= Phaser.Keyboard.ONE && event.keyCode <= Phaser.Keyboard.FIVE){
//         var i = event.keyCode - Phaser.Keyboard.ONE;
//         $('.ui-glad').eq(i).click();
//     }

// });

// function getGladPositionOnCanvas(gladid){
//     var ph = game.camera.scale.y * tileD;
//     var pw = game.camera.scale.x * tileD;
    
//     //var x = pw*(arenaX1/tileD) + pw * parseFloat(25);
//     var x = pw * ((arenaX1/tileD) + parseFloat(json.glads[gladid].x)/25*26);
//     var y = ph * ((arenaY1/tileD) + parseFloat(json.glads[gladid].y)/25*26);
//     //console.log(json.glads[gladid].y);
//     var ct = $('#canvas-div canvas').position().top - game.camera.view.y;
//     var cl = $('#canvas-div canvas').position().left - game.camera.view.x;
//     return {x: x+cl, y: y+ct};
// }

// function showMessageBaloon(gladid){
//     var message = json.glads[gladid].message;

//     if (prefs.speech && message != "" && json.glads[gladid].hp > 0){
//         var gpos = getGladPositionOnCanvas(gladid);

//         if ($('.baloon.glad-'+ gladid).length)
//             $('.baloon.glad-'+ gladid).html(message);
//         else
//             $('#canvas-div').append("<div class='baloon glad-"+ gladid +"'>"+ message +"</div>");

//         var baloon = $('.baloon.glad-'+ gladid);
//         var x = gpos.x + 15 * game.camera.scale.x;
//         var y = gpos.y - 15 * game.camera.scale.y - baloon.outerHeight();
//         baloon.css({'top': y, 'left': x});
//         if (baloon.width() < 200 && baloon.height() >= 50){
//             baloon.css({'left': x-230});
//             baloon.addClass('left');
//         }
//         else if (baloon.hasClass('left'))
//             baloon.removeClass('left');
            
//         gladArray[gladid].baloon = true;
//     }
//     else if (gladArray[gladid].baloon){
//         $('.baloon.glad-'+ gladid).fadeOut( function(){
//             $(this).remove();
//             gladArray[gladid].baloon = null;
//         });
//     }
    
// }

// function showBreakpoint(gladid){
//     if (json.glads[gladid].breakpoint && json.glads[gladid].hp > 0){
//         if (!pausesim)
//             $('#pause').click();

//         var gpos = getGladPositionOnCanvas(gladid);
//         var bp = json.glads[gladid].breakpoint;

//         if ($(`.breakpoint.glad-${gladid}`).length)
//             $('.breakpoint.glad-'+ gladid).remove();
//         $('#canvas-div').append(`<div class='breakpoint glad-${gladid}' title='Expandir breakpoint'>${bp}</div>`);

//         var baloon = $('.breakpoint.glad-'+ gladid);
//         baloon.hide().fadeIn();

//         var x = gpos.x - 7.5;
//         var y = gpos.y - 25 * game.camera.scale.y - baloon.outerHeight();
//         baloon.css({'top': y, 'left': x});
//         if (baloon.width() < 200 && baloon.height() >= 50){
//             baloon.css({'left': x-230});
//             baloon.addClass('left');
//         }
//         else if (baloon.hasClass('left'))
//             baloon.removeClass('left');
            
//         gladArray[gladid].breakpoint = true;
        
//         baloon.click( () => {
//             if (!baloon.hasClass('expanded'))
//                 baloon.addClass('expanded').removeAttr('title');
//         });
//     }
//     else if (gladArray[gladid].breakpoint && !pausesim){
//         gladArray[gladid].breakpoint = false;
//         $('.breakpoint.glad-'+ gladid).fadeOut(function(){
//             $(this).remove();
//         });
//     }
// }

// function showHpApBars(gladid){
//     if (prefs.bars){
//         if (!gladArray[gladid].bars){
//             var b = {};
//             b.back = game.add.sprite(0,0, render.bars.back);
//             b.back.alpha = 0.15;
//             b.hp = game.add.sprite(0,0, render.bars.hp);
//             b.hp.alpha = 0.4;
//             b.ap = game.add.sprite(0,0, render.bars.ap);
//             b.ap.alpha = 0.4;

//             gladArray[gladid].bars = b;
//         }
    
//         if (json.glads[gladid].hp > 0){
//             var x = arenaX1 + json.glads[gladid].x * arenaRate;
//             var y = arenaY1 + json.glads[gladid].y * arenaRate;
//             var hp = parseFloat(json.glads[gladid].hp);
//             var maxhp = parseFloat(json.glads[gladid].maxhp);
//             var ap = parseFloat(json.glads[gladid].ap);
//             var maxap = parseFloat(json.glads[gladid].maxap);
//             var barsize = 30;

//             gladArray[gladid].bars.back.x = x + -barsize/2;
//             gladArray[gladid].bars.back.y = y + -35;
//             gladArray[gladid].bars.back.width = barsize;
//             gladArray[gladid].bars.back.height = 9;
    
//             gladArray[gladid].bars.hp.x = x + -barsize/2;
//             gladArray[gladid].bars.hp.y = y + -35;
//             gladArray[gladid].bars.hp.width = hp/maxhp * barsize;
//             gladArray[gladid].bars.hp.height = 5;

//             gladArray[gladid].bars.ap.x = x + -barsize/2;
//             gladArray[gladid].bars.ap.y = y + -30;
//             gladArray[gladid].bars.ap.width = ap/maxap * barsize;
//             gladArray[gladid].bars.ap.height = 4;

//             if (!gladArray[gladid].bars.back.alive){
//                 gladArray[gladid].bars.back.revive();
//                 gladArray[gladid].bars.hp.revive();
//                 gladArray[gladid].bars.ap.revive();
//             }
//         }
//         else{
//             gladArray[gladid].bars.back.kill();
//             gladArray[gladid].bars.hp.kill();
//             gladArray[gladid].bars.ap.kill();
//         }
//     }
//     else if (gladArray[gladid].bars && gladArray[gladid].bars.back.alive){
//         gladArray[gladid].bars.back.kill();
//         gladArray[gladid].bars.hp.kill();
//         gladArray[gladid].bars.ap.kill();
//     }


    
// }

// function addSprite(glad, name, x, y){
//     var anim = {
//         lvlup: {key: 'level', frames: 20, frameRate: 15, loop: false},
//         explode: {key: 'explosion', frames: 12, frameRate: 15, loop: true},
//         stun: {key: 'stun', frames: 6, frameRate: 15, loop: true},
//         shield: {key: 'shield', frames: 20, frameRate: 15, loop: false},
//         mana: {key: 'mana', frames: 25, frameRate: 15, loop: false},
//         heal: {key: 'heal', frames: 25, frameRate: 15, loop: false},
//         tonic: {key: 'tonic', frames: 35, frameRate: 15, loop: false},
//         elixir: {key: 'elixir', frames: 25, frameRate: 15, loop: false}
//     };


//     if (glad.sprites[name]){
//         glad.sprites[name].x = x;
//         glad.sprites[name].y = y;
//         glad.sprites[name].revive();
//     }
//     else{
//         let nz = anim[name].frames >= 10 ? 2 : 1
//         glad.sprites[name] = game.add.sprite(x, y, 'atlas_effects');
//         var frames = Phaser.Animation.generateFrameNames(anim[name].key +'/', 0, anim[name].frames-1, '', nz)
//         glad.sprites[name].animations.add(name, frames, anim[name].frameRate, anim[name].loop);
//     }

//     return glad.sprites[name];

// }

// projSprites = {arrow: [], fireball: [], explode: []};
// function newProjectile(type, x, y){
//     var newi = null
//     for (let i in projSprites[type]){
//         if (!projSprites[type][i].alive){
//             newi = i;
//             break;
//         }
//     }

//     if (type != 'explode'){
//         x = 0;
//         y = 0;
//     }

//     if (newi){
//         projSprites[type][newi].x = x;
//         projSprites[type][newi].y = y;
//         projSprites[type][newi].tint = 0xFFFFFF;
//         projSprites[type][newi].revive();
//     }
//     else{
//         newi = projSprites[type].length;
//         if (type == 'arrow')
//             projSprites[type].push(game.add.image(x, y, 'atlas_effects', 'arrow/arrow'));
//         else{
//             projSprites[type].push(game.add.sprite(x, y, 'atlas_effects'));

//             if (type == 'fireball'){
//                 var frames = Phaser.Animation.generateFrameNames('fireball/', 0, 7, '', 2);
//                 projSprites[type][newi].animations.add('fireball', frames, 15, true);
//             }
//             if (type == 'explode'){
//                 var frames = Phaser.Animation.generateFrameNames('explosion/', 0, 11, '', 2);
//                 projSprites[type][newi].animations.add('explode', frames, 15, true);
//             }
//         }
//     }

//     return projSprites[type][newi];
// }

// function playAudio(marker, volume){
//     if (!audio[marker])
//         audio[marker] = [];

//     var newi = null;
//     for (let i in audio[marker]){
//         if (!audio[marker][i].isPlaying){
//             newi = i;
//             break;
//         }
//     }

//     if (newi){
//         audio[marker][newi].volume = volume;
//         audio[marker][newi].play()
//     }
//     else
//         audio[marker].push(game.add.audio(marker, volume).play());
// }