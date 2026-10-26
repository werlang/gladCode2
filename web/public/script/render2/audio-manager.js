import { glide } from './audio-param.js';

const AUDIO_PATHS = Object.freeze({
    ambush: 'res/audio/ambush.mp3',
    arrow_hit: 'res/audio/arrow_hit.mp3',
    assassinate: 'res/audio/assassinate.mp3',
    block: 'res/audio/block.mp3',
    charge_female: 'res/audio/charge_female.mp3',
    charge_male: 'res/audio/charge_male.mp3',
    death_female: 'res/audio/death_female.mp3',
    death_male: 'res/audio/death_male.mp3',
    elixir: 'res/audio/elixir.mp3',
    ending: 'res/audio/ending.mp3',
    explosion: 'res/audio/explosion.mp3',
    fireball: 'res/audio/fireball.mp3',
    heal: 'res/audio/heal.mp3',
    lvlup: 'res/audio/lvlup.mp3',
    mana: 'res/audio/mana.mp3',
    melee: 'res/audio/melee.mp3',
    music: 'res/audio/adventure.mp3',
    ranged: 'res/audio/ranged.mp3',
    stun: 'res/audio/stun.mp3',
    teleport: 'res/audio/teleport.mp3',
    tonic: 'res/audio/tonic.mp3',
    victory: 'res/audio/victory.mp3',
});

/** Arena sounds added for this renderer (see `res/audio/arena/CREDITS.md`). */
const ARENA_AUDIO = 'res/audio/arena/';

/** `count` numbered variants of an arena sound: `flesh_1.mp3` ... */
const variants = (name, count) => Array.from({ length: count }, (_, index) => `${ARENA_AUDIO}${name}_${index + 1}.mp3`);

/**
 * One-shot sounds. Every file is loudness-normalised when decoded (`measureSound`), so `level` is pure mix intent in
 * dB around a normal blow. A play picks a variant (never the same one twice running), detunes it by up to `spread`
 * semitones and nudges its gain, so repeated hits never sound machine-made. `voices` caps overlapping copies (the
 * oldest fades out) and `minor` sounds thin out at high replay speeds.
 *
 * @type {Readonly<Record<string, { files: string[], level: number, spread?: number, voices?: number, minor?: boolean }>>}
 */
export const SOUNDS = Object.freeze({
    melee: { files: [AUDIO_PATHS.melee], level: -4, spread: 1.4 },
    flesh: { files: variants('flesh', 5), level: -1, spread: 1.6 },
    flesh_heavy: { files: variants('flesh_heavy', 5), level: 1.5, spread: 1.2 },
    clang: { files: variants('clang', 6), level: 0, spread: 0.8 },
    thud: { files: variants('thud', 5), level: -4, spread: 1 },
    sand: { files: variants('sand', 5), level: -10, spread: 2, minor: true },
    clatter: { files: variants('clatter', 5), level: -15, spread: 2, minor: true },
    arrow_hit: { files: [AUDIO_PATHS.arrow_hit], level: -4, spread: 1.5 },
    ranged: { files: [AUDIO_PATHS.ranged], level: -4, spread: 1.2 },
    assassinate: { files: [AUDIO_PATHS.assassinate], level: -1, spread: 0.6 },
    block: { files: [AUDIO_PATHS.block], level: -4, spread: 0.8 },
    ambush: { files: [AUDIO_PATHS.ambush], level: -2, spread: 0.6 },
    charge_male: { files: [AUDIO_PATHS.charge_male], level: -3, spread: 0.8, voices: 2 },
    charge_female: { files: [AUDIO_PATHS.charge_female], level: -3, spread: 0.8, voices: 2 },
    death_male: { files: [AUDIO_PATHS.death_male], level: -1, spread: 0.8, voices: 2 },
    death_female: { files: [AUDIO_PATHS.death_female], level: -1, spread: 0.8, voices: 2 },
    elixir: { files: [AUDIO_PATHS.elixir], level: -4, spread: 0.4 },
    heal: { files: [AUDIO_PATHS.heal], level: -4, spread: 0.4 },
    mana: { files: [AUDIO_PATHS.mana], level: -4, spread: 0.4 },
    tonic: { files: [AUDIO_PATHS.tonic], level: -4, spread: 0.4 },
    explosion: { files: [AUDIO_PATHS.explosion], level: 2.5, spread: 1 },
    fireball: { files: [AUDIO_PATHS.fireball], level: -3, spread: 1 },
    lvlup: { files: [AUDIO_PATHS.lvlup], level: -2, spread: 0, voices: 2 },
    stun: { files: [AUDIO_PATHS.stun], level: -4, spread: 0.6, voices: 2 },
    teleport: { files: [AUDIO_PATHS.teleport], level: -3, spread: 0.8 },
    cough: { files: variants('cough', 5), level: -8, spread: 0.6, voices: 3, minor: true },
});

/** Short-term loudness every one-shot is normalised to before its `level` applies (dBFS RMS over `LOUDNESS_WINDOW`). */
const REFERENCE_DB = -21;
/** Window of the loudness measure: about the ear's integration time, so very short clicks read quieter than they peak. */
const LOUDNESS_WINDOW = 0.3;
/** Normalisation never boosts or cuts more than this (dB); noisy, near-silent files would otherwise be blown up. */
const MAX_CORRECTION_DB = 12;
/** Leading samples quieter than this are skipped, so every sound starts on its attack (MP3 encoder delay included). */
const LEAD_THRESHOLD = 0.004;
const MAX_VOICES = 32;
/** Sounds sit in 3D space around a listener hovering this far down the line from the ground focus to the camera. */
const LISTENER_HEIGHT_SHARE = 0.3;
/** Distance rolloff of positioned sounds: full volume within `refDistance` metres of the listener, gently softer beyond. */
const PANNER = { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 10, rolloffFactor: 1, maxDistance: 80 };
/** Ambience bus level against the effects volume slider (crowd, fires, gas, wind share it). */
const AMBIENCE_LEVEL = 0.55;
/** Seconds between listener updates (the camera moves smoothly; 20 Hz is plenty for panning). */
const LISTENER_INTERVAL = 0.05;

const dbToGain = (db) => 10 ** (db / 20);

/**
 * Measures a decoded sound for playback: where its attack starts and how loud it is.
 *
 * @param {Float32Array[]} channels Decoded channel data.
 * @param {number} sampleRate Samples per second.
 * @returns {{ offset: number, loudness: number }} Seconds of leading silence to skip, and the loudest short-term RMS
 *   in dBFS (a sound shorter than the window counts the rest of it as silence).
 */
export function measureSound(channels, sampleRate) {
    const length = channels[0]?.length ?? 0;
    let first = 0;
    for (; first < length; first += 1) {
        if (channels.some((data) => Math.abs(data[first]) > LEAD_THRESHOLD)) break;
    }
    if (first >= length) return { offset: 0, loudness: -Infinity };
    const offset = Math.max(0, first - Math.round(sampleRate * 0.003)) / sampleRate;
    // Running sum of the channel-averaged power, swept over windows 10 ms apart.
    const window = Math.max(1, Math.round(sampleRate * LOUDNESS_WINDOW));
    const hop = Math.max(1, Math.round(sampleRate * 0.01));
    const power = new Float64Array(length + 1);
    for (let i = 0; i < length; i += 1) {
        let sum = 0;
        for (const data of channels) sum += data[i] * data[i];
        power[i + 1] = power[i] + sum / channels.length;
    }
    let loudest = 0;
    for (let start = first; start < length; start += hop) {
        const end = Math.min(length, start + window);
        loudest = Math.max(loudest, power[end] - power[start]);
        if (end === length) break;
    }
    return { offset, loudness: 10 * Math.log10(loudest / window || 1e-12) };
}

/**
 * The legacy sound for a potion, from the engine's action code (`potion-hp`, `potion-ap`, ...).
 *
 * @param {string} code Action code reported with the potion.
 * @returns {string} Sound name.
 */
export function potionSound(code) {
    const kind = String(code ?? '').split('-')[1];
    if (kind === 'hp') return 'heal';
    if (kind === 'ap') return 'mana';
    if (kind === 'high' || kind === 'low') return 'tonic';
    return 'elixir';
}

/**
 * Small HTMLAudioElement adapter that preserves the legacy Phaser audio API (the settings sound test, the victory
 * and ending stings).
 */
export class AudioTrack {
    #audio;
    #resumeAfterPause = false;

    /**
     * @param {string} source Audio asset URL.
     * @param {{ loop?: boolean, volume?: number }} [options] Playback options.
     */
    constructor(source, { loop = false, volume = 1 } = {}) {
        this.#audio = new Audio(source);
        this.#audio.loop = loop;
        this.#audio.preload = 'auto';
        this.volume = volume;
    }

    /** @returns {boolean} Whether the browser is currently playing the track. */
    get isPlaying() {
        return !this.#audio.paused && !this.#audio.ended;
    }

    /** @returns {number} Current volume from zero to one. */
    get volume() {
        return this.#audio.volume;
    }

    /** @param {number|string} value New volume from zero to one. */
    set volume(value) {
        this.#audio.volume = Math.min(1, Math.max(0, Number(value) || 0));
    }

    /**
     * Starts playback using the signature expected by the legacy settings UI.
     *
     * @param {string} [_marker] Unused Phaser marker name.
     * @param {number} [position=0] Start position in seconds.
     * @param {number} [volume=this.volume] Playback volume.
     * @returns {AudioTrack} This track for compatibility with Phaser.
     */
    play(_marker = '', position = 0, volume = this.volume) {
        this.volume = volume;
        if (Number.isFinite(position) && position >= 0) {
            try {
                this.#audio.currentTime = position;
            }
            catch {
                // Some browsers reject currentTime changes before metadata loads.
            }
        }
        this.#audio.play().catch(() => {
            // Autoplay policy can defer audio until the first user interaction.
        });
        return this;
    }

    /** Pauses playback while remembering whether resume should restart it. */
    pause() {
        this.#resumeAfterPause = this.isPlaying;
        this.#audio.pause();
    }

    /** Resumes a track that was playing before pause. */
    resume() {
        if (this.#resumeAfterPause || this.#audio.paused) {
            this.play('', this.#audio.currentTime, this.volume);
        }
        this.#resumeAfterPause = false;
    }

    /** Stops playback and rewinds the track. */
    stop() {
        this.#audio.pause();
        try {
            this.#audio.currentTime = 0;
        }
        catch {
            // Rewinding an unloaded asset is optional cleanup.
        }
    }

    /** Releases the browser audio resource. */
    destroy() {
        this.stop();
        this.#audio.removeAttribute('src');
        this.#audio.load();
    }
}

/**
 * The renderer's sound engine, on the Web Audio API. Every file is decoded once into memory and played as cheap
 * buffer voices, measured on decode so each starts on its attack at a common loudness. Voices are placed in 3D
 * around a listener that follows the camera (panning turns with it), detuned and varied per play, and capped.
 *
 * Mix: music (with a ducking stage), effects (gated while paused) and ambience (muffled while paused) meet in a
 * master gain and a limiter, so stacked blasts never clip. The effects slider drives the effects and ambience buses.
 */
export class BattleAudioManager {
    #context = null;
    #buses = null;
    #buffers = new Map();
    #pending = new Map();
    #voices = [];
    #last = new Map();
    #tracks = new Set();
    #paused = false;
    #speed = 1;
    #unlock = null;
    #listenerAt = { x: 0, y: 10, z: 0 };
    #meters = new Map();
    #unlocked = new Set();
    #taps = null;
    #listenerPlacedAt = -Infinity;

    constructor() {
        const Context = window.AudioContext ?? window.webkitAudioContext;
        if (!Context) return;
        try {
            this.#context = new Context({ latencyHint: 'interactive' });
        }
        catch {
            return;
        }
        const context = this.#context;
        const gain = (value, to) => {
            const node = context.createGain();
            node.gain.value = value;
            if (to) node.connect(to);
            return node;
        };
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 4;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.2;
        limiter.connect(context.destination);
        const master = gain(1, limiter);
        const muffle = context.createBiquadFilter();
        muffle.type = 'lowpass';
        muffle.frequency.value = 20000;
        muffle.connect(master);
        const ambienceGate = gain(1, muffle);
        const duck = gain(1, master);
        const sfxGate = gain(1, master);
        // Points a diagnostic meter can listen to (see `meter`).
        this.#taps = { master: limiter, music: duck, sfx: sfxGate, ambience: muffle };
        this.#buses = {
            master,
            music: gain(1, duck),
            duck,
            sfx: gain(1, sfxGate),
            sfxGate,
            ambience: gain(AMBIENCE_LEVEL, ambienceGate),
            ambienceGate,
            muffle,
        };
        // Browsers start audio suspended until the page is touched; any gesture brings it up.
        this.#unlock = () => {
            if (context.state === 'suspended') context.resume().catch(() => {});
            this.#unlocked.forEach((callback) => callback());
        };
        ['pointerdown', 'keydown', 'touchend'].forEach((type) => window.addEventListener(type, this.#unlock, { capture: true }));
        this.#unlock();
        this.preload(Object.values(SOUNDS).flatMap((sound) => sound.files));
    }

    /**
     * Runs a callback on every user gesture, for media the browser refused to start before one.
     *
     * @param {() => void} callback Retry.
     */
    onGesture(callback) {
        this.#unlocked.add(callback);
    }

    /** @returns {AudioContext|null} The audio context (null where Web Audio is unavailable). */
    get context() {
        return this.#context;
    }

    /** @returns {{ music: GainNode, sfx: GainNode, ambience: GainNode }|null} Buses other audio modules feed. */
    get buses() {
        return this.#buses;
    }

    /** @returns {{ x: number, y: number, z: number }} Where the listener hovers, in world space. */
    get listener() {
        return this.#listenerAt;
    }

    /**
     * Fetches, decodes and measures files ahead of use.
     *
     * @param {string[]} paths Audio URLs.
     */
    preload(paths) {
        paths.forEach((path) => this.load(path));
    }

    /**
     * Decodes an audio file once.
     *
     * @param {string} path Audio URL.
     * @returns {Promise<{ buffer: AudioBuffer, offset: number, gain: number }|null>} The decoded sound with its
     *   attack offset and normalising gain, or null when it cannot be loaded.
     */
    load(path) {
        if (!this.#context) return Promise.resolve(null);
        if (this.#pending.has(path)) return this.#pending.get(path);
        const context = this.#context;
        const request = fetch(path)
            .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`${response.status} ${path}`))))
            .then((data) => new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject)))
            .then((buffer) => {
                const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
                const { offset, loudness } = measureSound(channels, buffer.sampleRate);
                const correction = Math.max(-MAX_CORRECTION_DB, Math.min(MAX_CORRECTION_DB, REFERENCE_DB - loudness));
                const sound = { buffer, offset, gain: dbToGain(Number.isFinite(correction) ? correction : 0) };
                this.#buffers.set(path, sound);
                return sound;
            })
            .catch((error) => {
                console.warn('Sound unavailable:', path, error);
                return null;
            });
        this.#pending.set(path, request);
        return request;
    }

    /**
     * @param {string} path Audio URL.
     * @returns {{ buffer: AudioBuffer, offset: number, gain: number }|null} A decoded sound, if it has loaded.
     */
    sound(path) {
        return this.#buffers.get(path) ?? null;
    }

    /**
     * Creates a panner at a world position, configured like every positioned voice.
     *
     * @param {{ x: number, y?: number, z: number }} at World position.
     * @param {Partial<PannerOptions>} [options] Overrides (e.g. a shorter `refDistance` for quiet sources).
     * @returns {PannerNode} The panner, unconnected.
     */
    createPanner(at, options = {}) {
        const panner = this.#context.createPanner();
        Object.assign(panner, PANNER, options);
        this.place(panner, at);
        return panner;
    }

    /**
     * Moves a panner.
     *
     * @param {PannerNode} panner Panner to move.
     * @param {{ x: number, y?: number, z: number }} at World position.
     */
    place(panner, at) {
        const y = at.y ?? 0.8;
        if (panner.positionX) {
            const now = this.#context.currentTime;
            // Within 5 cm the panner stays put: static sources cost nothing per frame.
            glide(panner.positionX, at.x, now, 0.02, 0.05);
            glide(panner.positionY, y, now, 0.02, 0.05);
            glide(panner.positionZ, at.z, now, 0.02, 0.05);
        }
        else {
            panner.setPosition(at.x, y, at.z);
        }
    }

    /**
     * Plays a one-shot sound.
     *
     * @param {keyof typeof SOUNDS} name Sound name.
     * @param {{ at?: { x: number, y?: number, z: number }|null, gain?: number, rate?: number, delay?: number }} [options]
     *   Where it happens (unpositioned when omitted), extra linear gain, playback-rate factor, seconds to wait.
     * @returns {boolean} Whether a voice started.
     */
    play(name, { at = null, gain = 1, rate = 1, delay = 0 } = {}) {
        const spec = SOUNDS[name];
        const context = this.#context;
        if (!spec || !context || this.#paused || gain <= 0) return false;
        // Fast replays thin out the small sounds instead of piling them up.
        if (spec.minor && this.#speed > 2.5 && Math.random() > 2.5 / this.#speed) return false;
        const choices = spec.files.filter((path) => this.#buffers.has(path));
        if (!choices.length) return false;
        const previous = this.#last.get(name);
        const pool = choices.length > 1 ? choices.filter((path) => path !== previous) : choices;
        const path = pool[Math.floor(Math.random() * pool.length)];
        this.#last.set(name, path);
        const sound = this.#buffers.get(path);

        const source = context.createBufferSource();
        source.buffer = sound.buffer;
        const spread = spec.spread ?? 1;
        const speedRate = Math.min(1.2, Math.max(0.85, this.#speed ** 0.12));
        source.playbackRate.value = rate * speedRate * 2 ** (((Math.random() * 2 - 1) * spread) / 12);
        const amp = context.createGain();
        amp.gain.value = sound.gain * dbToGain(spec.level + (Math.random() * 2 - 1) * 1.2) * gain;
        source.connect(amp);
        if (at) amp.connect(this.createPanner(at)).connect(this.#buses.sfx);
        else amp.connect(this.#buses.sfx);
        const start = context.currentTime + Math.max(0, delay);
        source.start(start, sound.offset);

        const voice = { name, source, amp, start };
        source.onended = () => {
            const index = this.#voices.indexOf(voice);
            if (index >= 0) this.#voices.splice(index, 1);
            amp.disconnect();
        };
        this.#voices.push(voice);
        const same = this.#voices.filter((other) => other.name === name);
        if (same.length > (spec.voices ?? 4)) this.#release(same[0]);
        if (this.#voices.length > MAX_VOICES) this.#release(this.#voices[0]);
        return true;
    }

    /** Fades a voice out quickly and stops it. */
    #release(voice, seconds = 0.06) {
        const index = this.#voices.indexOf(voice);
        if (index >= 0) this.#voices.splice(index, 1);
        const now = this.#context.currentTime;
        voice.amp.gain.cancelScheduledValues(now);
        voice.amp.gain.setTargetAtTime(0, now, seconds / 3);
        try {
            voice.source.stop(Math.max(now, voice.start) + seconds);
        }
        catch {
            // Already stopped.
        }
    }

    /** Cuts every one-shot that is still sounding (a seek). */
    stopVoices() {
        if (!this.#context) return;
        [...this.#voices].forEach((voice) => this.#release(voice));
    }

    /**
     * Lowers the music under a big moment and brings it back.
     *
     * @param {number} [depth] Music gain at the bottom of the dip.
     * @param {number} [hold] Seconds before it recovers.
     */
    duck(depth = 0.5, hold = 0.5) {
        if (!this.#context) return;
        const param = this.#buses.duck.gain;
        const now = this.#context.currentTime;
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.setTargetAtTime(Math.min(param.value, depth), now, 0.03);
        param.setTargetAtTime(1, now + hold, 0.7);
    }

    /**
     * Per-frame mix state.
     *
     * @param {{ camera: import('three').Camera, paused: boolean, speed: number, volume: number }} state The camera the
     *   listener follows, whether the replay is paused, its speed, and the effects slider (0 to 1).
     */
    update({ camera, paused, speed, volume }) {
        const context = this.#context;
        if (!context) return;
        const now = context.currentTime;
        const { sfx, ambience, sfxGate, ambienceGate, muffle } = this.#buses;
        this.#speed = Math.max(0.1, Number(speed) || 1);
        const level = Math.max(0, Math.min(1, Number(volume) || 0));
        glide(sfx.gain, level, now, 0.05);
        glide(ambience.gain, level * AMBIENCE_LEVEL, now, 0.05);
        if (paused !== this.#paused) {
            this.#paused = paused;
            // Pausing silences the blows in flight and muffles the arena around them, as if the world held its breath.
            sfxGate.gain.setTargetAtTime(paused ? 0 : 1, now, paused ? 0.04 : 0.02);
            ambienceGate.gain.setTargetAtTime(paused ? 0.5 : 1, now, 0.25);
            muffle.frequency.setTargetAtTime(paused ? 700 : 20000, now, 0.25);
            if (paused) [...this.#voices].forEach((voice) => this.#release(voice, 0.2));
        }
        // The listener follows the camera at up to 20 Hz; its 30 ms glide covers the gaps.
        if (camera && now - this.#listenerPlacedAt >= LISTENER_INTERVAL) {
            this.#listenerPlacedAt = now;
            this.#placeListener(camera);
        }
    }

    /**
     * The listener hovers above the ground point the camera looks at, facing the camera's horizontal heading, so
     * sounds pan with the view as it rotates and nearer fights read louder.
     */
    #placeListener(camera) {
        const elements = camera.matrixWorld.elements;
        // Camera looks down its local -Z.
        const dx = -elements[8];
        const dy = -elements[9];
        const dz = -elements[10];
        const cx = elements[12];
        const cy = elements[13];
        const cz = elements[14];
        const reach = dy < -0.05 ? -cy / dy : 30;
        const fx = cx + dx * reach;
        const fz = cz + dz * reach;
        const x = fx + (cx - fx) * LISTENER_HEIGHT_SHARE;
        const y = cy * LISTENER_HEIGHT_SHARE;
        const z = fz + (cz - fz) * LISTENER_HEIGHT_SHARE;
        this.#listenerAt = { x, y, z };
        let hx = dx;
        let hz = dz;
        const flat = Math.hypot(hx, hz);
        if (flat < 1e-3) {
            // Straight down: the screen's up direction is the heading.
            hx = elements[4];
            hz = elements[6];
        }
        const norm = Math.hypot(hx, hz) || 1;
        const listener = this.#context.listener;
        const now = this.#context.currentTime;
        if (listener.positionX) {
            glide(listener.positionX, x, now, 0.03, 0.05);
            glide(listener.positionY, y, now, 0.03, 0.05);
            glide(listener.positionZ, z, now, 0.03, 0.05);
            glide(listener.forwardX, hx / norm, now, 0.03, 0.01);
            glide(listener.forwardY, 0, now, 0.03, 0.01);
            glide(listener.forwardZ, hz / norm, now, 0.03, 0.01);
            glide(listener.upX, 0, now, 0.03, 0.01);
            glide(listener.upY, 1, now, 0.03, 0.01);
            glide(listener.upZ, 0, now, 0.03, 0.01);
        }
        else {
            listener.setPosition(x, y, z);
            listener.setOrientation(hx / norm, 0, hz / norm, 0, 1, 0);
        }
    }

    /**
     * Creates a named legacy track (HTML audio, outside the mix).
     *
     * @param {keyof typeof AUDIO_PATHS|string} name Audio asset name.
     * @param {{ loop?: boolean, volume?: number }} [options] Track options.
     * @returns {AudioTrack} Audio adapter.
     */
    create(name, options = {}) {
        const source = AUDIO_PATHS[name];
        const track = new AudioTrack(source ?? '', options);
        this.#tracks.add(track);
        return track;
    }

    /**
     * Diagnostics: the level on a bus right now (an analyser is attached on first use only).
     *
     * @param {'master'|'music'|'sfx'|'ambience'} name Bus to read.
     * @returns {{ peak: number, rms: number }|null} Peak and RMS of the last ~40 ms in dBFS.
     */
    meter(name) {
        if (!this.#context || !this.#taps?.[name]) return null;
        let analyser = this.#meters.get(name);
        if (!analyser) {
            analyser = this.#context.createAnalyser();
            analyser.fftSize = 2048;
            this.#taps[name].connect(analyser);
            this.#meters.set(name, analyser);
        }
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let peak = 0;
        let sum = 0;
        for (const value of data) {
            peak = Math.max(peak, Math.abs(value));
            sum += value * value;
        }
        const db = (value) => (value > 0 ? 20 * Math.log10(value) : -Infinity);
        return { peak: db(peak), rms: db(Math.sqrt(sum / data.length)) };
    }

    /** @returns {{ state: string, voices: number }} Diagnostics. */
    get status() {
        return { state: this.#context?.state ?? 'unavailable', voices: this.#voices.length };
    }

    /** Stops and releases every voice, track and the audio context. */
    destroy() {
        this.#tracks.forEach((track) => track.destroy());
        this.#tracks.clear();
        this.#unlocked.clear();
        if (this.#unlock) ['pointerdown', 'keydown', 'touchend'].forEach((type) => window.removeEventListener(type, this.#unlock, { capture: true }));
        this.#voices = [];
        this.#context?.close().catch(() => {});
        this.#context = null;
    }
}
