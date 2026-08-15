import { ACTIONS, headingToRadians, isOutsideSafeZone, toArenaPosition } from './battle-state.js';
import { getGladiatorAppearance } from './gladiator-appearance.js';

/**
 * Low-poly Three.js representation of one engine-controlled gladiator.
 */
export class GladiatorView {
    #THREE;
    #accentMaterial;
    #appearance;
    #armorMaterial;
    #baseArmorColor;
    #baseOpacities = new Map();
    #body;
    #index;
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
     * @param {{ THREE: typeof import('three'), tracker: import('./resource-tracker.js').ResourceTracker, gladiator: Record<string, unknown>, index: number }} options View dependencies.
     */
    constructor({ THREE, tracker, gladiator, index }) {
        this.#THREE = THREE;
        this.#tracker = tracker;
        this.#index = index;
        this.#appearance = getGladiatorAppearance(gladiator);
        this.#root = tracker.track(new THREE.Group());
        this.#root.name = `gladiator-${gladiator.id ?? index}`;
        this.#model = tracker.track(new THREE.Group());
        this.#root.add(this.#model);
        this.#buildModel();
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

    /**
     * Creates a tracked mesh inside the requested model parent.
     *
     * @param {import('three').BufferGeometry} geometry Geometry.
     * @param {import('three').Material} material Material.
     * @param {import('three').Object3D} [parent=this.#model] Parent node.
     * @returns {import('three').Mesh} Created mesh.
     */
    #mesh(geometry, material, parent = this.#model) {
        this.#tracker.track(geometry);
        this.#tracker.track(material);
        if (!this.#materials.includes(material)) this.#materials.push(material);
        if (!this.#baseOpacities.has(material)) this.#baseOpacities.set(material, material.opacity);
        const mesh = this.#tracker.track(new this.#THREE.Mesh(geometry, material));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    /** Builds a readable RPG silhouette from the persisted LPC appearance. */
    #buildModel() {
        const THREE = this.#THREE;
        const skinMaterial = new THREE.MeshStandardMaterial({ color: this.#appearance.skinColor, roughness: 0.78 });
        this.#armorMaterial = new THREE.MeshStandardMaterial({
            color: this.#appearance.armorColor,
            roughness: this.#appearance.armor === 'gold' ? 0.36 : 0.68,
            metalness: this.#appearance.armor === 'gold' || this.#appearance.armor === 'metal' ? 0.58 : 0.08,
        });
        this.#baseArmorColor = new THREE.Color(this.#appearance.armorColor);
        this.#accentMaterial = new THREE.MeshStandardMaterial({
            color: this.#appearance.accentColor,
            emissive: this.#appearance.accentColor,
            emissiveIntensity: 0.18,
            roughness: 0.56,
            metalness: 0.22,
        });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x282b2e, roughness: 0.82 });
        const hairMaterial = new THREE.MeshStandardMaterial({ color: this.#appearance.hairColor, roughness: 0.92 });

        const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
        const shadow = this.#mesh(new THREE.CircleGeometry(0.58, 24), shadowMaterial, this.#root);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.018;
        shadow.castShadow = false;
        shadow.receiveShadow = false;

        this.#statusRing = this.#mesh(
            new THREE.TorusGeometry(0.52, 0.055, 8, 32),
            this.#accentMaterial,
            this.#root,
        );
        this.#statusRing.rotation.x = Math.PI / 2;
        this.#statusRing.position.y = 0.06;
        this.#statusRing.castShadow = false;

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

        const facing = this.#mesh(new THREE.ConeGeometry(0.12, 0.5, 6), this.#accentMaterial, this.#root);
        facing.rotation.x = -Math.PI / 2;
        facing.position.set(0, 0.1, -0.7);
        facing.castShadow = false;

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
            star.position.set(Math.cos(angle) * 0.42, 2.18, Math.sin(angle) * 0.42);
        }
        this.#stunStars.visible = false;
    }

    /**
     * Builds the broad weapon category encoded by the LPC skin.
     *
     * @param {import('three').Material} darkMaterial Shared handle material.
     */
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
     * Applies a complete simlog state directly to the model transform.
     *
     * @param {Record<string, unknown>} gladiator Complete gladiator frame.
     * @param {number|string} safeRadius Current safe-zone radius.
     */
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
            if ('transparent' in material) {
                const baseOpacity = this.#baseOpacities.get(material) ?? 1;
                material.transparent = isInvisible || baseOpacity < 1;
                material.opacity = isInvisible ? baseOpacity * 0.32 : baseOpacity;
            }
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

    /**
     * Advances action poses without changing authoritative engine positions.
     *
     * @param {number} elapsedSeconds Renderer animation time.
     */
    animate(elapsedSeconds) {
        if (!this.#state || Number(this.#state.hp) <= 0) {
            return;
        }

        const action = Number(this.#state.action);
        const phase = elapsedSeconds * 8 + this.#index * 1.9;
        let bob = Math.sin(phase) * 0.025;
        let weaponSwing = -0.34;
        let bodyLean = 0;

        if (action === ACTIONS.movement) {
            bob = Math.abs(Math.sin(phase * 1.7)) * 0.1;
        }
        else if (action === ACTIONS.charge) {
            bob = Math.abs(Math.sin(phase * 2.2)) * 0.08;
            bodyLean = -0.18;
            weaponSwing = -0.72;
        }
        else if (action === ACTIONS.melee || action === ACTIONS.assassinate) {
            weaponSwing = -0.35 + Math.sin(phase * 2.4) * 1.05;
        }
        else if (action === ACTIONS.ranged) {
            weaponSwing = -0.2 + Math.sin(phase) * 0.18;
        }
        else if ([ACTIONS.fireball, ACTIONS.teleport, ACTIONS.block, ACTIONS.ambush, ACTIONS.potion].includes(action)) {
            weaponSwing = -0.34 + Math.sin(phase * 1.3) * 0.35;
        }

        this.#model.position.y = bob;
        this.#body.rotation.x = bodyLean;
        this.#weaponPivot.rotation.z = weaponSwing;
        this.#statusRing.scale.setScalar(1 + Math.sin(phase * 0.65) * 0.045);
        this.#shield.rotation.z = elapsedSeconds * 0.55;
        this.#stunStars.rotation.y = elapsedSeconds * 2.8;
    }

    /**
     * Returns the world-space point used by DOM labels and camera following.
     *
     * @returns {import('three').Vector3} World-space label anchor.
     */
    getWorldAnchor() {
        const anchor = new this.#THREE.Vector3(0, 2.55, 0);
        return this.#root.localToWorld(anchor);
    }
}
