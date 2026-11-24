/**
 * Development-only seed for the local potion catalogue.
 *
 * The engine accepts exactly the identifiers in `Payload/gladCodeGlobals.c` `itemList`; this script
 * adds the missing ones to a development database with sample names, prices and descriptions. It
 * never updates an existing row: production prices and balance are the owner's decision, and the API
 * and UI must render whatever catalogue the database already has.
 *
 * It refuses to run with `NODE_ENV=production`. Usage:
 *   docker compose exec -T api node scripts/seed-dev-potions.js
 */
import { readFile } from 'node:fs/promises';
import { Mysql } from '../helpers/mysql.js';

if (process.env.NODE_ENV === 'production') {
    console.error('seed-dev-potions is for development only; refusing to run with NODE_ENV=production.');
    process.exit(1);
}

/** The engine's potions, in `itemList` order, with sample values for the local stack only. */
const SAMPLE = [
    { identifier: 'pot-hp-1', name: 'Poção de Vida I', price: 40, level: 1, description: 'Recupera parte dos pontos de vida na hora.' },
    { identifier: 'pot-ap-1', name: 'Poção de Habilidade I', price: 40, level: 1, description: 'Recupera parte dos pontos de habilidade na hora.' },
    { identifier: 'pot-hp-2', name: 'Poção de Vida II', price: 80, level: 2, description: 'Recupera mais pontos de vida que a de nível I.' },
    { identifier: 'pot-ap-2', name: 'Poção de Habilidade II', price: 80, level: 2, description: 'Recupera mais pontos de habilidade que a de nível I.' },
    { identifier: 'pot-hp-3', name: 'Poção de Vida III', price: 120, level: 3, description: 'Recupera parte dos pontos de vida na hora.' },
    { identifier: 'pot-ap-3', name: 'Poção de Habilidade III', price: 120, level: 3, description: 'Recupera parte dos pontos de habilidade na hora.' },
    { identifier: 'pot-hp-4', name: 'Poção de Vida IV', price: 200, level: 4, description: 'Recupera mais pontos de vida que a de nível III.' },
    { identifier: 'pot-ap-4', name: 'Poção de Habilidade IV', price: 200, level: 4, description: 'Recupera mais pontos de habilidade que a de nível III.' },
    { identifier: 'pot-hp-5', name: 'Poção de Vida V', price: 300, level: 5, description: 'Recupera a maior parte dos pontos de vida na hora.' },
    { identifier: 'pot-ap-5', name: 'Poção de Habilidade V', price: 300, level: 5, description: 'Recupera a maior parte dos pontos de habilidade na hora.' },
    { identifier: 'pot-high-1', name: 'Tônico do Atributo Forte I', price: 60, level: 2, description: 'Reforça o maior atributo do gladiador nesta batalha.' },
    { identifier: 'pot-high-2', name: 'Tônico do Atributo Forte II', price: 120, level: 3, description: 'Reforça o maior atributo do gladiador nesta batalha.' },
    { identifier: 'pot-high-3', name: 'Tônico do Atributo Forte III', price: 180, level: 4, description: 'Reforça o maior atributo do gladiador nesta batalha.' },
    { identifier: 'pot-high-4', name: 'Tônico do Atributo Forte IV', price: 260, level: 5, description: 'Reforça o maior atributo do gladiador nesta batalha.' },
    { identifier: 'pot-low-1', name: 'Tônico do Atributo Fraco I', price: 60, level: 2, description: 'Reforça o menor atributo do gladiador nesta batalha.' },
    { identifier: 'pot-low-2', name: 'Tônico do Atributo Fraco II', price: 120, level: 3, description: 'Reforça o menor atributo do gladiador nesta batalha.' },
    { identifier: 'pot-low-3', name: 'Tônico do Atributo Fraco III', price: 180, level: 4, description: 'Reforça o menor atributo do gladiador nesta batalha.' },
    { identifier: 'pot-low-4', name: 'Tônico do Atributo Fraco IV', price: 260, level: 5, description: 'Reforça o menor atributo do gladiador nesta batalha.' },
    { identifier: 'pot-xp-1', name: 'Poção de Experiência I', price: 80, level: 1, description: 'Concede experiência ao gladiador na hora.' },
    { identifier: 'pot-xp-2', name: 'Poção de Experiência II', price: 180, level: 2, description: 'Concede mais experiência que a de nível I.' },
    { identifier: 'pot-xp-3', name: 'Poção de Experiência III', price: 260, level: 3, description: 'Concede mais experiência que a de nível II.' },
];

/** The identifiers the engine's `itemList` declares, when the repository is beside the API. */
async function engineIdentifiers() {
    try {
        const source = await readFile(new URL('../../Payload/gladCodeGlobals.c', import.meta.url), 'utf8');
        return [...source.matchAll(/strcpy\(itemList\[\d+\],\s*"([^"]+)"\)/g)]
            .map(match => match[1])
            .filter(Boolean);
    }
    catch {
        return [];
    }
}

const engine = await engineIdentifiers();
if (engine.length && (engine.length !== SAMPLE.length || engine.some((identifier, index) => identifier !== SAMPLE[index].identifier))) {
    console.error('The engine itemList no longer matches this seed; update api/scripts/seed-dev-potions.js first.');
    process.exit(1);
}

const known = new Set((await Mysql.select('SELECT identifier FROM items')).map(row => row.identifier));
let inserted = 0;
for (const potion of SAMPLE) {
    if (known.has(potion.identifier)) continue;
    await Mysql.insert('items', {
        identifier: potion.identifier,
        name: potion.name,
        price: potion.price,
        lvl: potion.level,
        description: potion.description,
        icon: 'icon/potion.png',
    });
    inserted += 1;
}
await Mysql.close();
console.log(`Dev potion catalogue: ${inserted} item(s) added, ${SAMPLE.length - inserted} already present.`);
