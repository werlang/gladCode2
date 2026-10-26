import { FONT, ICON_FONT, INK, NUMBER_FONT, TITLE_FONT, nineSlice, outlined, roundRect } from './hud.js';
import { INSPECT_LABELS } from './camera-controller.js';

/** Font Awesome 6 solid glyphs used as icons. */
const ICONS = Object.freeze({
    settings: '', expand: '', compress: '', back: '', forward: '', play: '', pause: '',
    slower: '', faster: '+', music: '', sfx: '', mute: '', help: '?', share: '',
    tournament: '', fixed: '', follow: '', first: '', cinematic: '', free: '',
    close: '', up: '', down: '', mouse: '', keyboard: '', touch: '',
});
const BAR_MARGIN = 10;
const FRAME_BORDER = 14;
const GOLD = '#f7e7c2';
const BRONZE = 'rgba(200, 145, 58, 0.6)';
const PANEL_FILL = 'rgba(17, 12, 9, 0.92)';
/** Speed cue colours: slow motion, normal, fast forward. */
const SPEED_COLORS = { slow: '#86c2ff', normal: GOLD, fast: '#ffa040' };
const INSPECT_WIDTH = 310;
const INSPECT_TITLE = 38;
const INSPECT_HEIGHT = 440;
const COMMAND_HISTORY = 5;
const TOAST_SECONDS = 1.6;
/** The victor's laurels: fade in, hold, fade out (seconds). */
const LAUREL_TIMES = [0.9, 5, 1.2];
const LAUREL_SIZE = 560;

/** A row of the control bar: [id, width] buttons and plain-number gaps. */
const BUTTONS = [
    ['settings', 40], ['fullscreen', 40], 14, ['back', 40], ['play', 50], ['forward', 40], 14,
    ['slower', 34], ['speed', 96], ['faster', 34], 14, ['camera', 40], ['sound', 40], ['share', 40], ['help', 40],
];
/**
 * Control bar layouts in bar pixels (the bar is then scaled to the screen): `wide` is one row of buttons under the
 * timeline; `compact` (a phone held upright, a narrow window) puts playback and speed on one row and the rest on
 * another, with larger targets. `rows` are [centre y, buttons].
 */
const BAR_LAYOUTS = Object.freeze({
    wide: { width: 660, height: 96, track: { x: 30, y: 30, right: 112 }, buttonHeight: 38, rows: [[66, BUTTONS]] },
    compact: {
        width: 372,
        height: 160,
        track: { x: 26, y: 30, right: 110 },
        buttonHeight: 44,
        rows: [
            [76, [['back', 44], ['play', 56], ['forward', 44], 12, ['slower', 42], ['speed', 80], ['faster', 42]]],
            [124, [['settings', 48], ['fullscreen', 48], ['camera', 48], ['sound', 48], ['share', 48], ['help', 48]]],
        ],
    },
});
/** The wide bar is kept while it fits at this scale or more; on a touch screen it may grow up to `TOUCH_BAR_SCALE`. */
const WIDE_MIN_SCALE = 0.9;
const TOUCH_BAR_SCALE = 1.15;
/** Height of the timeline's grab area (bar pixels): a finger needs more than the mouse. */
const TRACK_GRIP = { mouse: 20, touch: 38 };
/** Touch: seconds without a touch before the playing replay's controls fade away (a tap on the arena brings them back), and the fade. */
const CHROME_IDLE_SECONDS = 4;
const CHROME_FADE_SECONDS = 0.3;
const BUFF_NAMES = { burn: 'Queimando', movement: 'Velocidade', resist: 'Proteção', invisible: 'Invisível', stun: 'Atordoado' };

/** The shortcuts window: [title, icon, rows of [keys, action]], in two columns. */
const SHORTCUTS = Object.freeze([
    [
        ['Mouse', 'mouse', [
            ['Arrastar (esq.)', 'Mover a câmera'],
            ['Arrastar (dir.)', 'Girar / olhar em volta'],
            ['Roda', 'Zoom / distância'],
            ['Clique', 'Inspecionar (painel ou arena)'],
        ]],
        ['Exibição', 'keyboard', [
            ['M', 'Painéis dos gladiadores'],
            ['B', 'Barras de hp e ap'],
            ['T', 'Números de dano e cura'],
            ['F', 'Quadros por segundo'],
            ['S', 'Música / efeitos / mudo'],
            ['H', 'Esta janela'],
        ]],
    ],
    [
        ['Reprodução', 'keyboard', [
            ['Espaço', 'Pausar / continuar'],
            ['←  A', 'Pausar e voltar um passo'],
            ['→  D', 'Pausar e avançar um passo'],
            ['−  /  +', 'Velocidade 0,1× a 10×'],
        ]],
        ['Inspeção', 'first', [
            ['1 – 5', 'Inspecionar gladiador'],
            ['C', 'Câmera: fixa, 3ª, 1ª pessoa'],
            ['Esc', 'Fechar janela / parar'],
        ]],
    ],
]);
/** The same window on a touch screen: the gestures, in one column. */
const GESTURES = Object.freeze([
    [
        ['Gestos', 'touch', [
            ['Arrastar 1 dedo', 'Girar / olhar em volta'],
            ['Arrastar 2 dedos', 'Mover a câmera'],
            ['Pinça', 'Zoom / distância'],
            ['Torcer 2 dedos', 'Virar a arena'],
            ['Tocar no gladiador', 'Inspecionar'],
            ['Tocar no painel', 'Inspecionar'],
            ['Tocar na arena', 'Mostrar / ocultar controles'],
        ]],
    ],
]);
/** Shortcuts window sizes: two columns for the keyboard, one for the gestures; `key` is the key-cap column. */
const HELP_SPECS = Object.freeze({ keyboard: { width: 680, height: 540, key: 118 }, touch: { width: 400, height: 380, key: 140 } });

const formatSpeed = (speed) => `${String(speed).replace('.', ',')}×`;
const formatClock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const fixed = (value, digits = 1) => (Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '-');
const speedTone = (speed) => (speed < 1 ? 'slow' : speed > 1 ? 'fast' : 'normal');
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Replay controls and windows drawn on the battle canvas, in the HUD's screen-space scene (no DOM): the control bar
 * (timeline, settings, fullscreen, step back/forward, play/pause, speed −/+ with its cue, inspect camera, sound,
 * share, shortcuts), the status badge and toasts, the FPS counter, the shortcuts window, the inspect window (opens
 * minimized) and the victor's laurels. Playback goes through `window.Playback` (playback.js); camera and selection
 * through the `host` callbacks. Every texture is redrawn only when what it shows changes. On a narrow screen the bar
 * takes its two-row compact layout; on a touch screen the targets grow, hover tips give way to pressed buttons and the
 * bar fades while the replay plays untouched (a tap on the arena brings it back).
 */
export class PlaybackControls {
    #hud;
    #host;
    #container;
    #canvas;
    #sprites = {};
    #keys = {};
    #regions = [];
    #hover = null;
    #scrub = null;
    #scale = 1;
    #bar = { x: 0, y: 0 };
    /** The bar layout in use (`BAR_LAYOUTS`), picked each frame from the screen width. */
    #layout = BAR_LAYOUTS.wide;
    /** Touch: the bar's fade (alpha), whether it is faded away, and the seconds since the last touch. */
    #chrome = { alpha: 1, hidden: false, idle: 0 };
    /** Whether the browser can go fullscreen (an iPhone cannot: the button is left out). */
    #canFullscreen = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    #help = false;
    #inspect = { index: null, open: false, history: [], lastTime: -Infinity };
    #potions = null;
    #fps = { frames: 0, time: 0, value: 0 };
    #toast = { text: '', age: Infinity };
    #badgePulse = 0;
    #badgeText = '';
    #laurel = null;
    #copied = 0;
    /** Scratch context for measuring text. */
    #measure = null;

    /**
     * @param {{ hud: import('./hud.js').BattleHud, canvas: HTMLCanvasElement, host: {
     *   fighters: () => import('./fighter.js').Fighter[], inspected: () => number|null, select: (index: number) => void,
     *   stopInspect: () => void, camera: () => { mode: string, inspectMode: string, ghost: boolean }, cycleCamera: () => string,
     *   exitGhost: () => void,
     *   reattach: () => void, frame: () => Record<string, unknown>|null } }} options Dependencies.
     */
    constructor({ hud, canvas, host }) {
        this.#hud = hud;
        this.#host = host;
        this.#canvas = canvas;
        this.#container = canvas.parentElement;
        for (const name of ['bar', 'tooltip', 'badge', 'toast', 'fps', 'backdrop', 'help', 'inspect', 'laurel']) {
            const sprite = hud.addSprite();
            sprite.visible = false;
            this.#sprites[name] = sprite;
        }
        this.#sprites.laurel.center.set(0.5, 0.5);
        window.addEventListener('pointerdown', this.#handleDown, true);
        window.addEventListener('pointermove', this.#handleMove);
        window.addEventListener('pointerup', this.#handleUp);
        window.addEventListener('pointercancel', this.#handleUp);
        window.addEventListener('keydown', this.#handleKey);
    }

    // ------------------------------------------------------------------ public

    /**
     * Opens the inspect window for a gladiator, minimized (null closes it).
     *
     * @param {number|null} index Fighter index.
     */
    inspect(index) {
        if (index === this.#inspect.index) return;
        this.#inspect = { index, open: false, history: [], lastTime: -Infinity };
        if (index !== null) this.#loadPotions();
    }

    /**
     * Notes the inspected gladiator's command on a newly applied frame (the window lists the last few).
     *
     * @param {Record<string, unknown>} state Applied frame.
     */
    record(state) {
        const { index, history } = this.#inspect;
        const glad = index === null ? null : state?.glads?.[index];
        const time = Number(state?.simtime);
        if (!glad || !(time > this.#inspect.lastTime)) {
            if (time < this.#inspect.lastTime) {
                history.length = 0;
                this.#inspect.lastTime = time;
            }
            return;
        }
        const step = Number.isFinite(this.#inspect.lastTime) ? time - this.#inspect.lastTime : 0.1;
        this.#inspect.lastTime = time;
        const code = typeof glad.code === 'string' ? glad.code : '';
        if (!code) return;
        const last = history[history.length - 1];
        if (last?.name === code) last.duration += step;
        else {
            history.push({ name: code, duration: 0.1, time });
            if (history.length > COMMAND_HISTORY) history.shift();
        }
    }

    /**
     * Crowns the victor: laurels round it in the middle of the view for a few seconds; null shows a draw.
     *
     * @param {{ state: Record<string, unknown>, appearance: { team: number } }|null} victor Winning fighter.
     */
    showVictory(victor) {
        this.#laurel = { victor, age: 0 };
        this.#keys.laurel = null;
    }

    /** @returns {boolean} Whether the victor's laurels are showing (the overhead cards make way). */
    get crowning() {
        return Boolean(this.#laurel);
    }

    /** Takes the laurels away (a rewind). */
    hideVictory() {
        this.#laurel = null;
        this.#sprites.laurel.visible = false;
    }

    /**
     * Shows a short message under the status badge.
     *
     * @param {string} text Message.
     */
    toast(text) {
        this.#toast = { text, age: 0 };
        this.#keys.toast = null;
    }

    /**
     * A tap or click on the arena that the camera did not turn into a drag. On a touch screen a tap that picked
     * no gladiator shows the faded controls, or hides them.
     *
     * @param {{ touch: boolean, picked: boolean }} tap Whether it was a finger, and whether it selected a gladiator.
     */
    tap({ touch, picked }) {
        if (picked || !touch || this.#chrome.hidden) this.#wake();
        else this.#chrome.hidden = true;
    }

    /** Shows the controls and restarts their idle timer. */
    #wake() {
        this.#chrome.hidden = false;
        this.#chrome.idle = 0;
    }

    /**
     * Lays out and redraws what changed. Call once per frame before the HUD renders.
     *
     * @param {number} realDt Real seconds since the previous frame.
     * @param {Record<string, unknown>} preferences The page's display preferences (`window.prefs`).
     */
    update(realDt, preferences) {
        const playback = window.Playback;
        this.#regions = [];
        const { width, height } = this.#hud.size;
        const insets = this.#hud.insets;
        const touch = this.#hud.touch;
        // The one-row bar while it fits, the two-row one on a phone held upright; inside the safe area.
        const room = width - 16 - insets.left - insets.right;
        this.#layout = room / BAR_LAYOUTS.wide.width >= WIDE_MIN_SCALE ? BAR_LAYOUTS.wide : BAR_LAYOUTS.compact;
        this.#scale = Math.min(touch ? TOUCH_BAR_SCALE : 1, room / this.#layout.width);
        this.#bar = {
            x: Math.round(insets.left + (width - insets.left - insets.right - this.#layout.width * this.#scale) / 2),
            y: Math.round(height - BAR_MARGIN - insets.bottom - this.#layout.height * this.#scale),
        };
        this.#updateChrome(realDt, playback);
        if (playback) {
            this.#updateBar(playback);
            this.#updateBadge(playback, realDt);
        }
        this.#updateToast(realDt);
        this.#updateFps(realDt, preferences);
        this.#updateInspect();
        this.#updateLaurel(realDt);
        this.#updateHelp();
        this.#updateTooltip();
        this.#copied = Math.max(0, this.#copied - realDt);
    }

    /** Releases listeners, sprites and textures. */
    destroy() {
        window.removeEventListener('pointerdown', this.#handleDown, true);
        window.removeEventListener('pointermove', this.#handleMove);
        window.removeEventListener('pointerup', this.#handleUp);
        window.removeEventListener('pointercancel', this.#handleUp);
        window.removeEventListener('keydown', this.#handleKey);
        Object.values(this.#sprites).forEach((sprite) => {
            sprite.material.map?.dispose();
            sprite.material.dispose();
            sprite.removeFromParent();
        });
    }

    // ------------------------------------------------------------------ drawing helpers

    /** Sizes a sprite's canvas, places it (top-left, CSS pixels from the top) and returns a cleared context. */
    #canvasFor(name, width, height) {
        const sprite = this.#sprites[name];
        const canvas = this.#hud.sizeSprite(sprite, width, height);
        const ctx = canvas.getContext('2d');
        const ratio = canvas.width / width;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        return ctx;
    }

    #place(name, x, y, width, height, scale = 1) {
        const sprite = this.#sprites[name];
        sprite.scale.set(width * scale, height * scale, 1);
        sprite.position.set(Math.round(x), Math.round(this.#hud.size.height - y), 0);
        sprite.visible = true;
        sprite.renderOrder = { backdrop: 4000, help: 4001, tooltip: 4100 }[name] ?? 3500;
    }

    #commit(name) {
        this.#sprites[name].material.map.needsUpdate = true;
    }

    /** Gold-framed dark panel, the same Synty frame as the roster. */
    #panel(ctx, x, y, width, height, border = FRAME_BORDER) {
        ctx.fillStyle = PANEL_FILL;
        roundRect(ctx, x + border * 0.4, y + border * 0.4, width - border * 0.8, height - border * 0.8, 4);
        ctx.fill();
        const frame = this.#hud.art('frame');
        if (frame) nineSlice(ctx, frame, x, y, width, height, 118, border);
        else {
            ctx.strokeStyle = '#c8913a';
            ctx.lineWidth = 2;
            roundRect(ctx, x + 1, y + 1, width - 2, height - 2, 5);
            ctx.stroke();
        }
    }

    #icon(ctx, glyph, x, y, size, color = GOLD) {
        ctx.font = `900 ${size}px ${ICON_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(glyph, x, y + 0.5);
    }

    /** Registers a clickable area (CSS pixels from the top-left of the canvas). */
    #region(id, x, y, width, height, tip = '') {
        this.#regions.push({ id, x, y, width, height, tip });
    }

    #hit(event) {
        const rect = this.#canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        for (let i = this.#regions.length - 1; i >= 0; i -= 1) {
            const region = this.#regions[i];
            if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) return { region, x, y };
        }
        return null;
    }

    /**
     * Top edge (CSS pixels) for something at the top of the screen spanning [x, x + width]: below the notch, and below
     * the roster when the roster reaches across that span (the two-column phone roster).
     */
    #topY(x, width) {
        const roster = this.#hud.rosterBounds;
        const top = 10 + this.#hud.insets.top;
        if (!roster.width || roster.x > x + width || roster.x + roster.width < x) return top;
        return Math.max(top, Math.round(roster.y + roster.height + 8));
    }

    /** @returns {number} Where windows above the control bar sit on (the bar's top, or the bottom once it faded away). */
    #barTop() {
        return this.#chrome.alpha > 0 ? this.#bar.y : this.#hud.size.height - BAR_MARGIN - this.#hud.insets.bottom;
    }

    /** Touch: fades the bar out after a while of playing untouched; it always shows while paused, scrubbing or in a window. */
    #updateChrome(realDt, playback) {
        const chrome = this.#chrome;
        const autoHide = this.#hud.touch && playback && !playback.paused && !this.#scrub && !this.#help;
        if (!autoHide) this.#wake();
        else if (!chrome.hidden && (chrome.idle += realDt) > CHROME_IDLE_SECONDS) chrome.hidden = true;
        const step = realDt / CHROME_FADE_SECONDS;
        chrome.alpha = chrome.hidden ? Math.max(0, chrome.alpha - step) : Math.min(1, chrome.alpha + step);
    }

    // ------------------------------------------------------------------ control bar

    #layoutButtons() {
        const { width: barWidth, buttonHeight, rows } = this.#layout;
        const buttons = [];
        for (const [rowY, row] of rows) {
            const items = row.filter((item) => this.#canFullscreen || item[0] !== 'fullscreen');
            const total = items.reduce((sum, item) => sum + (Array.isArray(item) ? item[1] + 4 : item), 0) - 4;
            let x = (barWidth - total) / 2;
            for (const item of items) {
                if (!Array.isArray(item)) {
                    x += item;
                    continue;
                }
                const [id, width] = item;
                buttons.push({ id, x, y: rowY - buttonHeight / 2, width, height: buttonHeight });
                x += width + 4;
            }
        }
        return buttons;
    }

    #tips(playback, camera) {
        const sound = { music: 'Música e efeitos ligados', sfx: 'Só efeitos sonoros', mute: 'Áudio desligado' }[playback.soundState];
        const view = camera.mode === 'cinematic' ? 'cinematográfica' : this.#inspect.index === null ? `inspeção ${INSPECT_LABELS[camera.inspectMode]}` : INSPECT_LABELS[camera.inspectMode];
        return {
            settings: 'Preferências',
            fullscreen: playback.fullscreen ? 'Sair da tela cheia' : 'Tela cheia',
            back: 'Pausar e voltar um passo (←)',
            play: playback.paused ? 'Continuar (Espaço)' : 'Pausar (Espaço)',
            forward: 'Pausar e avançar um passo (→)',
            slower: 'Mais devagar (−)',
            speed: `Velocidade ${formatSpeed(playback.speed)}`,
            faster: 'Mais rápido (+)',
            camera: `Câmera: ${view} (C)`,
            sound: `${sound} (S)`,
            share: this.#copied > 0 ? 'Link copiado!' : 'Copiar o link da batalha',
            help: 'Atalhos (H)',
        };
    }

    #updateBar(playback) {
        const camera = this.#host.camera();
        const steps = Math.max(1, playback.length - 1);
        const { width: barWidth, height: barHeight, track } = this.#layout;
        const trackWidth = barWidth - track.x - track.right;
        const progress = Math.max(0, Math.min(1, playback.position / steps));
        const frame = this.#host.frame();
        const now = Number(frame?.simtime) || playback.position / 10;
        const total = steps / 10;
        const buttons = this.#layoutButtons();
        const tips = this.#tips(playback, camera);
        const inspecting = this.#inspect.index !== null;
        const key = [Math.round(progress * trackWidth), formatClock(now), formatClock(total), playback.paused, playback.speedIndex, playback.soundState,
            playback.fullscreen, camera.mode, camera.inspectMode, inspecting, this.#hover, this.#help, this.#hud.artVersion, this.#copied > 0,
            this.#layout === BAR_LAYOUTS.wide, this.#hud.touch].join('|');
        const s = this.#scale;
        const { x: left, y: top } = this.#bar;
        const sprite = this.#sprites.bar;
        if (this.#chrome.alpha <= 0) {
            sprite.visible = false;
            return;
        }
        // Clickable areas, in screen pixels (none while fading away, so taps reach the arena).
        if (!this.#chrome.hidden) {
            const grip = TRACK_GRIP[this.#hud.touch ? 'touch' : 'mouse'];
            this.#region('bar', left, top, barWidth * s, barHeight * s);
            this.#region('track', left + (track.x - 6) * s, top + (track.y - grip / 2) * s, (trackWidth + 12) * s, grip * s);
            for (const button of buttons) this.#region(button.id, left + button.x * s, top + button.y * s, button.width * s, button.height * s, tips[button.id]);
        }
        this.#place('bar', left, top, barWidth, barHeight, s);
        sprite.material.opacity = smooth(this.#chrome.alpha);
        if (this.#keys.bar === key) return;
        this.#keys.bar = key;

        const ctx = this.#canvasFor('bar', barWidth, barHeight);
        this.#panel(ctx, 0, 0, barWidth, barHeight);
        // Timeline: dark trough, gold progress, a sapphire handle (larger for a finger); the clock on the right.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        roundRect(ctx, track.x, track.y - 3, trackWidth, 6, 3);
        ctx.fill();
        const fill = ctx.createLinearGradient(0, track.y - 3, 0, track.y + 3);
        fill.addColorStop(0, '#ffe7a0');
        fill.addColorStop(1, '#d9962c');
        ctx.fillStyle = fill;
        roundRect(ctx, track.x, track.y - 2, Math.max(4, trackWidth * progress), 4, 2);
        ctx.fill();
        const handleX = track.x + trackWidth * progress;
        const knob = (this.#hud.touch ? 11 : 8) + (this.#hover === 'track' || this.#scrub ? 1 : 0);
        ctx.beginPath();
        ctx.arc(handleX, track.y, knob, 0, Math.PI * 2);
        ctx.fillStyle = '#c8913a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(handleX, track.y, knob - 3, 0, Math.PI * 2);
        ctx.fillStyle = '#31a7c7';
        ctx.fill();
        outlined(ctx, `${formatClock(now)} / ${formatClock(total)}`, barWidth - track.right + 14, track.y + 1, { font: `700 13px ${TITLE_FONT}`, color: GOLD, width: 2, maxWidth: track.right - 18 });

        for (const button of buttons) this.#drawButton(ctx, button, playback, camera, inspecting);
        this.#commit('bar');
    }

    #drawButton(ctx, { id, x, y, width, height }, playback, camera, inspecting) {
        const hover = this.#hover === id;
        const active = (id === 'camera' && (inspecting || camera.mode === 'cinematic')) || (id === 'help' && this.#help);
        if (id !== 'speed') {
            ctx.fillStyle = hover ? 'rgba(255, 214, 140, 0.22)' : active ? 'rgba(255, 214, 140, 0.14)' : 'rgba(255, 255, 255, 0.06)';
            roundRect(ctx, x, y, width, height, 6);
            ctx.fill();
            ctx.strokeStyle = active ? '#f0c453' : hover ? '#e2b25a' : BRONZE;
            ctx.lineWidth = active ? 2 : 1;
            ctx.stroke();
        }
        const cx = x + width / 2;
        const cy = y + height / 2;
        const glyph = {
            settings: ICONS.settings,
            fullscreen: playback.fullscreen ? ICONS.compress : ICONS.expand,
            back: ICONS.back,
            play: playback.paused ? ICONS.play : ICONS.pause,
            forward: ICONS.forward,
            slower: ICONS.slower,
            faster: ICONS.faster,
            camera: camera.mode === 'cinematic' ? ICONS.cinematic : inspecting && camera.mode === 'free' ? ICONS.free : ICONS[camera.inspectMode],
            sound: ICONS[playback.soundState],
            share: ICONS.share,
            help: ICONS.help,
        }[id];
        if (id === 'speed') {
            this.#drawSpeed(ctx, x, y, width, height, playback);
            return;
        }
        const dim = id === 'camera' && !inspecting && camera.mode !== 'cinematic';
        this.#icon(ctx, glyph, cx, id === 'camera' ? cy - 4 : cy, id === 'play' ? 20 : 17, dim ? 'rgba(247, 231, 194, 0.45)' : id === 'play' ? '#fff3c4' : GOLD);
        if (id === 'camera') {
            const label = camera.mode === 'cinematic' ? 'CINE' : { fixed: 'FIXA', follow: '3ª P', first: '1ª P' }[camera.inspectMode];
            outlined(ctx, label, cx, y + height - 7, { font: `700 8px ${FONT}`, color: dim ? 'rgba(247, 231, 194, 0.5)' : '#f0c453', align: 'center', width: 2 });
        }
    }

    /** Speed cue: the rate in its colour (blue slow motion, gold normal, orange fast) over a row of pips. */
    #drawSpeed(ctx, x, y, width, height, playback) {
        const tone = SPEED_COLORS[speedTone(playback.speed)];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        roundRect(ctx, x, y, width, height, 6);
        ctx.fill();
        ctx.strokeStyle = BRONZE;
        ctx.lineWidth = 1;
        ctx.stroke();
        outlined(ctx, formatSpeed(playback.speed), x + width / 2, y + 14, { font: `20px ${NUMBER_FONT}`, color: playback.paused ? 'rgba(247, 231, 194, 0.55)' : tone, align: 'center', width: 3 });
        const count = playback.speeds.length;
        const gap = (width - 16) / (count - 1);
        playback.speeds.forEach((speed, index) => {
            const px = x + 8 + index * gap;
            const py = y + height - 8;
            const on = index <= playback.speedIndex;
            const size = index === playback.speedIndex ? 4 : 3;
            ctx.beginPath();
            ctx.moveTo(px, py - size);
            ctx.lineTo(px + size, py);
            ctx.lineTo(px, py + size);
            ctx.lineTo(px - size, py);
            ctx.closePath();
            ctx.fillStyle = on ? SPEED_COLORS[speedTone(speed)] : 'rgba(255, 255, 255, 0.18)';
            ctx.fill();
        });
    }

    // ------------------------------------------------------------------ badge, toast, fps, tooltip

    /** Top-centre cue: PAUSADO while paused, the rate while it is not 1×; it pulses when either changes. */
    #updateBadge(playback, realDt) {
        const text = playback.paused ? 'PAUSADO' : playback.speed !== 1 ? `${playback.speed > 1 ? 'ACELERADO' : 'CÂMERA LENTA'}  ${formatSpeed(playback.speed)}` : '';
        if (text !== this.#badgeText) {
            this.#badgeText = text;
            this.#badgePulse = 1;
        }
        this.#badgePulse = Math.max(0, this.#badgePulse - realDt * 3);
        const sprite = this.#sprites.badge;
        if (!text) {
            sprite.visible = false;
            return;
        }
        const tone = playback.paused ? GOLD : SPEED_COLORS[speedTone(playback.speed)];
        const glyph = playback.paused ? ICONS.pause : playback.speed > 1 ? '' : '';
        // Sized to the text as drawn (Cinzel capitals run wider than a per-letter guess).
        const measure = this.#measure ??= document.createElement('canvas').getContext('2d');
        measure.font = `700 14px ${TITLE_FONT}`;
        const width = Math.ceil(44 + measure.measureText(text).width);
        const height = 34;
        const key = `${text}|${this.#hud.artVersion}`;
        if (this.#keys.badge !== key) {
            this.#keys.badge = key;
            const ctx = this.#canvasFor('badge', width, height);
            this.#panel(ctx, 0, 0, width, height, 10);
            this.#icon(ctx, glyph, 20, height / 2, 13, tone);
            outlined(ctx, text, 32, height / 2 + 1, { font: `700 14px ${TITLE_FONT}`, color: tone, width: 3 });
            this.#commit('badge');
        }
        const scale = 1 + 0.12 * smooth(this.#badgePulse);
        const x = (this.#hud.size.width - width) / 2;
        this.#place('badge', (this.#hud.size.width - width * scale) / 2, this.#topY(x, width), width, height, scale);
    }

    #updateToast(realDt) {
        const toast = this.#toast;
        toast.age += realDt;
        const sprite = this.#sprites.toast;
        if (!toast.text || toast.age > TOAST_SECONDS) {
            sprite.visible = false;
            return;
        }
        const width = 24 + toast.text.length * 8.2;
        const height = 30;
        if (this.#keys.toast !== toast.text) {
            this.#keys.toast = toast.text;
            const ctx = this.#canvasFor('toast', width, height);
            ctx.fillStyle = 'rgba(17, 12, 9, 0.85)';
            roundRect(ctx, 0, 0, width, height, 8);
            ctx.fill();
            outlined(ctx, toast.text, width / 2, height / 2 + 1, { font: `700 13px ${FONT}`, color: GOLD, align: 'center', width: 2 });
            this.#commit('toast');
        }
        const x = (this.#hud.size.width - width) / 2;
        this.#place('toast', x, this.#topY(x, width) + 42, width, height);
        sprite.material.opacity = Math.min(1, (TOAST_SECONDS - toast.age) / 0.4);
    }

    #updateFps(realDt, preferences) {
        const fps = this.#fps;
        const sprite = this.#sprites.fps;
        if (!preferences?.fps) {
            sprite.visible = false;
            fps.frames = 0;
            fps.time = 0;
            return;
        }
        fps.frames += 1;
        fps.time += realDt;
        if (fps.time >= 1) {
            fps.value = fps.frames / fps.time;
            fps.frames = 0;
            fps.time = 0;
        }
        const text = `FPS ${fps.value.toFixed(1)}`;
        const width = 92;
        const height = 28;
        if (this.#keys.fps !== text) {
            this.#keys.fps = text;
            const ctx = this.#canvasFor('fps', width, height);
            ctx.fillStyle = 'rgba(17, 12, 9, 0.8)';
            roundRect(ctx, 0, 0, width, height, 6);
            ctx.fill();
            ctx.strokeStyle = BRONZE;
            ctx.stroke();
            outlined(ctx, text, width / 2, height / 2 + 1, { font: `15px ${NUMBER_FONT}`, color: fps.value >= 50 ? '#9be870' : fps.value >= 30 ? '#f0c453' : '#ff8a70', align: 'center', width: 2 });
            this.#commit('fps');
        }
        const x = this.#hud.size.width - this.#hud.insets.right - width - 10;
        const y = this.#topY(x, width);
        // Under the roster on a phone, where the badge sits too: one line lower.
        this.#place('fps', x, y > 10 + this.#hud.insets.top ? y + 42 : y, width, height);
    }

    #updateTooltip() {
        const sprite = this.#sprites.tooltip;
        // No hover on a touch screen: a finger's press only lights its button.
        const region = this.#hud.touch ? null : this.#regions.find((candidate) => candidate.id === this.#hover && candidate.tip);
        if (!region || this.#scrub) {
            sprite.visible = false;
            return;
        }
        const width = Math.ceil(16 + region.tip.length * 6.6);
        const height = 24;
        if (this.#keys.tooltip !== region.tip) {
            this.#keys.tooltip = region.tip;
            const ctx = this.#canvasFor('tooltip', width, height);
            ctx.fillStyle = 'rgba(17, 12, 9, 0.95)';
            roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 5);
            ctx.fill();
            ctx.strokeStyle = '#c8913a';
            ctx.stroke();
            outlined(ctx, region.tip, width / 2, height / 2 + 1, { font: `600 12px ${FONT}`, color: GOLD, align: 'center', width: 0.01 });
            this.#commit('tooltip');
        }
        const x = Math.max(4, Math.min(this.#hud.size.width - width - 4, region.x + region.width / 2 - width / 2));
        this.#place('tooltip', x, region.y - height - 6, width, height);
    }

    // ------------------------------------------------------------------ shortcuts window

    #updateHelp() {
        const { backdrop, help } = this.#sprites;
        if (!this.#help) {
            backdrop.visible = false;
            help.visible = false;
            return;
        }
        const { width: screenWidth, height: screenHeight } = this.#hud.size;
        if (this.#keys.backdrop !== 1) {
            this.#keys.backdrop = 1;
            const ctx = this.#canvasFor('backdrop', 4, 4);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, 4, 4);
            this.#commit('backdrop');
        }
        this.#place('backdrop', 0, 0, screenWidth, screenHeight);
        backdrop.scale.set(screenWidth, screenHeight, 1);
        this.#region('backdrop', 0, 0, screenWidth, screenHeight);

        const touch = this.#hud.touch;
        const { width: W, height: H, key: keyWidth } = HELP_SPECS[touch ? 'touch' : 'keyboard'];
        const pages = touch ? GESTURES : SHORTCUTS;
        const columnWidth = W / pages.length;
        // A lone column keeps clear of the right frame as the two columns keep clear of each other.
        const textRoom = (pages.length > 1 ? columnWidth : W - 26) - keyWidth - 44;
        const scale = Math.min(1, (screenWidth - 16) / W, (screenHeight - 16) / H);
        const x = (screenWidth - W * scale) / 2;
        const y = (screenHeight - H * scale) / 2;
        this.#region('help-window', x, y, W * scale, H * scale);
        this.#region('help-close', x + (W - 46) * scale, y + 12 * scale, 32 * scale, 32 * scale, 'Fechar (Esc)');
        this.#region('help-ok', x + (W / 2 - 50) * scale, y + (H - 52) * scale, 100 * scale, 34 * scale);
        this.#place('help', x, y, W, H, scale);
        const key = `${this.#hud.artVersion}|${this.#hover}|${touch}`;
        if (this.#keys.help === key) return;
        this.#keys.help = key;

        const ctx = this.#canvasFor('help', W, H);
        this.#panel(ctx, 0, 0, W, H, 18);
        outlined(ctx, touch ? 'Controles' : 'Atalhos', W / 2, 32, { font: `900 22px ${TITLE_FONT}`, color: GOLD, align: 'center', width: 3 });
        this.#icon(ctx, ICONS.close, W - 30, 28, 16, this.#hover === 'help-close' ? '#fff3c4' : GOLD);
        const section = (title, glyph, rows, left, top) => {
            this.#icon(ctx, ICONS[glyph], left + 9, top, 15, '#f0c453');
            outlined(ctx, title, left + 24, top + 1, { font: `700 15px ${TITLE_FONT}`, color: '#f0c453', width: 2 });
            rows.forEach(([keys, text], index) => {
                const rowY = top + 30 + index * 28;
                ctx.font = `700 12px ${FONT}`;
                const capWidth = Math.min(keyWidth, ctx.measureText(keys).width + 16);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                roundRect(ctx, left, rowY - 11, capWidth, 22, 5);
                ctx.fill();
                ctx.strokeStyle = BRONZE;
                ctx.lineWidth = 1;
                ctx.stroke();
                outlined(ctx, keys, left + capWidth / 2, rowY + 1, { font: `700 12px ${FONT}`, color: '#fff3c4', align: 'center', width: 0.01, maxWidth: capWidth - 10 });
                outlined(ctx, text, left + keyWidth + 10, rowY + 1, { font: `13px ${FONT}`, color: '#e9dcc0', width: 0.01, maxWidth: textRoom });
            });
            return top + 30 + rows.length * 28 + 14;
        };
        pages.forEach((sections, column) => {
            let top = 78;
            for (const [title, glyph, rows] of sections) top = section(title, glyph, rows, 30 + column * (columnWidth - 10), top);
        });
        const hover = this.#hover === 'help-ok';
        ctx.fillStyle = hover ? 'rgba(255, 214, 140, 0.3)' : 'rgba(255, 214, 140, 0.16)';
        roundRect(ctx, W / 2 - 50, H - 52, 100, 34, 7);
        ctx.fill();
        ctx.strokeStyle = '#e2b25a';
        ctx.stroke();
        outlined(ctx, 'OK', W / 2, H - 34, { font: `700 15px ${TITLE_FONT}`, color: GOLD, align: 'center', width: 2 });
        this.#commit('help');
    }

    // ------------------------------------------------------------------ inspect window

    #loadPotions() {
        if (this.#potions) return;
        this.#potions = {};
        const body = new URLSearchParams({ action: 'ITEMS' });
        fetch('back_slots.php', { method: 'POST', body }).then((response) => response.json()).then((data) => {
            for (const [name, potion] of Object.entries(data?.potions ?? {})) this.#potions[potion.id] = name;
            this.#keys.inspect = null;
        }).catch(() => {});
    }

    #updateInspect() {
        const sprite = this.#sprites.inspect;
        const { index, open, history } = this.#inspect;
        const fighter = index === null ? null : this.#host.fighters()[index];
        if (!fighter) {
            sprite.visible = false;
            return;
        }
        const glad = fighter.state;
        const camera = this.#host.camera();
        const height = open ? INSPECT_HEIGHT : INSPECT_TITLE;
        // Bottom right above the control bar, inside the safe area and clear of a roster that reaches across.
        const insets = this.#hud.insets;
        const right = this.#hud.size.width - insets.right - 8;
        const bottom = this.#barTop() - 8;
        const roster = this.#hud.rosterBounds;
        const ceiling = roster.width && roster.x + roster.width > right - INSPECT_WIDTH ? roster.y + roster.height + 8 : insets.top + 8;
        const s = Math.max(0.5, Math.min(1, (right - insets.left - 8) / INSPECT_WIDTH, (bottom - ceiling) / height));
        const x = right - INSPECT_WIDTH * s;
        const y = bottom - height * s;
        // The title's buttons take its full height, so a finger finds them.
        this.#region('inspect', x, y, INSPECT_WIDTH * s, height * s);
        this.#region('inspect-toggle', x, y, (INSPECT_WIDTH - 120) * s, INSPECT_TITLE * s, open ? 'Minimizar' : 'Mostrar detalhes');
        this.#region('inspect-camera', x + (INSPECT_WIDTH - 118) * s, y, 84 * s, INSPECT_TITLE * s, 'Câmera da inspeção (C)');
        this.#region('inspect-close', x + (INSPECT_WIDTH - 34) * s, y, 34 * s, INSPECT_TITLE * s, 'Parar a inspeção (Esc)');
        this.#place('inspect', x, y, INSPECT_WIDTH, height, s);

        const viewLabel = camera.mode === 'cinematic' ? 'Cinema' : camera.mode === 'free' ? 'Livre' : INSPECT_LABELS[camera.inspectMode];
        const fields = open ? this.#inspectFields(glad, history) : null;
        const key = JSON.stringify([open, viewLabel, glad.name, this.#hover, this.#hud.artVersion, fields]);
        if (this.#keys.inspect === key) return;
        this.#keys.inspect = key;

        const ctx = this.#canvasFor('inspect', INSPECT_WIDTH, height);
        this.#panel(ctx, 0, 0, INSPECT_WIDTH, height, 12);
        const team = `#${fighter.appearance.team.toString(16).padStart(6, '0')}`;
        ctx.fillStyle = team;
        ctx.beginPath();
        ctx.arc(20, INSPECT_TITLE / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        outlined(ctx, String(glad.name ?? ''), 32, INSPECT_TITLE / 2 + 1, { font: `700 13px ${TITLE_FONT}`, color: GOLD, width: 2, maxWidth: INSPECT_WIDTH - 190 });
        this.#icon(ctx, open ? ICONS.down : ICONS.up, INSPECT_WIDTH - 132, INSPECT_TITLE / 2, 11, this.#hover === 'inspect-toggle' ? '#fff3c4' : '#d8c49a');
        // Camera chip: the inspect mode, click (or C) to change it.
        const chipHover = this.#hover === 'inspect-camera';
        ctx.fillStyle = chipHover ? 'rgba(255, 214, 140, 0.3)' : 'rgba(255, 214, 140, 0.14)';
        roundRect(ctx, INSPECT_WIDTH - 116, 8, 80, 22, 6);
        ctx.fill();
        ctx.strokeStyle = '#e2b25a';
        ctx.lineWidth = 1;
        ctx.stroke();
        const glyph = camera.mode === 'cinematic' ? ICONS.cinematic : camera.mode === 'free' ? ICONS.free : ICONS[camera.inspectMode];
        this.#icon(ctx, glyph, INSPECT_WIDTH - 102, 19, 10, '#f0c453');
        outlined(ctx, viewLabel, INSPECT_WIDTH - 90, 20, { font: `700 10px ${FONT}`, color: GOLD, width: 0.01 });
        this.#icon(ctx, ICONS.close, INSPECT_WIDTH - 20, 19, 13, this.#hover === 'inspect-close' ? '#fff3c4' : GOLD);
        if (open) this.#drawInspectBody(ctx, glad, fields);
        this.#commit('inspect');
    }

    #inspectFields(glad, history) {
        const action = Number(glad.action);
        const actionName = (typeof window.getActionName === 'function' && window.getActionName(action)) || String(action);
        const buffs = Object.entries(glad.buffs ?? {}).map(([name, buff]) => [name, fixed(buff?.value), fixed(buff?.timeleft), Number(buff?.timeleft) > 0]);
        const items = (Array.isArray(glad.items) ? glad.items : []).map((item) => {
            const id = Number(item);
            if (id === 0) return ['-', true];
            if (id === -1) return ['qualquer', false];
            return [this.#potions?.[id] ?? `#${id}`, false];
        });
        return {
            stats: [
                ['Nível', String(glad.lvl), 'XP', `${glad.xp} / ${glad.tonext}`],
                ['STR', String(glad.STR), 'AGI', String(glad.AGI)],
                ['INT', String(glad.INT), 'Velocid.', fixed(glad.spd)],
                ['X', fixed(glad.x), 'Y', fixed(glad.y)],
                ['Direção', `${fixed(glad.head, 0)}°`, 'Travado', fixed(glad.lockedfor)],
                ['AS', fixed(glad.as), 'CS', fixed(glad.cs)],
            ],
            hp: [Number(glad.hp), Number(glad.maxhp)],
            ap: [Number(glad.ap), Number(glad.maxap)],
            action: actionName,
            head: Number(glad.head),
            buffs,
            items,
            history: history.map((entry) => [entry.name, fixed(entry.duration), fixed(entry.time)]),
        };
    }

    #drawInspectBody(ctx, glad, fields) {
        const left = 16;
        const right = INSPECT_WIDTH - 16;
        let y = INSPECT_TITLE + 12;
        const label = (text, x, at, color = '#bfae8a') => outlined(ctx, text, x, at, { font: `600 11px ${FONT}`, color, width: 0.01 });
        const value = (text, x, at, color = GOLD) => outlined(ctx, text, x, at, { font: `14px ${NUMBER_FONT}`, color, width: 2, maxWidth: 110 });
        const [hp, maxhp] = fields.hp;
        const [ap, maxap] = fields.ap;
        this.#hud.drawBar(ctx, left - 4, y - 8, right - left + 8, 24, Math.max(0, Math.min(1, hp / Math.max(1, maxhp))), '#ff4b3e', { text: `${fixed(hp)} / ${maxhp}` });
        y += 22;
        this.#hud.drawBar(ctx, left - 4, y - 8, right - left + 8, 20, Math.max(0, Math.min(1, ap / Math.max(1, maxap))), '#4f8dff', { text: `${fixed(ap)} / ${maxap}` });
        y += 26;
        label('Ação', left, y);
        value(fields.action, left + 44, y + 1, '#fff3c4');
        // Facing arrow.
        ctx.save();
        ctx.translate(right - 10, y);
        ctx.rotate((fields.head * Math.PI) / 180);
        this.#icon(ctx, '', 0, 0, 13, '#f0c453');
        ctx.restore();
        y += 20;
        for (const [a, av, b, bv] of fields.stats) {
            label(a, left, y);
            value(av, left + 56, y + 1);
            label(b, left + 146, y);
            value(bv, left + 204, y + 1);
            y += 19;
        }
        y += 4;
        ctx.fillStyle = 'rgba(200, 145, 58, 0.4)';
        ctx.fillRect(left, y - 8, right - left, 1);
        label('Efeitos', left, y + 2, '#f0c453');
        const active = fields.buffs.filter((buff) => buff[3]);
        if (!active.length) label('nenhum', left + 60, y + 2, '#8d8169');
        active.forEach(([name, amount, left_], i) => {
            const bx = left + 60 + (i % 2) * 112;
            const by = y + 2 + Math.floor(i / 2) * 18;
            label(`${BUFF_NAMES[name] ?? name} ${amount} · ${left_}s`, bx, by, '#e9dcc0');
        });
        y += 8 + Math.max(1, Math.ceil(active.length / 2)) * 18;
        label('Itens', left, y + 2, '#f0c453');
        if (!fields.items.length) label('nenhum', left + 60, y + 2, '#8d8169');
        fields.items.forEach(([name, used], i) => {
            const ix = left + 60 + (i % 3) * 74;
            const iy = y + 2 + Math.floor(i / 3) * 18;
            label(name, ix, iy, used ? '#6d6455' : '#e9dcc0');
            if (used) {
                ctx.fillStyle = '#6d6455';
                ctx.fillRect(ix, iy, Math.min(70, ctx.measureText(name).width), 1);
            }
        });
        y += 8 + Math.max(1, Math.ceil(fields.items.length / 3)) * 18;
        label('Comandos', left, y + 2, '#f0c453');
        label('durac.', right - 86, y + 2);
        label('tempo', right - 36, y + 2);
        fields.history.slice().reverse().forEach(([name, duration, time], i) => {
            const cy = y + 20 + i * 16;
            outlined(ctx, name, left, cy, { font: `11px ui-monospace, Menlo, Consolas, monospace`, color: i === 0 ? '#fff3c4' : '#b9ab8c', width: 0.01, maxWidth: right - left - 100 });
            label(duration, right - 86, cy, '#e9dcc0');
            label(time, right - 36, cy, '#e9dcc0');
        });
    }

    // ------------------------------------------------------------------ victor's laurels

    /** Laurels round the victor (kept centred by the cinematic camera), its name and master on a ribbon. */
    #updateLaurel(realDt) {
        const sprite = this.#sprites.laurel;
        const laurel = this.#laurel;
        if (!laurel) {
            sprite.visible = false;
            return;
        }
        laurel.age += realDt;
        const [fadeIn, hold, fadeOut] = LAUREL_TIMES;
        if (laurel.age > fadeIn + hold + fadeOut) {
            this.#laurel = null;
            sprite.visible = false;
            return;
        }
        const key = `${laurel.victor?.state?.name}|${this.#hud.artVersion}`;
        if (this.#keys.laurel !== key) {
            this.#keys.laurel = key;
            this.#drawLaurel(this.#canvasFor('laurel', LAUREL_SIZE, LAUREL_SIZE), laurel.victor);
            this.#commit('laurel');
        }
        const { width, height } = this.#hud.size;
        const appear = smooth(Math.min(1, laurel.age / fadeIn));
        const vanish = 1 - smooth(Math.max(0, Math.min(1, (laurel.age - fadeIn - hold) / fadeOut)));
        const size = Math.min(width, height) * 0.82 * (0.92 + 0.08 * appear);
        sprite.position.set(width / 2, height / 2, 0);
        sprite.scale.set(size, size, 1);
        sprite.material.opacity = appear * vanish;
        sprite.renderOrder = 3400;
        sprite.visible = true;
    }

    #drawLaurel(ctx, victor) {
        const c = LAUREL_SIZE / 2;
        const glow = ctx.createRadialGradient(c, c, c * 0.5, c, c, c * 0.98);
        glow.addColorStop(0, 'rgba(255, 220, 140, 0)');
        glow.addColorStop(0.75, 'rgba(255, 210, 120, 0.12)');
        glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, LAUREL_SIZE, LAUREL_SIZE);
        if (!victor) {
            outlined(ctx, 'EMPATE', c, c, { font: `900 56px ${TITLE_FONT}`, color: GOLD, align: 'center', width: 6 });
            return;
        }
        // Two golden laurel branches meeting under the victor, open at the top.
        const radius = c * 0.74;
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(c, c);
            ctx.scale(side, 1);
            ctx.strokeStyle = '#8a5a1c';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(0, 0, radius, Math.PI * 0.53, Math.PI * 1.32);
            ctx.stroke();
            const leaves = 19;
            for (let i = 0; i < leaves; i += 1) {
                const t = i / (leaves - 1);
                const angle = Math.PI * (0.56 + t * 0.74);
                const size = 46 - t * 20;
                for (const out of [-1, 0, 1]) {
                    if (out === 0 && i % 2) continue;
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    ctx.save();
                    ctx.translate(px, py);
                    // Leaves point along the branch toward its tip, splayed in and out of the ring.
                    ctx.rotate(angle + out * 0.7);
                    const leaf = ctx.createLinearGradient(-size * 0.3, 0, size * 0.3, 0);
                    leaf.addColorStop(0, '#fff0b0');
                    leaf.addColorStop(0.5, '#e6b34a');
                    leaf.addColorStop(1, '#a8701e');
                    ctx.fillStyle = leaf;
                    ctx.strokeStyle = 'rgba(70, 40, 8, 0.85)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(size * 0.5, size * 0.45, 0, size * 1.1);
                    ctx.quadraticCurveTo(-size * 0.5, size * 0.45, 0, 0);
                    ctx.fill();
                    ctx.stroke();
                    ctx.strokeStyle = 'rgba(120, 70, 15, 0.7)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, size * 0.1);
                    ctx.lineTo(0, size * 0.95);
                    ctx.stroke();
                    ctx.restore();
                }
                if (i % 3 === 1) {
                    ctx.fillStyle = '#ffdd73';
                    ctx.beginPath();
                    ctx.arc(Math.cos(angle) * (radius - 8), Math.sin(angle) * (radius - 8), 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        outlined(ctx, 'VITÓRIA', c, c - radius - 6, { font: `900 40px ${TITLE_FONT}`, color: '#ffe7a0', align: 'center', width: 6 });
        // The ribbon tying the branches, with the victor's name and master.
        const name = String(victor.state?.name ?? '');
        const master = String(victor.state?.user ?? '');
        const ribbonY = c + radius - 6;
        const ribbonWidth = Math.min(LAUREL_SIZE - 20, Math.max(260, name.length * 20 + 80));
        const ribbon = ctx.createLinearGradient(0, ribbonY - 30, 0, ribbonY + 30);
        ribbon.addColorStop(0, '#c42b2b');
        ribbon.addColorStop(1, '#7a1414');
        ctx.fillStyle = ribbon;
        ctx.strokeStyle = '#f0c453';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c - ribbonWidth / 2 - 22, ribbonY - 22);
        ctx.lineTo(c - ribbonWidth / 2, ribbonY - 30);
        ctx.lineTo(c + ribbonWidth / 2, ribbonY - 30);
        ctx.lineTo(c + ribbonWidth / 2 + 22, ribbonY - 22);
        ctx.lineTo(c + ribbonWidth / 2 + 6, ribbonY + 4);
        ctx.lineTo(c + ribbonWidth / 2 + 22, ribbonY + 30);
        ctx.lineTo(c - ribbonWidth / 2 - 22, ribbonY + 30);
        ctx.lineTo(c - ribbonWidth / 2 - 6, ribbonY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        outlined(ctx, name, c, ribbonY - 7, { font: `900 26px ${TITLE_FONT}`, color: '#fff6dc', align: 'center', width: 4, maxWidth: ribbonWidth - 10 });
        if (master) outlined(ctx, master, c, ribbonY + 17, { font: `700 15px ${TITLE_FONT}`, color: '#ffd98a', align: 'center', width: 3, maxWidth: ribbonWidth - 20 });
    }

    // ------------------------------------------------------------------ input

    #act(id, hit) {
        const playback = window.Playback;
        const host = this.#host;
        switch (id) {
            case 'settings': playback?.openSettings(); break;
            case 'fullscreen': playback?.toggleFullscreen(); break;
            case 'back': playback?.step(-1); break;
            case 'forward': playback?.step(1); break;
            case 'play': playback?.togglePause(); break;
            case 'slower': playback?.slower(); break;
            case 'faster': playback?.faster(); break;
            case 'speed': break;
            case 'camera':
            case 'inspect-camera': this.#cycleCamera(); break;
            case 'sound': playback?.toggleSound(); break;
            case 'share': this.#share(); break;
            case 'help':
            case 'help-close':
            case 'help-ok':
            case 'backdrop': this.#help = id === 'help' ? !this.#help : false; break;
            case 'inspect-toggle': this.#inspect.open = !this.#inspect.open; break;
            case 'inspect-close': host.stopInspect(); break;
            case 'track': this.#startScrub(hit.x); break;
            default: break;
        }
        this.#keys.bar = null;
    }

    #cycleCamera() {
        const mode = this.#host.cycleCamera();
        this.toast(`Câmera da inspeção: ${INSPECT_LABELS[mode]}`);
    }

    #share() {
        const link = window.Playback?.link;
        if (!link) return;
        // A phone offers its own share sheet (messages, apps); elsewhere the link is copied.
        if (this.#hud.touch && navigator.share) {
            navigator.share({ title: document.title, url: `https://${link}` }).catch(() => {});
            return;
        }
        navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
        this.#copied = 2;
        this.toast('Link da batalha copiado');
    }

    #startScrub(x) {
        const playback = window.Playback;
        if (!playback) return;
        this.#scrub = { wasPlaying: !playback.paused };
        playback.setPaused(true);
        this.#scrubTo(x);
    }

    #scrubTo(x) {
        const playback = window.Playback;
        const { width, track } = this.#layout;
        const trackWidth = (width - track.x - track.right) * this.#scale;
        const start = this.#bar.x + track.x * this.#scale;
        const share = Math.max(0, Math.min(1, (x - start) / trackWidth));
        playback.seek(Math.round(share * (playback.length - 1) * 10) / 10);
    }

    #handleDown = (event) => {
        if (!this.#container?.contains(event.target)) return;
        // The HUD follows the last kind of press: finger-sized and auto-hiding for touch, hover tips for the mouse.
        this.#hud.touch = event.pointerType === 'touch';
        if (this.#hud.touch) this.#chrome.idle = 0;
        const hit = this.#hit(event);
        if (!hit) return;
        // Everything under the controls stays away from the camera and the roster.
        event.stopPropagation();
        event.preventDefault();
        this.#wake();
        // A finger lights the button it presses (there is no hover to show it).
        if (this.#hud.touch) this.#hover = hit.region.id;
        if (event.button === 0) this.#act(hit.region.id, hit);
    };

    #handleMove = (event) => {
        if (this.#scrub) {
            const rect = this.#canvas.getBoundingClientRect();
            this.#scrubTo(event.clientX - rect.left);
            return;
        }
        if (event.pointerType !== 'mouse') return;
        const hit = event.target instanceof Node && this.#container?.contains(event.target) ? this.#hit(event) : null;
        const id = hit?.region.id ?? null;
        if (id !== this.#hover) {
            this.#hover = id;
            this.#canvas.style.cursor = id && !['bar', 'inspect', 'help-window', 'backdrop', 'speed'].includes(id) ? 'pointer' : '';
        }
    };

    #handleUp = (event) => {
        if (event.pointerType !== 'mouse') this.#hover = null;
        if (!this.#scrub) return;
        if (this.#scrub.wasPlaying) window.Playback?.setPaused(false);
        this.#scrub = null;
    };

    #handleKey = (event) => {
        const target = /** @type {HTMLElement|null} */ (event.target);
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        const playback = window.Playback;
        const prefs = window.prefs ?? {};
        const toggle = (name, field, label) => {
            prefs[name] = !prefs[name];
            playback?.savePrefs({ [field]: prefs[name] });
            this.toast(`${label}: ${prefs[name] ? 'sim' : 'não'}`);
        };
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        // Holding a key only repeats stepping and speed (holding C must not spin the inspect modes).
        if (event.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', '+', '=', '-', '_'].includes(key)) return;
        // The ghost camera flies with WASD, QE and the arrows (see camera-controller.js); Esc lands it.
        if (this.#host.camera().ghost) {
            if (['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                event.preventDefault();
                return;
            }
            if (key === 'Escape' && !this.#help) {
                event.preventDefault();
                this.#host.exitGhost?.();
                return;
            }
        }
        const actions = {
            ' ': () => playback?.togglePause(),
            ArrowLeft: () => playback?.step(-1),
            a: () => playback?.step(-1),
            ArrowRight: () => playback?.step(1),
            d: () => playback?.step(1),
            '+': () => playback?.faster(),
            '=': () => playback?.faster(),
            '-': () => playback?.slower(),
            _: () => playback?.slower(),
            c: () => this.#cycleCamera(),
            s: () => playback?.toggleSound(),
            f: () => toggle('fps', 'show_fps', 'FPS'),
            b: () => toggle('bars', 'show_bars', 'Barras de hp e ap'),
            m: () => toggle('frames', 'show_frames', 'Painéis dos gladiadores'),
            t: () => toggle('text', 'show_text', 'Números de dano'),
            h: () => { this.#help = !this.#help; },
            '?': () => { this.#help = !this.#help; },
            Escape: () => {
                if (this.#help) this.#help = false;
                else this.#host.stopInspect();
            },
        };
        let action = actions[key];
        if (!action && /^[1-9]$/.test(key) && Number(key) <= this.#host.fighters().length) action = () => this.#host.select(Number(key) - 1);
        if (!action) return;
        event.preventDefault();
        action();
        this.#keys.bar = null;
    };
}
