import { showDialog, showMessage } from './components/dialog.js';
import { decorateCheckSliders } from './components/form-controls.js';
import { Slider } from './components/slider.js';
import { fadeIn, fadeOut, hide, show } from './helpers/animate.js';
import { copyText } from './helpers/clipboard.js';
import { createElement, renderTemplate } from './helpers/html.js';
import { formatTimeline, frameAt as frameIn } from './helpers/replay.js';
import { getImage, images } from './helpers/sprite-catalog.js';
import { fetchSpritesheet, getSpriteThumb } from './helpers/spritesheet.js';
import { TemplateVar } from './helpers/template-var.js';
import { BattleLogModel } from './models/battle-log.js';
import { PlaybackModel } from './models/playback.js';
import { SlotsModel } from './models/slots.js';
import { expandSimulation } from './render2/battle-state.js';
import {
    buffRowTemplate,
    commandRowTemplate,
    detailsTemplate,
    endMessageTemplate,
    helpTemplate,
    itemRowTemplate,
    loadErrorTemplate,
    settingsTemplate,
    shareTemplate,
} from './templates/playback.js';

/*
 * The replay page. The classic 2D renderer (render.js, a classic script) and
 * the 3D renderer (render2/) read and change the replay through page globals,
 * so the state they share is published on `window` by `exposeLegacyGlobals`:
 * `steps`, `timestep`, `pausesim`, `stepIncrement`, `hashes`, `newindex`,
 * `uiVars`, `timeSlider`, `fullscreen` and the functions they call. The 2D
 * renderer owns `prefs`, `game`, `music`, `json` and friends, read here through
 * `window`.
 */

/** Speeds of the classic DOM controls, in simlog steps per 0.1 s. */
const STEP_SPEEDS = [-10, -5, -2, -1, -0.5, 0.5, 1, 2, 5, 10];
/** Speeds of the 3D renderer's canvas controls. */
const PLAYBACK_SPEEDS = [0.1, 0.2, 0.5, 1, 2, 5, 10];
/** Longest log hash a URL may carry. */
const MAX_HASH = 32;

/** Replay state shared with the renderers. */
const state = {
    steps: [],
    timestep: 0,
    pausesim: true,
    stepIncrement: 1,
    hashes: [],
    newindex: [],
    uiVars: [],
    timeSlider: 0,
    fullscreen: false,
};

let timer = null;
let tournHash = null;
let loghash = null;
let stepSpeedIndex = STEP_SPEEDS.indexOf(1);
let resumeIncrement = 1;
let resumeIndex = STEP_SPEEDS.indexOf(1);
let playbackSpeedIndex = PLAYBACK_SPEEDS.indexOf(1);
let showFinalScore = true;
let resultShown = false;
/** Volumes the sound button brings back after muting. */
let rememberedMusic = 0.1;
let rememberedSfx = 1;
/** Potion identifier by item id, for the details window. */
let potionNames = null;
/** @type {Slider|null} */
let timeline = null;

/** @returns {Record<string, any>} The display preferences owned by render.js. */
function prefs() {
    return window.prefs;
}

/**
 * Shows a replay frame through whichever renderer is active.
 *
 * @param {object} frame Expanded simlog step.
 */
function showFrame(frame) {
    if (frame) window.phaser_update(frame);
}

/**
 * Frame at a fractional position of the replay.
 *
 * @param {number} index Step index, possibly fractional.
 * @returns {object|undefined}
 */
function frameAt(index) {
    return frameIn(state.steps, index);
}

/**
 * Moves the timeline to a position without firing its callbacks.
 *
 * @param {number} value Position in simlog steps.
 */
function syncTimeline(value) {
    if (!timeline) return;
    timeline.value = value;
    const label = document.querySelector('#time .ui-slider-time');
    const handle = document.querySelector('#time .ui-slider-handle');
    if (label) {
        label.textContent = formatTimeline(timeline.value);
        label.style.left = handle?.style.left ?? '0';
    }
}

/** @returns {number} Index of the gladiator the camera follows, or -1. */
function followedGladIndex() {
    if (window.followedGlad !== undefined && window.followedGlad !== null) return window.followedGlad;
    return [...document.querySelectorAll('.ui-glad')].findIndex(glad => glad.classList.contains('follow'));
}

/**
 * Name of an engine action id (render.js holds the list).
 *
 * @param {number|string} action Action id.
 * @returns {string|false}
 */
function getActionName(action) {
    return (window.actionlist ?? []).find(item => item.value == action)?.name ?? false;
}

// ----- sound ------------------------------------------------------------------

/** Shows music on, effects only or mute on the sound button. */
function changeSoundIcon() {
    const icon = document.querySelector('#sound img');
    if (!icon) return;
    const music = window.music;
    if ((!music && rememberedMusic > 0) || (music && music.volume > 0)) icon.src = 'icon/music.png';
    else if (prefs().sound.sfx > 0) icon.src = 'icon/music-off.png';
    else icon.src = 'icon/mute.png';
}

/** Cycles the audio: music and effects, effects only, silence (the remembered levels come back). */
function toggleSound() {
    const music = window.music;
    const sound = prefs().sound;
    if (music.volume > 0) {
        rememberedMusic = music.volume;
        music.volume = 0;
    }
    else if (sound.sfx > 0) {
        rememberedSfx = sound.sfx;
        sound.sfx = 0;
    }
    else {
        music.volume = rememberedMusic > 0 ? rememberedMusic : 0.1;
        sound.sfx = rememberedSfx > 0 ? rememberedSfx : 1;
    }
    changeSoundIcon();
    PlaybackModel.savePreferences({ music_volume: music.volume, sfx_volume: sound.sfx });
}

// ----- fullscreen and layout -------------------------------------------------------

/** @returns {boolean} Whether the page is in fullscreen. */
function isFullScreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

/**
 * Enters or leaves fullscreen.
 *
 * @param {boolean} enter Enter fullscreen.
 */
function setFullScreen(enter) {
    const body = document.body;
    if (enter) (body.requestFullscreen ?? body.webkitRequestFullscreen)?.call(body);
    else if (isFullScreen()) (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
    state.fullscreen = enter;
    setTimeout(resize, 100);
}

/**
 * Fits the battle to the window: the 3D renderer resizes itself, the 2D one
 * scales the camera to the arena and suggests portrait or fullscreen on phones.
 */
function resize() {
    if (window.battleRendererVersion === window.BattleRendererPreference?.THREE) {
        window.threeBattleRenderer?.resize();
        return;
    }
    const { game, screenW, screenH, arenaD, arenaX1, arenaY1 } = window;
    if (!game) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dialogOpen = Boolean(document.querySelector('#dialog-box'));
    let canvasW;
    let canvasH;
    if (width > height) {
        const usefulRatio = screenH / arenaD;
        canvasH = height;
        canvasW = Math.min(width, screenW * game.camera.scale.x);
        game.camera.scale.x = (height * usefulRatio) / screenH;
        game.camera.scale.y = (height * usefulRatio) / screenH;
        if (height < 450 && !dialogOpen) {
            showMessage('Em dispositivos móveis, a visualização das lutas é melhor no modo retrato');
        }
    }
    else {
        if (dialogOpen) document.querySelectorAll('#fog').forEach(fog => fog.remove());
        const usefulRatio = screenW / arenaD;
        canvasH = Math.min(height, screenH * game.camera.scale.y);
        canvasW = width;
        game.camera.scale.x = (width * usefulRatio) / screenW;
        game.camera.scale.y = (width * usefulRatio) / screenW;
        if (height < 600 && !isFullScreen() && !state.fullscreen && !document.querySelector('#dialog-box')) {
            showDialog('Em dispositivos móveis, a visualização das lutas é melhor em tela cheia. Deseja trocar?', ['Não', 'SIM']).then(answer => {
                if (answer === 'SIM') setFullScreen(true);
                state.fullscreen = true;
            });
        }
    }
    game.scale.setGameSize(canvasW, canvasH);
    game.camera.bounds.width = screenW;
    game.camera.bounds.height = screenH;
    game.camera.y = (arenaY1 + arenaD / 2) * game.camera.scale.y - game.height / 2;
    game.camera.x = (arenaX1 + arenaD / 2) * game.camera.scale.x - game.width / 2;
    document.querySelector('#canvas-div canvas')?.click();
}

/**
 * Revives or hides spectators to match a density.
 *
 * @param {number} density Share of spectators shown, 0 to 1.
 */
function changeCrowd(density) {
    Object.values(window.npc ?? {}).forEach(spectator => {
        const roll = Math.random();
        const alive = spectator.sprite.body.alive;
        if (roll < density && !alive) Object.values(spectator.sprite).forEach(part => part.revive());
        else if (roll > density && alive) Object.values(spectator.sprite).forEach(part => part.kill());
    });
}

// ----- playback loop -------------------------------------------------------------

/**
 * Shows the classic end-of-battle message: the survivor with the most hp
 * (or a draw), sharing and the way back to the tournament.
 */
function showEndMessage() {
    const last = state.steps[state.timestep];
    let winner = null;
    last.glads.forEach((glad, index) => {
        const card = document.querySelectorAll('.ui-glad')[index];
        if (parseFloat(glad.hp) > 0 && !card?.classList.contains('dead') && (!winner || winner.hp < parseFloat(glad.hp))) {
            winner = { index, name: glad.name, team: glad.user, hp: parseFloat(glad.hp) };
        }
    });

    if (new URLSearchParams(location.search).get('loop') === 'true') location.reload();

    const fog = createElement(renderTemplate(endMessageTemplate, { name: winner ? winner.name : 'Empate', team: winner ? winner.team : '' }));
    document.body.append(fog);
    const message = fog.querySelector('#end-message');
    fog.querySelector('#retornar').addEventListener('click', () => {
        showFinalScore = false;
        fog.remove();
        if (tournHash) location.href = `tourn/${tournHash}`;
    });
    fog.querySelector('#share').addEventListener('click', () => {
        hide(message);
        const link = `gladcode.dev/play/${loghash}`;
        const share = createElement(renderTemplate(shareTemplate, { hash: loghash, link }));
        fog.append(share);
        share.querySelector('#getlink').addEventListener('click', async () => {
            await copyText(link);
            const hash = share.querySelector('#hash');
            hash.textContent = 'Link copiado';
            hash.classList.add('clicked');
            setTimeout(() => {
                hash.classList.remove('clicked');
                hash.textContent = loghash;
            }, 500);
        });
        share.querySelector('#close').addEventListener('click', () => {
            share.remove();
            show(message);
        });
    });

    if (winner) fog.querySelector('#image').replaceChildren(getSpriteThumb(state.hashes[state.newindex[winner.index]], 'walk', 'down'));
    message.style.display = 'none';
    fadeIn(message, 1000);
    window.music.pause();
    window.victory.play('', 0, window.music.volume / 0.1);
}

/**
 * Plays the replay: one simlog step every 0.1 s divided by the speed. One timer
 * at a time, reading `state.steps` (a timer left running from before the replay
 * was expanded kept an empty copy and pinned the replay at its first frame).
 */
function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        const { steps } = state;
        if (state.pausesim) {
            // held: the replay starts paused until the renderer shows its first frame, so keep feeding the current one
            showFrame(frameAt(state.timestep));
            return;
        }
        if (state.timestep < 0) state.timestep = 0;

        if (window.Playback.threeD) {
            // the 3D renderer crowns the victor in the arena itself: nothing covers the battle or holds it
            if (state.timestep > steps.length - 1) {
                state.timestep = steps.length - 1;
                if (!resultShown) {
                    resultShown = true;
                    if (new URLSearchParams(location.search).get('loop') === 'true') location.reload();
                    window.threeBattleRenderer.battleEnded();
                    window.music.pause();
                    window.victory.play('', 0, window.music.volume / 0.1);
                }
            }
            else if (resultShown) {
                resultShown = false;
                window.threeBattleRenderer.battleResumed();
                window.music.resume();
            }
        }
        else if (state.timestep > steps.length - 1) {
            state.timestep = steps.length - 1;
            if (showFinalScore && !document.querySelector('#end-message')) showEndMessage();
        }
        else if (!showFinalScore) {
            document.querySelectorAll('#fog').forEach(fog => fog.remove());
            showFinalScore = true;
            window.music.resume();
        }

        if (state.timestep % 1 !== 0) {
            state.timestep = state.stepIncrement > 0 ? Math.floor(state.timestep) + 1 : Math.floor(state.timestep);
        }
        showFrame(steps[state.timestep]);
        state.timestep += state.stepIncrement / Math.abs(state.stepIncrement);
    }, 100 / Math.abs(state.stepIncrement));
}

// ----- classic controls ----------------------------------------------------------

/**
 * Writes the speed labels of the step buttons.
 *
 * @param {string} back Label of the back button.
 * @param {string} forward Label of the forward button.
 */
function setSpeedLabels(back, forward) {
    document.querySelector('#back-step .speed').textContent = back;
    document.querySelector('#fowd-step .speed').textContent = forward;
}

/** Shows the speed of the classic controls on their step buttons. */
function showSpeed() {
    const speed = STEP_SPEEDS[stepSpeedIndex];
    if (speed < 0) setSpeedLabels(`${speed}x`, '');
    else setSpeedLabels('', `${speed}x`);
}

/**
 * Paused: moves one step. Playing: changes the speed.
 *
 * @param {-1|1} direction Backwards or forwards.
 */
function stepButton(direction) {
    if (state.pausesim) {
        state.stepIncrement = direction;
        state.timestep = direction < 0
            ? Math.max(0, (state.timestep % 1 !== 0 ? Math.ceil(state.timestep) : state.timestep) - 1)
            : Math.min(state.steps.length - 1, (state.timestep % 1 !== 0 ? Math.floor(state.timestep) : state.timestep) + 1);
        setSpeedLabels(direction < 0 ? '-1' : '', direction < 0 ? '' : '+1');
        showFrame(frameAt(state.timestep));
        syncTimeline(state.timestep);
        return;
    }
    stepSpeedIndex = Math.max(0, Math.min(STEP_SPEEDS.length - 1, stepSpeedIndex + direction));
    state.stepIncrement = STEP_SPEEDS[stepSpeedIndex];
    showSpeed();
    startTimer();
}

/** Plays or pauses with the classic controls; pausing resets the speed so resume plays at 1x. */
function togglePauseButton() {
    const play = document.querySelector('#pause #img-play');
    const pause = document.querySelector('#pause #img-pause');
    if (state.pausesim) {
        state.pausesim = false;
        state.stepIncrement = resumeIncrement;
        stepSpeedIndex = resumeIndex;
        hide(play);
        show(pause);
        if (STEP_SPEEDS[stepSpeedIndex] === 1) setSpeedLabels('-1x', '1x');
        else showSpeed();
        if (state.timestep % 1 !== 0) {
            state.timestep = state.stepIncrement > 0 ? Math.floor(state.timestep) + 1 : Math.floor(state.timestep);
        }
        startTimer();
    }
    else {
        resumeIncrement = 1;
        resumeIndex = STEP_SPEEDS.indexOf(1);
        stepSpeedIndex = resumeIndex;
        state.pausesim = true;
        hide(pause);
        show(play);
        state.stepIncrement = 1;
        setSpeedLabels('-1', '+1');
        clearInterval(timer);
    }
}

function openHelp() {
    const fog = createElement(helpTemplate);
    document.body.append(fog);
    fog.querySelector('#ok').addEventListener('click', () => fog.remove());
}

/** The preferences window: renderer, overlays, volumes, crowd and 3D quality. */
function openSettings() {
    const fog = createElement(settingsTemplate);
    document.body.append(fog);
    const find = selector => fog.querySelector(selector);
    const options = prefs();
    const frames = document.querySelector('#ui-container');

    const soundTest = window.game.add.audio('lvlup');
    new Slider(find('#sfx-volume'), {
        range: 'min', min: 0, max: 1, step: 0.01, value: options.sound.sfx, ariaLabel: 'Volume dos efeitos',
        onSlide: value => {
            options.sound.sfx = value;
            soundTest.stop();
            soundTest.play('', 0.5, value);
            changeSoundIcon();
        },
    });
    new Slider(find('#music-volume'), {
        range: 'min', min: 0, max: 0.1, step: 0.001, value: window.music.volume, ariaLabel: 'Volume da música',
        onSlide: value => {
            window.music.volume = value;
            changeSoundIcon();
        },
    });
    new Slider(find('#n-crowd'), {
        range: 'min', min: 0, max: 1, step: 0.1, value: options.crowd, ariaLabel: 'Número de espectadores',
        onSlide: value => {
            window.changeCrowd(value);
            options.crowd = value;
        },
    });

    const toggles = { bars: 'bars', fps: 'fps', text: 'text', speech: 'speech' };
    Object.entries(toggles).forEach(([id, field]) => {
        const input = find(`#pref-${id} input`);
        input.checked = Boolean(options[field]);
        input.addEventListener('change', () => {
            options[field] = input.checked;
        });
    });
    const framesInput = find('#pref-frames input');
    framesInput.checked = getComputedStyle(frames).display === 'flex';
    framesInput.addEventListener('change', () => {
        options.frames = framesInput.checked;
        if (framesInput.checked) fadeIn(frames, undefined, 'flex');
        else fadeOut(frames);
    });

    const preference = window.BattleRendererPreference;
    if (preference.ENABLED === false) find('#renderer-choice').remove();
    else find(`#renderer-choice input[value='${preference.get()}']`).checked = true;
    // graphics quality only applies to the 3D renderer, and only once it is running
    if (window.Render2Quality) find('#render-quality').value = window.Render2Quality.get();
    else find('#quality-container').remove();
    decorateCheckSliders(fog);

    find('#ok').addEventListener('click', async () => {
        const selectedRenderer = find('#renderer-choice input:checked')?.value ?? preference.CLASSIC;
        let reload = selectedRenderer !== preference.get();
        preference.set(selectedRenderer);
        // a new graphics quality takes a reload (anti-aliasing and the floor bake are set when the arena starts)
        const quality = find('#render-quality')?.value;
        if (window.Render2Quality && quality && quality !== window.Render2Quality.get()) {
            window.Render2Quality.set(quality);
            reload = true;
        }

        await PlaybackModel.savePreferences({
            show_bars: options.bars,
            show_frames: framesInput.checked,
            show_fps: options.fps,
            show_text: options.text,
            show_speech: options.speech,
            sfx_volume: options.sound.sfx,
            music_volume: window.music.volume,
            crowd: options.crowd,
        }).catch(() => {});
        if (reload) {
            const url = new URL(location.href);
            url.searchParams.delete('renderer');
            location.assign(url);
            return;
        }
        fog.remove();
    });
}

// ----- gladiator frames and details (classic renderer) ------------------------------

/**
 * Creates the gladiators' frames of the classic renderer (the 3D one draws
 * its HUD on canvas and reports the followed gladiator through `followedGlad`).
 *
 * @param {number} count Gladiators.
 */
async function createUi(count) {
    if (document.documentElement.classList.contains('renderer-three')) {
        state.uiVars = Array.from({ length: count }, () => ({}));
        state.uiVars.showtext = true;
        return;
    }

    const container = document.querySelector('#ui-container');
    container.replaceChildren();
    const response = await fetch('ui_template.html');
    const template = await response.text();
    state.uiVars = [];
    for (let index = 0; index < count; index++) {
        const frame = document.createElement('div');
        frame.className = 'ui-glad';
        frame.innerHTML = template;
        frame.addEventListener('click', () => {
            const frames = document.querySelectorAll('.ui-glad');
            if (frame.classList.contains('follow') || frame.classList.contains('dead')) {
                window.game.camera.unfollow();
                frames.forEach(other => other.classList.remove('follow'));
                document.querySelector('#details')?.remove();
            }
            else {
                window.game.camera.follow(window.sprite[index]);
                frames.forEach(other => other.classList.remove('follow'));
                frame.classList.add('follow');
                createDetailedWindow();
            }
        });
        container.append(frame);
        state.uiVars.push({});
    }
    state.uiVars.showtext = true;
}

/**
 * Lets a window be dragged by its title.
 *
 * @param {HTMLElement} element Window.
 * @param {HTMLElement} handle Title bar.
 */
function makeDraggable(element, handle) {
    handle.style.touchAction = 'none';
    handle.addEventListener('pointerdown', event => {
        const start = { x: event.clientX - element.offsetLeft, y: event.clientY - element.offsetTop };
        handle.setPointerCapture(event.pointerId);
        const move = moveEvent => {
            element.style.left = `${moveEvent.clientX - start.x}px`;
            element.style.top = `${moveEvent.clientY - start.y}px`;
        };
        const stop = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', stop);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', stop);
    });
}

/** Opens the details window of the followed gladiator (classic renderer). */
function createDetailedWindow() {
    const glad = window.json.glads[followedGladIndex()];
    document.querySelector('#details')?.remove();
    const buffs = Object.keys(glad.buffs).map(name => renderTemplate(buffRowTemplate, { name })).join('');
    const details = createElement(renderTemplate(detailsTemplate, { name: glad.name, buffs }));
    document.body.append(details);
    fadeIn(details);
    makeDraggable(details, details.querySelector('#title'));
    details.querySelector('#minimize').addEventListener('click', () => {
        details.style.transition = 'top 0.4s, left 0.4s';
        details.style.top = `${window.innerHeight - 33}px`;
        details.style.left = `${window.innerWidth - 350}px`;
        setTimeout(() => {
            details.style.transition = '';
        }, 400);
    });

    potionNames ??= SlotsModel.items().then(({ potions }) => Object.fromEntries(
        Object.entries(potions).map(([identifier, potion]) => [potion.id, identifier]),
    ));
}

/** Refreshes the details window of the followed gladiator (called by render.js). */
async function updateDetailedWindow() {
    const details = document.querySelector('#details');
    const glad = window.json?.glads?.[followedGladIndex()];
    if (!details || !glad) return;

    const values = [
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
        getActionName(glad.action),
        glad.INT,
        glad.as.toFixed(1),
        glad.cs.toFixed(1),
        glad.spd.toFixed(1),
        glad.lockedfor.toFixed(1),
    ];
    details.querySelectorAll('input').forEach((input, index) => {
        input.value = values[index];
    });
    details.querySelector('#head span').style.transform = `rotate(${glad.head.toFixed(0)}deg)`;

    const cells = details.querySelectorAll('#buffs #box span');
    Object.values(glad.buffs).forEach((buff, row) => {
        const active = parseFloat(buff.timeleft) > 0;
        for (let column = 0; column < 3; column++) cells[row * 3 + column]?.classList.toggle('active', active);
        if (cells[row * 3 + 1]) cells[row * 3 + 1].textContent = buff.value.toFixed(1);
        if (cells[row * 3 + 2]) cells[row * 3 + 2].textContent = buff.timeleft.toFixed(1);
    });

    if (glad.code) {
        const box = details.querySelector('#code #box');
        const rows = box.querySelectorAll('.row');
        const last = rows[rows.length - 1];
        if (glad.code !== last?.querySelector('.name').textContent) {
            box.insertAdjacentHTML('beforeend', renderTemplate(commandRowTemplate, { code: glad.code, time: window.json.simtime.toFixed(1) }));
            if (box.querySelectorAll('.row').length > 5) box.querySelector('.row').remove();
        }
        else {
            const duration = last.querySelector('.duration');
            duration.textContent = (parseFloat(duration.textContent) + 0.1).toFixed(1);
        }
    }

    const names = await potionNames;
    const items = details.querySelector('#items #box');
    glad.items?.forEach((item, index) => {
        const existing = items.querySelectorAll('.row span')[index];
        if (existing) {
            existing.classList.toggle('used', existing.textContent === '-' || item == 0);
            return;
        }
        let potion = '-';
        if (item > 0) potion = names?.[item] ?? item;
        else if (item == -1) potion = '😎';
        items.insertAdjacentHTML('beforeend', renderTemplate(itemRowTemplate, { potion }));
    });
}

// ----- loading -------------------------------------------------------------------

/**
 * Shows loading progress.
 *
 * @param {string} status Status line.
 * @param {number} second Progress of the current task, in %.
 * @param {number} main Overall progress, in %.
 */
function setLoading(status, second, main) {
    document.querySelector('#loadbar #status').textContent = status;
    document.querySelector('#loadbar #second .bar').style.width = `${second}%`;
    document.querySelector('#loadbar #main .bar').style.width = `${main}%`;
}

/**
 * Replaces the loading bars with a message.
 *
 * @param {string} message Why the battle cannot be shown.
 */
function showLoadError(message) {
    document.querySelector('#loadbar').innerHTML = renderTemplate(loadErrorTemplate, { message });
    clearInterval(timer);
}

/**
 * Starts the renderer and the replay once the gladiators' sheets are ready.
 *
 * @param {object[]} simulation Incremental simlog steps.
 */
async function startBattle(simulation) {
    window.json = {};
    document.querySelector('#loadbar #status').textContent = 'Carregando render';
    await (window.battleRendererReady || Promise.resolve());
    if (!window.load_phaser()) return;

    const count = simulation[0].glads.length;
    await createUi(count);
    await window.threeBattleRenderer?.prepare?.(simulation[0].glads);
    if (timeline) timeline.max = simulation.length;
    state.newindex = Array.from({ length: count }, (_, index) => index);
    state.steps = expandSimulation(simulation);
    startTimer();
}

/** Downloads the battle log and builds every gladiator's spritesheet. */
async function loadBattle() {
    let log;
    try {
        log = await BattleLogModel.get(loghash, {
            onProgress: ratio => setLoading('Fazendo download do log de batalha', Math.round(ratio * 100), (ratio * 100) / 4),
        });
    }
    catch (error) {
        if (error.code === 'LOG_EXPIRED') showLoadError('Esta batalha é muito antiga e não está mais acessível');
        else if (tournHash) location.href = `tourn/${tournHash}`;
        else showLoadError('Esta batalha não consta nos registros');
        return;
    }

    const { glads } = log[0];
    window.stab = [];
    window.gender = [];
    glads.forEach((glad, index) => {
        window.stab[index] = '0';
        window.gender[index] = 'male';
        let skin = [];
        try {
            skin = JSON.parse(glad.skin);
        }
        catch {
            skin = [];
        }
        skin.forEach(id => {
            const item = getImage(id);
            if (item?.move === 'thrust') window.stab[index] = '1';
            if (item?.id === 'female') window.gender[index] = 'female';
        });
    });

    let built = 0;
    state.hashes = await Promise.all(glads.map(async glad => {
        const sheet = await fetchSpritesheet(glad.skin);
        built++;
        const percent = Math.round((100 * built) / glads.length);
        setLoading('Montando gladiadores', percent, 25 + percent / 4);
        return sheet;
    }));
    setTimeout(() => startBattle(log), 100);
}

/** Applies the viewer's saved preferences. */
async function loadPreferences() {
    const data = await PlaybackModel.preferences();
    const flag = value => value === true || value === 'true';
    const options = prefs();
    options.bars = flag(data.show_bars);
    options.fps = flag(data.show_fps);
    options.text = flag(data.show_text);
    options.speech = flag(data.show_speech);
    options.crowd = parseFloat(data.crowd);
    options.sound.music = parseFloat(data.music_volume);
    options.sound.sfx = parseFloat(data.sfx_volume);
    rememberedMusic = options.sound.music;
    rememberedSfx = options.sound.sfx;
    changeSoundIcon();

    const frames = document.querySelector('#ui-container');
    options.frames = flag(data.show_frames);
    if (options.frames) fadeIn(frames, undefined, 'flex');
    else fadeOut(frames);
}

// ----- page API ---------------------------------------------------------------------

/**
 * Replay control for the 3D renderer's canvas controls (the classic renderer
 * keeps its DOM buttons). Speeds are simlog steps per 0.1 s; stepping always pauses first.
 */
const Playback = {
    get threeD() { return window.battleRendererVersion === window.BattleRendererPreference?.THREE && Boolean(window.threeBattleRenderer); },
    get paused() { return state.pausesim; },
    get speed() { return PLAYBACK_SPEEDS[playbackSpeedIndex]; },
    get speeds() { return PLAYBACK_SPEEDS; },
    get speedIndex() { return playbackSpeedIndex; },
    get position() { return state.timestep; },
    get length() { return state.steps.length; },
    get tournament() { return tournHash || null; },
    get link() { return `gladcode.dev/play/${loghash}`; },
    setPaused(paused) {
        if (paused === state.pausesim) return;
        clearInterval(timer);
        state.pausesim = paused;
        if (!paused) {
            state.stepIncrement = PLAYBACK_SPEEDS[playbackSpeedIndex];
            if (state.timestep % 1 !== 0) state.timestep = Math.floor(state.timestep) + 1;
            startTimer();
        }
    },
    togglePause() { this.setPaused(!state.pausesim); },
    step(direction) {
        this.setPaused(true);
        state.timestep = direction < 0
            ? Math.max(0, Math.ceil(state.timestep) - 1)
            : Math.min(state.steps.length - 1, Math.floor(state.timestep) + 1);
        showFrame(frameAt(state.timestep));
    },
    setSpeed(index) {
        playbackSpeedIndex = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, index));
        state.stepIncrement = PLAYBACK_SPEEDS[playbackSpeedIndex];
        if (!state.pausesim) startTimer();
    },
    faster() { this.setSpeed(playbackSpeedIndex + 1); },
    slower() { this.setSpeed(playbackSpeedIndex - 1); },
    seek(position) {
        state.timestep = Math.max(0, Math.min(state.steps.length - 1, position));
        showFrame(frameAt(state.timestep));
    },
    toggleSound() { toggleSound(); },
    get soundState() {
        if (window.music && window.music.volume > 0) return 'music';
        return prefs().sound.sfx > 0 ? 'sfx' : 'mute';
    },
    savePrefs(fields) { PlaybackModel.savePreferences(fields); },
    openSettings() { openSettings(); },
    get fullscreen() { return isFullScreen(); },
    toggleFullscreen() { setFullScreen(!isFullScreen()); },
    /** Moves the classic timeline to the replay position (render.js calls it every step). */
    syncTimeline,
};

/** Publishes the replay state and functions the renderers use as page globals. */
function exposeLegacyGlobals() {
    Object.keys(state).forEach(name => {
        Object.defineProperty(window, name, {
            configurable: true,
            get: () => state[name],
            set: value => {
                state[name] = value;
            },
        });
    });
    Object.assign(window, {
        Playback,
        resize,
        changeCrowd,
        changeSoundIcon,
        getActionName,
        updateDetailedWindow,
        getSpriteThumb,
        images,
    });
}

/** Binds the classic controls, the timeline and the pause-on-leave behaviour. */
function bindControls() {
    document.querySelector('#back-step').addEventListener('click', () => stepButton(-1));
    document.querySelector('#fowd-step').addEventListener('click', () => stepButton(1));
    document.querySelector('#pause').addEventListener('click', togglePauseButton);
    document.querySelector('#fullscreen').addEventListener('click', () => setFullScreen(!isFullScreen()));
    document.querySelector('#help').addEventListener('click', openHelp);
    document.querySelector('#settings').addEventListener('click', openSettings);
    document.querySelector('#sound').addEventListener('click', toggleSound);

    const time = document.querySelector('#time');
    let wasPlaying = false;
    timeline = new Slider(time, {
        range: 'min',
        min: 0,
        max: 0,
        // fractions of a simlog step so playback can stop between two steps
        step: 0.1,
        value: state.timestep,
        ariaLabel: 'Momento da batalha',
        // scrub with playback held, then continue from the new position at 1x speed
        onStart: () => {
            wasPlaying = !state.pausesim;
            if (wasPlaying) togglePauseButton();
        },
        onSlide: value => {
            state.timestep = value;
            syncTimeline(value);
            showFrame(frameAt(value));
        },
        onChange: () => {
            if (wasPlaying && state.pausesim) togglePauseButton();
        },
    });
    time.insertAdjacentHTML('beforeend', "<div class='ui-slider-time'></div>");

    // leaving the window (another tab or application) pauses; clicks inside the page never do
    const pauseOnLeave = () => {
        if (state.pausesim) return;
        if (Playback.threeD) Playback.setPaused(true);
        else togglePauseButton();
    };
    window.addEventListener('blur', pauseOnLeave);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseOnLeave();
    });
    window.addEventListener('resize', resize);
}

/** Reads the log and tournament the page was opened with, then loads the battle. */
function start() {
    exposeLegacyGlobals();
    document.querySelector('#loadbar #status').textContent = 'Página carregada';
    document.querySelector('#footer-wrapper')?.classList.add('white');
    bindControls();

    tournHash = TemplateVar.get('tournament') || null;
    const hash = TemplateVar.get('logHash') ?? '';

    if (!hash) return;
    if (hash.length > MAX_HASH) {
        showMessage('Erro na URL');
        return;
    }
    loghash = hash;
    loadBattle();
    loadPreferences().catch(() => {});
}

start();
