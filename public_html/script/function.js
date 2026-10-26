// ------------------------------------------------------------------------
// WHEN MESSING WITH FUNCS, DONT FORGET TO RUN compress_functions.php AFTER
// ------------------------------------------------------------------------
import './blocks.js';
import { SideMenu } from './components/side-menu.js';
import { renderTemplate } from './helpers/html.js';
import { FunctionDocsModel } from './models/function-docs.js';
import { UserModel } from './models/user.js';
import {
    noVersionTemplate,
    notFoundTemplate,
    paramTemplate,
    seeAlsoRowTemplate,
    voidParamTemplate,
} from './templates/function.js';

/** URL extension of each language. */
const EXTENSIONS = { c: 'c', python: 'py', blocks: 'blk' };
/** Language of each URL extension. */
const LANGUAGES = { c: 'c', py: 'python', blk: 'blocks' };
/** Words that look like calls in a sample but are not API functions. */
const RESERVED = ['loops', 'if', 'elif', 'while', 'for'];

const content = document.querySelector('#content');
const select = document.querySelector('#language select');
const functionName = document.querySelector('#vget')?.value ?? '';
/** `pt` on the Portuguese pages (`funcao/...`), where names are translated. */
const dictionary = document.querySelector('#dict')?.textContent ?? '';

/**
 * The language to show: the one in the URL, else the user's, else C.
 *
 * @param {Record<string, any>} user Signed-in user answer.
 * @returns {'c'|'python'|'blocks'}
 */
function chooseLanguage(user) {
    const requested = document.querySelector('#get-lang');
    const language = requested && LANGUAGES[requested.textContent];
    requested?.remove();
    if (language) return language;
    return UserModel.isLogged(user) && user.language ? user.language : 'c';
}

/**
 * Shows Blockly XML in a read-only workspace that follows its container's size.
 *
 * @param {HTMLElement} replaced Element the workspace takes the place of.
 * @param {string} id Workspace container id.
 * @param {string} xml Blocks.
 * @param {object} [options] Extra Blockly options.
 */
function showBlocks(replaced, id, xml, options = {}) {
    const container = document.createElement('div');
    container.id = id;
    replaced.replaceWith(container);
    const workspace = Blockly.inject(id, { readOnly: true, ...options });
    Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xml), workspace);
    new ResizeObserver(() => Blockly.svgResize(workspace)).observe(container);
}

/**
 * Shows code highlighted by Prism.
 *
 * @param {HTMLElement} element `<code>` element.
 * @param {string} code Source.
 * @param {string} language Language.
 */
function showCode(element, code, language) {
    element.innerHTML = code;
    element.className = `language-${language}`;
    Prism.highlightElement(element);
}

/**
 * Fills the example: the code, the "see also" functions it calls and the
 * explanation, whose `{function}` marks become the function's name (its
 * block name on the blocks page).
 *
 * @param {Record<string, any>} item Function documentation.
 * @param {Record<string, any>} reference Every function's documentation.
 * @param {string} language Shown language.
 */
async function fillSample(item, reference, language) {
    const sample = await FunctionDocsModel.sample(`${item.sample.explain.split('.')[0]}.json`);
    const target = document.querySelector('#temp-sample');
    if (language === 'blocks') {
        showBlocks(target.parentElement, 'sample-ws', sample.blocks, { scrollbars: true });
    }
    else {
        showCode(target, sample[language], language);
    }

    const calls = (sample.python ?? sample.c).match(/\w+\(/g) ?? [];
    calls.map(call => call.slice(0, -1)).forEach(name => {
        if (name !== item.name.default && !item.seealso.includes(name) && !RESERVED.includes(name)) {
            item.seealso.push(name);
        }
    });

    const marked = new Set((sample.explain.match(/\{[\w\W]+?\}/g) ?? []).map(mark => mark.match(/\w+/)[0]));
    let explain = sample.explain;
    marked.forEach(name => {
        const shown = language === 'blocks' ? reference[name.toLowerCase()].name.block : name;
        explain = explain.replace(new RegExp(`\\{${name}\\}`, 'g'), shown);
    });
    document.querySelector('#temp-explain').innerHTML = explain;
}

/**
 * Renames the functions in the page to their Portuguese names and points the
 * links at the Portuguese pages.
 *
 * @param {Record<string, string>} names Portuguese name by English name.
 */
function translateNames(names) {
    const template = content.querySelector('#template');
    let html = template.innerHTML;
    Object.entries(names).forEach(([name, translated]) => {
        html = html.replace(new RegExp(`([^f=\\w])${name}([\\W])`, 'g'), `$1${translated}$2`);
    });
    template.innerHTML = html.replace(/href="function\/([\w]*?)"/g, "href='funcao/$1'");
}

/**
 * Renders a function's page.
 *
 * @param {Record<string, any>} reference Every function's documentation.
 * @returns {Promise<boolean>} Whether the function was shown.
 */
async function showFunction(reference) {
    const item = reference[functionName];
    if (!item) {
        content.innerHTML = renderTemplate(notFoundTemplate, { name: functionName });
        return false;
    }

    const user = await UserModel.current();
    const language = chooseLanguage(user);

    if (item.noversion?.includes(language)) {
        content.innerHTML = renderTemplate(noVersionTemplate, { name: functionName });
        return false;
    }
    item.noversion?.forEach(missing => select.querySelector(`option[value='${missing}']`)?.remove());
    select.value = language;

    if (!item.syntax[language]) {
        location.href = `function/${item.name.default.toLowerCase()}.c`;
        return false;
    }

    const name = language === 'blocks' ? item.name.block : item.name.default;
    document.title = `gladCode - ${name}`;
    document.querySelector('#temp-name').textContent = name;
    const syntax = document.querySelector('#temp-syntax');
    if (language === 'blocks') {
        showBlocks(syntax.parentElement, 'syntax-ws', `<xml>${item.syntax.blocks}</xml>`);
    }
    else {
        showCode(syntax, item.syntax[language], language);
    }
    document.querySelector('#temp-description').innerHTML = item.description.long;

    const params = item.param[language] || item.param.default;
    document.querySelector('#temp-param').insertAdjacentHTML('beforeend', params.map(param => (
        param.name === 'void'
            ? renderTemplate(voidParamTemplate, { description: param.description })
            : renderTemplate(paramTemplate, param)
    )).join(''));
    document.querySelector('#temp-return').innerHTML = item.treturn[language] || item.treturn.default;

    await fillSample(item, reference, language);

    const translations = { [item.name.default]: item.name[dictionary] };
    const rows = item.seealso.map(other => reference[other.toLowerCase()]).filter(Boolean).map(other => {
        translations[other.name.default] = other.name[dictionary];
        const shown = language === 'blocks' ? other.name.block : other.name.default;
        if (!shown) return '';
        return renderTemplate(seeAlsoRowTemplate, {
            link: other.name.default.toLowerCase(),
            name: shown,
            brief: other.description.brief,
        });
    });
    document.querySelector('#temp-seealso').insertAdjacentHTML('beforeend', rows.join(''));

    if (dictionary === 'pt') translateNames(translations);
    return true;
}

/**
 * Opens this function's entry in the side menu of the right documentation
 * (C, Portuguese or blocks).
 */
function highlightMenuEntry() {
    const [place, file] = location.pathname.split('/').slice(-2);
    const [name, ext] = file.split('.');
    const suffix = ext === 'blk' ? '.blk' : '';
    const sectionId = ext === 'blk' ? '#docs-blocks' : place === 'funcao' ? '#docs-ptbr' : '#docs';
    const submenu = document.querySelector(`#side-menu ${sectionId}`)?.nextElementSibling;
    const href = `${place}/${name}${suffix}`;

    submenu?.querySelectorAll('li a').forEach(link => {
        if (link.getAttribute('href') !== href) return;
        const entry = link.parentElement;
        entry.classList.add('here', 'visible');
        [...entry.parentElement.children].forEach(sibling => {
            if (sibling !== entry && sibling.tagName === 'LI') sibling.classList.add('visible');
        });
        for (let list = entry.parentElement; list && list.id !== 'side-menu'; list = list.parentElement) {
            if (list.tagName === 'UL' && list.previousElementSibling?.tagName === 'LI') {
                list.previousElementSibling.classList.add('here', 'visible');
            }
        }
        document.querySelectorAll('#side-menu li.here i').forEach(icon => icon.classList.add('open'));
    });
}

document.querySelector('#learn')?.classList.add('here');
const menu = new SideMenu(document.querySelector('#side-menu'));

select.addEventListener('change', () => {
    const word = dictionary === 'pt' ? 'funcao' : 'function';
    location.href = `${word}/${functionName}.${EXTENSIONS[select.value]}`;
});

if (functionName) {
    FunctionDocsModel.all()
        .then(async reference => {
            await showFunction(reference);
            await menu.ready;
            highlightMenuEntry();
        })
        .catch(() => {
            content.innerHTML = renderTemplate(notFoundTemplate, { name: functionName });
        });
}
else {
    content.innerHTML = renderTemplate(notFoundTemplate, { name: '' });
}
