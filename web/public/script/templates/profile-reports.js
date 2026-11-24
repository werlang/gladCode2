/** Relatórios section shell (css/profile-reports.css). */
export const reportsShellTemplate = `
<div class='reports-page'>
    <div id='reports-header'></div>
    <section class='reports-card surface-card'>
        <div class='reports-toolbar'>
            <div id='reports-tabs'></div>
            <label class='reports-unread'>
                <span>Só não vistas</span>
                <span id='reports-unread-switch'></span>
            </label>
        </div>
        <div class='reports-scroll'>
            <table class='reports-table'>
                <thead>
                    <tr>
                        <th scope='col'>Resultado</th>
                        <th scope='col'>Gladiador</th>
                        <th scope='col'>Adversários</th>
                        <th scope='col' class='reports-renown-col'>Renome</th>
                        <th scope='col'>Quando</th>
                        <th scope='col'><span class='visually-hidden'>Ações</span></th>
                    </tr>
                </thead>
                <tbody id='reports-body'></tbody>
            </table>
        </div>
        <div class='reports-footer'>
            <div id='reports-pager' class='reports-pager'></div>
        </div>
    </section>
</div>`;

export const reportsSummaryTemplate = `
<div class='reports-summary'>
    <div id='reports-streak'></div>
    <div class='reports-renown'>
        <span>Renome em 7 dias</span>
        <strong id='reports-renown-value'>—</strong>
    </div>
</div>`;

export const reportRowTemplate = `
<tr class='report-row {{unread}}'>
    <td class='report-place'><span class='report-dot' aria-hidden='true'></span><span class='report-pill'></span></td>
    <td class='report-gladiator'></td>
    <td class='report-opponents'></td>
    <td class='report-renown'></td>
    <td class='report-when'></td>
    <td class='report-actions'></td>
</tr>`;

export const reportEmptyTemplate = `<tr class='report-empty'><td colspan='6'>{{{empty}}}</td></tr>`;
