import { ACTIONS, headingToRadians, lerp, toArenaPosition } from './battle-state.js';
import { getGladiatorAppearance, getPotionEffect } from './gladiator-appearance.js';

/** Soft round sprite used by every particle pool. */
const PARTICLE_VERTEX_SHADER = `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aLife;
    varying vec3 vColor;
    varying float vLife;
    uniform float uPixelsPerUnit;

    void main() {
        vColor = aColor;
        vLife = aLife;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(aSize * uPixelsPerUnit * (0.45 + 0.55 * aLife), 1.0);
        gl_Position = projectionMatrix * viewPosition;
    }
`;

const PARTICLE_FRAGMENT_SHADER = `
    varying vec3 vColor;
    varying float vLife;

    void main() {
        float distance = length(gl_PointCoord - vec2(0.5));
        float alpha = smoothstep(0.5, 0.1, distance) * vLife;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha);
    }
`;

/**
 * Decides whether two replay timestamps require snapping instead of blending.
 *
 * @param {number} previousStamp Timestamp of the previous accepted frame.
 * @param {number} nextStamp Timestamp of the incoming frame.
 * @returns {boolean} True when the motion bridge would be misleading.
 */
function simtimeGap(previousStamp, nextStamp) {
    const delta = nextStamp - previousStamp;
    return delta <= 0 || delta > 0.45;
}

/**
 * Fixed-budget GPU point pool driven by a CPU integration step.
 *
 * Pools never allocate during play: dead slots keep a zero-life attribute and
 * are recycled by a ring cursor.
 */
class ParticlePool {
    #THREE;
    #cursor = 0;
    #drag;
    #geometry;
    #gravity;
    #lifeSpans;
    #max;
    #material;
    #mesh;
    #velocities;

    /**
     * @param {typeof import('three')} THREE Active Three.js module.
     * @param {import('three').Scene} scene Effect parent scene.
     * @param {{ additive?: boolean, max?: number }} [options] Pool behaviour.
     */
    constructor(THREE, scene, { additive = true, max = 360 } = {}) {
        this.#THREE = THREE;
        this.#max = max;
        this.#geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(max * 3);
        const colors = new Float32Array(max * 3);
        const sizes = new Float32Array(max);
        const lives = new Float32Array(max);
        this.#geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.#geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        this.#geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        this.#geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));
        this.#geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 64);

        this.#material = new THREE.ShaderMaterial({
            uniforms: { uPixelsPerUnit: { value: 40 } },
            vertexShader: PARTICLE_VERTEX_SHADER,
            fragmentShader: PARTICLE_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        this.#mesh = new THREE.Points(this.#geometry, this.#material);
        this.#mesh.frustumCulled = false;
        this.#mesh.renderOrder = 6;
        scene.add(this.#mesh);

        this.#velocities = new Float32Array(max * 3);
        this.#lifeSpans = new Float32Array(max);
        this.#gravity = new Float32Array(max);
        this.#drag = new Float32Array(max);
    }

    /** @param {number} value Screen pixels covered by one world unit. */
    setPixelsPerUnit(value) {
        this.#material.uniforms.uPixelsPerUnit.value = Math.max(value, 1);
    }

    /**
     * Spawns a burst of particles.
     *
     * @param {{ x: number, y: number, z: number }} position Emission origin.
     * @param {{
     *   count?: number, speed?: number, spread?: number, upward?: number,
     *   size?: number, life?: number, gravity?: number, drag?: number,
     *   colors?: Array<number|import('three').Color>
     * }} options Burst description.
     */
    emit(position, {
        count = 10,
        speed = 2.2,
        spread = 0.35,
        upward = 0.4,
        size = 0.16,
        life = 0.6,
        gravity = 3.4,
        drag = 1.6,
        colors = [0xffd27f],
    } = {}) {
        const THREE = this.#THREE;
        const positions = this.#geometry.attributes.position.array;
        const colorAttributes = this.#geometry.attributes.aColor.array;
        const sizeAttributes = this.#geometry.attributes.aSize.array;
        const lifeAttributes = this.#geometry.attributes.aLife.array;
        const color = new THREE.Color();

        for (let emitted = 0; emitted < count; emitted += 1) {
            const slot = this.#cursor;
            this.#cursor = (this.#cursor + 1) % this.#max;

            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() ** 0.7;
            const horizontal = speed * radius;
            positions[slot * 3] = position.x + (Math.random() - 0.5) * spread;
            positions[slot * 3 + 1] = position.y + (Math.random() - 0.5) * spread * 0.6;
            positions[slot * 3 + 2] = position.z + (Math.random() - 0.5) * spread;
            this.#velocities[slot * 3] = Math.cos(angle) * horizontal;
            this.#velocities[slot * 3 + 1] = speed * upward + Math.random() * speed * 0.4;
            this.#velocities[slot * 3 + 2] = Math.sin(angle) * horizontal;

            color.set(colors[emitted % colors.length]);
            colorAttributes[slot * 3] = color.r;
            colorAttributes[slot * 3 + 1] = color.g;
            colorAttributes[slot * 3 + 2] = color.b;
            sizeAttributes[slot] = size * (0.7 + Math.random() * 0.6);

            const span = life * (0.75 + Math.random() * 0.5);
            this.#lifeSpans[slot] = span;
            lifeAttributes[slot] = 1;
            this.#gravity[slot] = gravity;
            this.#drag[slot] = drag;
        }

        this.#geometry.attributes.position.needsUpdate = true;
        this.#geometry.attributes.aColor.needsUpdate = true;
        this.#geometry.attributes.aSize.needsUpdate = true;
        this.#geometry.attributes.aLife.needsUpdate = true;
    }

    /**
     * Integrates every live particle one frame forward.
     *
     * @param {number} deltaSeconds Wall-clock seconds since the previous frame.
     */
    update(deltaSeconds) {
        if (deltaSeconds <= 0) return;
        const positions = this.#geometry.attributes.position.array;
        const lifeAttributes = this.#geometry.attributes.aLife.array;
        let anyAlive = false;

        for (let slot = 0; slot < this.#max; slot += 1) {
            const remaining = lifeAttributes[slot];
            if (remaining <= 0) continue;
            anyAlive = true;

            const nextLife = remaining - deltaSeconds / this.#lifeSpans[slot];
            if (nextLife <= 0) {
                lifeAttributes[slot] = 0;
                continue;
            }
            lifeAttributes[slot] = nextLife;

            const damping = Math.max(1 - this.#drag[slot] * deltaSeconds, 0);
            this.#velocities[slot * 3] *= damping;
            this.#velocities[slot * 3 + 1] = this.#velocities[slot * 3 + 1] * damping - this.#gravity[slot] * deltaSeconds;
            this.#velocities[slot * 3 + 2] *= damping;
            positions[slot * 3] += this.#velocities[slot * 3] * deltaSeconds;
            positions[slot * 3 + 1] += this.#velocities[slot * 3 + 1] * deltaSeconds;
            positions[slot * 3 + 2] += this.#velocities[slot * 3 + 2] * deltaSeconds;
            if (positions[slot * 3 + 1] < 0.04) {
                positions[slot * 3 + 1] = 0.04;
                this.#velocities[slot * 3 + 1] *= -0.28;
            }
        }

        if (anyAlive) {
            this.#geometry.attributes.position.needsUpdate = true;
            this.#geometry.attributes.aLife.needsUpdate = true;
        }
    }

    /** Removes the pool's GPU resources. */
    dispose() {
        this.#geometry.dispose();
        this.#material.dispose();
        this.#mesh.removeFromParent();
    }
}

/**
 * Owns exact-position projectiles and short-lived Three.js combat effects.
 *
 * Projectiles bridge replay frames exactly like fighters do, so arrows and
 * fireballs glide instead of jumping once per simlog step.
 */
export class BattleEffectsLayer {
    #THREE;
    #arrowFactory;
    #audio;
    #damageTotals = new Map();
    #onShake;
    #projectiles = new Map();
    #scene;
    #slashArcGeometry;
    #slashArcMaterial;
    #sparkPool;
    #smokePool;
    #transients = new Set();

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene, audio: import('./audio-manager.js').BattleAudioManager, onShake?: (trauma: number) => void, arrowFactory?: (tint?: { color?: number, emissive?: number, emissiveIntensity?: number }) => import('three').Object3D|null }} options Effect dependencies.
     */
    constructor({ THREE, scene, audio, onShake = null, arrowFactory = null }) {
        this.#THREE = THREE;
        this.#scene = scene;
        this.#audio = audio;
        this.#onShake = onShake;
        this.#arrowFactory = arrowFactory;

        this.#sparkPool = new ParticlePool(THREE, scene, { additive: true, max: 420 });
        this.#smokePool = new ParticlePool(THREE, scene, { additive: false, max: 220 });
        this.#slashArcGeometry = new THREE.TorusGeometry(0.92, 0.045, 6, 22, Math.PI * 0.85);
        this.#slashArcMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }

    /**
     * Builds a stable projectile key.
     *
     * @param {Record<string, unknown>} projectile Projectile state.
     * @returns {string} Stable replay key.
     */
    #projectileKey(projectile) {
        return `${projectile.type ?? 'unknown'}:${projectile.id ?? 'unknown'}`;
    }

    /**
     * Creates an interpolated projectile rig for one engine projectile type.
     *
     * @param {Record<string, unknown>} projectile Projectile state.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     * @returns {{ object: import('three').Object3D, resources: Array<{ dispose(): void }>, from: object, to: object, trail: import('three').Line|null }} Projectile resources.
     */
    #createProjectile(projectile, viewsById, simulationTime = 0) {
        const THREE = this.#THREE;
        const type = Number(projectile.type);
        const resources = [];
        const pivot = new THREE.Group();
        let body;

        if (type === 1) {
            const geometry = new THREE.IcosahedronGeometry(0.23, 1);
            const material = new THREE.MeshStandardMaterial({
                color: 0xff8b2e,
                emissive: 0xff4b1f,
                emissiveIntensity: 1.6,
                roughness: 0.22,
            });
            resources.push(geometry, material);
            body = new THREE.Mesh(geometry, material);
            const light = new THREE.PointLight(0xff5a2b, 1.4, 3.6);
            body.add(light);
        }
        else {
            const owner = viewsById.get(String(projectile.owner));
            const assassinate = Number(owner?.state?.action) === ACTIONS.assassinate;
            const colored = assassinate || type === 2;
            const color = assassinate ? 0xff334f : type === 2 ? 0x62ef70 : 0xe6d2a1;
            // Real bow-pack arrow when available; the procedural cone remains
            // the fallback so effects never depend on asset availability.
            const arrow = this.#arrowFactory?.(colored ? { color, emissiveIntensity: 0.65 } : undefined);
            if (arrow) {
                body = /** @type {import('three').Object3D} */ (arrow);
            }
            else {
                const geometry = new THREE.ConeGeometry(0.075, 0.82, 6);
                const material = new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: colored ? 0.65 : 0.12,
                    roughness: 0.5,
                    metalness: 0.3,
                });
                resources.push(geometry, material);
                body = new THREE.Mesh(geometry, material);
            }
            pivot.userData.trailColor = color;

            const trailGeometry = new THREE.BufferGeometry();
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
            trailGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 64);
            const trailMaterial = new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.42,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            resources.push(trailGeometry, trailMaterial);
            const trail = new THREE.Line(trailGeometry, trailMaterial);
            trail.frustumCulled = false;
            trail.renderOrder = 5;
            this.#scene.add(trail);
            pivot.userData.trail = trail;
        }

        body.castShadow = true;
        pivot.add(body);
        pivot.userData.body = body;
        if (type !== 1) {
            // A freshly spawned arrow has no travel delta yet; align it to the
            // engine heading right away so it never renders pointing up.
            this.#alignArrowToHeading(body, Number(projectile.head));
        }
        this.#scene.add(pivot);

        const first = toArenaPosition({ x: projectile.x, y: projectile.y }, 1.05);
        return {
            object: pivot,
            resources,
            from: { ...first, simtime: Number(simulationTime) || 0 },
            to: { ...first, simtime: Number(simulationTime) || 0 },
            trail: pivot.userData.trail ?? null,
        };
    }

    /**
     * Builds the upright flight-frame quaternion for a heading in degrees.
     *
     * Engine headings run clockwise from north (world −Z), matching the
     * projectile integration used by replays.
     *
     * @param {import('three').Object3D} body Arrow body to orient.
     * @param {number} head Engine heading in degrees.
     */
    #alignArrowToHeading(body, head) {
        const radians = Number(head) * Math.PI / 180;
        const direction = new this.#THREE.Vector3(Math.sin(radians), 0, -Math.cos(radians));
        if (direction.lengthSq() < 1e-6) return;
        const up = new this.#THREE.Vector3(0, 1, 0);
        const right = new this.#THREE.Vector3().crossVectors(direction, up).normalize();
        const trueUp = new this.#THREE.Vector3().crossVectors(right, direction).normalize();
        body.quaternion.setFromRotationMatrix(
            new this.#THREE.Matrix4().makeBasis(right, direction, trueUp),
        );
        body.userData.headingAligned = true;
    }

    /**
     * Synchronizes visible projectiles with the current complete replay frame.
     *
     * @param {Array<Record<string, unknown>>} projectiles Current projectiles.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     * @param {number} simulationTime Replay timestamp of the current frame.
     */
    updateProjectiles(projectiles, viewsById, simulationTime = 0) {
        const activeKeys = new Set();
        projectiles.forEach((projectile) => {
            const key = this.#projectileKey(projectile);
            activeKeys.add(key);
            let item = this.#projectiles.get(key);
            if (!item) {
                item = this.#createProjectile(projectile, viewsById, simulationTime);
                this.#projectiles.set(key, item);
            }

            const position = toArenaPosition({ x: projectile.x, y: projectile.y }, 1.05);
            const stamp = Number(simulationTime) || 0;
            const jumped = simtimeGap(item.to.simtime, stamp);
            item.from = jumped ? { ...position, simtime: stamp } : { ...item.to };
            item.to = { x: position.x, y: position.y, z: position.z, simtime: stamp };
            item.state = projectile;
            item.object.position.set(position.x, position.y, position.z);
            // Arrows are oriented in world space from their flight direction;
            // only the spinning fireball keeps a pivot yaw.
            item.object.rotation.y = Number(projectile.type) === 1 ? headingToRadians(projectile.head) : 0;
        });

        this.#projectiles.forEach((item, key) => {
            if (activeKeys.has(key)) return;
            if (item.trail) item.trail.removeFromParent();
            item.object.removeFromParent();
            item.resources.forEach((resource) => resource.dispose());
            this.#projectiles.delete(key);
        });
    }

    /**
     * Adds a generic transient effect driven by a progress callback.
     *
     * @param {import('three').Object3D} object Scene object removed after expiry.
     * @param {import('three').BufferGeometry} geometry Geometry disposed after expiry.
     * @param {import('three').Material} material Material disposed after expiry.
     * @param {(progress: number) => void} tick Per-frame visual update.
     * @param {number} duration Lifetime in seconds.
     */
    #addTransient(object, geometry, material, tick, duration) {
        this.#scene.add(object);
        this.#transients.add({
            object,
            geometry,
            material,
            tick,
            startedAt: performance.now() / 1000,
            duration,
        });
    }

    /**
     * Adds a pulsing ring flush with the arena floor.
     *
     * @param {{ x: number, y: number, z: number }} position World position.
     * @param {number} color Effect color.
     * @param {number} [size=1] Final scale multiplier.
     * @param {number} [duration=0.65] Lifetime in seconds.
     */
    #addRing(position, color, size = 1, duration = 0.65) {
        const THREE = this.#THREE;
        const geometry = new THREE.TorusGeometry(0.34, 0.055, 8, 36);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(position.x, 0.14, position.z);
        this.#addTransient(mesh, geometry, material, (progress) => {
            const eased = 1 - (1 - progress) ** 2.4;
            mesh.scale.setScalar(0.4 + eased * size);
            material.opacity = (1 - progress) * 0.9;
        }, duration);
    }

    /**
     * Adds a directional melee slash arc that sweeps through the swing.
     *
     * @param {import('./gladiator-view.js').GladiatorView} view Attacking fighter.
     * @param {boolean} heavy Assassinate-grade swing.
     */
    #addSlashArc(view, heavy = false) {
        const appearance = getGladiatorAppearance(view.state);
        const material = this.#slashArcMaterial.clone();
        material.color.set(appearance.accentColor);
        const mesh = new this.#THREE.Mesh(this.#slashArcGeometry, material);
        const base = view.root.position;
        mesh.position.set(base.x, 1.16, base.z);
        // Lay the torus flat, then spin its arc around the vertical axis.
        mesh.rotation.x = -Math.PI / 2;
        const scale = heavy ? 1.3 : 1;
        const arcCenterOffset = Math.PI * 0.425;
        const startAngle = headingToRadians(view.state.head) + Math.PI / 2 - arcCenterOffset;
        const sweep = Math.PI * 1.05;
        this.#addTransient(mesh, null, material, (progress) => {
            mesh.rotation.z = startAngle - sweep * (1 - (1 - progress) ** 2);
            const pulse = 1 + Math.sin(progress * Math.PI) * 0.2;
            mesh.scale.setScalar(scale * pulse);
            material.opacity = (1 - progress) * 0.78;
        }, heavy ? 0.3 : 0.24);
    }

    /**
     * Adds an expanding impact flash with shockwave and debris.
     *
     * @param {Record<string, unknown>} projectile Last projectile frame.
     * @param {number} color Explosion color.
     */
    #addImpact(projectile, color) {
        const THREE = this.#THREE;
        const isFireball = Number(projectile.type) === 1;
        const position = toArenaPosition({ x: projectile.x, y: projectile.y }, 0.72);
        const scale = isFireball ? 1.9 : 0.85;

        const flashGeometry = new THREE.IcosahedronGeometry(0.4, 1);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.#addTransient(flash, flashGeometry, flashMaterial, (progress) => {
            flash.scale.setScalar((0.4 + progress * 3.1) * scale);
            flashMaterial.opacity = (1 - progress) ** 1.6 * 0.85;
        }, isFireball ? 0.5 : 0.32);

        if (isFireball) {
            this.#addRing(position, color, 4.6, 0.55);
            this.#sparkPool.emit(position, {
                count: 30,
                speed: 5.2,
                size: 0.2,
                life: 0.66,
                upward: 0.85,
                colors: [0xfff3b0, 0xffb347, 0xff5a2b],
            });
            this.#smokePool.emit({ ...position, y: 0.5 }, {
                count: 14,
                speed: 1.15,
                size: 0.62,
                life: 1.25,
                upward: 1.15,
                gravity: -0.55,
                drag: 1.1,
                spread: 0.8,
                colors: [0x3c3733, 0x55504b],
            });

            const light = new THREE.PointLight(color, 26, 7.5, 1.8);
            light.position.set(position.x, position.y + 0.6, position.z);
            this.#addTransient(light, null, null, (progress) => {
                light.intensity = 26 * (1 - progress) ** 2;
                light.position.y = position.y + 0.6 + progress * 0.5;
            }, 0.42);

            this.#requestShake(0.3);
        }
        else {
            this.#sparkPool.emit(position, {
                count: 10,
                speed: 2.6,
                size: 0.11,
                life: 0.38,
                upward: 0.6,
                colors: [0xfff6da, color],
            });
        }
    }

    /** Requests camera trauma from the owning renderer when registered. */
    #requestShake(trauma) {
        this.#onShake?.(trauma);
    }

    /**
     * Handles one-shot events while continuous state remains in the views.
     *
     * @param {Array<Record<string, unknown>>} events Derived step events.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     * @param {import('./dom-overlay.js').BattleDomOverlay} overlay DOM overlay.
     * @param {{ text?: boolean, sound?: { sfx?: number }, reducedMotion?: boolean }} preferences User preferences.
     * @param {number} simulationTime Current replay timestamp.
     */
    handleEvents(events, viewsById, overlay, preferences, simulationTime = 0) {
        const volume = Number(preferences.sound?.sfx) || 0;

        events.forEach((event) => {
            const view = viewsById.get(String(event.gladId));

            if (event.type === 'damage' && view) {
                view.playHitReaction(simulationTime, event.amount);
                const current = this.#damageTotals.get(String(event.gladId)) ?? 0;
                const total = current + Number(event.amount);
                const threshold = Math.max(1, Number(view.state.maxhp) * 0.01);
                if (total >= threshold && preferences.text) {
                    overlay.showFloatingLabel(view, Math.round(total).toString(), 'damage');
                    this.#damageTotals.set(String(event.gladId), 0);
                }
                else {
                    this.#damageTotals.set(String(event.gladId), total);
                }
            }
            else if (event.type === 'heal' && view && preferences.text) {
                overlay.showFloatingLabel(view, `+${Math.round(Number(event.amount))}`, 'heal');
            }
            else if (event.type === 'level-up' && view) {
                overlay.showFloatingLabel(view, `NÍVEL ${event.level}`, 'level');
                this.#addRing(view.root.position, 0xffe66d, 3.4, 0.95);
                this.#addRing(view.root.position, 0xfff3b0, 2.1, 0.7);
                this.#sparkPool.emit(
                    { x: view.root.position.x, y: 0.4, z: view.root.position.z },
                    {
                        count: 26,
                        speed: 2.4,
                        size: 0.15,
                        life: 0.95,
                        upward: 1.9,
                        gravity: 2.1,
                        colors: [0xffe66d, 0xfff3b0, 0xf0c453],
                    },
                );
                this.#audio.playEffect('lvlup', volume);
            }
            else if (event.type === 'death' && view) {
                const appearance = getGladiatorAppearance(view.state);
                this.#audio.playEffect(appearance.gender === 'female' ? 'death_female' : 'death_male', volume);
                this.#smokePool.emit({ x: view.root.position.x, y: 0.25, z: view.root.position.z }, {
                    count: 12,
                    speed: 1.4,
                    size: 0.5,
                    life: 0.9,
                    upward: 0.7,
                    gravity: 1.4,
                    spread: 0.7,
                    colors: [0x8a7f6d, 0xa39682],
                });
                this.#requestShake(0.34);
            }
            else if (event.type === 'revive' && view) {
                this.#addRing(view.root.position, 0x9ff3ff, 2.6, 0.7);
            }
            else if (event.type === 'action' && view) {
                this.#handleAction(event, view, overlay, preferences, volume);
            }
            else if (event.type === 'projectile-spawn' && Number(event.projectile?.type) === 1) {
                this.#audio.playEffect('fireball', volume);
            }
            else if (event.type === 'projectile-impact') {
                const isFireball = Number(event.projectile?.type) === 1;
                this.#addImpact(event.projectile, isFireball ? 0xff5b2e : 0xe8d7ad);
                this.#audio.playEffect(isFireball ? 'explosion' : 'arrow_hit', volume);
            }
        });
    }

    /**
     * Handles action-specific audio and geometric accents.
     *
     * @param {Record<string, unknown>} event Action event.
     * @param {import('./gladiator-view.js').GladiatorView} view Acting gladiator.
     * @param {import('./dom-overlay.js').BattleDomOverlay} overlay DOM overlay.
     * @param {{ text?: boolean }} preferences User preferences.
     * @param {number} volume SFX volume.
     */
    #handleAction(event, view, overlay, preferences, volume) {
        const action = Number(event.action);
        const appearance = getGladiatorAppearance(view.state);
        const audioName = {
            [ACTIONS.teleport]: 'teleport',
            [ACTIONS.block]: 'block',
            [ACTIONS.assassinate]: 'assassinate',
            [ACTIONS.ambush]: 'ambush',
            [ACTIONS.melee]: 'melee',
            [ACTIONS.ranged]: 'ranged',
            [ACTIONS.charge]: appearance.gender === 'female' ? 'charge_female' : 'charge_male',
        }[action];
        if (audioName) this.#audio.playEffect(audioName, volume);

        if (action === ACTIONS.teleport) {
            this.#addRing(view.root.position, 0x62d8ff, 2.9, 0.72);
            this.#sparkPool.emit({ x: view.root.position.x, y: 0.6, z: view.root.position.z }, {
                count: 16,
                speed: 2.8,
                size: 0.13,
                life: 0.5,
                upward: 0.9,
                colors: [0x9fe8ff, 0x62d8ff],
            });
        }
        else if (action === ACTIONS.block) {
            this.#addRing(view.root.position, 0xffdf62, 2.1, 0.5);
        }
        else if (action === ACTIONS.melee) {
            this.#addSlashArc(view, false);
        }
        else if (action === ACTIONS.assassinate) {
            this.#addSlashArc(view, true);
            this.#addRing(view.root.position, 0xd44bff, 2.6, 0.55);
        }
        else if (action === ACTIONS.ambush) {
            this.#addRing(view.root.position, 0xd44bff, 2.5, 0.55);
        }
        else if (action === ACTIONS.potion) {
            const effect = getPotionEffect(event.code);
            if (!effect) return;
            const color = { heal: 0x4fe06e, mana: 0x4f84ff, tonic: 0xffb84f, elixir: 0xc36cff }[effect];
            this.#addRing(view.root.position, color, 2.7, 0.8);
            this.#sparkPool.emit({ x: view.root.position.x, y: 1.1, z: view.root.position.z }, {
                count: 12,
                speed: 1.2,
                size: 0.12,
                life: 0.7,
                upward: 1.4,
                gravity: 1.2,
                colors: [color, 0xffffff],
            });
            this.#audio.playEffect(effect, volume);
            if (preferences.text) {
                overlay.showFloatingLabel(view, effect === 'mana' ? 'AP' : effect === 'heal' ? 'HP' : 'EFEITO', effect === 'mana' ? 'mana' : 'potion');
            }
        }
    }

    /**
     * Plays effects for continuous buff transitions that are absent from action ids.
     *
     * @param {Record<string, unknown>|null} previous Previous complete frame.
     * @param {Record<string, unknown>} current Current complete frame.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     * @param {{ sound?: { sfx?: number } }} preferences User preferences.
     */
    handleBuffTransitions(previous, current, viewsById, preferences) {
        if (!previous) return;
        const volume = Number(preferences.sound?.sfx) || 0;
        const previousGlads = Array.isArray(previous.glads) ? previous.glads : [];
        const currentGlads = Array.isArray(current.glads) ? current.glads : [];
        currentGlads.forEach((gladiator, index) => {
            const prior = previousGlads[index] ?? {};
            const id = String(gladiator.id ?? index);
            const view = viewsById.get(id);
            const stunStarted = Number(gladiator.buffs?.stun?.timeleft) > 0.1
                && Number(prior.buffs?.stun?.timeleft) <= 0.1;
            const resistStarted = Number(gladiator.buffs?.resist?.timeleft) > 0.1
                && Number(prior.buffs?.resist?.timeleft) <= 0.1;
            if (stunStarted && view) {
                this.#addRing(view.root.position, 0xffe66d, 1.7, 0.55);
                this.#sparkPool.emit({ x: view.root.position.x, y: 2.2, z: view.root.position.z }, {
                    count: 8,
                    speed: 1.1,
                    size: 0.12,
                    life: 0.5,
                    upward: 0.3,
                    gravity: 2.4,
                    colors: [0xffe66d],
                });
                this.#audio.playEffect('stun', volume);
            }
            if (resistStarted && view) {
                this.#audio.playEffect('block', volume);
            }
        });
    }

    /**
     * Advances projectiles, transient effects and particle pools.
     *
     * @param {number} elapsedSeconds Animation time in seconds.
     * @param {number} _simulationTime Shared replay clock (reserved for rig effects).
     * @param {number} [deltaSeconds] Wall-clock seconds since the previous frame.
     * @param {number} [frameProgress] Wall-clock progress between replay frames.
     */
    animate(elapsedSeconds, _simulationTime = 0, deltaSeconds = 1 / 60, frameProgress = 1) {
        const reducedDelta = Math.min(deltaSeconds, 0.1);
        const alpha = Math.min(Math.max(frameProgress, 0), 1);

        this.#projectiles.forEach((item) => {
            const x = lerp(item.from.x, item.to.x, alpha);
            const y = lerp(item.from.y, item.to.y, alpha);
            const z = lerp(item.from.z, item.to.z, alpha);
            item.object.position.set(x, y, z);

            const body = item.object.userData.body;
            const isFireball = Number(item.state?.type) === 1;
            const deltaX = item.to.x - item.from.x;
            const deltaZ = item.to.z - item.from.z;
            const travel = Math.hypot(deltaX, deltaZ);

            if (isFireball) {
                body.rotation.x += reducedDelta * 7;
                body.rotation.y += reducedDelta * 5;
                if (travel > 0.001 && Math.random() < 0.55) {
                    this.#sparkPool.emit({ x, y: y - 0.05, z }, {
                        count: 1,
                        speed: 0.5,
                        size: 0.13,
                        life: 0.34,
                        upward: 0.25,
                        gravity: -0.4,
                        drag: 2.4,
                        colors: [0xffb347, 0xff5a2b],
                    });
                }
            }
            else if (travel > 0.02 || !body.userData.headingAligned) {
                // Build an upright, RIGHT-HANDED flight frame directly in
                // world space: the shaft follows the travel vector while the
                // fletching plane stays vertical. (right = dir × up; the
                // opposite cross order mirrors the basis and setFromRotation
                // then produces garbage angles for most headings.) Arrows
                // without a measurable delta yet keep their engine heading.
                let direction;
                if (travel > 0.02) {
                    direction = new this.#THREE.Vector3(deltaX, item.to.y - item.from.y, deltaZ).normalize();
                    body.userData.headingAligned = true;
                }
                else {
                    const radians = Number(item.state?.head) * Math.PI / 180;
                    direction = new this.#THREE.Vector3(Math.sin(radians), 0, -Math.cos(radians));
                }
                const up = new this.#THREE.Vector3(0, 1, 0);
                const right = new this.#THREE.Vector3().crossVectors(direction, up);
                if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
                else right.normalize();
                const trueUp = new this.#THREE.Vector3().crossVectors(right, direction).normalize();
                body.quaternion.setFromRotationMatrix(
                    new this.#THREE.Matrix4().makeBasis(right, direction, trueUp),
                );
            }

            if (item.trail) {
                const trailPositions = item.trail.geometry.attributes.position.array;
                if (travel > 0.001) {
                    const length = Math.min(travel * 2.4, 1.6);
                    trailPositions[0] = x;
                    trailPositions[1] = y;
                    trailPositions[2] = z;
                    trailPositions[3] = x - deltaX / travel * length;
                    trailPositions[4] = y;
                    trailPositions[5] = z - deltaZ / travel * length;
                }
                else {
                    trailPositions[3] = trailPositions[0] = x;
                    trailPositions[4] = trailPositions[1] = y;
                    trailPositions[5] = trailPositions[2] = z;
                }
                item.trail.geometry.attributes.position.needsUpdate = true;
            }
        });

        this.#transients.forEach((effect) => {
            const progress = Math.min(1, (elapsedSeconds - effect.startedAt) / effect.duration);
            effect.tick(progress);
            if (progress < 1) return;
            effect.object.removeFromParent();
            effect.geometry?.dispose();
            effect.material?.dispose();
            this.#transients.delete(effect);
        });

        this.#sparkPool.update(reducedDelta);
        this.#smokePool.update(reducedDelta);
    }

    /**
     * Propagates the current screen-space scale so particle sizes stay stable.
     *
     * @param {number} pixelsPerUnit Canvas pixels covered by one world unit.
     */
    setPixelsPerUnit(pixelsPerUnit) {
        this.#sparkPool.setPixelsPerUnit(pixelsPerUnit);
        this.#smokePool.setPixelsPerUnit(pixelsPerUnit);
    }

    /**
     * Returns projectile engine/world pairs for browser fidelity checks.
     *
     * @returns {Array<Record<string, number|string>>} Read-only diagnostic values.
     */
    getDebugSnapshot() {
        return Array.from(this.#projectiles.values(), ({ object, state, to }) => ({
            id: state.id,
            type: state.type,
            engineX: Number(state.x),
            engineY: Number(state.y),
            worldX: to?.x ?? object.position.x,
            worldZ: to?.z ?? object.position.z,
            heading: Number(state.head),
            rotation: object.rotation.y,
        }));
    }

    /** Releases every remaining projectile, transient and pooled resource. */
    destroy() {
        this.#projectiles.forEach(({ object, resources, trail }) => {
            if (trail) trail.removeFromParent();
            object.removeFromParent();
            resources.forEach((resource) => resource.dispose());
        });
        this.#projectiles.clear();
        this.#transients.forEach((effect) => {
            effect.object.removeFromParent();
            effect.geometry?.dispose();
            effect.material?.dispose();
        });
        this.#transients.clear();
        this.#damageTotals.clear();
        this.#sparkPool.dispose();
        this.#smokePool.dispose();
        this.#slashArcGeometry.dispose();
        this.#slashArcMaterial.dispose();
    }
}
