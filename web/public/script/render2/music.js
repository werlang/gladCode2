/**
 * Music layers, with the integrated loudness each file was measured at (LUFS). The battle opens on the tribal drums
 * and turns tense for the climax.
 */
const LAYERS = Object.freeze({
    battle: { path: 'res/audio/tribal.mp3', lufs: -8.4 },
    climax: { path: 'res/audio/tense.mp3', lufs: -12.4 },
});

/**
 * The track the legacy music slider (0 to 0.1) was tuned on (`adventure.mp3`); the layers are matched to it, plus a
 * little lift, since the effects are now normalised and limited below their old peaks.
 */
const REFERENCE_LUFS = -6.2;
/** Seconds a mood change takes to cross-fade. */
const FADE_SECONDS = 3;

/**
 * Adaptive battle music with the legacy track API the shared playback UI drives (`volume` from the 0 to 0.1 slider,
 * `play`, `pause`, `resume`, `stop`, `isPlaying`). The layers stream from HTML audio elements routed into the
 * renderer's music bus (where explosions and deaths duck them), each levelled to the reference loudness, and
 * cross-fade when the mood changes.
 */
export class MusicDirector {
    #context;
    #layers = new Map();
    #mood = 'battle';
    #volume = 0;
    #playing = false;
    #resumeAfterPause = false;

    /**
     * @param {import('./audio-manager.js').BattleAudioManager} audio The renderer's sound engine.
     * @param {number} volume Initial slider volume (0 to 0.1).
     */
    constructor(audio, volume) {
        this.#context = audio.context;
        for (const [name, { path, lufs }] of Object.entries(LAYERS)) {
            const element = new Audio(path);
            element.loop = true;
            element.preload = name === this.#mood ? 'auto' : 'metadata';
            let gain = null;
            if (this.#context) {
                try {
                    gain = this.#context.createGain();
                    gain.gain.value = 0;
                    this.#context.createMediaElementSource(element).connect(gain).connect(audio.buses.music);
                }
                catch {
                    gain = null;
                }
            }
            this.#layers.set(name, { element, gain, trim: 10 ** ((REFERENCE_LUFS - lufs) / 20), fade: name === this.#mood ? 1 : 0 });
        }
        this.volume = volume;
        // Browsers refuse to start audio before the page is touched: start it on the first gesture instead.
        audio.onGesture(() => {
            const { element } = this.#layers.get(this.#mood) ?? {};
            if (this.#playing && element?.paused) element.play().catch(() => {});
        });
    }

    /** @returns {boolean} Whether the music is playing. */
    get isPlaying() {
        return this.#playing;
    }

    /** @returns {number} Slider volume (0 to 0.1). */
    get volume() {
        return this.#volume;
    }

    /** @param {number|string} value Slider volume (0 to 0.1, louder values clamp at 1). */
    set volume(value) {
        this.#volume = Math.min(1, Math.max(0, Number(value) || 0));
        this.#apply();
    }

    /** @returns {'battle'|'climax'} The current mood. */
    get mood() {
        return this.#mood;
    }

    /**
     * Cross-fades to another mood (the new layer starts from its top).
     *
     * @param {'battle'|'climax'} mood Mood to play.
     */
    setMood(mood) {
        if (!this.#layers.has(mood) || mood === this.#mood) return;
        this.#mood = mood;
        const layer = this.#layers.get(mood);
        layer.element.preload = 'auto';
        if (this.#playing) {
            try {
                layer.element.currentTime = 0;
            }
            catch {
                // Not loaded yet: it starts from the top anyway.
            }
            layer.element.play().catch(() => {});
        }
    }

    /**
     * @param {string} [_marker] Unused Phaser marker name.
     * @param {number} [position] Start position in seconds of the current layer.
     * @param {number} [volume] Slider volume.
     * @returns {MusicDirector} This director.
     */
    play(_marker = '', position = 0, volume = this.#volume) {
        this.volume = volume;
        const { element } = this.#layers.get(this.#mood);
        try {
            element.currentTime = Math.max(0, Number(position) || 0);
        }
        catch {
            // Not loaded yet.
        }
        this.#playing = true;
        element.play().catch(() => {
            // Autoplay policy can defer audio until the first user interaction.
        });
        return this;
    }

    /** Pauses every layer, remembering whether to resume. */
    pause() {
        this.#resumeAfterPause = this.#playing;
        this.#playing = false;
        this.#layers.forEach(({ element }) => element.pause());
    }

    /** Resumes the layers that were sounding before the pause. */
    resume() {
        if (!this.#resumeAfterPause && this.#playing) return;
        this.#playing = true;
        this.#resumeAfterPause = false;
        this.#layers.forEach(({ element, fade }, name) => {
            if (name === this.#mood || fade > 0.001) element.play().catch(() => {});
        });
    }

    /** Stops and rewinds every layer. */
    stop() {
        this.#playing = false;
        this.#layers.forEach(({ element }) => {
            element.pause();
            try {
                element.currentTime = 0;
            }
            catch {
                // Not loaded yet.
            }
        });
    }

    /** @param {number} dt Real seconds since the previous frame; advances the cross-fade. */
    update(dt) {
        let changed = false;
        this.#layers.forEach((layer, name) => {
            const target = name === this.#mood ? 1 : 0;
            if (layer.fade === target) return;
            const step = dt / FADE_SECONDS;
            layer.fade = target > layer.fade ? Math.min(1, layer.fade + step) : Math.max(0, layer.fade - step);
            // A layer that has faded out stops streaming.
            if (layer.fade === 0) layer.element.pause();
            changed = true;
        });
        if (changed) this.#apply();
    }

    #apply() {
        const now = this.#context?.currentTime ?? 0;
        this.#layers.forEach(({ element, gain, trim, fade }) => {
            // Equal-power cross-fade.
            const level = this.#volume * trim * Math.sin((fade * Math.PI) / 2);
            if (gain) gain.gain.setTargetAtTime(level, now, 0.05);
            else element.volume = Math.min(1, level);
        });
    }

    /** Releases the streams. */
    destroy() {
        this.#layers.forEach(({ element, gain }) => {
            element.pause();
            element.removeAttribute('src');
            element.load();
            gain?.disconnect();
        });
        this.#layers.clear();
    }
}
