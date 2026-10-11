/** Where the player's graphics choice is kept (per device: the same account plays on a desktop and a phone). */
const STORAGE_KEY = 'gladcode:render2-quality';

/**
 * Graphics tiers of the 3D renderer.
 * - `pixelRatio`: highest render resolution (× CSS pixels); the adaptive resolution works below it.
 * - `msaa`: hardware anti-aliasing (only ever on screens below 1.5 dpr, where it shows).
 * - `crowd`: share of the spectators drawn, multiplied into the crowd setting.
 * - `scenery`: trees, fields, farms and the town beyond the walls (the ground, sky and mountains always show).
 * - `smallBake`: bake the arena floor at 2048 instead of 4096 (a quarter of the memory).
 */
export const QUALITY_TIERS = Object.freeze({
    high: Object.freeze({ pixelRatio: 2, msaa: true, crowd: 1, scenery: true, smallBake: false }),
    medium: Object.freeze({ pixelRatio: 1.5, msaa: false, crowd: 0.6, scenery: true, smallBake: true }),
    low: Object.freeze({ pixelRatio: 1, msaa: false, crowd: 0.3, scenery: false, smallBake: true }),
});

/** Choices offered to the player: automatic plus the tiers. */
export const QUALITY_CHOICES = Object.freeze(['auto', 'high', 'medium', 'low']);

/**
 * Picks the tier for this device: the player's choice when there is one, otherwise from what the browser tells about
 * the hardware. Phones and tablets start low or medium, small desktops medium, the rest high; the adaptive loop in
 * the renderer then trims resolution or detail if frames still run long.
 *
 * @param {string|null} choice Stored choice (`auto`, a tier name, or nothing).
 * @param {{ mobile: boolean, cores: number, memory: number }} device Touch-first device, logical cores, memory in GB.
 * @returns {'high'|'medium'|'low'} Tier name.
 */
export function chooseQuality(choice, { mobile, cores, memory }) {
    if (choice && choice !== 'auto' && QUALITY_TIERS[choice]) return choice;
    if (mobile) return cores <= 4 || memory <= 3 ? 'low' : 'medium';
    if (cores <= 4 || memory <= 4) return 'medium';
    return 'high';
}

/** @returns {{ mobile: boolean, cores: number, memory: number }} What the browser reports about this device. */
export function describeDevice() {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const mobile = coarse || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent ?? '');
    // deviceMemory is Chromium-only and capped at 8; unknown counts as a capable desktop.
    return { mobile, cores: Number(navigator.hardwareConcurrency) || 8, memory: Number(navigator.deviceMemory) || 8 };
}

/** @returns {string} The player's stored choice (`auto` when none, or when storage is unavailable). */
export function storedQuality() {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        return QUALITY_CHOICES.includes(value) ? value : 'auto';
    }
    catch {
        return 'auto';
    }
}

/** @param {string} choice One of `QUALITY_CHOICES`; stored for this device. */
export function storeQuality(choice) {
    try {
        if (QUALITY_CHOICES.includes(choice)) window.localStorage.setItem(STORAGE_KEY, choice);
    }
    catch {
        // Storage can be unavailable (private mode); the automatic tier still applies.
    }
}
