import { showMessage } from '../components/dialog.js';
import { decorateCheckSliders } from '../components/form-controls.js';
import { fadeIn, hide } from '../helpers/animate.js';
import { applyTheme } from '../helpers/theme.js';
import { UserModel } from '../models/user.js';
import { profile } from './session.js';

/** E-mail preferences, by the id suffix of their switches (`#pref-<name>`). */
const PREFERENCES = ['friend', 'message', 'update', 'duel', 'tourn'];
/** What to tell the user for each refused save, by API error code. */
const SAVE_ERRORS = {
    NICKNAME_TAKEN: 'Outro usuário já escolheu este nome',
    INVALID_NICKNAME: 'O nome deve ter entre 2 e 30 caracteres',
    INVALID_PICTURE: 'Não foi possível usar esta imagem. Escolha uma imagem PNG ou JPEG menor.',
};

/**
 * Reads an image file as a data URL.
 *
 * @param {File} file Image.
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
 * The PERFIL tab: nickname, picture (cropped in the browser), preferred
 * programming language, site theme and e-mail preferences.
 */
export class SettingsTab {
    #panel = document.querySelector('#profile-panel');
    /** A new crop to save, as a data URL; null keeps the current picture. */
    #picture = null;

    /** Binds the form. */
    init() {
        decorateCheckSliders(this.#panel);
        this.#panel.querySelector('#language select').value = profile.user.language;
        const theme = this.#panel.querySelector('#site-theme select');
        theme.value = profile.user.theme;
        // preview at once; GRAVAR saves it on the account
        theme.addEventListener('change', () => applyTheme(theme.value));
        this.#bindPicture();
        this.#panel.querySelector('#save').addEventListener('click', () => this.#save());
    }

    /** Fills the form with the current settings. */
    show() {
        this.#picture = null;
        this.#panel.querySelector('#nickname .input').value = profile.user.nickname;
        PREFERENCES.forEach(name => {
            this.#switch(name).checked = profile.user.preferences[name];
        });
    }

    /**
     * @param {string} name Preference.
     * @returns {HTMLInputElement}
     */
    #switch(name) {
        return this.#panel.querySelector(`#email #pref-${name} input.checkslider`);
    }

    /** The upload area takes a click (file picker) or a dropped image. */
    #bindPicture() {
        const area = this.#panel.querySelector('#img-upload');
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'image/*';
        picker.hidden = true;
        area.after(picker);
        area.setAttribute('role', 'button');
        area.tabIndex = 0;
        area.setAttribute('aria-label', 'Escolher foto de perfil');

        area.addEventListener('click', () => picker.click());
        area.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') picker.click();
        });
        picker.addEventListener('change', () => {
            if (picker.files[0]) this.#crop(picker.files[0]);
            picker.value = '';
        });
        area.addEventListener('dragover', event => {
            event.preventDefault();
            area.classList.add('dz-drag-hover');
        });
        area.addEventListener('dragleave', () => area.classList.remove('dz-drag-hover'));
        area.addEventListener('drop', event => {
            event.preventDefault();
            area.classList.remove('dz-drag-hover');
            const file = [...event.dataTransfer.files].find(item => item.type.startsWith('image/'));
            if (file) this.#crop(file);
        });
        hide(this.#panel.querySelector('#img-preview-container'));
    }

    /**
     * Opens the cropper on an image; the crop becomes the picture to save.
     *
     * @param {File} file Image.
     */
    async #crop(file) {
        const source = await readImage(file);
        const container = this.#panel.querySelector('#img-preview-container');
        container.innerHTML = "<div class='dz-preview'><button id='crop-image' class='button'>RECORTAR IMAGEM</button><img alt=''></div>";
        const image = container.querySelector('img');
        image.src = source;
        fadeIn(container, undefined, 'flex');

        const croppie = new Croppie(image, {
            viewport: { width: 150, height: 150 },
            boundary: { width: 300, height: 300 },
        });
        container.querySelector('.cr-slider')?.classList.add('slider');
        container.querySelector('#crop-image').addEventListener('click', async () => {
            const cropped = await croppie.result('base64');
            const area = this.#panel.querySelector('#img-upload');
            area.style.backgroundImage = `url(${cropped})`;
            area.style.backgroundSize = 'cover';
            this.#picture = cropped;
            croppie.destroy();
            hide(container);
        });
    }

    async #save() {
        const button = this.#panel.querySelector('#save');
        button.disabled = true;
        const field = this.#panel.querySelector('#nickname .input');
        const changes = {
            nickname: field.value,
            preferences: Object.fromEntries(PREFERENCES.map(name => [name, this.#switch(name).checked])),
            language: this.#panel.querySelector('#language select').value,
            theme: this.#panel.querySelector('#site-theme select').value,
        };
        if (this.#picture) changes.picture = this.#picture;

        try {
            profile.user = await UserModel.update(changes);
            this.#picture = null;
            document.querySelector('#profile-ui #nickname').textContent = profile.user.nickname;
            document.querySelector('#profile-ui #picture img').src = profile.user.picture;
            showMessage('Informações atualizadas');
        }
        catch (error) {
            const problem = SAVE_ERRORS[error.code];
            if (!problem) throw error;
            await showMessage(problem);
            if (error.code !== 'INVALID_PICTURE') {
                field.focus();
                field.select();
            }
        }
        finally {
            button.disabled = false;
        }
    }
}
