import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from './error.js';

const MAX_PICTURE_BYTES = 1024 * 1024;
const SIGNATURES = {
    png: [0x89, 0x50, 0x4e, 0x47],
    jpeg: [0xff, 0xd8, 0xff],
    webp: [0x52, 0x49, 0x46, 0x46],
};

/** @returns {string} Folder of the profile pictures, served by the web service at `/profpics/`. */
export function picturesDir() {
    return process.env.PROFPICS_DIR || '/data/profpics';
}

/**
 * Stores a cropped profile picture sent as a data URL and returns the URL to save in the profile.
 *
 * @param {string} folder The account's file name (`usuarios.pasta`).
 * @param {string} dataUrl `data:image/png|jpeg|webp;base64,...`, at most 1 MB.
 * @returns {Promise<string>} `/profpics/<folder>.<png|jpg|webp>?v=<time>` (the version busts browser caches).
 * @throws {CustomError} 400 `INVALID_PICTURE` for anything that is not a small PNG, JPEG or WebP image.
 */
export async function saveProfilePicture(folder, dataUrl) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
    if (!match || !/^[A-Za-z0-9_-]{1,50}$/.test(folder)) throw new CustomError(400, 'Invalid picture.', 'INVALID_PICTURE');

    const bytes = Buffer.from(match[2], 'base64');
    const signature = SIGNATURES[match[1]];
    if (bytes.length > MAX_PICTURE_BYTES || !signature.every((byte, index) => bytes[index] === byte)) {
        throw new CustomError(400, 'Invalid picture.', 'INVALID_PICTURE');
    }

    const file = `${folder}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
    await mkdir(picturesDir(), { recursive: true });
    await writeFile(path.join(picturesDir(), file), bytes);
    return `/profpics/${file}?v=${Date.now()}`;
}
