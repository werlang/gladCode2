import { STANDS } from './synty-coliseum.js';
import { loadSyntyKit } from './synty-arena.js';
import { loadTexture } from './textures.js';
import { createRandom, fbm, smooth } from './noise.js';
import {
    FOOTPRINT, LAND_RADIUS, LANDSCAPE_SEED, NORTH_ROAD_PHASE, PLAZA, ROAD_HALF, landHeight, planLandscape,
} from './landscape-layout.js';

/** Meadow Forest terrain textures painted on the countryside, with a flat colour standing in for each if missing. */
const TERRAIN = '/assets/synty/meadow-forest/Textures/Terrain/';
const GROUND_TEXTURES = Object.freeze({
    grass: ['Grass_Texture_01', 0x6f8a45],
    dry: ['Grass_Texture_02', 0x9a9a5a],
    dirt: ['Dirt_Texture_01', 0x8a7458],
    paving: ['Footpath_Tiles_Texture_01', 0xb3a58c],
    road: ['Cobblestone_Texture_01', 0x8f8778],
});
/** Metres covered by one repeat of a ground texture. */
const GROUND_TILE = 4;

/** Ancient Empire pieces of the countryside, by the names `planLandscape` uses. */
const PIECES = {
    cypress1: 'Environment/SM_Env_Tree_Thin_01',
    cypress2: 'Environment/SM_Env_Tree_Thin_02',
    tree1: 'Environment/SM_Env_Tree_01',
    tree2: 'Environment/SM_Env_Tree_02',
    tree3: 'Environment/SM_Env_Tree_03',
    tree4: 'Environment/SM_Env_Tree_04',
    treeLarge1: 'Environment/SM_Env_Tree_Large_01',
    treeLarge2: 'Environment/SM_Env_Tree_Large_02',
    cluster1: 'Environment/SM_Env_Tree_Cluster_01',
    cluster2: 'Environment/SM_Env_Tree_Cluster_02',
    bush1: 'Environment/SM_Env_Bush_Cluster_01',
    bush2: 'Environment/SM_Env_Bush_Cluster_02',
    straw1: 'Environment/SM_Env_Straw_Field_01',
    straw2: 'Environment/SM_Env_Straw_Field_02',
    crops: 'Environment/SM_Env_Crop_Rows_01',
    fence: 'Environment/SM_Env_Fence_Wood_01',
    cart: 'Props/SM_Prop_Cart_01',
    well: 'Props/SM_Prop_Well_01',
    cloud1: 'Misc/SM_Generic_CloudRing_01',
    cloud2: 'Misc/SM_Generic_CloudRing_02',
    // Roman houses and the temple (see `housePieces` / `templePieces`).
    wall: 'Buildings/SM_Bld_Wall_01',
    wallWindow: 'Buildings/SM_Bld_Wall_Window_01',
    wallDoor: 'Buildings/SM_Bld_Wall_Door_01',
    roofTile: 'Buildings/SM_Bld_Roof_Base_Peak_01',
    slab: 'Buildings/SM_Bld_Wall_Large_Cap_01',
    templeColumn: 'Buildings/SM_Bld_Pillar_Large_01',
    cellaWall: 'Buildings/SM_Bld_Wall_Large_01',
    beam: 'Buildings/SM_Bld_Trim_Large_01',
    // Painted mountain ranges of the POLYGON Mini Fantasy pack, stood up round the horizon.
    mountain1: 'mini:SM_Background_Mountains_01',
    mountain2: 'mini:SM_Background_Mountains_02',
    mountain3: 'mini:SM_Background_Mountains_03',
};
/** Cloud rings round the horizon: scale, height offset and how fast each drifts round (radians per second). */
const CLOUD_RINGS = Object.freeze([['cloud1', 0.72, 45, 0.004], ['cloud2', 0.86, 55, -0.0025]]);

/**
 * Textures of the building pieces, by the material names inside their FBX files (the artist's, matched in order to
 * the slots of `MaterialList_PolygonAncientEmpire.txt`): terracotta tiles, white stucco, window glass and brick.
 */
const BUILDING_TEXTURES = Object.freeze({
    Roof: 'BuildingAlts/Roof_Tile_01.png',
    Stucco: 'BuildingAlts/Stucco_White_01.png',
    lambert1132: 'BuildingAlts/Stucco_White_01.png',
    GlassSHD: 'BuildingAlts/Window_01.png',
    lambert2: 'BuildingAlts/Building_Large_Brick_01.png',
    A_Wall1: 'BuildingAlts/Building_Large_Brick_01.png',
    lambert6: 'BuildingAlts/Building_Marble_02.png',
    lambert9: 'BuildingAlts/Building_Marble_02.png',
});
/** Pieces whose pivot is moved to the bottom centre of their bounds (stretched slabs). */
const CENTRED = new Set(['slab']);

/** GLSL twin of `roadOffset` and `roadDistance` (landscape-layout.js); keep the two in step. */
const ROAD_GLSL = /* glsl */ `
float landRoadOffset(float along, float phase) {
    float out_ = abs(along) - 110.0;
    return out_ > 0.0 ? 9.0 * sin(out_ / 65.0 + phase) * smoothstep(0.0, 60.0, out_) : 0.0;
}
float landRoadDistance(vec2 p) {
    return min(abs(p.y - landRoadOffset(p.x, 0.0)), abs(p.x - landRoadOffset(p.y, ${NORTH_ROAD_PHASE.toFixed(3)})));
}
float landFootprint(vec2 p) {
    vec2 q = abs(p) - ${STANDS.toFixed(3)};
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}`;

/**
 * The ground: a polar mesh from under the stands out to the horizon, its rings closer together near the coliseum
 * where the camera can see the detail. Each vertex carries how dry the grass is and how much bare earth shows.
 */
function terrainGeometry(THREE) {
    const spokes = 192;
    const rings = 90;
    const inner = FOOTPRINT - 2;
    const positions = [];
    const mix = [];
    for (let ring = 0; ring <= rings; ring += 1) {
        const r = inner + (LAND_RADIUS - inner) * (ring / rings) ** 1.9;
        for (let spoke = 0; spoke < spokes; spoke += 1) {
            const angle = (spoke / spokes) * Math.PI * 2;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            positions.push(x, landHeight(x, z), z);
            // Sun-dried grass on the open slopes and in patches, bare earth where the soil is thin.
            const dry = 0.25 + smooth(0.35, 0.65, fbm(x * 0.01 + 3, z * 0.01 - 8, 3, LANDSCAPE_SEED + 7)) * 0.6 + smooth(200, 500, r) * 0.15;
            const dirt = smooth(0.6, 0.78, fbm(x * 0.035 - 5, z * 0.035 + 2, 3, LANDSCAPE_SEED + 8)) * 0.7;
            mix.push(dry, dirt);
        }
    }
    const index = [];
    for (let ring = 0; ring < rings; ring += 1) {
        for (let spoke = 0; spoke < spokes; spoke += 1) {
            const a = ring * spokes + spoke;
            const b = ring * spokes + ((spoke + 1) % spokes);
            const c = a + spokes;
            const d = b + spokes;
            // Counter-clockwise seen from above, so the ground faces up.
            index.push(a, b, c, b, d, c);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('landMix', new THREE.Float32BufferAttribute(mix, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    return geometry;
}

/**
 * Ground material: grass blended toward dry grass and bare earth by the baked mix, the plaza paved round the
 * coliseum and the roads laid in cobbles with dusty verges, the last two traced exactly in the fragment shader so
 * their edges stay sharp however coarse the mesh is.
 */
function groundMaterial(THREE, textures) {
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    material.onBeforeCompile = (shader) => {
        Object.entries(textures).forEach(([name, texture]) => { shader.uniforms[`land_${name}`] = { value: texture }; });
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute vec2 landMix;\nvarying vec2 vLandMix;\nvarying vec3 vLandWorld;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandMix = landMix;\nvLandWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec2 vLandMix;
varying vec3 vLandWorld;
${Object.keys(textures).map((name) => `uniform sampler2D land_${name};`).join('\n')}
const mat2 LAND_TURN = mat2(0.8, -0.6, 0.6, 0.8);
// Two rotated scales of each texture, so the repeats do not show across a field.
vec3 landSample(sampler2D map, vec2 uv) { return mix(texture2D(map, uv).rgb, texture2D(map, LAND_TURN * uv * 0.31 + 0.17).rgb, 0.4); }
${ROAD_GLSL}`)
            .replace('#include <map_fragment>', `
vec2 landUv = vLandWorld.xz / ${GROUND_TILE.toFixed(1)};
vec3 land = mix(landSample(land_grass, landUv), landSample(land_dry, landUv), vLandMix.x);
land = mix(land, landSample(land_dirt, landUv), vLandMix.y);
float landRoad = landRoadDistance(vLandWorld.xz);
float landPlaza = landFootprint(vLandWorld.xz);
// Dusty verges either side of the cobbles, then the cobbles, then the plaza's paving over everything round the building.
land = mix(land, landSample(land_dirt, landUv * 1.3), (1.0 - smoothstep(${ROAD_HALF.toFixed(2)}, ${(ROAD_HALF + 1.8).toFixed(2)}, landRoad)) * 0.85);
land = mix(land, landSample(land_road, landUv * 1.4), 1.0 - smoothstep(${(ROAD_HALF - 0.15).toFixed(2)}, ${(ROAD_HALF + 0.1).toFixed(2)}, landRoad));
land = mix(land, landSample(land_paving, landUv * 0.8), 1.0 - smoothstep(${(PLAZA - 0.2).toFixed(2)}, ${(PLAZA + 0.2).toFixed(2)}, landPlaza));
// Warmed and dried toward a Mediterranean summer, not a watered lawn.
diffuseColor.rgb *= land * vec3(1.04, 0.97, 0.78);`);
    };
    material.customProgramCacheKey = () => 'synty-landscape-ground';
    return material;
}

/** Loads the ground textures, each falling back to a flat colour when the Meadow Forest pack is missing. */
async function loadGroundTextures(THREE) {
    const entries = await Promise.all(Object.entries(GROUND_TEXTURES).map(async ([name, [file, fallback]]) => {
        let texture;
        try {
            texture = await loadTexture(THREE, `${TERRAIN}${file}.png`);
        }
        catch {
            const color = new THREE.Color(fallback);
            texture = new THREE.DataTexture(new Uint8Array([color.r * 255, color.g * 255, color.b * 255, 255]), 1, 1);
            texture.needsUpdate = true;
        }
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        texture.colorSpace = THREE.SRGBColorSpace;
        return [name, texture];
    }));
    return Object.fromEntries(entries);
}

/**
 * The countryside round the coliseum (see `landscape-layout.js` for what goes where): textured rolling ground with
 * the plaza and roads, Synty trees, fields and props, a Roman hill town with its temple, farmsteads, mountains on
 * the horizon and cloud rings
 * drifting round the horizon.
 */
export class SyntyLandscape {
    group;
    #clouds = [];
    #scenery;
    #disposables = [];

    constructor(THREE, kit, textures) {
        const own = (resource) => {
            this.#disposables.push(resource);
            return resource;
        };
        this.group = new THREE.Group();
        this.group.name = 'synty-landscape';
        this.#disposables.push(kit, ...Object.values(textures));

        const ground = new THREE.Mesh(own(terrainGeometry(THREE)), own(groundMaterial(THREE, textures)));
        ground.name = 'land';
        this.group.add(ground);

        const plan = planLandscape(createRandom(LANDSCAPE_SEED));
        // Every piece is instanced: trees, fields, props, the town's walls and roofs (tinted per house) and the mountains.
        // All but the mountains form the scenery, which low graphics tiers leave out (see `setScenery`).
        this.#scenery = new THREE.Group();
        this.#scenery.name = 'synty-scenery';
        for (const [name, placements] of plan.props) {
            const instances = kit.instances(name, placements, { center: CENTRED.has(name) });
            (name.startsWith('mountain') ? this.group : this.#scenery).add(instances);
        }
        this.group.add(this.#scenery);
        // Nothing but the clouds ever moves: the rest is marked static so the render loop skips its matrices.
        for (const child of this.group.children) {
            child.updateMatrixWorld(true);
            child.traverse((node) => {
                node.matrixAutoUpdate = false;
            });
            child.matrixWorldAutoUpdate = false;
        }

        // Clouds: Synty's low-poly cloud rings, softly lit and hazed by the fog, turning slowly in opposite ways.
        const cloudMaterial = own(new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xa9b8c8, emissiveIntensity: 0.6, flatShading: true }));
        for (const [name, scale, lift, speed] of CLOUD_RINGS) {
            const ring = kit.instances(name, [{ x: 0, y: lift, z: 0, sx: scale, sy: scale, sz: scale }]);
            ring.traverse((node) => {
                if (node.isMesh) node.material = cloudMaterial;
            });
            ring.userData.speed = speed;
            this.#clouds.push(ring);
            this.group.add(ring);
        }
    }

    /** @param {boolean} visible Whether the trees, fields, farms and town are drawn (ground, sky and mountains stay). */
    setScenery(visible) {
        this.#scenery.visible = visible;
    }

    /** @param {number} dt Seconds since the previous frame (the clouds drift). */
    update(dt) {
        for (const ring of this.#clouds) ring.rotation.y += ring.userData.speed * dt;
    }

    dispose() {
        this.group.removeFromParent();
        this.#disposables.forEach((item) => item.dispose());
    }
}

/**
 * Loads the countryside: Ancient Empire trees, fields, props, buildings and clouds, Mini Fantasy mountains and the
 * Meadow Forest ground textures.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @returns {Promise<SyntyLandscape>} Landscape; rejects when the Ancient Empire pack is missing.
 */
export async function loadSyntyLandscape(THREE) {
    const [kit, textures] = await Promise.all([loadSyntyKit(THREE, PIECES, BUILDING_TEXTURES), loadGroundTextures(THREE)]);
    return new SyntyLandscape(THREE, kit, textures);
}
