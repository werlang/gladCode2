/** Weight of the newest frame in the rolling averages. */
const SMOOTHING = 0.05;

/**
 * Diagnostics for the render loop: how long each part of a frame takes on the main thread (rolling averages, in
 * milliseconds) and, where the browser exposes `EXT_disjoint_timer_query_webgl2`, how long the GPU spends drawing
 * the scene. Read through `BattleRenderer#getDebugSnapshot().timings`; costs a few `performance.now()` calls.
 */
export class FrameProfiler {
    #cpu = new Map();
    #mark = 0;
    #gl;
    #timer = null;
    #pending = [];
    #gpu = null;

    /** @param {WebGL2RenderingContext} gl Renderer context (for the GPU timer). */
    constructor(gl) {
        this.#gl = gl;
        this.#timer = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2') ?? null;
    }

    /** Starts timing a frame's sections. */
    begin() {
        this.#mark = performance.now();
        this.#collectGpu();
    }

    /**
     * Closes the section running since the previous mark under `name`.
     *
     * @param {string} name Section name.
     */
    lap(name) {
        const now = performance.now();
        const previous = this.#cpu.get(name);
        const spent = now - this.#mark;
        this.#cpu.set(name, previous === undefined ? spent : previous + (spent - previous) * SMOOTHING);
        this.#mark = now;
    }

    /** Opens a GPU timer around the draw calls that follow (one at a time). */
    gpuBegin() {
        if (!this.#timer || this.#pending.length > 3) return null;
        const query = this.#gl.createQuery();
        this.#gl.beginQuery(this.#timer.TIME_ELAPSED_EXT, query);
        return query;
    }

    /** @param {WebGLQuery|null} query The timer from `gpuBegin`. */
    gpuEnd(query) {
        if (!query) return;
        this.#gl.endQuery(this.#timer.TIME_ELAPSED_EXT);
        this.#pending.push(query);
    }

    /** Reads finished GPU timers (results arrive a frame or two later). */
    #collectGpu() {
        const gl = this.#gl;
        while (this.#pending.length) {
            const query = this.#pending[0];
            if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
            this.#pending.shift();
            const disjoint = gl.getParameter(this.#timer.GPU_DISJOINT_EXT);
            if (!disjoint) {
                const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
                this.#gpu = this.#gpu === null ? ms : this.#gpu + (ms - this.#gpu) * SMOOTHING;
            }
            gl.deleteQuery(query);
        }
    }

    /** @returns {{ cpu: Record<string, number>, cpuTotal: number, gpuScene: number|null }} Rolling averages in ms. */
    get snapshot() {
        const cpu = Object.fromEntries([...this.#cpu].map(([name, ms]) => [name, Math.round(ms * 100) / 100]));
        const cpuTotal = Math.round([...this.#cpu.values()].reduce((sum, ms) => sum + ms, 0) * 100) / 100;
        return { cpu, cpuTotal, gpuScene: this.#gpu === null ? null : Math.round(this.#gpu * 100) / 100 };
    }
}
