/** Textures several parts of the arena use (the Ancient Empire atlases), loaded once and kept until `disposeSharedTextures`. */
const shared = new Map();

/**
 * Loads an image texture for the renderer. Where the browser can, the image is decoded and flipped into an
 * `ImageBitmap` off the main thread, so sending it to the GPU later is a plain copy; through the plain image path
 * the upload converts every pixel on the main thread at first use, which was seconds of stalls as a battle began.
 * Falls back to `TextureLoader` where `createImageBitmap` (or its options) is unavailable.
 *
 * @param {typeof import('three')} THREE Three namespace.
 * @param {string} url Image URL.
 * @param {{ srgb?: boolean, repeat?: boolean, anisotropy?: number, share?: boolean }} [options] Colour image (sRGB),
 *   tiling, anisotropic filtering, and whether to share one texture between every caller of the same URL (shared
 *   textures are flagged `userData.shared`; their owners must not dispose them).
 * @returns {Promise<import('three').Texture>} The texture; rejects when the image cannot be loaded.
 */
export function loadTexture(THREE, url, { srgb = true, repeat = false, anisotropy = 1, share = false } = {}) {
    const key = `${url}|${srgb}|${repeat}|${anisotropy}`;
    if (share && shared.has(key)) return shared.get(key);
    const promise = decode(THREE, url).then((texture) => {
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        if (repeat) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        }
        texture.anisotropy = anisotropy;
        texture.userData.shared = share;
        texture.needsUpdate = true;
        return texture;
    });
    if (share) {
        shared.set(key, promise);
        // A failed load is not cached, so a later caller can try again.
        promise.catch(() => shared.delete(key));
    }
    return promise;
}

/** Releases every shared texture (the renderer is going away). */
export function disposeSharedTextures() {
    shared.forEach((promise) => promise.then((texture) => texture.dispose(), () => {}));
    shared.clear();
}

async function decode(THREE, url) {
    if (typeof createImageBitmap === 'function') {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${response.status} ${url}`);
            // Flipped here (ImageBitmaps ignore the GL unpack flip), straight alpha, colours untouched: the same
            // pixels the plain image path would upload.
            const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
            const texture = new THREE.Texture(bitmap);
            texture.flipY = false;
            return texture;
        }
        catch (error) {
            // A missing file is final; a browser that refused the bitmap options falls through to the plain path.
            if (String(error.message).includes(url)) throw error;
        }
    }
    return new THREE.TextureLoader().loadAsync(url);
}
