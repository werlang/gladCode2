import { ACTIONS, headingToRadians, isOutsideSafeZone, lerp, lerpAngle, toArenaPosition } from './battle-state.js';
import { getGladiatorAppearance } from './gladiator-appearance.js';
import { hashIdentity } from './synty-hero-config.js';
import {
    STRIDE_SECONDS,
    applyHitReaction,
    blendHeroPoses,
    blendHeroPosesEased,
    getHeroActionDuration,
    sampleHeroPose,
    sampleMovementPhase,
} from './synty-hero-animation.js';

/** Seconds an attack-recoil overlay stays visible when no clip library exists. */
const HIT_REACTION_SECONDS = 0.34;
/** Damage above which a hit reaction upgrades to the heavier stagger clip. */
const STAGGER_DAMAGE_THRESHOLD = 22;
/** World units per second treated as the reference locomotion cadence. */
const REFERENCE_SPEED = 3;
/** Looping guard idles that give each fighter a persistent silhouette. */
const IDLE_CLIPS = ['idle', 'idleMenacing', 'idleEnergetic', 'idleFlourish'];

/** Blend out of a finished swing into the next pose (seconds of replay time). */
const BLEND_SECONDS_ATTACK = 0.16;
/** Blend into a swing or between locomotion and idle (seconds of replay time). */
const BLEND_SECONDS_SMOOTH = 0.22;

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
 * drinking, archery, locomotion, attacks). Engine positions stay authoritative:
 * rendering bridges the two latest replay frames on the shared replay clock.
 *
 * Weapon contract: fighters carry their last-used weapon. Ranged attacks swap
 * to the bow instantly at the moment of the shot, melee/assassinate swaps to
 * the blade instantly at the moment of the swing, and every other action keeps
 * whatever is already equipped — so shooting and slashing never cut frames by
 * hiding the weapon mid-swing.
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
    #equippedSlot = null;
    #primarySlot = 'melee';
    #fallbackWeapons = new Map();
    #proceduralArsenal = new Map();
    #index;
    #lastGroundSpeed = 1;
    #stridePhase = 0;
    #lastStrideSimTime = null;
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
    #transitionDuration = BLEND_SECONDS_SMOOTH;
    #usesSyntyHero = false;
    #weaponPivot;
    #weaponPivotBaseRotation = -0.34;

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
        // Phase-offset locomotion so same-seed fighters never march in sync.
        this.#stridePhase = (idleHash % 100) / 100 * Math.PI * 2;
        this.#buildModel(heroAssets, gladiator);
        this.setState(gladiator, 17.68, 0);
        // Visual layer starts equipped with the primary weapon.
        if (!this.#equippedSlot) this.#equippedSlot = this.#primarySlot;
        this.#applyWeaponVisibility();
    }

    /** @returns {import('three').Group} Root object placed on the arena plane. */
    get root() {
        return this.#root;
    }

    /** @returns {Record<string, unknown>} Latest complete gladiator state. */
    get state() {
        return this.#state;
    }

    /** @returns {string} Currently equipped weapon slot (for probes). */
    get equippedSlot() {
        return this.#equippedSlot ?? this.#primarySlot;
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
        this.#primarySlot = hero.weapons?.primary ?? this.#primaryFromAppearance();
        this.#equippedSlot = this.#primarySlot;
        this.#usesSyntyHero = true;
        this.#tracker.track(hero.object);
        this.#model.add(hero.object);
        this.#body = hero.object;
        this.#armorMaterial = this.#registerMaterial(hero.material);
        this.#baseArmorColor = new this.#THREE.Color(0xffffff);

        if (this.#animationLibrary && this.#animationLibrary.size > 0) {
            this.#mixer = new this.#THREE.AnimationMixer(hero.object);
        }

        this.#ensureFallbackArsenal(hero);
        this.#applyWeaponVisibility();
    }

    /** Derives the idle weapon slot from the skin contract. */
    #primaryFromAppearance() {
        const families = this.#appearance.families ?? {};
        if (families.melee || families.spear) return 'melee';
        if (families.bow) return 'ranged';
        if (families.staff || families.magic) return 'staff';
        return 'melee';
    }

    /**
     * Guarantees every needed slot renders even when Synty FBXs are absent.
     * Missing packs resolve to a same-family procedural weapon mounted on the
     * correct hand, so fighters never fight empty-handed and visibility swaps
     * never cut to nothing mid-swing.
     */
    #ensureFallbackArsenal(hero) {
        const families = this.#appearance.families ?? {};
        const needsMelee = true;
        const needsRanged = Boolean(families.bow);
        const needsStaff = Boolean(families.staff || families.magic) || this.#primarySlot === 'staff';
        const needsShield = this.#primarySlot === 'melee' && !families.spear;

        if (needsMelee && !this.#arsenal?.melee) {
            const family = families.spear ? 'spear' : 'sword';
            const fallback = this.#createFallbackWeapon(family);
            if (fallback) {
                this.#fallbackWeapons.set('melee', fallback);
                hero.rig.attachEquipment(this.#THREE, fallback, hero.contentScale, {
                    handName: 'Hand_R',
                    rotation: families.spear ? [0.32, 0, -Math.PI / 2] : [0.32, 0, Math.PI / 2],
                });
                fallback.position.y = families.spear ? 0.3 : 0.26;
                if (this.#arsenal) this.#arsenal.melee = fallback;
                else this.#arsenal = { melee: fallback, ranged: null, staff: null, shield: null, primary: this.#primarySlot };
            }
        }
        if (needsRanged && !this.#arsenal?.ranged) {
            const fallback = this.#createFallbackWeapon('bow');
            if (fallback) {
                this.#fallbackWeapons.set('ranged', fallback);
                hero.rig.attachEquipment(this.#THREE, fallback, hero.contentScale, {
                    handName: 'Hand_L',
                    rotation: [-0.18, 0, 0],
                });
                fallback.position.y = 0.24;
                if (this.#arsenal) this.#arsenal.ranged = fallback;
            }
        }
        if (needsStaff && !this.#arsenal?.staff) {
            const fallback = this.#createFallbackWeapon('staff');
            if (fallback) {
                this.#fallbackWeapons.set('staff', fallback);
                hero.rig.attachEquipment(this.#THREE, fallback, hero.contentScale, {
                    handName: 'Hand_R',
                    rotation: [0.32, 0, -Math.PI / 2],
                });
                fallback.position.y = 0.3;
                if (this.#arsenal) this.#arsenal.staff = fallback;
            }
        }
        if (needsShield && !this.#arsenal?.shield) {
            const fallback = this.#createFallbackWeapon('shield');
            if (fallback) {
                this.#fallbackWeapons.set('shield', fallback);
                hero.rig.attachEquipment(this.#THREE, fallback, hero.contentScale, {
                    handName: 'Hand_L',
                    rotation: [0, Math.PI / 2, 0],
                });
                fallback.position.set(0, 0.05, 0.14);
                if (this.#arsenal) this.#arsenal.shield = fallback;
            }
        }
        // Keep every weapon (FBX or fallback) from frustum-popping when the
        // hand briefly leaves the top-down frame.
        [this.#arsenal?.melee, this.#arsenal?.ranged, this.#arsenal?.staff, this.#arsenal?.shield]
            .filter(Boolean)
            .forEach((weapon) => weapon.traverse((object) => {
                if (object.isMesh) object.frustumCulled = false;
            }));
    }

    /**
     * Builds a readable procedural weapon for missing-pack slots.
     * Proportions match the normalized FBX registry lengths so FBX and
     * procedural silhouettes swap without a size pop.
     *
     * @param {'sword'|'bow'|'spear'|'staff'|'shield'} family Weapon family.
     * @returns {import('three').Group|null} Mount-ready weapon group.
     */
    #createFallbackWeapon(family) {
        const THREE = this.#THREE;
        const group = this.#tracker.track(new THREE.Group());
        group.name = `fallback-${family}`;
        const dark = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.78, metalness: 0.08 });
        const steel = new THREE.MeshStandardMaterial({ color: 0xc7d0d5, roughness: 0.32, metalness: 0.72 });
        const accent = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.#appearance.accentColor),
            roughness: 0.6,
            metalness: 0.25,
        });
        this.#registerMaterial(dark);
        this.#registerMaterial(steel);
        this.#registerMaterial(accent);
        const add = (geometry, material, x = 0, y = 0, z = 0) => {
            this.#tracker.track(geometry);
            const mesh = this.#tracker.track(new THREE.Mesh(geometry, material));
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            group.add(mesh);
            return mesh;
        };

        if (family === 'bow') {
            const limbs = add(new THREE.TorusGeometry(0.36, 0.032, 6, 20, Math.PI), dark);
            limbs.rotation.z = Math.PI / 2;
            limbs.rotation.y = Math.PI / 2;
            add(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), dark, 0, 0, 0);
            const string = add(new THREE.CylinderGeometry(0.006, 0.006, 0.68, 4), steel, 0, 0, 0.02);
            string.rotation.x = 0.06;
            const arrow = add(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 5), steel, 0, 0.02, -0.12);
            arrow.rotation.x = Math.PI / 2;
            add(new THREE.ConeGeometry(0.03, 0.09, 6), steel, 0, 0.02, -0.45).rotation.x = -Math.PI / 2;
        }
        else if (family === 'spear') {
            add(new THREE.CylinderGeometry(0.032, 0.038, 1.62, 7), dark, 0, -0.1, 0);
            add(new THREE.ConeGeometry(0.085, 0.3, 7), steel, 0, 0.86, 0);
            add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 7), accent, 0, 0.68, 0);
        }
        else if (family === 'staff') {
            add(new THREE.CylinderGeometry(0.035, 0.042, 1.45, 7), accent, 0, 0, 0);
            const gem = add(
                new THREE.OctahedronGeometry(0.11, 0),
                new THREE.MeshStandardMaterial({
                    color: 0x9fe8ff, emissive: 0x62d8ff, emissiveIntensity: 0.9, roughness: 0.3,
                }),
                0, 0.82, 0,
            );
            this.#registerMaterial(gem.material);
            add(new THREE.SphereGeometry(0.05, 8, 6), dark, 0, -0.75, 0);
        }
        else if (family === 'shield') {
            const plate = add(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 18), steel);
            plate.rotation.x = Math.PI / 2;
            const boss = add(new THREE.SphereGeometry(0.1, 10, 8), accent, 0, 0, -0.06);
            boss.scale.z = 0.6;
            const rim = add(new THREE.TorusGeometry(0.34, 0.025, 6, 24), accent);
            rim.position.z = 0;
        }
        else {
            // Sword default: guard + blade + pommel along +Y.
            add(new THREE.CylinderGeometry(0.042, 0.048, 0.3, 7), dark, 0, -0.22, 0);
            const guard = add(new THREE.BoxGeometry(0.24, 0.05, 0.07), accent, 0, -0.05, 0);
            guard.castShadow = true;
            add(new THREE.BoxGeometry(0.085, 0.78, 0.032), steel, 0, 0.38, 0);
            add(new THREE.ConeGeometry(0.06, 0.14, 6), steel, 0, 0.84, 0);
            add(new THREE.SphereGeometry(0.055, 8, 6), accent, 0, -0.4, 0);
        }
        return group;
    }

    /**
     * Applies persistent weapon visibility.
     * Only ranged/melee attacks swap the equipped slot — instantly, at the
     * moment of the swing/shot — while every other action keeps carrying the
     * last-used weapon so nothing vanishes mid-animation.
     */
    #applyWeaponVisibility() {
        const arsenal = this.#arsenal;
        if (arsenal?.melee || arsenal?.ranged || arsenal?.staff) {
            const equipped = this.#equippedSlot ?? this.#primarySlot;
            if (arsenal.melee) arsenal.melee.visible = equipped === 'melee';
            if (arsenal.ranged) arsenal.ranged.visible = equipped === 'ranged';
            if (arsenal.staff) arsenal.staff.visible = equipped === 'staff';
            if (arsenal.shield) arsenal.shield.visible = equipped === 'melee';
        }
        if (this.#proceduralArsenal.size) {
            const equipped = this.#equippedSlot ?? this.#primarySlot;
            this.#proceduralArsenal.forEach((group, slot) => {
                group.visible = equipped === slot;
            });
        }
    }

    /**
     * Switches the carried weapon for the visual action.
     * Instant on attack frames, persistent otherwise.
     *
     * @param {number} visualAction Currently rendered action id.
     */
    #syncWeaponVisibility(visualAction) {
        const arsenal = this.#arsenal;
        const hasMelee = Boolean(arsenal?.melee) || this.#proceduralArsenal.has('melee');
        const hasRanged = Boolean(arsenal?.ranged) || this.#proceduralArsenal.has('ranged');
        if (!hasMelee && !hasRanged && !arsenal?.staff) return;

        let desired = this.#equippedSlot ?? this.#primarySlot;
        if (visualAction === ACTIONS.ranged && hasRanged) desired = 'ranged';
        else if ((visualAction === ACTIONS.melee || visualAction === ACTIONS.assassinate) && hasMelee) desired = 'melee';

        if (desired !== this.#equippedSlot) {
            this.#equippedSlot = desired;
            this.#applyWeaponVisibility();
        }
        else {
            // Re-assert in case an asset finished late.
            this.#applyWeaponVisibility();
        }
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

        // Procedural arsenal: one pivot per family so melee/ranged swaps read
        // instantly without rebuilding geometry mid-fight.
        this.#primarySlot = this.#primaryFromAppearance();
        this.#equippedSlot = this.#primarySlot;
        const families = [
            ['melee', this.#appearance.families?.spear ? 'spear' : 'sword'],
            ['ranged', 'bow'],
            ['staff', 'staff'],
        ];
        families.forEach(([slot, family]) => {
            const pivot = this.#tracker.track(new THREE.Group());
            pivot.position.set(slot === 'ranged' ? -0.47 : 0.47, 1.34, -0.02);
            this.#model.add(pivot);
            const group = this.#createFallbackWeapon(family);
            // Re-parent fallback meshes into the procedural pivot.
            while (group.children.length) pivot.add(group.children[0]);
            pivot.visible = slot === this.#equippedSlot
                || (slot === 'melee' && this.#equippedSlot === 'melee')
                || (slot === 'ranged' && this.#equippedSlot === 'ranged')
                || (slot === 'staff' && this.#equippedSlot === 'staff');
            // Only the families this skin justifies stay in the arena; the
            // rest are disposed immediately to keep draw calls minimal.
            const justified = slot === 'melee'
                || (slot === 'ranged' && this.#appearance.families?.bow)
                || (slot === 'staff' && (this.#appearance.families?.staff || this.#appearance.families?.magic));
            if (!justified && slot !== this.#primarySlot) {
                pivot.visible = false;
                pivot.removeFromParent();
                return;
            }
            this.#proceduralArsenal.set(slot, pivot);
            if (slot === 'melee') {
                this.#weaponPivot = pivot;
                this.#weaponPivotBaseRotation = -0.34;
            }
        });
        this.#applyWeaponVisibility();

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
            this.#weaponPivotBaseRotation = -0.42;
            return;
        }

        const handle = this.#mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.45, 7), darkMaterial, this.#weaponPivot);
        handle.position.y = -0.18;
        const blade = this.#mesh(new THREE.BoxGeometry(0.09, 0.78, 0.035), metal, this.#weaponPivot);
        blade.position.y = 0.39;
        this.#weaponPivot.rotation.z = -0.34;
        this.#weaponPivotBaseRotation = -0.34;
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
        if (jumped) {
            this.#applyPlacement(1);
            this.#lastStrideSimTime = target.simtime;
        }

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

        // Retrigger every transient action — including repeats of the same
        // swing — so rapid combos restart from the current blended pose
        // instead of dropping the second hit. Locomotion and idles are left
        // to the duration-hold logic in animate() to avoid cutting swings.
        if (previous && Number(previous.action) !== Number(gladiator.action)
            && Number(gladiator.hp) > 0
            && getHeroActionDuration(Number(gladiator.action)) !== null) {
            this.#startAction(Number(gladiator.action), Number(simulationTime) || 0, true);
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
        // Smootherstep placement: quantized 100 ms engine steps glide instead
        // of lerping with a corner at every frame boundary.
        const eased = alpha * alpha * alpha * (alpha * (alpha * 6 - 15) + 10);
        this.#root.position.set(
            lerp(from.x, to.x, eased),
            this.#root.position.y,
            lerp(from.z, to.z, eased),
        );
        this.#root.rotation.y = lerpAngle(from.heading, to.heading, eased);
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
                this.#clipActions.forEach((action) => action.fadeOut(0.18));
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
            // Longer cross-fades (0.22 s) keep guard-idle variety from popping
            // when fighters settle between exchanges.
            action.fadeIn(previous ? 0.22 : 0.08);
            previous?.fadeOut(0.22);
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

        const observedAction = Number(this.#state.action);
        const observedChanged = this.#observedAction !== observedAction;
        if (observedChanged && getHeroActionDuration(observedAction) !== null) {
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

        // Weapons follow the *visual* action (which persists for the full
        // swing) instead of the 1-frame engine blip, so the blade stays out
        // through contact and the bow stays up through release.
        if (isAlive) this.#syncWeaponVisibility(this.#activeAction ?? observedAction);
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
            // Keep the stride integrator in sync while a clip owns the bones
            // so the legs resume mid-cycle instead of snapping to zero.
            this.#lastStrideSimTime = simulationTime;
            return;
        }

        const seed = this.#index * 0.173;
        let targetPose;
        const isLocomotion = this.#activeAction === ACTIONS.movement || this.#activeAction === ACTIONS.charge;
        if (isLocomotion && !reducedMotion) {
            // Phase-continuous gait: integrate replay time by cadence so speed
            // changes hurry the stride without snapping the legs.
            if (this.#lastStrideSimTime === null) this.#lastStrideSimTime = this.#actionStartTime;
            const simDelta = Math.min(Math.max(simulationTime - this.#lastStrideSimTime, 0), 0.25);
            const cadence = Math.min(Math.max(this.#lastGroundSpeed, 0.45), 2.1)
                * (this.#activeAction === ACTIONS.charge ? 1.35 : 1);
            this.#stridePhase += simDelta / STRIDE_SECONDS * cadence * Math.PI * 2;
            if (this.#stridePhase > 1e4) this.#stridePhase %= Math.PI * 2;
            this.#lastStrideSimTime = simulationTime;
            targetPose = sampleMovementPhase(this.#stridePhase, {
                seed,
                charging: this.#activeAction === ACTIONS.charge,
                speed: this.#lastGroundSpeed,
            });
        }
        else {
            if (isLocomotion && reducedMotion) {
                this.#lastStrideSimTime = simulationTime;
                targetPose = sampleHeroPose(this.#activeAction, 0.38, {
                    weapon: this.#appearance.weapon,
                    seed,
                    speed: this.#lastGroundSpeed,
                });
            }
            else {
                // Continuous guards breathe on the shared replay clock so
                // re-entering idle never restarts the breath — a classic pop.
                // One-shots run on action age so anticipation always plays.
                const continuous = this.#activeAction === ACTIONS.waiting
                    || this.#activeAction === ACTIONS.none
                    || this.#activeAction === ACTIONS.block
                    || this.#activeAction === ACTIONS.ambush;
                const sampleTime = reducedMotion
                    ? (this.#activeAction === ACTIONS.waiting || this.#activeAction === ACTIONS.none ? 0 : 0.38)
                    : continuous
                        ? simulationTime
                        : Math.abs(simulationTime - this.#actionStartTime);
                // Locomotion sampled through the legacy path (tests, reduced
                // motion) still needs a sane phase: seed the stride from the
                // action clock when the integrator is bypassed.
                if (!isLocomotion) this.#lastStrideSimTime = simulationTime;
                targetPose = sampleHeroPose(this.#activeAction, sampleTime, {
                    weapon: this.#appearance.weapon,
                    seed,
                    speed: this.#lastGroundSpeed,
                });
            }
        }
        const transitionAmount = reducedMotion
            ? 1
            : Math.min(Math.abs(simulationTime - this.#actionStartTime) / this.#transitionDuration, 1);
        let pose = this.#transitionFromPose
            ? blendHeroPosesEased(this.#transitionFromPose, targetPose, transitionAmount)
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
            // World-space pitch/roll: the outer hero group is unrotated, so it
            // shares the procedural mapping (x=pitch, z=roll).
            this.#body.rotation.x = pose.body.x;
            this.#body.rotation.z = pose.body.z;
        }
        else {
            this.#model.position.y = pose.body.y;
            this.#body.rotation.x = pose.body.x;
            if (this.#weaponPivot) {
                this.#weaponPivot.rotation.z = this.#weaponPivotBaseRotation + pose.weapon.emphasis * 0.8;
            }
            this.#proceduralArsenal.forEach((pivot, slot) => {
                if (slot === 'melee' && pivot !== this.#weaponPivot) return;
                if (slot !== 'melee' && pivot) pivot.rotation.z = pose.weapon.emphasis * 0.25;
            });
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

    /**
     * Starts one action without discarding the outgoing blended pose.
     * Chained swings blend over a shorter window so combos feel connected;
     * locomotion↔attack transitions use the full smooth window.
     */
    #startAction(action, simulationTime, fromEngine = false) {
        const previousDuration = getHeroActionDuration(this.#activeAction);
        const nextDuration = getHeroActionDuration(action);
        const chainingAttacks = previousDuration !== null && nextDuration !== null;
        this.#transitionDuration = chainingAttacks ? BLEND_SECONDS_ATTACK : BLEND_SECONDS_SMOOTH;
        // Retriggers of the same swing (rapid combos) restart the timeline
        // from the current blended pose — never a snap to guard.
        this.#transitionFromPose = this.#currentPose;
        this.#activeAction = action;
        this.#actionStartTime = Number(simulationTime) || 0;
        if (fromEngine) this.#observedAction = action;
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
