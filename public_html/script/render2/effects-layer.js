import { ACTIONS, headingToRadians, toArenaPosition } from './battle-state.js';
import { getGladiatorAppearance, getPotionEffect } from './gladiator-appearance.js';

/**
 * Owns exact-position projectiles and short-lived Three.js combat effects.
 */
export class BattleEffectsLayer {
    #THREE;
    #audio;
    #damageTotals = new Map();
    #projectiles = new Map();
    #scene;
    #transients = new Set();

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene, audio: import('./audio-manager.js').BattleAudioManager }} options Effect dependencies.
     */
    constructor({ THREE, scene, audio }) {
        this.#THREE = THREE;
        this.#scene = scene;
        this.#audio = audio;
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
     * Creates a projectile mesh for one of the three engine projectile types.
     *
     * @param {Record<string, unknown>} projectile Projectile state.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     * @returns {{ object: import('three').Object3D, resources: Array<{ dispose(): void }> }} Projectile resources.
     */
    #createProjectile(projectile, viewsById) {
        const THREE = this.#THREE;
        const type = Number(projectile.type);
        const resources = [];
        let object;

        if (type === 1) {
            const geometry = new THREE.IcosahedronGeometry(0.23, 1);
            const material = new THREE.MeshStandardMaterial({
                color: 0xff8b2e,
                emissive: 0xff4b1f,
                emissiveIntensity: 1.6,
                roughness: 0.22,
            });
            resources.push(geometry, material);
            object = new THREE.Mesh(geometry, material);
            const light = new THREE.PointLight(0xff5a2b, 1.2, 3.2);
            object.add(light);
        }
        else {
            const owner = viewsById.get(String(projectile.owner));
            const assassinate = Number(owner?.state?.action) === ACTIONS.assassinate;
            const color = assassinate ? 0xff334f : type === 2 ? 0x62ef70 : 0xe6d2a1;
            const geometry = new THREE.ConeGeometry(0.075, 0.82, 6);
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: type === 2 || assassinate ? 0.65 : 0.12,
                roughness: 0.5,
                metalness: 0.3,
            });
            resources.push(geometry, material);
            object = new THREE.Mesh(geometry, material);
            object.rotation.x = -Math.PI / 2;
        }

        object.castShadow = true;
        this.#scene.add(object);
        return { object, resources };
    }

    /**
     * Synchronizes visible projectiles with the current complete replay frame.
     *
     * @param {Array<Record<string, unknown>>} projectiles Current projectiles.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     */
    updateProjectiles(projectiles, viewsById) {
        const activeKeys = new Set();
        projectiles.forEach((projectile) => {
            const key = this.#projectileKey(projectile);
            activeKeys.add(key);
            let item = this.#projectiles.get(key);
            if (!item) {
                item = this.#createProjectile(projectile, viewsById);
                this.#projectiles.set(key, item);
            }

            item.state = projectile;
            const position = toArenaPosition({ x: projectile.x, y: projectile.y }, 1.05);
            item.object.position.set(position.x, position.y, position.z);
            item.object.rotation.y = headingToRadians(projectile.head);
        });

        this.#projectiles.forEach((item, key) => {
            if (activeKeys.has(key)) return;
            item.object.removeFromParent();
            item.resources.forEach((resource) => resource.dispose());
            this.#projectiles.delete(key);
        });
    }

    /**
     * Adds a pulsing ring at an authoritative arena position.
     *
     * @param {{ x: number, y: number, z: number }} position World position.
     * @param {number} color Effect color.
     * @param {number} [size=1] Final scale multiplier.
     * @param {number} [duration=0.65] Lifetime in seconds.
     */
    #addRing(position, color, size = 1, duration = 0.65) {
        const THREE = this.#THREE;
        const geometry = new THREE.TorusGeometry(0.32, 0.06, 8, 30);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(position.x, position.y + 0.12, position.z);
        this.#scene.add(mesh);
        this.#transients.add({
            object: mesh,
            geometry,
            material,
            startedAt: performance.now() / 1000,
            duration,
            size,
            kind: 'ring',
        });
    }

    /**
     * Adds an expanding impact sphere at an engine position.
     *
     * @param {Record<string, unknown>} projectile Last projectile frame.
     * @param {number} color Explosion color.
     */
    #addImpact(projectile, color) {
        const THREE = this.#THREE;
        const position = toArenaPosition({ x: projectile.x, y: projectile.y }, 0.75);
        const geometry = new THREE.IcosahedronGeometry(0.38, 1);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        this.#scene.add(mesh);
        this.#transients.add({
            object: mesh,
            geometry,
            material,
            startedAt: performance.now() / 1000,
            duration: 0.55,
            size: 5,
            kind: 'sphere',
        });
    }

    /**
     * Handles one-shot events while continuous state remains in the views.
     *
     * @param {Array<Record<string, unknown>>} events Derived step events.
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} viewsById Gladiator lookup.
     * @param {import('./dom-overlay.js').BattleDomOverlay} overlay DOM overlay.
     * @param {{ text?: boolean, sound?: { sfx?: number } }} preferences User preferences.
     */
    handleEvents(events, viewsById, overlay, preferences) {
        const volume = Number(preferences.sound?.sfx) || 0;

        events.forEach((event) => {
            const view = viewsById.get(String(event.gladId));

            if (event.type === 'damage' && view) {
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
                this.#addRing(view.root.position, 0xffe66d, 3.2, 0.9);
                this.#audio.playEffect('lvlup', volume);
            }
            else if (event.type === 'death' && view) {
                const appearance = getGladiatorAppearance(view.state);
                this.#audio.playEffect(appearance.gender === 'female' ? 'death_female' : 'death_male', volume);
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
            this.#addRing(view.root.position, 0x62d8ff, 2.8, 0.72);
        }
        else if (action === ACTIONS.block) {
            this.#addRing(view.root.position, 0xffdf62, 2.1, 0.5);
        }
        else if (action === ACTIONS.ambush || action === ACTIONS.assassinate) {
            this.#addRing(view.root.position, 0xd44bff, 2.5, 0.55);
        }
        else if (action === ACTIONS.potion) {
            const effect = getPotionEffect(event.code);
            if (!effect) return;
            const color = { heal: 0x4fe06e, mana: 0x4f84ff, tonic: 0xffb84f, elixir: 0xc36cff }[effect];
            this.#addRing(view.root.position, color, 2.7, 0.8);
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
                this.#audio.playEffect('stun', volume);
            }
            if (resistStarted && view) {
                this.#audio.playEffect('block', volume);
            }
        });
    }

    /**
     * Advances transient effect opacity/scale and projectile pulse.
     *
     * @param {number} elapsedSeconds Animation time in seconds.
     */
    animate(elapsedSeconds) {
        this.#projectiles.forEach(({ object }) => {
            if (object.material?.emissiveIntensity !== undefined) {
                object.material.emissiveIntensity = 1.25 + Math.sin(elapsedSeconds * 12) * 0.35;
            }
        });

        this.#transients.forEach((effect) => {
            const progress = Math.min(1, (elapsedSeconds - effect.startedAt) / effect.duration);
            const scale = 0.35 + progress * effect.size;
            effect.object.scale.setScalar(scale);
            effect.material.opacity = (1 - progress) * 0.9;
            if (progress < 1) return;
            effect.object.removeFromParent();
            effect.geometry.dispose();
            effect.material.dispose();
            this.#transients.delete(effect);
        });
    }

    /**
     * Returns projectile engine/world pairs for browser fidelity checks.
     *
     * @returns {Array<Record<string, number|string>>} Read-only diagnostic values.
     */
    getDebugSnapshot() {
        return Array.from(this.#projectiles.values(), ({ object, state }) => ({
            id: state.id,
            type: state.type,
            engineX: Number(state.x),
            engineY: Number(state.y),
            worldX: object.position.x,
            worldZ: object.position.z,
            heading: Number(state.head),
            rotation: object.rotation.y,
        }));
    }

    /** Releases every remaining projectile and transient resource. */
    destroy() {
        this.#projectiles.forEach(({ object, resources }) => {
            object.removeFromParent();
            resources.forEach((resource) => resource.dispose());
        });
        this.#projectiles.clear();
        this.#transients.forEach((effect) => {
            effect.object.removeFromParent();
            effect.geometry.dispose();
            effect.material.dispose();
        });
        this.#transients.clear();
        this.#damageTotals.clear();
    }
}
