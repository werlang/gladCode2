// Auth wall check
fetch('check_auth.php').then(res => res.json()).then(data => {
    if (data.status === 'FORBIDDEN') {
        location.href = '/';
    }
});

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Copy text to clipboard with fallback for non-HTTPS contexts
async function copyToClipboard(text, label = 'Text') {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for non-secure HTTP / legacy browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        showToast(`${label} copied to clipboard`, 'success');
    } catch (err) {
        showToast(`Failed to copy ${label}`, 'error');
    }
}

// Format date safely for all browsers (handles "YYYY-MM-DD HH:MM:SS" on WebKit/Safari)
function formatDateString(dateStr) {
    if (!dateStr) return 'Recently';
    try {
        const normalized = dateStr.replace(' ', 'T');
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
    } catch (e) {
        return dateStr;
    }
}

// Tab navigation handler
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
    });
});

// Toggle bootstrap create tournament panel
document.getElementById('toggleCreatePanel')?.addEventListener('click', () => {
    const card = document.getElementById('createSection');
    if (card) {
        card.classList.toggle('open');
        if (card.classList.contains('open')) {
            document.getElementById('name')?.focus();
        }
    }
});

// Create tournament form submission
document.getElementById('createForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const params = new URLSearchParams(formData);

    const resultDiv = document.getElementById('createResult');
    const loadingDiv = document.getElementById('createLoading');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch(`bootstrap_tournament.php?${params}`);
        const data = await response.json();

        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';

        if (data.status === 'SUCCESS') {
            resultDiv.className = 'result-box success';
            resultDiv.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 8px;">✅ ${data.message}</div>
                <div class="meta-grid" style="margin-bottom: 12px;">
                    <div class="meta-item"><span class="meta-label">Tournament</span><span class="meta-value">${data.tournament_name}</span></div>
                    <div class="meta-item"><span class="meta-label">Teams</span><span class="meta-value">${data.total_teams}</span></div>
                    <div class="meta-item"><span class="meta-label">Gladiators</span><span class="meta-value">${data.total_gladiators}</span></div>
                    <div class="meta-item"><span class="meta-label">Manager</span><span class="meta-value">${data.manager}</span></div>
                    <div class="meta-item" style="grid-column: 1 / -1;"><span class="meta-label">Cleanup Token</span><span class="meta-value"><code>${data.cleanup_token}</code></span></div>
                </div>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            showToast('Test tournament created successfully!', 'success');
            setTimeout(() => loadTournaments(), 1000);
        } else {
            resultDiv.className = 'result-box error';
            resultDiv.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 8px;">❌ Creation Failed</div>
                <p>${data.message}</p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            showToast(data.message || 'Creation error', 'error');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.className = 'result-box error';
        resultDiv.innerHTML = `<div style="font-weight: 700;">❌ Network Error</div><p>${error.message}</p>`;
        showToast(error.message, 'error');
    }
});

// Load test tournaments
async function loadTournaments() {
    const listDiv = document.getElementById('tournamentList');
    const loadingDiv = document.getElementById('listLoading');
    const refreshBtn = document.getElementById('refreshTestTournaments');
    
    if (refreshBtn) refreshBtn.querySelector('svg')?.classList.add('icon-spin');

    listDiv.innerHTML = '';
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch('list_tournaments.php');
        const data = await response.json();

        loadingDiv.style.display = 'none';
        if (refreshBtn) refreshBtn.querySelector('svg')?.classList.remove('icon-spin');

        if (data.status === 'SUCCESS') {
            if (data.tournaments.length === 0) {
                listDiv.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px;"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        <p style="font-weight: 600; margin-bottom: 4px;">No Test Tournaments Found</p>
                        <p style="font-size: 0.82rem;">Click "Bootstrap New" above to generate a test bracket.</p>
                    </div>
                `;
            } else {
                listDiv.innerHTML = data.tournaments.map(t => `
                    <div class="tournament-card">
                        <div class="tournament-card-header">
                            <div>
                                <h3>${t.name}</h3>
                                <span class="text-dim text-sm">Created ${formatDateString(t.created_at)}</span>
                            </div>
                            <span class="badge ${t.started ? 'started' : 'not-started'}">
                                ${t.started ? 'Started' : 'Not Started'}
                            </span>
                        </div>

                        <div class="meta-grid">
                            <div class="meta-item">
                                <span class="meta-label">ID</span>
                                <span class="meta-value">#${t.id}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Teams</span>
                                <span class="meta-value">${t.teams} / ${t.max_teams}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Gladiators</span>
                                <span class="meta-value">${t.gladiators}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Manager</span>
                                <span class="meta-value">${t.manager}</span>
                            </div>
                            ${t.cleanup_token ? `
                            <div class="meta-item" style="grid-column: 1 / -1;">
                                <span class="meta-label">Cleanup Token</span>
                                <div class="meta-value-copy">
                                    <code>${t.cleanup_token}</code>
                                    <button class="copy-btn" data-copy="${t.cleanup_token}" data-label="Cleanup Token" title="Copy Token">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        ${t.cleanup_token ? `
                        <div class="card-actions">
                            ${t.started && t.hash ? `
                                <button class="btn btn-secondary" data-action="reset" data-token="${t.cleanup_token}" data-name="${t.name}" data-hash="${t.hash}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                    Reset Round
                                </button>
                                <a href="../tourn/${t.hash}/0" target="_blank" class="btn btn-secondary">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    View
                                </a>
                            ` : ''}
                            <button class="btn btn-secondary" data-action="export-id" data-id="${t.id}" data-name="${t.name}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export
                            </button>
                            <button class="btn btn-danger" data-action="cleanup" data-token="${t.cleanup_token}" data-name="${t.name}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Cleanup
                            </button>
                        </div>
                        ` : `
                        <div class="text-danger text-sm">⚠️ No cleanup token found. Tournament requires manual DB cleanup.</div>
                        `}
                    </div>
                `).join('');
            }
        } else {
            listDiv.innerHTML = `<p class="text-danger">${data.message}</p>`;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        if (refreshBtn) refreshBtn.querySelector('svg')?.classList.remove('icon-spin');
        listDiv.innerHTML = `<p class="text-danger">Error loading tournaments: ${error.message}</p>`;
    }
}

// Cleanup tournament
async function cleanupTournament(token, name) {
    if (!confirm(`Are you sure you want to delete test tournament "${name}" and purge all its data?`)) {
        return;
    }

    try {
        const response = await fetch(`cleanup_tournament.php?token=${token}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            showToast(`Cleanup successful: ${name}`, 'success');
            loadTournaments();
        } else {
            showToast(`Cleanup error: ${data.message}`, 'error');
        }
    } catch (error) {
        showToast(`Cleanup error: ${error.message}`, 'error');
    }
}

// Show reset round dialog for test tournament
async function showResetDialog(token, name, hash) {
    try {
        const response = await fetch(`list_tournaments.php`);
        const data = await response.json();

        const tournament = data.tournaments?.find(t => t.cleanup_token === token);

        if (!tournament || !tournament.started) {
            showToast('Tournament has not been started yet.', 'error');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('data-dialog', 'reset-tournament');

        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <div class="modal-title text-main">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        Reset Tournament Round
                    </div>
                    <button class="copy-btn" data-action="close-dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <div class="modal-body">
                    <p>Reset tournament <strong>${name}</strong> to a specific battle round.</p>
                    <div class="alert alert-warning" style="margin-bottom: 0;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div>This deletes all battle logs after the selected round and revives fallen gladiators from subsequent rounds.</div>
                    </div>
                    <div class="form-group">
                        <label for="resetRound">Target Round Number</label>
                        <input type="number" id="resetRound" min="1" value="1">
                        <small>Round 1 = Initial bracket state</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-action="close-dialog">Cancel</button>
                    <button class="btn btn-primary" data-action="confirm-reset" data-token="${token}" data-name="${name}">Execute Reset</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Reset tournament to specific round
async function resetTournament(token, name, round) {
    round = parseInt(round);

    if (!round || round < 1) {
        showToast('Please enter a valid round number (1 or greater)', 'error');
        return;
    }

    if (!confirm(`Reset "${name}" to round ${round}?\n\n- Deletes rounds after ${round}\n- Revives gladiators\n- Clears battle logs`)) {
        return;
    }

    document.querySelector('.modal-overlay')?.remove();

    try {
        const response = await fetch(`reset_tournament.php?token=${token}&round=${round}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            showToast(`Tournament reset to round ${round}`, 'success');
            loadTournaments();

            if (confirm('Would you like to open the tournament view now?')) {
                window.open(data.round_url, '_blank');
            }
        } else {
            showToast(`Error: ${data.message}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Pagination state for production tournaments
let realCurrentPage = 1;
const realPageSize = 6;

// Load real production tournaments
async function loadRealTournaments(page = 1) {
    const listDiv = document.getElementById('realTournamentList');
    const loadingDiv = document.getElementById('realListLoading');
    const paginationDiv = document.getElementById('realPagination');
    const refreshBtn = document.getElementById('refreshRealTournaments');

    if (refreshBtn) refreshBtn.querySelector('svg')?.classList.add('icon-spin');

    listDiv.innerHTML = '';
    loadingDiv.style.display = 'block';
    paginationDiv.style.display = 'none';

    try {
        const response = await fetch(`list_real_tournaments.php?page=${page}&limit=${realPageSize}`);
        const data = await response.json();

        loadingDiv.style.display = 'none';
        if (refreshBtn) refreshBtn.querySelector('svg')?.classList.remove('icon-spin');

        if (data.status === 'SUCCESS') {
            if (!data.tournaments || data.tournaments.length === 0) {
                listDiv.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
                        <p style="font-weight: 600;">No Production Tournaments Found</p>
                    </div>
                `;
            } else {
                listDiv.innerHTML = data.tournaments.map(t => `
                    <div class="tournament-card">
                        <div class="tournament-card-header">
                            <div>
                                <h3>${t.name}</h3>
                                <span class="text-dim text-sm">Created ${formatDateString(t.creation)}</span>
                            </div>
                            <span class="badge ${t.started ? 'started' : 'not-started'}">
                                ${t.started ? 'Started' : 'Not Started'}
                            </span>
                        </div>

                        <div class="meta-grid">
                            <div class="meta-item">
                                <span class="meta-label">ID</span>
                                <span class="meta-value">#${t.id}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Teams</span>
                                <span class="meta-value">${t.team_count} / ${t.max_teams}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Gladiators</span>
                                <span class="meta-value">${t.gladiator_count}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Current Round</span>
                                <span class="meta-value">${t.max_round || 'Not started'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Manager</span>
                                <span class="meta-value">${t.manager}</span>
                            </div>
                            ${t.hash ? `
                            <div class="meta-item">
                                <span class="meta-label">Hash</span>
                                <div class="meta-value-copy">
                                    <code>${t.hash.substring(0, 10)}...</code>
                                    <button class="copy-btn" data-copy="${t.hash}" data-label="Tournament Hash" title="Copy Hash">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <div class="card-actions">
                            ${t.started ? `
                                <button class="btn btn-danger" data-action="reset-real" data-hash="${t.hash}" data-name="${t.name}" data-round="${t.max_round || 1}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                    Reset Round
                                </button>
                                <a href="../tourn/${t.hash}/0" target="_blank" class="btn btn-secondary">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    View
                                </a>
                                <button class="btn btn-secondary" data-action="export-hash" data-hash="${t.hash}" data-name="${t.name}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Export
                                </button>
                            ` : `
                                <button class="btn btn-secondary" data-action="export-id" data-id="${t.id}" data-name="${t.name}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Export
                                </button>
                            `}
                        </div>
                    </div>
                `).join('');
            }

            if (data.pagination) {
                realCurrentPage = data.pagination.page;
                updateRealPagination(data.pagination);
            }
        } else {
            listDiv.innerHTML = `<p class="text-danger">${data.message}</p>`;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        if (refreshBtn) refreshBtn.querySelector('svg')?.classList.remove('icon-spin');
        listDiv.innerHTML = `<p class="text-danger">❌ Error: ${error.message}</p>`;
    }
}

// Update pagination controls
function updateRealPagination(pagination) {
    const paginationDiv = document.getElementById('realPagination');
    const prevBtn = document.getElementById('realPrevPage');
    const nextBtn = document.getElementById('realNextPage');
    const pageInfo = document.getElementById('realPageInfo');

    if (pagination.total_pages > 1) {
        paginationDiv.style.display = 'flex';
        pageInfo.textContent = `Page ${pagination.page} of ${pagination.total_pages} (${pagination.total} total)`;

        prevBtn.disabled = !pagination.has_prev;
        nextBtn.disabled = !pagination.has_next;
    } else {
        paginationDiv.style.display = 'none';
    }
}

function changeRealPage(delta) {
    const newPage = realCurrentPage + delta;
    loadRealTournaments(newPage);
}

// Dialog for resetting production tournaments
function showRealResetDialog(hash, name, currentRound) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-dialog', 'reset-real-tournament');

    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <div class="modal-title text-danger">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Reset Production Tournament
                </div>
                <button class="copy-btn" data-action="close-dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="modal-body">
                <p><strong>Tournament:</strong> ${name}</p>
                <p><strong>Current Max Round:</strong> ${currentRound}</p>
                
                <div class="alert alert-warning" style="margin-bottom: 0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div><strong>PRODUCTION WARNING:</strong> This operation directly modifies live tournament database records.</div>
                </div>
                
                <div class="form-group">
                    <label for="realResetRound">Target Round Number (1 to ${currentRound})</label>
                    <input type="number" id="realResetRound" min="1" max="${currentRound}" value="${currentRound}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-action="close-dialog">Cancel</button>
                <button class="btn btn-danger" data-action="confirm-reset-real" data-hash="${hash}" data-name="${name}">Reset Live Tournament</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

// Execute real tournament reset
async function resetRealTournament(hash, name, round) {
    round = parseInt(round);

    if (!round || round < 1) {
        showToast('Please enter a valid round number', 'error');
        return;
    }

    if (!confirm(`FINAL CONFIRMATION!\n\nReset PRODUCTION tournament "${name}" to round ${round}?\n\nThis CANNOT be undone!\n\nType YES in the next prompt to confirm.`)) {
        return;
    }

    const confirmation = prompt('Type YES to confirm reset:');
    if (confirmation !== 'YES') {
        showToast('Reset cancelled', 'info');
        return;
    }

    document.querySelector('.modal-overlay')?.remove();

    try {
        const response = await fetch(`reset_tournament.php?hash=${hash}&round=${round}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            showToast(`Production tournament reset to round ${round}`, 'success');
            loadRealTournaments();

            if (confirm('Would you like to open the tournament view now?')) {
                window.open(data.round_url, '_blank');
            }
        } else {
            showToast(`Error: ${data.message}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Dynamic field display for Export Form
function toggleExportFields() {
    const type = document.getElementById('exportType').value;
    document.getElementById('exportIdField').style.display = type === 'id' ? 'block' : 'none';
    document.getElementById('exportHashField').style.display = type === 'hash' ? 'block' : 'none';
    document.getElementById('exportTokenField').style.display = type === 'token' ? 'block' : 'none';
}

function exportTournamentById(id, name) {
    if (confirm(`Export tournament "${name}" (ID: ${id})?`)) {
        window.location.href = `export_tournament.php?id=${id}`;
        showToast('Export download started', 'success');
    }
}

function exportTournamentByHash(hash, name) {
    if (confirm(`Export tournament "${name}"?`)) {
        window.location.href = `export_tournament.php?hash=${hash}`;
        showToast('Export download started', 'success');
    }
}

// Export Form Handler
document.getElementById('exportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('exportType').value;
    let param = '';

    if (type === 'id') {
        const id = document.getElementById('exportId').value;
        if (!id) {
            showToast('Please enter a tournament ID', 'error');
            return;
        }
        param = `id=${id}`;
    } else if (type === 'hash') {
        const hash = document.getElementById('exportHash').value;
        if (!hash) {
            showToast('Please enter a tournament hash', 'error');
            return;
        }
        param = `hash=${hash}`;
    } else if (type === 'token') {
        const token = document.getElementById('exportToken').value;
        if (!token) {
            showToast('Please enter a cleanup token', 'error');
            return;
        }
        param = `token=${token}`;
    }

    window.location.href = `export_tournament.php?${param}`;

    const resultDiv = document.getElementById('exportResult');
    resultDiv.style.display = 'block';
    resultDiv.className = 'result-box success';
    resultDiv.innerHTML = '<div style="font-weight: 700;">✅ Export Initiated</div><p>Your JSON download should begin shortly.</p>';
    showToast('Export payload generating...', 'info');

    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 4000);
});

// Import Mode Toggle Handler
function toggleImportMode() {
    const mode = document.getElementById('importMode').value;
    const tournamentIdField = document.getElementById('importTournamentIdField');
    const helpText = document.getElementById('importModeHelp');

    if (mode === 'update') {
        tournamentIdField.style.display = 'block';
        helpText.textContent = 'Replaces all data in the existing tournament (teams, gladiators, groups, logs)';
        helpText.className = 'text-danger';
    } else {
        tournamentIdField.style.display = 'none';
        helpText.textContent = 'Creates a brand new tournament with fresh ID';
        helpText.className = 'text-muted';
    }
}

// File dropzone visual feedback
const dropzoneInput = document.getElementById('importFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');

if (dropzoneInput) {
    dropzoneInput.addEventListener('change', () => {
        if (dropzoneInput.files && dropzoneInput.files[0]) {
            fileNameDisplay.textContent = dropzoneInput.files[0].name;
            fileNameDisplay.style.color = '#10b981';
            fileNameDisplay.style.fontWeight = '600';
        }
    });
}

// Import Form Handler
document.getElementById('importForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const mode = formData.get('mode');

    if (mode === 'update') {
        const tournamentId = formData.get('tournament_id');
        if (!tournamentId) {
            showToast('Please enter a tournament ID for update mode', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to UPDATE tournament #${tournamentId}?\n\nThis will DELETE all existing teams, gladiators, groups, and logs, then import new records.`)) {
            return;
        }
    }

    const resultDiv = document.getElementById('importResult');
    const loadingDiv = document.getElementById('importLoading');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch('import_tournament.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';

        if (data.status === 'SUCCESS') {
            resultDiv.className = 'result-box success';
            resultDiv.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 8px;">✅ ${data.message}</div>
                <div class="meta-grid" style="margin-bottom: 12px;">
                    <div class="meta-item"><span class="meta-label">Execution Mode</span><span class="meta-value">${data.mode.toUpperCase()}</span></div>
                    <div class="meta-item"><span class="meta-label">Tournament ID</span><span class="meta-value">#${data.tournament_id}</span></div>
                    <div class="meta-item" style="grid-column: 1 / -1;"><span class="meta-label">Tournament Name</span><span class="meta-value">${data.tournament_name}</span></div>
                </div>
                <div style="font-weight: 600; margin-bottom: 4px;">Import Summary:</div>
                <ul style="padding-left: 18px;">
                    ${data.summary.map(s => `<li>${s}</li>`).join('')}
                </ul>
            `;
            showToast('Import operation completed successfully', 'success');

            setTimeout(() => {
                loadTournaments();
                loadRealTournaments();
            }, 1000);
        } else {
            resultDiv.className = 'result-box error';
            resultDiv.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 8px;">❌ Import Error</div>
                <p>${data.message}</p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            showToast(data.message, 'error');
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.className = 'result-box error';
        resultDiv.innerHTML = `<div style="font-weight: 700;">❌ Network Error</div><p>${error.message}</p>`;
        showToast(error.message, 'error');
    }
});

// DOM Initializers & Event Delegation
document.addEventListener('DOMContentLoaded', () => {
    loadTournaments();
    loadRealTournaments();

    document.getElementById('refreshTestTournaments')?.addEventListener('click', loadTournaments);
    document.getElementById('refreshRealTournaments')?.addEventListener('click', () => loadRealTournaments());

    document.getElementById('realPrevPage')?.addEventListener('click', () => changeRealPage(-1));
    document.getElementById('realNextPage')?.addEventListener('click', () => changeRealPage(1));

    document.getElementById('exportType')?.addEventListener('change', toggleExportFields);
    document.getElementById('importMode')?.addEventListener('change', toggleImportMode);
});

// Event Delegation for dynamically generated elements
document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Copy buttons
    const copyBtn = target.closest('[data-copy]');
    if (copyBtn) {
        copyToClipboard(copyBtn.dataset.copy, copyBtn.dataset.label || 'Value');
        return;
    }

    // Actions
    if (target.closest('[data-action="cleanup"]')) {
        const button = target.closest('[data-action="cleanup"]');
        cleanupTournament(button.dataset.token, button.dataset.name);
    }
    
    if (target.closest('[data-action="reset"]')) {
        const button = target.closest('[data-action="reset"]');
        showResetDialog(button.dataset.token, button.dataset.name, button.dataset.hash);
    }
    
    if (target.closest('[data-action="reset-real"]')) {
        const button = target.closest('[data-action="reset-real"]');
        showRealResetDialog(button.dataset.hash, button.dataset.name, parseInt(button.dataset.round));
    }
    
    if (target.closest('[data-action="export-id"]')) {
        const button = target.closest('[data-action="export-id"]');
        exportTournamentById(button.dataset.id, button.dataset.name);
    }
    
    if (target.closest('[data-action="export-hash"]')) {
        const button = target.closest('[data-action="export-hash"]');
        exportTournamentByHash(button.dataset.hash, button.dataset.name);
    }
    
    if (target.closest('[data-action="close-dialog"]')) {
        target.closest('[data-dialog]')?.remove();
    }
    
    if (target.closest('[data-action="confirm-reset"]')) {
        const button = target.closest('[data-action="confirm-reset"]');
        const roundInput = document.getElementById('resetRound');
        if (roundInput) {
            resetTournament(button.dataset.token, button.dataset.name, roundInput.value);
        }
    }
    
    if (target.closest('[data-action="confirm-reset-real"]')) {
        const button = target.closest('[data-action="confirm-reset-real"]');
        const roundInput = document.getElementById('realResetRound');
        if (roundInput) {
            resetRealTournament(button.dataset.hash, button.dataset.name, roundInput.value);
        }
    }
});

// Close dialog when clicking backdrop
document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('modal-overlay')) {
        e.target.remove();
    }
});
