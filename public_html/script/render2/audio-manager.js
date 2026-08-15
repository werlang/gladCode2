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

/**
 * Small HTMLAudioElement adapter that preserves the legacy Phaser audio API.
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
 * Owns music tracks and small effect pools for the Three.js renderer.
 */
export class BattleAudioManager {
    #effects = new Map();
    #tracks = new Set();

    /**
     * Creates a named track.
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
     * Plays a reusable sound effect without cutting off overlapping hits.
     *
     * @param {keyof typeof AUDIO_PATHS|string} name Audio asset name.
     * @param {number} volume Effect volume.
     * @returns {AudioTrack|null} Playing track, or null for unknown assets.
     */
    playEffect(name, volume = 1) {
        if (!AUDIO_PATHS[name] || volume <= 0) {
            return null;
        }

        const pool = this.#effects.get(name) ?? [];
        let track = pool.find((candidate) => !candidate.isPlaying);
        if (!track) {
            track = this.create(name);
            pool.push(track);
            this.#effects.set(name, pool);
        }

        track.stop();
        track.play('', 0, volume);
        return track;
    }

    /** Stops and releases every audio element owned by this manager. */
    destroy() {
        this.#tracks.forEach((track) => track.destroy());
        this.#tracks.clear();
        this.#effects.clear();
    }
}
