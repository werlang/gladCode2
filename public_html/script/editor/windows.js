import { showDialog } from '../components/dialog.js';
import { loadSelectableCards } from '../components/glad-card.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeIn, fadeOut, slideDown } from '../helpers/animate.js';
import { GladiatorModel } from '../models/gladiator.js';
import { UserModel } from '../models/user.js';
import {
    helpDocsTemplate,
    helpTemplate,
    helpVideoButtonTemplate,
    helpVideosTemplate,
    sampleCode,
    settingsTemplate,
    themeTemplate,
    videoTemplate,
} from '../templates/editor.js';

const THEMES = ['ambiance', 'chaos', 'chrome', 'clouds', 'clouds_midnight', 'cobalt', 'crimson_editor', 'dawn', 'dracula', 'dreamweaver', 'eclipse', 'github', 'gob', 'gruvbox', 'idle_fingers', 'iplastic', 'katzenmilch', 'kr_theme', 'kuroir', 'merbivore', 'merbivore_soft', 'mono_industrial', 'monokai', 'pastel_on_dark', 'solarized_dark', 'solarized_light', 'sqlserver', 'terminal', 'textmate', 'tomorrow', 'tomorrow_night_blue', 'tomorrow_night_bright', 'tomorrow_night_eighties', 'tomorrow_night', 'twilight', 'vibrant_ink', 'xcode'];
const DEFAULT_THEME = 'dreamweaver';

/** Tutorial videos of the help window (YouTube ids). */
const VIDEOS = [
    ['te1M98UDKiM', 'Introdução e conceitos'],
    ['tjMjqQ14AS8', 'Editor de gladiadores'],
    ['Wrc-0_Kq-_4', 'Programando gladiadores'],
    ['5QQtfruq8_8', 'Habilidades e efeitos'],
    ['hzxe5rmyODI', 'Programação com blocos'],
];

/**
 * The editor appearance window: Ace theme and font size, previewed on a sample.
 *
 * @param {import('./code-editor.js').CodeEditor} code The code editor.
 * @param {Record<string, any>|null} user Signed-in user (saves the choice).
 */
export function openSettings(code, user) {
    const current = user?.theme ?? DEFAULT_THEME;
    const themes = THEMES.map(name => renderTemplate(themeTemplate, { name, selected: name === current ? 'selected' : '' })).join('');
    const fog = createElement(renderTemplate(settingsTemplate, { themes }));
    document.body.append(fog);

    const sample = ace.edit('code-sample');
    if (user) {
        sample.setTheme(`ace/theme/${user.theme}`);
        sample.setFontSize(`${user.font}px`);
    }
    sample.getSession().setMode('ace/mode/c_cpp');
    sample.setReadOnly(true);
    sample.setValue(sampleCode, -1);

    fog.querySelectorAll('#list .theme').forEach(theme => theme.addEventListener('click', () => {
        fog.querySelectorAll('#list .theme').forEach(other => other.classList.remove('selected'));
        theme.classList.add('selected');
        sample.setTheme(`ace/theme/${theme.textContent}`);
    }));
    fog.querySelectorAll('#font-size .button').forEach(button => button.addEventListener('click', () => {
        const font = parseInt(sample.getFontSize(), 10);
        sample.setFontSize(button.classList.contains('font-small') ? font - 2 : font + 2);
        sample.resize();
    }));
    fog.querySelector('#cancel').addEventListener('click', () => fog.remove());
    fog.querySelector('#change').addEventListener('click', async () => {
        const theme = sample.getTheme().split('/')[2];
        const font = parseInt(sample.getFontSize(), 10);
        code.setAppearance(theme, font);
        fog.remove();
        if (!user) return;
        await UserModel.saveEditor({ theme, font });
        user.theme = theme;
        user.font = font;
    });
}

/**
 * The help window: reading, videos or the tutorial.
 *
 * @param {() => void} startTutorial Starts the tutorial.
 */
export function openHelp(startTutorial) {
    const fog = createElement(helpTemplate);
    document.body.append(fog);
    fadeIn(fog, undefined, 'flex');
    const window_ = fog.querySelector('#help-window');
    fog.addEventListener('click', () => fog.remove());

    const openCategory = (category, markup) => {
        if (category.classList.contains('selected')) return null;
        window_.querySelectorAll('.categories').forEach(other => other.classList.remove('selected'));
        category.classList.add('selected');
        window_.querySelector('#subcat')?.remove();
        window_.insertAdjacentHTML('beforeend', markup);
        const subcategories = window_.querySelector('#subcat');
        subcategories.style.display = 'none';
        slideDown(subcategories);
        return subcategories;
    };

    window_.querySelector('#tutorial').addEventListener('click', startTutorial);
    window_.querySelector('#docs').addEventListener('click', event => {
        event.stopPropagation();
        openCategory(event.currentTarget, helpDocsTemplate);
    });
    window_.querySelector('#video').addEventListener('click', event => {
        event.stopPropagation();
        const buttons = VIDEOS.map(([, title]) => renderTemplate(helpVideoButtonTemplate, { title })).join('');
        const list = openCategory(event.currentTarget, renderTemplate(helpVideosTemplate, { buttons }));
        list?.querySelectorAll('.video.button').forEach((button, index) => button.addEventListener('click', () => {
            fog.remove();
            const player = createElement(renderTemplate(videoTemplate, { id: VIDEOS[index][0] }));
            document.body.append(player);
            fadeIn(player, undefined, 'flex');
            player.querySelector('#remove').addEventListener('click', () => player.remove());
        }));
    });
}

/**
 * The "Editar gladiador" window: the user's gladiators to open (or delete).
 *
 * @param {() => boolean} isSaved Whether the edited gladiator has no unsaved changes.
 * @param {() => void} markSaved Drops the unsaved-changes guard before leaving.
 */
export async function openGladiators(isSaved, markSaved) {
    const fog = document.querySelector('#fog-glads');
    const container = fog.querySelector('.glad-card-container');
    const open = fog.querySelector('#btn-glad-open');
    fog.style.display = '';
    container.replaceChildren();
    open.disabled = true;

    const glads = await GladiatorModel.list();
    if (!glads.length) {
        location.href = 'newglad';
        return;
    }
    // outdated gladiators are opened to be updated
    const picked = await loadSelectableCards(container, open, { glads, remove: true, canPick: () => true });
    container.querySelectorAll('.glad-preview').forEach((card, index) => {
        card.querySelector('.delete')?.addEventListener('click', async event => {
            event.stopPropagation();
            const glad = glads[index];
            if (await showDialog(`Deseja excluir o gladiador <span class='highlight'>${glad.name}</span>?`, ['Sim', 'Não']) !== 'Sim') return;
            await fadeOut(card);
            card.remove();
            GladiatorModel.remove(glad.id);
        });
    });

    fog.querySelector('#btn-glad-cancel').onclick = () => {
        fog.style.display = 'none';
    };
    open.onclick = async () => {
        const glad = picked();
        if (!glad) return;
        if (!isSaved()) {
            const answer = await showDialog(`Deseja abrir o gladiador <span class='highlight'>${glad.name}</span> para edição? Todas alterações no gladiador atual serão perdidas`, ['Sim', 'Não']);
            if (answer !== 'Sim') return;
            markSaved();
        }
        location.href = `glad-${glad.id}`;
    };
}
