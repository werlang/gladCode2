// Applies the theme before the page paints. Loaded as a plain blocking script from the head
// partial (web/view/head.html), ahead of every stylesheet that reads the tokens, so a page never
// flashes the wrong theme. The choice is the master's (cached by helpers/theme.js under
// `gladcode-theme`, LocalData format); without one, the system colour scheme decides.
(() => {
    let choice = 'system';
    try {
        const stored = JSON.parse(localStorage.getItem('gladcode-theme') || 'null');
        if (stored && ['arena', 'classic'].includes(stored.data)) choice = stored.data;
    }
    catch {
        // unreadable storage: follow the system
    }
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const theme = choice === 'system' ? (dark ? 'arena' : 'classic') : choice;
    document.documentElement.classList.add(`theme-${theme}`);
})();
