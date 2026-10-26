const SIZE = 192;
const IDLE = Object.freeze({
    dt: 0.016, travel: 0, speed: 0, forward: 0, lateral: 0, moveWeight: 0, combat: 0,
    action: null, flinch: 0, turn: 0, stunned: false, dead: 0,
});

/** sRGB transfer curve for a linear channel in 0..1. */
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

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
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.6));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
    key.position.set(-1.5, 2, 3);
    scene.add(key, model.figure);
    model.setWeapons(null, null);
    for (let i = 0; i < 2; i += 1) model.applyPose({}, { motion: IDLE });

    const head = model.headPosition(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
    camera.position.set(head.x, head.y + 0.12, head.z + 1.05);
    camera.lookAt(head.x, head.y + 0.08, head.z);

    const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const previous = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    const pixels = new Uint8Array(SIZE * SIZE * 4);
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
    renderer.setRenderTarget(previous.target);
    renderer.setClearColor(previous.color, previous.alpha);
    target.dispose();

    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    // Render targets hold linear colour; the 2D canvas expects sRGB.
    const toSrgb = Uint8Array.from({ length: 256 }, (_, value) => Math.round(255 * linearToSrgb(value / 255)));
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = toSrgb[pixels[i]];
        pixels[i + 1] = toSrgb[pixels[i + 1]];
        pixels[i + 2] = toSrgb[pixels[i + 2]];
    }
    const image = new ImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 1) image.data.set(pixels.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
    canvas.getContext('2d').putImageData(image, 0, 0);
    scene.remove(model.figure);
    model.dispose();
    return canvas;
}
