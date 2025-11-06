// Auth wall
fetch('check_auth.php').then(res => res.json()).then(data => {
    if (data.status === 'FORBIDDEN') {
        location.href = '/'
    }
});

// Create tournament
document.getElementById('createForm').addEventListener('submit', async (e) => {
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
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                        <h3>✅ ${data.message}</h3>
                        <p><strong>Tournament:</strong> ${data.tournament_name}</p>
                        <p><strong>Teams:</strong> ${data.total_teams}</p>
                        <p><strong>Gladiators:</strong> ${data.total_gladiators}</p>
                        <p><strong>Manager:</strong> ${data.manager}</p>
                        <p><strong>Cleanup Token:</strong> <code>${data.cleanup_token}</code></p>
                        <p><strong>Instructions:</strong></p>
                        <ul>
                            ${data.instructions.map(i => `<li>${i}</li>`).join('')}
                        </ul>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    `;

            // Refresh tournament list
            setTimeout(() => loadTournaments(), 1000);
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = `
                        <h3>❌ Error</h3>
                        <p>${data.message}</p>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    `;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `
                    <h3>❌ Error</h3>
                    <p>${error.message}</p>
                `;
    }
});

// Load tournaments
async function loadTournaments() {
    const listDiv = document.getElementById('tournamentList');
    const loadingDiv = document.getElementById('listLoading');

    listDiv.innerHTML = '';
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch('list_tournaments.php');
        const data = await response.json();

        loadingDiv.style.display = 'none';

        if (data.status === 'SUCCESS') {
            if (data.tournaments.length === 0) {
                listDiv.innerHTML = '<p>No test tournaments found. Create one above!</p>';
            } else {
                listDiv.innerHTML = data.tournaments.map(t => `
                            <div class="tournament-card">
                                <h3>${t.name} <span class="badge ${t.started ? 'started' : 'not-started'}">${t.started ? 'Started' : 'Not Started'}</span></h3>
                                <div class="info">
                                    <div class="info-item"><strong>ID:</strong> ${t.id}</div>
                                    <div class="info-item"><strong>Manager:</strong> ${t.manager}</div>
                                    <div class="info-item"><strong>Teams:</strong> ${t.teams}/${t.max_teams}</div>
                                    <div class="info-item"><strong>Gladiators:</strong> ${t.gladiators}</div>
                                    <div class="info-item"><strong>Created:</strong> ${t.created_at}</div>
                                </div>
                                ${t.cleanup_token ? `
                                <div class="actions">
                                    ${t.started && t.hash ? `
                                        <button class="btn btn-secondary" data-action="reset" data-token="${t.cleanup_token}" data-name="${t.name}" data-hash="${t.hash}">🔄 Reset Round</button>
                                        <a href="../tourn/${t.hash}/0" target="_blank" class="btn btn-secondary">👁️ View Tournament</a>
                                    ` : ''}
                                    <button class="btn btn-secondary" data-action="export-id" data-id="${t.id}" data-name="${t.name}">📥 Export</button>
                                    <button class="btn btn-danger" data-action="cleanup" data-token="${t.cleanup_token}" data-name="${t.name}">🗑️ Cleanup</button>
                                </div>
                                ` : `
                                <p style="color: #dc3545; font-size: 14px;">⚠️ No cleanup token found. Tournament may need manual cleanup.</p>
                                `}
                            </div>
                        `).join('');
            }
        } else {
            listDiv.innerHTML = `<p style="color: #dc3545;">${data.message}</p>`;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        listDiv.innerHTML = `<p style="color: #dc3545;">Error loading tournaments: ${error.message}</p>`;
    }
}

// Cleanup tournament
async function cleanupTournament(token, name) {
    if (!confirm(`Are you sure you want to delete "${name}" and all its data?`)) {
        return;
    }

    try {
        const response = await fetch(`cleanup_tournament.php?token=${token}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            alert(`✅ ${data.message}\n\n${data.summary.join('\n')}`);
            loadTournaments();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Show reset round dialog
async function showResetDialog(token, name, hash) {
    // First, get current tournament info to know max round
    try {
        const response = await fetch(`list_tournaments.php`);
        const data = await response.json();

        const tournament = data.tournaments.find(t => t.cleanup_token === token);

        if (!tournament || !tournament.started) {
            alert('Tournament has not been started yet.');
            return;
        }

        // Create dialog
        const dialog = document.createElement('div');
        dialog.setAttribute('data-dialog', 'reset-tournament');
        dialog.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                `;

        dialog.innerHTML = `
                    <div style="background: white; border-radius: 10px; padding: 30px; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                        <h2 style="margin-bottom: 20px; color: #667eea;">🔄 Reset Tournament Round</h2>
                        <p style="margin-bottom: 20px;">Reset tournament <strong>${name}</strong> to a specific round.</p>
                        <p style="margin-bottom: 20px; color: #dc3545; font-size: 14px;">
                            ⚠️ This will delete all rounds after the selected round and reset that round to its initial state.
                        </p>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Reset to Round:</label>
                            <input type="number" id="resetRound" min="1" value="1" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px;">
                            <small style="display: block; margin-top: 5px; color: #666;">Enter the round number to reset to (round 1 = tournament start)</small>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button data-action="close-dialog" style="padding: 10px 20px; border: 2px solid #ddd; background: white; border-radius: 5px; cursor: pointer; font-weight: 600;">Cancel</button>
                            <button data-action="confirm-reset" data-token="${token}" data-name="${name}" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 5px; cursor: pointer; font-weight: 600;">Reset</button>
                        </div>
                    </div>
                `;

        document.body.appendChild(dialog);

    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Reset tournament to specific round
async function resetTournament(token, name, round) {
    round = parseInt(round);

    if (!round || round < 1) {
        alert('Please enter a valid round number (1 or greater)');
        return;
    }

    if (!confirm(`Reset "${name}" to round ${round}?\n\nThis will:\n- Delete all rounds after round ${round}\n- Reset round ${round} to initial state\n- Revive gladiators that died in/after round ${round}\n- Delete all battle logs\n\nThis cannot be undone!`)) {
        return;
    }

    // Close dialog
    document.querySelector('div[style*="fixed"]')?.remove();

    try {
        const response = await fetch(`reset_tournament.php?token=${token}&round=${round}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            alert(`✅ ${data.message}\n\n${data.summary.join('\n')}\n\nYou can now continue from round ${round}.`);
            loadTournaments();

            // Offer to open the tournament
            if (confirm('Would you like to view the tournament now?')) {
                window.open(data.round_url, '_blank');
            }
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Load tournaments on page load
loadTournaments();

// Real tournaments pagination state
let realCurrentPage = 1;
const realPageSize = 5;

loadRealTournaments();

// Setup event listeners for static elements
document.addEventListener('DOMContentLoaded', () => {
    // Refresh buttons
    document.getElementById('refreshTestTournaments')?.addEventListener('click', loadTournaments);
    document.getElementById('refreshRealTournaments')?.addEventListener('click', () => loadRealTournaments());
    
    // Pagination buttons
    document.getElementById('realPrevPage')?.addEventListener('click', () => changeRealPage(-1));
    document.getElementById('realNextPage')?.addEventListener('click', () => changeRealPage(1));
    
    // Export type selector
    document.getElementById('exportType')?.addEventListener('change', toggleExportFields);
    
    // Import mode selector
    document.getElementById('importMode')?.addEventListener('change', toggleImportMode);
});

// Event delegation for dynamically generated tournament cards
document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Handle cleanup tournament button
    if (target.closest('[data-action="cleanup"]')) {
        const button = target.closest('[data-action="cleanup"]');
        const token = button.dataset.token;
        const name = button.dataset.name;
        cleanupTournament(token, name);
    }
    
    // Handle reset tournament button (test tournaments)
    if (target.closest('[data-action="reset"]')) {
        const button = target.closest('[data-action="reset"]');
        const token = button.dataset.token;
        const name = button.dataset.name;
        const hash = button.dataset.hash;
        showResetDialog(token, name, hash);
    }
    
    // Handle reset real tournament button
    if (target.closest('[data-action="reset-real"]')) {
        const button = target.closest('[data-action="reset-real"]');
        const hash = button.dataset.hash;
        const name = button.dataset.name;
        const currentRound = parseInt(button.dataset.round);
        showRealResetDialog(hash, name, currentRound);
    }
    
    // Handle export by ID button
    if (target.closest('[data-action="export-id"]')) {
        const button = target.closest('[data-action="export-id"]');
        const id = button.dataset.id;
        const name = button.dataset.name;
        exportTournamentById(id, name);
    }
    
    // Handle export by hash button
    if (target.closest('[data-action="export-hash"]')) {
        const button = target.closest('[data-action="export-hash"]');
        const hash = button.dataset.hash;
        const name = button.dataset.name;
        exportTournamentByHash(hash, name);
    }
    
    // Handle dialog cancel buttons
    if (target.closest('[data-action="close-dialog"]')) {
        target.closest('[data-dialog]')?.remove();
    }
    
    // Handle dialog reset buttons
    if (target.closest('[data-action="confirm-reset"]')) {
        const button = target.closest('[data-action="confirm-reset"]');
        const token = button.dataset.token;
        const name = button.dataset.name;
        const roundInput = document.getElementById('resetRound');
        if (roundInput) {
            resetTournament(token, name, roundInput.value);
        }
    }
    
    // Handle real tournament reset confirmation
    if (target.closest('[data-action="confirm-reset-real"]')) {
        const button = target.closest('[data-action="confirm-reset-real"]');
        const hash = button.dataset.hash;
        const name = button.dataset.name;
        const roundInput = document.getElementById('realResetRound');
        if (roundInput) {
            resetRealTournament(hash, name, roundInput.value);
        }
    }
});

// Close dialog on background click
document.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-dialog')) {
        e.target.remove();
    }
});


// Load real tournaments
async function loadRealTournaments(page = 1) {
    const listDiv = document.getElementById('realTournamentList');
    const loadingDiv = document.getElementById('realListLoading');
    const paginationDiv = document.getElementById('realPagination');

    listDiv.innerHTML = '';
    loadingDiv.style.display = 'block';
    paginationDiv.style.display = 'none';

    try {
        const response = await fetch(`list_real_tournaments.php?page=${page}&limit=${realPageSize}`);
        const data = await response.json();

        loadingDiv.style.display = 'none';

        if (data.status === 'SUCCESS') {
            if (data.tournaments.length === 0) {
                listDiv.innerHTML = '<p>No production tournaments found.</p>';
            } else {
                listDiv.innerHTML = data.tournaments.map(t => `
                            <div class="tournament-card">
                                <h3>${t.name} <span class="badge ${t.started ? 'started' : 'not-started'}">${t.started ? 'Started' : 'Not Started'}</span></h3>
                                <div class="info">
                                    <div class="info-item"><strong>ID:</strong> ${t.id}</div>
                                    <div class="info-item"><strong>Manager:</strong> ${t.manager}</div>
                                    <div class="info-item"><strong>Teams:</strong> ${t.team_count}/${t.max_teams}</div>
                                    <div class="info-item"><strong>Gladiators:</strong> ${t.gladiator_count}</div>
                                    <div class="info-item"><strong>Current Round:</strong> ${t.max_round || 'Not started'}</div>
                                    <div class="info-item"><strong>Created:</strong> ${new Date(t.creation).toLocaleString()}</div>
                                    ${t.hash ? `<div class="info-item"><strong>Hash:</strong> <code>${t.hash}</code></div>` : ''}
                                </div>
                                ${t.started ? `
                                <div class="actions">
                                    <button class="btn btn-secondary" data-action="reset-real" data-hash="${t.hash}" data-name="${t.name}" data-round="${t.max_round || 1}">🔄 Reset Round</button>
                                    <a href="../tourn/${t.hash}/0" target="_blank" class="btn btn-secondary">👁️ View Tournament</a>
                                    <button class="btn btn-secondary" data-action="export-hash" data-hash="${t.hash}" data-name="${t.name}">📥 Export</button>
                                </div>
                                ` : `
                                <div class="actions">
                                    <button class="btn btn-secondary" data-action="export-id" data-id="${t.id}" data-name="${t.name}">📥 Export</button>
                                </div>
                                `}
                            </div>
                        `).join('');
            }

            // Update pagination
            if (data.pagination) {
                realCurrentPage = data.pagination.page;
                updateRealPagination(data.pagination);
            }
        } else {
            listDiv.innerHTML = `<p style="color: #dc3545;">${data.message}</p>`;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        listDiv.innerHTML = `<p style="color: #dc3545;">❌ Error: ${error.message}</p>`;
    }
}

// Update pagination controls
function updateRealPagination(pagination) {
    const paginationDiv = document.getElementById('realPagination');
    const prevBtn = document.getElementById('realPrevPage');
    const nextBtn = document.getElementById('realNextPage');
    const pageInfo = document.getElementById('realPageInfo');

    if (pagination.total_pages > 1) {
        paginationDiv.style.display = 'block';
        pageInfo.textContent = `Page ${pagination.page} of ${pagination.total_pages} (${pagination.total} total)`;

        prevBtn.disabled = !pagination.has_prev;
        nextBtn.disabled = !pagination.has_next;
    } else {
        paginationDiv.style.display = 'none';
    }
}

// Change page
function changeRealPage(delta) {
    const newPage = realCurrentPage + delta;
    loadRealTournaments(newPage);
}

// Show reset dialog for real tournaments
function showRealResetDialog(hash, name, currentRound) {
    const dialog = document.createElement('div');
    dialog.setAttribute('data-dialog', 'reset-real-tournament');
    dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

    dialog.innerHTML = `
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    max-width: 500px;
                    width: 90%;
                ">
                    <h2 style="margin-bottom: 20px; color: #dc3545;">⚠️ Reset Production Tournament</h2>
                    <p style="margin-bottom: 20px;"><strong>Tournament:</strong> ${name}</p>
                    <p style="margin-bottom: 20px; color: #666;">Current Round: ${currentRound}</p>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <strong>⚠️ Warning:</strong> This is a PRODUCTION tournament! Make sure you really want to reset it.
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px;">Reset to Round:</label>
                        <input type="number" id="realResetRound" min="1" max="${currentRound}" value="${currentRound}" 
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px;">
                        <small style="display: block; margin-top: 5px; color: #666;">
                            Enter the round number to reset to (1-${currentRound})
                        </small>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button data-action="close-dialog" 
                                style="padding: 10px 20px; border: none; background: #6c757d; color: white; border-radius: 5px; cursor: pointer;">
                            Cancel
                        </button>
                        <button data-action="confirm-reset-real" data-hash="${hash}" data-name="${name}" 
                                style="padding: 10px 20px; border: none; background: #dc3545; color: white; border-radius: 5px; cursor: pointer; font-weight: 600;">
                            Reset Tournament
                        </button>
                    </div>
                </div>
            `;

    document.body.appendChild(dialog);
}

// Reset real tournament
async function resetRealTournament(hash, name, round) {
    round = parseInt(round);

    if (!round || round < 1) {
        alert('Please enter a valid round number (1 or greater)');
        return;
    }

    if (!confirm(`FINAL CONFIRMATION!\n\nReset PRODUCTION tournament "${name}" to round ${round}?\n\nThis will:\n- Delete all rounds after round ${round}\n- Reset round ${round} to initial state\n- Revive gladiators that died in/after round ${round}\n- Delete all battle logs\n\nThis CANNOT be undone!\n\nType YES in the next prompt to confirm.`)) {
        return;
    }

    const confirmation = prompt('Type YES to confirm reset:');
    if (confirmation !== 'YES') {
        alert('Reset cancelled.');
        return;
    }

    // Close dialog
    document.querySelector('div[style*="fixed"]')?.remove();

    try {
        const response = await fetch(`reset_tournament.php?hash=${hash}&round=${round}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            alert(`✅ ${data.message}\n\nType: ${data.tournament_type}\n\n${data.summary.join('\n')}\n\nYou can now continue from round ${round}.`);
            loadRealTournaments();

            // Offer to open the tournament
            if (confirm('Would you like to view the tournament now?')) {
                window.open(data.round_url, '_blank');
            }
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Toggle export fields based on type
function toggleExportFields() {
    const type = document.getElementById('exportType').value;
    document.getElementById('exportIdField').style.display = type === 'id' ? 'block' : 'none';
    document.getElementById('exportHashField').style.display = type === 'hash' ? 'block' : 'none';
    document.getElementById('exportTokenField').style.display = type === 'token' ? 'block' : 'none';
}

// Quick export from tournament card
function exportTournamentById(id, name) {
    if (confirm(`Export tournament "${name}" (ID: ${id})?`)) {
        window.location.href = `export_tournament.php?id=${id}`;
    }
}

function exportTournamentByHash(hash, name) {
    if (confirm(`Export tournament "${name}"?`)) {
        window.location.href = `export_tournament.php?hash=${hash}`;
    }
}

// Export tournament
document.getElementById('exportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('exportType').value;
    let param = '';

    if (type === 'id') {
        const id = document.getElementById('exportId').value;
        if (!id) {
            alert('Please enter a tournament ID');
            return;
        }
        param = `id=${id}`;
    } else if (type === 'hash') {
        const hash = document.getElementById('exportHash').value;
        if (!hash) {
            alert('Please enter a tournament hash');
            return;
        }
        param = `hash=${hash}`;
    } else if (type === 'token') {
        const token = document.getElementById('exportToken').value;
        if (!token) {
            alert('Please enter a cleanup token');
            return;
        }
        param = `token=${token}`;
    }

    // Download export file
    window.location.href = `export_tournament.php?${param}`;

    // Show success message
    const resultDiv = document.getElementById('exportResult');
    resultDiv.style.display = 'block';
    resultDiv.className = 'result success';
    resultDiv.innerHTML = '<h3>✅ Export started</h3><p>Your download should begin shortly.</p>';

    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 3000);
});

// Toggle import mode fields
function toggleImportMode() {
    const mode = document.getElementById('importMode').value;
    const tournamentIdField = document.getElementById('importTournamentIdField');
    const helpText = document.getElementById('importModeHelp');

    if (mode === 'update') {
        tournamentIdField.style.display = 'block';
        helpText.textContent = 'Replaces all data in the existing tournament (teams, gladiators, groups, logs)';
    } else {
        tournamentIdField.style.display = 'none';
        helpText.textContent = 'Creates a new tournament with new ID';
    }
}

// Import tournament
document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const mode = formData.get('mode');

    // Validate tournament ID if update mode
    if (mode === 'update') {
        const tournamentId = formData.get('tournament_id');
        if (!tournamentId) {
            alert('Please enter a tournament ID for update mode');
            return;
        }

        if (!confirm(`Are you sure you want to UPDATE tournament ${tournamentId}?\n\nThis will DELETE all existing teams, gladiators, groups, and logs, then import the new data.\n\nThis cannot be undone!`)) {
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
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                        <h3>✅ ${data.message}</h3>
                        <p><strong>Mode:</strong> ${data.mode.toUpperCase()}</p>
                        <p><strong>Tournament ID:</strong> ${data.tournament_id}</p>
                        <p><strong>Tournament Name:</strong> ${data.tournament_name}</p>
                        <h4>Summary:</h4>
                        <ul>
                            ${data.summary.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    `;

            // Refresh tournament lists
            setTimeout(() => {
                loadTournaments();
                loadRealTournaments();
            }, 1000);
        } else {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = `
                        <h3>❌ Error</h3>
                        <p>${data.message}</p>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    `;
        }
    } catch (error) {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.className = 'result error';
        resultDiv.innerHTML = `
                    <h3>❌ Error</h3>
                    <p>${error.message}</p>
                `;
    }
});
