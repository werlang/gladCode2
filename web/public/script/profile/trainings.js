import { Message, showDialog, showInput, showMessage } from '../components/dialog.js';
import { loadSelectableCards } from '../components/glad-card.js';
import { Slider } from '../components/slider.js';
import { createToast } from '../components/toast.js';
import { copyText } from '../helpers/clipboard.js';
import { createElement, escapeHtml, renderTemplate } from '../helpers/html.js';
import { fadeIn, hide, show } from '../helpers/animate.js';
import { TrainingModel } from '../models/training.js';
import { emptyStateTemplate } from '../templates/empty-state.js';
import { profile } from './session.js';
import { showNoCredit } from './tutor.js';
import {
    bigLinkTemplate,
    bigQrTemplate,
    chooseGladTemplate,
    createWindowTemplate,
    createdTemplate,
    listHeadTemplate,
    listRowTemplate,
    manualJoinTemplate,
    participantRowTemplate,
    participantsHeadTemplate,
    removeActionTemplate,
    roomWindowTemplate,
    trainingPitchTemplate,
} from '../templates/profile-trainings.js';

const PAGE_SIZE = 10;
const TRAIN_URL = 'https://gladcode.dev/train/';
/** How often an open training window looks for new participants, in ms. */
const ROOM_POLL_MS = 5000;
/** Training weights the weight slider steps through. */
const WEIGHTS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10];
/** What to tell a master a training code does not work, by API error code. */
const JOIN_ERRORS = {
    TRAINING_NOT_FOUND: 'Treino não encontrado',
    TRAINING_STARTED: 'Este treino já iniciou',
    INVITATION_EXPIRED: 'O código para ingresso deste treino expirou',
    ALREADY_JOINED: 'Você já está participando deste treino',
};

/**
 * The battle sizes a training's participants split into, as the room shows
 * them: "N" or "N e M" masters per battle.
 *
 * @param {number} participants Gladiators entered.
 * @param {number} players Gladiators per battle chosen by the manager.
 * @returns {{ players: string, second: string }} The `#players` and `#pl-second` texts.
 */
export function battleSizes(participants, players) {
    const groups = Math.ceil(participants / players);
    const lower = Math.floor(participants / groups);
    const higher = Math.ceil(participants / groups);

    if (lower === higher && lower === players) return { players: String(lower), second: '' };
    if (lower === players) return { players: String(lower), second: `e ${higher}` };
    if (higher === players) return { players: String(higher), second: `e ${lower}` };
    return { players: '', second: lower === higher ? String(lower) : `${lower} e ${higher}` };
}

/**
 * The QR code image of a training's invitation link.
 *
 * @param {string} hash Invitation hash.
 * @returns {Promise<HTMLImageElement>}
 */
function qrImage(hash) {
    return new Promise(resolve => {
        const image = new Image();
        image.alt = 'QR code do treino';
        image.onload = () => resolve(image);
        image.src = `https://api.qrserver.com/v1/create-qr-code/?data=${TRAIN_URL}${hash}&size=500x500`;
    });
}

/**
 * Asks the user for the gladiator to enter (or swap into) a training.
 *
 * @returns {Promise<Record<string, any>|null>} The gladiator, or `null` when cancelled.
 */
function chooseGladiator() {
    const fog = createElement(chooseGladTemplate);
    document.body.append(fog);
    const select = fog.querySelector('#select');
    const picked = loadSelectableCards(fog.querySelector('.glad-card-container'), select);

    return new Promise(resolve => {
        fog.querySelector('#cancel').addEventListener('click', () => {
            fog.remove();
            resolve(null);
        });
        select.addEventListener('click', async () => {
            const glad = (await picked)();
            if (!glad) return;
            fog.remove();
            resolve(glad);
        });
    });
}

/**
 * Shows the invitation of a training full screen: its QR code, its link or its code.
 *
 * @param {HTMLElement} fog Overlay holding `#big-info`.
 * @param {HTMLElement} hidden The window to hide meanwhile.
 * @param {string} hash Invitation hash.
 * @param {'qr'|'link'|'code'} kind What to show.
 */
async function showInvitation(fog, hidden, hash, kind) {
    const info = fog.querySelector('#big-info') ?? fog.appendChild(Object.assign(document.createElement('div'), { id: 'big-info' }));
    hide(hidden);
    const close = () => {
        fog.classList.remove('black', 'white');
        hide(info);
        info.replaceChildren();
        fadeIn(hidden);
    };

    if (kind === 'qr') {
        fog.classList.add('black');
        info.innerHTML = `${bigQrTemplate}<i class='fas fa-spinner fa-pulse'></i>`;
        fadeIn(info);
        info.querySelector('#close').addEventListener('click', close);
        const image = await qrImage(hash);
        info.querySelector('.fa-spinner')?.remove();
        info.append(image);
        return;
    }

    const manual = kind === 'code';
    fog.classList.add('white');
    info.innerHTML = renderTemplate(bigLinkTemplate, {
        intro: manual ? manualJoinTemplate : '',
        manualClass: manual ? 'manual' : '',
        prefix: manual ? '' : TRAIN_URL,
        hash,
    });
    fadeIn(info);
    info.querySelector('#close').addEventListener('click', close);

    const link = info.querySelector('.link');
    const copy = async () => {
        await copyText(link.textContent);
        createToast('Link do treino copiado para área de transferência', 'success');
    };
    link.addEventListener('click', copy);
    info.querySelector('#copy').addEventListener('click', copy);
    const resize = factor => {
        link.style.fontSize = `${Math.trunc(parseFloat(getComputedStyle(link).fontSize) * factor)}px`;
    };
    info.querySelector('#increase').addEventListener('click', () => resize(1.1));
    info.querySelector('#reduce').addEventListener('click', () => resize(0.9));
}

/**
 * Lets the manager edit a field of the training in place (Enter saves, Escape cancels).
 *
 * @param {HTMLElement} element The field's text.
 * @param {number} id Training id.
 * @param {'name'|'description'} field Field name.
 */
function editInPlace(element, id, field) {
    const text = element.textContent;
    const input = document.createElement('textarea');
    input.id = 'input-edit';
    input.value = text;
    const { width, height } = element.getBoundingClientRect();
    Object.assign(input.style, { fontSize: getComputedStyle(element).fontSize, width: `${width + 70}px`, height: `${height}px` });
    element.after(input);
    element.classList.add('hidden');
    input.focus();
    input.select();

    let done = false;
    const finish = value => {
        if (done) return;
        done = true;
        input.remove();
        element.textContent = value;
        element.classList.remove('hidden');
    };
    const save = async () => {
        if (done) return;
        const value = input.value.trim();
        if (value === text) {
            finish(text);
            return;
        }
        finish(value);
        try {
            await TrainingModel.edit(id, field, value);
        }
        catch (error) {
            element.textContent = text;
            if (error.code !== 'INVALID_NAME') throw error;
            createToast('Nome precisa ter pelo menos 6 caracteres', 'error');
            return;
        }
        createToast('Campo alterado com sucesso', 'success');
    };

    input.addEventListener('focusout', save);
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') finish(text);
        else if (event.key === 'Enter') {
            event.preventDefault();
            save();
        }
    });
}

/**
 * The window of a training waiting to start: participants, invitation and,
 * for the manager, editing, kicking, starting or deleting it. It polls for
 * participants while open.
 */
class TrainingRoom {
    #fog = null;
    #timer = null;
    #left = false;
    #hash = null;

    /**
     * @param {number} id Training id.
     */
    constructor(id) {
        this.id = id;
    }

    /** Opens the window (or the running training). */
    async show() {
        let data;
        try {
            data = await TrainingModel.room(this.id);
        }
        catch (error) {
            if (error.code !== 'TRAINING_NOT_FOUND' && error.code !== 'NOT_A_MEMBER') throw error;
            showMessage('Treino não encontrado');
            return;
        }
        if (data.status === 'started') {
            window.open(`train/${data.hash}`);
            return;
        }

        this.manager = data.status === 'manage';
        this.players = data.players;
        this.#fog = createElement(renderTemplate(roomWindowTemplate, { ...data, maxtime: data.maxMinutes }));
        document.body.append(this.#fog);
        const window_ = this.#window();

        if (this.manager) {
            if (!data.description) window_.querySelector('#train-desc').textContent = 'Adicione uma descrição';
            window_.querySelectorAll('.edit').forEach(element => {
                element.title = 'Clique para alterar';
                const field = element.id === 'train-name' ? 'name' : 'description';
                element.addEventListener('click', () => editInPlace(element, this.id, field));
            });
        }
        else {
            window_.querySelectorAll('.edit').forEach(element => element.classList.remove('edit'));
            window_.querySelector('#qr').parentElement.remove();
            hide(window_.querySelector('#start'));
            const leave = window_.querySelector('#delete');
            leave.textContent = 'ABANDONAR TREINO';
            leave.hidden = false;
            leave.addEventListener('click', async () => {
                if (await showDialog(`Abandonar o treino <b>${escapeHtml(data.name)}</b>?`, ['Sim', 'Não']) !== 'Sim') return;
                this.#left = true;
                await TrainingModel.leave(this.id);
                this.refresh();
            });
        }

        if (this.manager) this.#showInvitation(data);
        window_.querySelector('#close').addEventListener('click', () => this.close());
        await this.refresh();
        // the first refresh may have closed the window (started, removed, not a member)
        if (!this.#fog) return;
        this.#timer = setInterval(() => {
            // a failed poll (a lost connection, say) is simply tried again on the next tick
            if (!document.hidden) this.refresh().catch(() => {});
        }, ROOM_POLL_MS);
    }

    /** @returns {HTMLElement} The window. */
    #window() {
        return this.#fog.querySelector('.train.window');
    }

    /** Closes the window and stops polling. */
    close() {
        clearInterval(this.#timer);
        this.#fog?.remove();
        this.#fog = null;
    }

    /**
     * Shows the invitation QR code and link, or the button that renews an expired one.
     *
     * @param {Record<string, any>} data Room answer.
     */
    async #showInvitation(data) {
        const window_ = this.#window();
        const qr = window_.querySelector('#qr');
        const link = window_.querySelector('#link');
        const renew = document.createElement('button');
        renew.id = 'renew';
        link.before(renew);

        if (data.expired) {
            qr.innerHTML = "<i id='fake-qr' class='fas fa-qrcode'></i>";
            link.insertAdjacentHTML('beforeend', "<span class='blur'>XXXX</span>");
            renew.title = 'Renovar link';
            renew.innerHTML = "<i class='fas fa-redo'></i>";
            renew.addEventListener('click', async () => {
                renew.innerHTML = "<i class='fas fa-spinner fa-pulse'></i>";
                const { hash } = await TrainingModel.renew(this.id);
                this.#setHash(hash);
            });
            return;
        }

        renew.innerHTML = "<i class='fas fa-spinner fa-pulse'></i>";
        link.insertAdjacentHTML('beforeend', '<span></span>');
        this.#setHash(data.hash);
        qr.addEventListener('click', () => {
            if (this.#hash) showInvitation(this.#fog, window_, this.#hash, 'qr');
        });
    }

    /**
     * Shows a (new) invitation hash and its QR code.
     *
     * @param {string} hash Invitation hash.
     */
    async #setHash(hash) {
        if (this.#hash === hash || !this.#fog) return;
        this.#hash = hash;
        const window_ = this.#window();
        const image = await qrImage(hash);
        const qr = window_.querySelector('#qr');
        qr.replaceChildren(image);
        qr.title = 'Ampliar QR code';
        qr.classList.remove('blur');
        const span = window_.querySelector('#link span');
        span.textContent = hash;
        span.classList.remove('blur');
        window_.querySelector('#renew')?.remove();
    }

    /** Redraws the participants and the manager's controls. */
    async refresh() {
        if (!this.#fog) return;
        let data;
        try {
            data = await TrainingModel.room(this.id);
        }
        catch (error) {
            if (!this.#fog) return;
            if (error.code === 'TRAINING_NOT_FOUND') {
                this.close();
                showMessage('O treino foi removido pelo gerenciador');
                return;
            }
            if (error.code !== 'NOT_A_MEMBER') throw error;
            this.close();
            if (this.#left) createToast('Você saiu do treino', 'success');
            else showMessage('Você foi removido do treino');
            return;
        }
        if (!this.#fog) return;

        if (data.status === 'started') {
            this.close();
            await showMessage('O treino foi iniciado. Clique para ir até ele');
            window.open(`train/${data.hash}`);
            return;
        }

        const window_ = this.#window();
        const name = window_.querySelector('#train-name');
        if (!name.classList.contains('hidden')) name.textContent = data.name;
        const description = window_.querySelector('#train-desc');
        if (data.description && !description.classList.contains('hidden')) description.textContent = data.description;
        if (this.manager && !data.expired) this.#setHash(data.hash);

        this.#drawParticipants(window_, data);
    }

    /**
     * @param {HTMLElement} window_ The window.
     * @param {Record<string, any>} data Room answer.
     */
    #drawParticipants(window_, data) {
        const table = window_.querySelector('.table');
        const start = window_.querySelector('#start');
        const remove = window_.querySelector('#delete');
        const count = data.gladiators.length;

        if (count === 0) {
            table.innerHTML = renderTemplate(emptyStateTemplate, {
                variantClass: 'compact', icon: 'user-group', title: 'Nenhum participante', summary: '', actionHtml: '',
            });
            window_.querySelector('h3 #count').textContent = '';
            if (this.manager) {
                hide(start);
                remove.hidden = false;
                show(remove);
                remove.onclick = () => this.#askDelete(data.name);
            }
            return;
        }

        const sizes = battleSizes(count, this.players);
        window_.querySelector('#player-container #players').textContent = sizes.players;
        window_.querySelector('#player-container #pl-second').textContent = sizes.second;

        table.innerHTML = participantsHeadTemplate + data.gladiators.map(glad => renderTemplate(participantRowTemplate, {
            signed: glad.mine ? 'signed' : '',
            master: glad.master,
            glad: glad.gladiator,
        })).join('');
        window_.querySelector('h3 #count').textContent = count;
        const rows = [...table.querySelectorAll('.row:not(.head)')];

        if (this.manager) {
            show(start);
            remove.hidden = true;
            start.disabled = count < this.players;
            start.onclick = () => this.#askStart();
            rows.forEach((row, index) => row.querySelector('.kick').addEventListener('click', async () => {
                await TrainingModel.kick(this.id, data.gladiators[index].id);
                createToast('Participante removido', 'success');
                this.refresh();
            }));
            return;
        }

        rows.forEach(row => row.querySelector('.kick').remove());
        table.querySelector('.row.signed')?.addEventListener('click', async () => {
            const glad = await chooseGladiator();
            if (!glad) return;
            try {
                await TrainingModel.changeGladiator(this.id, glad.id);
            }
            catch (error) {
                if (!error.code) throw error;
                createToast('Não foi possível alterar o gladiador', 'error');
                return;
            }
            createToast('Gladiador alterado', 'success');
            this.refresh();
        });
    }

    async #askStart() {
        if (await showDialog('Deseja iniciar o treino? Após o início, os participantes não poderão ser alterados', ['Sim', 'Não']) !== 'Sim') return;
        this.close();
        let hash;
        try {
            ({ hash } = await TrainingModel.start(this.id));
        }
        catch (error) {
            if (error.code !== 'FEW_PLAYERS') throw error;
            showMessage('O treino precisa de mais participantes');
            return;
        }
        createToast('Treino iniciado', 'success');
        window.open(`train/${hash}`);
    }

    /** @param {string} name Training name. */
    async #askDelete(name) {
        if (await showDialog(`Deseja excluir o treino ${escapeHtml(name)}?`, ['Sim', 'Não']) !== 'Sim') return;
        await TrainingModel.remove(this.id);
        this.close();
        createToast('Treino removido', 'success');
    }
}

/**
 * The training part of the BATALHAS tab: the trainings the user manages and
 * takes part in, creating and joining trainings.
 */
export class TrainingsTab {
    #wrapper = document.querySelector('#panel #battle-container #train.wrapper');
    #offsets = { manage: 0, part: 0 };
    /** The current navigation signal; the list pages keep using it. */
    #signal = null;

    /** Binds the buttons; only tutors can create trainings. */
    init() {
        const create = this.#wrapper.querySelector('#create');
        if (!profile.user.premium) hide(create);
        create.addEventListener('click', () => this.#openCreate());
        this.#wrapper.querySelector('#join').addEventListener('click', () => this.#join());
        this.#wrapper.querySelectorAll('.title #offset').forEach(pager => {
            const list = pager.classList.contains('manage') ? 'manage' : 'part';
            pager.querySelector('#prev').addEventListener('click', () => this.#page(list, -1));
            pager.querySelector('#next').addEventListener('click', () => this.#page(list, 1));
        });
    }

    /**
     * @param {'manage'|'part'} list Which list.
     * @param {number} direction -1 or 1.
     */
    #page(list, direction) {
        this.#offsets[list] += direction * PAGE_SIZE;
        this.refresh({ signal: this.#signal });
    }

    /**
     * Draws both training lists, opening the one a join link pointed to (`?room=`).
     *
     * @param {{ signal?: AbortSignal }} [options]
     */
    async refresh({ signal = this.#signal } = {}) {
        this.#signal = signal;
        const data = await TrainingModel.list(this.#offsets, { signal });
        if (signal?.aborted) return;
        ['manage', 'part'].forEach(list => this.#drawList(list, data));

        if (!data.manage?.length && !data.part?.length) {
            const table = this.#wrapper.querySelector('#table-part');
            table.innerHTML = renderTemplate(emptyStateTemplate, {
                variantClass: 'compact',
                icon: 'dumbbell',
                title: 'Você ainda não participa de nenhum treino',
                summary: 'Use o botão abaixo para ingressar com o código fornecido pelo tutor.',
                actionHtml: '',
            });
            show(table);
        }

        const room = Number(new URLSearchParams(location.search).get('room'));
        if (room) {
            history.replaceState(null, '', location.pathname);
            new TrainingRoom(room).show();
        }
    }

    /**
     * @param {'manage'|'part'} list Which list.
     * @param {Record<string, any>} data LIST answer.
     */
    #drawList(list, data) {
        const table = this.#wrapper.querySelector(`#table-${list}`);
        const title = this.#wrapper.querySelector(`.title.${list}`);
        const rows = data[list];
        if (!rows?.length) {
            table.replaceChildren();
            hide(table);
            hide(title);
            return;
        }
        show(table);
        show(title);

        const offset = parseInt(data.pages[list].offset, 10);
        const total = parseInt(data.pages[list].total, 10);
        const end = Math.min(total, offset + PAGE_SIZE);
        this.#offsets[list] = offset;
        const pager = this.#wrapper.querySelector(`#offset.${list}`);
        pager.querySelector('.start').textContent = offset + 1;
        pager.querySelector('.end').textContent = end;
        pager.querySelector('.total').textContent = total;
        pager.querySelector('#prev').disabled = offset === 0;
        pager.querySelector('#next').disabled = end === total;

        const manage = list === 'manage';
        table.innerHTML = renderTemplate(listHeadTemplate, { actions: manage ? "<div class='cell'></div>" : '' })
            + rows.map(row => renderTemplate(listRowTemplate, {
                name: row.name,
                description: row.description,
                masters: row.masters,
                actions: manage ? removeActionTemplate : '',
            })).join('');
        table.querySelectorAll('.row:not(.head)').forEach((element, index) => {
            const training = rows[index];
            element.addEventListener('click', () => new TrainingRoom(training.id).show());
            element.querySelector('.remove')?.addEventListener('click', event => {
                event.stopPropagation();
                this.#askPurge(training);
            });
        });
    }

    /**
     * Deletes a training for good, after the manager types its name.
     *
     * @param {{ id: number, name: string }} training Training.
     */
    #askPurge(training) {
        new Message({
            message: `Deseja realmente excluir o treino <b>${escapeHtml(training.name)}</b>? Esta operação é irreversível`,
            buttons: { yes: 'SIM', no: 'NÃO' },
        }).show().click('yes', () => {
            new Message({
                message: 'Para confirmar a remoção, informe o nome do treino',
                buttons: { ok: 'OK', cancel: 'CANCELAR' },
                input: true,
            }).show().click('ok', async ({ input }) => {
                if (input !== training.name) {
                    new Message({ message: 'O nome informado não confere' }).show();
                    return;
                }
                await TrainingModel.remove(training.id);
                new Message({ message: 'O treino foi removido com sucesso' }).show();
                this.refresh();
            });
        });
    }

    #openCreate() {
        if (!profile.user.premium) {
            new Message({
                message: trainingPitchTemplate,
                buttons: { no: 'NÃO', yes: 'SABER MAIS' },
                class: 'school large',
            }).show().click('yes', () => window.open('about#plans'));
            return;
        }
        if (parseFloat(profile.user.credits) <= 0) {
            showNoCredit();
            return;
        }

        const fog = createElement(createWindowTemplate);
        document.body.append(fog);
        const window_ = fog.querySelector('.train.window');
        fadeIn(window_);
        window_.querySelector('#name').focus();

        const maxtime = new Slider(window_.querySelector('#maxtime #slider'), {
            range: 'min', min: 5, max: 120, step: 5, value: 45, label: value => `${value}m`, ariaLabel: 'Tempo máximo do treino',
        });
        const players = new Slider(window_.querySelector('#players #slider'), {
            range: 'min', min: 2, max: 5, step: 1, value: 3, label: String, ariaLabel: 'Gladiadores por batalha',
        });
        const weight = new Slider(window_.querySelector('#weight #slider'), {
            range: 'min',
            min: 0,
            max: WEIGHTS.length - 1,
            step: 1,
            value: 1,
            label: index => `${WEIGHTS[index] === 10 ? WEIGHTS[index] : WEIGHTS[index].toFixed(1)}x`,
            ariaLabel: 'Peso do treino',
        });

        window_.querySelector('#cancel').addEventListener('click', () => fog.remove());
        window_.querySelector('#create').addEventListener('click', async () => {
            const nameField = window_.querySelector('#name');
            window_.querySelectorAll('.tip').forEach(tip => tip.remove());
            if (nameField.value.length < 6) {
                nameField.focus();
                nameField.classList.add('error');
                nameField.insertAdjacentHTML('beforebegin', "<span class='tip'>O identificador precisa ter tamanho 6 ou mais</span>");
                return;
            }

            let created;
            try {
                created = await TrainingModel.create({
                    name: nameField.value,
                    description: window_.querySelector('#desc').value,
                    maxMinutes: Number(maxtime.value),
                    players: Number(players.value),
                    weight: WEIGHTS[weight.value],
                });
            }
            catch (error) {
                if (error.code === 'TUTOR_ONLY') {
                    createToast('Esta função só pode ser usada por contas verificadas de instituições de ensino', 'error');
                    profile.user.premium = false;
                }
                else if (error.code === 'NO_CREDITS') {
                    createToast('Você não possui créditos para utilizar essa função', 'error');
                    profile.user.credits = 0;
                }
                else throw error;
                return;
            }
            fog.remove();
            this.#showCreated(created.hash);
            this.refresh();
        });
    }

    /**
     * Tells how masters can join the new training.
     *
     * @param {string} hash Invitation hash.
     */
    #showCreated(hash) {
        const fog = createElement(createdTemplate);
        document.body.append(fog);
        const message = fog.querySelector('#train-message');
        fog.querySelector('.button').addEventListener('click', () => fog.remove());
        fog.querySelector('#qrcode').addEventListener('click', () => showInvitation(fog, message, hash, 'qr'));
        fog.querySelector('#link').addEventListener('click', () => showInvitation(fog, message, hash, 'link'));
        fog.querySelector('#manual').addEventListener('click', () => showInvitation(fog, message, hash, 'code'));
    }

    /** Joins a training by its code. */
    async #join() {
        const answer = await showInput('Informe o código fornecido para participar do treino', '');
        if (answer === false) return;
        const hash = answer.trim();
        if (!/^[0-9A-Za-z]+$/.test(hash)) {
            showMessage(JOIN_ERRORS.TRAINING_NOT_FOUND);
            return;
        }

        let training;
        try {
            training = await TrainingModel.invitation(hash);
        }
        catch (error) {
            if (!JOIN_ERRORS[error.code]) throw error;
            showMessage(JOIN_ERRORS[error.code]);
            return;
        }

        if (training.status === 'started') {
            showMessage(JOIN_ERRORS.TRAINING_STARTED);
        }
        else if (training.status === 'joined') {
            createToast('Você já está participando deste treino', 'info');
            new TrainingRoom(training.id).show();
        }
        else {
            const glad = await chooseGladiator();
            if (!glad) return;
            try {
                await TrainingModel.join(hash, glad.id);
            }
            catch (error) {
                if (!error.code) throw error;
                createToast(JOIN_ERRORS[error.code] ?? 'Erro ao ingressar, tente novamente', 'error');
                return;
            }
            createToast('Você ingressou no treino', 'success');
            this.refresh();
            new TrainingRoom(training.id).show();
        }
    }
}
