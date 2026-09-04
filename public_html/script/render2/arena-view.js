import { ARENA_SIZE } from './battle-state.js';
import { SyntyPropAssets } from './synty-prop-packs.js';

const CORNER_RADIUS = Math.hypot(ARENA_SIZE / 2, ARENA_SIZE / 2);
const COLONNADE_RADIUS = 17.6;
const COLONNADE_COUNT = 26;

/** Small deterministic hash noise used by every procedural texture. */
function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
}

/** Smooth value noise on an integer lattice. */
function valueNoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const smooth = (t) => t * t * (3 - 2 * t);
    const a = hash2(xi, yi);
    const b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1);
    const d = hash2(xi + 1, yi + 1);
    return a + (b - a) * smooth(xf) + (c - a) * smooth(yf) + (a - b - c + d) * smooth(xf) * smooth(yf);
}

/**
 * Creates a canvas-backed texture painted by the supplied callback.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @param {number} size Square canvas size in pixels.
 * @param {(context: CanvasRenderingContext2D, size: number) => void} painter Pixel painter.
 * @returns {import('three').CanvasTexture} Ready-to-use texture.
 */
function paintTexture(THREE, size, painter) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    painter(context, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
}

/**
 * Builds the sandy arena surface with baked combat markings.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @returns {import('three').CanvasTexture} Floor albedo.
 */
function buildSandTexture(THREE) {
    return paintTexture(THREE, 1024, (context, size) => {
        context.fillStyle = '#c29a5e';
        context.fillRect(0, 0, size, size);

        // Broad tonal patches break the flatness before speckle detail lands.
        for (let patch = 0; patch < 42; patch += 1) {
            const x = hash2(patch, 7) * size;
            const y = hash2(patch, 13) * size;
            const radius = 60 + hash2(patch, 29) * 190;
            const shade = hash2(patch, 41) > 0.5 ? 'rgba(120, 88, 48, 0.05)' : 'rgba(238, 214, 168, 0.06)';
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, shade);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            context.fillStyle = gradient;
            context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // Fine grain speckle gives the sand its tooth under motion.
        for (let speck = 0; speck < 26000; speck += 1) {
            const x = hash2(speck, 3) * size;
            const y = hash2(speck, 17) * size;
            const dark = hash2(speck, 23) > 0.52;
            context.fillStyle = dark ? 'rgba(94, 66, 34, 0.10)' : 'rgba(236, 214, 172, 0.045)';
            context.fillRect(x, y, 1.2, 1.2);
        }

        // Faint rake lines echo the arena crew preparing the ground.
        context.strokeStyle = 'rgba(96, 68, 36, 0.05)';
        context.lineWidth = 2;
        for (let line = 0; line < 46; line += 1) {
            const y = (line / 46) * size + Math.sin(line * 2.7) * 6;
            context.beginPath();
            context.moveTo(0, y);
            for (let x = 0; x <= size; x += 64) {
                context.lineTo(x, y + Math.sin(x * 0.012 + line) * 5);
            }
            context.stroke();
        }

        // Worn combat circles around the summoning crest.
        const center = size / 2;
        context.strokeStyle = 'rgba(112, 76, 34, 0.16)';
        [0.155, 0.31].forEach((radiusScale, index) => {
            context.lineWidth = index === 0 ? 7 : 4;
            context.beginPath();
            context.arc(center, center, size * radiusScale, 0, Math.PI * 2);
            context.stroke();
        });
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(center, center, size * 0.036, 0, Math.PI * 2);
        context.stroke();

        // Scuff arcs radiating from frequent fighting near the middle.
        context.strokeStyle = 'rgba(104, 72, 34, 0.08)';
        for (let scuff = 0; scuff < 26; scuff += 1) {
            const angle = hash2(scuff, 61) * Math.PI * 2;
            const start = size * (0.1 + hash2(scuff, 67) * 0.16);
            const length = 40 + hash2(scuff, 71) * 130;
            context.lineWidth = 2 + hash2(scuff, 73) * 4;
            context.beginPath();
            context.arc(center, center, start, angle, angle + length / start);
            context.stroke();
        }

        // Subtle tile seams keep the 25u engine grid readable without graph paper.
        context.strokeStyle = 'rgba(70, 50, 26, 0.06)';
        context.lineWidth = 1.6;
        const step = size / ARENA_SIZE;
        for (let seam = 0; seam <= ARENA_SIZE; seam += 1) {
            context.beginPath();
            context.moveTo(seam * step, 0);
            context.lineTo(seam * step, size);
            context.moveTo(0, seam * step);
            context.lineTo(size, seam * step);
            context.stroke();
        }

        // Darken toward the walls so the fighting area reads brightest.
        const vignette = context.createRadialGradient(center, center, size * 0.28, center, center, size * 0.72);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(58, 40, 20, 0.24)');
        context.fillStyle = vignette;
        context.fillRect(0, 0, size, size);
    });
}

/**
 * Builds the mortar-and-block stone used across walls, stands and towers.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @returns {import('three').CanvasTexture} Stone albedo configured for repeat.
 */
function buildStoneTexture(THREE) {
    const texture = paintTexture(THREE, 512, (context, size) => {
        context.fillStyle = '#5a5e62';
        context.fillRect(0, 0, size, size);

        const rows = 8;
        const rowHeight = size / rows;
        for (let row = 0; row < rows; row += 1) {
            const offset = row % 2 === 0 ? 0 : rowHeight * 1.1;
            for (let column = -1; column < 5; column += 1) {
                const x = column * rowHeight * 2.2 + offset;
                const y = row * rowHeight;
                const width = rowHeight * 2.05;
                const height = rowHeight * 0.92;
                const shade = 74 + hash2(row * 9 + column, 5) * 26;
                context.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 6})`;
                context.fillRect(x, y, width, height);
                // Bevel light and shadow sells the chisel edge.
                context.fillStyle = 'rgba(255, 255, 255, 0.07)';
                context.fillRect(x, y, width, 2.4);
                context.fillStyle = 'rgba(0, 0, 0, 0.16)';
                context.fillRect(x, y + height - 2.6, width, 2.6);
            }
        }

        for (let grit = 0; grit < 5200; grit += 1) {
            const x = hash2(grit, 31) * size;
            const y = hash2(grit, 37) * size;
            context.fillStyle = hash2(grit, 43) > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.06)';
            context.fillRect(x, y, 1.6, 1.6);
        }

        // Moss creeps along the lower courses.
        for (let moss = 0; moss < 260; moss += 1) {
            const x = hash2(moss, 53) * size;
            const y = size * (0.55 + hash2(moss, 59) * 0.45);
            context.fillStyle = `rgba(70, 92, 54, ${0.05 + hash2(moss, 61) * 0.08})`;
            context.beginPath();
            context.arc(x, y, 3 + hash2(moss, 67) * 7, 0, Math.PI * 2);
            context.fill();
        }
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/**
 * Builds the packed-earth plaza surrounding the coliseum.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @returns {import('three').CanvasTexture} Dirt albedo configured for repeat.
 */
function buildDirtTexture(THREE) {
    const texture = paintTexture(THREE, 512, (context, size) => {
        context.fillStyle = '#2b2823';
        context.fillRect(0, 0, size, size);
        for (let blotch = 0; blotch < 900; blotch += 1) {
            const x = hash2(blotch, 11) * size;
            const y = hash2(blotch, 19) * size;
            const radius = 4 + hash2(blotch, 23) * 26;
            const dark = hash2(blotch, 29) > 0.5;
            context.fillStyle = dark ? 'rgba(14, 12, 10, 0.16)' : 'rgba(76, 68, 54, 0.10)';
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
}

/**
 * Builds the crimson runner carpet dropped from the royal gate.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @returns {import('three').CanvasTexture} Carpet albedo.
 */
function buildCarpetTexture(THREE) {
    return paintTexture(THREE, 256, (context, size) => {
        context.fillStyle = '#7c1f26';
        context.fillRect(0, 0, size, size);
        context.fillStyle = '#c99b3d';
        context.fillRect(0, 0, size * 0.055, size);
        context.fillRect(size * 0.945, 0, size * 0.055, size);
        context.fillStyle = 'rgba(0, 0, 0, 0.14)';
        for (let band = 0; band < 8; band += 1) {
            context.fillRect(0, band * size / 8, size, size / 26);
        }
        for (let weave = 0; weave < 1400; weave += 1) {
            context.fillStyle = hash2(weave, 7) > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
            context.fillRect(hash2(weave, 13) * size, hash2(weave, 17) * size, 2, 2);
        }
    });
}

/**
 * Builds a faction banner hanging between colonnade columns.
 *
 * @param {typeof import('three')} THREE Active Three.js module.
 * @param {string} primary Banner body color.
 * @param {string} emblem Emblem circle color.
 * @returns {import('three').CanvasTexture} Banner albedo.
 */
function buildBannerTexture(THREE, primary, emblem) {
    return paintTexture(THREE, 128, (context, size) => {
        const gradient = context.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, primary);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        context.strokeStyle = '#c99b3d';
        context.lineWidth = 6;
        context.strokeRect(4, 4, size - 8, size - 8);
        context.fillStyle = emblem;
        context.beginPath();
        context.arc(size / 2, size * 0.42, size * 0.2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(0, 0, 0, 0.35)';
        context.beginPath();
        context.moveTo(0, size * 0.82);
        context.lineTo(size, size * 0.82);
        context.lineTo(size, size);
        context.lineTo(0, size);
        context.closePath();
        context.fill();
    });
}

/**
 * Builds and updates the coliseum surrounding the simulation plane.
 */
export class ArenaView {
    #THREE;
    #bannerMeshes = [];
    #canopy;
    #crowd;
    #crowdBodies;
    #crowdHeadMaterials;
    #crowdHeads;
    #crowdMaximum = 240;
    #crowdPhases = [];
    #crowdSeated = [];
    #flames = [];
    #gasPuffs = [];
    #gasRadius = 0;
    #group;
    #moteGeometry;
    #moteLives = [];
    #motes;
    #propAssets;
    #safeRadiusVisible = false;
    #toxicMaterial;
    #tracker;

    /**
     * @param {{ THREE: typeof import('three'), scene: import('three').Scene, tracker: import('./resource-tracker.js').ResourceTracker, propAssets?: SyntyPropAssets|null }} options Arena dependencies.
     */
    constructor({ THREE, scene, tracker, propAssets = null }) {
        this.#THREE = THREE;
        this.#tracker = tracker;
        // Duck-typed rather than instanceof: dev harnesses may load this
        // module graph twice (cache-busted URLs), and a structurally valid
        // asset instance from the twin module must still be accepted.
        this.#propAssets = propAssets && typeof propAssets.has === 'function'
            && typeof propAssets.create === 'function'
            && typeof propAssets.createMerged === 'function'
            ? propAssets
            : null;
        this.#group = tracker.track(new THREE.Group());
        this.#group.name = 'gladcode-coliseum';
        scene.add(this.#group);

        this.#buildSky();
        this.#buildGround();
        this.#buildArenaFloor();
        this.#buildWallsAndStands();
        this.#buildColonnade();
        this.#buildRoyalDais();
        this.#buildGates();
        this.#buildCrowd();
        this.#buildBraziers();
        this.#buildPoisonField();
        this.#buildSyntyDressing();
    }

    /**
     * Places a dressing prop when its asset parsed successfully.
     *
     * @param {string} key Prop registry key.
     * @param {{ position?: [number, number, number], rotationY?: number, scale?: number, tint?: number }} [options] Placement.
     * @returns {import('three').Group|null} The added instance for animation hooks.
     */
    #addProp(key, { position = [0, 0, 0], rotationY = 0, scale = 1, tint } = {}) {
        const instance = this.#propAssets?.create(key, { tint });
        if (!instance) return null;
        instance.position.set(...position);
        instance.rotation.y = rotationY;
        if (scale !== 1) instance.scale.multiplyScalar(scale);
        this.#group.add(instance);
        return instance;
    }

    /**
     * Creates a tracked mesh and enables the requested shadow behavior.
     *
     * @param {import('three').BufferGeometry} geometry Mesh geometry.
     * @param {import('three').Material} material Mesh material.
     * @param {{ cast?: boolean, receive?: boolean, parent?: import('three').Object3D }} [options] Shadow and parent flags.
     * @returns {import('three').Mesh} Created mesh.
     */
    #mesh(geometry, material, { cast = false, receive = false, parent = this.#group } = {}) {
        this.#tracker.track(geometry);
        this.#tracker.track(material);
        const mesh = this.#tracker.track(new this.#THREE.Mesh(geometry, material));
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
        parent.add(mesh);
        return mesh;
    }

    /** Clones the shared stone texture with independent tiling. */
    #stoneMaterial(repeatX, repeatY, tint = 0xffffff) {
        const THREE = this.#THREE;
        const texture = buildStoneTexture(THREE);
        texture.repeat.set(repeatX, repeatY);
        return new THREE.MeshStandardMaterial({ map: texture, color: tint, roughness: 0.86, metalness: 0.05 });
    }

    /** Dusk gradient dome that frames the coliseum silhouette. */
    #buildSky() {
        const THREE = this.#THREE;
        const material = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            uniforms: {
                topColor: { value: new THREE.Color(0x0b1118) },
                midColor: { value: new THREE.Color(0x18232e) },
                horizonColor: { value: new THREE.Color(0x3a3f47) },
                glowColor: { value: new THREE.Color(0x8c6a3f) },
                sunDirection: { value: new THREE.Vector3(-0.38, 0.62, 0.44).normalize() },
            },
            vertexShader: `
                varying vec3 worldDirection;
                void main() {
                    worldDirection = normalize(position);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 worldDirection;
                uniform vec3 topColor;
                uniform vec3 midColor;
                uniform vec3 horizonColor;
                uniform vec3 glowColor;
                uniform vec3 sunDirection;
                void main() {
                    float height = clamp(worldDirection.y, 0.0, 1.0);
                    vec3 color = mix(horizonColor, midColor, smoothstep(0.0, 0.24, height));
                    color = mix(color, topColor, smoothstep(0.22, 0.72, height));
                    float sun = pow(max(dot(normalize(worldDirection), normalize(sunDirection)), 0.0), 14.0);
                    color += glowColor * sun * 0.55;
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
        });
        const dome = this.#mesh(new THREE.SphereGeometry(46, 28, 14), material);
        dome.renderOrder = -1;
    }

    /** Lays the packed-earth plaza the coliseum structure sits on. */
    #buildGround() {
        const THREE = this.#THREE;
        const ground = this.#mesh(
            new THREE.CircleGeometry(34, 56),
            new THREE.MeshStandardMaterial({ map: buildDirtTexture(THREE), roughness: 0.97 }),
            { receive: true },
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.06;
    }

    /** Builds the exact 25 by 25 sand plane with baked markings. */
    #buildArenaFloor() {
        const THREE = this.#THREE;
        const sandTop = this.#mesh(
            new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
            new THREE.MeshStandardMaterial({
                map: buildSandTexture(THREE),
                roughness: 0.94,
                metalness: 0.02,
            }),
            { receive: true },
        );
        sandTop.rotation.x = -Math.PI / 2;
        sandTop.position.y = 0.005;

        // Skirt hides the slab thickness below the playing surface.
        const skirt = this.#mesh(
            new THREE.BoxGeometry(ARENA_SIZE + 0.3, 0.7, ARENA_SIZE + 0.3),
            new THREE.MeshStandardMaterial({ color: 0x6b5330, roughness: 0.95 }),
            { receive: true },
        );
        skirt.position.y = -0.365;

        const crest = this.#mesh(
            new THREE.RingGeometry(0.9, 1.06, 40),
            new THREE.MeshStandardMaterial({ color: 0x9d6b32, roughness: 0.62, metalness: 0.4 }),
            { receive: true },
        );
        crest.rotation.x = -Math.PI / 2;
        crest.position.y = 0.012;
    }

    /** Builds stone walls, stepped benches and four watchtowers. */
    #buildWallsAndStands() {
        const THREE = this.#THREE;

        const wallLength = ARENA_SIZE + 1.4;
        const wallDepth = 0.9;
        const wallHeight = 1.35;
        const wallMaterial = this.#stoneMaterial(wallLength / 2.4, 1);
        const walls = [
            { size: [wallLength, wallHeight, wallDepth], position: [0, wallHeight / 2, -13.15] },
            { size: [wallLength, wallHeight, wallDepth], position: [0, wallHeight / 2, 13.15] },
            { size: [wallDepth, wallHeight, wallLength], position: [-13.15, wallHeight / 2, 0] },
            { size: [wallDepth, wallHeight, wallLength], position: [13.15, wallHeight / 2, 0] },
        ];
        walls.forEach(({ size, position }) => {
            const wall = this.#mesh(new THREE.BoxGeometry(...size), wallMaterial, { cast: true, receive: true });
            wall.position.set(...position);

            const cap = this.#mesh(
                new THREE.BoxGeometry(size[0] === wallDepth ? wallDepth + 0.24 : wallLength + 0.24, 0.12, size[2] === wallDepth ? wallDepth + 0.24 : wallLength + 0.24),
                new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 0.8 }),
                { cast: true, receive: true },
            );
            cap.position.set(position[0], wallHeight + 0.06, position[2]);
        });

        const standTint = [0xb8b2aa, 0xa39d95, 0x8f8981];
        for (let level = 0; level < 3; level += 1) {
            const height = 0.45 + level * 0.52;
            const inset = 14.1 + level * 0.7;
            const benchLength = ARENA_SIZE + 2 + level * 1.4;
            const benchDepth = 0.72;
            const material = this.#stoneMaterial(benchLength / 3, 0.6, standTint[level]);
            const benches = [
                { size: [benchLength, height, benchDepth], position: [0, height / 2 - 0.02, -inset] },
                { size: [benchLength, height, benchDepth], position: [0, height / 2 - 0.02, inset] },
                { size: [benchDepth, height, benchLength], position: [-inset, height / 2 - 0.02, 0] },
                { size: [benchDepth, height, benchLength], position: [inset, height / 2 - 0.02, 0] },
            ];
            benches.forEach(({ size, position }) => {
                const bench = this.#mesh(new THREE.BoxGeometry(...size), material, { cast: level === 2, receive: true });
                bench.position.set(...position);
            });
        }

        // Watchtowers anchor the corners and carry the coliseum silhouette.
        const towerMaterial = this.#stoneMaterial(2.4, 2.2);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x14506f, roughness: 0.55, metalness: 0.25 });
        [[-13.6, -13.6], [13.6, -13.6], [-13.6, 13.6], [13.6, 13.6]].forEach(([x, z]) => {
            const tower = this.#mesh(new THREE.CylinderGeometry(1.05, 1.28, 5.4, 12), towerMaterial, { cast: true, receive: true });
            tower.position.set(x, 2.7, z);
            const roof = this.#mesh(new THREE.ConeGeometry(1.42, 1.5, 12), roofMaterial, { cast: true });
            roof.position.set(x, 6.15, z);
        });
    }

    /** Builds the outer colonnade with architrave, parapet and banners. */
    #buildColonnade() {
        const THREE = this.#THREE;
        const dummy = new THREE.Object3D();

        // Sculpted pack pillars replace the procedural column stack when the
        // ancient-empire drop is available; the whole ring merges into one
        // draw call so the colonnade stays cheap on weaker GPUs.
        let colonnadeBuilt = false;
        if (this.#propAssets?.has('pillar')) {
            const transforms = [];
            for (let index = 0; index < COLONNADE_COUNT; index += 1) {
                const angle = index / COLONNADE_COUNT * Math.PI * 2 + Math.PI / COLONNADE_COUNT * 0.5;
                transforms.push({
                    position: [Math.cos(angle) * COLONNADE_RADIUS, 0, Math.sin(angle) * COLONNADE_RADIUS],
                    rotationY: -angle,
                });
            }
            const colonnade = this.#propAssets.createMerged('pillar', transforms);
            if (colonnade) {
                this.#group.add(colonnade);
                colonnadeBuilt = true;
            }
            else {
                // Merge failed (unexpected geometry): fall back to clones.
                for (let index = 0; index < COLONNADE_COUNT; index += 1) {
                    const angle = index / COLONNADE_COUNT * Math.PI * 2 + Math.PI / COLONNADE_COUNT * 0.5;
                    const pillar = this.#propAssets.create('pillar');
                    if (!pillar) break;
                    pillar.position.set(Math.cos(angle) * COLONNADE_RADIUS, 0, Math.sin(angle) * COLONNADE_RADIUS);
                    pillar.rotation.y = -angle;
                    this.#group.add(pillar);
                }
                colonnadeBuilt = true;
            }
        }
        if (!colonnadeBuilt) {
            const shaftGeometry = new THREE.CylinderGeometry(0.27, 0.33, 3.3, 10);
            const baseGeometry = new THREE.CylinderGeometry(0.46, 0.5, 0.3, 10);
            const capitalGeometry = new THREE.BoxGeometry(0.78, 0.24, 0.78);
            const columnMaterial = this.#stoneMaterial(1, 2.4, 0xdad5cc);
            [shaftGeometry, baseGeometry, capitalGeometry].forEach((geometry) => this.#tracker.track(geometry));
            this.#tracker.track(columnMaterial);

            const shafts = this.#tracker.track(new THREE.InstancedMesh(shaftGeometry, columnMaterial, COLONNADE_COUNT));
            const bases = this.#tracker.track(new THREE.InstancedMesh(baseGeometry, columnMaterial, COLONNADE_COUNT));
            const capitals = this.#tracker.track(new THREE.InstancedMesh(capitalGeometry, columnMaterial, COLONNADE_COUNT));
            [shafts, bases, capitals].forEach((instanced) => {
                instanced.castShadow = true;
                instanced.receiveShadow = true;
                this.#group.add(instanced);
            });

            for (let index = 0; index < COLONNADE_COUNT; index += 1) {
                const angle = index / COLONNADE_COUNT * Math.PI * 2 + Math.PI / COLONNADE_COUNT * 0.5;
                const x = Math.cos(angle) * COLONNADE_RADIUS;
                const z = Math.sin(angle) * COLONNADE_RADIUS;
                dummy.rotation.set(0, -angle, 0);
                dummy.position.set(x, 1.95, z);
                dummy.updateMatrix();
                shafts.setMatrixAt(index, dummy.matrix);
                dummy.position.y = 0.15;
                dummy.updateMatrix();
                bases.setMatrixAt(index, dummy.matrix);
                dummy.position.y = 3.72;
                dummy.updateMatrix();
                capitals.setMatrixAt(index, dummy.matrix);
            }
            [shafts, bases, capitals].forEach((instanced) => {
                instanced.instanceMatrix.needsUpdate = true;
            });
        }

        const architrave = this.#mesh(
            new THREE.TorusGeometry(COLONNADE_RADIUS, 0.19, 7, 72),
            new THREE.MeshStandardMaterial({ color: 0xc99b3d, roughness: 0.42, metalness: 0.55 }),
            { cast: true },
        );
        architrave.rotation.x = Math.PI / 2;
        architrave.position.y = 4.02;

        const parapet = this.#mesh(
            new THREE.CylinderGeometry(16.65, 16.65, 1.05, 64, 1, true),
            new THREE.MeshStandardMaterial({
                map: (() => {
                    const texture = buildStoneTexture(THREE);
                    texture.repeat.set(18, 0.7);
                    return texture;
                })(),
                roughness: 0.88,
                side: THREE.DoubleSide,
            }),
            { receive: true },
        );
        parapet.position.y = 0.52;

        const parapetRim = this.#mesh(
            new THREE.TorusGeometry(16.65, 0.085, 6, 64),
            new THREE.MeshStandardMaterial({ color: 0x8f8981, roughness: 0.8 }),
        );
        parapetRim.rotation.x = Math.PI / 2;
        parapetRim.position.y = 1.07;

        // Faction banners alternate between the home and visiting sides.
        const bannerColors = [
            ['#1d5d84', '#e8c56a'],
            ['#8c3030', '#f0e6c8'],
        ];
        for (let banner = 0; banner < 8; banner += 1) {
            const angle = banner / 8 * Math.PI * 2 + Math.PI / 8;
            const [primary, emblem] = bannerColors[banner % 2];
            const cloth = this.#propAssets?.has('wallBanner')
                ? this.#propAssets.create('wallBanner', { tint: primary })
                : this.#legacyBanner(primary, emblem);
            if (!cloth) continue;
            cloth.position.set(Math.cos(angle) * COLONNADE_RADIUS, this.#propAssets?.has('wallBanner') ? 3.9 : 2.85, Math.sin(angle) * COLONNADE_RADIUS);
            cloth.rotation.y = -angle + Math.PI / 2;
            cloth.userData.phase = banner * 0.9;
            this.#group.add(cloth);
            this.#bannerMeshes.push(cloth);
        }
    }

    /** Builds the flat faction banner used when prop assets are unavailable. */
    #legacyBanner(primary, emblem) {
        const THREE = this.#THREE;
        const material = new THREE.MeshStandardMaterial({
            map: buildBannerTexture(THREE, primary, emblem),
            roughness: 0.9,
            side: THREE.DoubleSide,
        });
        return this.#mesh(new THREE.PlaneGeometry(1.05, 2.1), material, { cast: false });
    }

    /** Builds a restrained royal platform that anchors the north stand. */
    #buildRoyalDais() {
        const THREE = this.#THREE;

        const stepMaterial = this.#stoneMaterial(3, 0.8);
        [[5.9, 0.32, 2.9, 1.5], [5.4, 0.3, 2.5, 1.81]].forEach(([width, height, depth, y]) => {
            const step = this.#mesh(new THREE.BoxGeometry(width, height, depth), stepMaterial, { cast: true, receive: true });
            step.position.set(0, y, -15.5);
        });

        const platform = this.#mesh(
            new THREE.BoxGeometry(5, 0.42, 2.1),
            new THREE.MeshStandardMaterial({ color: 0x3a4c55, roughness: 0.66, metalness: 0.18 }),
            { cast: true, receive: true },
        );
        platform.position.set(0, 2.12, -15.5);

        const trim = this.#mesh(
            new THREE.BoxGeometry(5.1, 0.08, 2.2),
            new THREE.MeshStandardMaterial({ color: 0xc99b3d, roughness: 0.4, metalness: 0.6 }),
            { cast: false },
        );
        trim.position.set(0, 2.36, -15.5);

        const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x00638d, roughness: 0.6, metalness: 0.15, side: THREE.DoubleSide });
        this.#canopy = this.#mesh(new THREE.BoxGeometry(4.7, 0.12, 1.9), canopyMaterial, { cast: true });
        this.#canopy.position.set(0, 4.05, -15.5);

        for (const x of [-2.05, 2.05]) {
            const pillar = this.#mesh(
                new THREE.CylinderGeometry(0.13, 0.17, 1.95, 8),
                new THREE.MeshStandardMaterial({ color: 0xc99b3d, roughness: 0.42, metalness: 0.6 }),
                { cast: true },
            );
            pillar.position.set(x, 3.05, -15.5);
        }

        const carpet = this.#mesh(
            new THREE.PlaneGeometry(1.8, 9.4),
            new THREE.MeshStandardMaterial({ map: buildCarpetTexture(THREE), roughness: 0.92 }),
            { receive: true },
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.016, -9.2);
    }

    /** Adds recessed gate arches on the north and south walls. */
    #buildGates() {
        const THREE = this.#THREE;
        const gateMaterial = new THREE.MeshStandardMaterial({ color: 0x171310, roughness: 0.95 });
        const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xc99b3d, roughness: 0.45, metalness: 0.55 });

        [-13.12, 13.12].forEach((z) => {
            const opening = this.#mesh(new THREE.BoxGeometry(3.1, 1.2, 0.34), gateMaterial, {});
            opening.position.set(0, 0.58, z);

            const arch = this.#mesh(new THREE.TorusGeometry(1.55, 0.12, 6, 24, Math.PI), trimMaterial, { cast: false });
            arch.position.set(0, 1.18, z + (z > 0 ? -0.2 : 0.2));
            if (z > 0) arch.rotation.y = Math.PI;
        });
    }

    /** Builds deterministic two-layer crowds whose wave animates cheaply. */
    #buildCrowd() {
        const THREE = this.#THREE;
        const bodyGeometry = this.#tracker.track(new THREE.CapsuleGeometry(0.14, 0.24, 3, 6));
        const headGeometry = this.#tracker.track(new THREE.SphereGeometry(0.105, 7, 5));
        const bodyMaterial = this.#tracker.track(new THREE.MeshStandardMaterial({ roughness: 0.85 }));
        this.#crowdHeadMaterials = this.#tracker.track(new THREE.MeshStandardMaterial({ roughness: 0.78 }));

        this.#crowdBodies = this.#tracker.track(new THREE.InstancedMesh(bodyGeometry, bodyMaterial, this.#crowdMaximum));
        this.#crowdHeads = this.#tracker.track(new THREE.InstancedMesh(headGeometry, this.#crowdHeadMaterials, this.#crowdMaximum));
        [this.#crowdBodies, this.#crowdHeads].forEach((instanced) => {
            instanced.castShadow = false;
            instanced.frustumCulled = false;
            this.#group.add(instanced);
        });

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        let seed = 0x6c6164;
        const random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
        const shirtColors = [0x4d7588, 0x8d5148, 0xc18b52, 0x5f6947, 0x69517d, 0x4c4a49, 0x9c7c4e];
        const skinColors = [0xe8bd98, 0xcf9d72, 0xa5714a, 0x7c4f33];

        for (let index = 0; index < this.#crowdMaximum; index += 1) {
            const side = index % 4;
            const level = index % 3;
            const along = (random() - 0.5) * (ARENA_SIZE + level * 1.2);
            const offset = 14.05 + level * 0.7;
            const seatHeight = 0.85 + level * 0.52;

            const positionX = side === 0 || side === 2
                ? along + (random() - 0.5) * 0.3
                : (side === 1 ? offset : -offset) + (random() - 0.5) * 0.24;
            const positionZ = side === 0
                ? -offset + (random() - 0.5) * 0.24
                : side === 2
                    ? offset + (random() - 0.5) * 0.24
                    : along + (random() - 0.5) * 0.24;

            this.#crowdPhases.push(random() * Math.PI * 2);
            this.#crowdSeated.push({ x: positionX, z: positionZ, y: seatHeight, yaw: (side === 1 ? -Math.PI / 2 : side === 3 ? Math.PI / 2 : side === 2 ? Math.PI : 0) + (random() - 0.5) * 0.5, scale: 0.85 + random() * 0.3 });

            dummy.rotation.set(0, this.#crowdSeated[index].yaw, 0);
            dummy.scale.setScalar(this.#crowdSeated[index].scale);
            dummy.position.set(positionX, seatHeight + 0.32 * this.#crowdSeated[index].scale, positionZ);
            dummy.updateMatrix();
            this.#crowdBodies.setMatrixAt(index, dummy.matrix);
            this.#crowdBodies.setColorAt(index, color.setHex(shirtColors[index % shirtColors.length]));

            dummy.position.y = seatHeight + 0.66 * this.#crowdSeated[index].scale;
            dummy.updateMatrix();
            this.#crowdHeads.setMatrixAt(index, dummy.matrix);
            this.#crowdHeads.setColorAt(index, color.setHex(skinColors[Math.floor(random() * skinColors.length)]));
        }
        this.#crowdBodies.instanceMatrix.needsUpdate = true;
        this.#crowdHeads.instanceMatrix.needsUpdate = true;
        if (this.#crowdBodies.instanceColor) this.#crowdBodies.instanceColor.needsUpdate = true;
        if (this.#crowdHeads.instanceColor) this.#crowdHeads.instanceColor.needsUpdate = true;
    }

    /** Builds braziers with layered flame sprites and warm point lights. */
    #buildBraziers() {
        const THREE = this.#THREE;
        const brazierGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.78, 9);
        const rimGeometry = new THREE.TorusGeometry(0.3, 0.05, 6, 14);
        const brazierMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3625, roughness: 0.55, metalness: 0.5 });
        const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x8f7442, roughness: 0.45, metalness: 0.6 });
        const flameLayers = [
            { radius: 0.21, height: 0.62, color: 0xff8c2e, opacity: 0.78 },
            { radius: 0.14, height: 0.46, color: 0xffb75c, opacity: 0.85 },
            { radius: 0.08, height: 0.3, color: 0xfff3c4, opacity: 0.95 },
        ];

        [
            [-12.2, -12.2],
            [12.2, -12.2],
            [-12.2, 12.2],
            [12.2, 12.2],
        ].forEach(([x, z], index) => {
            if (!this.#addProp('brazier', { position: [x, 0, z], rotationY: index * Math.PI / 2 })) {
                const brazier = this.#mesh(brazierGeometry, brazierMaterial, { cast: true });
                brazier.position.set(x, 0.78, z);
                const rim = this.#mesh(rimGeometry, rimMaterial);
                rim.rotation.x = Math.PI / 2;
                rim.position.set(x, 1.17, z);
            }

            const group = this.#tracker.track(new THREE.Group());
            // The dungeon brazier bowl tops out near 0.9; seat the flames on it.
            group.position.set(x, 1.02, z);
            this.#group.add(group);
            flameLayers.forEach(({ radius, height, color, opacity }, layerIndex) => {
                const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
                const flame = this.#mesh(new THREE.ConeGeometry(radius, height, 7), material, { parent: group });
                flame.position.y = layerIndex * 0.055;
                flame.userData.phase = index * 1.7 + layerIndex * 0.6;
                flame.userData.layer = layerIndex;
                this.#flames.push(flame);
            });

            const light = this.#tracker.track(new THREE.PointLight(0xff9a4a, 5.5, 8.5, 1.9));
            light.position.set(x, 1.8, z);
            light.userData.phase = index * 1.7;
            this.#flames.push(light);
        });
    }

    /**
     * Dresses the coliseum with sculpted pieces from the dungeon and
     * ancient-empire drops; every placement silently no-ops when the pack or a
     * single file is unavailable so the procedural arena remains complete.
     */
    #buildSyntyDressing() {
        if (!this.#propAssets) return;

        // Royal box: a stone throne on the dais, statues flanking the carpet.
        this.#addProp('throne', { position: [0, 2.33, -15.7], rotationY: Math.PI });
        this.#addProp('statue', { position: [-2.55, 0, -11.4], rotationY: Math.PI / 5 });
        this.#addProp('statue', { position: [2.55, 0, -11.4], rotationY: -Math.PI / 5 });

        // Lions guard the visiting gate; obelisks anchor the outer diagonals.
        this.#addProp('lionStatue', { position: [-3.1, 0, 15.1], rotationY: -Math.PI / 2 });
        this.#addProp('lionStatue', { position: [3.1, 0, 15.1], rotationY: Math.PI / 2 });
        [[-14.4, -14.4], [14.4, -14.4], [-14.4, 14.4], [14.4, 14.4]].forEach(([x, z]) => {
            this.#addProp('obelisk', { position: [x, 0, z], rotationY: Math.atan2(x, z) });
        });

        // Iron portcullises rise over both processional gates; the lighter
        // iron tint keeps the bars readable against the dusk sky.
        this.#addProp('portcullis', { position: [0, 0, -13.15], tint: 0x8a9099 });
        this.#addProp('portcullis', { position: [0, 0, 13.15], tint: 0x8a9099 });

        // Weapon racks flank the royal gate outside the colonnade.
        this.#addProp('weaponRack', { position: [-4.6, 0, -18.4], rotationY: Math.PI });
        this.#addProp('weaponRack', { position: [4.6, 0, -18.4], rotationY: Math.PI });
        this.#addProp('weaponRack', { position: [-4.6, 0, 18.4], rotationY: 0 });
        this.#addProp('weaponRack', { position: [4.6, 0, 18.4], rotationY: 0 });

        // Wall torches line the stands; their flames join the shared animation.
        const torchSpots = [
            [-6.5, -12.68], [6.5, -12.68], [-6.5, 12.68], [6.5, 12.68],
            [-12.68, -6.5], [-12.68, 6.5], [12.68, -6.5], [12.68, 6.5],
        ];
        torchSpots.forEach(([x, z], index) => {
            const placed = this.#addProp('torch', { position: [x, 1.41, z], rotationY: Math.atan2(-x, -z) });
            if (!placed) return;
            const material = new this.#THREE.MeshBasicMaterial({
                color: 0xffa64d,
                transparent: true,
                opacity: 0.82,
                depthWrite: false,
            });
            const flame = this.#mesh(new this.#THREE.ConeGeometry(0.09, 0.34, 6), material);
            flame.position.set(x, 2.32, z);
            flame.userData.phase = index * 1.3;
            flame.userData.layer = 1;
            this.#flames.push(flame);
        });

        // Bone piles scattered along the sand edge hint at earlier bouts.
        for (let pile = 0; pile < 6; pile += 1) {
            const angle = SyntyPropAssets.hash2(pile, 91) * Math.PI * 2;
            const radius = 10.6 + SyntyPropAssets.hash2(pile, 97) * 1.5;
            this.#addProp('bonePile', {
                position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
                rotationY: SyntyPropAssets.hash2(pile, 103) * Math.PI * 2,
                scale: 0.75 + SyntyPropAssets.hash2(pile, 109) * 0.5,
            });
        }
    }

    /** Builds the shader-driven poison field, boundary rings and drifting motes. */
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

                float hash(vec2 point) {
                    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 point) {
                    vec2 cell = floor(point);
                    vec2 local = fract(point);
                    vec2 smoothLocal = local * local * (3.0 - 2.0 * local);
                    float a = hash(cell);
                    float b = hash(cell + vec2(1.0, 0.0));
                    float c = hash(cell + vec2(0.0, 1.0));
                    float d = hash(cell + vec2(1.0, 1.0));
                    return mix(mix(a, b, smoothLocal.x), mix(c, d, smoothLocal.x), smoothLocal.y);
                }

                float fbm(vec2 point) {
                    float total = 0.0;
                    float amplitude = 0.55;
                    for (int octave = 0; octave < 3; octave++) {
                        total += noise(point) * amplitude;
                        point *= 2.15;
                        amplitude *= 0.5;
                    }
                    return total;
                }

                void main() {
                    float arenaDistance = distance(arenaUv, vec2(0.5)) * ${ARENA_SIZE.toFixed(1)};
                    float exposure = smoothstep(safeRadius - 0.7, safeRadius - 0.1, arenaDistance);

                    vec2 drift = vec2(time * 0.05, -time * 0.038);
                    float haze = fbm(arenaUv * 5.0 + drift);
                    float swirl = fbm(arenaUv * 9.0 - drift * 1.6);
                    float churn = mix(haze, swirl, 0.45);

                    // Broad soft gradient instead of a hard boundary line: the
                    // classic renderer reads the frontier as drifting gas.
                    float frontier = smoothstep(safeRadius - 1.9, safeRadius + 0.6, arenaDistance);
                    float pulse = 0.72 + 0.28 * sin(time * 1.7 - arenaDistance * 0.9);

                    vec3 deepColor = vec3(0.07, 0.32, 0.13);
                    vec3 brightColor = vec3(0.32, 0.83, 0.3);
                    vec3 color = mix(deepColor, brightColor, churn * exposure);
                    color += vec3(0.36, 0.82, 0.34) * frontier * pulse * 0.42;

                    float alpha = exposure * (0.2 + churn * 0.34) + frontier * pulse * 0.22;
                    gl_FragColor = vec4(color, alpha);
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

        // Soft gas puffs straddling the frontier, echoing the classic renderer.
        const gasTexture = paintTexture(THREE, 128, (context, size) => {
            const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, size, size);
        });
        const gasGeometry = this.#tracker.track(new THREE.PlaneGeometry(1, 1));
        this.#tracker.track(gasTexture);
        for (let puff = 0; puff < 46; puff += 1) {
            const material = this.#tracker.track(new THREE.MeshBasicMaterial({
                map: gasTexture,
                color: 0x74d95e,
                transparent: true,
                opacity: 0.16,
                depthWrite: false,
            }));
            const sprite = this.#mesh(gasGeometry, material, { parent: this.#group });
            sprite.rotation.x = -Math.PI / 2;
            sprite.renderOrder = 4;
            sprite.visible = false;
            this.#gasPuffs.push({
                mesh: sprite,
                material,
                angle: (puff / 46) * Math.PI * 2 + hash2(puff, 5) * 0.5,
                offset: 0.2 + hash2(puff, 13) * 1.5,
                height: 0.1 + hash2(puff, 17) * 0.35,
                baseScale: 1.5 + hash2(puff, 23) * 1.7,
                drift: (hash2(puff, 29) - 0.5) * 0.14,
                phase: hash2(puff, 31) * Math.PI * 2,
            });
        }

        // Spores loitering above the toxic zone sell the hazard from top-down.
        const moteCount = 110;
        const positions = new Float32Array(moteCount * 3);
        for (let mote = 0; mote < moteCount; mote += 1) {
            const angle = hash2(mote, 3) * Math.PI * 2;
            const radius = CORNER_RADIUS * (0.62 + hash2(mote, 11) * 0.38);
            positions[mote * 3] = Math.cos(angle) * radius;
            positions[mote * 3 + 1] = 0.2 + hash2(mote, 17) * 1.3;
            positions[mote * 3 + 2] = Math.sin(angle) * radius;
            this.#moteLives.push(0.4 + hash2(mote, 23) * 0.6);
        }
        this.#moteGeometry = this.#tracker.track(new THREE.BufferGeometry());
        this.#moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.#moteGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), CORNER_RADIUS + 1);
        this.#motes = this.#tracker.track(new THREE.Points(
            this.#moteGeometry,
            new THREE.PointsMaterial({
                color: 0x9df58a,
                size: 3.2,
                sizeAttenuation: false,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }),
        ));
        this.#motes.renderOrder = 5;
        this.#motes.frustumCulled = false;
        this.#group.add(this.#motes);
    }

    /**
     * Applies the persisted crowd-density preference.
     *
     * @param {number|string} density Density from zero to one.
     */
    setCrowdDensity(density) {
        const normalized = Math.min(1, Math.max(0, Number(density) || 0));
        const count = Math.round(this.#crowdMaximum * normalized);
        this.#crowdBodies.count = count;
        this.#crowdHeads.count = count;
    }

    /**
     * Updates the visual poison field from the exact simlog radius.
     *
     * @param {number|string} radius Current safe radius.
     */
    updateSafeZone(radius) {
        const safeRadius = Math.max(0, Number(radius) || 0);
        this.#toxicMaterial.uniforms.safeRadius.value = safeRadius;
        this.#gasRadius = safeRadius;
        this.#safeRadiusVisible = safeRadius < CORNER_RADIUS - 0.01;
        this.#gasPuffs.forEach((puff) => {
            puff.mesh.visible = this.#safeRadiusVisible;
        });
        this.#positionGasPuffs();
    }

    /** Places every gas puff along the current poison frontier. */
    #positionGasPuffs() {
        this.#gasPuffs.forEach((puff) => {
            const ringRadius = Math.max(0.001, this.#gasRadius + puff.offset);
            puff.mesh.position.set(
                Math.cos(puff.angle) * ringRadius,
                puff.height,
                Math.sin(puff.angle) * ringRadius,
            );
            puff.mesh.scale.setScalar(puff.baseScale);
        });
    }

    /**
     * Advances ambient arena-only motion.
     *
     * @param {number} elapsedSeconds Animation time in seconds; zero freezes ambience.
     */
    animate(elapsedSeconds) {
        this.#toxicMaterial.uniforms.time.value = elapsedSeconds;

        if (elapsedSeconds === 0) return;

        this.#gasPuffs.forEach((puff) => {
            if (!puff.mesh.visible) return;
            const wobble = Math.sin(elapsedSeconds * 0.7 + puff.phase);
            const ringRadius = Math.max(0.001, this.#gasRadius + puff.offset + wobble * 0.22);
            const angle = puff.angle + elapsedSeconds * puff.drift;
            puff.mesh.position.set(
                Math.cos(angle) * ringRadius,
                puff.height + Math.sin(elapsedSeconds * 0.9 + puff.phase) * 0.08,
                Math.sin(angle) * ringRadius,
            );
            const pulse = 1 + Math.sin(elapsedSeconds * 1.3 + puff.phase * 1.7) * 0.14;
            puff.mesh.scale.setScalar(puff.baseScale * pulse);
            puff.material.opacity = 0.13 + Math.sin(elapsedSeconds * 1.1 + puff.phase) * 0.05;
        });

        this.#flames.forEach((flame) => {
            const phase = flame.userData.phase ?? 0;
            if (flame.isPointLight) {
                flame.intensity = 5.5 + Math.sin(elapsedSeconds * 9 + phase) * 1.1 + Math.sin(elapsedSeconds * 23 + phase * 2) * 0.6;
                return;
            }
            const layer = flame.userData.layer ?? 0;
            const wobble = Math.sin(elapsedSeconds * (6 + layer * 2.2) + phase);
            const sway = Math.sin(elapsedSeconds * (3.4 + layer) + phase * 1.3) * 0.06;
            flame.scale.set(1 + wobble * 0.12 - layer * 0.02, 1 + wobble * 0.2, 1 + wobble * 0.12 - layer * 0.02);
            flame.rotation.z = sway;
        });

        this.#bannerMeshes.forEach((banner) => {
            banner.rotation.x = Math.sin(elapsedSeconds * 1.6 + banner.userData.phase) * 0.07;
            banner.rotation.z = Math.sin(elapsedSeconds * 1.1 + banner.userData.phase * 1.4) * 0.045;
        });
        if (this.#canopy) this.#canopy.rotation.z = Math.sin(elapsedSeconds * 0.8) * 0.008;

        // Crowd wave: recompose the modest instance budget each frame.
        const dummy = new this.#THREE.Object3D();
        const count = Math.min(this.#crowdBodies.count, this.#crowdPhases.length);
        for (let index = 0; index < count; index += 1) {
            const phase = this.#crowdPhases[index];
            const seat = this.#crowdSeated[index];
            const bob = Math.sin(elapsedSeconds * 2.1 + phase);
            const cheer = Math.abs(Math.sin(elapsedSeconds * 0.9 + phase * 0.5)) ** 3;
            const lift = 0.035 + cheer * 0.09;

            dummy.rotation.set(0, seat.yaw, Math.sin(elapsedSeconds * 1.6 + phase) * 0.05);
            dummy.scale.setScalar(seat.scale);
            dummy.position.set(seat.x, seat.y + (0.32 + lift * 0.4) * seat.scale, seat.z);
            dummy.updateMatrix();
            this.#crowdBodies.setMatrixAt(index, dummy.matrix);
            dummy.position.set(
                seat.x + Math.sin(elapsedSeconds * 0.7 + phase) * 0.03,
                seat.y + (0.66 + lift) * seat.scale,
                seat.z,
            );
            dummy.updateMatrix();
            this.#crowdHeads.setMatrixAt(index, dummy.matrix);
        }
        if (count > 0) {
            this.#crowdBodies.instanceMatrix.needsUpdate = true;
            this.#crowdHeads.instanceMatrix.needsUpdate = true;
        }

        // Poison spores rise and recycle inside the hazardous ring.
        const positions = this.#moteGeometry.attributes.position.array;
        for (let mote = 0; mote < this.#moteLives.length; mote += 1) {
            this.#moteLives[mote] -= 0.004;
            positions[mote * 3 + 1] += 0.004 + Math.sin(elapsedSeconds * 2 + mote) * 0.0012;
            positions[mote * 3] += Math.sin(elapsedSeconds * 0.6 + mote * 1.7) * 0.0022;
            positions[mote * 3 + 2] += Math.cos(elapsedSeconds * 0.5 + mote * 1.3) * 0.0022;
            if (this.#moteLives[mote] <= 0 || positions[mote * 3 + 1] > 1.7) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() ** 0.6 * CORNER_RADIUS;
                positions[mote * 3] = Math.cos(angle) * radius;
                positions[mote * 3 + 1] = 0.15;
                positions[mote * 3 + 2] = Math.sin(angle) * radius;
                this.#moteLives[mote] = 0.5 + Math.random() * 0.6;
            }
        }
        this.#moteGeometry.attributes.position.needsUpdate = true;
    }
}
