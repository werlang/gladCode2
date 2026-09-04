import { ACTIONS, headingToRadians, isOutsideSafeZone, lerp, lerpAngle, toArenaPosition } from './battle-state.js';
import { getGladiatorAppearance } from './gladiator-appearance.js';
import { hashIdentity } from './synty-hero-config.js';
import { applyHitReaction, blendHeroPoses, getHeroActionDuration, sampleHeroPose } from './synty-hero-animation.js';

/** Seconds an attack-recoil overlay stays visible when no clip library exists. */
const HIT_REACTION_SECONDS = 0.34;
/** Damage above which a hit reaction upgrades to the heavier stagger clip. */
const STAGGER_DAMAGE_THRESHOLD = 22;
/** World units per second treated as the reference locomotion cadence. */
const REFERENCE_SPEED = 3;
/** Looping guard idles that give each fighter a persistent silhouette. */
const IDLE_CLIPS = ['idle', 'idleMenacing', 'idleEnergetic', 'idleFlourish'];

/** Clip keys that play once instead of looping. */
const ONE_SHOT_CLIPS = new Set([
    'hitF', 'hitB', 'hitL', 'hitR',
    'staggerF', 'staggerB', 'staggerL', 'staggerR',
    'deathF', 'deathB', 'deathL', 'deathR',
]);

/**
 * Three.js representation of one engine-controlled gladiator.
 *
 * Fighters play real Synty skeletal clips through an AnimationMixer whenever a
 * clip exists for their state, and fall back to the hand-authored procedural
 * pose system for actions the packs do not cover (casting, teleporting,
 * drinking, archery). Engine positions stay authoritative: rendering bridges
 * the two latest replay frames on the shared replay clock.
 */
export class GladiatorView {
    #THREE;
    #accentMaterial;
    #activeAction = null;
    #actionStartTime = 0;
    #animationLibrary = null;
    #appearance;
    #armorMaterial;
    #baseArmorColor;
    #baseOpacities = new Map();
    #body;
    #buffEmissive;
    #buffIntensity = 0;
    #clipActions = new Map();
    #currentClipKey = null;
    #currentPose = null;
    #deathClipKey = null;
    #deathStartedAt = null;
    #displayedAlpha = 1;
    #flashColor = null;
    #fromPlacement = null;
    #heroController = null;
    #hitClipKey = null;
    #hitReactionStart = null;
    #hitUntil = 0;
    #idleClipKey = 'idle';
    #arsenal = null;
    #index;
    #lastGroundSpeed = 1;
    #materials = [];
    #mixer = null;
    #model;
    #observedAction = null;
    #root;
    #shield;
    #state;
    #statusRing;
    #stunStars;
    #toPlacement = null;
    #tracker;
    #transitionFromPose = null;
    #usesSyntyHero = false;
    #weaponPivot;

    /**
     * @param {{ THREE: typeof import('three'), tracker: import('./resource-tracker.js').ResourceTracker, heroAssets?: import('./synty-hero-assets.js').SyntyHeroAssets|null, animationLibrary?: import('./animation-library.js').SyntyAnimationLibrary|null, gladiator: Record<string, unknown>, index: number }} options View dependencies.
     */
    constructor({ THREE, tracker, heroAssets = null, animationLibrary = null, gladiator, index }) {
        this.#THREE = THREE;
        this.#tracker = tracker;
        this.#index = index;
        this.#animationLibrary = animationLibrary;
        this.#appearance = getGladiatorAppearance(gladiator);
        this.#root = tracker.track(new THREE.Group());
        this.#root.name = `gladiator-${gladiator.id ?? index}`;
        this.#model = tracker.track(new THREE.Group());
        this.#root.add(this.#model);
        // A persistent per-fighter guard idle keeps the crowd varied without
        // extra state: hash the stable identity over the available idles.
        const idleHash = hashIdentity(`${gladiator.user ?? ''}:${gladiator.name ?? ''}`);
        this.#idleClipKey = IDLE_CLIPS[idleHash % IDLE_CLIPS.length];
        this.#buildModel(heroAssets, gladiator);
        this.setState(gladiator, 17.68, 0);
    }

    /** @returns {import('three').Group} Root object placed on the arena plane. */
    get root() {
        return this.#root;
    }

    /** @returns {Record<string, unknown>} Latest complete gladiator state. */
    get state() {
        return this.#state;
    }

    /**
     * @returns {{ x: number, z: number, heading: number }} Placement the fighter
     *          settles on once the current replay frame finishes interpolating.
     */
    get settledPlacement() {
        return {
            x: this.#toPlacement?.x ?? this.#root.position.x,
            z: this.#toPlacement?.z ?? this.#root.position.z,
            heading: this.#toPlacement?.heading ?? this.#root.rotation.y,
        };
    }

    /** Registers a material for opacity and teardown handling. */
    #registerMaterial(material) {
        this.#tracker.track(material);
        if (!this.#materials.includes(material)) this.#materials.push(material);
        if (!this.#baseOpacities.has(material)) this.#baseOpacities.set(material, material.opacity);
        return material;
    }

    /** Creates a tracked mesh inside the requested model parent. */
    #mesh(geometry, material, parent = this.#model) {
        this.#tracker.track(geometry);
        this.#registerMaterial(material);
        const mesh = this.#tracker.track(new this.#THREE.Mesh(geometry, material));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    /** Builds shared markers, an asset-backed hero, and gameplay-status props. */
    #buildModel(heroAssets, gladiator) {
        const THREE = this.#THREE;
        this.#accentMaterial = new THREE.MeshStandardMaterial({
            color: this.#appearance.accentColor,
            emissive: this.#appearance.accentColor,
            emissiveIntensity: 0.18,
            roughness: 0.56,
            metalness: 0.22,
        });

        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.28,
            depthWrite: false,
        });
        const shadow = this.#mesh(new THREE.CircleGeometry(0.58, 24), shadowMaterial, this.#root);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.018;
        shadow.castShadow = false;
        shadow.receiveShadow = false;

        this.#statusRing = this.#mesh(new THREE.TorusGeometry(0.52, 0.05, 8, 40), this.#accentMaterial, this.#root);
        this.#statusRing.rotation.x = Math.PI / 2;
        this.#statusRing.position.y = 0.06;
        this.#statusRing.castShadow = false;

        // Flat ground chevron pointing along the fighter's heading.
        const chevronShape = new THREE.Shape();
        chevronShape.moveTo(0, 0.17);
        chevronShape.lineTo(0.12, -0.09);
        chevronShape.lineTo(0, -0.035);
        chevronShape.lineTo(-0.12, -0.09);
        chevronShape.closePath();
        const chevron = this.#mesh(
            new THREE.ShapeGeometry(chevronShape),
            new THREE.MeshBasicMaterial({
                color: this.#appearance.accentColor,
                transparent: true,
                opacity: 0.62,
                depthWrite: false,
            }),
            this.#root,
        );
        chevron.rotation.x = -Math.PI / 2;
        chevron.position.set(0, 0.03, -0.82);
        chevron.castShadow = false;
        chevron.receiveShadow = false;

        let builtFromPack = false;
        if (heroAssets) {
            try {
                this.#buildSyntyHero(heroAssets, gladiator);
                builtFromPack = true;
            }
            catch (error) {
                console.warn(`Synty hero fallback for ${gladiator.name ?? gladiator.id ?? this.#index}.`, error);
            }
        }
        if (!builtFromPack) this.#buildProceduralHero();

        const shieldMaterial = new THREE.MeshStandardMaterial({
            color: 0xf6df72,
            emissive: 0xe2b83f,
            emissiveIntensity: 0.55,
            transparent: true,
            opacity: 0.72,
            roughness: 0.35,
            metalness: 0.4,
            side: THREE.DoubleSide,
        });
        this.#shield = this.#mesh(new THREE.CircleGeometry(0.68, 28), shieldMaterial);
        this.#shield.position.set(0, 1.18, -0.48);
        this.#shield.rotation.x = -0.2;
        this.#shield.visible = false;

        this.#stunStars = this.#tracker.track(new THREE.Group());
        this.#model.add(this.#stunStars);
        for (let index = 0; index < 3; index += 1) {
            const star = this.#mesh(
                new THREE.OctahedronGeometry(0.1, 0),
                new THREE.MeshBasicMaterial({ color: 0xffe66d }),
                this.#stunStars,
            );
            const angle = index / 3 * Math.PI * 2;
            star.position.set(Math.cos(angle) * 0.42, 2.38, Math.sin(angle) * 0.42);
        }
        this.#stunStars.visible = false;
    }

    /** Uses the real modular meshes, skeleton, atlas, and rigid weapon assets. */
    #buildSyntyHero(heroAssets, gladiator) {
        const hero = heroAssets.createHero(gladiator, this.#appearance);
        this.#heroController = hero;
        this.#arsenal = hero.weapons ?? null;
        this.#usesSyntyHero = true;
        this.#tracker.track(hero.object);
        this.#model.add(hero.object);
        this.#body = hero.object;
        this.#armorMaterial = this.#registerMaterial(hero.material);
        this.#baseArmorColor = new this.#THREE.Color(0xffffff);

        if (this.#animationLibrary && this.#animationLibrary.size > 0) {
            this.#mixer = new this.#THREE.AnimationMixer(hero.object);
        }

        if (!this.#arsenal?.melee) {
            this.#weaponPivot = this.#tracker.track(new this.#THREE.Group());
            const darkMaterial = new this.#THREE.MeshStandardMaterial({ color: 0x392b22, roughness: 0.82 });
            this.#buildWeapon(darkMaterial);
            hero.rig.attachEquipment(this.#THREE, this.#weaponPivot, hero.contentScale, {
                handName: 'Hand_L',
                rotation: [0, -Math.PI / 2, 0],
            });
        }
    }

    /**
     * Shows the weapon the current action calls for: bow while shooting,
     * blade while swinging, bare hands while casting, and the fighter's
     * primary weapon the rest of the time.
     *
     * @param {number} action Engine action id.
     */
    #syncWeaponVisibility(action) {
        const arsenal = this.#arsenal;
        if (!arsenal) return;

        let active = arsenal.primary;
        if (action === ACTIONS.ranged && arsenal.ranged) active = 'ranged';
        else if ((action === ACTIONS.melee || action === ACTIONS.assassinate) && arsenal.melee) active = 'melee';
        else if (action === ACTIONS.fireball) active = 'none';

        if (arsenal.melee) arsenal.melee.visible = active === 'melee';
        if (arsenal.ranged) arsenal.ranged.visible = active === 'ranged';
        if (arsenal.staff) arsenal.staff.visible = active === 'staff';
        if (arsenal.shield) arsenal.shield.visible = active === 'melee';
    }

    /** Retains the prior geometry as a graceful fallback for missing assets. */
    #buildProceduralHero() {
        const THREE = this.#THREE;
        const skinMaterial = new THREE.MeshStandardMaterial({ color: this.#appearance.skinColor, roughness: 0.78 });
        this.#armorMaterial = new THREE.MeshStandardMaterial({
            color: this.#appearance.armorColor,
            roughness: this.#appearance.armor === 'gold' ? 0.36 : 0.68,
            metalness: this.#appearance.armor === 'gold' || this.#appearance.armor === 'metal' ? 0.58 : 0.08,
        });
        this.#baseArmorColor = new THREE.Color(this.#appearance.armorColor);
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x282b2e, roughness: 0.82 });
        const hairMaterial = new THREE.MeshStandardMaterial({ color: this.#appearance.hairColor, roughness: 0.92 });

        const legs = [-0.18, 0.18].map((x) => {
            const leg = this.#mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.66, 7), darkMaterial);
            leg.position.set(x, 0.55, 0);
            return leg;
        });
        legs[0].rotation.z = -0.04;
        legs[1].rotation.z = 0.04;

        this.#body = this.#mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.78, 8), this.#armorMaterial);
        this.#body.position.y = 1.15;
        const shoulders = this.#mesh(new THREE.BoxGeometry(0.92, 0.2, 0.4), this.#armorMaterial);
        shoulders.position.y = 1.42;
        const head = this.#mesh(new THREE.SphereGeometry(0.27, 12, 8), skinMaterial);
        head.position.y = 1.78;
        head.scale.y = 1.08;

        if (this.#appearance.hasHelmet) {
            const helmet = this.#mesh(new THREE.ConeGeometry(0.34, 0.45, 8), this.#armorMaterial);
            helmet.position.y = 2.04;
        }
        else {
            const hair = this.#mesh(new THREE.SphereGeometry(0.285, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMaterial);
            hair.position.y = 1.86;
        }

        this.#weaponPivot = this.#tracker.track(new THREE.Group());
        this.#weaponPivot.position.set(0.47, 1.34, -0.02);
        this.#model.add(this.#weaponPivot);
        this.#buildWeapon(darkMaterial);

        if (this.#appearance.hasCape) {
            const capeMaterial = new THREE.MeshStandardMaterial({
                color: this.#appearance.accentColor,
                roughness: 0.9,
                side: THREE.DoubleSide,
            });
            const cape = this.#mesh(new THREE.PlaneGeometry(0.68, 0.92, 1, 3), capeMaterial);
            cape.position.set(0, 1.13, 0.29);
            cape.rotation.x = -0.16;
        }
    }

    /** Builds a readable fallback for bow or for unavailable weapon assets. */
    #buildWeapon(darkMaterial) {
        const THREE = this.#THREE;
        const metal = new THREE.MeshStandardMaterial({ color: 0xc7d0d5, roughness: 0.32, metalness: 0.72 });

        if (this.#appearance.weapon === 'bow') {
            const bow = this.#mesh(
                new THREE.TorusGeometry(0.36, 0.035, 6, 18, Math.PI),
                new THREE.MeshStandardMaterial({ color: 0x7a4f2c, roughness: 0.82 }),
                this.#weaponPivot,
            );
            bow.rotation.z = Math.PI / 2;
            bow.rotation.y = Math.PI / 2;
            const arrow = this.#mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 5), darkMaterial, this.#weaponPivot);
            arrow.rotation.x = Math.PI / 2;
            arrow.position.z = -0.18;
            return;
        }

        if (this.#appearance.weapon === 'spear' || this.#appearance.weapon === 'staff') {
            const shaft = this.#mesh(
                new THREE.CylinderGeometry(0.035, 0.04, 1.55, 7),
                this.#appearance.weapon === 'staff' ? this.#accentMaterial : darkMaterial,
                this.#weaponPivot,
            );
            shaft.position.y = -0.2;
            if (this.#appearance.weapon === 'spear') {
                const tip = this.#mesh(new THREE.ConeGeometry(0.1, 0.32, 7), metal, this.#weaponPivot);
                tip.position.y = 0.72;
            }
            this.#weaponPivot.rotation.z = -0.42;
            return;
        }

        const handle = this.#mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.45, 7), darkMaterial, this.#weaponPivot);
        handle.position.y = -0.18;
        const blade = this.#mesh(new THREE.BoxGeometry(0.09, 0.78, 0.035), metal, this.#weaponPivot);
        blade.position.y = 0.39;
        this.#weaponPivot.rotation.z = -0.34;
    }

    /**
     * Applies a complete simlog state as the next interpolation target.
     *
     * @param {Record<string, unknown>} gladiator Complete gladiator frame.
     * @param {number} safeRadius Current poison boundary radius.
     * @param {number} simulationTime Replay timestamp of the frame.
     */
    setState(gladiator, safeRadius, simulationTime = 0) {
        const wasAlive = !this.#state || Number(this.#state.hp) > 0;
        const previous = this.#state;
        this.#state = gladiator;

        const position = toArenaPosition({ x: gladiator.x, y: gladiator.y });
        const target = { x: position.x, z: position.z, heading: headingToRadians(gladiator.head), simtime: Number(simulationTime) || 0 };

        if (this.#toPlacement) {
            const deltaTime = Math.max(target.simtime - this.#toPlacement.simtime, 0.001);
            const distance = Math.hypot(target.x - this.#toPlacement.x, target.z - this.#toPlacement.z);
            const instantSpeed = Math.min(Math.max(distance / deltaTime / REFERENCE_SPEED, 0.45), 2.1);
            // Quantized replay positions make the instant estimate jitter; a
            // short exponential average keeps the walk/run cadence steady.
            this.#lastGroundSpeed = this.#lastGroundSpeed === 1
                ? instantSpeed
                : lerp(this.#lastGroundSpeed, instantSpeed, 0.35);
        }

        const jumped = !this.#toPlacement
            || Math.abs(target.simtime - this.#toPlacement.simtime) > 0.45
            || target.simtime <= this.#toPlacement.simtime;
        this.#fromPlacement = jumped ? target : this.#currentVisualPlacement();
        this.#toPlacement = target;
        if (jumped) this.#applyPlacement(1);

        const buffs = gladiator.buffs ?? {};
        const isAlive = Number(gladiator.hp) > 0;
        const isInvisible = Number(buffs.invisible?.timeleft) > 0.1;
        const isBurning = Number(buffs.burn?.timeleft) > 0.1;
        const isResistant = Number(buffs.resist?.timeleft) > 0.1;
        const isPoisoned = isOutsideSafeZone(gladiator, safeRadius);

        if (isAlive) {
            this.#deathStartedAt = null;
            this.#deathClipKey = null;
            this.#model.rotation.set(0, 0, 0);
            this.#model.position.set(this.#model.position.x, 0, this.#model.position.z);
            this.#accentMaterial.opacity = this.#baseOpacities.get(this.#accentMaterial) ?? 1;
            this.#accentMaterial.transparent = (this.#baseOpacities.get(this.#accentMaterial) ?? 1) < 1;
        }
        else if (wasAlive) {
            this.#deathStartedAt = Number(simulationTime) || 0;
            // Deterministic collapse direction per fighter.
            const directions = ['F', 'B', 'L', 'R'];
            this.#deathClipKey = `death${directions[this.#index % directions.length]}`;
        }
        this.#shield.visible = isAlive && isResistant;
        this.#stunStars.visible = isAlive && Number(buffs.stun?.timeleft) > 0.1;

        this.#materials.forEach((material) => {
            if (!('transparent' in material)) return;
            const baseOpacity = this.#baseOpacities.get(material) ?? 1;
            material.transparent = isInvisible || baseOpacity < 1;
            material.opacity = isInvisible ? baseOpacity * 0.32 : baseOpacity;
        });

        this.#buffEmissive = new this.#THREE.Color(0x000000);
        this.#buffIntensity = 0;
        if (isBurning) {
            this.#buffEmissive.setHex(0xff6b35);
            this.#buffIntensity = 0.72;
        }
        else if (isPoisoned) {
            this.#buffEmissive.setHex(0x48d85d);
            this.#buffIntensity = 0.55;
        }
        else if (isResistant) {
            this.#buffEmissive.setHex(0xffd84f);
            this.#buffIntensity = 0.48;
        }
        this.#armorMaterial.emissive.copy(this.#buffEmissive);
        this.#armorMaterial.emissiveIntensity = this.#buffIntensity;

        if (previous && Number(previous.action) !== Number(gladiator.action)
            && Number(gladiator.hp) > 0
            && [ACTIONS.melee, ACTIONS.assassinate].includes(Number(gladiator.action))) {
            this.#startAction(Number(gladiator.action), Number(simulationTime) || 0);
        }
    }

    /**
     * Starts a short recoil overlay after the fighter takes damage.
     *
     * @param {number} _simulationTime Current replay timestamp.
     * @param {number} [damageAmount] HP lost by this hit; large hits stagger.
     */
    playHitReaction(_simulationTime = 0, damageAmount = 0) {
        if (Number(this.#state?.hp) <= 0) return;
        const directions = ['F', 'B', 'L', 'R'];
        const direction = directions[this.#index % directions.length];
        const key = Number(damageAmount) >= STAGGER_DAMAGE_THRESHOLD
            ? `stagger${direction}`
            : `hit${direction}`;
        const fallbackKey = Number(damageAmount) >= STAGGER_DAMAGE_THRESHOLD ? `hit${direction}` : null;
        const clip = this.#animationLibrary?.get(key) ?? (fallbackKey ? this.#animationLibrary?.get(fallbackKey) : null);
        if (clip) {
            const usedKey = this.#animationLibrary.has(key) ? key : fallbackKey;
            this.#hitClipKey = usedKey;
            this.#hitUntil = performance.now() + clip.duration * 1000 / 1.25 + 40;
            this.#currentClipKey = null; // force the mixer to switch immediately
            return;
        }
        // Procedural fallback overlay.
        this.#hitReactionStart = Number(_simulationTime) || 0;
    }

    /**
     * Blends the two most recent targets into the rendered placement.
     *
     * @param {number} alpha Progress from the previous target to the current one.
     */
    #applyPlacement(alpha) {
        const from = this.#fromPlacement;
        const to = this.#toPlacement;
        this.#root.position.set(
            lerp(from.x, to.x, alpha),
            this.#root.position.y,
            lerp(from.z, to.z, alpha),
        );
        this.#root.rotation.y = lerpAngle(from.heading, to.heading, alpha);
    }

    /** @returns {{ x: number, z: number, heading: number, simtime: number }} Placement currently displayed. */
    #currentVisualPlacement() {
        const from = this.#fromPlacement ?? this.#toPlacement;
        const to = this.#toPlacement;
        return {
            x: lerp(from.x, to.x, this.#displayedAlpha),
            z: lerp(from.z, to.z, this.#displayedAlpha),
            heading: lerpAngle(from.heading, to.heading, this.#displayedAlpha),
            simtime: to.simtime,
        };
    }

    /**
     * Picks the clip that represents the fighter's current state.
     *
     * Clips cover the states where packaged animation reads well (guard
     * idles, block, hits, stuns, deaths). Locomotion and attacks are handled
     * by the procedural pose system, which stays speed-true and readable
     * from the top-down camera.
     *
     * @param {boolean} isAlive Whether the fighter still stands.
     * @param {boolean} stunned Whether the stun buff is active.
     * @returns {string|null} Clip key, or null to fall back to procedural posing.
     */
    #resolveClipKey(isAlive, stunned) {
        const library = this.#animationLibrary;
        if (!library) return null;
        if (!isAlive) return library.has(this.#deathClipKey) ? this.#deathClipKey : null;
        if (stunned && library.has('stun')) return 'stun';

        const now = performance.now();
        if (now < this.#hitUntil && this.#hitClipKey && library.has(this.#hitClipKey)) return this.#hitClipKey;

        const action = Number(this.#state?.action);
        if (action === ACTIONS.block && library.has('block')) return 'block';
        if (action === ACTIONS.waiting || action === ACTIONS.none) {
            if (library.has(this.#idleClipKey)) return this.#idleClipKey;
            return library.has('idle') ? 'idle' : null;
        }
        return null;
    }

    /**
     * Playback rate for a clip key.
     *
     * @param {string} key Clip key.
     * @param {import('three').AnimationClip} clip The referenced clip.
     * @returns {number} Mixer time scale.
     */
    #clipTimeScale(key, clip) {
        if (key.startsWith('hit') || key.startsWith('stagger')) return 1.25;
        return 1;
    }

    /**
     * Drives the AnimationMixer toward the resolved clip.
     *
     * @param {number} deltaSeconds Wall-clock seconds since the previous frame.
     * @param {boolean} isAlive Whether the fighter still stands.
     * @param {boolean} stunned Whether the stun buff is active.
     * @param {boolean} reducedMotion Whether ambient motion is reduced.
     * @returns {boolean} True when a clip owns the bones this frame.
     */
    #syncMixer(deltaSeconds, isAlive, stunned, reducedMotion) {
        if (!this.#mixer) return false;
        const key = reducedMotion ? (isAlive ? null : this.#deathClipKey && this.#animationLibrary.has(this.#deathClipKey) ? this.#deathClipKey : null) : this.#resolveClipKey(isAlive, stunned);

        if (!key) {
            if (this.#currentClipKey) {
                this.#clipActions.forEach((action) => action.fadeOut(0.12));
                this.#currentClipKey = null;
            }
            this.#mixer.update(deltaSeconds);
            return false;
        }

        const clip = this.#animationLibrary.get(key);
        let action = this.#clipActions.get(key);
        if (!action) {
            action = this.#mixer.clipAction(clip);
            this.#clipActions.set(key, action);
        }

        if (this.#currentClipKey !== key) {
            const previous = this.#currentClipKey ? this.#clipActions.get(this.#currentClipKey) : null;
            action.reset();
            action.setLoop(ONE_SHOT_CLIPS.has(key) ? this.#THREE.LoopOnce : this.#THREE.LoopRepeat, 1);
            action.clampWhenFinished = key.startsWith('death');
            action.timeScale = this.#clipTimeScale(key, clip);
            action.enabled = true;
            action.fadeIn(previous ? 0.16 : 0.04);
            previous?.fadeOut(0.16);
            action.play();
            this.#currentClipKey = key;
        }
        else {
            action.timeScale = this.#clipTimeScale(key, clip);
        }

        this.#mixer.update(deltaSeconds);
        return true;
    }

    /** Advances rig motion, interpolation, and status props without touching engine truth. */
    animate(simulationTime, reducedMotion = false, frameProgress = 1, deltaSeconds = 1 / 60) {
        if (!this.#state || !this.#fromPlacement || !this.#toPlacement) return;

        this.#displayedAlpha = reducedMotion ? 1 : Math.min(Math.max(frameProgress, 0), 1);
        this.#applyPlacement(this.#displayedAlpha);

        const isAlive = Number(this.#state.hp) > 0;
        const stunned = isAlive && Number(this.#state.buffs?.stun?.timeleft) > 0.1;
        if (isAlive) this.#syncWeaponVisibility(Number(this.#state.action));
        const clipOwned = this.#syncMixer(deltaSeconds, isAlive, stunned, reducedMotion);

        if (!isAlive) {
            this.#animateDeath(simulationTime, reducedMotion, clipOwned);
            return;
        }

        if (clipOwned) {
            // Clips own the bones; only the status props animate procedurally.
            const ambientTime = reducedMotion ? 0 : simulationTime;
            this.#statusRing.scale.setScalar(1 + Math.sin(ambientTime * 5.2 + this.#index) * 0.045);
            this.#shield.rotation.z = ambientTime * 0.55;
            this.#stunStars.rotation.y = ambientTime * 2.8;
            this.#model.position.x = 0;
            this.#model.position.z = 0;
            return;
        }

        const observedAction = Number(this.#state.action);
        const observedChanged = this.#observedAction !== observedAction;
        if (observedChanged && getHeroActionDuration(observedAction)) {
            this.#startAction(observedAction, simulationTime);
        }
        this.#observedAction = observedAction;

        if (this.#activeAction === null) this.#startAction(observedAction, simulationTime);
        const activeDuration = getHeroActionDuration(this.#activeAction);
        const activeTime = Math.abs(simulationTime - this.#actionStartTime);
        if (activeDuration && activeTime >= activeDuration && observedAction !== this.#activeAction) {
            this.#startAction(observedAction, simulationTime);
        }
        else if (!activeDuration && observedAction !== this.#activeAction) {
            this.#startAction(observedAction, simulationTime);
        }

        const actionTime = reducedMotion
            ? (this.#activeAction === ACTIONS.waiting || this.#activeAction === ACTIONS.none ? 0 : 0.38)
            : Math.abs(simulationTime - this.#actionStartTime);
        const targetPose = sampleHeroPose(this.#activeAction, actionTime, {
            weapon: this.#appearance.weapon,
            seed: this.#index * 0.173,
            speed: this.#lastGroundSpeed,
        });
        const transitionAmount = reducedMotion
            ? 1
            : Math.min(Math.abs(simulationTime - this.#actionStartTime) / 0.12, 1);
        let pose = this.#transitionFromPose
            ? blendHeroPoses(this.#transitionFromPose, targetPose, transitionAmount)
            : targetPose;
        if (transitionAmount >= 1) this.#transitionFromPose = null;

        const reactionProgress = this.#hitReactionStart === null
            ? 1
            : (simulationTime - this.#hitReactionStart) / HIT_REACTION_SECONDS;
        if (reactionProgress >= 0 && reactionProgress < 1) {
            pose = reducedMotion ? pose : applyHitReaction(pose, reactionProgress);
            const flash = (1 - reactionProgress) * 0.85;
            this.#armorMaterial.emissive.copy(this.#buffEmissive).lerp(this.#hitFlashColor, Math.min(flash * 1.4, 1));
            this.#armorMaterial.emissiveIntensity = this.#buffIntensity + flash;
        }
        else if (this.#hitReactionStart !== null) {
            this.#hitReactionStart = null;
            this.#armorMaterial.emissive.copy(this.#buffEmissive);
            this.#armorMaterial.emissiveIntensity = this.#buffIntensity;
        }

        this.#currentPose = pose;
        this.#heroController?.rig.applyPose(pose);
        if (this.#usesSyntyHero) {
            this.#body.position.y = pose.body.y;
            this.#body.rotation.x = pose.body.z;
            this.#body.rotation.z = pose.body.x;
        }
        else {
            this.#model.position.y = pose.body.y;
            this.#body.rotation.x = pose.body.x;
            if (this.#weaponPivot) {
                this.#weaponPivot.rotation.z = -0.34 + pose.weapon.emphasis * 0.8;
            }
        }
        this.#model.position.x = pose.lunge.side;
        this.#model.position.z = -pose.lunge.forward;

        const ambientTime = reducedMotion ? 0 : simulationTime;
        this.#statusRing.scale.setScalar(1 + Math.sin(ambientTime * 5.2 + this.#index) * 0.045);
        this.#shield.rotation.z = ambientTime * 0.55;
        this.#stunStars.rotation.y = ambientTime * 2.8;
    }

    /** Warm tint used while the damage flash decays. */
    get #hitFlashColor() {
        if (!this.#flashColor) this.#flashColor = new this.#THREE.Color(0xff3b30);
        return this.#flashColor;
    }

    /** Starts one action without discarding the outgoing blended pose. */
    #startAction(action, simulationTime) {
        this.#transitionFromPose = this.#currentPose;
        this.#activeAction = action;
        this.#actionStartTime = Number(simulationTime) || 0;
    }

    /**
     * Animates the collapse. Clip-driven deaths freeze in the authored pose;
     * the procedural fallback tips the model over.
     *
     * @param {number} simulationTime Replay timestamp.
     * @param {boolean} reducedMotion Whether ambient motion is reduced.
     * @param {boolean} clipOwned Whether a death clip owns the bones.
     */
    #animateDeath(simulationTime, reducedMotion, clipOwned) {
        this.#model.position.x = 0;
        this.#model.position.z = 0;
        if (clipOwned) {
            this.#accentMaterial.opacity = 0.45;
            this.#accentMaterial.transparent = true;
            return;
        }
        if (this.#deathStartedAt === null) this.#deathStartedAt = simulationTime;
        const linear = reducedMotion
            ? 1
            : Math.min(Math.abs(simulationTime - this.#deathStartedAt) / 0.72, 1);
        const eased = 1 - (1 - linear) ** 3;
        const settleBounce = linear < 1
            ? Math.sin(linear * Math.PI) * 0.06 * (1 - linear)
            : 0;
        this.#model.rotation.x = Math.PI / 2 * eased;
        this.#model.position.y = 0.22 * eased + settleBounce;
        const fade = 1 - eased * 0.55;
        this.#statusRing.scale.setScalar(1 + eased * 0.35);
        this.#accentMaterial.opacity = fade;
        this.#accentMaterial.transparent = fade < 1;
    }

    /** @returns {import('three').Vector3} World-space label anchor. */
    getWorldAnchor() {
        return this.#root.localToWorld(new this.#THREE.Vector3(0, 2.65, 0));
    }

    /** Releases per-fighter resources before shared asset teardown. */
    destroy() {
        this.#mixer?.stopAllAction();
        this.#heroController?.dispose();
    }
}
