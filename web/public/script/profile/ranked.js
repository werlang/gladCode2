import { showDialog, showMessage } from '../components/dialog.js';
import { loadGladCards } from '../components/glad-card.js';
import { GladiatorPicker } from '../components/gladiator-picker.js';
import { VersusPanel } from '../components/versus-panel.js';
import { ProgressButton, Simulation } from '../components/simulation.js';
import { animateValue, fadeIn } from '../helpers/animate.js';
import { APP_EVENTS, events } from '../helpers/event-bus.js';
import { FlightGuard } from '../helpers/flight-guard.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { site } from '../helpers/request.js';
import { isAborted, secondaryRequest, settleRequest, writeErrorToast } from '../helpers/section-request.js';
import { GladiatorModel } from '../models/gladiator.js';
import { PotionModel } from '../models/potion.js';
import { RankedModel } from '../models/social.js';
import { BATTLE_TIPS } from './battle-tips.js';
import { profile, setSilver, xpToNextLevel } from './session.js';
import { afterBattleTemplate, preBattleExtraTemplate, preBattleTemplate } from '../templates/profile.js';

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
                user: glads[index].master,
                mmr: parseInt(glads[index].mmr, 10),
            }));
        });
        fadeIn(fog, undefined, 'flex');
    });

    const progress = fog.querySelector('#progress');
    const started = Date.now();
    let lastTip = started;
    const timer = setInterval(() => {
        const bar = button.querySelector('.progress-bar');
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
 * @param {{ level: number, xp: number, silver: number, gladiator: Record<string, any> }} data The master and gladiator after the battle.
 * @param {{ lvl: number, xp: number, xpTotal: number, silver: number, mmr: number }} before The master and gladiator before it.
 */
async function showAfterBattle(hash, data, before) {
    const fog = createElement(afterBattleTemplate);
    document.body.append(fog);
    const box = fog.querySelector('#after-battle');
    const find = selector => box.querySelector(selector);

    [['#renown-now .svg', 'icon/crown.svg'], ['#silver-now .svg', 'icon/coin.svg']].forEach(async ([selector, icon]) => {
        const svg = await site.get(icon);
        if (typeof svg === 'string') find(selector).innerHTML = svg;
    });
    find('#close').addEventListener('click', () => fog.remove());
    find('#watch').addEventListener('click', () => window.open(`play/${hash}`));

    find('#lvl .value').textContent = data.level;

    let xpGain = data.xp - before.xp;
    if (before.lvl !== data.level) {
        find('#lvl #plusone').classList.remove('hidden');
        xpGain = Math.round(parseFloat(data.xp) + before.xpTotal - before.xp);
    }
    const xpTotal = xpToNextLevel(data.level);
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

    const mmrGain = Math.trunc(data.gladiator.mmr) - Math.trunc(before.mmr);
    const renown = find('#renown-now .value');
    if (mmrGain > 0) renown.classList.add('green');
    else if (mmrGain < 0) renown.classList.add('red');
    animateValue({ from: 0, to: mmrGain, duration: COUNT_MS, onStep: value => {
        renown.textContent = mmrGain > 0 ? `+${Math.trunc(value)}` : Math.trunc(value);
    } });
    animateValue({ from: before.mmr, to: data.gladiator.mmr, duration: COUNT_MS, onStep: value => {
        find('#renown-total').textContent = Math.trunc(value);
    } });

    profile.user.level = data.level;
    profile.user.xp = data.xp;
    loadGladCards(find('.glad-card-container'), { glads: [data.gladiator] });
    find('#code').addEventListener('click', () => window.open(`glad-${data.gladiator.id}`));
}


/**
 * The ranked part of the BATALHAS tab: the GladiatorPicker and VersusPanel, and the button that finds
 * opponents and runs the battle.
 */
export class RankedBattle {
    #picker;
    #versus;
    #button;
    #selected = null;
    #selectedId = null;
    #signal = null;
    #flight = new FlightGuard();
    #pending = null;

    /**
     * @param {() => void} onFought Called when the battle ended.
     */
    constructor(onFought) {
        this.onFought = onFought;
        this.#picker = new GladiatorPicker();
        document.querySelector('#ranked-picker').append(this.#picker.element);
        this.#versus = new VersusPanel();
        document.querySelector('#ranked-versus').append(this.#versus.element);
        this.#button = this.#versus.element.querySelector('.versus-fight');
        this.#versus.setReward('Renome e prata');
        this.#picker.listen('select', ({ gladiator }) => {
            this.#selected = gladiator;
            this.#selectedId = gladiator.id;
            this.#versus.setGladiator(gladiator);
            this.#versus.setReady(true);
            events.emit(APP_EVENTS.gladiatorChosen, { gladiator, mode: 'ranked' });
        });
        this.#picker.listen('confirm', () => this.#fight());
        this.#versus.listen('fight', () => this.#fight());
    }

    /**
     * Draws the user's gladiators to pick one.
     *
     * @param {{ signal?: AbortSignal, selectId?: number|string }} [options]
     */
    async refresh({ signal, selectId } = {}) {
        this.cancelPending();
        this.#signal = signal;
        const keptId = this.#selectedId;
        this.#selected = null;
        this.#versus.setGladiator(null);
        this.#versus.setBusy(false);
        this.#versus.setReady(false);
        this.#picker.setDisabled('');
        const glads = await settleRequest(() => GladiatorModel.list({ signal }), signal);
        if (!glads || signal?.aborted) return;
        this.#picker.setGladiators(glads);
        const wanted = selectId ?? keptId;
        if (wanted !== undefined && wanted !== null) this.#picker.select(Number(wanted));
        if (!this.#picker.selected) this.#selectedId = null;
        const slots = await secondaryRequest(() => PotionModel.slots({ signal }), signal);
        if (signal?.aborted) return;
        if (slots?.slots) this.#versus.setPotions(slots.slots);
    }

    /** Finds opponents, runs the ranked battle and shows its result. */
    async #fight() {
        const glad = this.#selected;
        if (!glad) return;
        const controller = new AbortController();
        this.#pending = controller;
        const signal = this.#signal
            ? AbortSignal.any([this.#signal, controller.signal])
            : controller.signal;
        return this.#flight.run(async () => {
            this.#picker.setDisabled('Batalha ranqueada em andamento');
            this.#versus.setBusy(true);
            const progress = new ProgressButton(this.#button, ['Executando batalha...', 'Aguardando resposta do servidor']);
            const before = {
                lvl: profile.user.level,
                xp: parseFloat(profile.user.xp),
                xpTotal: xpToNextLevel(profile.user.level),
                silver: parseInt(profile.user.silver, 10),
                mmr: glad.mmr,
            };

            try {
                let match;
                try {
                    match = await RankedModel.match(glad.id, { signal });
                }
                catch (error) {
                    if (isAborted(error) || signal?.aborted) return;
                    if (error.code === 'NO_OPPONENTS') {
                        showMessage('Ainda não há oponentes na versão atual. Tente novamente mais tarde.');
                        return;
                    }
                    if (error.code !== 'GLADIATOR_OUTDATED') {
                        writeErrorToast(error);
                        return;
                    }
                    const answer = await showDialog('Este gladiador precisa ser atualizado. Deseja abri-lo no editor?', ['Sim', 'Não']);
                    if (answer === 'Sim') window.open(`glad-${glad.id}`);
                    return;
                }
                if (signal?.aborted || this.#signal !== signal) return;
                const glads = [...match.opponents, glad];
                const stopPreBattle = showPreBattle(glads, this.#button);

                let data;
                try {
                    data = await new Simulation(signal => RankedModel.fight(match.match, { signal }), { terminal: true, names: glads.map(entry => entry.name) }).run();
                }
                catch (error) {
                    // the pre-battle screen has no way out of its own: take it down and say why
                    document.querySelectorAll('#fog').forEach(fog => fog.remove());
                    writeErrorToast(error);
                    data = { error: true };
                }
                stopPreBattle();
                if (signal?.aborted || this.#signal !== signal || data.error || !data.hash) return;

                document.querySelectorAll('#fog').forEach(fog => fog.remove());
                this.onFought();
                showAfterBattle(data.hash, data.summary, before);
            }
            finally {
                progress.kill();
                this.#versus.setBusy(false);
                this.#picker.setDisabled('');
                if (this.#pending === controller) this.#pending = null;
            }
        });
    }

    /** Aborts the pending matchmaking when the ranked tab or the section is left. */
    cancelPending() {
        this.#pending?.abort();
        this.#pending = null;
    }
}
