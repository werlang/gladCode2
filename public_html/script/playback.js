import { mergeLog, waitFor } from "./utils.js"
import { header } from "./header.js"
import { post, copyToClipboard, fadeIn } from "./utils.js"
import { loader } from "./loader.js"
import { render, glads, getAction } from "./render.js"

const potions = {
    ready: false,
    list: {},

    init: async function(){
        if (!this.ready){
            post("back_slots.php", {
                action: "ITEMS"
            }).then( data => {
                // console.log(data.potions)
                data.potions.forEach((e,i) => this.list[e.id] = i)
                // console.log(potionList)
                this.ready = true
            })
        }
    }
}

header.load()

const simulation = {
    paused: true,
    time: 0,
    log: null,
    fullscreen: true,
    showScore: true,

    stepButton: {
        index: 4,
        options: [-10, -5, -2, -1, 1, 2, 5, 10],

        getValue: function(){
            return Math.round(this.options[this.index])
        },
        setValue: function(value){
            const i = this.options.indexOf(value)
            this.index = i != -1 ? i : 4
        },
        back: function(){
            this.index = this.index > 0 ? this.index - 1 : 0
        },
        forward: function(){
            this.index = this.index < this.options.length - 1 ? this.index + 1 : this.options.length - 1
        },
    },

    preferences: {
        bars: true,
        frames: true,
        fps: false,
        text: true,
        speech: true,
        sound: {
            music: 1,
            sfx: 1
        },
        crowd: 1
    },

    advance: function(direction) {
        if (this.paused){
            this.stepButton.setValue(direction == 'back' ? -1 : 1)

            document.querySelector('#fowd-step .speed').innerHTML = ""
            document.querySelector('#back-step .speed').innerHTML = this.stepButton.getValue()
        }
        else{
            this.stepButton[direction]()

            if (this.stepButton.getValue() > 0){
                document.querySelector('#back-step .speed').innerHTML = ""
                document.querySelector('#fowd-step .speed').innerHTML = this.stepButton.getValue() + 'x'
            }
            else{
                document.querySelector('#fowd-step .speed').innerHTML = ""
                document.querySelector('#back-step .speed').innerHTML = this.stepButton.getValue() + 'x'
            }
        }

        clearTimeout(this.timeout)
        this.startTimer()
    },

    back: function(){
        this.advance('back')
    },

    forward: function(){
        this.advance('forward')
    },

    pause: function(force){
        this.stepButton.setValue(1)

        if (force === false || this.paused){
            this.paused = false
            document.querySelector('#pause').classList.remove('paused')
            document.querySelector('#back-step .speed').innerHTML = '-1x'
            document.querySelector('#fowd-step .speed').innerHTML = '1x'
        }
        else if (force === true || !this.paused){
            this.paused = true
            document.querySelector('#pause').classList.add('paused')
            document.querySelector('#back-step .speed').innerHTML = '-1'
            document.querySelector('#fowd-step .speed').innerHTML = '+1'
            this.stepButton.setValue(1)
        }

        clearTimeout(this.timeout)
        this.startTimer()
    },

    startTimer: function(){
        this.timeout = setTimeout(() => {
            if (!this.paused){
                this.startTimer()
            }

            if (!render.started){
                this.pause(true)
            }

            if (this.time < 0){
                this.time = 0
            }
            else if (this.time > this.steps.length - 1){
                this.endGame();
            }
            else{
                this.showScore = true;
            }

            render.updateStep(this.steps[this.time]);
            // console.log(this.time);
            ui.update(render.step)

            if (!this.paused){
                this.time += this.stepButton.getValue() > 0 ? 1 : -1
            }

            // update slider
            this.slider.setValue(this.time / 10);

        }, 100 / this.stepButton.getValue())
    },

    endGame: function(){
        this.time = this.steps.length - 1;

        if (!this.winner){
            const glads = this.steps[this.time].glads;
            this.winner = glads.filter(e => e.hp > 0);
            this.winner = this.winner.length > 1 ? { name: 'Empate', user: ''} : this.winner[0];
        }

        if (this.showScore){
            const box = document.createElement('div');
            box.id = 'fog';
            box.classList.add('ending');
            box.innerHTML = `<div id='end-message'>
                <div id='victory'>VITÓRIA</div>
                <div id='image-container'>
                    <div id='image'></div>
                    <div id='name-team-container'>
                        <span id='name'>${this.winner.name}</span>
                        <span id='team'>${this.winner.user}</span>
                    </div>
                </div>
                <div id='button-container'>
                    <button class='button' id='retornar' title='Retornar para a batalha'>OK</button>
                    <button class='button small' id='share' title='Compartilhar'><i class="fas fa-share-alt"></i></button>
                </div>
            </div>`;

            box.querySelector('#retornar').addEventListener('click', () => {
                box.remove();
            })

            box.querySelector('#share').addEventListener('click', () => {
                box.querySelector('#end-message').classList.add('hidden');

                const link = `https://gladcode.dev/play/${simulation.logHash}`;
                const twitter = `<a id='twitter' class='button' title='Compartilhar pelo Twitter' href='https://twitter.com/intent/tweet?text=Veja%20esta%20batalha:&url=${link}&hashtags=gladcode' target='_blank'><i class="fab fa-twitter"></i></a>`;
                const facebook = `<a id='facebook' class='button' title='Compartilhar pelo Facebook' href='https://www.facebook.com/sharer/sharer.php?u=${link}' target='_blank'><i class="fab fa-facebook-square"></i></a>`;
                const whatsapp = `<a id='whatsapp' class='button' title='Compartilhar pelo Whatsapp' href='https://api.whatsapp.com/send?text=Veja esta batalha:%0a${link}%0a%23gladcode' target='_blank'><i class="fab fa-whatsapp"></i></a>`;

                box.insertAdjacentHTML('beforeend', `<div id='url'>
                    <div id='link'>
                        <span id='title'>Compartilhar batalha</span>
                        <span id='site'>gladcode.dev/play/</span>
                        <span id='hash'>${simulation.logHash}</span>
                    </div>
                    <div id='social'>
                        <div id='getlink' class='button' title='Copiar link'><i class="fas fa-link"></i></div>
                        ${twitter + facebook + whatsapp}
                    </div>
                    <button id='close' class='button'>OK</button>
                </div>`);

                box.querySelector('#url #social #getlink').addEventListener('click', () => {
                    copyToClipboard(link);
                    box.querySelector('#url #hash').innerHTML = 'Link copiado';
                    box.querySelector('#url #hash').classList.add('clicked');
                    setTimeout(() => {
                        box.querySelector('#url #hash').classList.remove('clicked');
                        box.querySelector('#url #hash').innerHTML = simulation.logHash;
                    }, 500);
                })

                box.querySelector('#url #close').addEventListener('click', () => {
                    box.querySelector('#url').remove();
                    box.querySelector('#end-message').classList.remove('hidden');
                })
            })

            if (this.winner.name != 'Empate'){
                // console.log(this.winner);
                loader.load('gladcard').then(({ getSpriteThumb }) => box.querySelector('#image').appendChild(getSpriteThumb(glads.get(this.winner.id).spritesheet, 'walk', 'down')));
            }

            document.querySelector('body').insertAdjacentElement('beforeend', box);
            fadeIn(box.querySelector('#end-message'), { time: 1 });

            render.music.main.pause();
            render.music.victory.play('', 0, render.music.main.volume / 0.1);

            this.showScore = false;
            simulation.pause(true);
        }
    },

    isFullScreen: function(){
        this.fullscreen = (document.fullscreenElement && document.fullscreenElement !== null) ||
            (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
            (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
            (document.msFullscreenElement && document.msFullscreenElement !== null)
        return this.fullscreen
    },

    setFullScreen: function(state){
        if (typeof state == 'undefined'){
            state = !this.isFullScreen()
        }

        if (state){
            const elem = document.querySelector("body")
            if (elem.requestFullscreen) {
                elem.requestFullscreen()
            }
            else if (elem.mozRequestFullScreen) { /* Firefox */
                elem.mozRequestFullScreen()
            }
            else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                elem.webkitRequestFullscreen()
            }
            else if (elem.msRequestFullscreen) { /* IE/Edge */
                elem.msRequestFullscreen()
            }
            this.fullscreen = true
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
            this.fullscreen = false;
        }

        setTimeout(() => this.resize(), 100);
    },

    resize: function() {
        // if (render.game){
        //     const game = render.game
        //     var canvasH, canvasW;
        //     if ($(window).width() > $(window).height()){
        //         var usefulRatio = screenH / arenaD; //ration between entire and useful part of the background
        //         canvasH = $(window).height();
        //         canvasW = Math.min($(window).width(), screenW * game.camera.scale.x); //if the screen is smaller than deginated area for the canvas, use the small area
        //         game.camera.scale.x = $(window).height() * usefulRatio / screenH;
        //         game.camera.scale.y = $(window).height() * usefulRatio / screenH;
        //         if ($(window).height() < 450 && $(window).height() < $(window).width() && $('#dialog-box').length == 0){
        //             new Message({message: `Em dispositivos móveis, a visualização das lutas é melhor no modo retrato`}).show();
        //         }

        //     }
        //     else{
        //         if ($('#dialog-box').length){
        //             $('#fog').remove();
        //         }

        //         var usefulRatio = screenW / arenaD;
        //         canvasH = Math.min($(window).height(), screenH * game.camera.scale.y);
        //         canvasW = $(window).width();
        //         game.camera.scale.x = $(window).width() * usefulRatio / screenW;
        //         game.camera.scale.y = $(window).width() * usefulRatio / screenW;
        //         if ($(window).height() < 600 && !this.isFullScreen() && !this.fullscreen && $('#dialog-box').length == 0){
        //             new Message({
        //                 message: `Em dispositivos móveis, a visualização das lutas é melhor em tela cheia. Deseja trocar?`,
        //                 buttons: {no: 'Não', yes: 'SIM'}
        //             }).show().click('yes', () => {
        //                 this.setFullScreen(true);
        //                 $('#fog').remove();
        //                 this.fullscreen = true;
        //             });
        //         }
        //     }
        //     game.scale.setGameSize(canvasW, canvasH); //this is that it should be, dont mess
        //     game.camera.bounds.width = screenW; //leave teh bounds alone, dont mess here
        //     game.camera.bounds.height = screenH;
        //     game.camera.y = (arenaY1 + arenaD/2) * game.camera.scale.y - game.height/2; //middle of the arena minus middle of the screen
        //     game.camera.x = (arenaX1 + arenaD/2) * game.camera.scale.x - game.width/2;

        //     $('#canvas-div canvas').click();
        // }
    },

    mute: {
        music: 0,
        sfx: 0,

        toggle: function(){
            // need to mute music
            if (this.music == 0 && simulation.preferences.sound.music != 0){
                this.music = simulation.preferences.sound.music;
                simulation.preferences.sound.music = 0;
                render.music.main.volume = 0;
            }
            // need to mute sfx
            else if (this.sfx == 0 && simulation.preferences.sound.sfx != 0){
                this.sfx = simulation.preferences.sound.sfx;
                simulation.preferences.sound.sfx = 0;
            }
            // unmute all
            else{
                simulation.preferences.sound.music = this.music || 0.1;
                simulation.preferences.sound.sfx = this.sfx || 1;
    
                render.music.main.volume = simulation.preferences.sound.music;            
            }

            changeSoundIcon();

            post("back_play.php",{
                action: "SET_PREF",
                music_volume: simulation.preferences.sound.music,
                sfx_volume: simulation.preferences.sound.sfx
            });
        },
    }
}

const ui = {
    showText: false,
    glads: [],

    init: async function(){
        const container = document.createElement("div")
        container.id = "ui-container"

        const template = await (await fetch("ui_template.html")).text()

        await glads.wait()

        for (let i=0 ; i<glads.members.length ; i++){
            const glad = document.createElement("div")
            glad.classList.add("ui-glad")
            container.appendChild(glad)

            this.glads.push({
                id: i,
                isDead: false,
                isFollow: false,
                element: glad,

                buffs: {},

                follow: function(state){
                    if (state === true){
                        this.element.classList.add('follow')

                        if (!this.isFollow){
                            this.isFollow = true
                            render.game.camera.follow()
                            ui.detailedWindow.create()
                        }
                    }
                    else{
                        this.element.classList.remove('follow')

                        if (this.isFollow){
                            this.isFollow = false
                            render.game.camera.unfollow()
                            ui.detailedWindow.destroy()
                        }
                    }
                }
            })

            glad.innerHTML = template
        }
    
        this.glads.forEach(g => {
            g.element.addEventListener('click', () => {
                this.glads.filter(e => e != g).forEach(e => e.follow(false))
                g.follow(!(g.isFollow || g.isDead))
            })
        })

        document.querySelector('#ui-container').replaceWith(container)
        this.container = container
        this.showText = true
    },

    getFollowed: function(){
        const g = this.glads.filter(e => e.isFollow)
        return g.length ? g[0] : false
    },

    update: function(step){
        // console.log(simulation.preferences);

        const container = document.querySelector('#ui-container');

        if (simulation.preferences.frames){
            if (container.classList.contains('hidden')){
                container.classList.remove('hidden');
                setTimeout(() => container.classList.remove('fade'), 10);
            }

            if (simulation.preferences.text && !this.showtext){
                this.showtext = true
                this.container.querySelectorAll('.ap-bar .text, .hp-bar .text').forEach(e => e.classList.remove('hidden'))
            }
            else if (!simulation.preferences.text && this.showtext){
                this.showtext = false
                this.container.querySelectorAll('.ap-bar .text, .hp-bar .text').forEach(e => e.classList.add('hidden'))
            }

            Object.values(step.glads).forEach(g => {
                const glad = this.glads.filter(e => e.id == g.id)[0]

                if (glad){
                    // TODO: find out how to get posion (boolean)
                    // if (gladArray[i])
                    //     var poison = gladArray[i].poison;

                    if (g.name != glad.name){
                        glad.element.querySelector('.glad-name span').innerHTML = g.name
                        loader.load('gladcard').then(({ getSpriteThumb }) => {
                            glad.element.querySelector('.glad-portrait').appendChild(getSpriteThumb(glads.members[g.id].spritesheet,'walk','down'))
                        })
                    }

                    if (g.STR != glad.STR){
                        glad.element.querySelector('.glad-str span').innerHTML = g.STR
                    }

                    if (g.AGI != glad.AGI){
                        glad.element.querySelector('.glad-agi span').innerHTML = g.AGI
                    }

                    if (g.INT != glad.INT){
                        glad.element.querySelector('.glad-int span').innerHTML = g.INT
                    }

                    if (g.lvl != glad.lvl){
                        glad.element.querySelector('.lvl-value span').innerHTML = g.lvl

                        glad.element.querySelector('.lvl-value').classList.add('up')
                        setTimeout(() => glad.element.querySelector('.lvl-value').classList.remove('up'), 500)
                    }

                    if (g.xp != glad.xp){
                        glad.element.querySelector('.xp-bar .filled').style.height = (g.xp / g.tonext * 100) + '%'
                    }

                    if (g.hp != glad.hp){
                        glad.element.querySelector('.hp-bar .filled').style.width = (g.hp / g.maxhp * 100) + '%'
                        glad.element.querySelector('.hp-bar .text').innerHTML = `${g.hp.toFixed(0)} / ${g.maxhp}`
                    }

                    if (g.hp <= 0){
                        glad.isDead = true
                        glad.element.classList.add('dead')
                    }
                    else if (glad.isDead){
                        glad.isDead = false
                        glad.element.classList.remove('dead')
                    }

                    if (g.ap != glad.ap){
                        glad.element.querySelector('.ap-bar .filled').style.width = (g.ap / g.maxap * 100) + '%'
                        glad.element.querySelector('.ap-bar .text').innerHTML = `${g.ap.toFixed(0)} / ${g.maxap}`
                    }

                    ["burn", "resist", "stun", "invisible", "speed", "poison"].forEach(b => {
                        if (g.buffs[b] && g.buffs[b].timeleft){
                            glad.buffs[b] = true
                            glad.element.querySelector(`.buff-${b}`).classList.add('active')
                        }
                        else if (glad.buffs[b]){
                            glad.buffs[b] = false
                            glad.element.querySelector(`.buff-${b}`).classList.remove('active')
                        }
                    })

                    if (glad.element.classList.contains("follow")){
                        this.detailedWindow.update()
                    }
                }

                [
                    "name",
                    "STR", "AGI", "INT", 
                    "hp", "maxhp", "ap", "maxap", 
                    "lvl", "xp", "tonext", 
                    "x", "y", "head", 
                    "as", "cs", "spd",
                    "lockedfor", "action"
                ].forEach(e => glad[e] = g[e]);

                ["burn", "resist", "invisible", "stun", "speeds"].forEach(e => glad.buffs[e] = g.buffs && g.buffs[e] ? g.buffs[e].timeleft : 0)

            })
        }
        else if (!container.classList.contains('fade')){
            setTimeout(() => container.classList.add('hidden'), 1000);
            container.classList.add('fade');
        }
    },

    detailedWindow: {
        destroy: function(){
            if (this.element){
                this.element.remove()
            }
        },

        create: function(){
            const index = ui.glads.filter(e => e.isFollow)[0].id
            const glad = simulation.log.glads[index]
            const buffBox = glad.buffs.map((e,i) => `<div class='row'><span>${i}</span><span>0.0</span><span>0.0</span></div>`).join("")

            this.destroy()

            this.element = document.createElement("div")
            this.element.id = "details"

            this.element.innerHTML = `<div id='details'>
                <div id='title' class='span-col-2'>
                    <i class="fas fa-arrows-alt" title='Mover'></i>
                    <span>Detalhes do gladiador</span>
                    <i id='minimize' class="fas fa-window-minimize" title='Minimizar'></i>
                </div>
                <div id='content'>
                    <span>Name:</span><input class='col-3 left' value='${glad.name}' readonly>
                    <span>LVL:</span><input readonly>
                    <span>XP:</span><input readonly>
                    <span>X:</span><input readonly>
                    <span>HP:</span><input readonly>
                    <span>Y:</span><input readonly>
                    <span>AP:</span><input readonly>
                    <span>STR:</span><input readonly>
                    <span>Head:</span><div id='head'><input readonly><span>🡅</span></div>
                    <span>AGI:</span><input readonly>
                    <span>Action:</span><input readonly>
                    <span>INT:</span><input readonly>
                    <div id='buffs'>
                        <span>Buffs:</span>
                        <span>Valor</span>
                        <span>Tempo</span>
                        <div id='box'>${buffBox}</div>
                    </div>
                    <span>AS:</span><input readonly>
                    <span>CS:</span><input readonly>
                    <span>Speed:</span><input readonly>
                    <span>Locked:</span><input readonly>
                    <div id='items'>
                        <span>Items:</span>
                        <div id='box'></div>
                    </div>
                    <div id='code'>
                        <span>Comandos:</span>
                        <span>Durac.</span>
                        <span>Tempo</span>
                        <div id='box'></div>
                    </div>
                </div>
            </div>`

            document.querySelector('body').insertAdjacentElement('beforeend', this.element)

            // TODO: ver substituto pro draggable
            // $('#details').hide().fadeIn().draggable({
            //     handle: "#title"
            // });

            this.element.querySelector('#minimize').addEventListener('click', () => {
                // TODO: animate disso aqui
                // $('#details').animate({
                //     "top": $(window).height() - 33,
                //     "left": $(window).width() - 350
                // });

            });

            potions.init()
        },

        update: async function(){
            const glad = ui.glads.members.filter(e => e.element.classList.contains("follow"))[0]

            const info = [
                glad.name,
                glad.lvl,
                `${glad.xp} / ${glad.tonext}`,
                glad.x.toFixed(1),
                `${glad.hp.toFixed(1)} / ${glad.maxhp}`,
                glad.y.toFixed(1),
                `${glad.ap.toFixed(1)} / ${glad.maxap}`,
                glad.STR,
                glad.head.toFixed(1),
                glad.AGI,
                getAction(glad.action).name,
                glad.INT,
                glad.as.toFixed(1),
                glad.cs.toFixed(1),
                glad.spd.toFixed(1),
                glad.lockedfor.toFixed(1)
            ];

            this.element.querySelectorAll('input').forEach((e,i) => e.value = info[i])

            this.element.querySelector('#head span').style.transform = `rotate(${glad.head.toFixed(0)}deg)`

            glad.buffs.forEach((b,i) => {
                const row = this.element.querySelectorAll('#buffs #box .row')[i];
                if (b.timeleft > 0 && !row.classList.contains('active')){
                    row.classList.add('active');
                }
                else if (b.timeleft == 0 && row.classList.contains('active')){
                    row.classList.remove('active');
                }
    
                row.querySelectorAll("span")[1].innerHTML = glad.buffs[i].value.toFixed(1);
                row.querySelectorAll("span")[2].innerHTML = glad.buffs[i].timeleft.toFixed(1);
            })

            if (glad.code){
                if (glad.code != $('#details #code #box .name').last().text()){
                    $('#details #code #box').append(`<div class='row'>
                        <div class='name'>${glad.code}</div>
                        <div class='duration'>0.1</div>
                        <div class='time'>${json.simtime.toFixed(1)}</div>
                    </div>`)

                    if ($('#details #code #box .row').length > 5){
                        $('#details #code #box .row').first().remove()
                    }
                }
                else{
                    let time = parseFloat($('#details #code #box .row').last().find('.duration').text())
                    $('#details #code #box .row').last().find('.duration').text((time + 0.1).toFixed(1))
                }
            }

            let allPotions = '😎'
            await potionList.ready
            for (let i in glad.items){
                let item = $('#details #items #box .row').eq(i).find('span')

                if (item.length){
                    let text = item.text()
                    if (text == '-' || glad.items[i] == 0){
                        item.addClass('used')
                    }
                    else {
                        item.removeClass('used')
                    }
                }
                else{
                    let potion
                    if (glad.items[i] > 0){
                        potion = potionList[glad.items[i]]
                    }
                    else if (glad.items[i] == 0){
                        potion = '-'
                    }
                    else if (glad.items[i] == -1){
                        potion = allPotions
                    }
                    $('#details #items #box').append(`<div class='row'><span>${potion}</span></div>`)
                }
            }
        }
    }
}

class Slider {
    constructor(domParent, options){
        domParent.innerHTML = `<div class='slider'>
            <div class='range'>
                <div class='filled'></div>
                <div class='handle'>
                    ${options.time ? `<div class='time'></div>` : ''}
                </div>
                <div class='preview-filled'></div>
                <div class='preview-handle'>
                    ${options.time ? `<div class='preview-time'></div>` : ''}
                </div>
            </div>
        </div>`;

        this.showTime = options.time;
        this.min = options.min || 0;
        this.max = options.max || 100;
        this.increment = options.increment || options.step || 1;
        this.previewValue = this.min;
        this.pressed = false;

        this.domElement = domParent.querySelector('.slider');

        this.domElement.addEventListener('mousemove', e => {
            const total = this.domElement.querySelector('.range').offsetWidth;
            const valueRange = Math.min(e.offsetX / total, 1) * (this.max - this.min) + this.min;

            this.previewValue = Math.round(valueRange / this.increment) * this.increment;

            if (this.pressed){
                this.domElement.click();
            }
            else{
                this.update();
            }
            
        });

        this.domElement.addEventListener('mousedown', () => {
            this.pressed = true;
            this.domElement.click();
        });
        this.domElement.addEventListener('mouseup', () => this.pressed = false );
        this.domElement.addEventListener('mouseleave', () => this.pressed = false );

        this.callbacks = {};

        this.domElement.addEventListener('click', () => {
            console.log('click')
            this.setValue(this.previewValue);

            if (this.callbacks.click){
                this.callbacks.click(this.previewValue);
            }

            this.update();
        });

        // wait for dom render
        waitFor(() => this.domElement.querySelector('.range').offsetWidth > 0).then(() => this.setValue(options.value || this.min));
    }

    setValue(value){
        const oldValue = this.value;
        this.value = parseInt(Math.max(Math.min(value, this.max), this.min) / this.increment) * this.increment;

        if (oldValue != this.value && this.callbacks.change){
            this.callbacks.change(value);
        }

        this.update();
    }

    getValue(){
        return this.value;
    }

    update(){
        const total = this.domElement.querySelector('.range').offsetWidth;
        const progressWidth = (this.value - this.min) / (this.max - this.min) * total;
        const previewWidth = (this.previewValue - this.min) / (this.max - this.min) * total;
        const width = previewWidth - progressWidth;
        
        if (width >= 0){
            this.domElement.querySelector('.preview-filled').removeAttribute('style');
            this.domElement.querySelector('.preview-handle').removeAttribute('style');
        }
        else{
            this.domElement.querySelector('.preview-filled').style['margin-left'] = `${width}px`;
            this.domElement.querySelector('.preview-handle').style['margin-left'] = `${width}px`;
        }

        this.domElement.querySelector('.preview-filled').style.width = `${Math.abs(width)}px`;
        this.domElement.querySelector('.filled').style.width = `${progressWidth}px`;

        if (this.showTime){
            this.domElement.querySelector('.time').innerHTML = this.value.toFixed(1);
            this.domElement.querySelector('.preview-time').innerHTML = this.previewValue.toFixed(1);
        }
    }

    on(event, callback){
        this.callbacks[event] = callback;
    }
}

;(async () => {
    render.init().then(() => changeCrowd(simulation.preferences.crowd))

    document.querySelector('#loadbar #status').innerHTML = "Página carregada"
    // document.querySelector('#footer-wrapper').classList.add('white')

    document.querySelector('#back-step').addEventListener('click', () => simulation.back())

    document.querySelector('#fowd-step').addEventListener('click', () => simulation.forward())

    document.querySelector('#pause').addEventListener('click', () => simulation.pause())

    document.querySelector('#fullscreen').addEventListener('click', () => simulation.setFullScreen())
    
    document.querySelector('#sound').addEventListener('click', () => simulation.mute.toggle())

    document.querySelector('#help').addEventListener('click', () => {
        const box = document.createElement('div');
        box.id = 'fog';
        box.innerHTML = `<div id='help-window' class='blue-window'>
            <div id='content'>
                <h2>Controle da câmera</h2>
                <div class='table'>
                    <div class='row'>
                        <div class='cell'><img src='icon/mouse_drag.png'>/<img src='icon/arrows_keyboard.png'></div>
                        <div class='cell'>Mover a câmera</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><img src='icon/mouse_scroll.png'>/<img src='icon/plmin_keyboard.png'></div>
                        <div class='cell'>Zoom da arena</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><img src='icon/select_glad.png'>/<img src='icon/numbers_keyboard.png'></div>
                        <div class='cell'>Acompanhar um gladiador</div>
                    </div>
                </div>
                <h2>Teclas de atalho</h2>
                <div class='table'>
                    <div class='row'>
                        <div class='cell'><span class='key'>M</span></div><div class='cell'>Mostrar/ocultar molduras</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>B</span></div><div class='cell'>Mostrar/ocultar barras de hp e ap</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>F</span></div><div class='cell'>Mostrar/ocultar taxa de atualização</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>ESPAÇO</span></div><div class='cell'>Parar/Continuar simulação</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>A</span></div>
                        <div class='cell'>Retroceder simulação</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>D</span></div>
                        <div class='cell'>Avançar simulação</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>S</span></div>
                        <div class='cell'>Liga/desliga Música e efeitos sonoros</div>
                    </div>
                </div>
            </div>
            <div id='button-container'><button class='button' id='ok'>OK</button></div>
        </div>`;
        document.querySelector('body').insertAdjacentElement('beforeend', box);
        fadeIn(box.querySelector('#help-window'), { time: 0.5 });

        box.querySelector('#ok').addEventListener('click', () => box.remove());
    });

    document.querySelector('#settings').addEventListener('click', () => {
        const box = document.createElement('div');
        box.id = 'fog';
        box.innerHTML = `<div id='settings-window' class='blue-window'>
            <h2>Preferências</h2>
            <div class='check-container'>
                <div id='pref-bars'><label><input type='checkbox' class='checkslider' ${simulation.preferences.bars ? "checked" : ""}>Mostrar barras de hp e ap (B)</label></div>
                <div id='pref-frames'><label><input type='checkbox' class='checkslider' ${simulation.preferences.frames ? "checked" : ""}>Mostrar molduras dos gladiadores (M)</label></div>
                <div id='pref-fps'><label><input type='checkbox' class='checkslider' ${simulation.preferences.fps ? "checked" : ""}>Mostrar taxa de atualização da tela (FPS) (F)</label></div>
                <div id='pref-text'><label><input type='checkbox' class='checkslider' ${simulation.preferences.text ? "checked" : ""}>Mostrar valores numéricos de hp, ap e dano (T)</label></div>
                <div id='pref-speech'><label><input type='checkbox' class='checkslider' ${simulation.preferences.speech ? "checked" : ""}>Mostrar balões de fala</label></div>
                <div id='volume-container'>
                    <h3>Volume do áudio</h3>
                    <p>Efeitos sonoros</p>
                    <div id='sfx-volume'></div>
                    <p>Música</p>
                    <div id='music-volume'></div>
                </div>
                <div id='crowd-container'>
                    <h3>Número de espectadores</h3>
                    <div id='n-crowd'></div>
                </div>
            </div>
            <div id='button-container'><button class='button' id='ok'>OK</button></div>
        </div>`;

        new Slider(box.querySelector('#sfx-volume'), {
            min: 0,
            max: 1,
            step: 0.01,
            value: simulation.preferences.sound.sfx,
        });
        
        new Slider(box.querySelector('#music-volume'), {
            min: 0,
            max: 0.1,
            step: 0.001,
            value: simulation.preferences.sound.music,
        });

        new Slider(box.querySelector('#n-crowd'), {
            min: 0,
            max: 1,
            step: 0.1,
            value: simulation.preferences.crowd,
        });

        // const soundtest = render.game.add.audio('lvlup')
        // TODO: verificar como arrumar os sliders.
        // $( "#sfx-volume" ).slider({
        //     range: "min",
        //     min: 0,
        //     max: 1,
        //     step: 0.01,
        //     create: function( event, ui ) {
        //         $(this).slider('value', simulation.preferences.sound.sfx);
        //     },
        //     slide: function( event, ui ) {
        //         simulation.preferences.sound.sfx = ui.value;
        //         soundtest.stop();
        //         soundtest.play('', 0.5, simulation.preferences.sound.sfx);

        //         changeSoundIcon();
        //     },
        // });

        // $( "#music-volume" ).slider({
        //     range: "min",
        //     min: 0,
        //     max: 0.1,
        //     value: 0.1,
        //     step: 0.001,
        //     create: function( event, ui ) {
        //         $(this).slider('value', music.volume);
        //     },
        //     slide: function( event, ui ) {
        //         music.volume = ui.value;

        //         changeSoundIcon();
        //     },
        // });

        // $( "#n-crowd" ).slider({
        //     range: "min",
        //     min: 0,
        //     max: 1,
        //     value: simulation.preferences.crowd,
        //     step: 0.1,
        //     create: function( event, ui ) {
        //     },
        //     slide: ( event, ui ) => {
        //         changeCrowd(ui.value);
        //         simulation.preferences.crowd = ui.value;
        //     }
        // });

        box.querySelectorAll('.checkslider').forEach(e => {
            e.insertAdjacentHTML('afterend', "<div class='checkslider trail'><div class='checkslider thumb'></div></div>");
        });

        box.querySelector('#ok').addEventListener('click', () => {
            post("back_play.php", {
                action: "SET_PREF",
                show_bars: simulation.preferences.bars,
                show_frames: simulation.preferences.frames,
                show_fps: simulation.preferences.fps,
                show_text: simulation.preferences.text,
                show_speech: simulation.preferences.speech,
                sfx_volume: simulation.preferences.sound.sfx,
                music_volume: render.music.main.volume,
                crowd: simulation.preferences.crowd
            });
            box.remove();
        })

        box.querySelector('#pref-bars input').addEventListener('change', e => {
            simulation.preferences.bars = box.querySelector('#pref-bars input').checked;
        });

        box.querySelector('#pref-frames input').addEventListener('change', () => {
            simulation.preferences.frames = box.querySelector('#pref-frames input').checked;
        });

        box.querySelector('#pref-fps input').addEventListener('change', () => {
            simulation.preferences.fps = box.querySelector('#pref-fps input').checked;
        });

        box.querySelector('#pref-text input').addEventListener('change', () => {
            simulation.preferences.text = box.querySelector('#pref-text input').checked;
        });

        box.querySelector('#pref-speech input').addEventListener('change', () => {
            simulation.preferences.speech = box.querySelector('#pref-speech input').checked;
        });

        document.querySelector('body').insertAdjacentElement('beforeend', box);
        fadeIn(box.querySelector('.blue-window'), { time: 0.5 });
    })

    if (document.querySelector('#log')){
        if (document.querySelector('#log').innerHTML.length > 32){
            new Message({message: `Erro na URL`}).show()
        }
        else{
            simulation.logHash = document.querySelector('#log').innerHTML

            post("back_play.php", {
                action: "GET_PREF"
            }).then( data => {
                // console.log(data)
                simulation.preferences.bars = (data.show_bars === true || data.show_bars == 'true')
                simulation.preferences.fps = (data.show_fps === true || data.show_fps == 'true')
                simulation.preferences.text = (data.show_text === true || data.show_text == 'true')
                simulation.preferences.speech = (data.show_speech === true || data.show_speech == 'true')

                simulation.preferences.crowd = parseFloat(data.crowd)

                simulation.preferences.sound.music = parseFloat(data.music_volume)
                simulation.preferences.sound.sfx = parseFloat(data.sfx_volume)
                changeSoundIcon()

                simulation.preferences.frames = data.show_frames === true || data.show_frames == 'true';
            })

            post("back_log.php", {
                action: "GET",
                loghash: simulation.logHash
            }).then(async data => {
                // console.log(data)
                if (data.status == "EXPIRED"){
                    document.querySelector('#loadbar').innerHTML = `<img src='icon/logo.png'><div><span>Esta batalha é muito antiga e não está mais acessível</span></div>`
                }
                else if (data.status != "SUCCESS"){
                    // window.location.href = "https://gladcode.dev";
                    document.querySelector('#loadbar').innerHTML = `<img src='icon/logo.png'><div><span>Esta batalha não consta nos registros</span></div>`
                }
                else{
                    simulation.log = JSON.parse(data.log)
                    // console.log(simulation.log)
                    simulation.steps = mergeLog(simulation.log)
                    simulation.log[0].glads.forEach(g => {
                        // destroca os # nos nomes por espaços
                        g.name = g.name.split("#").join(" ")
                        g.user = g.user.split("#").join(" ")
                    })

                    simulation.slider = new Slider(document.querySelector('#time-container'), {
                        min: 0,
                        max: simulation.steps.length / 10,
                        increment: 0.1,
                        time: true,
                    });
                    simulation.slider.on('click', value => {
                        simulation.time = parseInt(value * 10);
                        // advance a single step if paused, so we can see the effect of clicking on the slider.
                        if (simulation.paused){
                            simulation.startTimer();
                        }
                    })                

                    await glads.load(simulation.log[0].glads)
                    await ui.init()

                    simulation.startTimer()
                }
            })

            // TODO: arrumar o ajax pro load progress
            // $.ajax({
            //     xhr: function() {
            //         var xhr = new window.XMLHttpRequest();
            //         xhr.upload.addEventListener("progress", function(evt) {
            //             if (evt.lengthComputable) {
            //                 var percentComplete = evt.loaded / evt.total;
            //                 //Do something with upload progress here
            //             }
            //        }, false);

            //        xhr.addEventListener("progress", function(evt) {
            //            if (evt.lengthComputable) {
            //                var percentComplete = (100 * evt.loaded / evt.total).toFixed(0);
            //                $('#loadbar #status').html("Fazendo download do log de batalha");
            //                $('#loadbar #second .bar').width(percentComplete +"%");
            //                $('#loadbar #main .bar').width(percentComplete/4 +"%");
            //            }
            //        }, false);

            //        return xhr;
            //     },
            //     type: 'POST',
            //     url: "back_log.php",
            //     data: {
            //         action: "GET",
            //         loghash: simulation.logHash
            //     },
            //     success: function(data){
            //         // console.log(data);
            //         try{
            //             data = JSON.parse(data);
            //         }
            //         catch(error){
            //             console.log(error);
            //         }

            //         // TODO: need to resolve progress issue
            //     }
            // })
        }

        document.querySelector('#log').remove()
    }
})()

window.onresize = () => simulation.resize()


// $(document).ready( function() {
//     $('#sound').click( function(){
//         if (music.volume > 0){
//             $(this).data('music', music.volume);
//             music.volume = 0;
//         }
//         else if (simulation.preferences.sound.sfx > 0){
//             $(this).data('sfx', simulation.preferences.sound.sfx);
//             simulation.preferences.sound.sfx = 0;
//         }
//         else{
//             music.volume = $(this).data('music');
//             if (music.volume == 0)
//                 music.volume = 0.1;

//             simulation.preferences.sound.sfx = $(this).data('sfx');
//             if (simulation.preferences.sound.sfx == 0)
//                 simulation.preferences.sound.sfx = 1;
//         }
//         changeSoundIcon();

//         post("back_play.php",{
//             action: "SET_PREF",
//             music_volume: music.volume,
//             sfx_volume: simulation.preferences.sound.sfx
//         });
//     })

//     $([window, document]).focusin(function(){
//         //console.log("entrou");
//     }).focusout(function(){
//         pausesim = false; //coloca false na var
//         $('#pause').click(); //clica no botao e pause fica true
//     });

//     // checkbox
//     $('.checkslider').each( function(){
//         $(this).after("<div class='checkslider trail'><div class='checkslider thumb'></div></div>").hide()
//     })

// })

function changeSoundIcon(){
    const soundObj = document.querySelector('#sound');
    soundObj.classList.remove("on", "off", "mute");

    if (simulation.preferences.sound.music > 0){
        soundObj.classList.add("off");
    }
    else if (simulation.preferences.sound.sfx > 0){
        soundObj.classList.add("mute");
    }
    else{
        soundObj.classList.add("on");
    }
}

function changeCrowd (value) {
    for (let i in render.npc){
        const r = Math.random();
        const alive = render.npc[i].sprite.body.alive;
        if (r < value && !alive){
            for (let j in render.npc[i].sprite)
                render.npc[i].sprite[j].revive();
        }
        else if (r > value && alive){
            for (let j in render.npc[i].sprite)
                render.npc[i].sprite[j].kill();
        }
    }
}

export { simulation, ui };