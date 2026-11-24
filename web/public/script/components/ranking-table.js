import { BaseComponent } from './base-component.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { icon } from '../templates/icons.js';
import {
    rankingEmptyTemplate,
    rankingRowTemplate,
    rankingTableTemplate,
} from '../templates/ranking.js';

/** A renown delta as "9", "12.5" or "−3". */
function delta(value) {
    return Math.abs(Number(value) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** The visible trend and its accessible label. */
function trend(change) {
    const value = Number(change) || 0;
    if (value > 0) return { kind: 'is-up', symbol: '▲', text: `subiu ${delta(value)}` };
    if (value < 0) return { kind: 'is-down', symbol: '▼', text: `desceu ${delta(value)}` };
    return { kind: 'is-flat', symbol: '–', text: 'estável' };
}

/**
 * The ranking table and its context strip (docs/frontend/components.md). It renders data only;
 * the section owns every request.
 */
export class RankingTable extends BaseComponent {
    #rows = [];
    #byPosition = new Map();
    #timer = null;
    #revealTimer = null;

    /**
     * @param {{ element?: HTMLElement }} [options]
     */
    constructor({ element } = {}) {
        super(element ?? createElement(renderTemplate(rankingTableTemplate, {
            up: icon('chevron', { size: 15, className: 'icon ranking-up-icon' }),
        })));
        this.element.querySelector('.ranking-top').addEventListener('click', () => {
            globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
            this.emit('top', {});
        });
    }

    /**
     * @param {Array<Record<string, any>>} rows Rows from the window or the paged list. Each may carry
     *   `mine` to mark the signed-in master's row.
     * @returns {this}
     */
    setRows(rows = []) {
        this.#rows = Array.isArray(rows) ? rows : [];
        this.#byPosition.clear();
        const body = this.element.querySelector('tbody');
        if (!this.#rows.length) {
            body.innerHTML = rankingEmptyTemplate;
            return this;
        }
        body.innerHTML = this.#rows.map(row => {
            const change = trend(row.change7d);
            return renderTemplate(rankingRowTemplate, {
                mine: row.mine ? 'is-mine' : '',
                position: Number(row.position) || '',
                gladiator: row.gladiator ?? '',
                master: row.master ?? '',
                trendClass: change.kind,
                trendLabel: change.text,
                trend: `${change.symbol} ${change.kind === 'is-flat' ? '' : delta(row.change7d)}`.trim(),
                mmr: (Number(row.mmr) || 0).toLocaleString('pt-BR'),
                you: row.mine ? "<span class='ranking-you'>VOCÊ</span>" : '',
            });
        }).join('');
        body.querySelectorAll('.ranking-row').forEach((element, index) => {
            const position = Number(this.#rows[index]?.position);
            if (Number.isInteger(position)) this.#byPosition.set(position, element);
        });
        return this;
    }

    /**
     * @param {{ around?: string|null, position?: number, page?: number, total?: number, pageSize?: number,
     *   label?: string }} context
     * @returns {this}
     */
    setContext({ around = null, position = 0, page = 1, total = 0, pageSize = 10, label = '' } = {}) {
        const text = this.element.querySelector('.ranking-context-text');
        text.replaceChildren();
        if (!total || !this.#rows.length) {
            text.textContent = 'Nenhum gladiador nesta classificação.';
            return this;
        }
        const start = Number(this.#rows[0]?.position) || 1;
        const end = Number(this.#rows[this.#rows.length - 1]?.position) || start;
        const pages = Math.max(1, Math.ceil(total / pageSize));
        const add = value => text.append(document.createTextNode(value));
        if (around) {
            add('Em volta de ');
            const name = document.createElement('strong');
            name.textContent = around;
            text.append(name);
        }
        else if (label) {
            add(label);
        }
        else {
            add('Ranking geral');
        }
        add(' · posições ');
        const range = document.createElement('strong');
        range.className = 'ranking-context-range';
        range.textContent = `${start}–${end}`;
        text.append(range);
        add(` · página ${page} de ${pages}`);
        return this;
    }

    /**
     * Scrolls to a position's row and flashes it; never fetches.
     *
     * @param {number} position
     * @returns {this}
     */
    reveal(position) {
        const row = this.#byPosition.get(Number(position));
        if (!row) return this;
        const scroll = () => {
            if (row.isConnected === false) return;
            row.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        };
        scroll();
        if (this.#revealTimer !== null) clearTimeout(this.#revealTimer);
        // The portrait and the header settle after the first paint; scroll again once their height is final.
        this.#revealTimer = setTimeout(scroll, 180);
        row.classList.add('is-revealed');
        if (this.#timer !== null) clearTimeout(this.#timer);
        this.#timer = setTimeout(() => {
            row.classList.remove('is-revealed');
            this.#timer = null;
        }, 1600);
        return this;
    }

    /** @param {boolean} on @returns {this} */
    setBusy(on) {
        this.element.setAttribute('aria-busy', String(Boolean(on)));
        return this;
    }

    /** Stops the reveal timer when the section leaves. */
    destroy() {
        if (this.#timer !== null) clearTimeout(this.#timer);
        if (this.#revealTimer !== null) clearTimeout(this.#revealTimer);
        this.#timer = null;
        this.#revealTimer = null;
        super.destroy();
    }
}
