/** Ranking section and its table/own-strip markup (css/profile-ranking.css). */

export const rankingShellTemplate = `
<div class='ranking-page'>
    <div id='ranking-header'></div>
    <div id='ranking-own'></div>
    <div class='ranking-toolbar'>
        <div class='ranking-tabs-wrap'>
            <div id='ranking-tabs'></div>
            <button type='button' id='ranking-remove' class='ranking-list-remove' aria-label='Remover lista' title='Remover lista' hidden></button>
            <button type='button' id='ranking-add' class='ranking-list-add' aria-label='Nova lista' title='Nova lista'>{{{plus}}}</button>
        </div>
        <ol id='ranking-podium' class='ranking-podium' aria-label='Pódio do ranking'></ol>
    </div>
    <section class='ranking-card surface-card'>
        <div id='ranking-table-host'></div>
        <div id='ranking-custom-host' class='ranking-custom' hidden></div>
        <footer class='ranking-footer'>
            <span id='ranking-status' class='ranking-status' aria-live='polite'></span>
            <div id='ranking-pager' class='ranking-pager'></div>
        </footer>
    </section>
</div>`;

export const rankingTableTemplate = `
<div class='ranking-table'>
    <div class='ranking-context'>
        <span class='ranking-context-text'></span>
        <button type='button' class='ranking-top'>{{{up}}}<span>Voltar ao topo</span></button>
    </div>
    <div class='ranking-scroll' tabindex='0' role='region' aria-label='Tabela de ranking'>
        <table class='ranking-grid'>
            <thead>
                <tr>
                    <th scope='col' class='ranking-position'>POS.</th>
                    <th scope='col'>GLADIADOR</th>
                    <th scope='col'>MESTRE</th>
                    <th scope='col' class='ranking-trend'>7 DIAS</th>
                    <th scope='col' class='ranking-mmr'>RENOME</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
</div>`;

export const rankingRowTemplate = `
<tr class='ranking-row {{mine}}'>
    <td class='ranking-position'>{{position}}</td>
    <td class='ranking-gladiator'><span class='ranking-name'>{{gladiator}}</span>{{{you}}}</td>
    <td class='ranking-master'>{{master}}</td>
    <td class='ranking-trend {{trendClass}}' title='{{trendLabel}}' aria-label='{{trendLabel}}'>{{{trend}}}</td>
    <td class='ranking-mmr'>{{mmr}}</td>
</tr>`;

export const rankingEmptyTemplate = `
<tr class='ranking-row ranking-empty'>
    <td colspan='5'>Nenhum gladiador nesta classificação.</td>
</tr>`;

export const ownGladiatorTemplate = `
<section class='own-gladiator-jump' aria-label='Seus gladiadores no ranking'>
    <span class='own-gladiator-label'>SEUS<br>GLADIADORES</span>
    <div class='own-gladiator-list'></div>
</section>`;

export const ownGladiatorChipTemplate = `
<button type='button' class='own-gladiator-chip' data-state='{{state}}' aria-label='{{label}}' title='{{label}}'>
    <span class='own-gladiator-portrait' aria-hidden='true'></span>
    <span class='own-gladiator-copy'>
        <span class='own-gladiator-name'>{{name}}</span>
        <span class='own-gladiator-state'>{{stateText}}</span>
    </span>
    <span class='own-gladiator-arrow' aria-hidden='true'>{{{arrow}}}</span>
</button>`;

export const podiumTemplate = `{{{items}}}`;

export const podiumItemTemplate = `
<li class='ranking-podium-item' data-place='{{place}}'>
    <span class='ranking-podium-rank'>{{place}}</span>
    <span class='ranking-podium-name'>{{name}}</span>
    <span class='ranking-podium-mmr'>{{mmr}}</span>
</li>`;

export const customRankingTemplate = `
<div class='ranking-custom-table'>
    <div class='ranking-context'>
        <span class='ranking-context-text'></span>
    </div>
    <div class='ranking-scroll' tabindex='0' role='region' aria-label='Tabela de ranking'>
        <table class='ranking-grid ranking-grid--masters'>
            <thead>
                <tr>
                    <th scope='col' class='ranking-position'>POS.</th>
                    <th scope='col'>MESTRE</th>
                    <th scope='col' class='ranking-mmr'>PONTOS</th>
                    <th scope='col' class='ranking-mmr'>TEMPO</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
</div>`;

export const customRankingRowTemplate = `
<tr class='ranking-row {{mine}}'>
    <td class='ranking-position'>{{position}}</td>
    <td class='ranking-gladiator'>{{nick}}</td>
    <td class='ranking-mmr'>{{score}}</td>
    <td class='ranking-mmr'>{{time}}s</td>
</tr>`;
