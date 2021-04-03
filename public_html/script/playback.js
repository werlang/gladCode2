import { parseLog, waitFor } from "./utils.js"
import { post, copyToClipboard, fadeIn } from "./utils.js"
import { loader } from "./loader.js"
import { render, glads, getAction } from "./render.js"
import { translator } from "./translate.js"

const translatorReady = (async () => {
    await translator.translate([
        'Acompanhar um gladiador',
        'Avançar simulação',
        'Carregando batalha',
        'Carregando interface',
        'Carregando página',
        'Carregando recursos',
        'Comandos',
        'Compartilhar batalha',
        'Compartilhar pelo Facebook',
        'Compartilhar pelo Twitter',
        'Compartilhar pelo Whatsapp',
        'Compartilhar',
        'Controle da câmera',
        'Copiar link',
        'Detalhes do gladiador',
        'Durac',
        'Efeitos sonoros',
        'Empate',
        'ESPAÇO',
        'Esta batalha é muito antiga e não está mais acessível',
        'Esta batalha não consta nos registros',
        'Fazendo download do log de batalha',
        'Liga/desliga Música e efeitos sonoros',    
        'Link copiado',
        'Minimizar',
        'Mostrar balões de fala',
        'Mostrar barras de hp e ap',
        'Mostrar molduras dos gladiadores',
        'Mostrar taxa de atualização da tela',
        'Mostrar valores numéricos de hp, ap e dano',
        'Mostrar/ocultar barras de hp e ap sobre o gladiador na arena',
        'Mostrar/ocultar molduras dos gladiadores na interface de usuário',
        'Mostrar/ocultar taxa de atualização (Quadros / segundo) da simulação',
        'Mostrar/ocultar texto nas barras de hp e ap na UI e texto flutuante de dano na arena',
        'Mover a câmera',
        'Mover',
        'Música',
        'Número de espectadores',    
        'Parar/Continuar simulação',
        'Preferências',
        'Retornar para a batalha',
        'Retroceder simulação',
        'Teclas de atalho',
        'Tempo',
        'Tudo pronto',
        'Valor',
        'Veja esta batalha',
        'VITÓRIA',
        'Volume do áudio',
        'Zoom da arena',
    ]);

    return true;
})();

translatorReady.then(() => {
    document.querySelector('#fog.load #fixed.text').innerHTML = translator.getTranslated('Carregando batalha', false);
});

translator.translate(document.querySelector('#canvas-container #button-container'));

const potions = {
    ready: false,
    list: {},

    init: async function () {
        if (!this.ready) {
            post("back_slots.php", {
                action: "ITEMS"
            }).then(data => {
                // console.log(data.potions)
                Object.entries(data.potions).forEach(([i, e]) => this.list[e.id] = i);
                // console.log(potionList)
                this.ready = true
            })
        }
    }
}

const simulation = {
    paused: true,
    time: 0,
    log: null,
    fullscreen: true,
    showScore: true,

    stepButton: {
        index: 4,
        options: [-10, -5, -2, -1, 1, 2, 5, 10],

        getValue: function () {
            return Math.round(this.options[this.index])
        },
        setValue: function (value) {
            const i = this.options.indexOf(value)
            this.index = i != -1 ? i : 4
        },
        back: function () {
            this.index = this.index > 0 ? this.index - 1 : 0
        },
        forward: function () {
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

    advance: function (direction) {
        if (this.paused) {
            const step = direction == 'back' ? -1 : 1;
            this.time = this.time + step;
            this.stepButton.setValue(step);

            document.querySelector('#fowd-step .speed').innerHTML = '+1';
            document.querySelector('#back-step .speed').innerHTML = '-1';
        }
        else {
            this.stepButton[direction]()

            if (this.stepButton.getValue() > 0) {
                document.querySelector('#back-step .speed').innerHTML = ""
                document.querySelector('#fowd-step .speed').innerHTML = this.stepButton.getValue() + 'x'
            }
            else {
                document.querySelector('#fowd-step .speed').innerHTML = ""
                document.querySelector('#back-step .speed').innerHTML = this.stepButton.getValue() + 'x'
            }
        }

        clearTimeout(this.timeout)
        this.startTimer()
    },

    back: function () {
        this.advance('back')
    },

    forward: function () {
        this.advance('forward')
    },

    pause: function (force) {
        this.stepButton.setValue(1)
        const pause = typeof force === 'undefined' ? !this.paused : force === true;

        if (pause) {
            this.paused = true
            document.querySelector('#pause').classList.add('paused')
            document.querySelector('#back-step .speed').innerHTML = '-1'
            document.querySelector('#fowd-step .speed').innerHTML = '+1'
            this.stepButton.setValue(1)
        }
        else {
            this.paused = false
            document.querySelector('#pause').classList.remove('paused')
            document.querySelector('#back-step .speed').innerHTML = '-1x'
            document.querySelector('#fowd-step .speed').innerHTML = '1x'
        }

        clearTimeout(this.timeout)
        this.startTimer()
    },

    startTimer: function () {
        this.timeout = setTimeout(() => {
            if (!this.paused) {
                this.startTimer()
            }

            if (!render.started) {
                this.pause(true)
            }

            if (this.time < 0) {
                this.time = 0
            }
            else if (this.time > this.steps.length - 1) {
                this.endGame();
            }
            else {
                this.showScore = true;
            }

            render.updateStep(this.steps[this.time]);
            // console.log(this.time);
            ui.update(render.step)

            if (!this.paused) {
                this.time += this.stepButton.getValue() > 0 ? 1 : -1
            }

            // update slider
            this.slider.setValue(this.time / 10);

        }, 100 / Math.abs(this.stepButton.getValue()));
    },

    endGame: function () {
        this.time = this.steps.length - 1;

        if (!this.winner) {
            const glads = this.steps[this.time].glads;
            this.winner = glads.filter(e => e.hp > 0);
            this.winner = this.winner.length > 1 ? { name: translator.getTranslated('Empate', false), user: '' } : this.winner[0];
        }

        if (this.showScore) {
            const box = document.createElement('div');
            box.id = 'fog';
            box.classList.add('ending');
            box.innerHTML = `<div id='end-message'>
                <div id='victory'>${translator.getTranslated('VITÓRIA')}</div>
                <div id='image-container'>
                    <div id='image'></div>
                    <div id='name-team-container'>
                        <span id='name'>${this.winner.name}</span>
                        <span id='team'>${this.winner.user}</span>
                    </div>
                </div>
                <div id='button-container'>
                    <button class='button' id='retornar' title='${translator.getTranslated('Retornar para a batalha', false)}'>OK</button>
                    <button class='button small' id='share' title='${translator.getTranslated('Compartilhar', false)}'><i class="fas fa-share-alt"></i></button>
                </div>
            </div>`;

            box.querySelector('#retornar').addEventListener('click', () => box.remove());

            box.querySelector('#share').addEventListener('click', () => {
                box.querySelector('#end-message').classList.add('hidden');

                const link = `https://gladcode.dev/play/${simulation.logHash}`;
                const twitter = `<a id='twitter' class='button' title='${translator.getTranslated('Compartilhar pelo Twitter', false)}' href='https://twitter.com/intent/tweet?text=${translator.getTranslated('Veja esta batalha', false)}:&url=${link}&hashtags=gladcode' target='_blank'><i class="fab fa-twitter"></i></a>`;
                const facebook = `<a id='facebook' class='button' title='${translator.getTranslated('Compartilhar pelo Facebook', false)}' href='https://www.facebook.com/sharer/sharer.php?u=${link}' target='_blank'><i class="fab fa-facebook-square"></i></a>`;
                const whatsapp = `<a id='whatsapp' class='button' title='${translator.getTranslated('Compartilhar pelo Whatsapp', false)}' href='https://api.whatsapp.com/send?text=${translator.getTranslated('Veja esta batalha', false)}:%0a${link}%0a%23gladcode' target='_blank'><i class="fab fa-whatsapp"></i></a>`;
    
                box.insertAdjacentHTML('beforeend', `<div id='url'>
                    <div id='link'>
                        <span id='title'>${translator.getTranslated('Compartilhar batalha')}</span>
                        <span id='site'>gladcode.dev/play/</span>
                        <span id='hash'>${simulation.logHash}</span>
                    </div>
                    <div id='social'>
                        <div id='getlink' class='button' title='${translator.getTranslated('Copiar link', false)}'><i class="fas fa-link"></i></div>
                        ${twitter + facebook + whatsapp}
                    </div>
                    <button id='close' class='button'>OK</button>
                </div>`);

                box.querySelector('#url #social #getlink').addEventListener('click', () => {
                    copyToClipboard(link);
                    box.querySelector('#url #hash').innerHTML = translator.getTranslated('Link copiado', false);
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

            if (this.winner.name != translator.getTranslated('Empate', false)) {
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

    isFullScreen: function () {
        this.fullscreen = (document.fullscreenElement && document.fullscreenElement !== null) ||
            (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
            (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
            (document.msFullscreenElement && document.msFullscreenElement !== null)
        return this.fullscreen
    },

    setFullScreen: function (state) {
        if (typeof state == 'undefined') {
            state = !this.isFullScreen()
        }

        if (state) {
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
        else {
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

    resize: function () {
        if (render.game) {
            let canvasW, canvasH;
            const windowHeight = document.querySelector('#frame').offsetHeight;
            const windowWidth = document.querySelector('#frame').offsetWidth;

            if (windowWidth > windowHeight) {
                const usefulRatio = render.screenH / render.arenaD; // ratio between entire and useful part of the background
                render.game.camera.scale.x = windowHeight * usefulRatio / render.screenH;
                render.game.camera.scale.y = windowHeight * usefulRatio / render.screenH;
                canvasH = windowHeight;
                canvasW = Math.min(windowWidth, render.screenW * render.game.camera.scale.x); //if the screen is smaller than deginated area for the canvas, use the small area
                if (windowHeight < 450 && windowHeight < windowWidth && !document.querySelector('#dialog-box')) {
                    loader.load('dialog').then(({ Message }) => new Message({ message: `Em dispositivos móveis, a visualização das lutas é melhor no modo retrato` }).show());
                }

            }
            else {
                if (document.querySelector('#dialog-box')) {
                    document.querySelector('#fog').remove();
                }

                const usefulRatio = render.screenW / render.arenaD;
                render.game.camera.scale.x = windowWidth * usefulRatio / render.screenW;
                render.game.camera.scale.y = windowWidth * usefulRatio / render.screenW;
                canvasH = Math.min(windowHeight, render.screenH * render.game.camera.scale.y);
                canvasW = windowWidth;
                if (windowHeight < 600 && !this.isFullScreen() && document.querySelector('#dialog-box')) {
                    new Message({
                        message: `Em dispositivos móveis, a visualização das lutas é melhor em tela cheia. Deseja trocar?`,
                        buttons: { no: 'Não', yes: 'SIM' }
                    }).show().click('yes', () => {
                        this.setFullScreen(true);
                        document.querySelector('#fog').remove();
                    });
                }
            }
            render.game.scale.setGameSize(canvasW, canvasH); //this is that it should be, dont mess
            render.game.camera.bounds.width = render.screenW; //leave teh bounds alone, dont mess here
            render.game.camera.bounds.height = render.screenH;
            render.game.camera.y = (render.arenaY1 + render.arenaD / 2) * render.game.camera.scale.y - render.game.height / 2; //middle of the arena minus middle of the screen
            render.game.camera.x = (render.arenaX1 + render.arenaD / 2) * render.game.camera.scale.x - render.game.width / 2;

            document.querySelector('#canvas-div canvas').click();
        }
    },

    mute: {
        music: 0,
        sfx: 0,

        toggle: function () {
            // need to mute music
            let music = simulation.preferences.sound.music;
            let sfx = simulation.preferences.sound.sfx;

            if (this.music == 0 && music != 0) {
                this.music = music;
                music = 0;
                render.music.main.volume = 0;
            }
            // need to mute sfx
            else if (this.sfx == 0 && sfx != 0) {
                this.sfx = sfx;
                sfx = 0;
            }
            // unmute all
            else {
                music = this.music || 0.1;
                sfx = this.sfx || 1;
                this.music = 0;
                this.sfx = 0;
                render.music.main.volume = music;
            }

            post("back_play.php", {
                action: "SET_PREF",
                music_volume: music,
                sfx_volume: sfx
            });

            simulation.preferences.sound.music = music;
            simulation.preferences.sound.sfx = sfx;

            changeSoundIcon();
        },
    }
}

const ui = {
    showText: false,
    glads: [],

    init: async function () {
        const container = document.createElement("div")
        container.id = "ui-container"

        const template = await (await fetch("ui_template.html")).text()

        // translate ui template
        const templateDOM = document.createElement('div');
        templateDOM.innerHTML = template;
        const toTranslate = Array.from(templateDOM.querySelectorAll('*')).filter(e => e.title).map(e => e.title);
        const translations = translator.translate(toTranslate);
        translations.then(data => {
            templateDOM.querySelectorAll('*').forEach(e => {
                if (e.title){
                    e.title = data.shift();
                }
            });
        });

        await glads.wait()

        for (let i = 0; i < glads.members.length; i++) {
            const glad = document.createElement("div")
            glad.classList.add("ui-glad")
            container.appendChild(glad)

            this.glads.push({
                id: i,
                isDead: false,
                isFollow: false,
                element: glad,

                buffs: {},

                follow: function (state) {
                    if (state === true) {
                        this.element.classList.add('follow')

                        if (!this.isFollow) {
                            this.isFollow = true
                            render.game.camera.follow()
                            ui.detailedWindow.create()
                        }
                    }
                    else {
                        this.element.classList.remove('follow')

                        if (this.isFollow) {
                            this.isFollow = false
                            render.game.camera.unfollow()
                            ui.detailedWindow.destroy()
                        }
                    }
                }
            })

            await translations;
            glad.innerHTML = templateDOM.innerHTML;
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

    getFollowed: function () {
        const g = this.glads.filter(e => e.isFollow)
        return g.length ? g[0] : false
    },

    update: function (step) {
        // console.log(simulation.preferences);

        const container = document.querySelector('#ui-container');

        if (simulation.preferences.frames) {
            if (container.classList.contains('hidden')) {
                container.classList.remove('hidden');
                setTimeout(() => container.classList.remove('fade'), 10);
            }

            if (simulation.preferences.text && !this.showtext) {
                this.showtext = true
                this.container.querySelectorAll('.ap-bar .text, .hp-bar .text').forEach(e => e.classList.remove('hidden'))
            }
            else if (!simulation.preferences.text && this.showtext) {
                this.showtext = false
                this.container.querySelectorAll('.ap-bar .text, .hp-bar .text').forEach(e => e.classList.add('hidden'))
            }

            Object.values(step.glads).forEach(g => {
                const glad = this.glads.filter(e => e.id == g.id)[0]

                if (glad) {
                    if (g.name != glad.name) {
                        glad.element.querySelector('.glad-name span').innerHTML = g.name
                        loader.load('gladcard').then(({ getSpriteThumb }) => {
                            glad.element.querySelector('.glad-portrait').appendChild(getSpriteThumb(glads.members[g.id].spritesheet, 'walk', 'down'))
                        })
                    }

                    if (g.STR != glad.STR) {
                        glad.element.querySelector('.glad-str span').innerHTML = g.STR
                    }

                    if (g.AGI != glad.AGI) {
                        glad.element.querySelector('.glad-agi span').innerHTML = g.AGI
                    }

                    if (g.INT != glad.INT) {
                        glad.element.querySelector('.glad-int span').innerHTML = g.INT
                    }

                    if (g.lvl != glad.lvl) {
                        glad.element.querySelector('.lvl-value span').innerHTML = g.lvl

                        glad.element.querySelector('.lvl-value').classList.add('up')
                        setTimeout(() => glad.element.querySelector('.lvl-value').classList.remove('up'), 500)

                        const xpBar = glad.element.querySelector('.xp-bar .filled');
                        xpBar.classList.add('up');
                        setTimeout(() => {
                            xpBar.classList.add('reset');
                            xpBar.classList.remove('up');

                            setTimeout(() => xpBar.classList.remove('reset'), 150);
                        }, 500);
                    }

                    if (g.xp != glad.xp) {
                        glad.element.querySelector('.xp-bar .filled').style.height = (g.xp / g.tonext * 100) + '%'
                    }

                    if (g.hp != glad.hp) {
                        glad.element.querySelector('.hp-bar .filled').style.width = (g.hp / g.maxhp * 100) + '%'
                        glad.element.querySelector('.hp-bar .text').innerHTML = `${g.hp.toFixed(0)} / ${g.maxhp}`
                    }

                    if (g.hp <= 0) {
                        glad.isDead = true
                        glad.element.classList.add('dead')
                    }
                    else if (glad.isDead) {
                        glad.isDead = false
                        glad.element.classList.remove('dead')
                    }

                    if (g.ap != glad.ap) {
                        glad.element.querySelector('.ap-bar .filled').style.width = (g.ap / g.maxap * 100) + '%'
                        glad.element.querySelector('.ap-bar .text').innerHTML = `${g.ap.toFixed(0)} / ${g.maxap}`
                    }

                    ["burn", "resist", "stun", "invisible", "speed", "poison"].forEach(b => {
                        const poisoned = b == 'poison' && glads.get(glad.id).poison;

                        if ((g.buffs[b] && g.buffs[b].timeleft) || poisoned) {
                            glad.buffs[b] = true
                            glad.element.querySelector(`.buff-${b}`).classList.add('active')
                        }
                        else if (glad.buffs[b]) {
                            glad.buffs[b] = false
                            glad.element.querySelector(`.buff-${b}`).classList.remove('active')
                        }
                    })

                    if (glad.element.classList.contains("follow")) {
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
        else if (!container.classList.contains('fade')) {
            setTimeout(() => container.classList.add('hidden'), 1000);
            container.classList.add('fade');
        }
    },

    detailedWindow: {
        destroy: function () {
            if (this.element) {
                this.element.remove()
            }
        },

        create: function () {
            const glad = glads.get(ui.glads.filter(e => e.isFollow)[0].id);
            const buffBox = Object.keys(glad.buffs).map(e => `<div class='row'><span>${e}</span><span>0.0</span><span>0.0</span></div>`).join("")

            this.destroy()

            this.element = document.createElement("div")
            this.element.id = "details";

            this.element.innerHTML = `
            <div id='title' class='span-col-2' draggable='true'>
                <i class="fas fa-arrows-alt" title='${translator.getTranslated('Mover', false)}'></i>
                <span>${translator.getTranslated('Detalhes do gladiador')}</span>
                <i id='minimize' class="fas fa-window-minimize" title='${translator.getTranslated('Minimizar', false)}'></i>
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
                    <span>${translator.getTranslated('Valor')}</span>
                    <span>${translator.getTranslated('Tempo')}</span>
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
                    <span>${translator.getTranslated('Comandos')}:</span>
                    <span>${translator.getTranslated('Durac')}.</span>
                    <span>${translator.getTranslated('Tempo')}</span>
                    <div id='box'></div>
                </div>
            </div>`;

            document.querySelector('body').insertAdjacentElement('beforeend', this.element)

            this.element.querySelector('#title').addEventListener('dragstart', e => {
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            const dragEvent = e => {
                this.element.style['transition'] = `0s all`;
                if (e.x != 0 || e.y != 0) {
                    this.element.style.top = `${Math.max(e.y, 0)}px`;
                    this.element.style.left = `${Math.max(e.x, 0)}px`;
                }
                this.element.classList.remove('minimized');
            };

            this.element.querySelector('#title').addEventListener('drag', dragEvent);
            this.element.querySelector('#title').addEventListener('dragend', dragEvent);

            this.element.querySelector('#minimize').addEventListener('click', () => {
                this.element.classList.toggle('minimized');
                this.element.removeAttribute('style');
            });

            potions.init()
        },

        update: async function () {
            const glad = ui.glads.filter(e => e.element.classList.contains("follow"))[0];
            const renderGlad = glads.get(glad.id);

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

            this.element.querySelectorAll('input').forEach((e, i) => e.value = info[i])

            this.element.querySelector('#head span').style.transform = `rotate(${glad.head.toFixed(0)}deg)`

            Object.values(renderGlad.buffs).forEach((e, i) => {
                const row = this.element.querySelectorAll('#buffs #box .row')[i];
                if (e.timeleft > 0 && !row.classList.contains('active')) {
                    row.classList.add('active');
                }
                else if (e.timeleft == 0 && row.classList.contains('active')) {
                    row.classList.remove('active');
                }

                row.querySelectorAll("span")[1].innerHTML = e.value.toFixed(1);
                row.querySelectorAll("span")[2].innerHTML = e.timeleft.toFixed(1);
            })

            if (renderGlad.code) {
                const rows = Array.from(this.element.querySelectorAll('#code #box .row'));
                const lastRow = rows.length ? rows[rows.length - 1] : false;

                if (!lastRow || renderGlad.code != lastRow.querySelector('.name').textContent) {
                    const newRow = document.createElement('div');
                    newRow.classList.add('row');
                    newRow.innerHTML = `<div class='name'>${renderGlad.code}</div><div class='duration'>0.1</div><div class='time'>${render.time}</div>`;

                    rows.push(newRow);

                    if (rows.length > 5) {
                        rows.shift();
                    }

                    this.element.querySelector('#code #box').innerHTML = rows.map(e => e.outerHTML).join('');
                }
                else {
                    const time = parseFloat(lastRow.querySelector('.duration').textContent);
                    lastRow.querySelector('.duration').textContent = (time + 0.1).toFixed(1);
                }
            }

            const freePotions = '😎';
            await waitFor(() => potions.ready);
            renderGlad.items.forEach((e, i) => {
                const item = this.element.querySelectorAll('#items #box .row span')[i];

                if (item) {
                    if (item.textContent == '-' || e == 0) {
                        item.classList.add('used');
                    }
                    else {
                        item.classList.remove('used');
                    }
                }
                else {
                    const potion = e > 0 ? potions.list[e] : e == 0 ? '-' : freePotions;
                    this.element.querySelector('#items #box').insertAdjacentHTML('beforeend', `<div class='row'><span>${potion}</span></div>`);
                }
            });
        }
    }
}

class Slider {
    constructor(domParent, options) {
        domParent.innerHTML = `<div class='slider' draggable='false'>
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

            if (this.pressed) {
                this.domElement.click();
            }
            else {
                this.update();
            }

        });

        this.domElement.addEventListener('mousedown', () => {
            this.pressed = true;
            this.domElement.click();
        });
        this.domElement.addEventListener('mouseup', () => this.pressed = false);
        this.domElement.addEventListener('mouseleave', () => this.pressed = false);

        this.callbacks = {};

        this.domElement.addEventListener('click', () => {
            this.setValue(this.previewValue);

            if (this.callbacks.click) {
                this.callbacks.click(this.previewValue);
            }

            this.update();
        });

        // wait for dom render
        waitFor(() => this.domElement.querySelector('.range').offsetWidth > 0).then(() => {
            this.setValue(options.value || this.min);
            this.ready = true;
        });
    }

    setValue(value) {
        const oldValue = this.value;
        this.value = parseInt(Math.max(Math.min(value, this.max), this.min) / this.increment) * this.increment;

        if (oldValue != this.value && this.callbacks.change && this.ready) {
            this.callbacks.change(value);
        }

        this.update();
    }

    getValue() {
        return this.value;
    }

    update() {
        const total = this.domElement.querySelector('.range').offsetWidth;
        const progressWidth = (this.value - this.min) / (this.max - this.min) * total;
        const previewWidth = (this.previewValue - this.min) / (this.max - this.min) * total;
        const width = previewWidth - progressWidth;

        if (width >= 0) {
            this.domElement.querySelector('.preview-filled').removeAttribute('style');
            this.domElement.querySelector('.preview-handle').removeAttribute('style');
        }
        else {
            this.domElement.querySelector('.preview-filled').style['margin-left'] = `${width}px`;
            this.domElement.querySelector('.preview-handle').style['margin-left'] = `${width}px`;
        }

        this.domElement.querySelector('.preview-filled').style.width = `${Math.abs(width)}px`;
        this.domElement.querySelector('.filled').style.width = `${progressWidth}px`;

        if (this.showTime) {
            this.domElement.querySelector('.time').innerHTML = this.value.toFixed(1);
            this.domElement.querySelector('.preview-time').innerHTML = this.previewValue.toFixed(1);
        }
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }
}

class loadBar {
    constructor(bar, status) {
        this.element = bar;
        this.status = status;
    }

    update(status, length) {
        if (status && this.status.innerHTML != status) {
            this.status.innerHTML = status;
        }

        if (length) {
            const oldLength = parseInt(this.element.querySelector('.bar').style.width.split('%')[0]);
            if (length < oldLength) {
                this.reset();
            }
            this.element.querySelector('.bar').style.width = `${length}%`;
            this.element.classList.remove('loading');
        }
        else {
            this.element.classList.add('loading');
            this.element.querySelector('.bar').style.width = `100%`;
        }
    }

    reset() {
        this.element.querySelector('.bar').style.transition = `0`;
        this.element.querySelector('.bar').style.width = `0`;
        this.element.querySelector('.bar').style.removeProperty('transition');
    }
}

simulation.loadBox = {
    mainBar: new loadBar(document.querySelector('#loadbar #main'), null),
    secondBar: new loadBar(document.querySelector('#loadbar #second'), document.querySelector('#loadbar #status')),
}

translatorReady.then(() => {
    simulation.loadBox.secondBar.update(translator.getTranslated('Carregando página', false));

    if (document.querySelector('#log')) {
        if (document.querySelector('#log').innerHTML.length > 32) {
            new Message({ message: `Erro na URL` }).show()
        }
        else {
            simulation.logHash = document.querySelector('#log').innerHTML

            post("back_play.php", {
                action: "GET_PREF"
            }).then(data => {
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
            }, {
                xhr: true,
                progress: e => {
                    // console.log(e)
                    const total = e.lengthComputable ? e.total : e.uncompressedLengthComputable ? e.uncompressedTotal : false;
                    if (total) {
                        const percentComplete = (100 * e.loaded / total).toFixed(0);
                        // console.log(percentComplete)
                        simulation.loadBox.secondBar.update(translator.getTranslated('Fazendo download do log de batalha', false), percentComplete);
                        simulation.loadBox.mainBar.update(null, percentComplete / 4);
                    }
                },
                loadend: () => {
                    simulation.loadBox.secondBar.update(translator.getTranslated('Carregando interface', false));
                    render.init().then(() => changeCrowd(simulation.preferences.crowd));
                },
            }).then(async data => {
                // console.log(data)
                if (data.status == "EXPIRED") {
                    document.querySelector('#loadbar').innerHTML = `<img src='icon/logo.png'><div><span>${translator.getTranslated('Esta batalha é muito antiga e não está mais acessível')}</span></div>`;
                }
                else if (data.status != "SUCCESS") {
                    // window.location.href = "https://gladcode.dev";
                    document.querySelector('#loadbar').innerHTML = `<img src='icon/logo.png'><div><span>${translator.getTranslated(`Esta batalha não consta nos registros`)}</span></div>`;
                }
                else {
                    simulation.log = JSON.parse(data.log)
                    // console.log(simulation.log)
                    simulation.steps = parseLog(simulation.log)
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
                        if (simulation.paused) {
                            simulation.startTimer();
                        }
                    });

                    await glads.load(simulation.log[0].glads)
                    await ui.init()
                }
            });


        }

        document.querySelector('#log').remove()
    }
    
});

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
            <h2>${translator.getTranslated('Controle da câmera')}</h2>
            <div class='table'>
                <div class='row'>
                    <div class='cell'><img src='icon/mouse_drag.png'>/<img src='icon/arrows_keyboard.png'></div>
                    <div class='cell'>${translator.getTranslated('Mover a câmera')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><img src='icon/mouse_scroll.png'>/<img src='icon/plmin_keyboard.png'></div>
                    <div class='cell'>${translator.getTranslated('Zoom da arena')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><img src='icon/select_glad.png'>/<img src='icon/numbers_keyboard.png'></div>
                    <div class='cell'>${translator.getTranslated('Acompanhar um gladiador')}</div>
                </div>
            </div>
            <h2>${translator.getTranslated('Teclas de atalho')}</h2>
            <div class='table'>
                <div class='row'>
                    <div class='cell'><span class='key'>M</span></div><div class='cell'>${translator.getTranslated('Mostrar/ocultar molduras dos gladiadores na interface de usuário')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>B</span></div><div class='cell'>${translator.getTranslated('Mostrar/ocultar barras de hp e ap sobre o gladiador na arena')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>F</span></div><div class='cell'>${translator.getTranslated('Mostrar/ocultar taxa de atualização (Quadros / segundo) da simulação')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>T</span></div><div class='cell'>${translator.getTranslated('Mostrar/ocultar texto nas barras de hp e ap na UI e texto flutuante de dano na arena')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>${translator.getTranslated('ESPAÇO')}</span></div><div class='cell'>${translator.getTranslated('Parar/Continuar simulação')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>A</span></div>
                    <div class='cell'>${translator.getTranslated('Retroceder simulação')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>D</span></div>
                    <div class='cell'>${translator.getTranslated('Avançar simulação')}</div>
                </div>
                <div class='row'>
                    <div class='cell'><span class='key'>S</span></div>
                    <div class='cell'>${translator.getTranslated('Liga/desliga Música e efeitos sonoros')}</div>
                </div>
            </div>
        </div>
        <div id='button-container'><button class='button' id='ok'>OK</button></div>
    </div>`;
    document.querySelector('body').insertAdjacentElement('beforeend', box);
    fadeIn(box.querySelector('#help-window'), { time: 0.5 });

    box.querySelector('#ok').addEventListener('click', () => box.remove());
});
translator.translate(document.querySelector('#help'));

document.querySelector('#settings').addEventListener('click', () => {
    const box = document.createElement('div');
    box.id = 'fog';
    box.innerHTML = `<div id='settings-window' class='blue-window'>
        <h2>${translator.getTranslated('Preferências')}</h2>
        <div class='check-container'>
            <div id='pref-bars'><label><input type='checkbox' class='checkslider' ${simulation.preferences.bars ? "checked" : ""}>${translator.getTranslated('Mostrar barras de hp e ap')} (B)</label></div>
            <div id='pref-frames'><label><input type='checkbox' class='checkslider' ${simulation.preferences.frames ? "checked" : ""}>${translator.getTranslated('Mostrar molduras dos gladiadores')} (M)</label></div>
            <div id='pref-fps'><label><input type='checkbox' class='checkslider' ${simulation.preferences.fps ? "checked" : ""}>${translator.getTranslated('Mostrar taxa de atualização da tela')} (FPS) (F)</label></div>
            <div id='pref-text'><label><input type='checkbox' class='checkslider' ${simulation.preferences.text ? "checked" : ""}>${translator.getTranslated('Mostrar valores numéricos de hp, ap e dano')} (T)</label></div>
            <div id='pref-speech'><label><input type='checkbox' class='checkslider' ${simulation.preferences.speech ? "checked" : ""}>${translator.getTranslated('Mostrar balões de fala')}</label></div>
            <div id='volume-container'>
                <h3>${translator.getTranslated('Volume do áudio')}</h3>
                <p>${translator.getTranslated('Efeitos sonoros')}</p>
                <div id='sfx-volume'></div>
                <p>${translator.getTranslated('Música')}</p>
                <div id='music-volume'></div>
            </div>
            <div id='crowd-container'>
                <h3>${translator.getTranslated('Número de espectadores')}</h3>
                <div id='n-crowd'></div>
            </div>
        </div>
        <div id='button-container'><button class='button' id='ok'>OK</button></div>
    </div>`;

    const sliderSfx = new Slider(box.querySelector('#sfx-volume'), {
        min: 0,
        max: 1,
        step: 0.01,
        value: simulation.preferences.sound.sfx,
    });
    sliderSfx.on('change', value => {
        simulation.preferences.sound.sfx = value;

        const soundtest = render.game.add.audio('lvlup')
        soundtest.stop();
        soundtest.play('', 0.5, value);

        changeSoundIcon();
    });

    const sliderMusic = new Slider(box.querySelector('#music-volume'), {
        min: 0,
        max: 0.1,
        step: 0.001,
        value: simulation.preferences.sound.music,
    });
    sliderMusic.on('change', value => {
        simulation.preferences.sound.music = value;
        render.music.main.volume = value;
        changeSoundIcon();
    });

    const sliderCrowd = new Slider(box.querySelector('#n-crowd'), {
        min: 0,
        max: 1,
        step: 0.1,
        value: simulation.preferences.crowd,
    });
    sliderCrowd.on('change', value => {
        changeCrowd(value);
        simulation.preferences.crowd = value;
    });

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
});
translator.translate(document.querySelector('#settings'));

document.addEventListener('keydown', e => {
    const togglePreferences = (pref) => {
        simulation.preferences[pref] = !simulation.preferences[pref];

        const options = { action: "SET_PREF" };
        options[`show_${pref}`] = simulation.preferences[pref];
        post("back_play.php", options);
    }

    if (e.code == 'KeyS') {
        simulation.mute.toggle();
    }
    else if (e.code == 'KeyF') {
        togglePreferences('fps');
    }
    else if (e.code == 'KeyB') {
        togglePreferences('bars');
    }
    else if (e.code == 'KeyM') {
        togglePreferences('frames');
    }
    else if (e.code == 'KeyT') {
        togglePreferences('text');
    }
    else if (e.code == 'Space') {
        simulation.pause();
    }
    else if (e.code == 'KeyA') {
        simulation.back();
    }
    else if (e.code == 'KeyD') {
        simulation.forward();
    }
    else if (!isNaN(e.key) && parseInt(e.key) >= 1 && parseInt(e.key) <= 5) {
        const index = parseInt(e.key) - 1;
        const followed = ui.getFollowed();
        if (followed) {
            if (followed.id == index) {
                ui.glads[index].follow(false);
            }
            else {
                ui.glads[followed.id].follow(false);
                ui.glads[index].follow(!ui.glads[index].isDead);
            }
        }
        else if (!ui.glads[index].isDead) {
            ui.glads[index].follow(true);
        }
    }
});

window.addEventListener('blur', () => simulation.pause(true));
// window.addEventListener('focus', () => simulation.pause(false));
window.onresize = () => simulation.resize();

function changeSoundIcon() {
    const soundObj = document.querySelector('#sound');
    soundObj.classList.remove("on", "off", "mute");

    if (simulation.preferences.sound.music > 0) {
        soundObj.classList.add("on");
    }
    else if (simulation.preferences.sound.sfx > 0) {
        soundObj.classList.add("off");
    }
    else {
        soundObj.classList.add("mute");
    }
}

function changeCrowd(value) {
    for (let i in render.npc) {
        const r = Math.random();
        const alive = render.npc[i].sprite.body.alive;
        if (r < value && !alive) {
            for (let j in render.npc[i].sprite)
                render.npc[i].sprite[j].revive();
        }
        else if (r > value && alive) {
            for (let j in render.npc[i].sprite)
                render.npc[i].sprite[j].kill();
        }
    }
}

export { simulation, ui };