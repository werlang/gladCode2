import { Avatar } from '../components/avatar.js';
import { ChoiceCards } from '../components/choice-cards.js';
import { Message } from '../components/dialog.js';
import { Input } from '../components/input.js';
import { SaveStatus } from '../components/save-status.js';
import { SegmentedControl } from '../components/segmented-control.js';
import { Switch } from '../components/switch.js';
import { createToast } from '../components/toast.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { formatMonthYear } from '../helpers/date-format.js';
import { DEFAULT_GLAD_VIEW, applyGladView } from '../helpers/glad-view.js';
import { applyTheme, storedThemeChoice } from '../helpers/theme.js';
import { isAborted, undoChange, writeErrorToast } from '../helpers/section-request.js';
import { account } from '../services/account.js';
import { profile, xpToNextLevel } from './session.js';
import { UserModel } from '../models/user.js';
import { preferenceRowTemplate, profileShellTemplate } from '../templates/profile-settings.js';

/** E-mail switches, in the board's order. */
const PREFERENCES = [
    { name: 'message', label: 'Mensagens recebidas', hint: 'Quando outro mestre escrever para você' },
    { name: 'duel', label: 'Desafios de duelo', hint: 'Quando um amigo desafiar você' },
    { name: 'friend', label: 'Convites de amizade', hint: 'Quando alguém quiser ser seu amigo' },
    { name: 'update', label: 'Novidades da gladCode', hint: 'Atualizações do motor e torneios abertos' },
    { name: 'tourn', label: 'Rodadas de torneios e treinos', hint: 'Quando uma rodada que você participa começar' },
];

const THEME_LABELS = { system: 'Seguir o sistema', 'arena-light': 'Arena claro', 'arena-dark': 'Arena escuro', classic: 'Clássico' };

/** @param {string} value @returns {string} */
function themePreview(value) {
    return `<span class='theme-mini theme-mini--${value}'><span class='theme-mini__bar'></span><span class='theme-mini__rail'></span><span class='theme-mini__card'></span><span class='theme-mini__accent'></span></span>`;
}

/** @param {string} value @returns {string} */
function gladPreview(value) {
    if (value === 'sprite') return "<span class='glad-mini glad-mini--sprite'><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>";
    return "<span class='glad-mini glad-mini--3d'></span>";
}

/**
 * Reads an image file as a data URL.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
function readImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * The Perfil section: the identity hero and the autosaving fields. Every write goes through
 * AccountService's per-field queue; failures roll the preview back and show the API message.
 */
export class SettingsTab {
    #root = document.querySelector('#profile-panel');
    #built = false;
    #avatar = null;
    #nickname = null;
    #nicknameTimer = null;
    #nicknameAvailable = null;
    #nicknameController = null;
    #language = null;
    #theme = null;
    #gladView = null;
    #themeSystem = null;
    #switches = new Map();
    #languageStatus = null;
    #nicknameStatus = null;
    #appearanceStatus = null;
    #emailStatus = null;
    #cropper = null;
    #cropDialog = null;
    #cropping = false;
    #photoButton = null;
    #picturePicker = null;
    #signal = null;
    #lastNickname = null;
    #lastLanguage = null;
    #lastAppearance = null;
    #lastPreference = null;
    #nicknameToast = null;
    #languageToast = null;
    #appearanceToast = null;
    #emailToast = null;

    /** Binds the section when the shell starts. */
    init() {
        this.#build();
    }

    /** Builds the section once. */
    #build() {
        if (this.#built || !this.#root) return;
        this.#root.innerHTML = renderTemplate(profileShellTemplate);
        this.#avatar = new Avatar({ size: 'lg' });
        this.#root.querySelector('#profile-avatar-slot').append(this.#avatar.element);

        this.#nickname = new Input(this.#root.querySelector('#profile-nickname'));
        this.#nickname.element.addEventListener('input', () => this.#onNicknameInput());
        this.#nickname.element.addEventListener('blur', () => this.#saveNickname());
        this.#nickname.element.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.#saveNickname();
            }
        });
        this.#nicknameStatus = new SaveStatus();
        this.#root.querySelector('#nickname-status').append(this.#nicknameStatus.element);
        this.#nicknameStatus.set('idle', 'Disponível · salva quando você sai do campo');

        this.#language = new SegmentedControl({ element: this.#root.querySelector('#language-control'), label: 'Linguagem padrão' });
        this.#language.setOptions([
            { value: 'c', label: 'C' }, { value: 'python', label: 'Python' }, { value: 'blocks', label: 'Blocos' },
        ]);
        this.#language.listen('change', ({ value }) => this.#saveLanguage(value));

        this.#theme = new ChoiceCards({ element: this.#root.querySelector('#theme-control'), variant: 'preview', label: 'Tema do site' });
        this.#theme.setOptions([
            { value: 'arena-light', title: 'Arena claro', preview: themePreview('arena-light') },
            { value: 'arena-dark', title: 'Arena escuro', preview: themePreview('arena-dark') },
            { value: 'classic', title: 'Clássico', preview: themePreview('classic') },
        ]);
        this.#theme.listen('change', ({ value }) => this.#saveTheme(value));
        this.#themeSystem = this.#root.querySelector('#theme-system');
        this.#themeSystem.addEventListener('click', () => this.#saveTheme('system'));

        this.#gladView = new ChoiceCards({ element: this.#root.querySelector('#glad-view-control'), variant: 'icon', label: 'Como os gladiadores aparecem' });
        this.#gladView.setOptions([
            { value: '3d', title: 'Coliseu 3D', description: 'Cartas, editor e replays em 3D', preview: gladPreview('3d') },
            { value: 'sprite', title: 'Pixel art', description: 'O visual clássico, mais leve', preview: gladPreview('sprite') },
        ]);
        this.#gladView.listen('change', ({ value }) => this.#saveGladView(value));

        this.#languageStatus = this.#status('#identity-status');
        this.#appearanceStatus = this.#status('#appearance-status');
        this.#emailStatus = this.#status('#email-status');
        this.#nicknameStatus.listen('retry', () => this.#retryNickname());
        this.#languageStatus.listen('retry', () => {
            if (this.#lastLanguage?.field === 'language') this.#saveLanguage(this.#lastLanguage.value);
        });
        this.#appearanceStatus.listen('retry', () => {
            if (this.#lastAppearance?.field === 'gladView') this.#saveGladView(this.#lastAppearance.value);
            else if (this.#lastAppearance?.field === 'theme') this.#saveTheme(this.#lastAppearance.value);
        });
        this.#emailStatus.listen('retry', () => {
            if (this.#lastPreference) this.#savePreference(this.#lastPreference.name, this.#lastPreference.value);
        });

        this.#buildPreferences();
        this.#bindPicture();
        this.#built = true;
    }

    /** @param {string} selector @returns {SaveStatus} */
    #status(selector) {
        const status = new SaveStatus();
        this.#root.querySelector(selector).append(status.element);
        return status;
    }

    /** Builds the e-mail rows and their Switch components. */
    #buildPreferences() {
        const list = this.#root.querySelector('#preferences-list');
        list.replaceChildren();
        for (const preference of PREFERENCES) {
            const row = createElement(renderTemplate(preferenceRowTemplate, {
                name: preference.name,
                label: preference.label,
                hint: preference.hint,
            }));
            const control = new Switch({ label: preference.label });
            control.listen('change', ({ checked }) => this.#savePreference(preference.name, checked));
            row.querySelector('.preference-switch').append(control.element);
            this.#switches.set(preference.name, control);
            list.append(row);
        }
    }

    /**
     * Opens the section.
     *
     * @param {object} [route]
     * @param {{ signal?: AbortSignal }} [options]
     */
    show(route = {}, { signal } = {}) {
        if (signal?.aborted) return;
        this.#build();
        this.#signal = signal;
        const user = account.user ?? profile.user;
        if (!user) return;
        this.#nickname.value = user.nickname ?? '';
        this.#root.querySelector('#profile-nickname-example').textContent = user.nickname ?? '';
        this.#language.set(user.language ?? 'c', { silent: true });
        if (user.theme && user.theme !== 'system') this.#theme.set(user.theme, { silent: true });
        else this.#theme.clear();
        this.#gladView.set(user.gladView ?? DEFAULT_GLAD_VIEW, { silent: true });
        for (const preference of PREFERENCES) {
            this.#switches.get(preference.name)?.set(Boolean(user.preferences?.[preference.name]), { silent: true });
        }
        this.#renderHero(user);
    }

    /** @param {Record<string, any>} user */
    #renderHero(user) {
        const stats = user.stats ?? { battles: 0, wins: 0, renown: 0 };
        const level = Number(user.level) || 1;
        const xp = Number(user.xp) || 0;
        const total = xpToNextLevel(level);
        // The hero already says “Mestre nível N”; the avatar keeps no level badge, which would sit
        // under the camera button.
        this.#avatar.set({ name: user.nickname, picture: user.picture, level: 0 });
        this.#avatar.setRing(total ? xp / total : 0);
        this.#avatar.setOnline(false);
        this.#root.querySelector('#profile-hero-name').textContent = user.nickname ?? '';
        const since = user.joinedAt ? ` · na gladCode desde ${formatMonthYear(user.joinedAt)}` : '';
        this.#root.querySelector('#profile-hero-meta').textContent = `Mestre nível ${level}${since}`;
        this.#root.querySelector('#profile-xp-fill').style.width = `${Math.min(100, total ? (xp / total) * 100 : 0)}%`;
        this.#root.querySelector('#profile-xp-label').textContent = `${Math.max(0, Math.round(total - xp))} XP para o nível ${level + 1}`;
        this.#root.querySelector('#profile-stat-battles').textContent = Number(stats.battles).toLocaleString('pt-BR');
        const wins = stats.battles ? Math.round((stats.wins / stats.battles) * 100) : 0;
        this.#root.querySelector('#profile-stat-wins').textContent = `${wins}%`;
        this.#root.querySelector('#profile-stat-renown').textContent = Number(stats.renown).toLocaleString('pt-BR');
    }

    /** Checks a typed nickname after a short pause. */
    #onNicknameInput() {
        const value = this.#nickname.value.trim();
        this.#root.querySelector('#profile-nickname-example').textContent = value;
        this.#nickname.clearError();
        this.#nicknameAvailable = null;
        this.#lastNickname = null;
        clearTimeout(this.#nicknameTimer);
        this.#nicknameController?.abort();
        if (value.length < 2) {
            this.#nicknameStatus.set('error', 'O nome deve ter entre 2 e 30 caracteres');
            return;
        }
        this.#nicknameStatus.set('saving', 'Verificando disponibilidade…');
        this.#nicknameTimer = setTimeout(async () => {
            const controller = new AbortController();
            this.#nicknameController = controller;
            try {
                const answer = await UserModel.nicknameAvailable(value, { signal: controller.signal });
                if (controller.signal.aborted || value !== this.#nickname.value.trim()) return;
                this.#nicknameAvailable = answer.available;
                if (answer.available) this.#nicknameStatus.set('idle', 'Disponível · salva quando você sai do campo');
                else this.#nicknameStatus.set('error', 'Este apelido já está em uso');
            }
            catch (error) {
                if (isAborted(error) || controller.signal.aborted) return;
                this.#nicknameStatus.set('error', error.message || 'Não foi possível verificar o apelido');
            }
        }, 350);
    }

    /** @returns {string} The nickname the API currently confirms. */
    #confirmedNickname() {
        return String(account.confirmed('nickname') ?? profile.user?.nickname ?? '');
    }

    /**
     * Resends the nickname a refused save still intends. The input rolled back, so the intent is
     * kept separately; a newly typed value wins over it.
     *
     * @returns {void}
     */
    #retryNickname() {
        const current = this.#nickname.value.trim();
        const intent = current && current !== this.#confirmedNickname() ? current : this.#lastNickname;
        if (intent) this.#saveNickname(intent);
    }

    /**
     * Saves the nickname on blur or Enter, after local validation.
     *
     * @param {string} [intent] Value to send; defaults to the field.
     */
    async #saveNickname(intent = this.#nickname.value.trim()) {
        const value = String(intent ?? '').trim();
        const confirmed = this.#confirmedNickname();
        if (!value) {
            this.#nickname.setError('Escolha um apelido');
            return;
        }
        if (value === confirmed) {
            this.#nicknameStatus.set('idle', 'Disponível · salva quando você sai do campo');
            return;
        }
        if (this.#nicknameAvailable === false && value === this.#nickname.value.trim()) {
            this.#nickname.setError('Este apelido já está em uso');
            return;
        }
        this.#lastNickname = value;
        this.#nicknameToast?.dismiss();
        this.#nicknameToast = null;
        this.#nicknameStatus.set('saving', 'Salvando…');
        try {
            const saved = await account.save('nickname', value);
            if (saved.superseded) return;
            this.#nicknameAvailable = true;
            this.#nickname.clearError();
            this.#nicknameStatus.set('idle', 'Disponível · salva quando você sai do campo');
            this.#languageStatus.set('saved', 'Salvo');
            const savedName = saved.user?.nickname ?? value;
            this.#nickname.value = savedName;
            this.#root.querySelector('#profile-nickname-example').textContent = savedName;
            this.#renderHero(account.user ?? profile.user);
            this.#nicknameToast = createToast(`Apelido alterado para ${savedName}`, {
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        const result = await undoChange(() => account.undo(saved.token), {
                            restore: () => this.#restoreNickname(),
                            report: error => this.#reportNicknameError(error, false),
                        });
                        if (result?.user) this.#nicknameStatus.set('saved', 'Salvo');
                    },
                },
            });
        }
        catch (error) {
            this.#reportNicknameError(error, true);
        }
    }

    /** @param {unknown} error @param {boolean} fieldError */
    #reportNicknameError(error, fieldError) {
        const confirmed = this.#confirmedNickname();
        this.#nickname.value = confirmed;
        this.#root.querySelector('#profile-nickname-example').textContent = confirmed;
        this.#renderHero(account.user ?? profile.user);
        const message = error?.message || 'Não foi possível salvar o apelido';
        if (fieldError) this.#nickname.setError(message);
        this.#nicknameStatus.set('error', message);
        writeErrorToast(error);
    }

    /** Puts the nickname control and hero back on the confirmed account. */
    #restoreNickname() {
        const confirmed = this.#confirmedNickname();
        this.#nickname.value = confirmed;
        this.#root.querySelector('#profile-nickname-example').textContent = confirmed;
        this.#renderHero(account.user ?? profile.user);
    }

    /** @param {string} value */
    async #saveLanguage(value) {
        this.#lastLanguage = { field: 'language', value };
        this.#languageToast?.dismiss();
        this.#languageToast = null;
        this.#languageStatus.set('saving', 'Salvando…');
        try {
            const saved = await account.save('language', value);
            if (saved.superseded) return;
            const confirmed = account.confirmed('language') ?? value;
            this.#language.set(confirmed, { silent: true });
            this.#languageStatus.set('saved', 'Salvo');
            const label = { c: 'C', python: 'Python', blocks: 'Blocos' }[confirmed] ?? confirmed;
            this.#languageToast = createToast(`Linguagem alterada para ${label}`, {
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        const result = await undoChange(() => account.undo(saved.token), {
                            restore: () => this.#restoreLanguage(),
                            report: error => this.#reportLanguageError(error),
                        });
                        if (result?.user) this.#languageStatus.set('saved', 'Salvo');
                    },
                },
            });
        }
        catch (error) {
            this.#reportLanguageError(error);
        }
    }

    /** @param {unknown} error */
    #reportLanguageError(error) {
        this.#language.set(String(account.confirmed('language') ?? profile.user?.language ?? 'c'), { silent: true });
        this.#languageStatus.set('error', error?.message || 'Não foi possível salvar');
        writeErrorToast(error);
    }

    /** Puts the language control on the value the API confirms. */
    #restoreLanguage() {
        this.#language.set(String(account.confirmed('language') ?? profile.user?.language ?? 'c'), { silent: true });
    }

    /** @param {string} value */
    async #saveTheme(value) {
        this.#lastAppearance = { field: 'theme', value };
        this.#appearanceToast?.dismiss();
        this.#appearanceToast = null;
        applyTheme(value);
        if (value === 'system') this.#theme.clear();
        else this.#theme.set(value, { silent: true });
        this.#appearanceStatus.set('saving', 'Salvando…');
        try {
            const saved = await account.save('theme', value);
            if (saved.superseded) return;
            const choice = account.confirmed('theme') ?? value;
            applyTheme(choice);
            this.#setThemeCards(choice);
            this.#appearanceStatus.set('saved', 'Salvo');
            this.#appearanceToast = createToast(`Tema alterado para ${THEME_LABELS[choice] ?? choice}`, {
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        const result = await undoChange(() => account.undo(saved.token), {
                            restore: () => this.#restoreTheme(),
                            report: error => this.#reportAppearanceError(error, 'tema'),
                        });
                        if (result?.user) this.#appearanceStatus.set('saved', 'Salvo');
                    },
                },
            });
        }
        catch (error) {
            this.#reportAppearanceError(error, 'tema');
        }
    }

    /** @param {string} choice */
    #setThemeCards(choice) {
        if (choice === 'system') this.#theme.clear();
        else this.#theme.set(choice, { silent: true });
    }

    /** Puts the theme controls and document back on the confirmed choice. */
    #restoreTheme() {
        const choice = account.confirmed('theme') ?? storedThemeChoice();
        applyTheme(choice);
        this.#setThemeCards(choice);
    }

    /** @param {unknown} error @param {string} subject */
    #reportAppearanceError(error, subject) {
        if (subject === 'tema') this.#restoreTheme();
        else this.#restoreGladView();
        this.#appearanceStatus.set('error', error?.message || `Não foi possível salvar o ${subject}`);
        writeErrorToast(error);
    }

    /** @param {string} value */
    async #saveGladView(value) {
        this.#lastAppearance = { field: 'gladView', value };
        this.#appearanceToast?.dismiss();
        this.#appearanceToast = null;
        applyGladView(value);
        this.#gladView.set(value, { silent: true });
        this.#appearanceStatus.set('saving', 'Salvando…');
        try {
            const saved = await account.save('gladView', value);
            if (saved.superseded) return;
            const choice = account.confirmed('gladView') ?? value;
            applyGladView(choice);
            this.#gladView.set(choice, { silent: true });
            this.#appearanceStatus.set('saved', 'Salvo');
            const label = choice === 'sprite' ? 'Pixel art' : 'Coliseu 3D';
            this.#appearanceToast = createToast(`Visual dos gladiadores: ${label}`, {
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        const result = await undoChange(() => account.undo(saved.token), {
                            restore: () => this.#restoreGladView(),
                            report: error => this.#reportAppearanceError(error, 'visual'),
                        });
                        if (result?.user) this.#appearanceStatus.set('saved', 'Salvo');
                    },
                },
            });
        }
        catch (error) {
            this.#reportAppearanceError(error, 'visual');
        }
    }

    /** Puts the gladiator-style cards back on the confirmed choice. */
    #restoreGladView() {
        const choice = account.confirmed('gladView') ?? profile.user?.gladView ?? DEFAULT_GLAD_VIEW;
        applyGladView(choice);
        this.#gladView.set(choice, { silent: true });
    }

    /** Puts every preference switch on the confirmed object. */
    #restorePreferences() {
        const confirmed = account.confirmed('preferences') ?? profile.user?.preferences ?? {};
        for (const preference of PREFERENCES) {
            this.#switches.get(preference.name)?.set(Boolean(confirmed?.[preference.name]), { silent: true });
        }
    }

    /** @param {string} name @param {boolean} value */
    async #savePreference(name, value) {
        this.#lastPreference = { name, value };
        this.#emailToast?.dismiss();
        this.#emailToast = null;
        this.#emailStatus.set('saving', 'Salvando…');
        try {
            // Patches merge when the request runs, so a second switch changed before the first
            // request finishes does not replace it.
            const saved = await account.save('preferences', { [name]: value }, { merge: true });
            if (saved.superseded) return;
            // Only this switch is settled here; a newer patch may still be queued for another one.
            this.#switches.get(name)?.set(Boolean(account.confirmed('preferences')?.[name]), { silent: true });
            this.#emailStatus.set('saved', 'Salvo');
            const preference = PREFERENCES.find(item => item.name === name);
            const label = preference?.label ?? 'Aviso';
            this.#emailToast = createToast(`${label} ${value ? 'ativado' : 'desativado'}`, {
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        const result = await undoChange(() => account.undo(saved.token), {
                            restore: () => this.#restorePreferences(),
                            report: error => this.#reportPreferenceError(error),
                        });
                        if (result?.user) this.#emailStatus.set('saved', 'Salvo');
                    },
                },
            });
        }
        catch (error) {
            this.#reportPreferenceError(error, name);
        }
    }

    /** @param {unknown} error @param {string} [name] The switch that failed; all when omitted. */
    #reportPreferenceError(error, name) {
        if (name) {
            const confirmed = account.confirmed('preferences') ?? {};
            this.#switches.get(name)?.set(Boolean(confirmed?.[name]), { silent: true });
        }
        else {
            this.#restorePreferences();
        }
        this.#emailStatus.set('error', error?.message || 'Não foi possível salvar');
        writeErrorToast(error);
    }

    /** The hero picture button opens the picker; a drop also opens the cropper. */
    #bindPicture() {
        this.#picturePicker = this.#root.querySelector('#profile-picture-picker');
        this.#photoButton = this.#root.querySelector('#profile-photo-button');
        this.#photoButton.addEventListener('click', () => this.#picturePicker.click());
        this.#picturePicker.addEventListener('change', () => {
            if (this.#picturePicker.files[0]) this.#openCropper(this.#picturePicker.files[0]);
            this.#picturePicker.value = '';
        });
        const avatar = this.#root.querySelector('#profile-avatar-slot');
        avatar.addEventListener('dragover', event => event.preventDefault());
        avatar.addEventListener('drop', event => {
            event.preventDefault();
            const file = [...event.dataTransfer.files].find(item => item.type.startsWith('image/'));
            if (file) this.#openCropper(file);
        });
    }

    /**
     * Opens the shared modal dialog (focus entry, Tab trap, Esc close) with the Croppie viewport.
     *
     * @param {File} file
     */
    async #openCropper(file) {
        const source = await readImage(file);
        if (!this.#root?.isConnected) return;
        this.#closeCropper();
        const dialog = new Message({
            message: "<div class='profile-cropper-image'><img alt='Prévia da foto'></div>",
            buttons: { cancel: 'Cancelar', save: 'Recortar imagem' },
            class: 'profile-cropper-dialog',
            preventKill: true,
        }).show();
        this.#cropDialog = dialog;
        const box = dialog.element.querySelector('#dialog-box');
        box.setAttribute('aria-label', 'Recortar foto');
        box.removeAttribute('aria-labelledby');
        const image = dialog.element.querySelector('#message img');
        image.src = source;
        this.#cropper = new Croppie(image, { viewport: { width: 150, height: 150 }, boundary: { width: 300, height: 300 } });
        dialog.click('cancel', () => this.#closeCropper());
        dialog.click('save', () => { this.#finishCrop(dialog); });
    }

    /**
     * Crops and saves the chosen picture, or closes on refusal.
     *
     * @param {Message} dialog
     */
    async #finishCrop(dialog) {
        if (this.#cropping || this.#cropDialog !== dialog || !this.#cropper) return;
        this.#cropping = true;
        try {
            const cropped = await this.#cropper.result('base64');
            if (this.#cropDialog !== dialog) return;
            this.#closeCropper();
            await this.#savePicture(cropped);
        }
        catch (error) {
            if (this.#cropDialog !== dialog) return;
            this.#closeCropper();
            writeErrorToast(error);
        }
    }

    #closeCropper() {
        this.#cropper?.destroy();
        this.#cropper = null;
        this.#cropping = false;
        const dialog = this.#cropDialog;
        this.#cropDialog = null;
        dialog?.kill();
        // The file picker leaves focus on body; return it to the control that opened the flow.
        if (dialog && this.#photoButton?.isConnected) this.#photoButton.focus();
    }

    /** @param {string} picture */
    async #savePicture(picture) {
        const user = account.user ?? profile.user;
        const previous = account.confirmed('picture') ?? user?.picture ?? '';
        this.#avatar.set({ name: user?.nickname, picture, level: 0 });
        this.#languageStatus.set('saving', 'Salvando foto…');
        try {
            const saved = await account.save('picture', picture);
            if (saved.superseded) return;
            this.#languageStatus.set('saved', 'Salvo');
            this.#renderHero(account.user ?? profile.user);
        }
        catch (error) {
            this.#avatar.set({ name: user?.nickname, picture: previous, level: 0 });
            this.#languageStatus.set('error', error.message || 'Não foi possível salvar a foto');
            writeErrorToast(error);
        }
    }

    /** Clears pending checks and the cropper when the shell leaves. */
    unmount() {
        clearTimeout(this.#nicknameTimer);
        this.#nicknameTimer = null;
        this.#nicknameController?.abort();
        this.#nicknameController = null;
        this.#closeCropper();
    }
}
