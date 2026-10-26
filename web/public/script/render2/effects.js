import { ACTION_BY_ID, ACTION_SPECS, smoothstep } from './motion.js';
import { ARENA_SIZE, headingToRadians } from './battle-state.js';
import { terrainHeight } from './arena.js';
import { BlastSystem } from './blast.js';
import { FireSystem } from './fire.js';
import { potionSound } from './audio-manager.js';

const PARTICLE_POOL = 220;
const PILLAR_POOL = 6;
const RING_POOL = 16;
const SLASH_POOL = 6;
const MELEE_REACH = 3;
/** Spec seconds after a swing's contact during which reported damage is still that swing landing. */
const HIT_WINDOW = 0.3;
/** Game seconds before a swing's contact at which reported damage is still taken as that swing (frame jitter). */
const CONTACT_TOLERANCE = 0.15;
/** Share of the victim's max HP from which a blow sounds heavy. */
const HEAVY_BLOW = 0.08;
const ARROW_HEIGHT = 0.65;
/** Game seconds over which a loosed arrow moves from the bow onto its engine path. */
const LAUNCH_SECONDS = 0.18;
/** An arrow vanishing this close to a gladiator hit them. */
const ARROW_HIT_REACH = 1.9;
/** Arrows are modelled 0.5 m long and drawn at this scale (matches the nocked arrow in `synty-model.js`). */
const ARROW_SCALE = 0.72;
/** Distance from the arrow's centre to its tip, in model units. */
const ARROW_TIP_OFFSET = 0.335;
/** The struck arrow flies on into the body over this long, then stays lodged for ARROW_STUCK_SECONDS. */
const ARROW_GLIDE_SECONDS = 0.08;
const ARROW_STUCK_SECONDS = 1.8;
/** Then it drops, lies on the sand this long and fades over ARROW_FADE_SECONDS. */
const ARROW_GROUND_SECONDS = 0.5;
const ARROW_FADE_SECONDS = 0.6;
const ARROW_GRAVITY = 9;
/** Length of the arrowhead (the `arrowHead` cone), in model units. */
const ARROW_HEAD_LENGTH = 0.09;
/**
 * How deep the tip sinks past the body surface: the whole head and a little shaft, so no metal shows.
 * `ARROW_BODY_RADIUS` stands in for the body when the arrow's line misses the mesh.
 */
const ARROW_SINK = ARROW_HEAD_LENGTH * ARROW_SCALE + 0.035;
const ARROW_BODY_RADIUS = 0.12;
/**
 * Close shots: at point-blank range the engine spawns and resolves an arrow within one step, so no frame ever holds
 * it. A hit on a gladiator that an archer within this reach is aiming at (facing it within this angle, with the
 * bow still drawn) is that arrow, and one is loosed from the bow into the body.
 */
const CLOSE_SHOT_REACH = 9;
const CLOSE_SHOT_FACING = 0.75;
/** A missed arrow stays planted in the sand this long (the last ARROW_FADE_SECONDS fading), at a slant in this range. */
const ARROW_PLANT_SECONDS = 3;
const ARROW_PLANT_PITCH = [0.35, 0.75];
/** How deep the tip goes into the sand, and how long the shaft quivers after it lands. */
const ARROW_PLANT_DEPTH = 0.09;
const ARROW_QUIVER_SECONDS = 0.4;
const FIREBALL_HEIGHT = 0.7;
const DECAL_POOL = 12;
/** Fires on a burning fighter: bone and size of each (a brazier is 1), so the whole torso and the shoulders blaze. */
const BODY_FLAMES = Object.freeze([['Hips', 0.2], ['Spine_02', 0.28], ['Shoulder_L', 0.18], ['Shoulder_R', 0.18], ['Head', 0.12]]);
/** Seconds for the flames to catch, and to die down once the burn ends. */
const IGNITE_SECONDS = 0.25;
const DOUSE_SECONDS = 0.8;
const FX_URL = '/assets/synty/special-effects/Textures/PolygonParticles_';
/** Synty particle textures; each has a canvas stand-in so effects still read when the assets are not installed. */
const FX_TEXTURES = Object.freeze({
    spot: ['Soft_Spot', 'glow'], smoke: ['Smoke_01', 'glow'], ring: ['Ring_02', 'ring'], ritual: ['RitualCircle_01', 'ring'], ground: ['GroundBreak', 'ring'],
    sparkle: ['Sparkle', 'glow'], flame: ['Fumes_02', 'glow'], hex: ['Hexagon', 'ring'], bubble: ['Bubble', 'glow'], portal: ['Portal_Single_Chipped', 'ring'], dark: ['Soft_Spot_Dark', 'glow'],
});

/** Canvas fallback for a particle texture: a soft glow or a thin ring. */
function drawFallback(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (kind === 'ring') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.stroke();
    }
    else {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
    }
    return canvas;
}

/**
 * Projectiles, impact particles, rings, slashes, one-shot audio and the game-clock
 * timeline that syncs them to the swing animations. Effects are sparse, pooled and
 * never allocate per frame.
 */
export class BattleEffects {
    #THREE;
    #scene;
    #audio;
    #onShake;
    #clock = 0;
    #timeline = [];
    #particles = [];
    #rings = [];
    #slashes = [];
    #pillars = [];
    #nextPillar = 0;
    /** Fireball explosions (see `blast.js`). */
    #blasts;
    #variants = new Map();
    /** Arrows drawn on a bow when the engine spawned them: the flying arrow starts there. */
    #launches = new Map();
    #launchScratch = null;
    /** Arrows lodged in a fighter after hitting them (see `#stickArrow`). */
    #stuck = [];
    #stuckScratch = null;
    /** Close shots loosed so far (keys their arrows). */
    #closeShots = 0;
    #projectiles = new Map();
    #damageTotals = new Map();
    #geometries = {};
    #textures = {};
    #decals = [];
    #nextDecal = 0;
    #materials = [];
    #nextParticle = 0;
    #nextRing = 0;
    #nextSlash = 0;
    #root;
    /** Flames on burning fighters (see `#updateBurning`), drawn by their own fire system. */
    #bodyFires;
    /** @type {Map<import('./fighter.js').Fighter, { strength: number, fires: Array<{ bone: string, size: number, fire: object }> }>} */
    #burning = new Map();
    #boneScratch = null;

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene, audio: import('./audio-manager.js').BattleAudioManager, onShake: (trauma: number) => void }} options Dependencies.
     */
    constructor({ THREE, scene, audio, onShake }) {
        this.#THREE = THREE;
        this.#scene = scene;
        this.#audio = audio;
        this.#onShake = onShake;
        this.#root = new THREE.Group();
        scene.add(this.#root);
        this.#blasts = new BlastSystem(THREE);
        this.#root.add(this.#blasts.group);
        this.#bodyFires = new FireSystem(THREE, { seeThrough: 0 });
        this.#root.add(this.#bodyFires.group);
        const loader = new THREE.TextureLoader();
        for (const [key, [file, fallback]] of Object.entries(FX_TEXTURES)) {
            const texture = new THREE.CanvasTexture(drawFallback(fallback));
            texture.colorSpace = THREE.SRGBColorSpace;
            loader.load(`${FX_URL}${file}.png`, (loaded) => {
                texture.image = loaded.image;
                texture.needsUpdate = true;
                loaded.dispose();
            }, undefined, () => {});
            this.#textures[key] = texture;
        }
        this.#geometries = {
            ring: new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
            slash: new THREE.RingGeometry(0.7, 1.15, 20, 1, -Math.PI / 2 - 1.0, 2.0).rotateX(-Math.PI / 2),
            arrowShaft: new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4).rotateX(Math.PI / 2),
            arrowHead: new THREE.ConeGeometry(0.03, ARROW_HEAD_LENGTH, 4).rotateX(Math.PI / 2),
            pillar: new THREE.CylinderGeometry(1, 1, 1, 14, 1, true).translate(0, 0.5, 0),
            ball: new THREE.SphereGeometry(1, 12, 8),
        };
        for (let i = 0; i < PARTICLE_POOL; i += 1) this.#particles.push(this.#createSprite({ life: 0, maxLife: 1, velocity: new THREE.Vector3(), gravity: 0, size: 1 }));
        for (let i = 0; i < RING_POOL; i += 1) {
            const ring = this.#createPooled(this.#geometries.ring, { life: 0, maxLife: 1, radius: 1 });
            ring.material.map = this.#textures.ring;
            this.#rings.push(ring);
        }
        for (let i = 0; i < DECAL_POOL; i += 1) {
            const decal = this.#createPooled(this.#geometries.ring, { life: 0, maxLife: 1, radius: 1, spin: 0 });
            decal.material.map = this.#textures.ritual;
            this.#decals.push(decal);
        }
        for (let i = 0; i < PILLAR_POOL; i += 1) {
            const pillar = this.#createPooled(this.#geometries.pillar, { life: 0, maxLife: 1, mode: 'out', height: 2 }, THREE.DoubleSide);
            pillar.material.blending = THREE.AdditiveBlending;
            this.#pillars.push(pillar);
        }
        for (let i = 0; i < SLASH_POOL; i += 1) this.#slashes.push(this.#createPooled(this.#geometries.slash, { life: 0, maxLife: 1 }, THREE.DoubleSide));
    }

    #createPooled(geometry, data, side = this.#THREE.FrontSide) {
        const material = new this.#THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side });
        this.#materials.push(material);
        const mesh = new this.#THREE.Mesh(geometry, material);
        mesh.visible = false;
        mesh.userData = data;
        this.#root.add(mesh);
        return mesh;
    }

    /** Camera-facing pooled quad for sparks and smoke; the texture and blending are chosen per emit. */
    #createSprite(data) {
        const material = new this.#THREE.SpriteMaterial({ map: this.#textures.spot, transparent: true, depthWrite: false });
        this.#materials.push(material);
        const sprite = new this.#THREE.Sprite(material);
        sprite.visible = false;
        sprite.userData = data;
        this.#root.add(sprite);
        return sprite;
    }

    // ------------------------------------------------------------------ timeline

    /**
     * Runs a callback after some game-clock seconds (frozen while paused, scaled by speed).
     *
     * @param {number} delay Game seconds from now.
     * @param {() => void} callback Deferred work.
     */
    later(delay, callback) {
        if (delay <= 0) callback();
        else this.#timeline.push({ at: this.#clock + delay, callback });
    }

    /** Drops queued work and live projectiles after a seek so nothing fires out of order. */
    /**
     * Shows every pooled sprite, ring and decal (true) so the renderer can compile their shaders and upload their
     * textures behind the loading screen, or hides them again (false). Only for the warm-up before the battle.
     *
     * @param {boolean} visible Whether the pools are drawn.
     */
    setPoolsVisible(visible) {
        for (const item of [...this.#particles, ...this.#rings, ...this.#decals, ...this.#slashes, ...this.#pillars]) {
            item.visible = visible || item.userData.life > 0;
        }
    }

    clear() {
        this.#timeline = [];
        this.#douseAll();
        this.#damageTotals.clear();
        this.#projectiles.forEach((entry) => entry.mesh.removeFromParent());
        this.#projectiles.clear();
        this.#launches.clear();
        this.#stuck.forEach((arrow) => arrow.mesh.removeFromParent());
        this.#stuck = [];
        this.#variants.clear();
        this.#blasts.clear();
        [...this.#particles, ...this.#rings, ...this.#decals, ...this.#slashes, ...this.#pillars].forEach((item) => { item.visible = false; item.userData.life = 0; });
    }

    // ---------------------------------------------------------------- primitives

    emitSparks(position, { count = 8, speed = 2.5, size = 0.09, life = 0.45, up = 1.5, gravity = 6, colors = [0xffe9a8], smoke = false, texture = smoke ? 'smoke' : 'spot' } = {}) {
        for (let i = 0; i < count; i += 1) {
            const spark = this.#particles[this.#nextParticle];
            this.#nextParticle = (this.#nextParticle + 1) % PARTICLE_POOL;
            const angle = Math.random() * Math.PI * 2;
            const push = speed * (0.4 + Math.random() * 0.6);
            const data = spark.userData;
            data.velocity.set(Math.cos(angle) * push, up * (0.4 + Math.random()), Math.sin(angle) * push);
            data.gravity = gravity;
            data.life = data.maxLife = life * (0.7 + Math.random() * 0.5);
            data.size = size * (0.6 + Math.random() * 0.8);
            spark.position.copy(position);
            spark.material.color.setHex(colors[i % colors.length]);
            spark.material.map = this.#textures[texture];
            spark.material.blending = smoke ? this.#THREE.NormalBlending : this.#THREE.AdditiveBlending;
            spark.material.rotation = Math.random() * Math.PI * 2;
            data.size *= smoke ? 1.3 : (texture === 'bubble' ? 1.6 : 2.4);
            spark.visible = true;
        }
    }

    /** Expanding flat ring at `position`, just over the sand unless a `height` is given (a shockwave round the head). */
    addRing(position, color, radius = 2, life = 0.6, height = 0.12) {
        const ring = this.#rings[this.#nextRing];
        this.#nextRing = (this.#nextRing + 1) % RING_POOL;
        ring.userData.life = ring.userData.maxLife = life;
        ring.userData.radius = radius;
        ring.position.set(position.x, height, position.z);
        ring.material.color.setHex(color);
        ring.scale.setScalar(0.1);
        ring.visible = true;
    }

    /** Flat Synty glyph on the floor (ritual circle, ground crack) that spins and fades. */
    addDecal(position, key, color, radius = 1.5, life = 0.9, { spin = 1.5, additive = true } = {}) {
        const decal = this.#decals[this.#nextDecal];
        this.#nextDecal = (this.#nextDecal + 1) % DECAL_POOL;
        Object.assign(decal.userData, { life, maxLife: life, radius, spin });
        decal.position.set(position.x, 0.1, position.z);
        decal.rotation.y = Math.random() * Math.PI * 2;
        decal.material.map = this.#textures[key];
        decal.material.color.setHex(color);
        decal.material.blending = additive ? this.#THREE.AdditiveBlending : this.#THREE.NormalBlending;
        decal.scale.setScalar(radius * 0.6);
        decal.visible = true;
    }

    /** Vertical light column: `out` grows from the floor and fades (arrival), `in` collapses toward the floor (departure). */
    addPillar(position, color, mode, life = 0.6) {
        const pillar = this.#pillars[this.#nextPillar];
        this.#nextPillar = (this.#nextPillar + 1) % PILLAR_POOL;
        Object.assign(pillar.userData, { life, maxLife: life, mode, height: 2.1 });
        pillar.position.set(position.x, 0.1, position.z);
        pillar.material.color.setHex(color);
        pillar.visible = true;
    }

    /** A fireball blast: the particle explosion, then scorch marks left on the sand. */
    addExplosion(position, radius = 1) {
        this.#blasts.explode(position, radius);
        this.addDecal(position, 'dark', 0x1a1410, radius * 2.6, 4, { spin: 0, additive: false });
        this.addDecal(position, 'ground', 0x2a1f18, radius * 1.6, 3.5, { spin: 0, additive: false });
    }

    addSlash(fighter, color = 0xfff2c8) {
        const slash = this.#slashes[this.#nextSlash];
        this.#nextSlash = (this.#nextSlash + 1) % SLASH_POOL;
        slash.userData.life = slash.userData.maxLife = 0.22;
        slash.position.set(fighter.position.x, 0.65, fighter.position.z);
        slash.rotation.y = fighter.debug.yaw;
        slash.material.color.setHex(color);
        slash.scale.setScalar(0.85);
        slash.visible = true;
    }

    /**
     * Plays a sound where it happens (see `BattleAudioManager#play`); the effects slider sets the bus volume.
     *
     * @param {string} name Sound name.
     * @param {{ x: number, z: number }|null} [at] World position (unpositioned when omitted).
     * @param {{ gain?: number, rate?: number }} [options] Extra gain and pitch.
     */
    #sfx(name, at = null, options = {}) {
        this.#audio.play(name, { at: at ? { x: at.x, y: 0.8, z: at.z } : null, ...options });
    }

    // -------------------------------------------------------------------- events

    /**
     * Turns replay events into visuals and sound. Call before fighters receive the
     * new frame so departure positions and action ages still describe the previous one.
     *
     * @param {Array<Record<string, unknown>>} events Events derived from two frames.
     * @param {Map<string, import('./fighter.js').Fighter>} fighters Fighters by id.
     * @param {import('./hud.js').BattleHud} overlay Label overlay.
     * @param {Record<string, unknown>} prefs Playback preferences.
     * @param {Record<string, unknown>} frame The frame being applied.
     */
    handleEvents(events, fighters, overlay, prefs, frame) {
        for (const event of events) {
            const fighter = fighters.get(String(event.gladId));
            switch (event.type) {
                case 'action': if (fighter) this.#onAction(event, fighter, prefs, frame); break;
                case 'damage': if (fighter) this.#onDamage(event, fighter, fighters, overlay, prefs, events); break;
                case 'heal':
                    if (fighter && prefs.text) overlay.showFloatingLabel(fighter, `+${Math.round(Number(event.amount))}`, 'heal');
                    break;
                case 'level-up':
                    if (!fighter) break;
                    overlay.showFloatingLabel(fighter, `NÍVEL ${event.level}`, 'level');
                    this.addRing(fighter.position, 0xffe66d, 2.6, 0.9);
                    this.emitSparks(fighter.position, { count: 18, speed: 1.6, life: 0.9, up: 3.2, gravity: 3, colors: [0xffe66d, 0xfff3b0] });
                    this.#sfx('lvlup', fighter.position);
                    this.#audio.duck(0.6, 1.5);
                    break;
                case 'death':
                    if (!fighter) break;
                    this.#sfx(fighter.appearance.female ? 'death_female' : 'death_male', fighter.position);
                    // The body hits the sand as the death clip folds it.
                    this.later(0.6, () => this.#sfx('thud', fighter.position, { gain: 1.2, rate: 0.85 }));
                    this.#audio.duck(0.5, 1);
                    this.emitSparks(fighter.position, { count: 12, speed: 1.4, size: 0.18, life: 0.9, up: 1.2, gravity: 1.2, colors: [0x8a7f6d, 0xa39682] });
                    this.#onShake(0.3);
                    break;
                case 'revive': if (fighter) this.addRing(fighter.position, 0x9ff3ff, 2.4, 0.7); break;
                case 'projectile-spawn': {
                    const owner = fighters.get(String(event.projectile?.owner));
                    // The flying fireball starts from the orb grown between the caster's hands, an arrow from the bow.
                    const launch = Number(event.projectile?.type) === 1 ? owner?.castOrb : owner?.nockedArrow;
                    if (launch) this.#launches.set(`${event.projectile.type}:${event.projectile.id}`, launch);
                    owner?.fire();
                    if (owner?.activeAction?.name === 'assassinate') this.#variants.set(`${event.projectile.type}:${event.projectile.id}`, 'assassinate');
                    if (Number(event.projectile?.type) === 1) this.#sfx('fireball', owner?.position ?? null);
                    break;
                }
                case 'projectile-impact': this.#onImpact(event.projectile, prefs, fighters); break;
                case 'stun': if (fighter) this.#onStun(fighter, overlay, prefs); break;
                case 'cough': if (fighter) this.#onCough(fighter); break;
                default: break;
            }
        }
    }

    #onAction(event, fighter, prefs, frame) {
        const name = ACTION_BY_ID[event.action];
        const spec = fighter.activeAction?.spec ?? (name ? ACTION_SPECS[name] : null);
        if (!spec) return;
        const at = fighter.position;
        // Game seconds until the blow, shot or cast leaves the fighter (paced by the engine for attacks and spells).
        const contact = fighter.activeAction?.untilContact ?? spec.contact ?? 0;
        switch (name) {
            case 'melee':
                this.later(contact, () => {
                    this.addSlash(fighter, 0xfff2c8);
                    this.#sfx('melee', fighter.position);
                });
                break;
            case 'assassinate': {
                // A blood sigil under the assassin, red embers drawn into the bow, a red flash as the arrow leaves.
                this.addDecal(at, 'ritual', 0xb0101c, 1.4, contact + 0.5);
                this.addRing(at, 0xd01a28, 1.5, 0.45);
                for (let i = 0; i < 5; i += 1) {
                    this.later(0.08 + i * 0.07, () => {
                        const bow = { x: fighter.position.x, y: 0.75, z: fighter.position.z };
                        this.emitSparks(bow, { count: 5, speed: 1.2, size: 0.09, life: 0.45, up: 0.4, gravity: -1.5, colors: [0x7a0010, 0xd01a28, 0xff5060] });
                    });
                }
                this.later(contact, () => {
                    const bow = { x: fighter.position.x + Math.sin(fighter.debug.yaw) * 0.45, y: 0.75, z: fighter.position.z + Math.cos(fighter.debug.yaw) * 0.45 };
                    this.emitSparks(bow, { count: 1, speed: 0, size: 0.55, life: 0.25, up: 0, gravity: 0, colors: [0xff3a4a], texture: 'sparkle' });
                    this.emitSparks(bow, { count: 12, speed: 2.2, size: 0.08, life: 0.4, up: 0.3, gravity: 0, colors: [0xd01a28, 0xff6070] });
                    this.#sfx('assassinate', fighter.position);
                });
                break;
            }
            case 'ranged':
                // The draw is silent; the string twangs on release.
                this.later(contact, () => this.#sfx('ranged', fighter.position));
                break;
            case 'fireball': {
                this.addRing(at, 0xff7a2a, 1.3, 0.5);
                this.addDecal(at, 'ritual', 0xff8a3a, 1.2, contact + 0.4);
                // Embers spiral into the hands while the fireball charges.
                for (let i = 0; i < 6; i += 1) {
                    this.later(0.1 + i * 0.08, () => {
                        const hand = { x: fighter.position.x, y: 0.7, z: fighter.position.z };
                        this.addRing(fighter.position, 0xff9a3a, 1.2 - i * 0.12, 0.3);
                        this.emitSparks(hand, { count: 6, speed: 1.4, size: 0.1, life: 0.4, up: 0.6, gravity: -2, colors: [0xff9a3a, 0xffd27a] });
                    });
                }
                this.later(contact, () => {
                    const hand = { x: fighter.position.x, y: 0.65, z: fighter.position.z };
                    this.addRing(hand, 0xffb84a, 2.2, 0.4);
                    this.emitSparks(hand, { count: 28, speed: 3.2, size: 0.13, life: 0.55, up: 1.2, gravity: 1, colors: [0xff5b2e, 0xffb84a, 0xfff0b0] });
                    this.emitSparks(hand, { count: 1, speed: 0, size: 0.5, life: 0.35, up: 0, gravity: 0, colors: [0xffe2a0], texture: 'sparkle' });
                });
                break;
            }
            case 'block': {
                const front = { x: at.x + Math.sin(fighter.debug.yaw) * 0.5, y: 0.8, z: at.z + Math.cos(fighter.debug.yaw) * 0.5 };
                this.emitSparks(front, { count: 1, speed: 0, size: 0.8, life: 0.4, up: 0, gravity: 0, colors: [0xbfeaff], texture: 'sparkle' });
                this.emitSparks(front, { count: 14, speed: 1.6, size: 0.07, life: 0.6, up: 0.8, gravity: 0, colors: [0x62c8ff, 0xbfeaff] });
                this.#sfx('block', at);
                break;
            }
            case 'ambush': this.#smokeScreen(at); this.#sfx('ambush', at); break;
            case 'charge': this.#sfx(fighter.appearance.female ? 'charge_female' : 'charge_male', at); break;
            case 'potion':
                this.later(contact, () => {
                    this.addRing(fighter.position, 0x62ef70, 1.6, 0.6);
                    this.emitSparks({ x: fighter.position.x, y: 0.2, z: fighter.position.z }, { count: 10, speed: 0.6, size: 0.1, life: 1, up: 1.4, gravity: -0.5, colors: [0x8affa0, 0xd8ffe0], texture: 'bubble' });
                    this.emitSparks({ x: fighter.position.x, y: 0.9, z: fighter.position.z }, { count: 1, speed: 0, size: 0.6, life: 0.5, up: 0, gravity: 0, colors: [0xb8ffc8], texture: 'sparkle' });
                    this.#sfx(potionSound(event.code), fighter.position);
                });
                break;
            default: break;
        }
    }

    /**
     * The blow that dazes: a white flash at the head, a golden shockwave round it and a spray of sparks, with the
     * classic stun sound and a floating label (the stars that follow are the fighter's own, see `Fighter`).
     */
    #onStun(fighter, overlay, prefs) {
        this.#sfx('stun', fighter.position);
        const head = fighter.bonePosition('Head', new this.#THREE.Vector3());
        head.y += 0.1;
        this.emitSparks(head, { count: 1, speed: 0, size: 0.7, life: 0.25, up: 0, gravity: 0, colors: [0xfffbe0], texture: 'sparkle' });
        this.emitSparks(head, { count: 16, speed: 2, size: 0.07, life: 0.45, up: 0.6, gravity: 2, colors: [0xffe066, 0xfff6c0, 0xffffff] });
        this.addRing(head, 0xffd84a, 0.9, 0.4, head.y);
        if (prefs.text) overlay.showFloatingLabel(fighter, 'ATORDOADO', 'stun');
    }

    /** A gladiator choking in the poison gas: a coughing fit and a few green puffs breathed out of the mouth. */
    #onCough(fighter) {
        // The recordings are men's voices; a woman's cough is the same breath pitched up.
        this.#sfx('cough', fighter.position, { rate: fighter.appearance.female ? 1.22 : 1 });
        for (const delay of [0.02, 0.3]) {
            this.later(delay, () => {
                const yaw = fighter.debug.yaw;
                const mouth = { x: fighter.position.x + Math.sin(yaw) * 0.18, y: 0.9, z: fighter.position.z + Math.cos(yaw) * 0.18 };
                this.emitSparks(mouth, { count: 4, speed: 0.35, size: 0.1, life: 0.8, up: 0.3, gravity: -0.3, colors: [0x7da84a, 0xa8c878], smoke: true });
            });
        }
    }

    /**
     * A hit lands when the swing connects. The engine resolves melee damage half an attack cycle after the
     * swing starts and the swing is paced to connect on that step, so the visual waits only for whatever is
     * left of the attacker's wind-up (frame timing jitter).
     */
    #onDamage(event, victim, fighters, overlay, prefs, events) {
        let delay = 0;
        // The melee attacker whose blow this is, if any (it leaves a wound facing them).
        let blade = null;
        // Where the blow came from, so the victim reels the right way.
        let from = null;
        const impact = events.find((other) => other.type === 'projectile-impact');
        let struck = Boolean(impact);
        if (impact) from = this.#projectileSource(impact.projectile, victim);
        for (const attacker of fighters.values()) {
            const action = attacker.activeAction;
            const spec = action?.spec ?? null;
            if (!spec || attacker === victim || !['melee', 'charge'].includes(action.name)) continue;
            const distance = Math.hypot(attacker.position.x - victim.position.x, attacker.position.z - victim.position.z);
            if (distance > MELEE_REACH) continue;
            if (action.name === 'charge') {
                // The charge lands on arrival: the rush ends in a quick swing and the blow is shown at its contact.
                // Small ticks next to a charger (burn, poison) are not the blow.
                if (Number(event.amount) < Math.max(1, Number(victim.state.maxhp) * 0.02)) continue;
                delay = Math.max(delay, attacker.chargeStrike());
            }
            else {
                // A swing strikes at its contact, give or take a frame of timing jitter. Damage reported earlier in
                // the wind-up or long after is something else (burn, poison).
                if (action.untilContact > CONTACT_TOLERANCE || action.age > spec.contact + HIT_WINDOW) continue;
                delay = Math.max(delay, action.untilContact);
            }
            struck = true;
            blade = attacker;
            from = attacker.position;
        }
        if (!struck) {
            const archer = this.#closeShooter(victim, fighters);
            if (archer) {
                this.#closeShot(archer, victim);
                struck = true;
                from = archer.position;
            }
        }
        // Only attacks and projectiles flinch; burn and poison ticks are damage over time and just show their number.
        this.later(delay, () => {
            if (struck) {
                victim.hit(from);
                if (blade) {
                    victim.wound(blade.position);
                    // Steel on a raised guard rings; a blow on the body lands with a weight that follows the damage.
                    const share = Number(event.amount) / Math.max(1, Number(victim.state.maxhp) || 100);
                    if (Number(victim.state.buffs?.resist?.timeleft) > 0) this.#sfx('clang', victim.position);
                    else this.#sfx(share >= HEAVY_BLOW ? 'flesh_heavy' : 'flesh', victim.position, { gain: Math.min(1.3, 0.75 + share * 4) });
                }
                this.emitSparks({ x: victim.position.x, y: 0.6, z: victim.position.z }, { count: 7, speed: 2.2, colors: [0xfff2c8, 0xff8a6a] });
                this.emitSparks({ x: victim.position.x, y: 0.7, z: victim.position.z }, { count: 1, speed: 0, size: 0.35, life: 0.22, up: 0, gravity: 0, colors: [0xfff2c8], texture: 'sparkle' });
            }
            const key = String(event.gladId);
            const total = (this.#damageTotals.get(key) ?? 0) + Number(event.amount);
            if (total >= Math.max(1, Number(victim.state.maxhp) * 0.01)) {
                if (prefs.text) overlay.showFloatingLabel(victim, Math.round(total).toString(), 'damage');
                this.#damageTotals.set(key, 0);
            }
            else {
                this.#damageTotals.set(key, total);
            }
        });
    }

    /**
     * A point back along a projectile's flight from the victim: where its last frame had it, or, when that sits on the
     * victim, one metre behind along its heading.
     */
    #projectileSource(projectile, victim) {
        const x = Number(projectile.x) - ARENA_SIZE / 2;
        const z = Number(projectile.y) - ARENA_SIZE / 2;
        if (Math.hypot(x - victim.position.x, z - victim.position.z) > 0.2) return { x, z };
        // The same heading-to-yaw turn as the fighters (renderer.js `headingToYaw`).
        const yaw = Math.PI + headingToRadians(projectile.head);
        return { x: victim.position.x - Math.sin(yaw), z: victim.position.z - Math.cos(yaw) };
    }

    /**
     * The archer whose point-blank arrow this hit is (see `CLOSE_SHOT_REACH`): standing within reach of the victim,
     * bow drawn and not yet loosed, facing it. Null when nobody is.
     */
    #closeShooter(victim, fighters) {
        let best = null;
        let bestDistance = CLOSE_SHOT_REACH;
        for (const archer of fighters.values()) {
            const action = archer.activeAction;
            if (archer === victim || !archer.shotPending || !['ranged', 'assassinate'].includes(action?.name)) continue;
            const dx = victim.position.x - archer.position.x;
            const dz = victim.position.z - archer.position.z;
            const distance = Math.hypot(dx, dz);
            if (distance >= bestDistance) continue;
            const off = Math.abs(((Math.atan2(dx, dz) - archer.debug.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (off > CLOSE_SHOT_FACING) continue;
            best = archer;
            bestDistance = distance;
        }
        return best;
    }

    /**
     * Looses the arrow the engine resolved within a step: from the nocked arrow's pose straight into the victim's
     * body, where it sticks like any other (`#stickArrow`), with the hit's sounds and, for an assassination, its blood.
     */
    #closeShot(archer, victim) {
        const launch = archer.nockedArrow;
        const bleeding = archer.activeAction?.name === 'assassinate';
        archer.fire();
        const mesh = this.#createProjectile({ type: 0 }, bleeding ? 'assassinate' : null);
        if (launch) mesh.position.copy(launch.position);
        else mesh.position.set(archer.position.x, ARROW_HEIGHT, archer.position.z);
        const yaw = Math.atan2(victim.position.x - mesh.position.x, victim.position.z - mesh.position.z);
        const key = `close:${this.#closeShots += 1}`;
        this.#projectiles.set(key, { mesh, yaw });
        this.#stickArrow(key, victim);
        const at = { x: victim.position.x, y: ARROW_HEIGHT, z: victim.position.z };
        this.#sfx('arrow_hit', at);
        if (Number(victim.state?.buffs?.resist?.timeleft) > 0) this.#sfx('clang', at, { gain: 0.6, rate: 1.2 });
        else this.#sfx('flesh', at, { gain: bleeding ? 0.9 : 0.6, rate: 1.15 });
        if (bleeding) {
            this.emitSparks(at, { count: 22, speed: 2.6, size: 0.1, life: 0.7, up: 1.2, gravity: 6, colors: [0x6a000c, 0xa8101e, 0xe0202e] });
            this.addDecal(at, 'dark', 0x5a0008, 1.1, 5, { spin: 0, additive: false });
        }
    }

    /**
     * A missed arrow ends stuck in the sand where the engine dropped it: tip down at a slant along its flight, a
     * short quiver, then it stands until it fades (see `#updateStuckArrows`).
     */
    #plantArrow(key, at) {
        const entry = this.#projectiles.get(key);
        if (!entry) return;
        this.#projectiles.delete(key);
        const { mesh } = entry;
        const yaw = entry.yaw ?? mesh.rotation.y;
        const pitch = ARROW_PLANT_PITCH[0] + Math.random() * (ARROW_PLANT_PITCH[1] - ARROW_PLANT_PITCH[0]);
        const tip = new this.#THREE.Vector3(at.x, terrainHeight(at.x, at.z), at.z);
        const direction = new this.#THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        tip.addScaledVector(direction, ARROW_PLANT_DEPTH);
        mesh.traverse((node) => {
            if (!node.material) return;
            node.material.transparent = true;
            node.material.needsUpdate = true;
        });
        this.#stuck.push({ mesh, victim: null, phase: 'planted', age: 0, tip, direction, yaw, pitch });
    }

    /** Dense grey cloud that billows around the caster, hides it, then thins out. */
    #smokeScreen(at) {
        const smoke = (y, count, speed) => this.emitSparks({ x: at.x, y, z: at.z }, { count, speed, size: 0.7, life: 1.6, up: 0.5, gravity: -0.15, colors: [0x8a8a94, 0x62626c, 0xa8a8b2], smoke: true });
        smoke(0.2, 14, 1.1);
        this.addRing(at, 0x8a8a94, 2.2, 0.7);
        this.later(0.15, () => smoke(0.7, 12, 0.8));
        this.later(0.35, () => smoke(1.1, 8, 0.5));
    }

    /** Lights the origin and the destination portals at the same instant, linked by a spark trail. */
    teleport(from, to, prefs) {
        this.#teleportBurst(from, 'in');
        this.#teleportBurst(to, 'out');
        this.#portalLink(from, to);
        this.#sfx('teleport', { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 });
    }

    /** A trail of sparks bridging the two portals. */
    #portalLink(from, to) {
        const steps = Math.min(12, Math.max(3, Math.round(Math.hypot(to.x - from.x, to.z - from.z) / 1.5)));
        for (let i = 1; i < steps; i += 1) {
            const t = i / steps;
            this.emitSparks({ x: from.x + (to.x - from.x) * t, y: 0.5, z: from.z + (to.z - from.z) * t }, { count: 3, speed: 0.4, up: 0.5, gravity: 0, life: 0.5, size: 0.07, colors: [0xc890ff, 0xf0e0ff] });
        }
    }

    #teleportBurst(position, mode) {
        this.addDecal(position, 'ritual', mode === 'in' ? 0xb070ff : 0xd8b0ff, 1.7, 1.4, { spin: mode === 'in' ? 1.2 : -1.2 });
        this.addDecal(position, 'portal', 0x8a50ff, 1.5, 1.2, { spin: mode === 'in' ? -3 : 3 });
        this.addPillar(position, 0xb070ff, mode, 0.7);
        this.addRing(position, 0xc890ff, 1.6, 0.6);
        const points = mode === 'in' ? { speed: 0.5, up: 3.2 } : { speed: 1.8, up: 2.4 };
        this.emitSparks({ x: position.x, y: 0.3, z: position.z }, { count: 18, gravity: 0, life: 0.7, size: 0.08, colors: [0xc890ff, 0xf0e0ff, 0x8a5aff], ...points });
    }

    #onImpact(projectile, prefs, fighters = new Map()) {
        if (!projectile) return;
        const key = `${projectile.type}:${projectile.id}`;
        const bleeding = this.#variants.get(key) === 'assassinate';
        this.#variants.delete(key);
        const isFireball = Number(projectile.type) === 1;
        let position = { x: Number(projectile.x) - ARENA_SIZE / 2, y: isFireball ? FIREBALL_HEIGHT : ARROW_HEIGHT, z: Number(projectile.y) - ARENA_SIZE / 2 };
        let victim = null;
        if (!isFireball) {
            // The engine drops an arrow the step it hits; the arrow flies on into the body it hit and sticks there.
            victim = this.#arrowVictim(projectile, position, fighters);
            if (victim) {
                this.#stickArrow(key, victim);
                position = { x: victim.position.x, y: ARROW_HEIGHT, z: victim.position.z };
            }
        }
        if (isFireball) {
            this.addExplosion(position, 1.05);
            this.#onShake(0.28);
        }
        else if (bleeding) {
            // The bleeding arrow: a spray of blood and a dark splatter left on the sand.
            this.emitSparks(position, { count: 22, speed: 2.6, size: 0.1, life: 0.7, up: 1.2, gravity: 6, colors: [0x6a000c, 0xa8101e, 0xe0202e] });
            this.emitSparks(position, { count: 1, speed: 0, size: 0.6, life: 0.22, up: 0, gravity: 0, colors: [0xff3040], texture: 'sparkle' });
            this.addRing(position, 0xc0101e, 1.3, 0.35);
            this.addDecal(position, 'dark', 0x5a0008, 1.1, 5, { spin: 0, additive: false });
        }
        else {
            this.emitSparks(position, { count: 6, speed: 1.6, colors: [0xe8d7ad] });
        }
        if (isFireball) {
            this.#sfx('explosion', position);
            this.#audio.duck(0.45, 0.6);
        }
        else if (victim) {
            // A thunk into the body (or a clang off a raised guard) under the arrow's own hit.
            this.#sfx('arrow_hit', position);
            if (Number(victim.state?.buffs?.resist?.timeleft) > 0) this.#sfx('clang', position, { gain: 0.6, rate: 1.2 });
            else this.#sfx('flesh', position, { gain: bleeding ? 0.9 : 0.6, rate: 1.15 });
        }
        else {
            this.#plantArrow(key, position);
            this.#sfx('sand', position);
        }
    }

    /** The gladiator an arrow struck: the nearest standing one, other than the archer, close to where it vanished. */
    #arrowVictim(projectile, at, fighters) {
        let best = null;
        let bestDistance = ARROW_HIT_REACH;
        for (const [id, fighter] of fighters) {
            if (id === String(projectile.owner) || !(Number(fighter.state?.hp) > 0)) continue;
            const distance = Math.hypot(fighter.position.x - at.x, fighter.position.z - at.z);
            if (distance < bestDistance) {
                best = fighter;
                bestDistance = distance;
            }
        }
        return best;
    }

    /**
     * Takes a flying arrow out of the projectile list before the frame drops it and drives it into the victim: it
     * glides on along its heading to where that line meets the posed body (or the chest, if the line misses), sinks
     * its tip in, and is bound to the bone there so it moves with the body. When its time is up it drops off,
     * tumbles onto the sand and fades (see `#updateStuckArrows`).
     */
    #stickArrow(key, victim) {
        const entry = this.#projectiles.get(key);
        if (!entry) return;
        const THREE = this.#THREE;
        this.#projectiles.delete(key);
        const { mesh } = entry;
        mesh.rotation.set(0, entry.yaw, 0);
        mesh.updateMatrixWorld();
        const forward = new THREE.Vector3(Math.sin(entry.yaw), 0, Math.cos(entry.yaw));
        // The arrow's line, started a metre short of the victim.
        const centre = new THREE.Vector3(victim.position.x, mesh.position.y, victim.position.z);
        const along = centre.clone().sub(mesh.position).dot(forward);
        const start = mesh.position.clone().addScaledVector(forward, along - 1);
        // Along its own line first; if that grazes past the pose, through the body at a few heights.
        let hit = victim.bodyHit(start, forward, 2);
        for (const height of [0.6, 0.5, 0.7, 0.4]) {
            if (hit) break;
            hit = victim.bodyHit(new THREE.Vector3(victim.position.x, height, victim.position.z).addScaledVector(forward, -1), forward, 2);
        }
        const tip = hit ? hit.point.clone().addScaledVector(forward, ARROW_SINK) : centre.clone().addScaledVector(forward, ARROW_SINK - ARROW_BODY_RADIUS);
        // Kept in the bone's frame so the glide ends exactly where the body has moved to.
        const bone = hit?.bone ?? victim.root;
        const localTip = bone.worldToLocal(tip.clone());
        this.#stuck.push({ mesh, victim, bone, localTip, forward, from: mesh.position.clone(), age: 0, phase: 'glide' });
    }

    #updateStuckArrows(dt) {
        const THREE = this.#THREE;
        const scratch = this.#stuckScratch ??= { tip: new THREE.Vector3(), axis: new THREE.Vector3(), flat: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) };
        for (const arrow of this.#stuck) {
            arrow.age += dt;
            const { mesh, victim, forward } = arrow;
            if (arrow.phase === 'planted') {
                // Pivots on the buried tip: a fading quiver, then still until it fades out.
                const quiver = arrow.age < ARROW_QUIVER_SECONDS ? Math.sin(arrow.age * 70) * 0.08 * (1 - arrow.age / ARROW_QUIVER_SECONDS) : 0;
                mesh.rotation.set(arrow.pitch + quiver, arrow.yaw, 0, 'YXZ');
                scratch.axis.set(0, 0, 1).applyQuaternion(mesh.quaternion);
                mesh.position.copy(arrow.tip).addScaledVector(scratch.axis, -ARROW_TIP_OFFSET * ARROW_SCALE);
                const opacity = Math.min(1, (ARROW_PLANT_SECONDS - arrow.age) / ARROW_FADE_SECONDS);
                mesh.traverse((node) => {
                    if (node.material) node.material.opacity = Math.max(0, opacity);
                });
                if (opacity <= 0) {
                    mesh.removeFromParent();
                    arrow.done = true;
                }
                continue;
            }
            const standing = Number(victim?.state?.hp) > 0;
            if (arrow.phase === 'glide') {
                arrow.bone.updateWorldMatrix(true, false);
                const tip = arrow.bone.localToWorld(scratch.tip.copy(arrow.localTip));
                const target = tip.addScaledVector(forward, -ARROW_TIP_OFFSET * ARROW_SCALE);
                const t = Math.min(1, arrow.age / ARROW_GLIDE_SECONDS);
                mesh.position.lerpVectors(arrow.from, target, t);
                if (t >= 1) {
                    // A slight wobble off the line, pivoting on the buried tip so the head stays in the wound, then bound
                    // to the body: it now follows the animation.
                    mesh.rotateX(0.08 + Math.random() * 0.12);
                    mesh.rotateY((Math.random() - 0.5) * 0.2);
                    const tip = arrow.bone.localToWorld(scratch.tip.copy(arrow.localTip));
                    const axis = scratch.axis.set(0, 0, 1).applyQuaternion(mesh.quaternion);
                    mesh.position.copy(tip).addScaledVector(axis, -ARROW_TIP_OFFSET * ARROW_SCALE);
                    arrow.bone.attach(mesh);
                    arrow.phase = 'lodged';
                    arrow.age = 0;
                }
                continue;
            }
            if (arrow.phase === 'lodged') {
                if (arrow.age < ARROW_STUCK_SECONDS && standing) continue;
                // Falls out of the wound: back into the scene, keeping where it was.
                this.#root.attach(mesh);
                arrow.phase = 'falling';
                arrow.age = 0;
                arrow.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4, (Math.random() - 0.5) * 0.6).addScaledVector(forward, -0.4);
                // Lands lying flat on the sand, pointing any way.
                arrow.rest = scratch.flat.clone().setFromAxisAngle(scratch.up, Math.random() * Math.PI * 2);
                arrow.spin = mesh.quaternion.clone();
                mesh.traverse((node) => {
                    if (node.material) node.material.transparent = true;
                });
                continue;
            }
            if (arrow.phase === 'falling') {
                arrow.velocity.y -= ARROW_GRAVITY * dt;
                mesh.position.addScaledVector(arrow.velocity, dt);
                const ground = 0.02;
                const drop = Math.min(1, arrow.age / 0.45);
                mesh.quaternion.slerpQuaternions(arrow.spin, arrow.rest, drop);
                if (mesh.position.y <= ground) {
                    mesh.position.y = ground;
                    mesh.quaternion.copy(arrow.rest);
                    this.#audio.play('clatter', { at: mesh.position });
                    arrow.phase = 'ground';
                    arrow.age = 0;
                }
                continue;
            }
            // On the sand: lies a moment, then fades away.
            const opacity = 1 - Math.max(0, arrow.age - ARROW_GROUND_SECONDS) / ARROW_FADE_SECONDS;
            mesh.traverse((node) => {
                if (node.material) node.material.opacity = Math.max(0, opacity);
            });
            if (opacity <= 0) {
                mesh.removeFromParent();
                arrow.done = true;
            }
        }
        if (this.#stuck.some((arrow) => arrow.done)) this.#stuck = this.#stuck.filter((arrow) => !arrow.done);
    }

    // --------------------------------------------------------------- projectiles

    #createProjectile(projectile, variant) {
        const THREE = this.#THREE;
        const type = Number(projectile.type);
        const group = new THREE.Group();
        if (type === 1) {
            const core = new THREE.MeshBasicMaterial({ color: 0xffc46a });
            const halo = new THREE.SpriteMaterial({ map: this.#textures.spot, color: 0xff7a22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
            this.#materials.push(core, halo);
            const inner = new THREE.Mesh(this.#geometries.ball, core);
            inner.scale.setScalar(0.16);
            const outer = new THREE.Sprite(halo);
            outer.scale.setScalar(0.9);
            const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.#textures.sparkle, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
            this.#materials.push(flare.material);
            flare.scale.setScalar(0.7);
            group.add(inner, outer, flare);
        }
        else {
            const shaft = new THREE.MeshBasicMaterial({ color: variant === 'assassinate' ? 0x8a1420 : 0xe6d2a1 });
            const tip = new THREE.MeshBasicMaterial({ color: type === 2 ? 0x2fe04a : variant === 'assassinate' ? 0xd01020 : 0xc8ced6 });
            this.#materials.push(shaft, tip);
            const body = new THREE.Mesh(this.#geometries.arrowShaft, shaft);
            const head = new THREE.Mesh(this.#geometries.arrowHead, tip);
            head.position.z = 0.29;
            group.add(body, head);
            group.scale.setScalar(ARROW_SCALE);
        }
        this.#root.add(group);
        return group;
    }

    /**
     * Retargets projectiles to a frame's positions; new ones appear where the engine spawns them.
     *
     * @param {Array<Record<string, unknown>>} projectiles Projectiles in the frame.
     * @param {boolean} snap Place immediately instead of interpolating.
     */
    setProjectiles(projectiles, snap) {
        const seen = new Set();
        for (const projectile of projectiles) {
            const key = `${projectile.type}:${projectile.id}`;
            seen.add(key);
            const x = Number(projectile.x) - ARENA_SIZE / 2;
            const z = Number(projectile.y) - ARENA_SIZE / 2;
            const height = Number(projectile.type) === 1 ? FIREBALL_HEIGHT : ARROW_HEIGHT;
            let entry = this.#projectiles.get(key);
            if (!entry) {
                const variant = this.#variants.get(key);
                entry = { mesh: this.#createProjectile(projectile, variant), variant, trail: 0, from: { x, z }, to: { x, z }, type: Number(projectile.type), height, launch: this.#launches.get(key) ?? null, age: 0 };
                this.#launches.delete(key);
                entry.mesh.position.set(x, height, z);
                this.#projectiles.set(key, entry);
            }
            else if (snap) {
                entry.from = { x, z };
            }
            else {
                entry.from = { x: entry.mesh.position.x, z: entry.mesh.position.z };
            }
            entry.to = { x, z };
            entry.yaw = Math.PI - (Number(projectile.head) * Math.PI) / 180;
            if (!entry.launch) entry.mesh.rotation.set(0, entry.yaw, 0);
        }
        this.#projectiles.forEach((entry, key) => {
            if (seen.has(key)) return;
            entry.mesh.removeFromParent();
            this.#projectiles.delete(key);
        });
    }

    /** Eases a fresh arrow from where it sat on the bow (position and angle) onto its engine path. */
    #blendLaunch(entry, gameDt) {
        const THREE = this.#THREE;
        const scratch = this.#launchScratch ??= { path: new THREE.Vector3(), quaternion: new THREE.Quaternion(), euler: new THREE.Euler() };
        entry.age += gameDt;
        const t = smoothstep(0, LAUNCH_SECONDS, entry.age);
        const { mesh, launch } = entry;
        scratch.quaternion.setFromEuler(scratch.euler.set(0, entry.yaw, 0));
        mesh.position.lerpVectors(launch.position, scratch.path.copy(mesh.position), t);
        mesh.quaternion.slerpQuaternions(launch.quaternion, scratch.quaternion, t);
        if (t >= 1) {
            entry.launch = null;
            mesh.rotation.set(0, entry.yaw, 0);
        }
    }

    // ------------------------------------------------------------------- update

    /**
     * Every effect runs on the fight's clock (`gameDt`: the replay speed, frozen while paused), like the fighters.
     *
     * @param {{ realDt: number, gameDt: number, progress: number, elapsed: number }} frame Frame timing.
     * @param {Iterable<import('./fighter.js').Fighter>} [fighters] Fighters, for the flames on the burning ones.
     */
    update({ gameDt, progress }, fighters = []) {
        this.#clock += gameDt;
        if (this.#timeline.length) {
            const due = this.#timeline.filter((item) => item.at <= this.#clock);
            if (due.length) {
                this.#timeline = this.#timeline.filter((item) => item.at > this.#clock);
                due.forEach((item) => item.callback());
            }
        }

        this.#projectiles.forEach((entry) => {
            entry.mesh.position.x = entry.from.x + (entry.to.x - entry.from.x) * progress;
            entry.mesh.position.z = entry.from.z + (entry.to.z - entry.from.z) * progress;
            entry.mesh.position.y = entry.height;
            if (entry.launch) this.#blendLaunch(entry, gameDt);
            const trail = entry.type === 1
                ? { rate: 70, size: 0.2, life: 0.6, colors: [0xff5b2e, 0xff8a2a, 0xffd27a] }
                : entry.variant === 'assassinate' ? { rate: 90, size: 0.07, life: 0.7, colors: [0x7a0010, 0xb0121f, 0xe01a2c] } : null;
            if (entry.type === 1) entry.mesh.scale.setScalar(1 + Math.sin(this.#clock * 30) * 0.08);
            if (trail && gameDt > 0) {
                entry.trail += gameDt * trail.rate;
                const count = Math.min(6, Math.floor(entry.trail));
                entry.trail -= Math.floor(entry.trail);
                if (count) this.emitSparks(entry.mesh.position, { count, speed: 0.12, size: trail.size, life: trail.life, up: 0.1, gravity: 0, colors: trail.colors });
            }
        });

        for (const spark of this.#particles) {
            const data = spark.userData;
            if (data.life <= 0) continue;
            data.life -= gameDt;
            if (data.life <= 0) { spark.visible = false; continue; }
            data.velocity.y -= data.gravity * gameDt;
            spark.position.addScaledVector(data.velocity, gameDt);
            spark.scale.setScalar(data.size * (0.4 + 0.6 * (data.life / data.maxLife)));
            spark.material.opacity = Math.min(1, (data.life / data.maxLife) * 1.5);
        }
        for (const ring of this.#rings) {
            const data = ring.userData;
            if (data.life <= 0) continue;
            data.life -= gameDt;
            if (data.life <= 0) { ring.visible = false; continue; }
            const t = 1 - data.life / data.maxLife;
            ring.scale.setScalar(data.radius * (1 - (1 - t) ** 2));
            ring.material.opacity = (1 - t) * 0.85;
        }
        for (const decal of this.#decals) {
            const data = decal.userData;
            if (data.life <= 0) continue;
            data.life -= gameDt;
            if (data.life <= 0) { decal.visible = false; continue; }
            const t = 1 - data.life / data.maxLife;
            decal.rotation.y += data.spin * gameDt;
            decal.scale.setScalar(data.radius * (0.6 + 0.4 * Math.min(1, t * 3)));
            decal.material.opacity = Math.min(1, t * 8) * (1 - t) * 0.9;
        }
        for (const pillar of this.#pillars) {
            const data = pillar.userData;
            if (data.life <= 0) continue;
            data.life -= gameDt;
            if (data.life <= 0) { pillar.visible = false; continue; }
            const t = 1 - data.life / data.maxLife;
            const wide = data.mode === 'out' ? 0.25 + t * 0.55 : 0.8 * (1 - t) + 0.1;
            pillar.scale.set(wide, data.height * (data.mode === 'out' ? 1 - t * 0.3 : 0.6 + 0.4 * (1 - t)), wide);
            pillar.material.opacity = (data.mode === 'out' ? 1 - t : Math.min(1, t * 3) * (1 - t * 0.6)) * 0.55;
        }
        this.#blasts.update(gameDt);
        // Flames burn on the fight's clock: faster when the replay is sped up, still while paused.
        this.#updateBurning(fighters, gameDt, this.#clock);
        this.#updateStuckArrows(gameDt);
        for (const slash of this.#slashes) {
            const data = slash.userData;
            if (data.life <= 0) continue;
            data.life -= gameDt;
            if (data.life <= 0) { slash.visible = false; continue; }
            const t = 1 - data.life / data.maxLife;
            slash.scale.setScalar(0.85 + t * 0.4);
            slash.material.opacity = (1 - t) * 0.9;
        }
    }

    /** @returns {Array<Record<string, number|string>>} Live projectile positions for diagnostics. */
    getDebugSnapshot() {
        return [...this.#projectiles.entries()].map(([key, entry]) => ({ key, x: entry.mesh.position.x, z: entry.mesh.position.z }));
    }

    /**
     * Sets burning fighters ablaze: a small fire on each of `BODY_FLAMES`' bones, following the posed body. The flames
     * catch quickly when the burn starts and die down slowly when it ends (or the fighter falls).
     */
    #updateBurning(fighters, dt, elapsed) {
        this.#boneScratch ??= new this.#THREE.Vector3();
        const at = this.#boneScratch;
        for (const fighter of fighters) {
            // An invisible fighter's flames vanish with it.
            const burning = fighter.burning && !(Number(fighter.buffs.invisible?.timeleft) > 0);
            let entry = this.#burning.get(fighter);
            if (!entry) {
                if (!burning) continue;
                entry = { strength: 0, fires: BODY_FLAMES.map(([bone, size]) => ({ bone, size, fire: this.#bodyFires.add({ x: 0, y: 0, z: 0, size: 0 }) })) };
                this.#burning.set(fighter, entry);
            }
            entry.strength = burning
                ? Math.min(1, entry.strength + dt / IGNITE_SECONDS)
                : Math.max(0, entry.strength - dt / DOUSE_SECONDS);
            if (!burning && entry.strength <= 0) {
                entry.fires.forEach(({ fire }) => this.#bodyFires.remove(fire));
                this.#burning.delete(fighter);
                continue;
            }
            for (const { bone, size, fire } of entry.fires) {
                fighter.bonePosition(bone, at);
                // The flames' base sits a little under the bone so they lick up over it.
                fire.x = at.x;
                fire.y = at.y - size * 0.3;
                fire.z = at.z;
                fire.size = size * entry.strength;
            }
        }
        this.#bodyFires.update(elapsed, dt);
    }

    /** Puts out every burning fighter at once (a seek). */
    #douseAll() {
        this.#burning.forEach((entry) => entry.fires.forEach(({ fire }) => this.#bodyFires.remove(fire)));
        this.#burning.clear();
    }

    destroy() {
        this.clear();
        this.#bodyFires.dispose();
        this.#blasts.dispose();
        Object.values(this.#geometries).forEach((geometry) => geometry.dispose());
        this.#materials.forEach((material) => material.dispose());
        this.#scene.remove(this.#root);
    }
}
