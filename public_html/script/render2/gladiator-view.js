import { ACTIONS, headingToRadians, isOutsideSafeZone, toArenaPosition } from './battle-state.js';
import { getGladiatorAppearance } from './gladiator-appearance.js';

/** Three.js representation of one engine-controlled gladiator. */
export class GladiatorView {
    #THREE;
    #accentMaterial;
    #appearance;
    #armorMaterial;
    #baseArmorColor;
    #baseOpacities = new Map();
    #body;
    #heroController = null;
    #index;
    #lastAnimationTime = null;
    #materials = [];
    #model;
    #root;
    #shield;
    #state;
    #statusRing;
    #stunStars;
    #tracker;
    #weaponPivot;

    /**
     * @param {{ THREE: typeof import('three'), tracker: import('./resource-tracker.js').ResourceTracker, heroAssets?: import('./synty-hero-assets.js').SyntyHeroAssets|null, gladiator: Record<string, unknown>, index: number }} options View dependencies.
     */
    constructor({ THREE, tracker, heroAssets = null, gladiator, index }) {
        this.#THREE = THREE;
        this.#tracker = tracker;
        this.#index = index;
        this.#appearance = getGladiatorAppearance(gladiator);
        this.#root = tracker.track(new THREE.Group());
        this.#root.name = `gladiator-${gladiator.id ?? index}`;
        this.#model = tracker.track(new THREE.Group());
        this.#root.add(this.#model);
        this.#buildModel(heroAssets, gladiator);
        this.setState(gladiator, 17.68);
    }

    /** @returns {import('three').Group} Root object placed on the arena plane. */
    get root() {
        return this.#root;
    }

    /** @returns {Record<string, unknown>} Latest complete gladiator state. */
    get state() {
        return this.#state;
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

        this.#statusRing = this.#mesh(new THREE.TorusGeometry(0.52, 0.055, 8, 32), this.#accentMaterial, this.#root);
        this.#statusRing.rotation.x = Math.PI / 2;
        this.#statusRing.position.y = 0.06;
        this.#statusRing.castShadow = false;

        const facing = this.#mesh(new THREE.ConeGeometry(0.12, 0.5, 6), this.#accentMaterial, this.#root);
        facing.rotation.x = -Math.PI / 2;
        facing.position.set(0, 0.1, -0.7);
        facing.castShadow = false;

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
        this.#tracker.track(hero.object);
        this.#model.add(hero.object);
        this.#body = hero.object;
        this.#armorMaterial = this.#registerMaterial(hero.material);
        this.#baseArmorColor = new this.#THREE.Color(0xffffff);

        this.#weaponPivot = this.#tracker.track(new this.#THREE.Group());
        this.#weaponPivot.position.set(0.52, 1.34, -0.04);
        this.#model.add(this.#weaponPivot);
        if (hero.weapon) {
            this.#tracker.track(hero.weapon);
            this.#weaponPivot.add(hero.weapon);
            this.#weaponPivot.rotation.z = this.#appearance.weapon === 'spear' ? -0.5 : -0.34;
        }
        else {
            const darkMaterial = new this.#THREE.MeshStandardMaterial({ color: 0x392b22, roughness: 0.82 });
            this.#buildWeapon(darkMaterial);
        }

        if (hero.mixer) hero.mixer.setTime(this.#index * 0.37);
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

    /** Applies a complete simlog state directly to the model transform. */
    setState(gladiator, safeRadius) {
        this.#state = gladiator;
        const position = toArenaPosition({ x: gladiator.x, y: gladiator.y });
        this.#root.position.set(position.x, position.y, position.z);
        this.#root.rotation.y = headingToRadians(gladiator.head);
        this.#root.visible = true;

        const buffs = gladiator.buffs ?? {};
        const isAlive = Number(gladiator.hp) > 0;
        const isInvisible = Number(buffs.invisible?.timeleft) > 0.1;
        const isBurning = Number(buffs.burn?.timeleft) > 0.1;
        const isResistant = Number(buffs.resist?.timeleft) > 0.1;
        const isPoisoned = isOutsideSafeZone(gladiator, safeRadius);

        this.#model.rotation.z = isAlive ? 0 : -Math.PI / 2;
        this.#model.position.y = isAlive ? 0 : 0.28;
        this.#shield.visible = isAlive && isResistant;
        this.#stunStars.visible = isAlive && Number(buffs.stun?.timeleft) > 0.1;

        this.#materials.forEach((material) => {
            if (!('transparent' in material)) return;
            const baseOpacity = this.#baseOpacities.get(material) ?? 1;
            material.transparent = isInvisible || baseOpacity < 1;
            material.opacity = isInvisible ? baseOpacity * 0.32 : baseOpacity;
        });

        this.#armorMaterial.color.copy(this.#baseArmorColor);
        this.#armorMaterial.emissive.setHex(0x000000);
        this.#armorMaterial.emissiveIntensity = 0;
        if (isBurning) {
            this.#armorMaterial.emissive.setHex(0xff6b35);
            this.#armorMaterial.emissiveIntensity = 0.72;
        }
        else if (isPoisoned) {
            this.#armorMaterial.emissive.setHex(0x48d85d);
            this.#armorMaterial.emissiveIntensity = 0.55;
        }
        else if (isResistant) {
            this.#armorMaterial.emissive.setHex(0xffd84f);
            this.#armorMaterial.emissiveIntensity = 0.48;
        }
    }

    /** Advances rig motion and action poses without changing engine positions. */
    animate(elapsedSeconds) {
        const delta = this.#lastAnimationTime === null ? 0 : Math.min(Math.max(elapsedSeconds - this.#lastAnimationTime, 0), 0.1);
        this.#lastAnimationTime = elapsedSeconds;
        if (!this.#state || Number(this.#state.hp) <= 0) return;

        const action = Number(this.#state.action);
        const phase = elapsedSeconds * 8 + this.#index * 1.9;
        let bob = Math.sin(phase) * 0.025;
        let weaponSwing = -0.34;
        let bodyLean = 0;
        let rigSpeed = 0.32;
        let rigWeight = 0.2;

        if (action === ACTIONS.movement) {
            bob = Math.abs(Math.sin(phase * 1.7)) * 0.1;
            rigSpeed = 1.05;
            rigWeight = 0.46;
        }
        else if (action === ACTIONS.charge) {
            bob = Math.abs(Math.sin(phase * 2.2)) * 0.08;
            bodyLean = -0.18;
            weaponSwing = -0.72;
            rigSpeed = 1.35;
            rigWeight = 0.62;
        }
        else if (action === ACTIONS.melee || action === ACTIONS.assassinate) {
            weaponSwing = -0.35 + Math.sin(phase * 2.4) * 1.05;
            rigSpeed = 1.65;
            rigWeight = 0.78;
        }
        else if (action === ACTIONS.ranged) {
            weaponSwing = -0.2 + Math.sin(phase) * 0.18;
            bodyLean = 0.08;
            rigSpeed = 0.55;
            rigWeight = 0.54;
        }
        else if ([ACTIONS.fireball, ACTIONS.teleport, ACTIONS.block, ACTIONS.ambush, ACTIONS.potion].includes(action)) {
            weaponSwing = -0.34 + Math.sin(phase * 1.3) * 0.35;
            rigSpeed = 0.72;
            rigWeight = 0.58;
        }

        if (this.#heroController?.mixer) {
            this.#heroController.mixer.timeScale = rigSpeed;
            this.#heroController.action?.setEffectiveWeight(rigWeight);
            this.#heroController.mixer.update(delta);
        }
        this.#model.position.y = bob;
        this.#body.rotation.x = bodyLean;
        this.#weaponPivot.rotation.z = weaponSwing;
        this.#statusRing.scale.setScalar(1 + Math.sin(phase * 0.65) * 0.045);
        this.#shield.rotation.z = elapsedSeconds * 0.55;
        this.#stunStars.rotation.y = elapsedSeconds * 2.8;
    }

    /** @returns {import('three').Vector3} World-space label anchor. */
    getWorldAnchor() {
        return this.#root.localToWorld(new this.#THREE.Vector3(0, 2.65, 0));
    }

    /** Releases the animation mixer before shared geometry is disposed. */
    destroy() {
        this.#heroController?.dispose();
    }
}
