import './blocks.js';
import { Message, showDialog, showMessage } from './components/dialog.js';
import { showLoginDialog } from './components/header.js';
import { createElement, decodeHtml, renderTemplate } from './helpers/html.js';
import { fetchSpritesheet, getSpriteThumb } from './helpers/spritesheet.js';
import { api } from './helpers/request.js';
import { BattleLogModel } from './models/battle-log.js';
import { GladiatorModel } from './models/gladiator.js';
import { UserModel } from './models/user.js';
import { gladiatorSource } from './editor/attributes.js';
import { BattleTest, SAVE_TEST_GLADS, loadSample, runTestBattle } from './editor/battle-test.js';
import { BlocksEditor } from './editor/blocks-editor.js';
import { CodeEditor } from './editor/code-editor.js';
import { SkinCreator } from './editor/skin-creator.js';
import { attachTutorial, tutorial } from './editor/tutorial.js';
import { openGladiators, openHelp, openSettings } from './editor/windows.js';
import { savingTemplate } from './templates/editor.js';
import { gladCardTemplate } from './templates/glad-card.js';

/** Attributes used to test code before the user picked any. */
const TEST_ATTRIBUTES = { vstr: 14, vagi: 14, vint: 2 };
/** Lessons the tutorial checks when the test window opens, and after a test battle. */
const BEFORE_TEST_LESSONS = ['checkStep', 'oponent', 'learnAttack', 'checkAttack', 'checkGetHit', 'checkReact', 'checkSafe', 'checkFireball', 'checkTeleport', 'checkUpgrade', 'checkBreakpoint'];
const AFTER_TEST_LESSONS = ['watchCodeMove', 'moveBackForth', 'askMoveNext', 'detectEnemy', 'getHit', 'reactHit', 'safe', 'fireball', 'teleport', 'upgrade', 'breakpoint'];
/** A transparent pixel, for a profile picture that fails to load. */
const BLANK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

/**
 * Reads the gladiator editor.php embedded for editing (`glad-<id>`).
 *
 * @returns {Record<string, string>|null}
 */
function takeEmbeddedGladiator() {
    const element = document.querySelector('#glad-code');
    if (!element) return null;
    const field = id => element.querySelector(`#${id}`)?.textContent ?? '';
    const glad = {
        id: field('idglad'),
        name: field('name'),
        user: field('user'),
        code: field('code'),
        blocks: field('blocks'),
        vstr: field('vstr'),
        vagi: field('vagi'),
        vint: field('vint'),
        skin: field('skin'),
    };
    element.remove();
    return glad;
}

/**
 * The gladiator editor page: code or blocks, appearance and attributes,
 * test battles, saving, settings, help and the tutorial.
 */
class EditorPage {
    user = null;
    saved = true;
    tested = true;
    /** Id of the saved gladiator being edited. */
    gladId = null;
    /** Owner nickname of the edited gladiator. */
    nick = null;
    /** The gladiator as the creator last produced it (name, attributes, skin). */
    card = null;

    /**
     * @param {Record<string, string>|null} embedded The gladiator opened for editing.
     */
    constructor(embedded) {
        this.embedded = embedded;
        this.code = new CodeEditor('code', { blocksActive: () => this.blocks.active });
        this.blocks = new BlocksEditor(this.code);
        this.creator = new SkinCreator(document.querySelector('#fog-skin'), glad => this.#useCreatedGladiator(glad));
        this.battleTest = new BattleTest(() => this.#editedSource(), hash => this.#afterTest(hash));
    }

    async start() {
        document.querySelector('#header-editor')?.classList.add('here');
        document.querySelector('#header-container')?.classList.add('small');
        document.querySelectorAll('.fog').forEach(fog => {
            fog.style.display = 'none';
        });

        const { embedded } = this;
        this.nick = embedded?.user ?? null;
        this.#bindMenu();
        this.code.ace.on('change', () => this.#codeChanged());
        window.addEventListener('beforeunload', event => {
            if (this.saved) return;
            event.preventDefault();
            event.returnValue = '';
        });

        const [user] = await Promise.all([UserModel.current(), this.creator.init()]);
        this.user = UserModel.isLogged(user) ? user : null;
        attachTutorial({ editor: this.code.ace, user: user ?? {}, toggleBlocks: options => this.blocks.toggle(options) });

        if (embedded) await this.#loadGladiator(embedded);
        if (!this.user) {
            this.#showCreator();
        }
        else {
            this.#setUpUser(embedded);
        }
        this.code.ace.focus();
    }

    /** @param {Record<string, any>|null} embedded The gladiator opened for editing. */
    async #setUpUser(embedded) {
        const { user } = this;
        document.querySelectorAll('#login').forEach(login => {
            login.textContent = user.firstName;
        });
        const picture = document.querySelector('#profile-icon img');
        picture.onerror = () => {
            picture.src = BLANK_IMAGE;
        };
        picture.src = user.picture;

        if (user.showTutorial) {
            tutorial.enabled = true;
            tutorial.show();
        }
        if (user.language === 'blocks' && !embedded?.blocks) this.blocks.toggle({ ask: false, active: true });
        this.code.setAppearance(user.editorTheme, user.editorFont);

        if (document.querySelector('#newglad')) {
            document.querySelector('#newglad').remove();
            this.#showCreator();
        }
        else if (!embedded) {
            this.#openGladiators();
        }

        this.battleTest.addOwnGladiators(await GladiatorModel.list());
    }

    /**
     * Fills the editor with a saved gladiator.
     *
     * @param {Record<string, string>} glad Embedded gladiator.
     */
    async #loadGladiator(glad) {
        this.gladId = glad.id;
        this.creator.load(glad);
        if (glad.blocks) {
            await this.blocks.toggle({ ask: false, active: true, xml: decodeHtml(glad.blocks) });
        }
        this.code.value = decodeHtml(glad.code);
        this.code.ace.gotoLine(1, 0, true);

        let skin = null;
        try {
            skin = JSON.parse(glad.skin);
        }
        catch {
            skin = null;
        }
        const image = skin ? getSpriteThumb(await fetchSpritesheet(skin), 'walk', 'down') : null;
        this.#showCard({ ...this.creator.values(), image });
        this.saved = true;
        this.tested = false;
    }

    #bindMenu() {
        const on = (selector, handler) => document.querySelector(selector)?.addEventListener('click', handler);
        on('#float-card', () => this.#showCreator());
        on('#panel-left-opener', event => {
            const opener = event.currentTarget;
            const panel = document.querySelector('#panel-left');
            const open = !opener.classList.contains('open');
            panel.style.width = open ? '65px' : '0';
            panel.classList.toggle('hidden', !open);
            opener.classList.toggle('open', open);
        });
        on('#profile-icon', () => {
            if (this.user) location.href = 'news';
            else showLoginDialog();
        });
        on('#new', () => this.#newGladiator());
        on('#open', event => {
            if (!event.currentTarget.classList.contains('disabled')) this.#openGladiators();
        });
        on('#save', event => {
            if (!event.currentTarget.classList.contains('disabled')) this.#save();
        });
        on('#skin', () => this.#showCreator());
        on('#test', event => {
            if (!event.currentTarget.classList.contains('disabled')) this.#openTest();
        });
        on('#switch', () => this.blocks.toggle());
        on('#settings', () => openSettings(this.code, this.user));
        on('#help', () => openHelp(() => {
            tutorial.enabled = true;
            tutorial.show();
        }));
    }

    #showCreator() {
        document.querySelector('#fog-skin').style.display = '';
    }

    #codeChanged() {
        this.saved = false;
        this.tested = false;
        if (tutorial.enabled && this.user?.language === 'blocks') tutorial.show(['checkStep']);
    }

    /**
     * Asks to sign in before something that needs an account.
     *
     * @param {string} reason What needs the account.
     */
    async #askLogin(reason) {
        if (await showDialog(reason, ['Cancelar', 'LOGIN']) === 'LOGIN') showLoginDialog();
    }

    async #newGladiator() {
        if (!this.saved && await showDialog('Deseja criar um novo gladiador e perder as alterações feitas no gladiador atual?', ['Sim', 'Não']) !== 'Sim') return;
        this.saved = true;
        location.href = 'newglad';
    }

    #openGladiators() {
        if (!this.user) {
            this.#askLogin('Você precisa fazer LOGIN no sistema para visualizar seus gladiadores');
            return;
        }
        openGladiators(() => this.saved, () => {
            this.saved = true;
        });
    }

    /**
     * The creator finished: start the code and show the gladiator's card.
     *
     * @param {{ name: string, vstr: number, vagi: number, vint: number, skin: string[], image: HTMLCanvasElement }} glad
     */
    #useCreatedGladiator(glad) {
        if (tutorial.getLesson() === 'skin') tutorial.next(true);
        if (this.code.value === '') {
            this.code.value = this.user?.language === 'python'
                ? 'def loop():\n    #comportamento do gladiador\n'
                : 'loop(){\n    //comportamento do gladiador\n}';
            this.code.ace.gotoLine(1, 0, true);
        }
        this.code.ace.focus();
        document.querySelectorAll('#save, #test').forEach(button => button.classList.remove('disabled'));
        document.querySelector('#fog-skin').style.display = 'none';
        this.creator.showAppearance();
        this.#showCard(glad);
        this.saved = false;
        this.tested = false;
    }

    /**
     * Shows the gladiator's card in the corner of the editor.
     *
     * @param {{ name: string, vstr: number, vagi: number, vint: number, skin: string[], image?: HTMLCanvasElement|null }} glad
     */
    #showCard(glad) {
        this.card = glad;
        const card = createElement(renderTemplate(gladCardTemplate, { name: glad.name, vstr: glad.vstr, vagi: glad.vagi, vint: glad.vint, master: '' }));
        card.querySelector('.delete-container').remove();
        card.querySelector('.code').remove();
        card.querySelector('.image').replaceChildren(glad.image ?? this.creator.thumbnail());
        document.querySelector('#float-card .glad-preview').replaceWith(card);
        document.querySelectorAll('#save, #test').forEach(button => button.classList.remove('disabled'));
    }

    /**
     * The edited gladiator ready to fight: its code with the setup function, and its breakpoints.
     *
     * @returns {{ source: string, breakpoints: string[]|false, glad: Record<string, any> }}
     */
    #editedSource() {
        const values = this.creator.values();
        const attributes = values.vstr || values.vagi || values.vint ? values : { ...values, ...TEST_ATTRIBUTES };
        const glad = {
            name: values.name || 'Gladiador',
            vstr: attributes.vstr,
            vagi: attributes.vagi,
            vint: attributes.vint,
            skin: JSON.stringify(values.skin),
            user: this.nick || 'user',
        };
        const language = this.code.detectLanguage();
        return { source: gladiatorSource(glad, this.code.value, language), breakpoints: this.code.breakpoints(), glad };
    }

    #openTest() {
        if (tutorial.show(BEFORE_TEST_LESSONS) !== false) return;
        this.battleTest.open(this.card?.name ?? this.creator.values().name);
    }

    /** @param {string} hash Test battle log hash. */
    async #afterTest(hash) {
        this.tested = true;
        if (await showDialog('Deseja visualizar a batalha?', ['Sim', 'Não']) === 'Sim') window.open(`play/${hash}`);
        else BattleLogModel.remove(hash);
        tutorial.show(AFTER_TEST_LESSONS);
    }

    /** @returns {Promise<string[]>} The test-only functions the code uses. */
    async #bannedFunctions() {
        const { functions = [] } = await api.get('banned_functions.json');
        return functions.filter(name => this.code.value.includes(name));
    }

    async #save() {
        if (!this.user) {
            this.#askLogin('Você precisa fazer LOGIN no sistema para salvar seu gladiador');
            return;
        }

        const banned = await this.#bannedFunctions();
        if (banned.length) {
            showMessage(`Você possui funções em seu código que são permitidas somente para teste. Remova-as e tente salvar novamente.<ul>Funções:${banned.map(name => `<li><b>${name}</b></li>`).join('')}</ul>`);
            return;
        }
        // the server saves the code of this session's last test battle
        if (!this.tested) {
            this.#testBeforeSaving();
            return;
        }

        const card = this.card ?? this.creator.values();
        const blocks = this.blocks.active ? this.blocks.save() : undefined;
        const data = await GladiatorModel.save({
            id: this.gladId,
            name: card.name,
            vstr: card.vstr,
            vagi: card.vagi,
            vint: card.vint,
            skin: JSON.stringify(card.skin),
            blocks,
        });
        document.querySelectorAll('#fog').forEach(fog => fog.remove());

        if (data?.LIMIT) {
            showMessage(`Você não pode possuir mais de <span class='highlight'>${data.LIMIT}</span> gladiadores simultaneamente. Aumente seu nível de mestre para desbloquear mais gladiadores.`);
        }
        else if (data === 'EXISTS') {
            showMessage(`O nome <span class='highlight'>${card.name}</span> já está sendo usado por outro gladiador`);
        }
        else if (data === 'INVALID') {
            showMessage('CHEATER');
        }
        else if (data?.ID) {
            const created = !this.gladId;
            this.gladId = data.ID;
            this.saved = true;
            if (!created) {
                showMessage(`Gladiador <span class='highlight'>${card.name}</span> gravado`);
            }
            else if (await showDialog(`O gladiador <span class='highlight'>${card.name}</span> foi criado e gravado em seu perfil. Deseja inscrevê-lo para competir contra outros gladiadores?`, ['Sim', 'Agora não']) === 'Sim') {
                window.open('battle.ranked');
            }
        }
    }

    /** Fights the strongest samples, so the server holds tested code, then saves. */
    async #testBeforeSaving() {
        const name = this.card?.name ?? this.creator.values().name;
        const fog = createElement(renderTemplate(savingTemplate, { name }));
        document.body.append(fog);
        const opponents = await Promise.all(SAVE_TEST_GLADS.map(async sample => (await loadSample(sample)).code));
        const hash = await runTestBattle(fog.querySelector('button'), opponents, this.#editedSource());
        if (!hash) {
            fog.remove();
            return;
        }
        BattleLogModel.remove(hash);
        this.tested = true;
        this.#save();
    }
}

// the embedded gladiator holds an element with the editor's id, so it goes first
new EditorPage(takeEmbeddedGladiator()).start().catch(error => {
    console.error(error);
    new Message({ message: 'Não foi possível carregar o editor. Recarregue a página.' }).show();
});
