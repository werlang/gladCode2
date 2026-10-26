import { BaseComponent } from './base-component.js';
import { TouchGestures } from './touch-gestures.js';

const CAMERA_DISTANCE = 36;
/** A tall (portrait) screen pulls the overview back so the combat square still fits across: (1 / aspect) ^ this, at most `PORTRAIT_FIT_MAX`. */
const PORTRAIT_FIT_POWER = 0.8;
const PORTRAIT_FIT_MAX = 2;
/** Touch: radians a finger turns the camera per pixel (a little faster than the mouse), and how far two fingers must travel together before a pinch also pans while inspecting. */
const TOUCH_ROTATE = 1.25;
const TOUCH_PAN_SLOP = 28;
/** Metres the ghost flies per unit of log zoom (a wheel notch is about 1.5 m). */
const GHOST_ZOOM_FLIGHT = 15.7;
/** A mouse press that moves less than this (CSS pixels) is a click. */
const CLICK_SLOP = 5;
const DEFAULT_PITCH = 0.85;
// Low enough for a stadium view, high enough that the camera stays above the stands.
const MIN_PITCH = 0.4;
const MAX_PITCH = 1.5;
const ROTATE_PER_PIXEL = 0.007;
const MAX_ZOOM = 7;
const MIN_ZOOM = 0.72;
const CAMERA_TARGET_LIMIT = 10;
/** Third person: distance behind the fighter at zoom 1 (the wheel divides it), its range, and the look height. */
const FOLLOW_DISTANCE = 6;
const FOLLOW_RANGE = [1.6, 16];
const FOLLOW_PITCH = 0.36;
const FOLLOW_PITCH_RANGE = [0.02, 1.3];
const LOOK_HEIGHT = 0.95;
/** How fast the third-person camera swings round behind a turning fighter (per second). */
const FOLLOW_TURN_RATE = 3;
/** First person: eye ahead of the head bone, the default downward glance and the near plane it needs. */
const EYE_AHEAD = 0.14;
const EYE_PITCH = -0.12;
const NEAR = { far: 1, close: 0.2, eye: 0.05 };
/** Cinematic orbit round the victor: distance, height, and turn speed (radians per second). */
/** The victor stands inside the laurels (hud-controls.js: a ring about 0.6 of the screen's smaller side): the share of that side its body fills. */
const VICTOR_FILL = 0.5;
/** Crown of the head above the head bone. */
const HEAD_TOP = 0.12;
const CINEMATIC_PITCH = 0.22;
const CINEMATIC_SPIN = 0.2;
/** Ghost camera (a hidden cheat: hold C for `GHOST_HOLD_MS`): flying speed in metres per second, Shift's boost. */
const GHOST_HOLD_MS = 10000;
const GHOST_SPEED = 9;
const GHOST_BOOST = 3.5;
/** Keys that fly the ghost camera (`KeyboardEvent.code`) and their direction: [right, up, forward]. */
const GHOST_KEYS = {
    KeyW: [0, 0, 1], ArrowUp: [0, 0, 1], KeyS: [0, 0, -1], ArrowDown: [0, 0, -1],
    KeyA: [-1, 0, 0], ArrowLeft: [-1, 0, 0], KeyD: [1, 0, 0], ArrowRight: [1, 0, 0],
    KeyE: [0, 1, 0], KeyQ: [0, -1, 0],
};
/** Seconds the camera glides from one mode's view to another's. */
const TRANSITION_SECONDS = 0.9;

/** How the camera frames an inspected gladiator, in the order `C` cycles them. */
export const INSPECT_MODES = Object.freeze(['fixed', 'follow', 'first']);
export const INSPECT_LABELS = Object.freeze({ fixed: 'Fixa', follow: '3ª pessoa', first: '1ª pessoa' });

const smooth = (t) => t * t * (3 - 2 * t);
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * Mouse and touch controls for the perspective battle camera: left drag pans, right (or Shift) drag rotates, the wheel
 * zooms; on a touch screen one finger rotates (orbits, looks round), two fingers pan, pinch to zoom and twist to turn.
 * A click or tap that does not drag goes to `onTap` (the renderer picks a fighter or shows the controls).
 * An inspected gladiator is framed in one of `INSPECT_MODES` (fixed: the overview follows it; follow: third person
 * behind it, the wheel setting the distance; first: through its eyes), and `cinematic` slowly circles a fighter (the
 * victor). Mode changes glide over `TRANSITION_SECONDS`; any drag in the cinematic hands the camera back.
 */
export class BattleCameraController extends BaseComponent {
    #THREE;
    #camera;
    #canvas;
    #dragOrigin = null;
    #dragMode = 'pan';
    #yaw = 0;
    #pitch = DEFAULT_PITCH;
    #zoom = 1;
    #subject = null;
    #inspectMode = 'fixed';
    #cinematic = null;
    #followZoom = 1;
    #followYaw = null;
    #orbitOffset = 0;
    #followPitch = FOLLOW_PITCH;
    #lookYaw = 0;
    #lookPitch = 0;
    #target;
    #viewSize = 33;
    #transition = 0;
    #scratch;
    /** Where the camera looked last frame (glides and hand-backs start from it). */
    #lastLook;
    /** Free-flying ghost camera: { position, yaw, pitch }, laid over every other mode while on. */
    #ghost = null;
    /** When C went down (it toggles the ghost once held for `GHOST_HOLD_MS`), and whether this hold already did. */
    #cDown = null;
    #cFired = false;
    /** Ghost flying keys held down (`KeyboardEvent.code`). */
    #held = new Set();
    /** Fingers on the canvas. */
    #touches = new TouchGestures();
    /** Where a mouse press began, to tell a click from a drag. */
    #pressAt = null;
    /** Overview distance factor for a portrait screen (1 when landscape). */
    #fit = 1;
    #onTap;

    /**
     * @param {{ THREE: typeof import('three'), camera: import('three').PerspectiveCamera, canvas: HTMLCanvasElement,
     *   onTap?: (point: { x: number, y: number, touch: boolean }) => void }} options Controller dependencies; `onTap` gets
     *   canvas-relative CSS pixels.
     */
    constructor({ THREE, camera, canvas, onTap = () => {} }) {
        super();
        this.#THREE = THREE;
        this.#camera = camera;
        this.#canvas = canvas;
        this.#onTap = onTap;
        this.#target = new THREE.Vector3(0, 0, 0);
        this.#scratch = { position: new THREE.Vector3(), look: new THREE.Vector3(), from: new THREE.Vector3(), lookFrom: new THREE.Vector3(), head: new THREE.Vector3() };
        this.#lastLook = new THREE.Vector3();
        this.#camera.zoom = 1;

        this.on(canvas, 'pointerdown', this.#handlePointerDown);
        this.on(window, 'pointermove', this.#handlePointerMove);
        this.on(window, 'pointerup', this.#handlePointerUp);
        this.on(window, 'pointercancel', this.#handlePointerUp);
        this.on(canvas, 'contextmenu', (event) => event.preventDefault());
        this.on(canvas, 'wheel', this.#handleWheel, { passive: false });
        this.on(window, 'keydown', this.#handleKeyDown);
        this.on(window, 'keyup', this.#handleKeyUp);
        this.on(window, 'blur', () => {
            this.#cDown = null;
            this.#held.clear();
            this.#touches.clear();
        });
        this.update(0);
    }

    /** @returns {import('three').Object3D|null} Model the camera is framing (inspected or filmed), if any. */
    get target() {
        return (this.#cinematic ?? this.#subject)?.root ?? null;
    }

    /** @returns {'free'|'inspect'|'cinematic'} What the camera is doing. */
    get mode() {
        if (this.#cinematic) return 'cinematic';
        return this.#subject ? 'inspect' : 'free';
    }

    /** @returns {boolean} Whether the free-flying ghost camera is on (it overrides `mode` until turned off). */
    get ghost() {
        return this.#ghost !== null;
    }

    /** Turns the ghost camera on (starting from the current view) or off (gliding back to the mode underneath). */
    toggleGhost() {
        if (this.#ghost) {
            this.#ghost = null;
            this.#held.clear();
            this.#glide();
            return;
        }
        const at = this.#camera.position;
        const look = this.#lastLook;
        this.#ghost = {
            position: at.clone(),
            yaw: Math.atan2(look.x - at.x, look.z - at.z),
            pitch: Math.atan2(look.y - at.y, Math.hypot(look.x - at.x, look.z - at.z)),
        };
        this.#transition = 0;
    }

    /** @returns {'fixed'|'follow'|'first'} How an inspected gladiator is framed. */
    get inspectMode() {
        return this.#inspectMode;
    }

    /** @returns {number} World-space height framed at the camera target. */
    get viewSize() {
        return this.#viewSize;
    }

    /**
     * Frames a gladiator in the current inspect mode (ends a cinematic).
     *
     * @param {{ root: import('three').Object3D, bonePosition?: Function }|import('three').Object3D|null} subject Fighter (or its root).
     */
    follow(subject) {
        const next = subject ? (subject.root ? subject : { root: subject }) : null;
        if (next?.root === this.#subject?.root && !this.#cinematic) return;
        this.#subject = next;
        this.#cinematic = null;
        this.#followYaw = null;
        this.#orbitOffset = 0;
        this.#lookYaw = 0;
        this.#lookPitch = 0;
        this.#glide();
    }

    /** Stops following; the overview stays where it is. */
    unfollow() {
        if (!this.#subject && !this.#cinematic) return;
        if (this.#inspectMode !== 'fixed' || this.#cinematic) this.#toOverview();
        this.#subject = null;
        this.#cinematic = null;
    }

    /**
     * Sets how an inspected gladiator is framed.
     *
     * @param {'fixed'|'follow'|'first'} mode Inspect mode.
     */
    setInspectMode(mode) {
        if (!INSPECT_MODES.includes(mode) || mode === this.#inspectMode) return;
        this.#inspectMode = mode;
        this.#followYaw = null;
        this.#orbitOffset = 0;
        this.#lookYaw = 0;
        this.#lookPitch = 0;
        if (this.#subject && !this.#cinematic) this.#glide();
    }

    /** @returns {'fixed'|'follow'|'first'} The next inspect mode, now current. */
    cycleInspectMode() {
        this.setInspectMode(INSPECT_MODES[(INSPECT_MODES.indexOf(this.#inspectMode) + 1) % INSPECT_MODES.length]);
        return this.#inspectMode;
    }

    /**
     * Slowly circles a fighter, kept in the middle of the view (the victor's celebration); a drag ends it.
     *
     * @param {{ root: import('three').Object3D }|null} subject Fighter to film, or null to stop.
     */
    cinematic(subject) {
        if (!subject) {
            if (this.#cinematic) this.unfollow();
            return;
        }
        if (this.#cinematic?.root === subject.root) return;
        const at = this.#camera.position;
        this.#followZoom = 1;
        this.#cinematic = { subject, height: null, root: subject.root, yaw: Math.atan2(at.x - subject.root.position.x, at.z - subject.root.position.z), time: 0 };
        this.#glide();
    }

    /**
     * Recomputes the camera frustum for the canvas display size.
     *
     * @param {number} width Canvas width in CSS pixels.
     * @param {number} height Canvas height in CSS pixels.
     */
    resize(width, height) {
        const aspect = Math.max(0.1, width / Math.max(1, height));
        this.#fit = aspect < 1 ? Math.min(PORTRAIT_FIT_MAX, (1 / aspect) ** PORTRAIT_FIT_POWER) : 1;
        this.#camera.aspect = aspect;
        this.#camera.updateProjectionMatrix();
    }

    /**
     * Places the camera for this frame.
     *
     * @param {number} [dt] Real seconds since the previous frame.
     */
    update(dt = 0) {
        const { position, look } = this.#scratch;
        let near = NEAR.far;
        let zoom = this.#zoom;
        if (this.#cDown !== null && !this.#cFired && performance.now() - this.#cDown >= GHOST_HOLD_MS) {
            this.#cFired = true;
            this.toggleGhost();
        }
        if (this.#ghost) {
            near = NEAR.eye;
            zoom = 1;
            this.#placeGhost(dt, position, look);
        }
        else if (this.#cinematic) {
            near = NEAR.close;
            zoom = 1;
            this.#placeCinematic(dt, position, look);
        }
        else if (this.#subject && this.#inspectMode === 'follow') {
            near = NEAR.close;
            zoom = 1;
            this.#placeFollow(dt, position, look);
        }
        else if (this.#subject && this.#inspectMode === 'first') {
            near = NEAR.eye;
            zoom = Math.max(1, this.#followZoom);
            this.#placeEyes(position, look);
        }
        else this.#placeOverview(position, look);

        if (this.#transition > 0) {
            // Glide from where the camera was when the mode changed.
            this.#transition = Math.max(0, this.#transition - dt);
            const t = smooth(1 - this.#transition / TRANSITION_SECONDS);
            position.lerpVectors(this.#scratch.from, position, t);
            look.lerpVectors(this.#scratch.lookFrom, look, t);
        }
        this.#camera.position.copy(position);
        this.#camera.lookAt(look);
        if (this.#camera.near !== near || this.#camera.zoom !== zoom) {
            this.#camera.near = near;
            this.#camera.zoom = zoom;
            this.#camera.updateProjectionMatrix();
        }
        this.#camera.updateMatrixWorld();
        this.#lastLook.copy(look);
    }

    /** Starts a glide from the current view. */
    #glide() {
        this.#scratch.from.copy(this.#camera.position);
        this.#scratch.lookFrom.copy(this.#lastLook);
        this.#transition = TRANSITION_SECONDS;
    }

    /** Leaving a close view: the overview takes over centred on what the camera was looking at. */
    #toOverview() {
        this.#target.set(this.#lastLook.x, 0, this.#lastLook.z);
        this.#glide();
    }

    /** The overview: high above the arena, the target eased toward a fixed-mode subject. */
    #placeOverview(position, look) {
        if (this.#subject) {
            this.#target.x += (this.#subject.root.position.x - this.#target.x) * 0.12;
            this.#target.z += (this.#subject.root.position.z - this.#target.z) * 0.12;
        }
        this.#target.x = Math.min(CAMERA_TARGET_LIMIT, Math.max(-CAMERA_TARGET_LIMIT, this.#target.x));
        this.#target.z = Math.min(CAMERA_TARGET_LIMIT, Math.max(-CAMERA_TARGET_LIMIT, this.#target.z));
        const distance = CAMERA_DISTANCE * this.#fit;
        const ground = Math.cos(this.#pitch) * distance;
        position.set(
            this.#target.x + Math.sin(this.#yaw) * ground,
            Math.sin(this.#pitch) * distance,
            this.#target.z + Math.cos(this.#yaw) * ground,
        );
        look.copy(this.#target);
    }

    /** Third person: behind the fighter, swinging round as it turns; right drag orbits, the wheel sets the distance. */
    #placeFollow(dt, position, look) {
        const root = this.#subject.root;
        const behind = root.rotation.y + Math.PI;
        if (this.#followYaw === null) this.#followYaw = behind;
        this.#followYaw += wrap(behind - this.#followYaw) * (1 - Math.exp(-dt * FOLLOW_TURN_RATE));
        const yaw = this.#followYaw + this.#orbitOffset;
        const distance = Math.min(FOLLOW_RANGE[1], Math.max(FOLLOW_RANGE[0], FOLLOW_DISTANCE / this.#followZoom));
        const ground = Math.cos(this.#followPitch) * distance;
        look.set(root.position.x, root.position.y + LOOK_HEIGHT, root.position.z);
        position.set(look.x + Math.sin(yaw) * ground, look.y + Math.sin(this.#followPitch) * distance, look.z + Math.cos(yaw) * ground);
    }

    /** First person: from just ahead of the head, looking where the fighter faces; right drag looks around. */
    #placeEyes(position, look) {
        const root = this.#subject.root;
        const yaw = root.rotation.y + this.#lookYaw;
        const head = this.#subject.bonePosition?.('Head', this.#scratch.head) ?? this.#scratch.head.set(root.position.x, root.position.y + 1.05, root.position.z);
        position.set(head.x + Math.sin(root.rotation.y) * EYE_AHEAD, head.y + 0.03, head.z + Math.cos(root.rotation.y) * EYE_AHEAD);
        const pitch = EYE_PITCH + this.#lookPitch;
        look.set(position.x + Math.sin(yaw) * Math.cos(pitch), position.y + Math.sin(pitch), position.z + Math.cos(yaw) * Math.cos(pitch));
    }

    /** Ghost: flies anywhere with WASD/arrows (Q/E down and up, Shift faster), any drag looks round, the wheel dives. */
    #placeGhost(dt, position, look) {
        const ghost = this.#ghost;
        let right = 0;
        let up = 0;
        let forward = 0;
        this.#held.forEach((code) => {
            const direction = GHOST_KEYS[code];
            if (!direction) return;
            right += direction[0];
            up += direction[1];
            forward += direction[2];
        });
        const step = GHOST_SPEED * (this.#held.has('ShiftLeft') || this.#held.has('ShiftRight') ? GHOST_BOOST : 1) * dt;
        this.#fly(right * step, up * step, forward * step);
        position.copy(ghost.position);
        look.set(
            position.x + Math.sin(ghost.yaw) * Math.cos(ghost.pitch),
            position.y + Math.sin(ghost.pitch),
            position.z + Math.cos(ghost.yaw) * Math.cos(ghost.pitch),
        );
    }

    /** Moves the ghost along its view: forward follows the pitch, right stays level, up is straight up. */
    #fly(right, up, forward) {
        const { position, yaw, pitch } = this.#ghost;
        const level = Math.cos(pitch);
        position.x += Math.sin(yaw) * level * forward - Math.cos(yaw) * right;
        position.y += Math.sin(pitch) * forward + up;
        position.z += Math.cos(yaw) * level * forward + Math.sin(yaw) * right;
    }

    /** @param {KeyboardEvent} event Key press: starts timing a C hold, and records the ghost's flying keys. */
    #handleKeyDown = (event) => {
        if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        if (event.code === 'KeyC' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
            this.#cDown = performance.now();
            this.#cFired = false;
        }
        if (this.#ghost && (GHOST_KEYS[event.code] || event.code.startsWith('Shift'))) this.#held.add(event.code);
    };

    /** @param {KeyboardEvent} event Key release. */
    #handleKeyUp = (event) => {
        if (event.code === 'KeyC') this.#cDown = null;
        this.#held.delete(event.code);
    };

    /** Cinematic: a slow circle round the subject at chest height, the subject in the middle of the view. */
    #placeCinematic(dt, position, look) {
        const shot = this.#cinematic;
        shot.time += dt;
        shot.yaw += CINEMATIC_SPIN * dt;
        const root = shot.root;
        const pitch = CINEMATIC_PITCH + Math.sin(shot.time * 0.35) * 0.08;
        // The body's real height (from the head bone; the models are scaled), eased so raised arms or a bow don't pump it.
        const head = shot.subject.bonePosition?.('Head', this.#scratch.head);
        const measured = head ? Math.max(0.5, head.y - root.position.y + HEAD_TOP) : LOOK_HEIGHT * 2;
        shot.height = shot.height === null ? measured : shot.height + (measured - shot.height) * (1 - Math.exp(-dt * 2));
        // Far enough that the victor fills the laurel ring, whichever side of the screen is the smaller; centred on the body.
        const camera = this.#camera;
        const fill = VICTOR_FILL * Math.min(1, camera.aspect);
        const distance = shot.height / (fill * 2 * Math.tan(camera.fov * Math.PI / 360)) / this.#followZoom;
        look.set(root.position.x, root.position.y + shot.height / 2, root.position.z);
        const ground = Math.cos(pitch) * distance;
        position.set(look.x + Math.sin(shot.yaw) * ground, look.y + Math.sin(pitch) * distance, look.z + Math.cos(shot.yaw) * ground);
    }

    /** @param {PointerEvent} event Pointer start event. */
    #handlePointerDown = (event) => {
        if (event.pointerType === 'touch') {
            this.#touches.down(event.pointerId, event.clientX, event.clientY, event.timeStamp);
            this.#canvas.setPointerCapture?.(event.pointerId);
            this.#takeBack();
            return;
        }
        if (event.button > 2) return;
        this.#dragMode = event.button === 0 && !event.shiftKey ? 'pan' : 'rotate';
        this.#dragOrigin = { x: event.clientX, y: event.clientY };
        this.#pressAt = event.button === 0 ? { x: event.clientX, y: event.clientY, moved: false } : null;
        this.#canvas.setPointerCapture?.(event.pointerId);
        this.#canvas.classList.add('is-dragging');
        this.#takeBack();
    };

    /** Any drag takes the camera back from the cinematic (the ghost keeps flying). */
    #takeBack() {
        if (this.#ghost || !this.#cinematic) return;
        this.#cinematic = null;
        if (this.#subject && this.#inspectMode !== 'fixed') return;
        this.#target.set(this.#lastLook.x, 0, this.#lastLook.z);
        this.#glide();
    }

    /** @param {PointerEvent} event Pointer movement event. */
    #handlePointerMove = (event) => {
        if (this.#touches.has(event.pointerId)) {
            this.#handleTouchMove(event);
            return;
        }
        if (!this.#dragOrigin) return;
        const deltaX = event.clientX - this.#dragOrigin.x;
        const deltaY = event.clientY - this.#dragOrigin.y;
        this.#dragOrigin = { x: event.clientX, y: event.clientY };
        if (this.#pressAt && Math.hypot(event.clientX - this.#pressAt.x, event.clientY - this.#pressAt.y) > CLICK_SLOP) this.#pressAt.moved = true;
        if (this.#ghost || this.#dragMode === 'rotate') this.#rotate(deltaX, deltaY);
        else this.#drag(deltaX, deltaY);
    };

    /** One finger rotates like a right drag; two pan like a left drag, pinch like the wheel and twist turn the overview. */
    #handleTouchMove(event) {
        const gesture = this.#touches.move(event.pointerId, event.clientX, event.clientY);
        if (!gesture) return;
        if (gesture.kind === 'drag') {
            this.#rotate(gesture.dx * TOUCH_ROTATE, gesture.dy * TOUCH_ROTATE);
            return;
        }
        const applied = this.#zoomBy(gesture.scale);
        if (!this.#ghost && !this.#subject && !this.#cinematic && applied !== 1) {
            // The overview zooms toward the fingers: what lies under the pinch stays under it.
            const rect = this.#canvas.getBoundingClientRect();
            const offsetX = gesture.x - rect.left - rect.width / 2;
            const offsetY = gesture.y - rect.top - rect.height / 2;
            // (The camera still has the old magnification, so the shift is measured at it.)
            this.#drag(-offsetX * (1 - 1 / applied), -offsetY * (1 - 1 / applied));
        }
        if (this.#ghost) {
            const step = this.#worldPerPixel();
            this.#fly(-gesture.dx * step, gesture.dy * step, 0);
            return;
        }
        // While a gladiator is inspected, a pinch that barely drifts must not let it go.
        if (!this.#subject || this.#touches.travel > TOUCH_PAN_SLOP) this.#drag(gesture.dx, gesture.dy);
        if (!this.#subject && !this.#cinematic) this.#yaw += gesture.twist;
    }

    /** CSS pixels to metres on the ground at the overview's focus. */
    #worldPerPixel() {
        return this.#viewSize * 0.9 * this.#fit / (Math.max(1, this.#canvas.clientHeight) * this.#camera.zoom);
    }

    /** A rotate drag: looks round in the ghost and first person, orbits in third person, turns and tilts the overview. */
    #rotate(deltaX, deltaY) {
        if (this.#ghost) {
            // Looks round without limits but straight up or down.
            this.#ghost.yaw -= deltaX * ROTATE_PER_PIXEL * 0.6;
            this.#ghost.pitch = Math.min(1.55, Math.max(-1.55, this.#ghost.pitch - deltaY * ROTATE_PER_PIXEL * 0.6));
        }
        else if (this.#subject && this.#inspectMode === 'follow') {
            this.#orbitOffset -= deltaX * ROTATE_PER_PIXEL;
            this.#followPitch = Math.min(FOLLOW_PITCH_RANGE[1], Math.max(FOLLOW_PITCH_RANGE[0], this.#followPitch + deltaY * ROTATE_PER_PIXEL));
        }
        else if (this.#subject && this.#inspectMode === 'first') {
            this.#lookYaw -= deltaX * ROTATE_PER_PIXEL;
            this.#lookPitch = Math.min(1.2, Math.max(-1.2, this.#lookPitch - deltaY * ROTATE_PER_PIXEL));
        }
        else {
            this.#yaw -= deltaX * ROTATE_PER_PIXEL;
            this.#pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, this.#pitch + deltaY * ROTATE_PER_PIXEL));
        }
    }

    /** A pan drag: the ground follows the pointer; it lets an inspected gladiator go. */
    #drag(deltaX, deltaY) {
        if (!deltaX && !deltaY) return;
        if (this.#subject) this.unfollow();
        const worldPerPixel = this.#worldPerPixel();
        this.#pan(-deltaX * worldPerPixel, -deltaY * worldPerPixel * 1.35);
    }

    /** Moves the target along the ground in screen-aligned axes (right, forward-down). */
    #pan(right, down) {
        const cos = Math.cos(this.#yaw);
        const sin = Math.sin(this.#yaw);
        this.#target.x += right * cos + down * sin;
        this.#target.z += -right * sin + down * cos;
    }

    /** Ends pointer dragging; a press or touch that never dragged is a tap. */
    #handlePointerUp = (event) => {
        if (this.#touches.has(event.pointerId)) {
            const tap = this.#touches.up(event.pointerId, event.timeStamp, event.type === 'pointercancel');
            if (tap) this.#tap(tap.x, tap.y, true);
            return;
        }
        const press = this.#pressAt;
        this.#pressAt = null;
        this.#dragOrigin = null;
        this.#canvas.classList.remove('is-dragging');
        if (press && !press.moved && event.type === 'pointerup' && event.button === 0) this.#tap(press.x, press.y, false);
    };

    #tap(clientX, clientY, touch) {
        const rect = this.#canvas.getBoundingClientRect();
        this.#onTap({ x: clientX - rect.left, y: clientY - rect.top, touch });
    }

    /** @param {WheelEvent} event Mouse-wheel zoom: magnifies the overview, or brings a close camera nearer. */
    #handleWheel = (event) => {
        event.preventDefault();
        this.#zoomBy(event.deltaY > 0 ? 0.9 : 1.1);
    };

    /**
     * Zooms by a factor (above 1 closer): the ghost flies along its view, close cameras come nearer, the overview magnifies.
     *
     * @param {number} factor Zoom ratio.
     * @returns {number} The ratio the overview magnification actually changed by (1 for the other cameras or at a limit).
     */
    #zoomBy(factor) {
        if (factor === 1 || !(factor > 0)) return 1;
        if (this.#ghost) {
            this.#fly(0, 0, Math.log(factor) * GHOST_ZOOM_FLIGHT);
            return 1;
        }
        if (this.#cinematic || (this.#subject && this.#inspectMode !== 'fixed')) {
            this.#followZoom = Math.min(4, Math.max(0.4, this.#followZoom * factor));
            return 1;
        }
        const zoom = this.#zoom;
        this.#zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
        return this.#zoom / zoom;
    }
}
