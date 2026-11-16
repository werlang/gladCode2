const SIZE = 192;

/** Idle motion of a Fighter (`fighter.js`), the pose the HUD portrait shows. */
export const IDLE_MOTION = Object.freeze({
    dt: 0.016, travel: 0, speed: 0, forward: 0, lateral: 0, moveWeight: 0, combat: 0,
    action: null, flinch: 0, turn: 0, stunned: false, dead: 0,
});

/** The last frame of the death clip: the pose of a fallen gladiator on its card. */
export const DEAD_MOTION = Object.freeze({ ...IDLE_MOTION, dead: 1 });

/** Field of view of the head-and-shoulders shot (the HUD portrait). */
const HEAD_FOV = 24;
/** Field of view of the whole-body shot used by the gladiator cards. */
const BODY_FOV = 26;

/** sRGB transfer curve for a linear channel in 0..1. */
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * The camera of the HUD portrait: a close head-and-shoulders framing of the posed model.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {{ headPosition: Function }} model Body model.
 * @returns {import('three').PerspectiveCamera}
 */
function headCamera(THREE, model) {
    const head = model.headPosition(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(HEAD_FOV, 1, 0.1, 20);
    camera.position.set(head.x, head.y + 0.12, head.z + 1.05);
    camera.lookAt(head.x, head.y + 0.08, head.z);
    return camera;
}

/**
 * The camera of the card portrait: the whole posed figure, standing on its origin. A fallen gladiator needs
 * a wider shot, since the body lies across the floor instead of standing up.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {{ figure: import('three').Object3D }} model Body model, its figure standing on its origin.
 * @param {{ dead: number }} motion Pose the model was just put in.
 * @returns {import('three').PerspectiveCamera}
 */
function bodyCamera(THREE, model, motion) {
    model.figure.updateMatrixWorld(true);
    const origin = model.figure.getWorldPosition(new THREE.Vector3());
    const fallen = motion.dead > 0;
    const height = fallen ? 1.3 : 1.15;
    const centre = new THREE.Vector3(origin.x, origin.y + (fallen ? 0.22 : 0.42), origin.z);
    const distance = height / (2 * Math.tan((BODY_FOV * Math.PI) / 360));
    const camera = new THREE.PerspectiveCamera(BODY_FOV, 1, 0.05, 50);
    camera.position.set(centre.x, centre.y + height * 0.06, centre.z + distance);
    camera.lookAt(centre);
    return camera;
}

/**
 * Renders a posed model into a transparent square canvas, then frees the model. Shared by the replay HUD
 * (`renderPortrait`) and the gladiator cards (`CardPortraits`), so both show the same character.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {import('three').WebGLRenderer} renderer Renderer used for the offscreen pass.
 * @param {{ figure: import('three').Object3D, headPosition: Function, applyPose: Function, setWeapons: Function, dispose: Function }} model Body model.
 * @param {object} [options]
 * @param {number} [options.size] Side of the square picture, in pixels.
 * @param {{ dt: number, dead: number }} [options.motion] Pose to apply (`IDLE_MOTION` or `DEAD_MOTION`).
 * @param {'head'|'body'} [options.frame] `head` for the HUD bust, `body` for the whole figure.
 * @param {number} [options.samples] Render-target multisampling.
 * @param {Document} [options.document] Document that creates the 2D canvas.
 * @returns {HTMLCanvasElement} Transparent square canvas with the portrait.
 */
export function renderSnapshot(THREE, renderer, model, {
    size = SIZE,
    motion = IDLE_MOTION,
    frame = 'head',
    samples = 4,
    document: documentRef = globalThis.document,
} = {}) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.6));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
    key.position.set(-1.5, 2, 3);
    scene.add(key, model.figure);

    try {
        model.setWeapons(null, null);
        for (let i = 0; i < 2; i += 1) model.applyPose({}, { motion });

        const camera = frame === 'body' ? bodyCamera(THREE, model, motion) : headCamera(THREE, model);

        const target = new THREE.WebGLRenderTarget(size, size, { samples });
        target.texture.colorSpace = THREE.SRGBColorSpace;
        const previous = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
        renderer.setRenderTarget(target);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, camera);
        const pixels = new Uint8Array(size * size * 4);
        renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
        renderer.setRenderTarget(previous.target);
        renderer.setClearColor(previous.color, previous.alpha);
        target.dispose();

        const canvas = documentRef.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        // Render targets hold linear colour; the 2D canvas expects sRGB.
        const toSrgb = Uint8Array.from({ length: 256 }, (_, value) => Math.round(255 * linearToSrgb(value / 255)));
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = toSrgb[pixels[i]];
            pixels[i + 1] = toSrgb[pixels[i + 1]];
            pixels[i + 2] = toSrgb[pixels[i + 2]];
        }
        const image = new ImageData(size, size);
        for (let y = 0; y < size; y += 1) image.data.set(pixels.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
        canvas.getContext('2d').putImageData(image, 0, 0);
        return canvas;
    }
    finally {
        scene.remove(model.figure);
        model.dispose();
    }
}

/**
 * Renders a head-and-shoulders portrait of a model (one that exposes `headPosition`) into a 2D canvas, so the
 * HUD shows the same character that fights in the arena.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {import('three').WebGLRenderer} renderer Renderer used for the offscreen pass.
 * @param {{ figure: import('three').Object3D, headPosition: Function, applyPose: Function, setWeapons: Function, dispose: Function }} model Body model.
 * @returns {HTMLCanvasElement} Transparent square canvas with the portrait.
 */
export function renderPortrait(THREE, renderer, model) {
    return renderSnapshot(THREE, renderer, model);
}
