import { glide } from './audio-param.js';

const CROWD = 'res/audio/arena/';
const CROWD_FILES = Object.freeze({
    bed: `${CROWD}crowd_ambience.mp3`,
    chatter: `${CROWD}crowd_chatter.mp3`,
    soft: [`${CROWD}cheer_soft_1.mp3`, `${CROWD}cheer_soft_2.mp3`],
    strong: [`${CROWD}cheer_strong_1.mp3`, `${CROWD}cheer_strong_2.mp3`],
    chant: [`${CROWD}chant.mp3`, `${CROWD}chant_2.mp3`],
});

/** Linear levels on the ambience bus (the crowd files are already mixed loud; impacts must stay on top). */
const LEVELS = Object.freeze({ bed: 0.32, chatter: 0.3, soft: 0.3, strong: 0.45, chant: 0.5, brazier: 0.55, torch: 0.2, burning: 0.9, hiss: 0.09, rumble: 0.14, wind: 0.05 });
/** Seconds the crowd's excitement takes to halve after a moment. */
const EXCITEMENT_HALF_LIFE = 5;
/** The poison gas is loudest when it covers the whole floor: the safe circle has shrunk to nothing. */
const GAS_FULL_RADIUS = 17.7;
/** Synthesised loop lengths in seconds. */
const CRACKLE_SECONDS = 6;
const NOISE_SECONDS = 4;
/** Seconds between updates of the slowly drifting ambience levels (crowd, chatter, gas, wind). */
const LEVEL_INTERVAL = 0.1;

/**
 * Seeded pseudo-random numbers (mulberry32), so the synthesised loops are the same on every load.
 *
 * @param {number} seed Seed.
 * @returns {() => number} Generator of numbers in [0, 1).
 */
export function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Synthesises a seamless loop of burning wood: a low breathing roar under a stream of sharp crackles and the odd
 * resonant pop. Every event wraps around the end and the roar's tail is cross-faded into its head, so the loop has
 * no seam.
 *
 * @param {number} sampleRate Samples per second.
 * @param {number} [seconds] Loop length.
 * @param {() => number} [random] Random source.
 * @returns {Float32Array} Samples peaking at 0.9.
 */
export function crackleSamples(sampleRate, seconds = CRACKLE_SECONDS, random = seededRandom(7)) {
    const length = Math.round(sampleRate * seconds);
    const out = new Float32Array(length);
    // Roar: leaky-integrated (brown) noise with the DC removed, breathing on sines that fit the loop exactly.
    const overlap = Math.round(sampleRate * 0.3);
    const bed = new Float32Array(length + overlap);
    let brown = 0;
    let previous = 0;
    let high = 0;
    for (let i = 0; i < bed.length; i += 1) {
        brown = brown * 0.985 + (random() * 2 - 1) * 0.06;
        high = 0.995 * (high + brown - previous);
        previous = brown;
        bed[i] = high;
    }
    for (let i = 0; i < length; i += 1) {
        const phase = (i / length) * Math.PI * 2;
        const breath = 0.7 + 0.18 * Math.sin(phase * 3) + 0.12 * Math.sin(phase * 7 + 1.3);
        let value = bed[i];
        if (i < overlap) {
            const t = i / overlap;
            value = bed[i] * t + bed[length + i] * (1 - t);
        }
        out[i] = value * breath * 0.5;
    }
    // Crackles: clicks of differentiated noise decaying in a few milliseconds, most small, a few sharp.
    const crackles = Math.round(seconds * 16);
    for (let n = 0; n < crackles; n += 1) {
        const start = Math.floor(random() * length);
        const amp = Math.min(1, 0.08 - Math.log(1 - random() * 0.999) * 0.18);
        const decay = sampleRate * (0.0015 + random() * 0.006);
        const span = Math.round(decay * 5);
        let last = 0;
        for (let k = 0; k < span; k += 1) {
            const white = random() * 2 - 1;
            out[(start + k) % length] += (white - last) * 0.5 * amp * Math.exp(-k / decay);
            last = white;
        }
    }
    // Pops: a knot bursting, a short damped ring.
    const pops = Math.round(seconds * 1.3);
    for (let n = 0; n < pops; n += 1) {
        const start = Math.floor(random() * length);
        const frequency = 500 + random() * 1700;
        const decay = sampleRate * (0.005 + random() * 0.01);
        const amp = 0.25 + random() * 0.45;
        const span = Math.round(decay * 5);
        for (let k = 0; k < span; k += 1) {
            out[(start + k) % length] += Math.sin((2 * Math.PI * frequency * k) / sampleRate) * amp * Math.exp(-k / decay);
        }
    }
    let peak = 0;
    for (const value of out) peak = Math.max(peak, Math.abs(value));
    const scale = peak > 0 ? 0.9 / peak : 1;
    for (let i = 0; i < length; i += 1) out[i] *= scale;
    return out;
}

/**
 * The arena's ambience: the crowd (a murmuring bed, chatter that rises with the excitement, cheers that swell on
 * big moments and a chant for the winner), crackling fires at the braziers and torches and on burning fighters,
 * the hiss of the poison gas growing as the safe circle closes, and a breath of wind. Everything plays on the
 * ambience bus, so it follows the effects volume and muffles while paused.
 */
export class Soundscape {
    #audio;
    #context;
    #out;
    #crackle = null;
    #noise = null;
    #bed = null;
    #chatter = null;
    #crowdGain;
    #chatterGain;
    #density = 1;
    #excitement = 0;
    #swell = null;
    #flames = [];
    #burning = new Map();
    #sinceLevels = Infinity;
    #gas = null;
    #gasLevel = 0;
    #wind = null;
    #time = 0;

    /** @param {import('./audio-manager.js').BattleAudioManager} audio The renderer's sound engine. */
    constructor(audio) {
        this.#audio = audio;
        this.#context = audio.context;
        if (!this.#context) return;
        const context = this.#context;
        this.#out = audio.buses.ambience;
        this.#crowdGain = context.createGain();
        this.#crowdGain.connect(this.#out);
        this.#chatterGain = context.createGain();
        this.#chatterGain.gain.value = 0;
        this.#chatterGain.connect(this.#crowdGain);

        const crackle = context.createBuffer(1, Math.round(context.sampleRate * CRACKLE_SECONDS), context.sampleRate);
        crackle.copyToChannel(crackleSamples(context.sampleRate), 0);
        this.#crackle = crackle;
        const random = seededRandom(11);
        const noise = context.createBuffer(1, Math.round(context.sampleRate * NOISE_SECONDS), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i += 1) samples[i] = random() * 2 - 1;
        this.#noise = noise;
        this.#buildGas();
        this.#buildWind();

        audio.preload([...CROWD_FILES.soft, ...CROWD_FILES.strong, ...CROWD_FILES.chant]);
        audio.load(CROWD_FILES.bed).then((sound) => {
            if (sound && this.#context) this.#bed = new GrainLoop(context, sound.buffer, this.#crowdGain, LEVELS.bed);
        });
        audio.load(CROWD_FILES.chatter).then((sound) => {
            if (sound && this.#context) this.#chatter = new GrainLoop(context, sound.buffer, this.#chatterGain, LEVELS.chatter);
        });
    }

    /** A looping noise source through a filter into a gain on the ambience bus. */
    #filteredNoise(type, frequency, q) {
        const context = this.#context;
        const source = context.createBufferSource();
        source.buffer = this.#noise;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(this.#out);
        source.start(0, Math.random() * NOISE_SECONDS);
        return { source, filter, gain };
    }

    #buildGas() {
        this.#gas = {
            hiss: this.#filteredNoise('bandpass', 2600, 0.7),
            rumble: this.#filteredNoise('lowpass', 140, 0.9),
        };
    }

    #buildWind() {
        this.#wind = this.#filteredNoise('bandpass', 420, 0.8);
    }

    /** A crackle loop at a world position. */
    #fire(at, level, refDistance) {
        const context = this.#context;
        const source = context.createBufferSource();
        source.buffer = this.#crackle;
        source.loop = true;
        source.playbackRate.value = 0.85 + Math.random() * 0.3;
        const gain = context.createGain();
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(level, context.currentTime, 0.4);
        const panner = this.#audio.createPanner(at, { refDistance, rolloffFactor: 1.3 });
        source.connect(gain).connect(panner).connect(this.#out);
        source.start(0, Math.random() * CRACKLE_SECONDS);
        return { source, gain, panner };
    }

    /**
     * Lights the coliseum's fires (once): braziers crackle, torches whisper, incense stays silent.
     *
     * @param {Array<{ x: number, y: number, z: number, size: number }>} flames Flame positions and sizes.
     */
    setFlames(flames) {
        if (!this.#context || this.#flames.length) return;
        for (const flame of flames) {
            if (flame.size < 0.3) continue;
            const brazier = flame.size >= 1;
            this.#flames.push(this.#fire(flame, brazier ? LEVELS.brazier : LEVELS.torch, brazier ? 3 : 1.5));
        }
    }

    /**
     * Keeps a crackle on a burning fighter.
     *
     * @param {string} id Fighter id.
     * @param {{ x: number, z: number }|null} at Where the fighter is, or null when not burning.
     */
    setBurning(id, at) {
        if (!this.#context) return;
        const fire = this.#burning.get(id);
        if (at && !fire) {
            this.#burning.set(id, this.#fire({ x: at.x, y: 0.9, z: at.z }, LEVELS.burning, 8));
        }
        else if (at) {
            this.#audio.place(fire.panner, { x: at.x, y: 0.9, z: at.z });
        }
        else if (fire) {
            this.#burning.delete(id);
            const now = this.#context.currentTime;
            fire.gain.gain.setTargetAtTime(0, now, 0.15);
            fire.source.stop(now + 0.8);
        }
    }

    /** @param {number} density Share of the stands filled (the settings crowd slider), 0 to 1. */
    setCrowd(density) {
        this.#density = Math.max(0, Math.min(1, Number(density) || 0));
    }

    /** @param {number} radius Engine safe radius; the gas grows louder as it closes. */
    setGas(radius) {
        const r = Number(radius);
        const share = Number.isFinite(r) ? Math.max(0, Math.min(1, 1 - r / GAS_FULL_RADIUS)) : 0;
        // Roughly the share of the floor covered: the uncovered disc shrinks with the square of the radius.
        this.#gasLevel = share > 0 ? 1 - (1 - share) ** 2 : 0;
    }

    /**
     * The crowd answers a moment of the fight: excitement for anything, a soft cheer for a good blow or a level,
     * a roar for a kill.
     *
     * @param {number} intensity 0 to 1 (see the renderer's `#rouseCrowd`).
     */
    react(intensity) {
        if (!this.#context || this.#density <= 0) return;
        this.#excitement = Math.min(1, this.#excitement + intensity * 0.7);
        if (intensity < 0.25) return;
        const strong = intensity >= 0.75;
        const now = this.#context.currentTime;
        // A cheer still rising is not cut short by a smaller one.
        if (this.#swell && now < this.#swell.until - 1 && this.#swell.strength >= intensity) return;
        this.#cheer(strong ? CROWD_FILES.strong : CROWD_FILES.soft, strong ? LEVELS.strong : LEVELS.soft * (0.6 + intensity * 0.6), 1.2 + intensity * 3, intensity);
    }

    /** The crowd chants for the winner. */
    victory() {
        if (!this.#context || this.#density <= 0) return;
        this.#excitement = 1;
        this.#cheer(CROWD_FILES.chant, LEVELS.chant, 7, 1.1);
    }

    /** Plays a cheer: a quick swell, a hold, a long fall, on a random file of the set. */
    #cheer(paths, level, hold, strength) {
        const choices = paths.map((path) => this.#audio.sound(path)).filter(Boolean);
        if (!choices.length) return;
        const sound = choices[Math.floor(Math.random() * choices.length)];
        const context = this.#context;
        const now = context.currentTime;
        if (this.#swell) {
            const previous = this.#swell;
            previous.gain.gain.cancelScheduledValues(now);
            previous.gain.gain.setTargetAtTime(0, now, 0.5);
            previous.source.stop(now + 2.5);
        }
        const source = context.createBufferSource();
        source.buffer = sound.buffer;
        source.playbackRate.value = 0.96 + Math.random() * 0.08;
        const gain = context.createGain();
        const peak = level * (0.5 + 0.5 * this.#density);
        const length = Math.min(hold + 0.35, sound.buffer.duration - 2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.35);
        gain.gain.setTargetAtTime(0, now + length, 0.8);
        source.connect(gain).connect(this.#out);
        source.start(now, Math.random() * 0.4);
        source.stop(now + length + 4);
        this.#swell = { source, gain, until: now + length, strength };
    }

    /** Settles the crowd and stops the cheers (a seek). */
    calm() {
        this.#excitement = 0;
        if (this.#swell && this.#context) {
            const now = this.#context.currentTime;
            this.#swell.gain.gain.cancelScheduledValues(now);
            this.#swell.gain.gain.setTargetAtTime(0, now, 0.1);
            this.#swell.source.stop(now + 0.5);
            this.#swell = null;
        }
    }

    /** @param {number} dt Real seconds since the previous frame. */
    update(dt) {
        const context = this.#context;
        if (!context) return;
        this.#time += dt;
        this.#excitement *= 0.5 ** (dt / EXCITEMENT_HALF_LIFE);
        this.#bed?.update();
        this.#chatter?.update();
        // The levels below drift over seconds and glide over 0.3 s or more: re-aimed 10 times a second, not every frame.
        this.#sinceLevels += dt;
        if (this.#sinceLevels < LEVEL_INTERVAL) return;
        this.#sinceLevels = 0;
        const now = context.currentTime;
        const crowd = this.#density > 0 ? 0.35 + 0.65 * this.#density : 0;
        glide(this.#crowdGain.gain, crowd, now, 0.3);
        glide(this.#chatterGain.gain, 0.15 + 0.85 * this.#excitement, now, 0.4, 0.01);

        const t = this.#time;
        const gas = this.#gasLevel * (0.85 + 0.15 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1));
        glide(this.#gas.hiss.gain.gain, gas * LEVELS.hiss, now, 0.3);
        glide(this.#gas.rumble.gain.gain, gas * LEVELS.rumble, now, 0.3);
        glide(this.#gas.hiss.filter.frequency, 2200 + 700 * Math.sin(t * 0.31), now, 0.3, 10);
        // Gusts: the band and the level wander on incommensurate sines.
        const gust = 0.5 + 0.3 * Math.sin(t * 0.13) + 0.2 * Math.sin(t * 0.37 + 2);
        glide(this.#wind.gain.gain, LEVELS.wind * (0.4 + gust), now, 0.5);
        glide(this.#wind.filter.frequency, 300 + 350 * gust, now, 0.5, 5);
    }

    destroy() {
        this.#bed?.stop();
        this.#chatter?.stop();
        this.calm();
        const stop = ({ source }) => {
            try {
                source.stop();
            }
            catch {
                // Already stopped.
            }
        };
        this.#flames.forEach(stop);
        this.#burning.forEach(stop);
        if (this.#gas) Object.values(this.#gas).forEach(stop);
        if (this.#wind) stop(this.#wind);
        this.#context = null;
    }
}

/**
 * Loops a recording without an audible seam or repetition: overlapping grains of 7 to 11 seconds taken from random
 * points of the file, cross-faded with equal-power curves.
 */
class GrainLoop {
    #context;
    #buffer;
    #output;
    #level;
    #next = 0;
    #sources = new Set();
    #stopped = false;

    /**
     * @param {AudioContext} context Audio context.
     * @param {AudioBuffer} buffer Recording to loop.
     * @param {AudioNode} output Destination.
     * @param {number} level Linear gain.
     */
    constructor(context, buffer, output, level) {
        this.#context = context;
        this.#buffer = buffer;
        this.#output = output;
        this.#level = level;
        this.#next = context.currentTime;
    }

    /** Schedules the next grain shortly before it is due. */
    update() {
        const context = this.#context;
        if (this.#stopped || this.#next > context.currentTime + 1) return;
        const fade = 2.5;
        const length = Math.min(this.#buffer.duration - 0.1, 7 + Math.random() * 4);
        const start = Math.max(this.#next, context.currentTime + 0.05);
        const offset = Math.random() * Math.max(0, this.#buffer.duration - length);
        const source = context.createBufferSource();
        source.buffer = this.#buffer;
        const gain = context.createGain();
        const steps = 32;
        const rise = new Float32Array(steps);
        const fall = new Float32Array(steps);
        for (let i = 0; i < steps; i += 1) {
            rise[i] = Math.sin(((i / (steps - 1)) * Math.PI) / 2) * this.#level;
            fall[i] = Math.cos(((i / (steps - 1)) * Math.PI) / 2) * this.#level;
        }
        // A curve may not share its start with another automation event, so the silent start is the plain value.
        gain.gain.value = 0;
        gain.gain.setValueCurveAtTime(rise, start, fade);
        gain.gain.setValueCurveAtTime(fall, start + length - fade, fade);
        source.connect(gain).connect(this.#output);
        source.start(start, offset, length);
        source.onended = () => {
            this.#sources.delete(source);
            gain.disconnect();
        };
        this.#sources.add(source);
        this.#next = start + length - fade;
    }

    stop() {
        this.#stopped = true;
        this.#sources.forEach((source) => {
            try {
                source.stop();
            }
            catch {
                // Already stopped.
            }
        });
    }
}
