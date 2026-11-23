/**
 * Applies a theme choice as a preview, saves it and rolls the preview back when the save is refused.
 * The caller keeps the returned token to offer “Desfazer” after a confirmed save.
 *
 * @param {object} options
 * @param {string} options.choice
 * @param {string|null} options.previous Last choice the API confirmed.
 * @param {() => string} options.fallback Reads the cached choice when nothing was confirmed yet.
 * @param {(choice: string) => void} options.apply Applies a theme choice immediately.
 * @param {(field: string, value: string) => Promise<{ token: object, user: object, superseded?: boolean }>} options.save
 * @param {() => boolean} [options.isCurrent] Tells an older request whether its preview still owns the theme.
 * @returns {Promise<{ status: 'saved'|'superseded'|'failed', previous: string, token?: object, error?: Error }>}
 */
export async function previewTheme({ choice, previous, fallback, apply, save, isCurrent = () => true }) {
    const base = previous ?? fallback();
    apply(choice);
    try {
        const saved = await save('theme', choice);
        return { status: saved.superseded ? 'superseded' : 'saved', previous: base, token: saved.token };
    }
    catch (error) {
        if (isCurrent()) apply(base);
        return { status: 'failed', previous: base, error };
    }
}
