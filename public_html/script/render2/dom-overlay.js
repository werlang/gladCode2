import { BaseComponent } from './base-component.js';

/**
 * Projects battle labels, vitals, speech and breakpoint messages over WebGL.
 */
export class BattleDomOverlay extends BaseComponent {
    #camera;
    #canvas;
    #fighters = new Map();
    #root;
    #timers = new Set();

    /**
     * @param {{ container: HTMLElement, canvas: HTMLCanvasElement, camera: import('three').Camera }} options Overlay dependencies.
     */
    constructor({ container, canvas, camera }) {
        super();
        this.#canvas = canvas;
        this.#camera = camera;
        this.#root = document.createElement('div');
        this.#root.className = 'battle-render2-overlay';
        this.#root.setAttribute('aria-live', 'off');
        container.appendChild(this.#root);
    }

    /**
     * Creates the DOM nodes owned by one gladiator overlay.
     *
     * @param {number|string} id Stable gladiator id.
     * @returns {Record<string, HTMLElement>} Fighter nodes.
     */
    #createFighter(id) {
        const host = document.createElement('div');
        host.className = 'battle-render2-fighter';

        const breakpoint = document.createElement('button');
        breakpoint.type = 'button';
        breakpoint.className = 'battle-render2-breakpoint';
        breakpoint.title = 'Expandir breakpoint';
        breakpoint.hidden = true;
        this.on(breakpoint, 'click', () => {
            breakpoint.classList.add('is-expanded');
            breakpoint.removeAttribute('title');
        });

        const speech = document.createElement('div');
        speech.className = 'battle-render2-speech';
        speech.hidden = true;

        const vitals = document.createElement('div');
        vitals.className = 'battle-render2-vitals';
        const name = document.createElement('strong');
        name.className = 'battle-render2-name';
        const hpTrack = document.createElement('span');
        hpTrack.className = 'battle-render2-meter battle-render2-meter--hp';
        const hp = document.createElement('span');
        hpTrack.appendChild(hp);
        const apTrack = document.createElement('span');
        apTrack.className = 'battle-render2-meter battle-render2-meter--ap';
        const ap = document.createElement('span');
        apTrack.appendChild(ap);
        vitals.append(name, hpTrack, apTrack);
        host.append(breakpoint, speech, vitals);
        this.#root.appendChild(host);

        const nodes = { host, breakpoint, speech, vitals, name, hp, ap };
        this.#fighters.set(String(id), nodes);
        return nodes;
    }

    /**
     * Converts a gladiator's world anchor into overlay pixels.
     *
     * @param {import('./gladiator-view.js').GladiatorView} view Gladiator view.
     * @returns {{ x: number, y: number, visible: boolean }} Projected position.
     */
    #project(view) {
        const point = view.getWorldAnchor().project(this.#camera);
        const rawX = (point.x * 0.5 + 0.5) * this.#canvas.clientWidth;
        const rawY = (-point.y * 0.5 + 0.5) * this.#canvas.clientHeight;
        return {
            x: Math.max(76, Math.min(this.#canvas.clientWidth - 76, rawX)),
            y: Math.max(92, Math.min(this.#canvas.clientHeight - 8, rawY)),
            visible: point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.15 && Math.abs(point.y) < 1.15,
        };
    }

    /**
     * Synchronizes one fighter overlay with an authoritative replay state.
     *
     * @param {import('./gladiator-view.js').GladiatorView} view Gladiator view.
     * @param {{ bars?: boolean, speech?: boolean }} preferences Display preferences.
     */
    updateFighter(view, preferences) {
        const gladiator = view.state;
        const id = String(gladiator.id ?? this.#fighters.size);
        const nodes = this.#fighters.get(id) ?? this.#createFighter(id);
        const projected = this.#project(view);
        const alive = Number(gladiator.hp) > 0;
        nodes.host.hidden = !projected.visible;
        nodes.host.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0) translate(-50%, -100%)`;
        nodes.name.textContent = String(gladiator.name ?? `Gladiador ${id}`);
        nodes.hp.style.width = `${Math.max(0, Math.min(100, Number(gladiator.hp) / Math.max(1, Number(gladiator.maxhp)) * 100))}%`;
        nodes.ap.style.width = `${Math.max(0, Math.min(100, Number(gladiator.ap) / Math.max(1, Number(gladiator.maxap)) * 100))}%`;
        nodes.vitals.hidden = !preferences.bars || !alive;

        const message = typeof gladiator.message === 'string' ? gladiator.message : '';
        nodes.speech.textContent = message;
        nodes.speech.hidden = !preferences.speech || !alive || message.length === 0;

        const breakpoint = typeof gladiator.breakpoint === 'string' ? gladiator.breakpoint : '';
        if (breakpoint) {
            if (nodes.breakpoint.textContent !== breakpoint) {
                nodes.breakpoint.classList.remove('is-expanded');
                nodes.breakpoint.title = 'Expandir breakpoint';
            }
            nodes.breakpoint.textContent = breakpoint;
            nodes.breakpoint.hidden = !alive;
        }
        else {
            nodes.breakpoint.hidden = true;
            nodes.breakpoint.classList.remove('is-expanded');
        }
    }

    /**
     * Adds a short-lived projected combat label.
     *
     * @param {import('./gladiator-view.js').GladiatorView} view Target gladiator.
     * @param {string} text Visible label.
     * @param {'damage'|'heal'|'level'|'mana'|'potion'} tone Semantic tone.
     */
    showFloatingLabel(view, text, tone) {
        const projected = this.#project(view);
        if (!projected.visible) return;
        const label = document.createElement('span');
        label.className = `battle-render2-float battle-render2-float--${tone}`;
        label.textContent = text;
        label.style.left = `${projected.x}px`;
        label.style.top = `${projected.y - 24}px`;
        this.#root.appendChild(label);
        const timer = window.setTimeout(() => {
            label.remove();
            this.#timers.delete(timer);
        }, 900);
        this.#timers.add(timer);
    }

    /**
     * Reprojects every fighter after camera movement or resize.
     *
     * @param {Map<string, import('./gladiator-view.js').GladiatorView>} views Active fighter views.
     * @param {{ bars?: boolean, speech?: boolean }} preferences Display preferences.
     */
    updatePositions(views, preferences) {
        views.forEach((view) => this.updateFighter(view, preferences));
    }

    /** Removes overlay nodes, timeouts and listeners. */
    destroy() {
        this.#timers.forEach((timer) => window.clearTimeout(timer));
        this.#timers.clear();
        this.#fighters.clear();
        this.#root.remove();
        super.destroy();
    }
}
