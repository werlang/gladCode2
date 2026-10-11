import { ARENA_SIZE } from './battle-state.js';
import { loadTexture } from './textures.js';

const ROOT = '/assets/synty/ancient-empire/';
const TEXTURES = `${ROOT}Textures/`;
const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
const IMAGE_URL = /\.(png|jpe?g|tga|tif|psd)(\?|$)/i;
/** Dungeon pack pieces (gate arch, portcullis, tunnel, torches): authored in metres on one atlas. */
const DUNGEON = '/assets/synty/dungeon-pack/';
const DUNGEON_PREFIX = 'dungeon:';
/** POLYGON Mini Fantasy pieces (houses, church, castle, background mountains): centimetres, one atlas. */
const MINI = '/assets/synty/fantasy-pack/';
const MINI_PREFIX = 'mini:';
/** Pieces seen only in shadow (the gate tunnels), drawn darker than the sunlit stone. */
const SHADOWED = new Set(['tunnel', 'tunnelEnd']);
/** FBX files are authored in centimetres. */
const UNIT = 0.01;

/**
 * Texture per FBX material name. The names inside the FBX files are the artist's (`MarbleSHD`,
 * `HalfBrick`, ...) rather than the ones in `MaterialList_PolygonAncientEmpire.txt`, and some
 * point at `.psd` files three cannot read, so the pieces used here are mapped by hand.
 * Anything not listed is skinned with the shared colour atlas.
 */
const MATERIAL_TEXTURES = {
    atlas: 'Alts/PolygonAncientWorlds_Texture_01_A.png',
    MarbleSHD: 'BuildingAlts/Building_Marble_02.png',
    HalfBrick: 'BuildingAlts/Building_Half_Brick_01.png',
    lambert1131: 'BuildingAlts/Stucco_White_01.png',
    windowSHD: 'BuildingAlts/Windows_01.png',
    AncientWorlds_Desat_MAT: 'Misc/PolygonAncientWorlds_Texture_01_A_Grey.png',
};

/** Ancient Empire pieces the coliseum is built from, by short name. */
const PIECES = {
    seats: 'Buildings/SM_Bld_Amphitheatre_01',
    seatsStraight: 'Buildings/SM_Bld_Amphitheatre_End_01',
    wall: 'Buildings/SM_Bld_Wall_01',
    wallCap: 'Buildings/SM_Bld_Wall_Large_Cap_01',
    // Gates: a stone arch in the podium, a portcullis and a tunnel running under the stands, torches beside it.
    gateArch: 'dungeon:SM_Env_Wall_Archway_01',
    portcullis: 'dungeon:SM_Env_Portcullis_01',
    tunnel: 'dungeon:SM_Env_Wall_Tunnel_01',
    tunnelEnd: 'dungeon:SM_Env_Wall_01',
    torch: 'dungeon:SM_Prop_Torch_Ornate_02',
    column: 'Buildings/SM_Bld_Pillar_Monument_01',
    beam: 'Buildings/SM_Bld_Trim_Large_01',
    curb: 'Buildings/SM_Bld_Ground_Edge_01',
    brazier: 'Props/SM_Prop_Brazier_01',
    lion: 'Props/SM_Prop_Statue_Lion_01',
    plinth: 'Props/SM_Prop_Plinth_04',
    rack: 'Props/SM_Prop_Weapon_Rack_01',
    rackFull: 'Props/SM_Prop_Weapon_Rack_02',
    banner: 'Props/SM_Prop_Banner_04_A',
    drapery: 'Props/SM_Prop_Drapery_01',
    canopy: 'Props/SM_Prop_Banner_Large_01',
    boxRoof: 'Buildings/SM_Bld_Trellis_Roof_Large_01',
    // Honour box: marble stair and dais, pediment, throne, runner, banners and incense burners.
    royalSteps: 'Buildings/SM_Bld_Step_01',
    pediment: 'Buildings/SM_Bld_Roof_End_Peak_Large_01',
    throne: 'Props/SM_Prop_Seat_Chair_03',
    rug: 'Props/SM_Prop_Rug_01',
    kline: 'Props/SM_Prop_Seat_Kline_Large_01',
    censer: 'Props/SM_Prop_Senser_01',
    royalBanner: 'Props/SM_Prop_Banner_02',
    ...Object.fromEntries([2, 3, 4, 5, 6, 7].map((n) => [`statue${n}`, `Props/SM_Prop_Statue_0${n}`])),
};

/**
 * Reorders a multi-material geometry so each material is one contiguous group: the seating
 * wedge ships as 113 alternating groups, which would otherwise be 113 draw calls per batch.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {import('three').BufferGeometry} geometry Geometry with `groups`.
 * @returns {import('three').BufferGeometry} Geometry with at most one group per material.
 */
function mergeGroups(THREE, geometry) {
    if (geometry.groups.length <= 1) return geometry;
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const groups = [...source.groups].sort((a, b) => a.materialIndex - b.materialIndex);
    const merged = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
        const size = attribute.itemSize;
        const array = new attribute.array.constructor(groups.reduce((total, group) => total + group.count, 0) * size);
        let offset = 0;
        for (const group of groups) {
            array.set(attribute.array.subarray(group.start * size, (group.start + group.count) * size), offset * size);
            offset += group.count;
        }
        merged.setAttribute(name, new THREE.BufferAttribute(array, size, attribute.normalized));
    }
    let start = 0;
    for (const group of groups) {
        const last = merged.groups[merged.groups.length - 1];
        if (last?.materialIndex === group.materialIndex) last.count += group.count;
        else merged.addGroup(start, group.count, group.materialIndex);
        start += group.count;
    }
    return merged;
}

/**
 * One prop baked into metres with its authored pivot kept: the amphitheatre wedges pivot on the
 * centre of their circle, which is what lets them tile. `box` is the bounds in that frame.
 */
class Piece {
    /** @type {Array<{ geometry: import('three').BufferGeometry, materials: string[] }>} */
    parts;
    /** @type {import('three').Box3} */
    box;

    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {import('three').Object3D} root Parsed FBX.
     */
    constructor(THREE, root, { unit = UNIT, material = null } = {}) {
        root.scale.multiplyScalar(unit);
        root.updateMatrixWorld(true);
        this.parts = [];
        this.box = new THREE.Box3();
        root.traverse((node) => {
            if (!node.isMesh) return;
            const geometry = mergeGroups(THREE, node.geometry.clone().applyMatrix4(node.matrixWorld));
            geometry.computeBoundingBox();
            this.box.union(geometry.boundingBox);
            this.parts.push({ geometry, materials: [].concat(node.material).map((entry) => material ?? entry.name) });
        });
    }
}

/** Half-width of the area kept in view: the combat square plus its curb and a margin. */
const SEE_THROUGH_HALF = ARENA_SIZE / 2 + 1.5;
/** Distance from the camera inside which the structure starts thinning out. */
const SEE_NEAR = 6;

/**
 * Lets the camera see through the stands: a fragment fades out (screen-door dithering, so no sorting) when the
 * line of sight through it would reach the ground inside the combat square, i.e. when the structure stands
 * between the camera and the fight. Ground-level pieces such as the curb never fade, and a faint ghost stays.
 *
 * @param {import('three').Material} material Coliseum material to patch.
 */
function seeThrough(material) {
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vSeeWorld;')
            .replace('#include <project_vertex>', `#include <project_vertex>
vec4 seeWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
seeWorld = instanceMatrix * seeWorld;
#endif
vSeeWorld = (modelMatrix * seeWorld).xyz;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vSeeWorld;
const float SEE_BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);`)
            .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{
    vec3 ray = vSeeWorld - cameraPosition;
    // Anything right in front of the lens (a column the camera brushes past) thins out too.
    float fade = 0.92 * (1.0 - smoothstep(${SEE_NEAR.toFixed(1)}, ${(SEE_NEAR + 5).toFixed(1)}, length(ray)));
    if (ray.y < -1e-4 && vSeeWorld.y > 0.25) {
        vec2 ground = cameraPosition.xz + ray.xz * (-cameraPosition.y / ray.y);
        float inside = 1.0 - smoothstep(${(SEE_THROUGH_HALF - 2).toFixed(2)}, ${(SEE_THROUGH_HALF + 1).toFixed(2)}, max(abs(ground.x), abs(ground.y)));
        fade = max(fade, 0.88 * inside * smoothstep(0.25, 1.2, vSeeWorld.y));
    }
    ivec2 cell = ivec2(mod(gl_FragCoord.xy, 4.0));
    if (fade > (SEE_BAYER[cell.x + cell.y * 4] + 0.5) / 16.0) discard;
}`);
    };
    material.customProgramCacheKey = () => 'synty-see-through';
}

/** Loaded Ancient Empire pieces plus the textured materials that skin them. */
export class SyntyArenaKit {
    #THREE;
    #pieces;
    #materials;
    #textures;

    /**
     * @param {typeof import('three')} THREE Three namespace.
     * @param {Map<string, Piece>} pieces Loaded pieces by short name.
     * @param {Record<string, import('three').Texture>} textures Textures by material name (`atlas` for the rest).
     */
    constructor(THREE, pieces, textures) {
        this.#THREE = THREE;
        this.#pieces = pieces;
        this.#textures = textures;
        this.#materials = Object.fromEntries(Object.entries(textures).map(([name, map]) => {
            // The dungeon stone is warmed a little so the gates sit with the stucco and marble.
            const material = new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, color: { dungeon: 0xf2e2c6, dungeonDark: 0x4a4038 }[name] ?? 0xffffff });
            seeThrough(material);
            return [name, material];
        }));
    }

    /**
     * @param {string} name Piece name from PIECES.
     * @returns {import('three').Box3} Bounds of the piece around its authored pivot, in metres.
     */
    box(name) {
        return this.#pieces.get(name).box;
    }

    /**
     * Draws many copies of a piece, one instanced mesh per sub-mesh.
     *
     * @param {string} name Piece name from PIECES.
     * @param {Array<{ x: number, y?: number, z: number, ry?: number, sx?: number, sy?: number, sz?: number, color?: number }>} placements Copies to draw.
     * @param {{ center?: boolean }} [options] `center` moves the pivot to the bottom centre of the bounds first.
     * @returns {import('three').Group} Group to add to the scene.
     */
    instances(name, placements, { center = false } = {}) {
        const THREE = this.#THREE;
        const piece = this.#pieces.get(name);
        const group = new THREE.Group();
        if (!placements.length) return group;
        const offset = new THREE.Matrix4();
        if (center) {
            const middle = piece.box.getCenter(new THREE.Vector3());
            offset.makeTranslation(-middle.x, -piece.box.min.y, -middle.z);
        }
        const matrix = new THREE.Matrix4();
        const rotation = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        // Placements may tint their copy (`color`, multiplied into the texture), e.g. the stucco of each house.
        const tinted = placements.some((p) => p.color !== undefined);
        const tint = new THREE.Color();
        for (const part of piece.parts) {
            const materials = part.materials.map((material) => this.#materials[material] ?? this.#materials.atlas);
            const mesh = new THREE.InstancedMesh(part.geometry, materials.length === 1 ? materials[0] : materials, placements.length);
            placements.forEach((p, index) => {
                matrix.compose(
                    new THREE.Vector3(p.x, p.y ?? 0, p.z),
                    rotation.setFromAxisAngle(up, p.ry ?? 0),
                    new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1),
                ).multiply(offset);
                mesh.setMatrixAt(index, matrix);
                if (tinted) mesh.setColorAt(index, tint.setHex(p.color ?? 0xffffff));
            });
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            mesh.computeBoundingSphere();
            group.add(mesh);
        }
        return group;
    }

    dispose() {
        Object.values(this.#materials).forEach((material) => material.dispose());
        // Shared textures belong to the cache (textures.js) and outlive this kit.
        Object.values(this.#textures).forEach((texture) => texture.userData.shared || texture.dispose());
        this.#pieces.forEach((piece) => piece.parts.forEach((part) => part.geometry.dispose()));
    }
}

/**
 * Loads the coliseum pieces from the (gitignored) Synty Ancient Empire pack.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @returns {Promise<SyntyArenaKit>} Kit; rejects when the pack is missing.
 */
export async function loadSyntyArena(THREE) {
    return loadSyntyKit(THREE, PIECES);
}

/**
 * Loads any set of Ancient Empire (or `dungeon:` / `mini:` Mini Fantasy) pieces into a kit, skinned like the coliseum.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {Record<string, string>} pieces FBX path (under `FBX/`, without extension) by short name.
 * @param {Record<string, string>} [extraTextures] More textures by FBX material name (under `Textures/`) for this kit's pieces.
 * @returns {Promise<SyntyArenaKit>} Kit; rejects when the pack is missing.
 */
export async function loadSyntyKit(THREE, pieces, extraTextures = {}) {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const manager = new THREE.LoadingManager();
    // The texture paths baked into the FBX files are stale; materials are rebuilt by name below.
    manager.setURLModifier((url) => (IMAGE_URL.test(url) ? EMPTY_PIXEL : url));
    const fbx = new FBXLoader(manager);
    // Shared: the coliseum and the countryside skin their pieces from the same atlases and building textures.
    const textures = Object.fromEntries(await Promise.all(Object.entries({ ...MATERIAL_TEXTURES, ...extraTextures }).map(async ([name, file]) => (
        [name, await loadTexture(THREE, `${TEXTURES}${file}`, { repeat: true, anisotropy: 4, share: true })]
    ))));
    const dungeonAtlas = await loadTexture(THREE, `${DUNGEON}Textures/Dungeons_Texture_01.png`, { share: true });
    textures.dungeon = dungeonAtlas;
    textures.dungeonDark = dungeonAtlas;
    if (Object.values(pieces).some((file) => file.startsWith(MINI_PREFIX))) {
        textures.mini = await loadTexture(THREE, `${MINI}Textures/PolygonMinis_Texture_01.png`, { share: true });
    }
    const loaded = new Map(await Promise.all(Object.entries(pieces).map(async ([name, file]) => {
        if (file.startsWith(MINI_PREFIX)) {
            return [name, new Piece(THREE, await fbx.loadAsync(`${MINI}FBX/${file.slice(MINI_PREFIX.length)}.fbx`), { material: 'mini' })];
        }
        if (file.startsWith(DUNGEON_PREFIX)) {
            const root = await fbx.loadAsync(`${DUNGEON}FBX/${file.slice(DUNGEON_PREFIX.length)}.fbx`);
            return [name, new Piece(THREE, root, { unit: 1, material: SHADOWED.has(name) ? 'dungeonDark' : 'dungeon' })];
        }
        return [name, new Piece(THREE, await fbx.loadAsync(`${ROOT}FBX/${file}.fbx`))];
    })));
    return new SyntyArenaKit(THREE, loaded, textures);
}
