import { assets } from "./assets.js"
import { simulation, ui } from "./playback.js"
import { FloatingText } from "./floatingText.js"

class Gladiator {
    constructor(info){
        for (let k in info){
            this[k] = info[k];
        }

        this.message = '';
        this.diff = {};
        this.sprites = {};
        this.dmgFloat = 0;
    }

    getPositionOnCanvas(){
        const ph = render.game.camera.scale.y * render.tileD;
        const pw = render.game.camera.scale.x * render.tileD;
        
        const x = pw * ((render.arenaX1 / render.tileD) + this.x / 25*26);
        const y = ph * ((render.arenaY1 / render.tileD) + this.y / 25*26);
        
        const ct = render.canvas.offsetTop - render.game.camera.view.y;
        const cl = render.canvas.offsetLeft - render.game.camera.view.x;

        return {x: x+cl, y: y+ct};
    }
    
    showBaloon(){
        if (this.message != "" && simulation.preferences.speech && this.hp > 0){
            const gpos = this.getPositionOnCanvas();
    
            if (!this.baloon){
                this.baloon = document.createElement("div")
                this.baloon.classList.add(`baloon`, `glad-${this.id}`)
                document.querySelector('#canvas-div').insertAdjacentElement('beforeend', this.baloon)
            }

            this.baloon.innerHTML = this.message
    
            const x = gpos.x + 15 * render.game.camera.scale.x;
            const y = gpos.y - 15 * render.game.camera.scale.y - this.baloon.offsetHeight;

            this.baloon.style.left = `${x}px`;
            this.baloon.style.top = `${y}px`;

            if (this.baloon.offsetWidth < 200 && this.baloon.offsetHeight >= 50){
                this.baloon.style.left = `${x - 230}px`;
                this.baloon.classList.add('left');
            }
            else if (this.baloon.classList.contains('left')){
                this.baloon.classList.remove('left');
            }
        }
        else if (this.baloon){
            this.baloon.classList.add("fadeout")
            setTimeout(() => {
                if (this.baloon){
                    this.baloon.remove();
                    delete this.baloon;
                }
            }, 1000);
        }
        
    }

    showBars(){
        if (simulation.preferences.bars){
            if (!this.bars){
                const b = {};
                b.back = render.game.add.sprite(0,0, render.bars.back);
                b.back.alpha = 0.15;
                b.hp = render.game.add.sprite(0,0, render.bars.hp);
                b.hp.alpha = 0.4;
                b.ap = render.game.add.sprite(0,0, render.bars.ap);
                b.ap.alpha = 0.4;
    
                this.bars = b;
            }
        
            if (this.hp > 0){
                const x = render.arenaX1 + this.x * render.arenaRate;
                const y = render.arenaY1 + this.y * render.arenaRate;
                const barsize = 30;
    
                this.bars.back.x = x + -barsize/2;
                this.bars.back.y = y + -35;
                this.bars.back.width = barsize;
                this.bars.back.height = 9;
        
                this.bars.hp.x = x + -barsize/2;
                this.bars.hp.y = y + -35;
                this.bars.hp.width = this.hp / this.maxhp * barsize;
                this.bars.hp.height = 5;
    
                this.bars.ap.x = x + -barsize/2;
                this.bars.ap.y = y + -30;
                this.bars.ap.width = this.ap / this.maxap * barsize;
                this.bars.ap.height = 4;
    
                if (!this.bars.back.alive){
                    this.bars.back.revive();
                    this.bars.hp.revive();
                    this.bars.ap.revive();
                }
            }
            else{
                this.bars.back.kill();
                this.bars.hp.kill();
                this.bars.ap.kill();
            }
        }
        else if (this.bars && this.bars.back.alive){
            this.bars.back.kill();
            this.bars.hp.kill();
            this.bars.ap.kill();
        }
    }
    
    showBreakpoint(){
        if (this.breakpoint && this.hp > 0){
            if (!simulation.paused){
                simulation.pause(true);
            }
    
            const gpos = this.getPositionOnCanvas();
    
            if (!this.bpBaloon){
                this.bpBaloon = document.createElement("div")
                this.bpBaloon.classList.add(`breakpoint`, `glad-${this.id}`)
                this.bpBaloon.title = "Expandir breakpoint";
                document.querySelector('#canvas-div').insertAdjacentElement('beforeend', this.bpBaloon)

                this.bpBaloon.addEventListener("click", () => {
                    if (!this.bpBaloon.classList.contains('expanded')){
                        this.bpBaloon.classList.add("expanded")
                        this.bpBaloon.title = "";
                    }
                });    
            }

            this.bpBaloon.innerHTML = this.breakpoint
                        
            const x = gpos.x - 7.5;
            const y = gpos.y - 25 * render.game.camera.scale.y - this.bpBaloon.offsetHeight;
            this.bpBaloon.style.top = `${y}px`;
            this.bpBaloon.style.left = `${x}px`;
            
            if (this.bpBaloon.offsetWidth < 200 && this.bpBaloon.offsetHeight >= 50){
                this.bpBaloon.style.left = `${x - 230}px`;
                this.bpBaloon.classList.add("left");
            }
            else if (this.bpBaloon.classList.contains('left')){
                this.bpBaloon.classList.remove('left');
            }
        }
        else if (this.breakpoint && !simulation.paused){
            this.bpBaloon.classList.add("fadeout");
            setTimeout(() => {
                this.bpBaloon.remove();
                delete this.bpBaloon;
            }, 1000);
        }
    }

    addSprite(name){
        const anim = {
            lvlup: {key: 'level', frames: 20, frameRate: 15, loop: false},
            explode: {key: 'explosion', frames: 12, frameRate: 15, loop: true},
            stun: {key: 'stun', frames: 6, frameRate: 15, loop: true},
            shield: {key: 'shield', frames: 20, frameRate: 15, loop: false},
            mana: {key: 'mana', frames: 25, frameRate: 15, loop: false},
            heal: {key: 'heal', frames: 25, frameRate: 15, loop: false},
            tonic: {key: 'tonic', frames: 35, frameRate: 15, loop: false},
            elixir: {key: 'elixir', frames: 25, frameRate: 15, loop: false}
        };
    
        if (this.sprites[name]){
            this.sprites[name].x = this.x;
            this.sprites[name].y = this.y;
            this.sprites[name].revive();
        }
        else{
            const nz = anim[name].frames >= 10 ? 2 : 1
            this.sprites[name] = render.game.add.sprite(this.x, this.y, 'atlas_effects');
            const frames = Phaser.Animation.generateFrameNames(anim[name].key +'/', 0, anim[name].frames-1, '', nz)
            this.sprites[name].animations.add(name, frames, anim[name].frameRate, anim[name].loop);
        }
    
        return this.sprites[name];
    }

    update(data){
        const toDiff = ['lvl', 'hp', 'xp'];
        toDiff.forEach(e => this.diff[e] = data[e] - this[e]);

        const toUpdate = ['x', 'y', 'head', 'hp', 'maxhp', 'ap', 'maxap', 'str', 'agi', 'int', 'message', 'breakpoint', 'action', 'xp', 'lvl', 'code', 'buffs', 'lockedfor', 'items'];
        toUpdate.forEach(e => this[e] = data[e]);

        // boolean attr indicationg buff presence
        // const alias = {
        //     resist: 'block',
        // };
        // for (let i in data.buffs){
        //     this[alias[i] ? alias[i] : i] = data.buffs[i].timeleft > 0.1;
        // }
    }

    getDiff(attr){
        return this.diff[attr];
    }
}

class Projectile {
    constructor(data) {
        for (let i in data){
            this[i] = data[i];
        }

        if (this.type == 0){ // ranged
            this.sprite = render.game.add.image(0, 0, 'atlas_effects', 'arrow/arrow');
        }
        else if (this.type == 1){ // fireball
            this.sprite = render.game.add.sprite(0, 0, 'atlas_effects')
            const frames = Phaser.Animation.generateFrameNames('fireball/', 0, 7, '', 2);
            this.sprite.animations.add('fireball', frames, 15, true);
            this.sprite.animations.play('fireball');
            render.playAudio('fireball', simulation.preferences.sound.sfx);
        }
        else if (this.type == 2){ // stun
            this.sprite = render.game.add.image(0, 0, 'atlas_effects', 'arrow/arrow');
            this.sprite.tint = 0x00FF00;
        }

        this.sprite.anchor.setTo(0.5, 0.5);

        const glad = glads.get(this.owner);
        if (glad.assassinate){
            glad.assassinate = false;
            this.sprite = render.game.add.image(0, 0, 'atlas_effects', 'arrow/arrow');
            this.sprite.tint = 0xFF0000;
            render.playAudio('assassinate', simulation.preferences.sound.sfx);
        }

        this.update(data);
    }

    update(data){
        for (let i in data){
            this[i] = data[i];
        }

        this.sprite.x = render.arenaX1 + this.x * render.arenaRate;
        this.sprite.y = render.arenaY1 + this.y * render.arenaRate;
        this.sprite.angle = this.head + 90;
    }
}

const glads = {
    loaded: false,

    load: async function(info){
        glads.members = []

        const ready = []
        info.forEach((e,i) => {
            ready.push(new Promise(async resolve => {
                const skin = JSON.parse(e.skin)
                this.members.push(new Gladiator({
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
                    maxap: e.maxap,
                    x: e.x,
                    y: e.y,
                }))
                resolve(true)
            }))
        })

        Promise.all(ready).then(() => this.loaded = true)

        return true
    },

    wait: async function() {
        return this.loaded ? true : new Promise( resolve => setTimeout( async () => resolve(await this.wait()), 10))
    },

    update: function(step){
        step.forEach(e => {
            const glad = this.get(e.id);
            if (glad){
                // change some keys/values before passing
                e.str = e.STR;
                e.agi = e.AGI;
                e.int = e.INT;
                e.action = getAction(e.action);

                glad.update(e);
            }
        })
    },

    get: function(id){
        const glad = this.members.filter(e => e.id == id);
        return glad.length ? glad[0] : false;
    },

    killBaloons: function(){
        this.members.forEach(e => {
            if (e.baloon){
                e.baloon.remove();
                delete e.baloon;
            }
        })
    }

}

const projectiles = {
    members: [],

    get: function(name){
        return this.members.filter(e => e.id == name)[0] || false;
    },

    update: function(step){
        // console.log(step)
        step.projectiles.forEach(e => {
            const projObj = this.get(e.id);
            if (projObj){
                projObj.update(e);
                projObj.time = step.simtime;
            }
            else{
                const newProj = new Projectile(e);
                newProj.time = step.simtime;
                this.members.push(newProj);
            }
        });

        // console.log(this.members)
        const inactive = this.members.filter(e => e.time != step.simtime);
        // remove the inactives
        this.members = this.members.filter(e => e.time == step.simtime);
        // inactive projectiles end life
        inactive.forEach(e => {
            if (e.type == 1){ // fireball
                const fire = render.game.add.sprite(e.sprite.x, e.sprite.y, 'atlas_effects');
                const frames = Phaser.Animation.generateFrameNames('explosion/', 0, 11, '', 2);
                fire.animations.add('explode', frames, 15, true);

                fire.anchor.setTo(0.5, 0.5);
                fire.alpha = 0.5;
                fire.width = 5 * render.arenaRate;
                fire.height = 3 * render.arenaRate;
                fire.animations.play('explode', null, false, true);
                render.playAudio('explosion', simulation.preferences.sound.sfx);
            }
            else{
                render.playAudio('arrow_hit', simulation.preferences.sound.sfx);
            }

            e.sprite.kill();
        });
    },
}

const render = {
    paused: true,
    started: false,
    debug: {},

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
            state: { preload: () => this.preload(), create: () => this.create(), update: () => this.update()}
        })

        this.tileD = 32 // size of a single tile
        this.screenW = this.tileD * 42 // how many tiles there is in the entire image
        this.screenH = this.tileD * 49
        this.screenRatio = this.screenW / this.screenH
        this.arenaX1 = this.tileD * 8 // how many tiles until the start of the arena
        this.arenaY1 = this.tileD * 14
        this.arenaD = this.screenW - (2 * this.arenaX1) // tiles not valid in the left and right side
        this.arenaRate = this.arenaD / 25
           
        this.gas = {
            depth: 4, // gas layer depth
            amount: 25, // gas per layer
            layers: [],
        };

        // fill actionList with animationList values
        actionList.forEach(e => {
            const newVal = animationList[e.animation] || {};
            newVal.name = e.animation;
            e.animation = newVal;
        }); 
        
        this.clones = [];

        return true
    },

    preload: function() {
        // this.game.load.onLoadStart.add(() => {
        // }, this)
        this.game.load.onFileComplete.add( progress => {
            simulation.loadBox.secondBar.update('Carregando recursos', progress);
            simulation.loadBox.mainBar.update(null, 50 + progress / 2);
        }, this)
        this.game.load.onLoadComplete.add(() => {
            simulation.loadBox.secondBar.update('Tudo pronto');
        }, this)

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

        render.canvas = document.querySelector('#canvas-div canvas')
    },

    create: function() {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        
        this.groups = {};
        this.groups.glad = this.game.add.group();
        this.groups.gas = this.game.add.group();
        this.groups.npc = [];
        this.groups.npc.push(this.game.add.group());
        this.groups.npc.push(this.game.add.group());

        this.groups.glad.add(this.groups.gas);
        this.groups.glad.add(this.groups.npc[0]);
        this.groups.glad.add(this.groups.npc[1]);

        this.layers = [];
        for (let i=0 ; i<=3 ; i++){
            this.layers.push(this.game.add.image(0, 0, 'background', 'layer_'+ i));
            this.groups.glad.add(this.layers[i]);
        }
        
        this.music = {};
        this.music.main = this.game.add.audio('music', 0.5, true);
        this.music.ending = this.game.add.audio('ending');
        this.music.victory = this.game.add.audio('victory');

        this.audio = {};

        window.addEventListener("wheel", event => {
            if (event.path[0].closest('#canvas-div')){
                render.zoomWheel({ deltaY: event.deltaY });
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

        document.querySelector('#canvas-div canvas').focus()

        if (this.game.camera){
            this.game.camera.focusOnXY(this.screenW * this.game.camera.scale.x / 2, this.screenH * this.game.camera.scale.y / 2)
        }

        // remove the loading screen
        if (simulation.log){
            document.querySelector("#fog.load").remove()
            this.paused = false
            this.started = true
    
            document.querySelector('#canvas-container').classList.remove("hidden");
            simulation.resize()
        }

        glads.wait().then(() => {
            glads.members.forEach(e => {            
                e.sprite = this.game.add.sprite(this.arenaX1 + e.x * this.arenaRate, this.arenaY1 + e.y * this.arenaRate, `glad${e.id}`);
                e.sprite.anchor.setTo(0.5, 0.5);
                
                createAnimation(e, ['walk', 'melee', 'slash', 'stab', 'shoot', 'cast']);
                e.sprite.animations.add('die', arrayFill(260,265), 10, false);
                
                this.groups.glad.add(e.sprite);
            })
            
            this.music.main.play();
            this.music.main.volume = simulation.preferences.sound.music;

            simulation.pause(false);
        })
    },
    
    update: function() {
        // poison
        if (this.step){
            // console.log(this.step);
            if (this.step.poison){
                this.poison = this.step.poison;
                
                const gasadv = Math.sqrt(2 * Math.pow(this.arenaD / 2, 2)) / this.arenaRate / this.poison;
        
                if (gasadv >= 1 && (this.gas.layers.length == 0 || (17 - this.poison) / this.gas.depth > this.gas.layers.length - 1)){
                    const gas = [];
                    for (let j=0 ; j < this.gas.amount ; j++){
                        gas.push(this.game.add.image(0,0, 'atlas_effects', 'gas/gas'));
                        gas[j].anchor.setTo(0.5, 0.5);
                        gas[j].scale.setTo(gas[j].width / this.arenaRate * 3); //size = 1p
                        gas[j].rotSpeed = Math.random() * 1 - 0.5;
                        gas[j].alpha = 0;
                        this.groups.gas.add(gas[j]);
                    }
                    this.gas.layers.push(gas);
                }
                this.gas.layers.forEach((l,i) => {
                    for (let j=0 ; j < l.length ; j++){
                        const radi = (360 / l.length * j) * Math.PI / 180;
                        const x = 12.5 + (this.poison + i * this.gas.depth + l[j].width / 2 / this.arenaRate ) * Math.sin(radi);
                        const y = 12.5 + (this.poison + i * this.gas.depth + l[j].height / 2 / this.arenaRate) * Math.cos(radi);
                        l[j].angle += l[j].rotSpeed;
                        if (l[j].alpha < 1) {
                            l[j].alpha += 0.005;
                        }
                        l[j].x = this.arenaX1 + x * this.arenaRate;
                        l[j].y = this.arenaY1 + y * this.arenaRate;
                    }
                })
            
            }
            
            if (this.time != this.step.simtime){
                glads.update(this.step.glads);

                this.step.glads.forEach(g => {
                    const glad = glads.get(g.id)

                    glad.sprite.x = this.arenaX1 + glad.x * this.arenaRate;
                    glad.sprite.y = this.arenaY1 + glad.y * this.arenaRate;

                    glad.showBaloon();
                    glad.showBars();
                    glad.showBreakpoint();

                    //lvlup
                    if (glad.getDiff('lvl')){
                        const lvlup = glad.addSprite('lvlup');
                        lvlup.anchor.setTo(0.5, 0.35);
                        lvlup.animations.play('lvlup', null, false, true);
                        this.groups.glad.add(lvlup);
                        this.playAudio('lvlup', simulation.preferences.sound.sfx);
                    }

                    // used potion
                    if (glad.action.name == 'potion') {
                        glad.potion = glad.code.split("-")[1];
                    }
                    else{
                        glad.potion = false;
                    }

                    //took damage
                    if (glad.getDiff('hp')) {
                        //explodiu na cara
                        if (glad.action.name == 'fireball'){
                            const pos = glad.code.split('fireball(')[1].split(')')[0].split(',');
                            if (Math.sqrt(Math.pow(pos[0] - glad.x, 2) + Math.pow(pos[1] - glad.y, 2)) <= 2){
                                const fire = glad.addSprite('explode');
                                fire.anchor.setTo(0.5, 0.5);
                                fire.alpha = 0.5;
                                fire.width = 5 * this.arenaRate;
                                fire.height = 3 * this.arenaRate;
                                fire.animations.play('explode', null, false, true);
                                this.playAudio('explosion', simulation.preferences.sound.sfx);
                            }
                        }
                        
                        if (simulation.preferences.text){
                            let dmg = glad.getDiff('hp');
                            let color = "#ffffff";
                            let floattime = 400;
                            let fillColor = "#000000";

                            if (dmg < 0){
                                fillColor = "#2dbc2d";
                                dmg = -dmg;
                            }
                            else if (glad.burn){
                                color = "#d36464";
                                floattime = 100;
                            }
                            else if (glad.poison){
                                color = "#7ae67a";
                            }
                            
                            else if (glad.block){
                                color = "#9c745a";
                            }

                            glad.dmgFloat += dmg;

                            if (glad.dmgFloat > 0.01 * glad.maxhp){
                                new FloatingText(this.game, {
                                    text: glad.dmgFloat.toFixed(0),
                                    animation: 'up',
                                    textOptions: {
                                        fontSize: 16,
                                        fill: fillColor,
                                        stroke: color,
                                        strokeThickness: 3
                                    },
                                    x: glad.sprite.x,
                                    y: glad.sprite.y - 20,
                                    timeToLive: floattime // ms
                                });

                                glad.dmgFloat = 0;
                            }
                        }
                    }
                    
                    if (glad.hp <= 0){
                        if (glad.alive){
                            glad.sprite.animations.play('die');
                            render.playAudio(`death_${glad.gender}`, simulation.preferences.sound.sfx);
                        }
                        glad.alive = false;
                    }
                    // play standard glad animation
                    else {
                        glad.alive = true;

                        const anim = glad.action.animation.name + '-' + getActionDirection(glad.head);
                        if (glad.action.name == "movement"){
                            glad.sprite.animations.play(anim);
                        }
                        // this marks the start of an action
                        else if (glad.action.name == "charge"){
                            if (!glad.charge){
                                glad.sprite.animations.stop();
                                glad.sprite.animations.play(anim, 50, true);
                                glad.charge = true;
                                render.playAudio(`charge_${glad.gender}`, simulation.preferences.sound.sfx);
                            }
                        }
                        else if (glad.action.animation.name != 'none' && glad.time != this.step.simtime){
                            const frames = glad.action.animation.frames;
                            //lockedfor + 0,1 porque quando chega nesse ponto já descontou do turno atual
                            //e multiplica por 2 porque os locked dos ataques são divididos em 2 partes
                            let timelocked = glad.lockedfor + 0.1;
                            if (glad.action.name == "ranged" || glad.action.name == "melee"){
                                timelocked *= 2;
                            }
                            const actionspeed = Math.max(10, frames / timelocked);
        
                            //console.log({action: actionspeed, name: this.step.glads[i].name, lock: lockedfor});

                            glad.sprite.animations.stop();
                            glad.sprite.animations.play(anim, actionspeed);
                            glad.time = this.step.simtime;
                            
                            if (glad.action.name == "teleport" && !glad.fade){
                                glad.fade = 1; // fading
                                glad.arenaX = glad.sprite.x;
                                glad.arenaY = glad.sprite.y;
                                render.playAudio('teleport', simulation.preferences.sound.sfx);
                            }
                            if (glad.action.name == "assassinate"){
                                glad.assassinate = true;
                            }
                            if (glad.action.name == "block"){
                                glad.block = false;
                            }
                            if (glad.action.name == "ranged"){
                                render.playAudio('ranged', simulation.preferences.sound.sfx);
                            }
                            if (glad.action.name == "melee"){
                                render.playAudio('melee', simulation.preferences.sound.sfx);
                            }
                        }
                    }
                    
                    //ambush
                    glad.invisible = glad.buffs.invisible.timeleft > 0.1;
                    if (glad.invisible){
                        if (glad.sprite.alpha >= 1){
                            render.playAudio('ambush', simulation.preferences.sound.sfx);
                        }
                        if (glad.sprite.alpha > 0.3){
                            glad.sprite.alpha -= 0.05;
                        }
                    }
                    else if (glad.sprite.alpha < 1){
                        glad.sprite.alpha += 0.05;
                    }
                    
                    //fade do teleport
                    if (glad.fade == 1 && (glad.arenaX != glad.sprite.x || glad.arenaY != glad.sprite.y) ){
                        const clone = this.game.add.sprite(glad.arenaX, glad.arenaY, glad.sprite.key, glad.sprite.frame);
                        clone.anchor.setTo(0.5, 0.5);
                        clone.alpha = 1;
                        glad.sprite.alpha = 0;
                        this.clones.push(clone);
                        
                        glad.fade = 2; // totally faded
                    }
                    else if (glad.fade == 2){
                        glad.sprite.alpha += 0.05;
                        if (glad.sprite.alpha >= 1){
                            glad.sprite.alpha = 1;
                            glad.fade = 0; // not fading
                        }
                    }

                    // update/delete teleport clones
                    this.clones = this.clones.filter(e => {
                        e.alpha -= 0.05;
                        if (e.alpha <= 0){
                            e.destroy();
                            return false;
                        }
                        return true;
                    });
                        
                    //stun
                    if (!glad.stun && glad.buffs.stun.timeleft > 0.1 && glad.alive){
                        glad.stun = glad.addSprite('stun'); // addSprite(gladArray[i], 'stun', sprite[i].x, sprite[i].y);
                        glad.stun.anchor.setTo(0.5, 1);
                        glad.stun.scale.setTo(0.6);
                        glad.stun.animations.play('stun', null, true, false);
                        render.playAudio('stun', simulation.preferences.sound.sfx);
                    }
                    else if (glad.stun && (glad.buffs.stun.timeleft <= 0.1 || !glad.alive)){
                        glad.stun.kill();
                        glad.stun = false;
                    }
                    
                    // block
                    if (!glad.block && glad.buffs.resist.timeleft > 0.1){
                        glad.block = true;
                        const shield = glad.addSprite('shield'); // addSprite(gladArray[i], 'shield', sprite[i].x, sprite[i].y);
                        shield.anchor.setTo(0.5);
                        this.groups.glad.add(shield);
                        shield.animations.play('shield', null, false, true);
                        shield.alpha = 0.5;
                        render.playAudio('block', simulation.preferences.sound.sfx);
                    }
                    else if (glad.block && glad.buffs.resist.timeleft <= 0.1){
                        glad.block = false;
                    }

                    // potion
                    if (glad.action.name == "potion" && glad.potion){
                        // console.log(gladArray[i].potion)
                        let name, alpha = 1, scale = 1;
                        if (glad.potion == 'hp'){
                            name = 'heal';
                        }
                        else if (glad.potion == 'ap'){
                            name = 'mana';
                            alpha = 0.5;
                        }
                        else if (glad.potion == 'atr'){
                            name = 'tonic';
                            scale = 0.7;
                        }
                        else if (glad.potion == 'xp'){
                            name = 'elixir';
                        }
                        
                        // console.log(name)
                        const potion = glad.addSprite(name); // addSprite(gladArray[i], name, sprite[i].x, sprite[i].y);
                        potion.anchor.setTo(0.5);
                        potion.scale.setTo(scale);
                        this.groups.glad.add(potion);
                        potion.animations.play(name, null, false, true);
                        potion.alpha = alpha;
                        render.playAudio(name, simulation.preferences.sound.sfx);
                    }
                    
                    //charge
                    if (glad.charge) {
                        if (glad.getDiff('xp')) {
                            glad.sprite.animations.currentAnim.speed = 15;
                            glad.sprite.animations.stop();
                            glad.sprite.animations.play(`${glad.move}-${getActionDirection(glad.head)}`, 20);
                            render.playAudio('melee', simulation.preferences.sound.sfx);
                        }
                        else if (glad.action.name != "charge"){
                            glad.sprite.animations.currentAnim.speed = 15;
                            glad.charge = false;
                        }
                    }
                    
                    //poison
                    glad.poison = Math.sqrt(Math.pow(12.5 - glad.x, 2) + Math.pow(12.5 - glad.y, 2)) >= this.poison;
                        
                    //aplica os tints
                    if (glad.buffs.burn.timeleft > 0.1){
                        glad.sprite.tint = 0xFFB072;
                    }
                    else if (glad.poison){
                        glad.sprite.tint = 0x96FD96;
                    }
                    else if (glad.block){
                        glad.sprite.tint = 0xFFE533;
                    }
                    else{
                        glad.sprite.tint = 0xFFFFFF;
                    }
                })
                
                projectiles.update(this.step);
        
                this.groups.glad.sort('y', Phaser.Group.SORT_ASCENDING);
                glads.members.forEach(e => e.alive && this.groups.glad.sendToBack(e.sprite));
        
                this.groups.glad.sendToBack(this.layers[0]);
                this.groups.glad.bringToTop(this.groups.gas);
                this.groups.glad.bringToTop(this.layers[1]);
                this.groups.glad.bringToTop(this.groups.npc[0]);
                this.groups.glad.bringToTop(this.layers[2]);
                this.groups.glad.bringToTop(this.groups.npc[1]);
                this.groups.glad.bringToTop(this.layers[3]);
            }
            
            render.debugTimer();
                            
            render.checkInput();
            
            this.time = this.step.simtime;
        }
    },

    checkInput: function(){
        if (this.game.input.mouse.drag){
            if (this.game.camera.target){
                const f = ui.getFollowed();
                if (f !== false){
                    f.follow(false);
                }
            }
            this.game.camera.view.y -= this.game.input.speed.y;
            this.game.camera.view.x -= this.game.input.speed.x;

            glads.killBaloons()
        }
    
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.NUMPAD_ADD) || this.game.input.keyboard.isDown(Phaser.Keyboard.EQUALS)){
            this.zoomWheel({deltaY: -1});
        }
    
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.NUMPAD_SUBTRACT) || this.game.input.keyboard.isDown(Phaser.Keyboard.UNDERSCORE)){
            this.zoomWheel({deltaY: 1});
        }
    
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.LEFT)){
            this.game.camera.view.x -= 10;
        }
    
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)){
            this.game.camera.view.x += 10;
        }
    
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.UP)){
            this.game.camera.view.y -= 10;
        }
    
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.DOWN)){
            this.game.camera.view.y += 10;
        }

    },

    zoomWheel: function(wheel){
        const scaleValue = 0.05;
        const delta = 1 - wheel.deltaY / Math.abs(wheel.deltaY) * scaleValue;
        let canvasW = this.screenW * (this.game.camera.scale.x * delta);
        let canvasH = this.screenH * (this.game.camera.scale.y * delta);
    
        const point = {
            x: (this.game.input.mouse.input.x + this.game.camera.x) / this.game.camera.scale.x,
            y: (this.game.input.mouse.input.y + this.game.camera.y) / this.game.camera.scale.y,
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
            canvasH = window.outerWidth * this.screenH / this.screenW;
            this.game.camera.scale.x = window.outerWidth / this.screenW;
            this.game.camera.scale.y = window.outerWidth / this.screenW;
        }
        else if (bind == "height"){
            canvasH = window.outerHeight;
            canvasW = window.outerHeight * this.screenW / this.screenH;
            this.game.camera.scale.x = window.outerHeight / this.screenH;
            this.game.camera.scale.y = window.outerHeight / this.screenH;
        }
        else{
            this.game.camera.scale.x *= delta;
            this.game.camera.scale.y *= delta;
        }
    
        if (canvasW > window.outerWidth){
            canvasW = window.outerWidth;
        }
        if (canvasH > window.outerHeight){
            canvasH = window.outerHeight;
        }
    
        this.game.scale.setGameSize(canvasW, canvasH);
        this.game.camera.bounds.width = this.screenW;
        this.game.camera.bounds.height = this.screenH;
    
        if (bind == "none"){
            const mx = this.game.input.mouse.input.x;
            const my = this.game.input.mouse.input.y;
            const sx = this.game.camera.scale.x;
            const sy = this.game.camera.scale.y;
    
            this.game.camera.x = point.x * sx - mx;
            this.game.camera.y = point.y * sy - my;
        }

        if (document.querySelector('.baloon')){
            document.querySelectorAll('.baloon').forEach(e => e.remove());
        }
    },
    
    playAudio: function(marker, volume){
        if (!this.audio[marker]){
            this.audio[marker] = [];
        }
    
        const inactive = this.audio[marker].filter(e => !e.isPlaying);
        if (inactive.length){
            inactive[0].volume = volume;
            inactive[0].play();
        }
        else{
            this.audio[marker].push(this.game.add.audio(marker, volume).play());
        }
    },

    debugTimer: function(){
        if (simulation.preferences.fps){
            if (!this.debug.active){
                this.debug.box = document.createElement("div");
                this.debug.box.id = 'fps';
                document.querySelector('#canvas-container').insertAdjacentElement('beforeend', this.debug.box);                
                this.debug.frames = 0;
                this.debug.samples = [];
                this.debug.active = true;

                const measureTime = 500; // measure interval X ms
                const avgTime = 2; // take average from last X seconds

                this.debug.count = function(){
                    setTimeout(() => {
                        if (this.samples.length >= 1000 / measureTime * avgTime){
                            this.samples.shift();
                        }

                        this.samples.push(this.frames);
                        this.frames = 0;

                        const avg = this.samples.reduce((p,c) => p+c) / this.samples.length * (1000 / measureTime);
                        this.box.innerHTML = `FPS: ${avg.toFixed(1)}`;

                        if (this.active){
                            this.count();
                        }
                    }, measureTime);
                };
                this.debug.count();
            }

            this.debug.frames++;
        }
        else if (this.debug.active){
            this.debug.active = false;
            this.debug.box.remove();
        }
    },

    updateStep: function(step){
        this.step = step;
    }
}

const animationList = {
    walk: { start: 8, frames: 9 },
    cast: { start: 0, frames: 7 },
    shoot: { start: 16, frames: 10 },
    stab: { start: 4, frames: 8 },
    slash: { start: 12, frames: 6 },
    die: { start: 20, frames: 6 },
};

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
];

function getAction(value){
    if (typeof value == 'string'){
        return actionList.filter(e => e.name == value)[0];
    }
    else if (typeof value == 'object'){
        return value;
    }
    else {
        return actionList[value];
    }
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

function createAnimation(glad, action){
    if (!Array.isArray(action)){
        action = [action]
    }

    action.forEach(e => {
        const sufix = ['-up', '-left', '-down', '-right'];
        const name = e == "melee" ? glad.move : e;
    
        for (let i=0 ; i<4 ; i++) {
            const start = (animationList[name].start + i) * 13;
            const end = start + animationList[name].frames - 1;
            glad.sprite.animations.add(e + sufix[i], arrayFill(start, end), 15, false);
        }
    })
}

function arrayFill(s,e){
    const arr = [];
    for(let i=s ; i<=e ; i++){
        arr.push(i);
    }
    return arr;
}

function getActionDirection(head){
    if (head >= 45 && head <= 135){
        return 'right';
    }
    else if (head > 135 && head < 225){
        return 'down';
    }
    else if (head >= 225 && head <= 315){
        return 'left';
    }
    else{
        return 'up';
    }
}

export { render, glads, getAction }