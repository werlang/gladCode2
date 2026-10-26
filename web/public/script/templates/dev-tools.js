const ICONS = {
    reset: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>',
    view: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    export: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    remove: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    screen: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
};

/** A tournament card: `{{{actions}}}` holds the action buttons below. */
export const tournamentCardTemplate = `
<div class="tournament-card">
    <div class="tournament-card-header">
        <div>
            <h3>{{name}}</h3>
            <span class="text-dim text-sm">Created {{created}}</span>
        </div>
        <span class="badge {{badgeClass}}">{{badge}}</span>
    </div>
    <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">ID</span><span class="meta-value">#{{id}}</span></div>
        <div class="meta-item"><span class="meta-label">Teams</span><span class="meta-value">{{teams}} / {{maxTeams}}</span></div>
        <div class="meta-item"><span class="meta-label">Gladiators</span><span class="meta-value">{{gladiators}}</span></div>
        <div class="meta-item"><span class="meta-label">Round</span><span class="meta-value">{{round}}</span></div>
        <div class="meta-item"><span class="meta-label">Manager</span><span class="meta-value">{{manager}}</span></div>
        {{{hashItem}}}
    </div>
    <div class="card-actions">{{{actions}}}</div>
</div>`;

export const hashItemTemplate = `
<div class="meta-item">
    <span class="meta-label">Hash</span>
    <div class="meta-value-copy"><code>{{hash}}</code><button class="copy-btn copy" title="Copy hash">${ICONS.copy}</button></div>
</div>`;

export const resetButtonTemplate = `<button class="btn {{style}} reset">${ICONS.reset} Reset Round</button>`;
export const viewLinkTemplate = `<a href="tourn/{{hash}}/0" target="_blank" rel="noopener" class="btn btn-secondary">${ICONS.view} View</a>`;
export const exportButtonTemplate = `<button class="btn btn-secondary export">${ICONS.export} Export</button>`;
export const removeButtonTemplate = `<button class="btn btn-danger remove">${ICONS.remove} Cleanup</button>`;

export const emptyListTemplate = `
<div class="empty-list">
    ${ICONS.screen}
    <p class="empty-title">{{title}}</p>
    <p class="text-sm">{{hint}}</p>
</div>`;

export const createdTemplate = `
<div class="result-title">Tournament "{{name}}" created</div>
<div class="meta-grid">
    <div class="meta-item"><span class="meta-label">ID</span><span class="meta-value">#{{id}}</span></div>
    <div class="meta-item"><span class="meta-label">Teams</span><span class="meta-value">{{teams}}</span></div>
    <div class="meta-item"><span class="meta-label">Gladiators</span><span class="meta-value">{{gladiators}}</span></div>
    <div class="meta-item"><span class="meta-label">Manager</span><span class="meta-value">{{manager}}</span></div>
</div>`;

export const importedTemplate = `
<div class="result-title">Tournament imported</div>
<div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Mode</span><span class="meta-value">{{mode}}</span></div>
    <div class="meta-item"><span class="meta-label">Tournament ID</span><span class="meta-value">#{{id}}</span></div>
    <div class="meta-item full"><span class="meta-label">Name</span><span class="meta-value">{{name}}</span></div>
</div>
<ul class="summary">{{{summary}}}</ul>`;

export const summaryItemTemplate = '<li>{{text}}</li>';

export const errorTemplate = '<div class="result-title">{{title}}</div><p>{{message}}</p>';
