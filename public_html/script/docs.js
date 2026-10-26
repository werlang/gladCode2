import { SideMenu } from './components/side-menu.js';
import { FunctionDocsModel } from './models/function-docs.js';

/** Link prefix, name field and link suffix of each documentation flavour. */
const FLAVOURS = {
    'docs-blocks': { path: 'function', name: 'block', ext: '.blk' },
    'docs-ptbr': { path: 'funcao', name: 'pt', ext: '' },
    docs: { path: 'function', name: 'default', ext: '' },
};

/**
 * Fills the function tables: each link gets its flavour's name and URL, and
 * the next cell the function's brief description.
 */
async function fillFunctionTables() {
    const page = location.pathname.split('/').at(-1);
    const flavour = FLAVOURS[page] ?? FLAVOURS.docs;
    const functions = await FunctionDocsModel.all();

    document.querySelectorAll('.t-funcs a').forEach(link => {
        const key = link.getAttribute('href');
        const doc = functions[key];
        if (!doc) return;
        link.href = `${flavour.path}/${key}${flavour.ext}`;
        link.textContent = doc.name[flavour.name];
        const cell = link.closest('td');
        [...cell.parentElement.children]
            .filter(sibling => sibling !== cell)
            .forEach(sibling => {
                sibling.innerHTML = doc.description.brief;
            });
    });
}

const menu = new SideMenu(document.querySelector('#side-menu'));
document.querySelector('#learn')?.classList.add('here');
menu.ready.then(() => menu.selectCurrentPage());
fillFunctionTables();
