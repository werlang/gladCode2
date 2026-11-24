/*
contém as funções que podem ser chamadas diretamente pelo usuário (versão JavaScript do
gladCodeAPI.py). Estas funções somente enviam sinais do cliente para o servidor. O servidor é quem
executa as funções e devolve a resposta. gladCodeCore.js as torna globais antes de rodar o código
do gladiador.
*/

const { sendMessage } = require('./gladCodeCore.js');

/** @param {string} message @returns {string} A resposta do servidor. */
const send = message => sendMessage(message);
/** @param {string} message @returns {number} A resposta como número. */
const toFloat = message => parseFloat(send(message));
/** @param {string} message @returns {number} A resposta como inteiro. */
const toInt = message => parseInt(send(message), 10);
/** @param {string} message @returns {boolean} A positive answer is true; `0` and `-1` (no target) are false. */
const toBool = message => parseInt(send(message), 10) > 0;
/** @param {string} message @returns {number|false} A resposta como número, ou `false` quando negativa (alvo fora de vista). */
const toFloatOrFalse = message => {
    const value = toFloat(message);
    return value < 0 ? false : value;
};

module.exports = {
    getSimTime: () => toFloat('getSimTime'),

    setSTR: n => { send(`setSTR ${n}`); },
    getSTR: () => toInt('getSTR'),
    setAGI: n => { send(`setAGI ${n}`); },
    getAGI: () => toInt('getAGI'),
    setINT: n => { send(`setINT ${n}`); },
    getINT: () => toInt('getINT'),
    setName: name => { send(`setName ${String(name).replace(/ /g, '#')}`); },
    getName: () => send('getName'),
    upgradeSTR: n => toBool(`upgradeSTR ${n}`),
    upgradeAGI: n => toBool(`upgradeAGI ${n}`),
    upgradeINT: n => toBool(`upgradeINT ${n}`),

    stepForward: () => toFloat('stepForward'),
    stepBack: () => toFloat('stepBack'),
    stepLeft: () => toFloat('stepLeft'),
    stepRight: () => toFloat('stepRight'),
    turnLeft: angle => toFloat(`turnLeft ${angle}`),
    turnRight: angle => toFloat(`turnRight ${angle}`),
    turn: angle => { send(`turn ${angle}`); },
    turnTo: (x, y) => toBool(`turnTo ${x} ${y}`),
    turnToTarget: () => toBool('turnToTarget'),
    turnToAngle: angle => toBool(`turnToAngle ${angle}`),
    moveForward: steps => { send(`moveForward ${steps}`); },
    moveTo: (x, y) => toBool(`moveTo ${x} ${y}`),
    moveToTarget: () => toBool('moveToTarget'),

    getX: () => toFloat('getX'),
    getY: () => toFloat('getY'),
    getHp: () => toFloat('getHp'),
    getAp: () => toFloat('getAp'),
    getSpeed: () => toFloat('getSpeed'),
    getHead: () => toFloat('getHead'),
    getDist: (x, y) => toFloat(`getDist ${x} ${y}`),
    getDistToTarget: () => toFloatOrFalse('getDistToTarget'),
    getAngle: (x, y) => toFloat(`getAngle ${x} ${y}`),

    howManyEnemies: () => toInt('howManyEnemies'),
    getCloseEnemy: () => toBool('getCloseEnemy'),
    getFarEnemy: () => toBool('getFarEnemy'),
    getLowHp: () => toBool('getLowHp'),
    getHighHp: () => toBool('getHighHp'),
    getTargetX: () => toFloatOrFalse('getTargetX'),
    getTargetY: () => toFloatOrFalse('getTargetY'),
    getTargetHealth: () => toFloatOrFalse('getTargetHealth'),
    getTargetSpeed: () => toFloatOrFalse('getTargetSpeed'),
    getTargetHead: () => toFloatOrFalse('getTargetHead'),
    doYouSeeMe: () => toBool('doYouSeeMe'),
    isTargetVisible: () => toBool('isTargetVisible'),

    attackMelee: () => { send('attackMelee'); },
    attackRanged: (x, y) => toBool(`attackRanged ${x} ${y}`),
    getLastHitTime: () => toFloat('getLastHitTime'),
    getLastHitAngle: () => toFloat('getLastHitAngle'),
    turnToLastHit: () => toBool('turnToLastHit'),
    getHit: () => toBool('getHit'),

    getSafeRadius: () => toFloat('getSafeRadius'),
    isSafeHere: () => toBool('isSafeHere'),
    isSafeThere: (x, y) => toBool(`isSafeThere ${x} ${y}`),

    fireball: (x, y) => toBool(`fireball ${x} ${y}`),
    teleport: (x, y) => toBool(`teleport ${x} ${y}`),
    block: () => toBool('block'),
    ambush: () => toBool('ambush'),
    assassinate: (x, y) => toBool(`assassinate ${x} ${y}`),
    charge: () => toBool('charge'),
    getBlockTimeLeft: () => toFloat('getBlockTimeLeft'),
    getAmbushTimeLeft: () => toFloat('getAmbushTimeLeft'),
    getBurnTimeLeft: () => toFloat('getBurnTimeLeft'),

    // aparência é definida pelo editor: não faz nada
    setSpritesheet: _hash => {},

    isStunned: () => toBool('isStunned'),
    isBurning: () => toBool('isBurning'),
    isProtected: () => toBool('isProtected'),
    isRunning: () => toBool('isRunning'),
    isSlowed: () => toBool('isSlowed'),

    speak: message => { send(`speak ${message}`); },
    getLvl: () => toInt('getLvl'),
    breakpoint: message => { send(`breakpoint ${message}`); },

    // somente no editor (sandbox): o servidor ignora estas funções nas outras batalhas
    setPosition: (x, y) => { send(`setPosition ${x} ${y}`); },
    setHp: hp => { send(`setHp ${hp}`); },
    setAp: ap => { send(`setAp ${ap}`); },
    lvlUp: n => { send(`lvlUp ${n}`); },

    useItem: item => toBool(`useItem ${item}`),
    setSlots: slots => { send(`setSlots ${slots}`); },
    isItemReady: item => toBool(`isItemReady ${item}`),
};
