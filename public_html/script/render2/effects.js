import { ACTION_BY_ID, ACTION_SPECS } from './motion.js';
import { ARENA_SIZE } from './battle-state.js';

const PARTICLE_POOL = 220;
const PILLAR_POOL = 6;
const EXPLOSION_POOL = 4;
const EXPLOSION_PUFFS = 7;
const EXPLOSION_SECONDS = 0.8;
const RING_POOL = 16;
const SLASH_POOL = 6;
const MELEE_REACH = 3;
const ARROW_HEIGHT = 0.65;
const FIREBALL_HEIGHT = 0.7;

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
    #explosions = [];
    #nextExplosion = 0;
    #variants = new Map();
    #projectiles = new Map();
    #damageTotals = new Map();
    #geometries = {};
    #materials = [];
    #nextParticle = 0;
    #nextRing = 0;
    #nextSlash = 0;
    #root;

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
        this.#geometries = {
            spark: new THREE.SphereGeometry(0.5, 6, 5),
            ring: new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2),
            slash: new THREE.RingGeometry(0.7, 1.15, 20, 1, -Math.PI / 2 - 1.0, 2.0).rotateX(-Math.PI / 2),
            arrowShaft: new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4).rotateX(Math.PI / 2),
            arrowHead: new THREE.ConeGeometry(0.03, 0.09, 4).rotateX(Math.PI / 2),
            pillar: new THREE.CylinderGeometry(1, 1, 1, 14, 1, true).translate(0, 0.5, 0),
            ball: new THREE.SphereGeometry(1, 12, 8),
            blast: new THREE.IcosahedronGeometry(1, 1),
        };
        for (let i = 0; i < PARTICLE_POOL; i += 1) this.#particles.push(this.#createPooled(this.#geometries.spark, { life: 0, maxLife: 1, velocity: new THREE.Vector3(), gravity: 0, size: 1 }));
        for (let i = 0; i < RING_POOL; i += 1) this.#rings.push(this.#createPooled(this.#geometries.ring, { life: 0, maxLife: 1, radius: 1 }));
        for (let i = 0; i < PILLAR_POOL; i += 1) {
            const pillar = this.#createPooled(this.#geometries.pillar, { life: 0, maxLife: 1, mode: 'out', height: 2 }, THREE.DoubleSide);
            pillar.material.blending = THREE.AdditiveBlending;
            this.#pillars.push(pillar);
        }
        for (let i = 0; i < EXPLOSION_POOL; i += 1) this.#explosions.push(this.#createExplosion());
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
    clear() {
        this.#timeline = [];
        this.#damageTotals.clear();
        this.#projectiles.forEach((entry) => entry.mesh.removeFromParent());
        this.#projectiles.clear();
        this.#variants.clear();
        [...this.#particles, ...this.#rings, ...this.#slashes, ...this.#pillars, ...this.#explosions].forEach((item) => { item.visible = false; item.userData.life = 0; });
    }

    // ---------------------------------------------------------------- primitives

    emitSparks(position, { count = 8, speed = 2.5, size = 0.09, life = 0.45, up = 1.5, gravity = 6, colors = [0xffe9a8] } = {}) {
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
            spark.visible = true;
        }
    }

    addRing(position, color, radius = 2, life = 0.6) {
        const ring = this.#rings[this.#nextRing];
        this.#nextRing = (this.#nextRing + 1) % RING_POOL;
        ring.userData.life = ring.userData.maxLife = life;
        ring.userData.radius = radius;
        ring.position.set(position.x, 0.12, position.z);
        ring.material.color.setHex(color);
        ring.scale.setScalar(0.1);
        ring.visible = true;
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

    /** Pooled 3D blast: hot faceted fireball, expanding shell and rising smoke puffs. */
    #createExplosion() {
        const THREE = this.#THREE;
        const group = new THREE.Group();
        const material = (color, blending = THREE.NormalBlending) => {
            const item = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending, flatShading: true });
            this.#materials.push(item);
            return item;
        };
        const core = new THREE.Mesh(this.#geometries.blast, material(0xffe6a0, THREE.AdditiveBlending));
        const shell = new THREE.Mesh(this.#geometries.blast, material(0xff6a1a, THREE.AdditiveBlending));
        const puffs = [];
        for (let i = 0; i < EXPLOSION_PUFFS; i += 1) {
            const angle = (i / EXPLOSION_PUFFS) * Math.PI * 2 + Math.random();
            const puff = new THREE.Mesh(this.#geometries.blast, material(0x2b2622));
            puff.userData = { angle, reach: 0.5 + Math.random() * 0.5, rise: 0.5 + Math.random() * 0.8, size: 0.22 + Math.random() * 0.16 };
            puffs.push(puff);
        }
        group.add(core, shell, ...puffs);
        Object.assign(group.userData, { life: 0, maxLife: EXPLOSION_SECONDS, core, shell, puffs });
        group.visible = false;
        this.#root.add(group);
        return group;
    }

    addExplosion(position, radius = 1) {
        const blast = this.#explosions[this.#nextExplosion];
        this.#nextExplosion = (this.#nextExplosion + 1) % EXPLOSION_POOL;
        Object.assign(blast.userData, { life: EXPLOSION_SECONDS, maxLife: EXPLOSION_SECONDS, radius });
        blast.position.set(position.x, position.y, position.z);
        blast.rotation.y = Math.random() * Math.PI;
        blast.visible = true;
    }

    #updateExplosion(blast) {
        const { core, shell, puffs, radius } = blast.userData;
        const t = 1 - blast.userData.life / blast.userData.maxLife;
        const grow = 1 - (1 - Math.min(1, t * 2.2)) ** 3;
        core.scale.setScalar(radius * (0.15 + 0.75 * grow) * (1 - t * 0.35));
        core.material.color.setHex(t < 0.25 ? 0xfff3c0 : (t < 0.55 ? 0xffa030 : 0xd8401a));
        core.material.opacity = Math.max(0, 1 - t * t * 1.4);
        shell.scale.setScalar(radius * (0.2 + 1.3 * grow));
        shell.material.opacity = Math.max(0, (1 - t * 1.6) * 0.45);
        for (const puff of puffs) {
            const { angle, reach, rise, size } = puff.userData;
            const spread = radius * reach * grow;
            puff.position.set(Math.cos(angle) * spread * 0.9, radius * 0.1 + rise * t * radius * 0.9, Math.sin(angle) * spread * 0.9);
            puff.scale.setScalar(radius * size * (0.5 + t * 1.6));
            puff.material.opacity = Math.max(0, Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.6);
        }
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

    #sfx(name, prefs) {
        this.#audio.playEffect(name, Number(prefs.sound?.sfx) || 0);
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
                    this.#sfx('lvlup', prefs);
                    break;
                case 'death':
                    if (!fighter) break;
                    this.#sfx(fighter.appearance.female ? 'death_female' : 'death_male', prefs);
                    this.emitSparks(fighter.position, { count: 12, speed: 1.4, size: 0.18, life: 0.9, up: 1.2, gravity: 1.2, colors: [0x8a7f6d, 0xa39682] });
                    this.#onShake(0.3);
                    break;
                case 'revive': if (fighter) this.addRing(fighter.position, 0x9ff3ff, 2.4, 0.7); break;
                case 'projectile-spawn': {
                    const owner = fighters.get(String(event.projectile?.owner));
                    owner?.fire();
                    if (owner?.activeAction?.name === 'assassinate') this.#variants.set(`${event.projectile.type}:${event.projectile.id}`, 'assassinate');
                    if (Number(event.projectile?.type) === 1) this.#sfx('fireball', prefs);
                    break;
                }
                case 'projectile-impact': this.#onImpact(event.projectile, prefs); break;
                default: break;
            }
        }
    }

    #onAction(event, fighter, prefs, frame) {
        const name = ACTION_BY_ID[event.action];
        const spec = fighter.activeAction?.spec ?? (name ? ACTION_SPECS[name] : null);
        if (!spec) return;
        const at = fighter.position;
        const contact = spec.contact ?? 0;
        switch (name) {
            case 'melee':
            case 'assassinate':
                this.later(contact, () => {
                    this.addSlash(fighter, name === 'assassinate' ? 0xff6a7a : 0xfff2c8);
                    this.#sfx(name === 'assassinate' ? 'assassinate' : 'melee', prefs);
                });
                break;
            case 'ranged': this.later(contact, () => this.#sfx('ranged', prefs)); break;
            case 'fireball': {
                this.addRing(at, 0xff7a2a, 1.3, 0.5);
                this.emitSparks({ x: at.x, y: 0.15, z: at.z }, { count: 12, speed: 0.9, up: 2.2, gravity: 0, colors: [0xff9a3a, 0xffd27a] });
                this.later(contact, () => {
                    const hand = { x: fighter.position.x, y: 0.65, z: fighter.position.z };
                    this.addRing(hand, 0xffb84a, 1.8, 0.35);
                    this.emitSparks(hand, { count: 22, speed: 2.6, size: 0.12, life: 0.5, up: 1.2, gravity: 1, colors: [0xff5b2e, 0xffb84a, 0xfff0b0] });
                });
                break;
            }
            case 'teleport': {
                const origin = { x: at.x, z: at.z };
                this.#teleportBurst(origin, 'in');
                const arrival = frame.glads?.[fighter.index];
                if (arrival) this.#teleportBurst({ x: Number(arrival.x) - ARENA_SIZE / 2, z: Number(arrival.y) - ARENA_SIZE / 2 }, 'out');
                this.#sfx('teleport', prefs);
                break;
            }
            case 'block': this.addRing(at, 0x62c8ff, 1, 0.35); this.#sfx('block', prefs); break;
            case 'ambush': this.emitSparks({ x: at.x, y: 0.3, z: at.z }, { count: 10, speed: 1.2, colors: [0x6a6a78, 0x3a3a48] }); this.#sfx('ambush', prefs); break;
            case 'charge': this.#sfx(fighter.appearance.female ? 'charge_female' : 'charge_male', prefs); break;
            case 'potion':
                this.later(contact, () => {
                    this.addRing(fighter.position, 0x62ef70, 1.6, 0.6);
                    this.#sfx('elixir', prefs);
                });
                break;
            default: break;
        }
    }

    /**
     * A hit lands when the swing connects, not when the engine reports it. The engine
     * resolves melee damage a frame after the swing starts, so the visual waits for the
     * remainder of the attacker's contact time.
     */
    #onDamage(event, victim, fighters, overlay, prefs, events) {
        let delay = 0;
        let struck = events.some((other) => other.type === 'projectile-impact');
        for (const attacker of fighters.values()) {
            const action = attacker.activeAction;
            const spec = action?.spec ?? null;
            if (!spec || attacker === victim || !['melee', 'assassinate'].includes(action.name)) continue;
            const distance = Math.hypot(attacker.position.x - victim.position.x, attacker.position.z - victim.position.z);
            if (distance > MELEE_REACH || action.age >= spec.contact) continue;
            delay = Math.max(delay, spec.contact - action.age);
            struck = true;
        }
        // Burn ticks are damage over time: no recoil or impact sparks.
        const burning = Number(victim.state.buffs?.burn?.timeleft) > 0;
        this.later(delay, () => {
            if (struck || !burning) {
                victim.hit();
                this.emitSparks({ x: victim.position.x, y: 0.6, z: victim.position.z }, { count: 7, speed: 2.2, colors: [0xfff2c8, 0xff8a6a] });
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

    #teleportBurst(position, mode) {
        this.addPillar(position, 0xb070ff, mode, 0.7);
        this.addRing(position, 0xc890ff, 1.6, 0.6);
        const points = mode === 'in' ? { speed: 0.5, up: 3.2 } : { speed: 1.8, up: 2.4 };
        this.emitSparks({ x: position.x, y: 0.3, z: position.z }, { count: 18, gravity: 0, life: 0.7, size: 0.08, colors: [0xc890ff, 0xf0e0ff, 0x8a5aff], ...points });
    }

    #onImpact(projectile, prefs) {
        if (!projectile) return;
        const isFireball = Number(projectile.type) === 1;
        const position = { x: Number(projectile.x) - ARENA_SIZE / 2, y: isFireball ? FIREBALL_HEIGHT : ARROW_HEIGHT, z: Number(projectile.y) - ARENA_SIZE / 2 };
        if (isFireball) {
            this.addExplosion(position, 1.05);
            this.addRing(position, 0xff7a2a, 2.2, 0.5);
            this.emitSparks(position, { count: 22, speed: 3.6, size: 0.14, life: 0.6, colors: [0xff5b2e, 0xffb84a, 0xfff0b0] });
            this.#onShake(0.28);
        }
        else {
            this.emitSparks(position, { count: 6, speed: 1.6, colors: [0xe8d7ad] });
        }
        this.#sfx(isFireball ? 'explosion' : 'arrow_hit', prefs);
    }

    // --------------------------------------------------------------- projectiles

    #createProjectile(projectile, variant) {
        const THREE = this.#THREE;
        const type = Number(projectile.type);
        const group = new THREE.Group();
        if (type === 1) {
            const core = new THREE.MeshBasicMaterial({ color: 0xffc46a });
            const halo = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.4, depthWrite: false });
            this.#materials.push(core, halo);
            const inner = new THREE.Mesh(this.#geometries.ball, core);
            inner.scale.setScalar(0.16);
            const outer = new THREE.Mesh(this.#geometries.ball, halo);
            outer.scale.setScalar(0.3);
            group.add(inner, outer);
        }
        else {
            const shaft = new THREE.MeshBasicMaterial({ color: variant === 'assassinate' ? 0x8a1420 : 0xe6d2a1 });
            const tip = new THREE.MeshBasicMaterial({ color: type === 2 ? 0x2fe04a : variant === 'assassinate' ? 0xd01020 : 0xc8ced6 });
            this.#materials.push(shaft, tip);
            const body = new THREE.Mesh(this.#geometries.arrowShaft, shaft);
            const head = new THREE.Mesh(this.#geometries.arrowHead, tip);
            head.position.z = 0.29;
            group.add(body, head);
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
                entry = { mesh: this.#createProjectile(projectile, variant), variant, trail: 0, from: { x, z }, to: { x, z }, type: Number(projectile.type), height };
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
            entry.mesh.rotation.y = Math.PI - (Number(projectile.head) * Math.PI) / 180;
        }
        this.#projectiles.forEach((entry, key) => {
            if (seen.has(key)) return;
            entry.mesh.removeFromParent();
            this.#projectiles.delete(key);
        });
    }

    // ------------------------------------------------------------------- update

    /**
     * @param {{ realDt: number, gameDt: number, progress: number, elapsed: number }} frame Frame timing.
     */
    update({ realDt, gameDt, progress, elapsed }) {
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
            const trail = entry.type === 1
                ? { rate: 70, size: 0.2, life: 0.6, colors: [0xff5b2e, 0xff8a2a, 0xffd27a] }
                : entry.variant === 'assassinate' ? { rate: 90, size: 0.07, life: 0.7, colors: [0x7a0010, 0xb0121f, 0xe01a2c] } : null;
            if (entry.type === 1) entry.mesh.scale.setScalar(1 + Math.sin(elapsed * 30) * 0.08);
            if (trail && realDt > 0) {
                entry.trail += realDt * trail.rate;
                const count = Math.min(6, Math.floor(entry.trail));
                entry.trail -= Math.floor(entry.trail);
                if (count) this.emitSparks(entry.mesh.position, { count, speed: 0.12, size: trail.size, life: trail.life, up: 0.1, gravity: 0, colors: trail.colors });
            }
        });

        for (const spark of this.#particles) {
            const data = spark.userData;
            if (data.life <= 0) continue;
            data.life -= realDt;
            if (data.life <= 0) { spark.visible = false; continue; }
            data.velocity.y -= data.gravity * realDt;
            spark.position.addScaledVector(data.velocity, realDt);
            spark.scale.setScalar(data.size * (0.4 + 0.6 * (data.life / data.maxLife)));
            spark.material.opacity = Math.min(1, (data.life / data.maxLife) * 1.5);
        }
        for (const ring of this.#rings) {
            const data = ring.userData;
            if (data.life <= 0) continue;
            data.life -= realDt;
            if (data.life <= 0) { ring.visible = false; continue; }
            const t = 1 - data.life / data.maxLife;
            ring.scale.setScalar(data.radius * (1 - (1 - t) ** 2));
            ring.material.opacity = (1 - t) * 0.85;
        }
        for (const pillar of this.#pillars) {
            const data = pillar.userData;
            if (data.life <= 0) continue;
            data.life -= realDt;
            if (data.life <= 0) { pillar.visible = false; continue; }
            const t = 1 - data.life / data.maxLife;
            const wide = data.mode === 'out' ? 0.25 + t * 0.55 : 0.8 * (1 - t) + 0.1;
            pillar.scale.set(wide, data.height * (data.mode === 'out' ? 1 - t * 0.3 : 0.6 + 0.4 * (1 - t)), wide);
            pillar.material.opacity = (data.mode === 'out' ? 1 - t : Math.min(1, t * 3) * (1 - t * 0.6)) * 0.55;
        }
        for (const blast of this.#explosions) {
            if (blast.userData.life <= 0) continue;
            blast.userData.life -= realDt;
            if (blast.userData.life <= 0) { blast.visible = false; continue; }
            this.#updateExplosion(blast);
        }
        for (const slash of this.#slashes) {
            const data = slash.userData;
            if (data.life <= 0) continue;
            data.life -= realDt;
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

    destroy() {
        this.clear();
        Object.values(this.#geometries).forEach((geometry) => geometry.dispose());
        this.#materials.forEach((material) => material.dispose());
        this.#scene.remove(this.#root);
    }
}
