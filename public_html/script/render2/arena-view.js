import { ARENA_SIZE } from './battle-state.js';

const CORNER_RADIUS = Math.hypot(ARENA_SIZE / 2, ARENA_SIZE / 2);

/**
 * Builds and updates the low-poly coliseum surrounding the simulation plane.
 */
export class ArenaView {
    #THREE;
    #crowd;
    #crowdMaximum = 240;
    #flames = [];
    #group;
    #safeBoundary;
    #toxicMaterial;
    #tracker;

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene, tracker: import('./resource-tracker.js').ResourceTracker }} options Arena dependencies.
     */
    constructor({ THREE, scene, tracker }) {
        this.#THREE = THREE;
        this.#tracker = tracker;
        this.#group = tracker.track(new THREE.Group());
        this.#group.name = 'gladcode-coliseum';
        scene.add(this.#group);

        this.#buildArenaFloor();
        this.#buildWallsAndStands();
        this.#buildRoyalDais();
        this.#buildCrowd();
        this.#buildPoisonField();
    }

    /**
     * Creates a tracked mesh and enables the requested shadow behavior.
     *
     * @param {import('three').BufferGeometry} geometry Mesh geometry.
     * @param {import('three').Material} material Mesh material.
     * @param {{ cast?: boolean, receive?: boolean }} [shadows] Shadow flags.
     * @returns {import('three').Mesh} Created mesh.
     */
    #mesh(geometry, material, { cast = false, receive = false } = {}) {
        this.#tracker.track(geometry);
        this.#tracker.track(material);
        const mesh = this.#tracker.track(new this.#THREE.Mesh(geometry, material));
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
        this.#group.add(mesh);
        return mesh;
    }

    /** Builds the exact 25 by 25 sand plane and coordinate grid. */
    #buildArenaFloor() {
        const THREE = this.#THREE;
        const sand = this.#mesh(
            new THREE.BoxGeometry(ARENA_SIZE, 0.65, ARENA_SIZE),
            new THREE.MeshStandardMaterial({
                color: 0xc7a66b,
                roughness: 0.94,
                metalness: 0.02,
            }),
            { receive: true },
        );
        sand.position.y = -0.34;

        const grid = this.#tracker.track(new THREE.GridHelper(ARENA_SIZE, ARENA_SIZE, 0x72572e, 0x8f7448));
        grid.position.y = 0.006;
        const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
        gridMaterials.forEach((material) => {
            this.#tracker.track(material);
            material.transparent = true;
            material.opacity = 0.22;
            material.depthWrite = false;
        });
        this.#group.add(grid);

        const crest = this.#mesh(
            new THREE.RingGeometry(1.65, 1.82, 48),
            new THREE.MeshStandardMaterial({ color: 0x9d6b32, roughness: 0.7, metalness: 0.35 }),
            { receive: true },
        );
        crest.rotation.x = -Math.PI / 2;
        crest.position.y = 0.015;
    }

    /** Builds stone walls, stepped benches and four corner braziers. */
    #buildWallsAndStands() {
        const THREE = this.#THREE;
        const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.84, metalness: 0.08 });
        const darkStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3034, roughness: 0.9 });
        this.#tracker.track(stoneMaterial);
        this.#tracker.track(darkStoneMaterial);

        const wallLength = ARENA_SIZE + 1.4;
        const wallDepth = 0.8;
        const wallHeight = 1.25;
        const walls = [
            { size: [wallLength, wallHeight, wallDepth], position: [0, wallHeight / 2, -13.1] },
            { size: [wallLength, wallHeight, wallDepth], position: [0, wallHeight / 2, 13.1] },
            { size: [wallDepth, wallHeight, wallLength], position: [-13.1, wallHeight / 2, 0] },
            { size: [wallDepth, wallHeight, wallLength], position: [13.1, wallHeight / 2, 0] },
        ];

        walls.forEach(({ size, position }) => {
            const wall = this.#mesh(new THREE.BoxGeometry(...size), stoneMaterial, { cast: true, receive: true });
            wall.position.set(...position);
        });

        for (let level = 0; level < 3; level += 1) {
            const height = 0.45 + level * 0.52;
            const inset = 14.1 + level * 0.7;
            const benchLength = ARENA_SIZE + 2 + level * 1.4;
            const benchDepth = 0.72;
            const benches = [
                { size: [benchLength, height, benchDepth], position: [0, height / 2 - 0.02, -inset] },
                { size: [benchLength, height, benchDepth], position: [0, height / 2 - 0.02, inset] },
                { size: [benchDepth, height, benchLength], position: [-inset, height / 2 - 0.02, 0] },
                { size: [benchDepth, height, benchLength], position: [inset, height / 2 - 0.02, 0] },
            ];
            benches.forEach(({ size, position }) => {
                const bench = this.#mesh(new THREE.BoxGeometry(...size), darkStoneMaterial, { cast: true, receive: true });
                bench.position.set(...position);
            });
        }

        const brazierGeometry = new THREE.CylinderGeometry(0.26, 0.36, 0.72, 8);
        const brazierMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3625, roughness: 0.6, metalness: 0.45 });
        const flameGeometry = new THREE.ConeGeometry(0.2, 0.55, 7);
        const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa43b, transparent: true, opacity: 0.9 });
        [
            [-12.1, -12.1],
            [12.1, -12.1],
            [-12.1, 12.1],
            [12.1, 12.1],
        ].forEach(([x, z], index) => {
            const brazier = this.#mesh(brazierGeometry, brazierMaterial, { cast: true });
            brazier.position.set(x, 0.75, z);
            const flame = this.#mesh(flameGeometry, flameMaterial);
            flame.position.set(x, 1.35, z);
            flame.userData.phase = index * 1.7;
            this.#flames.push(flame);
        });
    }

    /** Builds a restrained royal platform that anchors the north stand. */
    #buildRoyalDais() {
        const THREE = this.#THREE;
        const platform = this.#mesh(
            new THREE.BoxGeometry(5.4, 0.5, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x384a52, roughness: 0.7, metalness: 0.15 }),
            { cast: true, receive: true },
        );
        platform.position.set(0, 1.65, -15.45);

        const canopy = this.#mesh(
            new THREE.BoxGeometry(5, 0.18, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x00638d, roughness: 0.55, metalness: 0.2 }),
            { cast: true },
        );
        canopy.position.set(0, 3.55, -15.45);

        for (const x of [-2.2, 2.2]) {
            const pillar = this.#mesh(
                new THREE.CylinderGeometry(0.16, 0.2, 2.1, 8),
                new THREE.MeshStandardMaterial({ color: 0x9d6b32, roughness: 0.5, metalness: 0.55 }),
                { cast: true },
            );
            pillar.position.set(x, 2.58, -15.45);
        }
    }

    /** Builds a deterministic instanced crowd so density remains a cheap setting. */
    #buildCrowd() {
        const THREE = this.#THREE;
        const geometry = this.#tracker.track(new THREE.CapsuleGeometry(0.13, 0.27, 2, 5));
        const material = this.#tracker.track(new THREE.MeshStandardMaterial({ roughness: 0.82 }));
        this.#crowd = this.#tracker.track(new THREE.InstancedMesh(geometry, material, this.#crowdMaximum));
        this.#crowd.castShadow = true;
        this.#crowd.frustumCulled = false;
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        let seed = 0x6c6164;
        const random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
        const colors = [0x4d7588, 0x8d5148, 0xc18b52, 0x5f6947, 0x69517d, 0x4c4a49];

        for (let index = 0; index < this.#crowdMaximum; index += 1) {
            const side = index % 4;
            const level = index % 3;
            const along = (random() - 0.5) * (ARENA_SIZE + level * 1.2);
            const offset = 14.05 + level * 0.7;
            const height = 0.85 + level * 0.52 + random() * 0.12;
            if (side === 0) dummy.position.set(along, height, -offset);
            if (side === 1) dummy.position.set(offset, height, along);
            if (side === 2) dummy.position.set(along, height, offset);
            if (side === 3) dummy.position.set(-offset, height, along);
            dummy.rotation.y = random() * Math.PI * 2;
            dummy.scale.setScalar(0.85 + random() * 0.3);
            dummy.updateMatrix();
            this.#crowd.setMatrixAt(index, dummy.matrix);
            this.#crowd.setColorAt(index, color.setHex(colors[index % colors.length]));
        }
        this.#crowd.instanceMatrix.needsUpdate = true;
        if (this.#crowd.instanceColor) this.#crowd.instanceColor.needsUpdate = true;
        this.#group.add(this.#crowd);
    }

    /** Builds the shader-driven poison field and exact-radius boundary. */
    #buildPoisonField() {
        const THREE = this.#THREE;
        const geometry = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
        this.#toxicMaterial = new THREE.ShaderMaterial({
            uniforms: {
                safeRadius: { value: CORNER_RADIUS },
                time: { value: 0 },
            },
            vertexShader: `
                varying vec2 arenaUv;
                void main() {
                    arenaUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 arenaUv;
                uniform float safeRadius;
                uniform float time;
                void main() {
                    float arenaDistance = distance(arenaUv, vec2(0.5)) * 25.0;
                    float edge = smoothstep(safeRadius - 0.25, safeRadius + 0.08, arenaDistance);
                    float haze = 0.72 + 0.18 * sin(arenaUv.x * 51.0 + arenaUv.y * 37.0 + time * 1.7);
                    gl_FragColor = vec4(0.22, 0.68, 0.25, edge * haze * 0.48);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const poisonPlane = this.#mesh(geometry, this.#toxicMaterial);
        poisonPlane.rotation.x = -Math.PI / 2;
        poisonPlane.position.y = 0.055;
        poisonPlane.renderOrder = 3;

        this.#safeBoundary = this.#mesh(
            new THREE.RingGeometry(0.985, 1.015, 128),
            new THREE.MeshBasicMaterial({
                color: 0x7cf05d,
                transparent: true,
                opacity: 0.62,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
            }),
        );
        this.#safeBoundary.rotation.x = -Math.PI / 2;
        this.#safeBoundary.position.y = 0.075;
        this.#safeBoundary.scale.setScalar(CORNER_RADIUS);
        this.#safeBoundary.renderOrder = 4;
    }

    /**
     * Applies the persisted crowd-density preference.
     *
     * @param {number|string} density Density from zero to one.
     */
    setCrowdDensity(density) {
        const normalized = Math.min(1, Math.max(0, Number(density) || 0));
        this.#crowd.count = Math.round(this.#crowdMaximum * normalized);
    }

    /**
     * Updates the visual poison field from the exact simlog radius.
     *
     * @param {number|string} radius Current safe radius.
     */
    updateSafeZone(radius) {
        const safeRadius = Math.max(0, Number(radius) || 0);
        this.#toxicMaterial.uniforms.safeRadius.value = safeRadius;
        this.#safeBoundary.scale.setScalar(Math.max(0.001, safeRadius));
        this.#safeBoundary.visible = safeRadius < CORNER_RADIUS - 0.01;
    }

    /**
     * Advances ambient arena-only motion.
     *
     * @param {number} elapsedSeconds Animation time in seconds.
     */
    animate(elapsedSeconds) {
        this.#toxicMaterial.uniforms.time.value = elapsedSeconds;
        this.#flames.forEach((flame) => {
            const pulse = 0.9 + Math.sin(elapsedSeconds * 6 + flame.userData.phase) * 0.12;
            flame.scale.set(pulse, 1 + (pulse - 0.9) * 1.5, pulse);
        });
    }
}
