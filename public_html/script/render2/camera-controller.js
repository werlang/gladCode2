import { BaseComponent } from './base-component.js';

const CAMERA_OFFSET = Object.freeze({ x: 0, y: 30, z: 23 });
const CAMERA_TARGET_LIMIT = 10;

/**
 * Pointer, keyboard and follow controls for the orthographic battle camera.
 */
export class BattleCameraController extends BaseComponent {
    #THREE;
    #camera;
    #canvas;
    #dragOrigin = null;
    #followTarget = null;
    #target;
    #viewSize = 33;

    /**
     * @param {{ THREE: typeof import('three'), camera: import('three').OrthographicCamera, canvas: HTMLCanvasElement }} options Controller dependencies.
     */
    constructor({ THREE, camera, canvas }) {
        super();
        this.#THREE = THREE;
        this.#camera = camera;
        this.#canvas = canvas;
        this.#target = new THREE.Vector3(0, 0, 0);
        this.#camera.zoom = 1;

        this.on(canvas, 'pointerdown', this.#handlePointerDown);
        this.on(window, 'pointermove', this.#handlePointerMove);
        this.on(window, 'pointerup', this.#handlePointerUp);
        this.on(canvas, 'wheel', this.#handleWheel, { passive: false });
        this.on(window, 'keydown', this.#handleKeyDown);
        this.update();
    }

    /** @returns {import('three').Object3D|null} Currently followed model. */
    get target() {
        return this.#followTarget;
    }

    /**
     * Begins following a gladiator model.
     *
     * @param {import('three').Object3D|null} object Object to follow.
     */
    follow(object) {
        this.#followTarget = object ?? null;
    }

    /** Stops following without moving the current camera target. */
    unfollow() {
        this.#followTarget = null;
    }

    /**
     * Recomputes the camera frustum for the canvas display size.
     *
     * @param {number} width Canvas width in CSS pixels.
     * @param {number} height Canvas height in CSS pixels.
     */
    resize(width, height) {
        const aspect = Math.max(0.1, width / Math.max(1, height));
        this.#camera.left = -this.#viewSize * aspect / 2;
        this.#camera.right = this.#viewSize * aspect / 2;
        this.#camera.top = this.#viewSize / 2;
        this.#camera.bottom = -this.#viewSize / 2;
        this.#camera.updateProjectionMatrix();
    }

    /** Updates follow easing and applies the camera transform. */
    update() {
        if (this.#followTarget) {
            this.#target.x += (this.#followTarget.position.x - this.#target.x) * 0.12;
            this.#target.z += (this.#followTarget.position.z - this.#target.z) * 0.12;
        }

        this.#target.x = Math.min(CAMERA_TARGET_LIMIT, Math.max(-CAMERA_TARGET_LIMIT, this.#target.x));
        this.#target.z = Math.min(CAMERA_TARGET_LIMIT, Math.max(-CAMERA_TARGET_LIMIT, this.#target.z));
        this.#camera.position.set(
            this.#target.x + CAMERA_OFFSET.x,
            CAMERA_OFFSET.y,
            this.#target.z + CAMERA_OFFSET.z,
        );
        this.#camera.lookAt(this.#target);
        this.#camera.updateMatrixWorld();
    }

    /** @param {PointerEvent} event Pointer start event. */
    #handlePointerDown = (event) => {
        if (event.button !== 0) return;
        this.#dragOrigin = { x: event.clientX, y: event.clientY };
        this.#canvas.setPointerCapture?.(event.pointerId);
        this.#canvas.classList.add('is-dragging');
    };

    /** @param {PointerEvent} event Pointer movement event. */
    #handlePointerMove = (event) => {
        if (!this.#dragOrigin) return;
        const worldPerPixel = this.#viewSize / (Math.max(1, this.#canvas.clientHeight) * this.#camera.zoom);
        const deltaX = event.clientX - this.#dragOrigin.x;
        const deltaY = event.clientY - this.#dragOrigin.y;
        this.#dragOrigin = { x: event.clientX, y: event.clientY };
        this.unfollow();
        this.#target.x -= deltaX * worldPerPixel;
        this.#target.z -= deltaY * worldPerPixel * 1.35;
    };

    /** Ends pointer dragging. */
    #handlePointerUp = () => {
        this.#dragOrigin = null;
        this.#canvas.classList.remove('is-dragging');
    };

    /** @param {WheelEvent} event Mouse-wheel zoom event. */
    #handleWheel = (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        this.#camera.zoom = Math.min(2.4, Math.max(0.72, this.#camera.zoom * factor));
        this.#camera.updateProjectionMatrix();
    };

    /** @param {KeyboardEvent} event Keyboard navigation event. */
    #handleKeyDown = (event) => {
        const target = /** @type {HTMLElement|null} */ (event.target);
        if (target?.matches('input, textarea, select, button, [contenteditable="true"]')) return;

        const pan = 0.65 / this.#camera.zoom;
        const actions = {
            ArrowLeft: () => { this.#target.x -= pan; },
            ArrowRight: () => { this.#target.x += pan; },
            ArrowUp: () => { this.#target.z -= pan; },
            ArrowDown: () => { this.#target.z += pan; },
            '+': () => { this.#camera.zoom = Math.min(2.4, this.#camera.zoom * 1.08); },
            '=': () => { this.#camera.zoom = Math.min(2.4, this.#camera.zoom * 1.08); },
            '-': () => { this.#camera.zoom = Math.max(0.72, this.#camera.zoom / 1.08); },
        };

        if (actions[event.key]) {
            event.preventDefault();
            this.unfollow();
            actions[event.key]();
            this.#camera.updateProjectionMatrix();
        }
    };
}
