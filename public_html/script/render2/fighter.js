import { terrainHeight } from './arena.js';
import { getAppearance } from './palette.js';
import {
    ACTION_BY_ID, ACTION_SPECS, COMBAT_STANCES, ENGINE_RATE, REST, actionDuration, actionWeight, blendPose,
    MELEE_STYLES, TWO_HANDED, applyCombatStance, composePose, engineTiming, gaitForSpeed, locomotionPose, smoothstep, warpedTime,
} from './motion.js';

const ANCHOR_HEIGHT = 1.05;
const SHIELD_TEXTURE = '/assets/synty/special-effects/Textures/PolygonParticles_Hexagon.png';
/** Radius of the block barrier around a fighter, in metres. */
const SHIELD_RADIUS = 0.62;
let shieldTexture = null;
const SPEED_SMOOTHING_SECONDS = 0.3;
const COMBAT_SECONDS = 4;
const COMBAT_ACTIONS = new Set(['melee', 'ranged', 'assassinate', 'charge', 'block', 'fireball']);
const YAW_SMOOTHING_PER_SECOND = 16;
const TURN_RATE = 4;
const TURN_START = 0.6;
const TURN_STOP = 0.08;
const TURN_MAX_SPEED = 0.3;
export const TELEPORT_DISTANCE = 4;
const TELEPORT_ACTION_DISTANCE = 1;
const HIT_HEAT_DECAY = 2;
const MIN_HIT_SCALE = 0.5;
/** Cuts and bruises from melee blows (see `Fighter#wound`). */
const WOUND_POOL = 4;
const WOUND_SECONDS = 2.2;
const WOUND_HEIGHT = 0.58;
const WOUND_SIZE = 0.13;
let woundTexture = null;

/** A cut over a bruise, painted once: two red gashes with dark edges on a purple-brown blotch. */
function drawWoundTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const bruise = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    bruise.addColorStop(0, 'rgba(92, 34, 58, 0.75)');
    bruise.addColorStop(0.6, 'rgba(70, 30, 48, 0.4)');
    bruise.addColorStop(1, 'rgba(60, 30, 40, 0)');
    ctx.fillStyle = bruise;
    ctx.fillRect(0, 0, 64, 64);
    ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[14, 20, 50, 40], [18, 34, 44, 50]]) {
        ctx.strokeStyle = 'rgba(60, 0, 6, 0.9)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(210, 20, 30, 1)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0 + 1, y0);
        ctx.lineTo(x1 - 1, y1);
        ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Stun stars: how many, their orbit radius and size, how high over the head bone, spin rate and burst on recovery. */
const STAR_COUNT = 5;
const STAR_ORBIT = 0.2;
const STAR_SIZE = 0.09;
const STAR_LIFT = 0.2;
const STAR_SPIN = 4.5;
const STAR_BURST_SECONDS = 0.45;
/** Five-pointed star sprite, white-hot at the heart, gold at the points, with a soft glow; shared by all fighters. */
let starTexture = null;

function drawStarTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255, 236, 150, 0.55)');
    glow.addColorStop(1, 'rgba(255, 200, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 ? 9 : 22;
        ctx.lineTo(32 + Math.cos(angle) * radius, 32 + Math.sin(angle) * radius);
    }
    ctx.closePath();
    const fill = ctx.createRadialGradient(32, 32, 0, 32, 32, 22);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.45, '#fff2a0');
    fill.addColorStop(1, '#f2b318');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(170, 100, 0, 0.8)';
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Attack speed the end-of-charge swing is paced at: a fast blow, carried by the rush. */
const CHARGE_STRIKE_RATE = 2.5;
const TELEPORT_DELAY = 0.5;
const FLINCH_SECONDS = 0.28;
const MAX_HOLD_SECONDS = 1;
/** Engine action id while a gladiator is still locked in the action it started (see battle-state.js ACTIONS). */
const WAITING = 9;
const DEATH_SECONDS = 0.55;
const TWO_PI = Math.PI * 2;

/** Shortest signed angle from `from` to `to`. */
function angleDelta(from, to) {
    return ((to - from) % TWO_PI + TWO_PI * 1.5) % TWO_PI - Math.PI;
}

/**
 * One gladiator. It owns interpolation between replay frames, distance-driven gait, timed combat
 * actions, flinch, death and status visuals, and drives the body model (`SyntyModel`)
 * with the poses computed in motion.js.
 */
export class Fighter {
    #THREE;
    #parts = {};
    #model;
    #effectGeometries = [];
    #effectMaterials = [];
    #appearance;
    #from = { x: 0, z: 0 };
    #to = { x: 0, z: 0, yaw: 0 };
    #yaw = 0;
    #speed = 0;
    #moveWeight = 0;
    #combat = 0;
    #swings = 0;
    #forward = 0;
    #strafe = 0;
    #back = 0;
    #lateral = 0;
    #phase = 0;
    #clock = 0;
    #gameElapsed = 0;
    #action = null;
    /** Motion forced by a seek (the replay is paused between steps), until playback moves again. */
    #hold = null;
    #flinch = 0;
    #wounds = [];
    #nextWound = 0;
    /** Whether the fighter stands in the poison gas (set by the renderer each frame from the safe radius). */
    poisoned = false;
    #turning = 0;
    #jumpDelay = 0;
    #teleport = null;
    #hitHeat = 0;
    #hitScale = 1;
    /** Where the last blow came from, relative to the facing (0 ahead, +π/2 on the left). */
    #hitAngle = 0;
    #actionBlend = 0;
    #actionStyle = null;
    #moved = 0;
    #gameDt = 0;
    #weapon = 'melee';
    #dead = 0;
    #alive = true;
    #frozen = null;
    /** Stun stars: shown 0..1, burst progress 0..1 after the stun ends, and a scratch vector for the head. */
    #starLevel = 0;
    #starBurst = 0;
    #starAt = null;
    #basePose = { ...REST };
    #locoPose = { ...REST };
    #finalPose = { ...REST };
    #idlePose = { ...REST };
    #keyPose = { ...REST };
    #activeSpec = null;
    #anchor;

    /**
     * @param {{ THREE: typeof import('three'), gladiator: Record<string, unknown>, index: number, shadowTexture: import('three').Texture, colors?: Map<string, number> }} options Fighter dependencies.
     */
    constructor({ THREE, gladiator, index, shadowTexture, colors, createModel }) {
        this.#THREE = THREE;
        this.index = index;
        this.state = gladiator;
        this.#appearance = getAppearance(gladiator.skin, index, colors);
        this.#anchor = new THREE.Vector3();
        this.root = new THREE.Group();
        this.root.name = `gladiator-${index}`;
        this.#model = createModel({ THREE, look: this.#appearance, index });
        this.#build(shadowTexture);
    }

    /** @returns {{ female: boolean }} Traits, used for voice selection. */
    get appearance() {
        return this.#appearance;
    }

    /** @returns {{ x: number, z: number, yaw: number, speed: number, phase: number, action: string|null }} Debug values. */
    get debug() {
        return {
            x: this.root.position.x,
            z: this.root.position.z,
            yaw: this.#yaw,
            speed: this.#speed,
            phase: this.#phase,
            action: this.#action?.name ?? null,
            weapon: this.#weapon,
        };
    }

    /** @returns {number} World-space Y of the head anchor used for labels. */
    static get anchorHeight() {
        return ANCHOR_HEIGHT;
    }

    // ---------------------------------------------------------------- building
    // ---------------------------------------------------------------- effects

    #effectMaterial(material) {
        this.#effectMaterials.push(material);
        return material;
    }

    #ball(radius, material) {
        const geometry = new this.#THREE.SphereGeometry(radius, 8, 6);
        this.#effectGeometries.push(geometry);
        return new this.#THREE.Mesh(geometry, material);
    }

    #effectGeometry(factory) {
        const geometry = factory();
        this.#effectGeometries.push(geometry);
        return geometry;
    }

    #buildOrb() {
        const THREE = this.#THREE;
        const core = this.#effectMaterial(new THREE.MeshLambertMaterial({ color: 0xffd27a, emissive: 0xff7a1a, flatShading: true }));
        const glow = this.#effectMaterial(new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.35, depthWrite: false }));
        const orb = new THREE.Group();
        orb.add(this.#ball(0.16, core), this.#ball(0.26, glow));
        return orb;
    }

    /**
     * Block barrier: an energy dome around the fighter. The shell is bright at its rim and nearly clear face-on
     * (fresnel), carries a hexagon lattice (the Synty particle hexagon, tiled over the dome) that drifts upward and
     * shimmers, and ripples out from the front when a blow lands on it; a glowing ring marks where it meets the ground.
     */
    #buildShield() {
        const THREE = this.#THREE;
        if (!shieldTexture) {
            shieldTexture = new THREE.TextureLoader().load(SHIELD_TEXTURE);
            shieldTexture.wrapS = THREE.RepeatWrapping;
            shieldTexture.wrapT = THREE.RepeatWrapping;
        }
        const uniforms = {
            hexes: { value: shieldTexture },
            time: { value: 0 },
            strength: { value: 1 },
            impact: { value: 0 },
            tint: { value: new THREE.Color(0x2fa8ff) },
        };
        const dome = new THREE.Mesh(
            this.#effectGeometry(() => new THREE.SphereGeometry(SHIELD_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56)),
            this.#effectMaterial(new THREE.ShaderMaterial({
                uniforms,
                vertexShader: `
                    varying vec3 vNormalView; varying vec3 vViewDir; varying vec2 vUv; varying vec3 vLocal;
                    void main() {
                        vec4 view = modelViewMatrix * vec4(position, 1.0);
                        vNormalView = normalize(normalMatrix * normal);
                        vViewDir = normalize(-view.xyz);
                        vUv = uv; vLocal = position;
                        gl_Position = projectionMatrix * view;
                    }`,
                fragmentShader: `
                    uniform sampler2D hexes; uniform float time; uniform float strength; uniform float impact; uniform vec3 tint;
                    varying vec3 vNormalView; varying vec3 vViewDir; varying vec2 vUv; varying vec3 vLocal;
                    void main() {
                        float facing = abs(dot(normalize(vNormalView), normalize(vViewDir)));
                        float rim = pow(1.0 - facing, 2.2);
                        vec2 tile = vec2(vUv.x * 10.0, vUv.y * 4.0 - time * 0.25);
                        vec4 hex = texture2D(hexes, tile);
                        float cell = hex.r * hex.a;
                        float shimmer = 0.5 + 0.5 * sin(time * 3.0 + vUv.x * 40.0 + vUv.y * 17.0);
                        // A ripple running back from the front (+z) after a blow.
                        float fromFront = acos(clamp(normalize(vLocal).z, -1.0, 1.0));
                        float ripple = impact * smoothstep(0.35, 0.0, abs(fromFront - (1.0 - impact) * 3.0));
                        // Fades in toward the ground so the dome reads as resting on it.
                        float base = smoothstep(0.0, 0.12, vLocal.y + 0.02);
                        // Strongest straight ahead of the fighter (+z), fading round to a faint minimum at the back.
                        float ahead = smoothstep(-0.7, 0.9, normalize(vLocal).z);
                        float facingWeight = mix(0.14, 1.35, ahead * ahead);
                        float alpha = (0.02 + rim * 0.5 + cell * (0.18 + 0.22 * shimmer) * (0.5 + rim) + ripple * 0.8 + impact * 0.12) * strength * base * facingWeight;
                        vec3 color = mix(tint, vec3(0.85, 0.96, 1.0), clamp(rim * 0.3 + ripple, 0.0, 1.0));
                        gl_FragColor = vec4(color, alpha);
                    }`,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
            })),
        );
        // Taller than wide, so the dome clears the fighter's head.
        dome.scale.y = 1.7;
        dome.renderOrder = 15;
        // The ground ring is an arc round the front only (after the rotation, ring angle 1.5π points ahead, +z).
        const ground = new THREE.Mesh(
            this.#effectGeometry(() => new THREE.RingGeometry(SHIELD_RADIUS * 0.82, SHIELD_RADIUS * 1.08, 40, 1, Math.PI * 0.9, Math.PI * 1.2).rotateX(-Math.PI / 2)),
            this.#effectMaterial(new THREE.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })),
        );
        ground.position.y = 0.03;
        const shield = new THREE.Group();
        shield.add(dome, ground);
        Object.assign(shield.userData, { uniforms, ground, impact: 0 });
        return shield;
    }

    #build(shadowTexture) {
        const THREE = this.#THREE;
        const look = this.#appearance;

        const shadow = new THREE.Mesh(
            this.#effectGeometry(() => new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2)),
            this.#effectMaterial(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.7 })),
        );
        shadow.position.y = 0.012;
        shadow.renderOrder = 1;
        this.root.add(shadow);

        const ring = new THREE.Mesh(
            this.#effectGeometry(() => new THREE.RingGeometry(0.42, 0.5, 24).rotateX(-Math.PI / 2)),
            this.#effectMaterial(new THREE.MeshBasicMaterial({ color: look.team, transparent: true, opacity: 0.85, depthWrite: false })),
        );
        ring.position.y = 0.02;
        ring.renderOrder = 2;
        this.root.add(ring);

        const { figure, mounts } = this.#model;
        this.root.add(figure);
        const orb = this.#buildOrb();
        orb.position.set(0, 0.62, 0.5);
        mounts.torso.add(orb);
        // The barrier stands on the ground around the fighter, not on the swaying torso.
        const shield = this.#buildShield();
        this.root.add(shield);

        // Stun stars ride a faint golden ring over the head (placed on the head bone each frame, see `#animateStars`).
        const stars = new THREE.Group();
        starTexture ??= drawStarTexture(THREE);
        for (let i = 0; i < STAR_COUNT; i += 1) {
            const star = new THREE.Sprite(this.#effectMaterial(new THREE.SpriteMaterial({ map: starTexture, transparent: true, depthWrite: false })));
            star.userData.angle = (i / STAR_COUNT) * TWO_PI;
            stars.add(star);
        }
        const trail = new THREE.Mesh(
            this.#effectGeometry(() => new THREE.RingGeometry(STAR_ORBIT - 0.012, STAR_ORBIT + 0.012, 40).rotateX(-Math.PI / 2)),
            this.#effectMaterial(new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })),
        );
        stars.userData.trail = trail;
        stars.add(trail);
        stars.visible = false;
        this.root.add(stars);
        this.#parts = { shadow, ring, orb, shield, stars };
        this.#syncWeapons(null);
    }

    // --------------------------------------------------------------- replay input

    /**
     * Starts a new interpolation segment toward a replay frame.
     *
     * @param {Record<string, unknown>} gladiator Engine state for this fighter.
     * @param {{ x: number, z: number }} position Target world position.
     * @param {number} yaw Target yaw in radians.
     * @param {boolean} snap Jump straight there (first frame, seek, teleport).
     */
    setTarget(gladiator, position, yaw, snap) {
        this.state = gladiator;
        if (!snap) this.#hold = null;
        const current = this.root.position;
        const distance = Math.hypot(position.x - current.x, position.z - current.z);
        const far = distance > TELEPORT_DISTANCE || (this.#action?.name === 'teleport' && distance > TELEPORT_ACTION_DISTANCE);
        this.#to.x = position.x;
        this.#to.z = position.z;
        this.#to.yaw = yaw;
        if (snap) {
            this.#jumpDelay = 0;
            this.#from.x = position.x;
            this.#from.z = position.z;
            current.set(position.x, 0, position.z);
            this.#yaw = yaw;
            this.#speed = 0;
        }
        // A teleport keeps the fighter at the origin while the portal lights up, then jumps.
        else if (far || this.#jumpDelay > 0) {
            if (this.#jumpDelay <= 0) {
                this.#jumpDelay = TELEPORT_DELAY;
                this.#teleport = { from: { x: current.x, z: current.z }, to: { x: position.x, z: position.z } };
            }
        }
        else {
            this.#from.x = current.x;
            this.#from.z = current.z;
        }
    }

    /** Clears transient animation state after a seek. */
    reset() {
        this.#wounds.forEach((mark) => { mark.visible = false; });
        this.#action = null;
        this.#flinch = 0;
        this.#hitHeat = 0;
        this.#teleport = null;
        this.#jumpDelay = 0;
        this.#actionBlend = 0;
        this.#speed = 0;
        this.#moveWeight = 0;
        this.#combat = 0;
        this.#forward = 0;
        this.#lateral = 0;
        this.#hold = null;
    }

    /**
     * Poses a fighter that a seek landed on mid-action.
     *
     * @param {number} age Seconds since the running action began.
     */
    seekAction(age) {
        if (this.#action) this.#action.start = this.#clock - age;
    }

    /**
     * Holds the walking pose a seek landed on: the replay is paused, so there is no movement to derive it from.
     *
     * @param {{ dx: number, dz: number, seconds: number, travelled: number }} motion Displacement over `seconds` around the seek point, and distance walked since the start.
     */
    seekMotion({ dx, dz, seconds, travelled }) {
        const speed = Math.hypot(dx, dz) / seconds;
        const sin = Math.sin(this.#to.yaw);
        const cos = Math.cos(this.#to.yaw);
        const gait = gaitForSpeed(speed);
        this.#hold = {
            speed,
            forward: (dx * sin + dz * cos) / seconds,
            lateral: (dx * cos - dz * sin) / seconds,
            phase: (travelled / gait.cycleLength) % 1,
        };
        this.#speed = speed;
        this.#forward = this.#hold.forward;
        this.#lateral = this.#hold.lateral;
        this.#phase = this.#hold.phase;
        this.#moveWeight = smoothstep(0.12, 0.45, speed);
    }

    /**
     * Begins the animation of an engine action id.
     *
     * @param {number} actionId Engine action id.
     */
    startAction(actionId) {
        const name = ACTION_BY_ID[actionId];
        if (!name) {
            // The engine reports an action on its first step only and "waiting" for the rest of the cycle:
            // an action paced by the engine keeps playing through it (it ends on its own clock).
            if (actionId === WAITING && this.#action?.timing) return;
            this.releaseAction();
            return;
        }
        // Every report of a timed action is a new attack or cast; a sustained one is just still going.
        if (this.#action?.name === name && this.#action.spec.hold) return;
        let spec = ACTION_SPECS[name];
        let style = name;
        if (name === 'melee') {
            const styles = MELEE_STYLES[this.#appearance.weapon] ?? MELEE_STYLES.sword;
            style = styles[this.#swings % styles.length];
            spec = ACTION_SPECS[style];
            this.#swings += 1;
        }
        if (name === 'melee') this.#weapon = 'melee';
        else if (spec.weapon === 'bow') this.#weapon = 'bow';
        if (COMBAT_ACTIONS.has(name)) this.#combat = COMBAT_SECONDS;
        const rate = ENGINE_RATE[name] ? Number(this.state?.[ENGINE_RATE[name]]) : NaN;
        this.#action = { name, style, spec, start: this.#clock, releasedAt: null, firedAt: null, timing: engineTiming(spec, rate) };
    }

    /**
     * The blow that ends a charge: the engine moves the charger to its target and deals melee damage on arrival,
     * reporting no attack of its own, so the rush turns into a quick swing that connects right away.
     *
     * @returns {number} Game seconds until the swing connects.
     */
    chargeStrike() {
        const styles = MELEE_STYLES[this.#appearance.weapon] ?? MELEE_STYLES.sword;
        const style = styles[this.#swings % styles.length];
        this.#swings += 1;
        const spec = ACTION_SPECS[style];
        this.#weapon = 'melee';
        this.#combat = COMBAT_SECONDS;
        this.#action = { name: 'melee', style, spec, start: this.#clock, releasedAt: null, firedAt: null, timing: engineTiming(spec, CHARGE_STRIKE_RATE) };
        return this.#untilContact(this.#action);
    }

    /** @returns {boolean} Whether a drawn bow or charged spell is waiting for its projectile (not released yet). */
    get shotPending() {
        const action = this.#action;
        return Boolean(action && action.spec.holdAt !== undefined && action.firedAt === null);
    }

    /** Releases a drawn bow or a charged spell when the engine reports the projectile. */
    fire() {
        const action = this.#action;
        if (action?.spec.holdAt === undefined || action.firedAt !== null) return;
        action.firedAt = Math.max(this.#clock, action.start + action.spec.holdAt);
    }

    /**
     * Action time on the spec's own clock. Engine-paced actions are warped onto the engine cycle
     * (motion.js `engineTiming`); wind-ups with `holdAt` wait at full draw for `fire()`.
     */
    #actionTime(action) {
        const raw = this.#clock - action.start;
        const { spec, timing } = action;
        const holdAt = spec.holdAt;
        if (timing && !spec.hold) {
            let release = timing.windup;
            if (holdAt !== undefined) {
                if (action.firedAt === null && raw > timing.windup + MAX_HOLD_SECONDS) action.firedAt = this.#clock;
                if (action.firedAt === null) return Math.min(holdAt, warpedTime(spec, timing, raw, Infinity));
                release = action.firedAt - action.start;
            }
            return warpedTime(spec, timing, raw, release);
        }
        if (holdAt === undefined || raw < holdAt) return raw;
        if (action.firedAt === null && raw > holdAt + MAX_HOLD_SECONDS) action.firedAt = this.#clock;
        return action.firedAt === null ? holdAt : holdAt + Math.max(0, this.#clock - action.firedAt);
    }

    /** Game seconds until the action's blow or shot leaves the fighter (0 once it has). */
    #untilContact(action) {
        const raw = this.#clock - action.start;
        if (action.timing) return Math.max(0, (action.firedAt === null ? action.timing.windup : action.firedAt - action.start) - raw);
        return Math.max(0, (action.spec.contact ?? 0) - this.#actionTime(action));
    }

    /** Ends a sustained action (block, charge) so it eases out. */
    releaseAction() {
        const action = this.#action;
        if (action?.spec.hold && action.releasedAt === null) action.releasedAt = this.#clock - action.start;
        else if (action && !action.spec.hold) this.#action = null;
    }

    /** @returns {{ position: import('three').Vector3, quaternion: import('three').Quaternion }|null} World pose of the fireball grown between the hands, for the flying fireball to start from. */
    get castOrb() {
        const orb = this.#parts.orb;
        if (!orb?.visible || orb.scale.x < 0.05) return null;
        orb.updateWorldMatrix(true, false);
        return { position: orb.getWorldPosition(new this.#THREE.Vector3()), quaternion: new this.#THREE.Quaternion() };
    }

    /** @returns {{ position: import('three').Vector3, quaternion: import('three').Quaternion }|null} World pose of the arrow on the string, for the flying arrow to start from. */
    get nockedArrow() {
        return this.#model.nockedArrow?.() ?? null;
    }

    /** @returns {{ name: string, spec: object, age: number, untilContact: number }|null} The running action, its age on the spec clock and the game seconds left before it connects. */
    get activeAction() {
        const action = this.#action;
        return action ? { name: action.name, spec: action.spec, age: this.#actionTime(action), untilContact: this.#untilContact(action) } : null;
    }

    /** @returns {{ from: {x: number, z: number}, to: {x: number, z: number} }|null} The teleport that just began, once. */
    takeTeleport() {
        const teleport = this.#teleport;
        this.#teleport = null;
        return teleport;
    }

    /**
     * Marks a melee blow on the body: a fresh cut over a bruise where the blow meets the body (found by casting from
     * the attacker's side onto the posed mesh), bound to the nearest bone so it follows the animation. It shows at
     * once, darkens and fades over a couple of seconds. A few marks per fighter are recycled.
     *
     * @param {{ x: number, z: number }} from World position of the attacker.
     */
    wound(from) {
        if (!this.#alive) return;
        const THREE = this.#THREE;
        if (!this.#wounds.length) {
            woundTexture ??= drawWoundTexture(THREE);
            const geometry = this.#effectGeometry(() => new THREE.PlaneGeometry(WOUND_SIZE, WOUND_SIZE));
            for (let i = 0; i < WOUND_POOL; i += 1) {
                const material = this.#effectMaterial(new THREE.MeshBasicMaterial({
                    map: woundTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
                }));
                const mark = new THREE.Mesh(geometry, material);
                mark.visible = false;
                mark.userData.life = 0;
                this.root.add(mark);
                this.#wounds.push(mark);
            }
        }
        const centre = new THREE.Vector3(this.root.position.x, WOUND_HEIGHT + (Math.random() - 0.5) * 0.16, this.root.position.z);
        const toward = new THREE.Vector3(from.x - centre.x, 0, from.z - centre.z);
        if (toward.lengthSq() < 1e-6) toward.set(Math.sin(this.#yaw), 0, Math.cos(this.#yaw));
        // A little scatter round the side facing the attacker.
        toward.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.8);
        const hit = this.#model.bodyHit?.(centre.clone().addScaledVector(toward, 1), toward.clone().negate(), 1.2);
        if (!hit) return;
        const mark = this.#wounds[this.#nextWound];
        this.#nextWound = (this.#nextWound + 1) % this.#wounds.length;
        // Placed in world space facing out of the surface, then handed to the bone.
        const outward = hit.normal && hit.normal.dot(toward) > 0 ? hit.normal : toward;
        mark.removeFromParent();
        mark.position.copy(hit.point).addScaledVector(outward, 0.004);
        mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI * 2));
        mark.scale.setScalar(0.8 + Math.random() * 0.5);
        mark.updateMatrix();
        hit.bone.attach(mark);
        mark.userData.life = WOUND_SECONDS;
        mark.visible = true;
    }

    #animateWounds(dt) {
        for (const mark of this.#wounds) {
            if (!mark.visible) continue;
            mark.userData.life -= dt;
            const left = mark.userData.life / WOUND_SECONDS;
            if (left <= 0 || !this.#alive) {
                mark.visible = false;
                continue;
            }
            // Bright and wet at first, then darker as it fades away.
            mark.material.opacity = Math.min(1, left * 2.5);
            mark.material.color.setScalar(0.65 + 0.35 * left);
        }
    }

    /** @see SyntyModel#bodyHit: where a world-space ray meets this fighter's posed body, and the bone there. */
    bodyHit(origin, direction, far) {
        return this.#alive ? this.#model.bodyHit?.(origin, direction, far) ?? null : null;
    }

    /**
     * Triggers the recoil and red flash of a landed hit; the body reels away from where the blow came from.
     *
     * @param {{ x: number, z: number }|null} [from] World point the blow came from (attacker, or the projectile's path).
     */
    hit(from = null) {
        // A blow on a raised barrier ripples across it.
        if (this.#parts.shield?.visible) this.#parts.shield.userData.impact = 1;
        // A fresh hit must not restart a flinch that is still playing (burn ticks, multi-hits).
        if (this.#flinch > 0.4) return;
        // Repeated hits in a short span are dampened so the fighter is not locked in the recoil, but every
        // blow still visibly lands.
        this.#hitScale = Math.max(MIN_HIT_SCALE, 1 / (1 + this.#hitHeat * 0.6));
        this.#hitHeat += 1;
        this.#flinch = 1;
        this.#combat = COMBAT_SECONDS;
        const at = this.root.position;
        this.#hitAngle = from && Math.hypot(from.x - at.x, from.z - at.z) > 1e-3
            ? angleDelta(this.#yaw, Math.atan2(from.x - at.x, from.z - at.z))
            : 0;
    }

    /** @param {boolean} alive Whether the fighter is standing. */
    setAlive(alive, snap = false) {
        this.#alive = alive;
        if (!alive) this.#action = null;
        if (snap) this.#dead = alive ? 0 : 1;
    }

    /**
     * Freezes the rig on a single action moment for visual debugging.
     *
     * @param {string|null} name Action name from ACTION_SPECS, or null to resume.
     * @param {number} [time] Seconds into the action.
     */
    freezeAction(name, time = 0) {
        this.#frozen = name ? { name, time } : null;
    }

    // ------------------------------------------------------------------ per frame

    /**
     * Advances the fighter.
     *
     * @param {{ realDt: number, gameDt: number, progress: number, elapsed: number, reducedMotion: boolean }} frame Frame timing.
     */
    update({ realDt, gameDt, progress, elapsed, reducedMotion }) {
        const isPaused = gameDt === 0;
        if (!isPaused) {
            this.#clock += gameDt;
            this.#gameElapsed += gameDt;
        }
        const position = this.root.position;
        const previousX = position.x;
        const previousZ = position.z;
        if (this.#jumpDelay > 0) {
            if (!isPaused) this.#jumpDelay -= gameDt;
            if (this.#jumpDelay <= 0) {
                this.#jumpDelay = 0;
                this.#from.x = this.#to.x;
                this.#from.z = this.#to.z;
                this.#yaw = this.#to.yaw;
                this.#speed = 0;
                position.x = this.#to.x;
                position.z = this.#to.z;
            }
        }
        else {
            position.x = this.#from.x + (this.#to.x - this.#from.x) * progress;
            position.z = this.#from.z + (this.#to.z - this.#from.z) * progress;
        }
        position.y = terrainHeight(position.x, position.z);
        const yawError = angleDelta(this.#yaw, this.#to.yaw);
        const standing = this.#alive && this.#speed < TURN_MAX_SPEED;
        const abs = Math.abs(yawError);
        // Turning in place at a steady rate, so the model can play its turn clip; otherwise follow quickly.
        if (!standing || abs < TURN_STOP) this.#turning = 0;
        else if (abs > TURN_START) this.#turning = Math.sign(yawError);
        if (!isPaused) {
            if (this.#turning) this.#yaw += Math.sign(yawError) * Math.min(abs, TURN_RATE * gameDt);
            else this.#yaw += yawError * (1 - Math.exp(-YAW_SMOOTHING_PER_SECOND * gameDt));
        }
        this.root.rotation.y = this.#yaw;

        this.#gameDt = gameDt;
        if (!isPaused) {
            const moved = this.#alive ? Math.hypot(position.x - previousX, position.z - previousZ) : 0;
            const instantSpeed = gameDt > 0 ? moved / gameDt : 0;
            this.#speed += (instantSpeed - this.#speed) * (1 - Math.exp(-gameDt / SPEED_SMOOTHING_SECONDS));
            if (this.#hold) this.#speed = this.#hold.speed;
            const gait = gaitForSpeed(this.#speed);
            const sin = Math.sin(this.#to.yaw);
            const cos = Math.cos(this.#to.yaw);
            const dx = position.x - previousX;
            const dz = position.z - previousZ;
            const follow = gameDt > 0 ? 1 - Math.exp(-gameDt / SPEED_SMOOTHING_SECONDS) : 0;
            this.#forward += ((this.#alive && gameDt > 0 ? (dx * sin + dz * cos) / gameDt : 0) - this.#forward) * follow;
            this.#lateral += ((this.#alive && gameDt > 0 ? (dx * cos - dz * sin) / gameDt : 0) - this.#lateral) * follow;
            if (this.#hold) {
                this.#forward = this.#hold.forward;
                this.#lateral = this.#hold.lateral;
            }
            const travel = Math.abs(this.#forward) + Math.abs(this.#lateral);
            const share = travel > 0.2 ? this.#lateral / travel : 0;
            this.#strafe = smoothstep(0.3, 0.7, Math.abs(share)) * Math.sign(share);
            this.#back = travel > 0.2 ? smoothstep(0.1, 0.6, -this.#forward / travel) * (1 - Math.abs(this.#strafe)) : 0;
            this.#combat = Math.max(0, this.#combat - gameDt);
            if (this.#speed > 0.05) this.#phase = (this.#phase + (this.#back > 0.5 ? -moved : moved) / gait.cycleLength + 1) % 1;
            const moveTarget = smoothstep(0.12, 0.45, this.#speed);
            this.#moved = moved;
            this.#moveWeight += (moveTarget - this.#moveWeight) * (1 - Math.exp(-gameDt * 7));
            if (this.#hold) {
                this.#phase = this.#hold.phase;
                this.#moveWeight = moveTarget;
            }
        }
        else if (this.#hold) {
            this.#speed = this.#hold.speed;
            this.#forward = this.#hold.forward;
            this.#lateral = this.#hold.lateral;
            this.#phase = this.#hold.phase;
            this.#moveWeight = smoothstep(0.12, 0.45, this.#speed);
        }

        const gait = gaitForSpeed(this.#speed);
        const poseElapsed = this.#gameElapsed;
        this.#composePose(gait, poseElapsed, gameDt);
        this.#applyPose(this.#finalPose, poseElapsed, reducedMotion, isPaused);
        this.#animateDeath(isPaused ? 0 : gameDt);
        this.#animateOrb();
        this.#animateShield(poseElapsed);
        this.#animateStatus(poseElapsed, isPaused ? 0 : gameDt);
        this.#animateWounds(isPaused ? 0 : gameDt);
    }

    #composePose(gait, elapsed, gameDt) {
        const idle = this.#idlePose;
        Object.assign(idle, REST);
        idle.lean += Math.sin(elapsed * 1.7 + this.index) * 0.012;
        idle.lsh += Math.sin(elapsed * 1.7 + this.index + 1) * 0.02;
        locomotionPose(this.#locoPose, this.#phase, gait.amplitude * (1 - 0.25 * this.#back), gait.run * (1 - 0.6 * this.#back), this.#strafe, this.#back);
        blendPose(this.#basePose, idle, this.#locoPose, this.#moveWeight);
        applyCombatStance(this.#basePose, this.#stance(), smoothstep(0, 0.6, this.#combat), this.#moveWeight);

        let action = this.#action;
        let time = action ? this.#actionTime(action) : 0;
        if (this.#frozen) {
            action = { name: this.#frozen.name, style: this.#frozen.name, spec: ACTION_SPECS[this.#frozen.name], releasedAt: null };
            time = this.#frozen.time;
        }
        // A block is reported once; the guard comes down when its engine cycle is over.
        if (action?.spec.hold && action.timing && action.releasedAt === null && !this.#frozen && time >= action.timing.cycle) action.releasedAt = time;
        if (action && !this.#frozen && time > actionDuration(action.spec) + 0.05) {
            this.#action = null;
            action = null;
        }
        else if (action && action.releasedAt !== null && time > action.releasedAt + action.spec.blendOut) {
            this.#action = null;
            action = null;
        }
        this.#activeSpec = action?.spec ?? null;
        this.#actionBlend = action ? actionWeight(action.spec, time, action.releasedAt ?? null) : 0;
        composePose(this.#finalPose, this.#basePose, action?.spec ?? null, time, action?.releasedAt ?? null, this.#keyPose);
        this.#syncWeapons(action?.spec ?? null);
        this.#actionStyle = action ? { style: action.style, time, blend: this.#actionBlend, contact: action.spec.contact ?? 0, fired: action.firedAt != null } : null;
        this.#flinch = Math.max(0, this.#flinch - gameDt / FLINCH_SECONDS);
        this.#hitHeat = Math.max(0, this.#hitHeat - gameDt * HIT_HEAT_DECAY);
    }

    /** Guard pose matching the carried gear: bow, two-handed weapon, or one-handed weapon. */
    #stance() {
        if (this.#weapon === 'bow') return COMBAT_STANCES.bow;
        return TWO_HANDED.includes(this.#appearance.weapon) ? COMBAT_STANCES.twoHand : COMBAT_STANCES.oneHand;
    }

    #applyPose(p, elapsed, reducedMotion, isPaused = false) {
        // Recoil fades in fast and out smoothly, and yields to an action's own body motion.
        const attack = Math.min(1, (1 - this.#flinch) / 0.2);
        const recoil = attack * smoothstep(0, 0.6, this.#flinch) * this.#hitScale;
        this.#model.applyPose(p, {
            armRecoil: recoil * (1 - this.#actionBlend),
            bodyRecoil: recoil * (1 - 0.6 * this.#actionBlend),
            stunned: Number(this.state.buffs?.stun?.timeleft) > 0 && this.#alive,
            aim: this.#activeSpec?.shot ? this.#actionBlend : 0,
            elapsed,
            speed: this.#speed,
            reducedMotion,
            motion: {
                dt: isPaused ? 0 : this.#gameDt,
                travel: isPaused ? 0 : this.#speed * this.#gameDt,
                phase: this.#phase,
                speed: this.#speed,
                forward: this.#forward,
                lateral: this.#lateral,
                moveWeight: this.#moveWeight,
                combat: smoothstep(0, 0.6, this.#combat),
                action: this.#actionStyle,
                flinch: this.#flinch,
                hitScale: this.#hitScale,
                hitAngle: this.#hitAngle,
                turn: this.#turning ? angleDelta(this.#yaw, this.#to.yaw) : 0,
                stunned: Number(this.state.buffs?.stun?.timeleft) > 0 && this.#alive,
                dead: this.#dead,
            },
        });
    }

    #syncWeapons(spec) {
        this.#model.setWeapons(this.#weapon, spec?.weapon ?? null);
        const orb = this.#parts.orb;
        if (orb) orb.visible = spec?.weapon === 'orb';
    }

    #animateDeath(realDt) {
        const target = this.#alive ? 0 : 1;
        this.#dead += Math.sign(target - this.#dead) * Math.min(Math.abs(target - this.#dead), realDt / (this.#model.deathSeconds ?? DEATH_SECONDS));
        const eased = smoothstep(0, 1, this.#dead);
        this.#parts.shadow.scale.setScalar(1 + eased * 0.3);
        this.#parts.ring.visible = this.#dead < 0.9;
    }

    /** Pops the shield in when a block starts and pulses it while held. */
    #animateShield(elapsed) {
        const shield = this.#parts.shield;
        const left = Number(this.state.buffs?.resist?.timeleft) || 0;
        // The shield stays up while the resist buff lasts, not only during the block action.
        shield.visible = this.#alive && (left > 0 || this.#activeSpec?.weapon === 'shield');
        if (!shield.visible) return;
        const blocking = this.#activeSpec?.weapon === 'shield';
        const time = this.#frozen ? this.#frozen.time : (blocking && this.#action ? this.#actionTime(this.#action) : 1);
        const fade = blocking || !left ? 1 : Math.min(1, left / 0.5);
        // Springs up with a slight overshoot, breathes while it lasts, and is brighter while actively blocking.
        const rise = smoothstep(0, 0.22, time);
        const pop = rise * (1 + Math.sin(Math.min(1, time / 0.3) * Math.PI) * 0.12);
        shield.scale.set(pop, Math.max(0.01, pop), pop);
        const { uniforms, ground } = shield.userData;
        shield.userData.impact = Math.max(0, shield.userData.impact - 1 / 30);
        uniforms.time.value = elapsed;
        uniforms.impact.value = shield.userData.impact;
        uniforms.strength.value = fade * (blocking ? 1 : 0.6) * (0.9 + Math.sin(elapsed * 4) * 0.1);
        ground.material.opacity = 0.3 * fade * rise;
    }

    /** Grows the fireball between the hands until the cast is released. */
    #animateOrb() {
        const orb = this.#parts.orb;
        if (!orb.visible) return;
        const spec = this.#activeSpec;
        const time = this.#frozen ? this.#frozen.time : (this.#action ? this.#actionTime(this.#action) : 0);
        const release = spec?.contact ?? 0.5;
        // The orb leaves the hands the moment the engine launches the fireball (`fire()`), which flies on from there.
        const charge = this.#action?.firedAt != null && !this.#frozen ? 0 : smoothstep(0.05, 0.4, time) * (1 - smoothstep(release, release + 0.06, time));
        orb.scale.setScalar(Math.max(0.001, charge));
    }

    #animateStatus(elapsed, realDt) {
        const buffs = this.state.buffs ?? {};
        const invisible = Number(buffs.invisible?.timeleft) > 0;
        const stunned = Number(buffs.stun?.timeleft) > 0 && this.#alive;
        const burning = Number(buffs.burn?.timeleft) > 0 && this.#alive;

        this.#animateStars(stunned, elapsed, realDt);

        const ambushing = this.#action?.name === 'ambush' || this.#frozen?.name === 'ambush';
        const opacity = invisible || ambushing ? 0.06 : 1;
        const burn = burning ? 0.35 + Math.sin(elapsed * 14) * 0.15 : 0;
        // Standing in the gas: a sickly green glow that throbs slower than the burn.
        const poison = this.poisoned && this.#alive ? 0.13 + Math.sin(elapsed * 5) * 0.06 : 0;
        this.#model.setLook({ opacity, flash: this.#flinch * this.#flinch, burn, poison });
    }

    /**
     * Stun stars: they pop in over the head while stunned, circling on a tilted, wobbling ring that follows the dizzy
     * head; when the stun ends they burst outward and fade as the fighter shakes it off.
     */
    #animateStars(stunned, elapsed, realDt) {
        const stars = this.#parts.stars;
        if (stunned) {
            this.#starLevel = Math.min(1, this.#starLevel + realDt / 0.15);
            this.#starBurst = 0;
        }
        else if (this.#starLevel > 0) {
            this.#starBurst += realDt / STAR_BURST_SECONDS;
            if (this.#starBurst >= 1) this.#starLevel = this.#starBurst = 0;
        }
        stars.visible = this.#starLevel > 0;
        if (!stars.visible) return;
        this.#starAt ??= new this.#THREE.Vector3();
        const head = this.#model.bonePosition('Head', this.#starAt);
        head.y += STAR_LIFT;
        stars.position.copy(this.root.worldToLocal(head));
        stars.rotation.set(0.35 * Math.sin(elapsed * 1.3), 0, 0.3 * Math.cos(elapsed * 1.1));
        const burst = this.#starBurst;
        const spread = 1 + 1.8 * Math.sqrt(burst);
        const fade = this.#starLevel * (1 - burst);
        for (const star of stars.children) {
            if (star === stars.userData.trail) continue;
            const base = star.userData.angle;
            const angle = base + elapsed * STAR_SPIN;
            star.position.set(Math.cos(angle) * STAR_ORBIT * spread, Math.sin(angle * 2) * 0.02 + burst * 0.15, Math.sin(angle) * STAR_ORBIT * spread);
            const twinkle = 0.85 + 0.25 * Math.sin(elapsed * 9 + base * 3);
            star.scale.setScalar(STAR_SIZE * twinkle * Math.min(1, this.#starLevel * 1.2) * (1 + 0.5 * burst));
            star.material.opacity = fade;
            star.material.rotation = elapsed * 3 + base;
        }
        stars.userData.trail.material.opacity = 0.3 * fade * (1 - burst);
        stars.userData.trail.scale.setScalar(spread);
    }

    /** @returns {boolean} Whether the fighter is alive and on fire (the engine's `burn` buff). */
    get burning() {
        return Number(this.state?.buffs?.burn?.timeleft) > 0 && this.#alive;
    }

    /**
     * @param {string} name Bone name (see `SyntyModel#bonePosition`).
     * @param {import('three').Vector3} target Receives the bone's world position.
     * @returns {import('three').Vector3} `target`.
     */
    bonePosition(name, target) {
        return this.#model.bonePosition(name, target);
    }

    /** @returns {import('three').Vector3} World-space anchor above the head, reused between calls. */
    getWorldAnchor() {
        return this.#anchor.set(this.root.position.x, ANCHOR_HEIGHT, this.root.position.z);
    }

    /** @returns {{ x: number, z: number }} Current interpolated position. */
    get position() {
        return this.root.position;
    }

    /** Releases geometry and material GPU resources owned by this fighter. */
    destroy() {
        this.#model.dispose();
        this.#effectGeometries.forEach((geometry) => geometry.dispose());
        this.#effectMaterials.forEach((material) => material.dispose());
        this.root.removeFromParent();
    }
}
