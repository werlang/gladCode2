import './blocks.js';
import { SideMenu } from './components/side-menu.js';
import { renderTemplate } from './helpers/html.js';
import { PotionModel } from './models/potion.js';
import { apothecaryRowTemplate, potionRowTemplate, silverTemplate } from './templates/manual.js';

/**
 * Turns each `.block-container` holding Blockly XML into a read-only workspace.
 */
function renderBlockSamples() {
    document.querySelectorAll('.block-container').forEach((container, index) => {
        const xml = container.innerHTML;
        container.innerHTML = `<div id='code-ws-${index}' class='block'></div>`;
        const workspace = Blockly.inject(`code-ws-${index}`, { scrollbars: true, readOnly: true });
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xml), workspace);
    });
}

/**
 * Fills the apothecary table: brewing time and upgrade price per level.
 */
async function fillApothecaryTable() {
    const { prices, hours } = await PotionModel.apothecary();
    document.querySelector('#tapot tbody')?.insertAdjacentHTML('beforeend', prices.map((_, index) => renderTemplate(apothecaryRowTemplate, {
        level: index + 1,
        time: hours[index],
        price: index === 0 ? '-' : renderTemplate(silverTemplate, { price: prices[index - 1] }),
    })).join(''));
}

/**
 * Fills the potion table from the catalogue.
 */
async function fillPotionTable() {
    const potions = await PotionModel.catalog();
    document.querySelector('#tpotions tbody')?.insertAdjacentHTML('beforeend', Object.entries(potions).map(([id, potion]) => renderTemplate(potionRowTemplate, {
        name: potion.name,
        level: potion.level,
        id,
        description: potion.description,
        price: renderTemplate(silverTemplate, { price: potion.price }),
    })).join(''));
}

const menu = new SideMenu(document.querySelector('#side-menu'));
document.querySelector('#learn')?.classList.add('here');

menu.ready.then(() => {
    menu.selectCurrentPage();
    renderBlockSamples();
});
fillApothecaryTable();
fillPotionTable();
