/** @param {unknown} value @returns {number} */
function serverTime(value) {
    return new Date(String(value ?? '').replace(' ', 'T')).getTime();
}

/**
 * Whether a post is read under the reader's marker. `markAllRead` writes a server timestamp; a feed
 * read that started before that write can still carry `read: false`, so the marker wins. The
 * optimistic flag covers the moment between the click and the API answer. A post published after
 * the marker stays unread (its NOVA ribbon is correct).
 *
 * @param {{ read?: boolean, time?: string }} post
 * @param {string|null} [readAt] The `readAt` returned by `POST /news/read`.
 * @param {boolean} [optimistic] The local mark-all preview is active.
 * @returns {boolean}
 */
export function postIsRead(post, readAt = null, optimistic = false) {
    if (optimistic || post?.read) return true;
    if (!readAt) return false;
    const marker = serverTime(readAt);
    const time = serverTime(post?.time);
    return Number.isFinite(marker) && Number.isFinite(time) && time <= marker;
}
