import { ARENA_SIZE } from './battle-state.js';
import { clamp01, createRandom, fbm, smooth } from './noise.js';
import { loadTexture } from './textures.js';

const ROOT = '/assets/synty/meadow-forest/';
const TERRAIN = `${ROOT}Textures/Terrain/`;
const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
const IMAGE_URL = /\.(png|jpe?g|tga|tif|psd)(\?|$)/i;
const HALF = ARENA_SIZE / 2;
/** Metres covered by one repeat of a terrain texture. */
const TILE = 4.5;
const MASK_SIZE = 512;
const FLOOR_SEED = 4242;

/**
 * Terrain layers of the Meadow Forest pack, painted in this order: packed sand everywhere, sun-cracked patches,
 * scattered pebbles, trampled mud in the dips, and gravel swept against the podium wall.
 */
const LAYERS = [
    ['sand', 'Dirt_Texture_01', 'Dirt_Normals_01'],
    ['cracked', 'Dirt_Cracked_Texture_01', 'Dirt_Cracked_Normals_01'],
    ['pebbles', 'Dirt_Cracked_Pebbles_Texture_01', 'Dirt_Cracked_Pebbles_Normals_01'],
    ['mud', 'Mud_Texture_01', 'Mud_Normals_01'],
    ['gravel', 'Gravel_Texture_01', 'Gravel_Normals_01'],
];

/** Rock props of the pack (atlas-textured) and how many to scatter along the wall. */
const ROCKS = [['SM_Env_Rock_Small_01', 10], ['SM_Env_Rock_Small_Pile_01', 6], ['SM_Env_Rock_Small_Pile_02', 6], ['SM_Prop_StonePile_01', 3]];
const ATLAS = `${ROOT}Textures/PolygonNatureBiomes_Meadow_Texture_01.png`;

/**
 * Blend weights of the four overlay layers over the floor (RGBA = cracked, pebbles, mud, gravel), baked once.
 * Mud follows `wetness`, the same field that sinks the relief, so mud always lies in the dips.
 *
 * @param {(x: number, z: number) => number} wetness Wetness field of the arena (0 dry to 1 mud).
 * @param {number} size Floor side in metres.
 * @param {number} wall Distance from the centre to the podium wall.
 */
function paintMask(THREE, wetness, size, wall) {
    const data = new Uint8Array(MASK_SIZE * MASK_SIZE * 4);
    for (let py = 0; py < MASK_SIZE; py += 1) {
        // Row 0 is the -z edge of the floor (the mask is sampled with v = 0.5 - z / size).
        const z = (py / MASK_SIZE - 0.5) * size;
        for (let px = 0; px < MASK_SIZE; px += 1) {
            const x = (px / MASK_SIZE - 0.5) * size;
            const breakup = fbm(x * 1.4, z * 1.4, 2, FLOOR_SEED + 9);
            const cracked = smooth(0.5, 0.66, fbm(x * 0.18 + 4, z * 0.18 - 7, 3, FLOOR_SEED + 1) + (breakup - 0.5) * 0.25);
            const pebbles = smooth(0.5, 0.64, fbm(x * 0.32 - 11, z * 0.32 + 3, 3, FLOOR_SEED + 2) + (breakup - 0.5) * 0.3);
            // Trampled, damp patches inside the dips, broken up so they read as churned ground, not stains.
            const churn = smooth(0.42, 0.62, fbm(x * 0.7 + 21, z * 0.7 - 5, 3, FLOOR_SEED + 3));
            const mud = smooth(0.35, 0.9, wetness(x, z) + (breakup - 0.5) * 0.4) * churn * 0.7;
            // Gravel collects in a band at the foot of the wall, ragged where the sand was raked over it.
            const toWall = wall - Math.max(Math.abs(x), Math.abs(z));
            const gravel = clamp01(1 - smooth(0.4, 2.2 + breakup * 1.6, toWall));
            const index = (py * MASK_SIZE + px) * 4;
            data[index] = cracked * 255;
            data[index + 1] = pebbles * 255;
            data[index + 2] = mud * 255;
            data[index + 3] = gravel * 255;
        }
    }
    const texture = new THREE.DataTexture(data, MASK_SIZE, MASK_SIZE, THREE.RGBAFormat);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

/**
 * Floor material: a Lambert material whose albedo and normal come from the terrain layers blended by the mask.
 * Every layer is sampled at two scales (rotated against each other) to hide the tiling on a 33 m floor.
 */
function splatMaterial(THREE, layers, mask, size) {
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const uniforms = { floorMask: { value: mask }, floorSize: { value: size } };
    layers.forEach((layer, i) => {
        uniforms[`albedo${i}`] = { value: layer.albedo };
        uniforms[`normal${i}`] = { value: layer.normal };
    });
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vFloorWorld;\nvarying vec3 vFloorUp;')
            .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
vFloorWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vFloorUp = normalize(mat3(modelMatrix) * objectNormal);`);
        const samplers = layers.map((_, i) => `uniform sampler2D albedo${i}; uniform sampler2D normal${i};`).join('\n');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vFloorWorld;
varying vec3 vFloorUp;
uniform sampler2D floorMask;
uniform float floorSize;
${samplers}
const mat2 FLOOR_TURN = mat2(0.8, -0.6, 0.6, 0.8);
vec4 floorSample(sampler2D map, vec2 uv) { return mix(texture2D(map, uv), texture2D(map, FLOOR_TURN * uv * 0.37 + 0.31), 0.35); }`)
            .replace('#include <map_fragment>', `
vec2 floorUv = vec2(vFloorWorld.x, -vFloorWorld.z) / ${TILE.toFixed(2)};
vec4 floorWeights = texture2D(floorMask, vec2(vFloorWorld.x, -vFloorWorld.z) / floorSize + 0.5);
float floorW[5];
floorW[0] = 1.0;
floorW[1] = floorWeights.r; floorW[2] = floorWeights.g; floorW[3] = floorWeights.b; floorW[4] = floorWeights.a;
vec3 floorAlbedo = floorSample(albedo0, floorUv).rgb;
vec3 floorNormal = floorSample(normal0, floorUv).xyz * 2.0 - 1.0;
${layers.slice(1).map((_, k) => {
        const i = k + 1;
        return `floorAlbedo = mix(floorAlbedo, floorSample(albedo${i}, floorUv).rgb, floorW[${i}]);
floorNormal = mix(floorNormal, floorSample(normal${i}, floorUv).xyz * 2.0 - 1.0, floorW[${i}]);`;
    }).join('\n')}
// Warmed toward the sun-baked sand of an arena.
diffuseColor.rgb *= floorAlbedo * vec3(1.08, 1.0, 0.84);`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
    // Tangent space of the ground: u runs along +x, v along -z.
    vec3 up = normalize(vFloorUp);
    vec3 tangentX = normalize(vec3(1.0, 0.0, 0.0) - up * up.x);
    vec3 tangentZ = normalize(vec3(0.0, 0.0, -1.0) + up * up.z);
    vec3 world = normalize(up * max(floorNormal.z, 0.2) + tangentX * floorNormal.x + tangentZ * floorNormal.y);
    normal = normalize((viewMatrix * vec4(world, 0.0)).xyz);
}`);
    };
    material.customProgramCacheKey = () => 'synty-floor-splat';
    return material;
}

/** Sides of the baked floor textures: albedo on GPUs that take large textures, a smaller one elsewhere; normals. */
const BAKE_ALBEDO = 4096;
const BAKE_ALBEDO_SMALL = 2048;
const BAKE_NORMAL = 2048;

/**
 * Bakes the splat once: the same layer blend as `splatMaterial`, drawn over the floor's UV square into an albedo
 * texture (sRGB) and a tangent-space normal map. The floor then costs two texture reads a pixel instead of twenty
 * (the live splat was most of the GPU time on high-density screens). Nothing in the blend changes during a battle.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {import('three').WebGLRenderer} renderer Renderer to draw the bake with.
 * @returns {{ material: import('three').Material, textures: import('three').Texture[] }} Floor material and its maps.
 */
function bakedMaterial(THREE, renderer, layers, mask, size, { small = false } = {}) {
    const uniforms = { floorMask: { value: mask }, floorSize: { value: size } };
    layers.forEach((layer, i) => {
        uniforms[`albedo${i}`] = { value: layer.albedo };
        uniforms[`normal${i}`] = { value: layer.normal };
    });
    const samplers = layers.map((_, i) => `uniform sampler2D albedo${i}; uniform sampler2D normal${i};`).join('\n');
    const blend = layers.slice(1).map((_, k) => {
        const i = k + 1;
        return `albedo = mix(albedo, floorSample(albedo${i}, floorUv).rgb, floorW[${i}]);
normal = mix(normal, floorSample(normal${i}, floorUv).xyz * 2.0 - 1.0, floorW[${i}]);`;
    }).join('\n');
    const pass = (output) => new THREE.ShaderMaterial({
        uniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
varying vec2 vUv;
uniform sampler2D floorMask;
uniform float floorSize;
${samplers}
const mat2 FLOOR_TURN = mat2(0.8, -0.6, 0.6, 0.8);
vec4 floorSample(sampler2D map, vec2 uv) { return mix(texture2D(map, uv), texture2D(map, FLOOR_TURN * uv * 0.37 + 0.31), 0.35); }
void main() {
    // Texel (u, v) of the floor is world (x, -z) = (uv - 0.5) * size, as the floor mesh's own UVs.
    vec2 floorUv = (vUv - 0.5) * floorSize / ${TILE.toFixed(2)};
    vec4 floorWeights = texture2D(floorMask, vUv);
    float floorW[5];
    floorW[0] = 1.0;
    floorW[1] = floorWeights.r; floorW[2] = floorWeights.g; floorW[3] = floorWeights.b; floorW[4] = floorWeights.a;
    vec3 albedo = floorSample(albedo0, floorUv).rgb;
    vec3 normal = floorSample(normal0, floorUv).xyz * 2.0 - 1.0;
    ${blend}
    ${output === 'albedo'
        // Warmed toward the sun-baked sand of an arena; written linear, stored sRGB by the target.
        ? 'gl_FragColor = vec4(albedo * vec3(1.08, 1.0, 0.84), 1.0);'
        : 'gl_FragColor = vec4(normalize(vec3(normal.xy, max(normal.z, 0.2))) * 0.5 + 0.5, 1.0);'}
}`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const scene = new THREE.Scene();
    scene.add(quad);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const bake = (side, output, colorSpace) => {
        const target = new THREE.WebGLRenderTarget(side, side, {
            generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, colorSpace, depthBuffer: false,
        });
        target.texture.anisotropy = anisotropy;
        quad.material = pass(output);
        const previous = renderer.getRenderTarget();
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(previous);
        quad.material.dispose();
        return target;
    };
    const large = !small && renderer.capabilities.maxTextureSize >= 8192;
    const albedo = bake(large ? BAKE_ALBEDO : BAKE_ALBEDO_SMALL, 'albedo', THREE.SRGBColorSpace);
    const normal = bake(BAKE_NORMAL, 'normal', THREE.NoColorSpace);
    quad.geometry.dispose();
    const material = new THREE.MeshLambertMaterial({ map: albedo.texture, normalMap: normal.texture });
    return { material, textures: [albedo, normal] };
}

/**
 * The arena floor dressed with the Meadow Forest terrain: textured splat material and rock props.
 */
export class SyntyFloor {
    /** @type {import('three').Material} */
    material;
    /** @type {import('three').Group} */
    props;
    #disposables = [];

    constructor(THREE, layers, rocks, atlas, { wetness, terrainHeight, size, wall, renderer = null, small = false }) {
        const mask = paintMask(THREE, wetness, size, wall);
        const sources = [mask, ...layers.flatMap((layer) => [layer.albedo, layer.normal])];
        if (renderer) {
            // Baked once; the layer textures and the mask are no longer needed afterwards.
            const baked = bakedMaterial(THREE, renderer, layers, mask, size, { small });
            this.material = baked.material;
            sources.forEach((texture) => texture.dispose());
            this.#disposables.push(this.material, atlas, ...baked.textures);
        }
        else {
            this.material = splatMaterial(THREE, layers, mask, size);
            this.#disposables.push(this.material, atlas, ...sources);
        }
        this.props = new THREE.Group();
        this.props.name = 'synty-floor-props';
        const random = createRandom(FLOOR_SEED + 77);
        const material = new THREE.MeshLambertMaterial({ map: atlas });
        this.#disposables.push(material);
        const matrix = new THREE.Matrix4();
        const rotation = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        for (const { geometry, count } of rocks) {
            this.#disposables.push(geometry);
            const mesh = new THREE.InstancedMesh(geometry, material, count);
            for (let i = 0; i < count; i += 1) {
                // On the sand between the curb and the podium wall, mostly near the wall, never in the combat square.
                const side = Math.floor(random() * 4);
                const along = (random() * 2 - 1) * (wall - 1.2);
                const depth = wall - 0.5 - Math.pow(random(), 2) * (wall - HALF - 1.6);
                const local = [[along, -depth], [depth, along], [along, depth], [-depth, along]][side];
                const scale = 0.6 + random() * 0.6;
                matrix.compose(
                    new THREE.Vector3(local[0], terrainHeight(local[0], local[1]) - 0.03, local[1]),
                    rotation.setFromAxisAngle(up, random() * Math.PI * 2),
                    new THREE.Vector3(scale, scale * (0.7 + random() * 0.5), scale),
                );
                mesh.setMatrixAt(i, matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            this.props.add(mesh);
        }
    }

    dispose() {
        this.props.removeFromParent();
        this.#disposables.forEach((item) => item.dispose());
    }
}

/**
 * Loads the Meadow Forest terrain textures and rock props.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {{ wetness: Function, terrainHeight: Function, size: number, wall: number, renderer?: import('three').WebGLRenderer, small?: boolean }} field
 *   Arena relief and extent; with a renderer the blend is baked into two textures (`small` keeps them at 2048).
 * @returns {Promise<SyntyFloor>} Floor dressing; rejects when the pack is missing.
 */
export async function loadSyntyFloor(THREE, field, manager = null) {
    if (!manager) {
        manager = new THREE.LoadingManager();
        manager.setURLModifier((url) => (IMAGE_URL.test(url) ? EMPTY_PIXEL : url));
    }
    const load = async (url, srgb) => {
        manager.itemStart(url);
        try {
            const texture = await loadTexture(THREE, url, { srgb, repeat: true, anisotropy: 8 });
            manager.itemEnd(url);
            return texture;
        } catch (error) {
            manager.itemError(url);
            throw error;
        }
    };
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const fbx = new FBXLoader(manager);
    const [layers, rocks, atlas] = await Promise.all([
        Promise.all(LAYERS.map(async ([name, albedo, normal]) => ({ name, albedo: await load(`${TERRAIN}${albedo}.png`, true), normal: await load(`${TERRAIN}${normal}.png`, false) }))),
        Promise.all(ROCKS.map(async ([name, count]) => {
            const root = await fbx.loadAsync(`${ROOT}FBX/${name}.fbx`);
            root.scale.setScalar(0.01);
            root.updateMatrixWorld(true);
            let geometry = null;
            root.traverse((node) => {
                if (node.isMesh && !geometry) geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
            });
            return { geometry, count };
        })),
        load(ATLAS, true),
    ]);
    return new SyntyFloor(THREE, layers, rocks.filter((rock) => rock.geometry), atlas, field);
}
