const PANEL_WIDTH = 282;
const PANEL_HEIGHT = 98;
const PANEL_GAP = 6;
const PANEL_MARGIN = 8;
const CARD_WIDTH = 136;
const CARD_HEIGHT = 32;
const BUBBLE_MAX_WIDTH = 170;
const BUBBLE_LINE_HEIGHT = 14;
const BUBBLE_PADDING = 7;
const FLOAT_SECONDS = 0.9;
const FLOAT_RISE = 38;
const FLOAT_POOL = 14;
const LABEL_CACHE_LIMIT = 48;
const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const FLOAT_COLORS = Object.freeze({
    damage: '#ff6b5a', heal: '#6dff8a', potion: '#6dff8a', level: '#ffe66d', mana: '#6ab0ff',
});

/** Rounded-rectangle path helper (Path2D-free so it works on every canvas). */
const ICON_URLS = Object.freeze({
    str: 'res/str_icon.png', agi: 'sprite/images/sprint.png', int: 'res/int_icon.png',
    poison: 'res/buff-poison.png', burn: 'res/buff-burn.png', movement: 'res/buff-speed.png',
    resist: 'res/buff-protection.png', invisible: 'res/buff-invisible.png', stun: 'res/buff-stun.png',
});
/** Buffs shown on every roster panel, in the same order as the original UI. */
const BUFF_ICONS = Object.freeze([['poison', 'Envenenado'], ['burn', 'Queimando'], ['movement', 'Velocidade'], ['resist', 'Proteção'], ['invisible', 'Invisível'], ['stun', 'Atordoado']]);

const hex = (color) => `#${Number(color).toString(16).padStart(6, '0')}`;

/** Round face portrait drawn from the gladiator's skin traits (skin, hair, eyes, beard, headgear). */
function drawPortrait(ctx, cx, cy, radius, look, alive) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    const background = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    background.addColorStop(0, alive ? '#7fb48a' : '#8a8a8a');
    background.addColorStop(1, alive ? '#2f4f3a' : '#3a3a3a');
    ctx.fillStyle = background;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    const polygon = (points, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach(([x, y], index) => (index ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y)));
        ctx.closePath();
        ctx.fill();
    };
    const style = look.hairStyle ?? '';
    const hair = hex(look.hair);
    const longHair = /^(long|xlong|loose|princess|shoulder|bangslong)/.test(style);
    if (longHair) polygon([[-15, -8], [15, -8], [17, 24], [-17, 24]], hair);
    polygon([[-19, 26], [-12, 14], [12, 14], [19, 26]], hex(look.tunic));
    polygon([[-4, 8], [4, 8], [4, 16], [-4, 16]], hex(look.skin));
    polygon([[-11, -12], [11, -12], [13, 0], [8, 12], [0, 15], [-8, 12], [-13, 0]], hex(look.skin));
    if (look.elfEars) {
        polygon([[-11, -3], [-19, -9], [-12, 3]], hex(look.skin));
        polygon([[11, -3], [19, -9], [12, 3]], hex(look.skin));
    }
    ctx.fillStyle = hex(look.eyes);
    ctx.fillRect(cx - 7, cy - 3, 4, 3);
    ctx.fillRect(cx + 3, cy - 3, 4, 3);
    if (style) {
        if (/hawk/.test(style)) polygon([[-3, -24], [3, -24], [3, -8], [-3, -8]], hair);
        else if (style === 'jewfro') polygon([[-18, -6], [-14, -20], [0, -25], [14, -20], [18, -6], [11, -10], [-11, -10]], hair);
        else polygon([[-13, -4], [-12, -16], [0, -20], [12, -16], [13, -4], [9, -10], [-9, -10]], hair);
    }
    if (look.facial) {
        ctx.fillStyle = hex(look.facial.color ?? look.hair);
        if (/stache/.test(look.facial.kind)) ctx.fillRect(cx - 5, cy + 4, 10, 2.5);
        else ctx.fillRect(cx - 7, cy + 5, 14, 8);
    }
    if (look.headgear) {
        const gear = hex(look.helmet);
        if (look.headgear === 'wizard') {
            polygon([[-20, -12], [20, -12], [14, -16], [-14, -16]], gear);
            polygon([[-10, -14], [0, -34], [10, -14]], gear);
        }
        else if (look.headgear === 'bandana' || look.headgear === 'tiara') polygon([[-13, -10], [13, -10], [13, -6], [-13, -6]], gear);
        else {
            polygon([[-14, -2], [-13, -17], [0, -22], [13, -17], [14, -2], [10, -8], [-10, -8]], gear);
            if (look.headgear === 'helm') polygon([[-2, -8], [2, -8], [2, 6], [-2, 6]], gear);
        }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

/** Greedy word wrap that also splits words longer than the line. */
function wrapText(ctx, text, maxWidth, maxLines) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
        let candidate = line ? `${line} ${word}` : word;
        while (ctx.measureText(candidate).width > maxWidth && candidate.length > 1) {
            if (line) {
                lines.push(line);
                line = '';
                candidate = word;
                continue;
            }
            let cut = candidate.length - 1;
            while (cut > 1 && ctx.measureText(candidate.slice(0, cut)).width > maxWidth) cut -= 1;
            lines.push(candidate.slice(0, cut));
            candidate = candidate.slice(cut);
        }
        line = candidate;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        lines.length = maxLines;
        lines[maxLines - 1] = `${lines[maxLines - 1].replace(/.{0,2}$/, '')}…`;
    }
    return lines;
}

/**
 * Battle HUD drawn inside the WebGL canvas: name/vitals cards, speech and breakpoint
 * bubbles, and floating combat text. Everything is a screen-space sprite in a second,
 * pixel-aligned scene rendered after the arena, so there is no DOM layout or restyling.
 * Card textures are redrawn only when the text or a bar value actually changes.
 */
export class BattleHud {
    #THREE;
    #camera;
    #canvas;
    #scene;
    #cards = new Map();
    #floats = [];
    #labelCache = new Map();
    #size = { width: 1, height: 1 };
    #ratio = 1;
    #anchor;
    #panels = [];
    #onSelect;
    #isFollowed;
    #isPoisoned;
    #icons = {};
    #iconsLoaded = 0;

    /**
     * @param {{ THREE: typeof import('three'), canvas: HTMLCanvasElement, camera: import('three').Camera, onSelect?: (index: number) => void, isFollowed?: (view: import('./fighter.js').Fighter) => boolean, isPoisoned?: (view: import('./fighter.js').Fighter) => boolean }} options HUD dependencies.
     */
    constructor({ THREE, canvas, camera, onSelect = () => {}, isFollowed = () => false, isPoisoned = () => false }) {
        this.#onSelect = onSelect;
        this.#isPoisoned = isPoisoned;
        this.#isFollowed = isFollowed;
        canvas.parentElement?.addEventListener('pointerdown', this.#handlePointer, true);
        this.#THREE = THREE;
        this.#canvas = canvas;
        this.#camera = camera;
        this.#anchor = new THREE.Vector3();
        this.#scene = new THREE.Scene();
        this.hudCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
        for (let i = 0; i < FLOAT_POOL; i += 1) {
            const sprite = this.#createSprite();
            sprite.visible = false;
            sprite.userData.age = Infinity;
            this.#floats.push(sprite);
        }
        this.resize();
    }

    #createSprite() {
        const material = new this.#THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
        const sprite = new this.#THREE.Sprite(material);
        sprite.center.set(0.5, 0);
        this.#scene.add(sprite);
        return sprite;
    }

    /** Re-reads the canvas size; the HUD camera maps one unit to one CSS pixel. */
    resize() {
        const width = Math.max(1, this.#canvas.clientWidth);
        const height = Math.max(1, this.#canvas.clientHeight);
        this.#size = { width, height };
        this.#ratio = Math.min(window.devicePixelRatio || 1, 2);
        Object.assign(this.hudCamera, { right: width, top: height });
        this.hudCamera.updateProjectionMatrix();
    }

    /** Routes clicks on a roster panel to `onSelect` and keeps them away from the camera drag. */
    #handlePointer = (event) => {
        if (event.button !== 0) return;
        const rect = this.#canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const scale = this.#panelScale();
        if (x < PANEL_MARGIN || x > PANEL_MARGIN + PANEL_WIDTH * scale) return;
        const index = Math.floor((y - PANEL_MARGIN) / ((PANEL_HEIGHT + PANEL_GAP) * scale));
        const within = (y - PANEL_MARGIN) - index * (PANEL_HEIGHT + PANEL_GAP) * scale <= PANEL_HEIGHT * scale;
        if (index < 0 || index >= this.#panels.length || !within) return;
        event.stopPropagation();
        event.preventDefault();
        this.#onSelect(index);
    };

    /** Roster panel scale that keeps a long roster inside the window. */
    #panelScale() {
        const needed = this.#panels.length * (PANEL_HEIGHT + PANEL_GAP) + PANEL_MARGIN * 2;
        return Math.min(1, this.#size.height / Math.max(1, needed));
    }

    /** Lazily loads the original UI icons; loaded state is part of the panel redraw key. */
    #icon(name) {
        let icon = this.#icons[name];
        if (!icon) {
            icon = new Image();
            icon.addEventListener('load', () => { this.#iconsLoaded += 1; });
            icon.src = ICON_URLS[name];
            this.#icons[name] = icon;
        }
        return icon.complete && icon.naturalWidth ? icon : null;
    }

    #drawPanel(panel, glad, view, followed, poisoned) {
        const canvas = panel.material.map.image;
        const ctx = canvas.getContext('2d');
        const alive = Number(glad.hp) > 0;
        const look = view.appearance;
        const left = 78;
        const width = PANEL_WIDTH - left - 10;
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
        ctx.globalAlpha = alive ? 1 : 0.5;
        ctx.fillStyle = 'rgba(14, 18, 26, 0.88)';
        roundRect(ctx, 0.5, 0.5, PANEL_WIDTH - 1, PANEL_HEIGHT - 1, 9);
        ctx.fill();
        ctx.strokeStyle = followed ? '#ffd45e' : 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = followed ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = hex(look.team);
        roundRect(ctx, 5, 10, 4, PANEL_HEIGHT - 20, 2);
        ctx.fill();

        const cx = 41;
        const cy = 46;
        const xpRatio = Math.max(0, Math.min(1, Number(glad.xp) / Math.max(1, Number(glad.tonext))));
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#f2d13d';
        ctx.beginPath();
        ctx.arc(cx, cy, 32, Math.PI / 2, Math.PI / 2 - Math.PI * 2 * xpRatio, true);
        ctx.stroke();
        drawPortrait(ctx, cx, cy, 27, look, alive);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + 24, cy + 30, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#1b1f27';
        ctx.font = `800 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.round(Number(glad.lvl) || 1)), cx + 24, cy + 31, 20);

        ctx.fillStyle = '#f2f4f7';
        ctx.font = `700 13px ${FONT}`;
        ctx.textAlign = 'left';
        const name = String(glad.name ?? '');
        ctx.fillText(name.length > 26 ? `${name.slice(0, 25)}…` : name, left, 13, width);
        const bar = (y, value, max, color) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
            roundRect(ctx, left, y, width, 14, 4);
            ctx.fill();
            const ratio = Math.max(0, Math.min(1, Number(value) / Math.max(1, Number(max))));
            if (ratio > 0) {
                ctx.fillStyle = color;
                roundRect(ctx, left, y, Math.max(6, width * ratio), 14, 4);
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = `600 10px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(Number(value))} / ${Math.round(Number(max))}`, left + width / 2, y + 7.5);
        };
        bar(26, glad.hp, glad.maxhp, '#d8413b');
        bar(44, glad.ap, glad.maxap, '#3f7fe8');

        ctx.font = `700 11px ${FONT}`;
        ctx.textAlign = 'left';
        [['str', glad.STR], ['agi', glad.AGI], ['int', glad.INT]].forEach(([key, value], index) => {
            const x = left + index * 46;
            const icon = this.#icon(key);
            if (icon) ctx.drawImage(icon, x, 63, 14, 14);
            ctx.fillStyle = '#c9cfd8';
            ctx.fillText(String(value ?? '-'), x + 17, 71);
        });
        ctx.fillStyle = '#f2d13d';
        ctx.textAlign = 'right';
        ctx.fillText(`XP ${Math.round(Number(glad.xp) || 0)}/${Math.round(Number(glad.tonext) || 0)}`, PANEL_WIDTH - 10, 71);

        const buffs = glad.buffs ?? {};
        BUFF_ICONS.forEach(([key], index) => {
            const timeleft = key === 'poison' ? (poisoned ? 1 : 0) : Number(buffs[key]?.timeleft) || 0;
            const x = left + index * 31;
            ctx.globalAlpha = (alive ? 1 : 0.5) * (timeleft > 0 ? 1 : 0.18);
            const icon = this.#icon(key);
            if (icon) ctx.drawImage(icon, x, 82, 13, 13);
            if (timeleft > 0 && key !== 'poison') {
                ctx.fillStyle = '#fff';
                ctx.font = `600 9px ${FONT}`;
                ctx.textAlign = 'left';
                ctx.fillText(`${timeleft.toFixed(0)}s`, x + 14, 89);
            }
        });
        ctx.globalAlpha = 1;
        panel.material.map.needsUpdate = true;
    }

    #updatePanels(views) {
        const scale = this.#panelScale();
        views.forEach((view, index) => {
            let panel = this.#panels[index];
            if (!panel) {
                panel = this.#createSprite();
                panel.center.set(0, 1);
                panel.material.map = this.#createTexture(PANEL_WIDTH, PANEL_HEIGHT);
                panel.userData.key = '';
                this.#panels[index] = panel;
            }
            const glad = view.state;
            const followed = this.#isFollowed(view);
            const poisoned = this.#isPoisoned(view);
            const buffs = glad.buffs ?? {};
            const key = [glad.name, glad.lvl, glad.xp, glad.tonext, Math.round(glad.hp), Math.round(glad.ap), glad.maxhp, glad.maxap, glad.STR, glad.AGI, glad.INT,
                followed, poisoned, this.#iconsLoaded,
                ...['burn', 'movement', 'resist', 'invisible', 'stun'].map((name) => Math.ceil(Number(buffs[name]?.timeleft) || 0))].join('|');
            if (panel.userData.key !== key) {
                panel.userData.key = key;
                this.#drawPanel(panel, glad, view, followed, poisoned);
            }
            panel.scale.set(PANEL_WIDTH * scale, PANEL_HEIGHT * scale, 1);
            panel.position.set(PANEL_MARGIN, this.#size.height - PANEL_MARGIN - index * (PANEL_HEIGHT + PANEL_GAP) * scale, 0);
            panel.renderOrder = 3000;
        });
    }

    /** Draws the HUD over the already-rendered arena. */
    render(renderer) {
        const { autoClear } = renderer;
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(this.#scene, this.hudCamera);
        renderer.autoClear = autoClear;
    }

    // ------------------------------------------------------------------ cards

    #createCard(id) {
        const card = {
            vitals: this.#createSprite(),
            speech: this.#createSprite(),
            breakpoint: this.#createSprite(),
            keys: {},
        };
        card.vitals.material.map = this.#createTexture(CARD_WIDTH, CARD_HEIGHT);
        for (const key of ['speech', 'breakpoint']) card[key].visible = false;
        this.#cards.set(id, card);
        return card;
    }

    #createTexture(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(width * this.#ratio);
        canvas.height = Math.ceil(height * this.#ratio);
        const texture = new this.#THREE.CanvasTexture(canvas);
        texture.colorSpace = this.#THREE.SRGBColorSpace;
        texture.minFilter = this.#THREE.LinearFilter;
        texture.generateMipmaps = false;
        return texture;
    }

    /** Replaces a sprite's texture with a canvas sized to its content. */
    #resizeTexture(sprite, width, height) {
        const old = sprite.material.map;
        const canvas = old?.image;
        const pixelWidth = Math.ceil(width * this.#ratio);
        const pixelHeight = Math.ceil(height * this.#ratio);
        if (canvas && canvas.width === pixelWidth && canvas.height === pixelHeight) return canvas;
        old?.dispose();
        sprite.material.map = this.#createTexture(width, height);
        sprite.material.needsUpdate = true;
        sprite.scale.set(width, height, 1);
        return sprite.material.map.image;
    }

    #drawVitals(card, name, hp, ap, team) {
        const canvas = card.vitals.material.map.image;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
        ctx.fillStyle = 'rgba(12, 16, 22, 0.82)';
        roundRect(ctx, 0.5, 0.5, CARD_WIDTH - 1, CARD_HEIGHT - 1, 5);
        ctx.fill();
        ctx.strokeStyle = team;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f2f4f7';
        ctx.font = `700 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(name.length > 20 ? `${name.slice(0, 19)}…` : name, CARD_WIDTH / 2, 4, CARD_WIDTH - 10);
        const bar = (y, height, fraction, color) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.fillRect(6, y, CARD_WIDTH - 12, height);
            ctx.fillStyle = color;
            ctx.fillRect(6, y, (CARD_WIDTH - 12) * fraction, height);
        };
        bar(18, 6, hp, '#e0463f');
        bar(25, 3, ap, '#4a8dff');
        card.vitals.material.map.needsUpdate = true;
    }

    #drawBubble(card, kind, text, style) {
        const sprite = card[kind];
        const probe = document.createElement('canvas').getContext('2d');
        probe.font = style.font;
        const lines = wrapText(probe, text, BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2, style.maxLines);
        const textWidth = Math.max(...lines.map((line) => probe.measureText(line).width));
        const width = Math.ceil(textWidth + BUBBLE_PADDING * 2);
        const bodyHeight = lines.length * BUBBLE_LINE_HEIGHT + BUBBLE_PADDING * 2 - 2;
        const height = bodyHeight + 6;
        const canvas = this.#resizeTexture(sprite, width, height);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = style.background;
        roundRect(ctx, 0.5, 0.5, width - 1, bodyHeight, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 5, bodyHeight);
        ctx.lineTo(width / 2, height - 0.5);
        ctx.lineTo(width / 2 + 5, bodyHeight);
        ctx.fill();
        ctx.fillStyle = style.color;
        ctx.font = style.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        lines.forEach((line, index) => {
            ctx.fillText(line, BUBBLE_PADDING, BUBBLE_PADDING - 1 + BUBBLE_LINE_HEIGHT * (index + 0.5));
        });
        sprite.material.map.needsUpdate = true;
        sprite.userData.height = height;
    }

    /** Projects a fighter's head anchor to HUD pixels (origin bottom-left). */
    #project(view) {
        const point = this.#anchor.copy(view.getWorldAnchor()).project(this.#camera);
        const { width, height } = this.#size;
        return {
            x: Math.max(80, Math.min(width - 80, (point.x * 0.5 + 0.5) * width)),
            y: Math.max(8, Math.min(height - 96, (point.y * 0.5 + 0.5) * height)),
            visible: point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.2 && Math.abs(point.y) < 1.2,
        };
    }

    /**
     * Synchronizes one fighter's card, bubbles and position with the replay state.
     *
     * @param {import('./fighter.js').Fighter} view Fighter.
     * @param {{ bars?: boolean, speech?: boolean }} preferences Display preferences.
     */
    updateFighter(view, preferences) {
        const glad = view.state;
        const id = String(glad.id ?? view.index);
        const card = this.#cards.get(id) ?? this.#createCard(id);
        const { keys } = card;
        const alive = Number(glad.hp) > 0;
        const projected = this.#project(view);
        const showCard = projected.visible && alive && Boolean(preferences.bars);
        card.vitals.visible = showCard;
        card.speech.visible = false;
        card.breakpoint.visible = false;
        if (!projected.visible || !alive) return;

        const x = Math.round(projected.x);
        const y = Math.round(projected.y);
        const name = String(glad.name ?? `Gladiador ${id}`);
        const fraction = (value, max) => Math.round(Math.max(0, Math.min(1, Number(value) / Math.max(1, Number(max)))) * 200) / 200;
        const hp = fraction(glad.hp, glad.maxhp);
        const ap = fraction(glad.ap, glad.maxap);
        const drawKey = `${name}|${hp}|${ap}`;
        if (showCard) {
            if (keys.vitals !== drawKey) {
                keys.vitals = drawKey;
                this.#drawVitals(card, name, hp, ap, `#${view.appearance.team.toString(16).padStart(6, '0')}`);
            }
            card.vitals.scale.set(CARD_WIDTH, CARD_HEIGHT, 1);
            card.vitals.position.set(x, y, 0);
        }

        let top = showCard ? y + CARD_HEIGHT + 3 : y;
        const message = typeof glad.message === 'string' ? glad.message : '';
        if (message && preferences.speech) {
            if (keys.speech !== message) {
                keys.speech = message;
                this.#drawBubble(card, 'speech', message, {
                    font: `500 11px ${FONT}`, color: '#1b1f27', background: 'rgba(250, 250, 244, 0.95)', maxLines: 4,
                });
            }
            card.speech.position.set(x, top, 0);
            card.speech.visible = true;
            top += card.speech.userData.height + 2;
        }
        const breakpoint = typeof glad.breakpoint === 'string' ? glad.breakpoint : '';
        if (breakpoint) {
            if (keys.breakpoint !== breakpoint) {
                keys.breakpoint = breakpoint;
                this.#drawBubble(card, 'breakpoint', breakpoint, {
                    font: `500 10px ui-monospace, Menlo, Consolas, monospace`, color: '#f3ecff', background: 'rgba(76, 44, 130, 0.94)', maxLines: 6,
                });
            }
            card.breakpoint.position.set(x, top, 0);
            card.breakpoint.visible = true;
        }
        const order = 1000 - Math.round(y);
        card.vitals.renderOrder = order;
        card.speech.renderOrder = order;
        card.breakpoint.renderOrder = order;
    }

    // ------------------------------------------------------------------ floating text

    #labelTexture(text, tone) {
        const key = `${tone}|${text}`;
        const cached = this.#labelCache.get(key);
        if (cached) return cached;
        const probe = document.createElement('canvas').getContext('2d');
        probe.font = `800 17px ${FONT}`;
        const width = Math.ceil(probe.measureText(text).width) + 10;
        const height = 26;
        const texture = this.#createTexture(width, height);
        const ctx = texture.image.getContext('2d');
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.font = `800 17px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(10, 12, 16, 0.9)';
        ctx.strokeText(text, width / 2, height / 2 + 1);
        ctx.fillStyle = FLOAT_COLORS[tone] ?? '#ffffff';
        ctx.fillText(text, width / 2, height / 2 + 1);
        const entry = { texture, width, height };
        this.#labelCache.set(key, entry);
        if (this.#labelCache.size > LABEL_CACHE_LIMIT) {
            const [oldKey, oldEntry] = this.#labelCache.entries().next().value;
            this.#labelCache.delete(oldKey);
            // In-flight labels may still reference it; they finish within a second.
            window.setTimeout(() => oldEntry.texture.dispose(), FLOAT_SECONDS * 1000);
        }
        return entry;
    }

    /**
     * Adds a short-lived combat label above a fighter.
     *
     * @param {import('./fighter.js').Fighter} view Target fighter.
     * @param {string} text Label.
     * @param {'damage'|'heal'|'level'|'mana'|'potion'} tone Semantic tone.
     */
    showFloatingLabel(view, text, tone) {
        const projected = this.#project(view);
        if (!projected.visible) return;
        const sprite = this.#floats.reduce((oldest, candidate) => (candidate.userData.age > oldest.userData.age ? candidate : oldest));
        const { texture, width, height } = this.#labelTexture(text, tone);
        sprite.material.map = texture;
        sprite.material.needsUpdate = true;
        sprite.scale.set(width, height, 1);
        sprite.userData = { age: 0, x: projected.x + (Math.random() - 0.5) * 22, y: projected.y - 6 };
        sprite.visible = true;
        sprite.renderOrder = 2000;
    }

    /**
     * Repositions every card and advances floating labels.
     *
     * @param {import('./fighter.js').Fighter[]} views Fighters.
     * @param {{ bars?: boolean, speech?: boolean }} preferences Display preferences.
     * @param {number} realDt Real seconds since the previous frame.
     */
    update(views, preferences, realDt) {
        this.#updatePanels(views);
        views.forEach((view) => this.updateFighter(view, preferences));
        for (const sprite of this.#floats) {
            if (!sprite.visible) continue;
            const data = sprite.userData;
            data.age += realDt;
            if (data.age >= FLOAT_SECONDS) {
                sprite.visible = false;
                data.age = Infinity;
                continue;
            }
            const t = data.age / FLOAT_SECONDS;
            sprite.position.set(data.x, data.y + FLOAT_RISE * (1 - (1 - t) ** 2), 0);
            sprite.material.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        }
    }

    /** Releases sprites, textures and materials. */
    destroy() {
        this.#canvas.parentElement?.removeEventListener('pointerdown', this.#handlePointer, true);
        const sprites = [...this.#panels, ...this.#floats, ...[...this.#cards.values()].flatMap((card) => [card.vitals, card.speech, card.breakpoint])];
        for (const sprite of sprites) {
            sprite.material.map?.dispose();
            sprite.material.dispose();
        }
        this.#labelCache.forEach((entry) => entry.texture.dispose());
        this.#labelCache.clear();
        this.#cards.clear();
        this.#floats.length = 0;
        this.#scene.clear();
    }
}
