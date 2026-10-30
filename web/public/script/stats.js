import { SideMenu } from './components/side-menu.js';
import { Slider } from './components/slider.js';
import { renderTemplate } from './helpers/html.js';
import { PotionModel } from './models/potion.js';
import { StatsModel } from './models/stats.js';
import { emptyStateTemplate } from './templates/empty-state.js';
import {
    abilityRowTemplate,
    attributeCellsTemplate,
    emptyAbilitiesTemplate,
    potionCellTemplate,
    potionRowTemplate,
} from './templates/stats.js';

/** What each row of the gladiator table shows, in table order. */
const ATTRIBUTE_ROWS = ['STR', 'AGI', 'INT', 'lvl'];
/** Potion levels shown as columns. */
const POTION_LEVELS = 5;

const dateStart = document.querySelector('#date-str');
const dateEnd = document.querySelector('#date-end');

/**
 * A percentage with one decimal, or none when it is a round 100.
 *
 * @param {number} value Percentage.
 * @returns {string}
 */
function percent(value) {
    return value === 100 ? value.toFixed(0) : value.toFixed(1);
}

/**
 * Fills the ability table.
 *
 * @param {Record<string, any>} data Statistics.
 */
function renderAbilities(data) {
    const body = document.querySelector('#t-hab tbody');
    const names = Object.keys(data.average);
    body.innerHTML = names.length
        ? names.map(name => renderTemplate(abilityRowTemplate, {
            name,
            use: data.usage[name].toFixed(1),
            average: data.average[name].toFixed(1),
            win: data.winRate[name].toFixed(1),
        })).join('')
        : renderTemplate(emptyAbilitiesTemplate, {
            emptyState: renderTemplate(emptyStateTemplate, {
                variantClass: 'compact', icon: 'chart-simple', title: 'Nenhuma batalha encontrada', summary: '', actionHtml: '',
            }),
        });
}

/**
 * Fills the gladiator table: the share favouring each attribute (and the
 * maximum level) among all gladiators and among winners.
 *
 * @param {Record<string, any>|null} data Statistics, or `null` without battles.
 */
function renderAttributes(data) {
    const rows = document.querySelectorAll('#t-glad tbody tr');
    rows.forEach((row, index) => {
        row.querySelectorAll('td:not(.fixed)').forEach(cell => cell.remove());
        if (!data) {
            row.insertAdjacentHTML('beforeend', '<td colspan=2></td>');
            return;
        }

        const attribute = ATTRIBUTE_ROWS[index];
        const format = value => {
            if (!value) return '-';
            return attribute === 'lvl' ? value.toFixed(1) : `${value.toFixed(1)}%`;
        };
        row.insertAdjacentHTML('beforeend', renderTemplate(attributeCellsTemplate, {
            average: format(data.attributes.avg[attribute]),
            winner: format(data.attributes.winner[attribute]),
        }));
    });
}

/**
 * Fills the potion table: per potion kind and level, how often it was used
 * and how often its user won.
 *
 * @param {Record<string, any>} data Statistics.
 * @param {Record<string, { name: string }>} potions Potion catalogue.
 */
function renderPotions(data, potions) {
    const kinds = new Map();
    Object.entries(potions).forEach(([id, potion]) => {
        const [type, effect, level] = id.split('-');
        const kind = `${type}-${effect}`;
        if (!kinds.has(kind)) {
            // the catalogue name ends with the level ("Poção de cura I")
            kinds.set(kind, { name: potion.name.split(' ').slice(0, -1).join(' '), levels: [] });
        }
        kinds.get(kind).levels[parseInt(level, 10) - 1] = {
            use: data.potions.use[id] ?? 0,
            win: data.potions.win[id] ?? 0,
        };
    });

    document.querySelector('#t-pot tbody').innerHTML = [...kinds.values()].map(({ name, levels }) => {
        const cells = Array.from({ length: POTION_LEVELS }, (_, index) => {
            const level = levels[index];
            if (!level?.use) return '<td>-</td>';
            return renderTemplate(potionCellTemplate, {
                use: percent((level.use / data.potions.battles) * 100),
                win: percent((level.win / level.use) * 100),
            });
        }).join('');
        return renderTemplate(potionRowTemplate, { name, cells });
    }).join('');
}

/**
 * Fills the summary cards: battle count, average duration and a warning when
 * part of the battles predate the newer statistics.
 *
 * @param {Record<string, any>} data Statistics.
 * @param {boolean} empty Whether no battle was found.
 */
function renderSummary(data, empty) {
    const lowBattles = document.querySelector('#single-stats #low-battles');
    document.querySelector('#nbattles').textContent = empty ? '0' : data.battles.total;
    document.querySelector('#avg-time').textContent = !empty && data.duration ? `${data.duration.toFixed(1)}s` : '-';

    const partial = !empty && data.potions.battles < data.battles.total;
    lowBattles.classList.toggle('hidden', !partial);
    if (partial) {
        lowBattles.title = `Somente ${data.potions.battles} batalhas foram encontradas neste intervalo contendo as estatísticas recentemente adicionadas.`;
    }
}

/**
 * Loads the statistics for the chosen period and renown range.
 *
 * @param {Slider} mmr Renown range slider.
 */
async function search(mmr) {
    const [minMmr, maxMmr] = mmr.values;
    const [data, potions] = await Promise.all([
        StatsModel.load({ start: dateStart.value, end: dateEnd.value, minMmr, maxMmr }),
        PotionModel.catalog(),
    ]);
    const empty = Object.keys(data.average).length === 0;

    renderAbilities(data);
    renderAttributes(empty ? null : data);
    renderSummary(data, empty);
    renderPotions(data, potions);
}

const menu = new SideMenu(document.querySelector('#side-menu'));
menu.ready.then(() => {
    const entry = document.querySelector(`#side-menu #${CSS.escape(location.pathname.split('/').at(-1))}`);
    entry?.classList.add('here');
});
document.querySelector('#about')?.classList.add('here');

const mmr = new Slider(document.querySelector('#mmr-slider'), {
    min: 0,
    max: 4000,
    step: 100,
    values: [500, 3500],
    label: String,
    ariaLabel: 'Intervalo de renome',
    onChange: () => search(mmr),
});

[dateStart, dateEnd].forEach(input => input.addEventListener('change', () => search(mmr)));
search(mmr);
