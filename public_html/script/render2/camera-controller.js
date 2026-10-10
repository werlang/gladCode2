import { BaseComponent } from './base-component.js';

const CAMERA_DISTANCE = 36;
const DEFAULT_PITCH = 0.85;
// Low enough for a stadium view, high enough that the camera stays above the stands.
const MIN_PITCH = 0.4;
const MAX_PITCH = 1.5;
const ROTATE_PER_PIXEL = 0.007;
const MAX_ZOOM = 7;
const CAMERA_TARGET_LIMIT = 10;

/**
 * Pointer, keyboard and follow controls for the perspective battle camera.
 */
export class BattleCameraController extends BaseComponent {
    #THREE;
    #camera;
    #canvas;
    #dragOrigin = null;
    #dragMode = 'pan';
    #yaw = 0;
    #pitch = DEFAULT_PITCH;
    #followTarget = null;
    #target;
    #viewSize = 33;

    /**
     * @param {{ THREE: typeof import('three'), camera: import('three').PerspectiveCamera, canvas: HTMLCanvasElement }} options Controller dependencies.
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
        this.on(canvas, 'contextmenu', (event) => event.preventDefault());
        this.on(canvas, 'wheel', this.#handleWheel, { passive: false });
        this.on(window, 'keydown', this.#handleKeyDown);
        this.update();
    }

    /** @returns {import('three').Object3D|null} Currently followed model. */
    get target() {
        return this.#followTarget;
    }

    /** @returns {number} World-space height framed at the camera target. */
    get viewSize() {
        return this.#viewSize;
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
        this.#camera.aspect = aspect;
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
        const ground = Math.cos(this.#pitch) * CAMERA_DISTANCE;
        this.#camera.position.set(
            this.#target.x + Math.sin(this.#yaw) * ground,
            Math.sin(this.#pitch) * CAMERA_DISTANCE,
            this.#target.z + Math.cos(this.#yaw) * ground,
        );
        this.#camera.lookAt(this.#target);
        this.#camera.updateMatrixWorld();
    }

    /** @param {PointerEvent} event Pointer start event. */
    #handlePointerDown = (event) => {
        if (event.button > 2) return;
        this.#dragMode = event.button === 0 && !event.shiftKey ? 'pan' : 'rotate';
        this.#dragOrigin = { x: event.clientX, y: event.clientY };
        this.#canvas.setPointerCapture?.(event.pointerId);
        this.#canvas.classList.add('is-dragging');
    };

    /** @param {PointerEvent} event Pointer movement event. */
    #handlePointerMove = (event) => {
        if (!this.#dragOrigin) return;
        const worldPerPixel = this.#viewSize * 0.9 / (Math.max(1, this.#canvas.clientHeight) * this.#camera.zoom);
        const deltaX = event.clientX - this.#dragOrigin.x;
        const deltaY = event.clientY - this.#dragOrigin.y;
        this.#dragOrigin = { x: event.clientX, y: event.clientY };
        if (this.#dragMode === 'rotate') {
            this.#yaw -= deltaX * ROTATE_PER_PIXEL;
            this.#pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, this.#pitch + deltaY * ROTATE_PER_PIXEL));
            return;
        }
        this.unfollow();
        this.#pan(-deltaX * worldPerPixel, -deltaY * worldPerPixel * 1.35);
    };

    /** Moves the target along the ground in screen-aligned axes (right, forward-down). */
    #pan(right, down) {
        const cos = Math.cos(this.#yaw);
        const sin = Math.sin(this.#yaw);
        this.#target.x += right * cos + down * sin;
        this.#target.z += -right * sin + down * cos;
    }

    /** Ends pointer dragging. */
    #handlePointerUp = () => {
        this.#dragOrigin = null;
        this.#canvas.classList.remove('is-dragging');
    };

    /** @param {WheelEvent} event Mouse-wheel zoom event. */
    #handleWheel = (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        this.#camera.zoom = Math.min(MAX_ZOOM, Math.max(0.72, this.#camera.zoom * factor));
        this.#camera.updateProjectionMatrix();
    };

    /** @param {KeyboardEvent} event Keyboard navigation event. */
    #handleKeyDown = (event) => {
        const target = /** @type {HTMLElement|null} */ (event.target);
        if (target?.matches('input, textarea, select, button, [contenteditable="true"]')) return;

        const pan = 0.65 / this.#camera.zoom;
        const actions = {
            ArrowLeft: () => this.#pan(-pan, 0),
            ArrowRight: () => this.#pan(pan, 0),
            ArrowUp: () => this.#pan(0, -pan),
            ArrowDown: () => this.#pan(0, pan),
            q: () => { this.#yaw += 0.15; },
            e: () => { this.#yaw -= 0.15; },
            '+': () => { this.#camera.zoom = Math.min(MAX_ZOOM, this.#camera.zoom * 1.08); },
            '=': () => { this.#camera.zoom = Math.min(MAX_ZOOM, this.#camera.zoom * 1.08); },
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
