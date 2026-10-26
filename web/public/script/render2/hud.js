const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 96;
const PANEL_GAP = 4;
const PANEL_MARGIN = 8;
/** Phone plaque (portrait, name, HP and AP, active buffs), laid out in two columns on a narrow screen. */
const MINI_WIDTH = 184;
const MINI_HEIGHT = 60;
/** Below this width or height the HUD switches to its compact (phone) layout. */
export const COMPACT_WIDTH = 600;
export const COMPACT_HEIGHT = 500;
/** Share of a short landscape screen's height a one-column compact roster may take (the control bar sits under it). */
const SHORT_ROSTER_SHARE = 0.68;
const CARD_WIDTH = 128;
const CARD_HEIGHT = 44;
const BUBBLE_MAX_WIDTH = 180;
const BUBBLE_LINE_HEIGHT = 14;
const BUBBLE_PADDING = 10;
const FLOAT_SECONDS = 0.9;
const FLOAT_RISE = 38;
const FLOAT_POOL = 14;
const LABEL_CACHE_LIMIT = 48;
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
/** Display face for names, levels and combat text (loaded by playback.php), and the face for numbers. */
export const TITLE_FONT = `Cinzel, Georgia, ${FONT}`;
export const NUMBER_FONT = `Acme, ${FONT}`;
/** Font Awesome (solid) is on the page for the classic UI; the canvas controls draw its glyphs as icons. */
export const ICON_FONT = '"Font Awesome 6 Free"';
export const INK = 'rgba(12, 8, 5, 0.92)';
export const PARCHMENT = '#f1dfb8';
const FLOAT_COLORS = Object.freeze({
    damage: ['#ffb199', '#e8382b'], heal: ['#c8ffc0', '#3fcf5a'], potion: ['#c8ffc0', '#3fcf5a'], level: ['#fff3b0', '#f0a91c'], mana: ['#cfe6ff', '#4b8dff'],
    stun: ['#fffbe0', '#d9a520'],
});

const SPRITES = '/assets/synty/fantasy-warrior-hud/Sprites/';
const kit = (name) => `${SPRITES}FantasyWarrior/SPR_FantasyWarrior_${name}.png`;
const hud = (name) => `${SPRITES}HUD/SPR_HUD_FantasyWarrior_${name}.png`;
const fx = (name) => `${SPRITES}FX/SPR_FX_FantasyWarrior_${name}.png`;
const status = (name, layer = 'Clean') => `${SPRITES}Icons_Status/ICON_FantasyWarrior_Status_${name}_${layer}.png`;
const stat = (name, layer = 'Clean') => `${SPRITES}Icons_Stats/ICON_FantasyWarrior_Stat_${name}_${layer}.png`;

/**
 * Synty Fantasy Warrior HUD pieces. Frames, rings and gems ship coloured; the rest is white art
 * meant to be tinted (`flat` paints the silhouette, `shade` multiplies so bevels keep their light).
 * `slice` is the source inset of a 9-slice frame or the end-cap width of a 3-slice bar.
 */
export const ART = Object.freeze({
    frame: { url: kit('Frame_Box_Medium01_Variant01'), slice: 118 },
    back: { url: kit('Box_Background_Shadowed') },
    glow: { url: fx('Glow_Box01_Smooth') },
    ring: { url: kit('Ring_Small01_Variant01') },
    gem: { url: kit('Gem01_Container01') },
    gemBack: { url: kit('Gem01_Background01') },
    barFrame: { url: kit('Bar_Horizontal12_Variant01'), slice: 120 },
    barFill: { url: kit('Bar_Horizontal05'), slice: 40 },
    barGold: { url: kit('Bar_Horizontal04'), slice: 40 },
    skull: { url: hud('Symbol_Skull01') },
    marker: { url: hud('Triangle_Small01_Clean') },
    markerUnder: { url: hud('Triangle_Small01_Underlay') },
    parchment: { url: hud('Box_Small_Parchment02'), slice: 30 },
    divider: { url: kit('Tracery_Horizontal01') },
    buffRing: { url: kit('Ring_Small03_Variant01') },
    str: { url: stat('Strength01'), under: stat('Strength01', 'Underlay'), color: '#ff8a70' },
    agi: { url: stat('Speed01'), under: stat('Speed01', 'Underlay'), color: '#9be870' },
    int: { url: stat('Mind01'), under: stat('Mind01', 'Underlay'), color: '#86c2ff' },
    poison: { url: status('Poisoned01'), under: status('Poisoned01', 'Underlay'), color: '#8fe85f' },
    burn: { url: status('Burninating01'), under: status('Burninating01', 'Underlay'), color: '#ffa040' },
    movement: { url: status('SpeedUp01'), under: status('SpeedUp01', 'Underlay'), color: '#86e0ff' },
    resist: { url: status('Defense01'), under: status('Defense01', 'Underlay'), color: '#ecd27e' },
    invisible: { url: status('Charmed01'), under: status('Charmed01', 'Underlay'), color: '#cda6ff' },
    stun: { url: status('Shocked01'), under: status('Shocked01', 'Underlay'), color: '#ffe76d' },
});
/** Buffs a roster panel can show, in the same order as the original UI. */
const BUFF_ICONS = Object.freeze([['poison', 'Envenenado'], ['burn', 'Queimando'], ['movement', 'Velocidade'], ['resist', 'Proteção'], ['invisible', 'Invisível'], ['stun', 'Atordoado']]);

const hex = (color) => `#${Number(color).toString(16).padStart(6, '0')}`;
const rgba = (color, alpha) => `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alpha})`;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

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
}

export function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

/** Draws a frame stretched to any size while its corners keep their shape (`inset` source px become `border` px). */
export function nineSlice(ctx, image, x, y, width, height, inset, border) {
    const sx = [0, inset, image.width - inset, image.width];
    const sy = [0, inset, image.height - inset, image.height];
    const dx = [x, x + border, x + width - border, x + width];
    const dy = [y, y + border, y + height - border, y + height];
    for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
            const w = dx[column + 1] - dx[column];
            const h = dy[row + 1] - dy[row];
            if (w > 0 && h > 0) ctx.drawImage(image, sx[column], sy[row], sx[column + 1] - sx[column], sy[row + 1] - sy[row], dx[column], dy[row], w, h);
        }
    }
}

/** Draws a horizontal bar piece at any length: the pointed end caps keep their aspect, the middle stretches. */
export function threeSlice(ctx, image, x, y, width, height, cap) {
    const scale = height / image.height;
    const end = Math.min(cap * scale, width / 2);
    ctx.drawImage(image, 0, 0, cap, image.height, x, y, end, height);
    ctx.drawImage(image, cap, 0, image.width - cap * 2, image.height, x + end, y, width - end * 2, height);
    ctx.drawImage(image, image.width - cap, 0, cap, image.height, x + width - end, y, end, height);
}

/** Text with a dark outline so it reads over any part of the arena. */
export function outlined(ctx, text, x, y, { font, color, outline = INK, width = 3, align = 'left', maxWidth } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y, maxWidth);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y, maxWidth);
}

/** Greedy word wrap that also splits words longer than the line. */
export function wrapText(ctx, text, maxWidth, maxLines) {
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
 * Battle HUD drawn inside the WebGL canvas: roster panels, name/vitals cards, speech and
 * breakpoint bubbles, and floating combat text. Everything is a screen-space sprite in a second,
 * pixel-aligned scene rendered after the arena, so there is no DOM layout or restyling.
 * The pieces are the Synty Fantasy Warrior HUD sprites composed on canvas (plain shapes stand in
 * while they load or when the pack is missing); textures are redrawn only when what they show changes.
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
    #art = {};
    #tints = new Map();
    /** Bumped whenever a sprite or the display font finishes loading, so cached textures redraw. */
    #artVersion = 0;
    /** Whether the player is on a touch screen (a coarse pointer, then whichever kind pressed last). */
    #touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    /** The screen's safe-area insets (notch, rounded corners, home indicator) in CSS pixels, read from a probe. */
    #insets = { top: 0, right: 0, bottom: 0, left: 0 };
    #insetProbe = null;
    #rosterBounds = { x: 0, y: 0, width: 0, height: 0 };

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
        this.#loadArt();
        this.resize();
    }

    #createSprite() {
        const material = new this.#THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
        const sprite = new this.#THREE.Sprite(material);
        sprite.center.set(0.5, 0);
        this.#scene.add(sprite);
        return sprite;
    }

    /** Starts loading every HUD sprite and the display fonts; each arrival invalidates the drawn textures. */
    #loadArt() {
        const arrived = () => {
            this.#artVersion += 1;
            this.#labelCache.forEach((entry) => entry.texture.dispose());
            this.#labelCache.clear();
            this.#cards.forEach((card) => { card.keys = {}; });
        };
        for (const [name, { url, under }] of Object.entries(ART)) {
            for (const [key, src] of [[name, url], [`${name}:under`, under]]) {
                if (!src) continue;
                const image = new Image();
                image.addEventListener('load', () => {
                    this.#art[key] = image;
                    arrived();
                });
                image.src = src;
            }
        }
        document.fonts?.load(`700 14px ${TITLE_FONT}`).then(arrived, () => {});
        document.fonts?.load(`16px ${NUMBER_FONT}`).then(arrived, () => {});
        document.fonts?.load(`900 16px ${ICON_FONT}`).then(arrived, () => {});
    }

    // ------------------------------------------------------------------ shared with the canvas controls

    /** @returns {import('three').Scene} The screen-space scene (one unit = one CSS pixel, origin bottom-left). */
    get scene() {
        return this.#scene;
    }

    /** @returns {number} Bumped whenever a sprite or font arrives: textures keyed on it redraw. */
    get artVersion() {
        return this.#artVersion;
    }

    /** @returns {number} Canvas pixels per CSS pixel of the HUD textures. */
    get ratio() {
        return this.#ratio;
    }

    /** @returns {{ width: number, height: number }} Canvas size in CSS pixels. */
    get size() {
        return this.#size;
    }

    /** @returns {boolean} Whether the HUD uses its compact (phone) layout. */
    get compact() {
        return this.#size.width < COMPACT_WIDTH || this.#size.height < COMPACT_HEIGHT;
    }

    /** @returns {boolean} Whether the player is on a touch screen: larger targets, no hover tips, auto-hiding controls. */
    get touch() {
        return this.#touch;
    }

    /** @param {boolean} touch Whether the last press was a finger. */
    set touch(touch) {
        this.#touch = Boolean(touch);
    }

    /** @returns {{ top: number, right: number, bottom: number, left: number }} Safe-area insets in CSS pixels. */
    get insets() {
        return this.#insets;
    }

    /** @returns {{ x: number, y: number, width: number, height: number }} Where the roster is drawn (CSS pixels from the top-left; empty when hidden). */
    get rosterBounds() {
        return this.#rosterBounds;
    }

    /** @see #sprite */
    art(name, color, mode) {
        return this.#sprite(name, color, mode);
    }

    /** A screen-space sprite in the HUD scene, anchored at its top-left corner. */
    addSprite() {
        const sprite = this.#createSprite();
        sprite.center.set(0, 1);
        return sprite;
    }

    /** Gives a sprite a canvas texture of this size (CSS pixels), reusing it when the size is unchanged. */
    sizeSprite(sprite, width, height) {
        return this.#resizeTexture(sprite, width, height);
    }

    /** @see #drawBar */
    drawBar(ctx, x, y, width, height, ratio, color, options) {
        this.#drawBar(ctx, x, y, width, height, ratio, color, options);
    }

    /** @see #drawIcon */
    drawIcon(ctx, name, x, y, size) {
        this.#drawIcon(ctx, name, x, y, size);
    }

    /**
     * A loaded sprite, optionally tinted (cached per colour).
     *
     * @param {string} name Key in ART (`name:under` for an icon's underlay).
     * @param {string} [color] CSS colour to tint white art with.
     * @param {'flat'|'shade'} [mode] Flat silhouette, or multiplied so shading survives.
     * @returns {HTMLImageElement|HTMLCanvasElement|null} Drawable, or null while loading.
     */
    #sprite(name, color, mode = 'flat') {
        const image = this.#art[name];
        if (!image || !color) return image ?? null;
        const key = `${name}|${color}|${mode}`;
        let tinted = this.#tints.get(key);
        if (!tinted) {
            tinted = document.createElement('canvas');
            tinted.width = image.naturalWidth;
            tinted.height = image.naturalHeight;
            const ctx = tinted.getContext('2d');
            ctx.drawImage(image, 0, 0);
            ctx.globalCompositeOperation = mode === 'flat' ? 'source-in' : 'multiply';
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, tinted.width, tinted.height);
            if (mode !== 'flat') {
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(image, 0, 0);
            }
            this.#tints.set(key, tinted);
        }
        return tinted;
    }

    /** Draws an icon on its dark underlay so it reads on any background. */
    #drawIcon(ctx, name, x, y, size) {
        const under = this.#sprite(`${name}:under`, INK);
        if (under) ctx.drawImage(under, x - size * 0.08, y - size * 0.08, size * 1.16, size * 1.16);
        const icon = this.#sprite(name, ART[name].color);
        if (icon) ctx.drawImage(icon, x, y, size, size);
    }

    /**
     * Crystal bar: dark trough, tinted fill cut at `ratio`, gold bevel frame, optional centred text.
     * `framed` false draws a slim frameless gauge.
     */
    #drawBar(ctx, x, y, width, height, ratio, color, { framed = true, text = '', fill = 'barFill' } = {}) {
        const frame = this.#art.barFrame;
        const crystal = this.#sprite(fill, fill === 'barFill' ? color : null, 'shade');
        const trough = this.#sprite('barFill', '#1a1310', 'shade');
        // The frame's opening sits inside its bevel; the crystal fills the opening and hides under the bevel.
        const scale = height / 256;
        const inner = framed ? { x: x + 26 * scale, y: y + 36 * scale, w: width - 52 * scale, h: height - 80 * scale } : { x, y, w: width, h: height };
        if (crystal && trough && (!framed || frame)) {
            const cap = ART.barFill.slice;
            ctx.globalAlpha *= 0.9;
            threeSlice(ctx, trough, inner.x, inner.y, inner.w, inner.h, cap);
            ctx.globalAlpha /= 0.9;
            if (ratio > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(inner.x, inner.y - 2, inner.w * ratio, inner.h + 4);
                ctx.clip();
                threeSlice(ctx, crystal, inner.x, inner.y, inner.w, inner.h, cap);
                ctx.restore();
            }
            if (framed) threeSlice(ctx, frame, x, y, width, height, ART.barFrame.slice);
        }
        else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            roundRect(ctx, inner.x, inner.y, inner.w, inner.h, inner.h / 3);
            ctx.fill();
            if (ratio > 0) {
                ctx.fillStyle = color;
                roundRect(ctx, inner.x, inner.y, Math.max(inner.h, inner.w * ratio), inner.h, inner.h / 3);
                ctx.fill();
            }
            if (framed) {
                ctx.strokeStyle = '#c8913a';
                ctx.lineWidth = 1.2;
                roundRect(ctx, inner.x, inner.y, inner.w, inner.h, inner.h / 3);
                ctx.stroke();
            }
        }
        if (text) outlined(ctx, text, x + width / 2, inner.y + inner.h / 2 + 0.5, { font: `${Math.round(inner.h * 0.82)}px ${NUMBER_FONT}`, color: '#fffaf0', align: 'center', width: 2.5 });
    }

    /** Re-reads the canvas size; the HUD camera maps one unit to one CSS pixel. */
    resize() {
        const width = Math.max(1, this.#canvas.clientWidth);
        const height = Math.max(1, this.#canvas.clientHeight);
        this.#size = { width, height };
        this.#ratio = Math.min(window.devicePixelRatio || 1, 2);
        Object.assign(this.hudCamera, { right: width, top: height });
        this.hudCamera.updateProjectionMatrix();
        this.#readInsets();
    }

    /** Reads `env(safe-area-inset-*)` through an invisible element padded by them (the page sets `viewport-fit=cover`). */
    #readInsets() {
        const parent = this.#canvas.parentElement;
        if (!parent) return;
        if (!this.#insetProbe) {
            this.#insetProbe = document.createElement('div');
            this.#insetProbe.setAttribute('aria-hidden', 'true');
            this.#insetProbe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;'
                + 'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
            parent.appendChild(this.#insetProbe);
        }
        const style = getComputedStyle(this.#insetProbe);
        const read = (side) => Math.max(0, parseFloat(style[`padding${side}`]) || 0);
        this.#insets = { top: read('Top'), right: read('Right'), bottom: read('Bottom'), left: read('Left') };
    }

    /** Routes clicks and taps on a roster panel to `onSelect` and keeps them away from the camera drag. */
    #handlePointer = (event) => {
        if (event.button !== 0 || !this.#panels[0]?.visible) return;
        const rect = this.#canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const { slots, width, height } = this.#rosterLayout(this.#panels.length);
        const index = slots.findIndex((slot) => x >= slot.x && x <= slot.x + width && y >= slot.y && y <= slot.y + height);
        if (index < 0) return;
        event.stopPropagation();
        event.preventDefault();
        this.#onSelect(index);
    };

    /**
     * Where the roster plaques go: one column of full plaques, or compact plaques (two columns on a narrow
     * screen, one on a short one), scaled down to fit and kept inside the safe area.
     *
     * @param {number} count Plaques.
     * @returns {{ compact: boolean, scale: number, width: number, height: number, slots: { x: number, y: number }[] }}
     *   Plaque size on screen and each one's top-left corner, in CSS pixels from the top-left.
     */
    #rosterLayout(count) {
        const { width: screenWidth, height: screenHeight } = this.#size;
        const insets = this.#insets;
        const left = PANEL_MARGIN + insets.left;
        const top = PANEL_MARGIN + insets.top;
        const room = { width: screenWidth - left - PANEL_MARGIN - insets.right, height: screenHeight - top - PANEL_MARGIN - insets.bottom };
        const compact = this.compact;
        const base = compact ? { width: MINI_WIDTH, height: MINI_HEIGHT } : { width: PANEL_WIDTH, height: PANEL_HEIGHT };
        const columns = compact && screenWidth < COMPACT_WIDTH && count > 1 ? 2 : 1;
        const rows = Math.max(1, Math.ceil(count / columns));
        const tall = compact && columns === 1 ? room.height * SHORT_ROSTER_SHARE : room.height;
        const scale = Math.min(1,
            (room.width - (columns - 1) * PANEL_GAP) / (columns * base.width),
            (tall - (rows - 1) * PANEL_GAP) / Math.max(1, rows * base.height));
        const width = base.width * scale;
        const height = base.height * scale;
        const slots = Array.from({ length: count }, (_, index) => ({
            x: left + (index % columns) * (width + PANEL_GAP),
            y: top + Math.floor(index / columns) * (height + PANEL_GAP),
        }));
        return { compact, scale, width, height, slots };
    }

    /**
     * One roster entry: gold-framed plaque with the team pennant behind an octagonal portrait ring,
     * a gem level badge, crystal HP/AP gauges, a gold XP thread, attributes and the active buffs.
     */
    #drawPanel(panel, glad, view, followed, poisoned) {
        if (panel.userData.compact) {
            this.#drawCompactPanel(panel, glad, view, followed, poisoned);
            return;
        }
        const canvas = panel.material.map.image;
        const ctx = canvas.getContext('2d');
        const alive = Number(glad.hp) > 0;
        const look = view.appearance;
        const W = PANEL_WIDTH;
        const H = PANEL_HEIGHT;
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.filter = alive ? 'none' : 'grayscale(0.9) brightness(0.8)';
        ctx.globalAlpha = alive ? 1 : 0.78;

        // Plaque: shadowed backing, a wash of the team colour from the left, glow when followed, gold frame.
        const back = this.#sprite('back');
        if (back) ctx.drawImage(back, 6, 6, W - 12, H - 12);
        else {
            ctx.fillStyle = 'rgba(16, 12, 10, 0.9)';
            ctx.fillRect(6, 6, W - 12, H - 12);
        }
        const wash = ctx.createLinearGradient(6, 0, W * 0.6, 0);
        wash.addColorStop(0, rgba(look.team, 0.42));
        wash.addColorStop(1, rgba(look.team, 0));
        ctx.fillStyle = wash;
        ctx.fillRect(6, 6, W - 12, H - 12);
        if (followed) {
            const glow = this.#sprite('glow', '#ffcf5a');
            ctx.globalAlpha *= 0.55;
            if (glow) ctx.drawImage(glow, 0, 0, W, H);
            ctx.globalAlpha /= 0.55;
        }
        const frame = this.#sprite('frame');
        if (frame) nineSlice(ctx, frame, 0, 0, W, H, ART.frame.slice, 17);
        else {
            ctx.strokeStyle = '#c8913a';
            ctx.lineWidth = 2;
            roundRect(ctx, 3, 3, W - 6, H - 6, 6);
            ctx.stroke();
        }
        if (followed) {
            ctx.strokeStyle = 'rgba(255, 228, 140, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(9.5, 9.5, W - 19, H - 19);
        }

        // Portrait: 3D head shot (or drawn face) on the team colour, inside the gold octagon ring.
        const cx = 52;
        const cy = H / 2;
        const radius = 30;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        const halo = ctx.createRadialGradient(cx, cy - 10, 3, cx, cy, radius + 2);
        halo.addColorStop(0, rgba(look.team, 1));
        halo.addColorStop(0.35, rgba(look.team, 0.75));
        halo.addColorStop(1, '#120d09');
        ctx.fillStyle = halo;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        if (view.portrait) ctx.drawImage(view.portrait, cx - 36, cy - 38, 72, 72);
        else drawPortrait(ctx, cx, cy, radius, look, alive);
        ctx.restore();
        const ring = this.#sprite('ring');
        if (ring) ctx.drawImage(ring, cx - 42, cy - 42, 84, 84);
        else {
            ctx.strokeStyle = '#c8913a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (!alive) {
            const skull = this.#sprite('skull', '#e8e2d4');
            if (skull) ctx.drawImage(skull, cx - 34, cy - 17, 68, 34);
        }
        const gemX = cx + 27;
        const gemY = cy + 27;
        const gemBack = this.#sprite('gemBack');
        const gem = this.#sprite('gem');
        if (gemBack) ctx.drawImage(gemBack, gemX - 14, gemY - 14, 28, 28);
        if (gem) ctx.drawImage(gem, gemX - 14, gemY - 14, 28, 28);
        else {
            ctx.fillStyle = '#4a2d14';
            ctx.beginPath();
            ctx.arc(gemX, gemY, 11, 0, Math.PI * 2);
            ctx.fill();
        }
        outlined(ctx, String(Math.round(Number(glad.lvl) || 1)), gemX, gemY + 1, { font: `700 13px ${TITLE_FONT}`, color: '#fff0c2', align: 'center' });

        // Name and gauges.
        const left = 100;
        const right = W - 14;
        const width = right - left;
        const name = String(glad.name ?? '');
        outlined(ctx, name, left + 2, 19, { font: `700 14px ${TITLE_FONT}`, color: '#f7e7c2', maxWidth: width - 4 });
        this.#drawBar(ctx, left - 4, 25, width + 8, 24, clamp01(Number(glad.hp) / Math.max(1, Number(glad.maxhp))), '#ff4b3e',
            { text: `${Math.round(Number(glad.hp))} / ${Math.round(Number(glad.maxhp))}` });
        this.#drawBar(ctx, left - 4, 46, width + 8, 19, clamp01(Number(glad.ap) / Math.max(1, Number(glad.maxap))), '#4f8dff',
            { text: `${Math.round(Number(glad.ap))} / ${Math.round(Number(glad.maxap))}` });
        const xp = clamp01(Number(glad.xp) / Math.max(1, Number(glad.tonext)));
        this.#drawBar(ctx, left + 2, 64, width - 4, 4, xp, '#f2c94c', { framed: false, fill: 'barGold' });

        // Attributes, then the buffs that are active.
        [['str', glad.STR], ['agi', glad.AGI], ['int', glad.INT]].forEach(([key, value], index) => {
            const x = left + index * 36;
            this.#drawIcon(ctx, key, x, 71, 15);
            outlined(ctx, String(value ?? '-'), x + 18, 79, { font: `13px ${NUMBER_FONT}`, color: '#efe4cc' });
        });
        const buffs = glad.buffs ?? {};
        let slot = 0;
        for (const [key] of BUFF_ICONS) {
            const timeleft = key === 'poison' ? (poisoned ? Infinity : 0) : Number(buffs[key]?.timeleft) || 0;
            if (timeleft <= 0) continue;
            const x = right - 18 - slot * 23;
            const ringArt = this.#sprite('buffRing');
            ctx.fillStyle = INK;
            ctx.beginPath();
            ctx.arc(x + 9, 79, 9.5, 0, Math.PI * 2);
            ctx.fill();
            this.#drawIcon(ctx, key, x + 2.5, 72.5, 13);
            if (ringArt) ctx.drawImage(ringArt, x - 2, 68, 22, 22);
            if (Number.isFinite(timeleft)) outlined(ctx, timeleft.toFixed(0), x + 17, 87, { font: `10px ${NUMBER_FONT}`, color: '#fff', align: 'center', width: 2.5 });
            slot += 1;
        }
        if (!slot) {
            outlined(ctx, `XP ${Math.round(Number(glad.xp) || 0)}/${Math.round(Number(glad.tonext) || 0)}`, right - 2, 79,
                { font: `12px ${NUMBER_FONT}`, color: '#f2cf6a', align: 'right' });
        }
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        panel.material.map.needsUpdate = true;
    }

    /** Phone plaque: the same frame, portrait ring and level gem, with only the name, HP, AP and the active buffs. */
    #drawCompactPanel(panel, glad, view, followed, poisoned) {
        const canvas = panel.material.map.image;
        const ctx = canvas.getContext('2d');
        const alive = Number(glad.hp) > 0;
        const look = view.appearance;
        const W = MINI_WIDTH;
        const H = MINI_HEIGHT;
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.filter = alive ? 'none' : 'grayscale(0.9) brightness(0.8)';
        ctx.globalAlpha = alive ? 1 : 0.78;

        const back = this.#sprite('back');
        if (back) ctx.drawImage(back, 4, 4, W - 8, H - 8);
        else {
            ctx.fillStyle = 'rgba(16, 12, 10, 0.9)';
            ctx.fillRect(4, 4, W - 8, H - 8);
        }
        const wash = ctx.createLinearGradient(4, 0, W * 0.6, 0);
        wash.addColorStop(0, rgba(look.team, 0.42));
        wash.addColorStop(1, rgba(look.team, 0));
        ctx.fillStyle = wash;
        ctx.fillRect(4, 4, W - 8, H - 8);
        if (followed) {
            const glow = this.#sprite('glow', '#ffcf5a');
            ctx.globalAlpha *= 0.55;
            if (glow) ctx.drawImage(glow, 0, 0, W, H);
            ctx.globalAlpha /= 0.55;
        }
        const frame = this.#sprite('frame');
        if (frame) nineSlice(ctx, frame, 0, 0, W, H, ART.frame.slice, 12);
        else {
            ctx.strokeStyle = '#c8913a';
            ctx.lineWidth = 2;
            roundRect(ctx, 2, 2, W - 4, H - 4, 5);
            ctx.stroke();
        }
        if (followed) {
            ctx.strokeStyle = 'rgba(255, 228, 140, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(7.5, 7.5, W - 15, H - 15);
        }

        const cx = 30;
        const cy = H / 2;
        const radius = 19;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        const halo = ctx.createRadialGradient(cx, cy - 6, 2, cx, cy, radius + 2);
        halo.addColorStop(0, rgba(look.team, 1));
        halo.addColorStop(0.35, rgba(look.team, 0.75));
        halo.addColorStop(1, '#120d09');
        ctx.fillStyle = halo;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        if (view.portrait) ctx.drawImage(view.portrait, cx - 23, cy - 24, 46, 46);
        else {
            ctx.translate(cx, cy);
            ctx.scale(radius / 30, radius / 30);
            drawPortrait(ctx, 0, 0, 30, look, alive);
        }
        ctx.restore();
        const ring = this.#sprite('ring');
        if (ring) ctx.drawImage(ring, cx - 27, cy - 27, 54, 54);
        else {
            ctx.strokeStyle = '#c8913a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (!alive) {
            const skull = this.#sprite('skull', '#e8e2d4');
            if (skull) ctx.drawImage(skull, cx - 22, cy - 11, 44, 22);
        }
        const gemX = cx + 17;
        const gemY = cy + 17;
        const gemBack = this.#sprite('gemBack');
        const gem = this.#sprite('gem');
        if (gemBack) ctx.drawImage(gemBack, gemX - 10, gemY - 10, 20, 20);
        if (gem) ctx.drawImage(gem, gemX - 10, gemY - 10, 20, 20);
        else {
            ctx.fillStyle = '#4a2d14';
            ctx.beginPath();
            ctx.arc(gemX, gemY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        outlined(ctx, String(Math.round(Number(glad.lvl) || 1)), gemX, gemY + 0.5, { font: `700 10px ${TITLE_FONT}`, color: '#fff0c2', align: 'center', width: 2.5 });

        // Active buffs as small icons at the end of the name row; the name takes what is left.
        const left = 56;
        const right = W - 10;
        const buffs = glad.buffs ?? {};
        const active = BUFF_ICONS.filter(([key]) => (key === 'poison' ? poisoned : Number(buffs[key]?.timeleft) > 0)).slice(0, 4);
        active.forEach(([key], slot) => this.#drawIcon(ctx, key, right - 12 - slot * 14, 7, 12));
        outlined(ctx, String(glad.name ?? ''), left + 1, 14, { font: `700 12px ${TITLE_FONT}`, color: '#f7e7c2', maxWidth: right - left - 2 - active.length * 14 });
        this.#drawBar(ctx, left - 4, 20, right - left + 8, 21, clamp01(Number(glad.hp) / Math.max(1, Number(glad.maxhp))), '#ff4b3e',
            { text: `${Math.round(Number(glad.hp))} / ${Math.round(Number(glad.maxhp))}` });
        this.#drawBar(ctx, left - 4, 37, right - left + 8, 16, clamp01(Number(glad.ap) / Math.max(1, Number(glad.maxap))), '#4f8dff',
            { text: `${Math.round(Number(glad.ap))} / ${Math.round(Number(glad.maxap))}` });
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        panel.material.map.needsUpdate = true;
    }

    #updatePanels(views) {
        const layout = this.#rosterLayout(views.length);
        const last = layout.slots[layout.slots.length - 1];
        this.#rosterBounds = last ? {
            x: layout.slots[0].x,
            y: layout.slots[0].y,
            width: Math.max(...layout.slots.map((slot) => slot.x)) + layout.width - layout.slots[0].x,
            height: last.y + layout.height - layout.slots[0].y,
        } : { x: 0, y: 0, width: 0, height: 0 };
        views.forEach((view, index) => {
            let panel = this.#panels[index];
            if (!panel) {
                panel = this.#createSprite();
                panel.center.set(0, 1);
                panel.userData.key = '';
                this.#panels[index] = panel;
            }
            if (!panel.material.map || panel.userData.compact !== layout.compact) {
                // The plaque design changed with the screen: a texture of the other size.
                panel.material.map?.dispose();
                panel.material.map = layout.compact ? this.#createTexture(MINI_WIDTH, MINI_HEIGHT) : this.#createTexture(PANEL_WIDTH, PANEL_HEIGHT);
                panel.material.needsUpdate = true;
                panel.userData.compact = layout.compact;
                panel.userData.key = '';
            }
            const glad = view.state;
            const followed = this.#isFollowed(view);
            const poisoned = this.#isPoisoned(view);
            const buffs = glad.buffs ?? {};
            const key = [layout.compact, glad.name, glad.lvl, glad.xp, glad.tonext, Math.round(glad.hp), Number(glad.hp) > 0, Math.round(glad.ap), glad.maxhp, glad.maxap, glad.STR, glad.AGI, glad.INT,
                followed, poisoned, this.#artVersion,
                ...['burn', 'movement', 'resist', 'invisible', 'stun'].map((name) => Math.ceil(Number(buffs[name]?.timeleft) || 0))].join('|');
            if (panel.userData.key !== key) {
                panel.userData.key = key;
                this.#drawPanel(panel, glad, view, followed, poisoned);
            }
            const slot = layout.slots[index];
            panel.scale.set(layout.width, layout.height, 1);
            panel.position.set(slot.x, this.#size.height - slot.y, 0);
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

    /** Overhead card: outlined name, framed crystal HP gauge, slim AP gauge and a team-coloured pointer. */
    #drawVitals(card, name, hp, ap, team) {
        const canvas = card.vitals.material.map.image;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
        outlined(ctx, name, CARD_WIDTH / 2, 8, { font: `700 11px ${TITLE_FONT}`, color: '#f7e7c2', align: 'center', maxWidth: CARD_WIDTH - 6 });
        this.#drawBar(ctx, 4, 14, CARD_WIDTH - 8, 18, hp, '#ff4b3e');
        this.#drawBar(ctx, 24, 31, CARD_WIDTH - 48, 4, ap, '#4f8dff', { framed: false });
        const under = this.#sprite('markerUnder', INK);
        const marker = this.#sprite('marker', team);
        if (under) ctx.drawImage(under, CARD_WIDTH / 2 - 7, 35, 14, 9);
        if (marker) ctx.drawImage(marker, CARD_WIDTH / 2 - 5.5, 36, 11, 7);
        card.vitals.material.map.needsUpdate = true;
    }

    /** Speech or breakpoint bubble on a tinted Synty parchment, with a pointer towards the fighter. */
    #drawBubble(card, kind, text, style) {
        const sprite = card[kind];
        const probe = document.createElement('canvas').getContext('2d');
        probe.font = style.font;
        const lines = wrapText(probe, text, BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2, style.maxLines);
        const textWidth = Math.max(...lines.map((line) => probe.measureText(line).width));
        const width = Math.ceil(Math.max(36, textWidth + BUBBLE_PADDING * 2));
        const bodyHeight = lines.length * BUBBLE_LINE_HEIGHT + BUBBLE_PADDING * 2 - 4;
        const height = bodyHeight + 7;
        const canvas = this.#resizeTexture(sprite, width, height);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = style.background;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 6, bodyHeight - 3);
        ctx.lineTo(width / 2, height - 0.5);
        ctx.lineTo(width / 2 + 6, bodyHeight - 3);
        ctx.fill();
        const parchment = this.#sprite('parchment', style.background, 'shade');
        if (parchment) nineSlice(ctx, parchment, 0, 0, width, bodyHeight, ART.parchment.slice, 9);
        else {
            roundRect(ctx, 0.5, 0.5, width - 1, bodyHeight, 6);
            ctx.fill();
        }
        ctx.fillStyle = style.color;
        ctx.font = style.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        lines.forEach((line, index) => {
            ctx.fillText(line, BUBBLE_PADDING, BUBBLE_PADDING - 2 + BUBBLE_LINE_HEIGHT * (index + 0.5));
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
        card.base = { x, y: Math.round(projected.y) };
        const y = Math.round(card.base.y + (card.lift ?? 0));
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
                    font: `600 11px ${FONT}`, color: '#3a2614', background: PARCHMENT, maxLines: 4,
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
                    font: `500 10px ui-monospace, Menlo, Consolas, monospace`, color: '#f3ecff', background: '#5a3a9a', maxLines: 6,
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

    /**
     * Lifts overhead cards that would cover each other: from the lowest on screen up, a card that
     * overlaps one already placed moves above it, easing there so crossing fighters do not flicker.
     */
    #separateCards(realDt) {
        const step = CARD_HEIGHT - 8;
        const shown = [...this.#cards.values()].filter((card) => card.vitals.visible && card.base).sort((a, b) => a.base.y - b.base.y);
        const placed = [];
        for (const card of shown) {
            let y = card.base.y;
            for (const other of placed) {
                if (Math.abs(other.x - card.base.x) < CARD_WIDTH - 10 && Math.abs(y - other.y) < step) y = other.y + step;
            }
            placed.push({ x: card.base.x, y });
            const target = y - card.base.y;
            card.lift = (card.lift ?? 0) + (target - (card.lift ?? 0)) * Math.min(1, realDt * 12);
        }
        this.#cards.forEach((card) => { if (!card.vitals.visible) card.lift = 0; });
    }

    // ------------------------------------------------------------------ floating text

    #labelTexture(text, tone) {
        const key = `${tone}|${text}`;
        const cached = this.#labelCache.get(key);
        if (cached) return cached;
        const font = `900 ${tone === 'level' || tone === 'stun' ? 17 : 20}px ${TITLE_FONT}`;
        const probe = document.createElement('canvas').getContext('2d');
        probe.font = font;
        const width = Math.ceil(probe.measureText(text).width) + 12;
        const height = 30;
        const texture = this.#createTexture(width, height);
        const ctx = texture.image.getContext('2d');
        ctx.setTransform(this.#ratio, 0, 0, this.#ratio, 0, 0);
        const [light, dark] = FLOAT_COLORS[tone] ?? ['#ffffff', '#bbbbbb'];
        const fill = ctx.createLinearGradient(0, 6, 0, height - 6);
        fill.addColorStop(0, light);
        fill.addColorStop(1, dark);
        outlined(ctx, text, width / 2, height / 2 + 1, { font, color: fill, align: 'center', width: 5 });
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
     * @param {'damage'|'heal'|'level'|'mana'|'potion'|'stun'} tone Semantic tone.
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
     * @param {{ bars?: boolean, speech?: boolean, frames?: boolean }} preferences Display preferences.
     * @param {number} realDt Real seconds since the previous frame.
     * @param {number} [floatDt] Seconds to age the floating labels by (the fight's clock), `realDt` by default.
     */
    update(views, preferences, realDt, floatDt = realDt) {
        // The roster plaques follow the "frames" preference (M).
        const roster = preferences.frames !== false;
        if (roster) this.#updatePanels(views);
        else this.#rosterBounds = { x: 0, y: 0, width: 0, height: 0 };
        this.#panels.forEach((panel) => { panel.visible = roster; });
        views.forEach((view) => this.updateFighter(view, preferences));
        this.#separateCards(realDt);
        for (const sprite of this.#floats) {
            if (!sprite.visible) continue;
            const data = sprite.userData;
            data.age += floatDt;
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
        this.#insetProbe?.remove();
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
