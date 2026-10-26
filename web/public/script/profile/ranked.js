import { showDialog } from '../components/dialog.js';
import { loadGladCards } from '../components/glad-card.js';
import { ProgressButton, Simulation } from '../components/simulation.js';
import { animateValue, fadeIn } from '../helpers/animate.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { api } from '../helpers/request.js';
import { GladiatorModel } from '../models/gladiator.js';
import { MatchModel, NotificationModel } from '../models/social.js';
import { BATTLE_TIPS } from './battle-tips.js';
import { profile, setSilver, xpToNextLevel } from './session.js';
import { afterBattleTemplate, mmrRowTemplate, preBattleExtraTemplate, preBattleTemplate } from '../templates/profile.js';

/** How long each tip stays while the battle runs, in ms. */
const TIP_MS = 10000;
/** Duration of the after-battle counters, in ms. */
const COUNT_MS = 1500;

/** @returns {string} A random tip. */
function randomTip() {
    return BATTLE_TIPS[Math.floor(Math.random() * BATTLE_TIPS.length)];
}

/**
 * Shows the gladiators of the battle with tips while it runs, filling as the
 * button's progress bar does.
 *
 * @param {object[]} glads Every gladiator in the battle.
 * @param {HTMLButtonElement} button The button showing the battle's progress.
 * @returns {() => void} Stops the animation.
 */
function showPreBattle(glads, button) {
    document.querySelectorAll('#fog').forEach(fog => fog.remove());
    const fog = createElement(preBattleTemplate);
    fog.style.display = 'none';
    document.body.append(fog);
    const show = fog.querySelector('#pre-battle-show');
    const tips = fog.querySelector('#tips');
    tips.textContent = randomTip();

    loadGladCards(show.querySelector('.glad-card-container'), { glads, master: false }).then(cards => {
        cards.forEach((card, index) => {
            card.querySelector('.info .glad').insertAdjacentHTML('afterend', renderTemplate(preBattleExtraTemplate, {
                user: glads[index].user,
                mmr: parseInt(glads[index].mmr, 10),
            }));
        });
        fadeIn(fog, undefined, 'flex');
    });

    const progress = fog.querySelector('#progress');
    const started = Date.now();
    let lastTip = started;
    const timer = setInterval(() => {
        const bar = button.querySelector('#bar');
        const ratio = bar ? parseFloat(bar.style.width) / 100 || 0 : 1;
        const size = show.offsetHeight * ratio;
        progress.style.height = `${size}px`;
        progress.style.marginTop = `${-size}px`;
        if (ratio >= 1) clearInterval(timer);
        if (Date.now() - lastTip >= TIP_MS) {
            tips.textContent = randomTip();
            lastTip = Date.now();
        }
    }, 50);
    return () => clearInterval(timer);
}

/**
 * Shows what the battle earned: level, experience, renown and silver
 * counting up, the gladiator's card and links to the replay and the editor.
 *
 * @param {string} hash Battle log hash.
 * @param {{ lvl: number, xp: number, xpTotal: number, silver: number, mmr: number }} before The user and gladiator before the battle.
 */
async function showAfterBattle(hash, before) {
    const fog = createElement(afterBattleTemplate);
    document.body.append(fog);
    const box = fog.querySelector('#after-battle');
    const find = selector => box.querySelector(selector);

    [['#renown-now .svg', 'icon/crown.svg'], ['#silver-now .svg', 'icon/coin.svg']].forEach(async ([selector, icon]) => {
        const svg = await api.get(icon);
        if (typeof svg === 'string') find(selector).innerHTML = svg;
    });
    find('#close').addEventListener('click', () => fog.remove());
    find('#watch').addEventListener('click', () => window.open(`play/${hash}`));

    const data = await NotificationModel.summary(hash);
    find('#lvl .value').textContent = data.lvl;

    let xpGain = data.xp - before.xp;
    if (parseInt(before.lvl, 10) !== parseInt(data.lvl, 10)) {
        find('#lvl #plusone').classList.remove('hidden');
        xpGain = Math.round(parseFloat(data.xp) + before.xpTotal - before.xp);
    }
    const xpTotal = xpToNextLevel(data.lvl);
    find('#xp-total').textContent = Math.trunc(xpTotal);

    animateValue({ from: 0, to: xpGain, duration: COUNT_MS, onStep: value => {
        if (value !== 0) find('#xp-increase').textContent = `(+${Math.trunc(value)})`;
    } });
    animateValue({ from: before.xp, to: data.xp, duration: COUNT_MS, onStep: value => {
        find('#xp-now').textContent = Math.trunc(value);
    } });
    animateValue({ from: (before.xp / before.xpTotal) * 100, to: (data.xp / xpTotal) * 100, duration: COUNT_MS, onStep: value => {
        find('#xp-bar #filled').style.width = `${value}%`;
    } });
    animateValue({ from: 0, to: data.silver - before.silver, duration: COUNT_MS, onStep: value => {
        find('#silver-now .value').textContent = `+${Math.trunc(value)}`;
    } });
    animateValue({ from: before.silver, to: data.silver, duration: COUNT_MS, onStep: value => {
        find('#silver-total').textContent = value.toFixed(0);
    } }).then(() => setSilver(data.silver));

    const mmrGain = parseInt(data.glad.mmr, 10) - parseInt(before.mmr, 10);
    const renown = find('#renown-now .value');
    if (mmrGain > 0) renown.classList.add('green');
    else if (mmrGain < 0) renown.classList.add('red');
    animateValue({ from: 0, to: mmrGain, duration: COUNT_MS, onStep: value => {
        renown.textContent = mmrGain > 0 ? `+${Math.trunc(value)}` : Math.trunc(value);
    } });
    animateValue({ from: before.mmr, to: data.glad.mmr, duration: COUNT_MS, onStep: value => {
        find('#renown-total').textContent = Math.trunc(value);
    } });

    profile.user.level = data.lvl;
    profile.user.xp = data.xp;
    loadGladCards(find('.glad-card-container'), { glads: [data.glad] });
    find('#code').addEventListener('click', () => window.open(`glad-${data.glad.id}`));
}

/**
 * The ranked part of the BATALHAS tab: the user's gladiators with their
 * renown, and the button that finds opponents and runs the battle.
 */
export class RankedBattle {
    #container = document.querySelector('#battle-container #ranked.wrapper .glad-card-container');
    #button = document.querySelector('#battle-container #match-find');
    #selected = null;

    /**
     * @param {() => void} onFought Called when the battle ended.
     */
    constructor(onFought) {
        this.onFought = onFought;
        this.#button.addEventListener('click', () => this.#fight());
    }

    /** Draws the user's gladiators to pick one. */
    async refresh() {
        this.#button.disabled = true;
        this.#selected = null;
        const glads = await GladiatorModel.list();
        this.#container.replaceChildren();
        const cards = await loadGladCards(this.#container, {
            glads,
            onClick: (event, glad) => this.#pick(event.currentTarget, glad),
        });
        cards.forEach((card, index) => {
            card.querySelector('.info .master').insertAdjacentHTML('afterend', renderTemplate(mmrRowTemplate, { mmr: parseInt(glads[index].mmr, 10) }));
        });
    }

    /**
     * @param {HTMLElement} card Clicked card.
     * @param {Record<string, any>} glad Its gladiator.
     */
    async #pick(card, glad) {
        if (card.classList.contains('old')) {
            const answer = await showDialog('Este gladiador precisa ser atualizado. Deseja abri-lo no editor?', ['Sim', 'Não']);
            if (answer === 'Sim') window.open(`glad-${glad.id}`);
            return;
        }
        this.#container.querySelectorAll('.glad-preview').forEach(other => other.classList.remove('selected'));
        card.classList.add('selected');
        this.#selected = glad;
        this.#button.disabled = false;
    }

    /** Finds opponents, runs the ranked battle and shows its result. */
    async #fight() {
        const glad = this.#selected;
        if (!glad) return;
        const progress = new ProgressButton(this.#button, ['Executando batalha...', 'Aguardando resposta do servidor']);
        const before = {
            lvl: profile.user.level,
            xp: parseFloat(profile.user.xp),
            xpTotal: xpToNextLevel(profile.user.level),
            silver: parseInt(profile.user.silver, 10),
            mmr: glad.mmr,
        };

        const opponents = await MatchModel.find(glad.id);
        const stopPreBattle = showPreBattle([...(Array.isArray(opponents) ? opponents : []), glad], this.#button);

        let data;
        try {
            data = await new Simulation({ ranked: true, origin: 'ranked', terminal: true }).run();
        }
        catch {
            data = { error: true };
        }
        stopPreBattle();
        progress.kill();
        if (data.error) return;

        document.querySelectorAll('#fog').forEach(fog => fog.remove());
        this.onFought();
        showAfterBattle(data.simulation, before);
    }
}
