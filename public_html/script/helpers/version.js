/**
 * The next site version for a kind of change: major (0), minor (1) or patch (2).
 *
 * @param {Array<string|number>} version Current version numbers.
 * @param {number} kind Index of the changed number.
 * @returns {string}
 */
export function nextVersion(version, kind) {
    const [major, minor, patch = 0] = version.map(Number);
    if (kind === 0) return [major + 1, 0].join('.');
    if (kind === 1) return [major, minor + 1].join('.');
    return [major, minor, patch + 1].join('.');
}
