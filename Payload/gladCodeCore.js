/*
programa cliente JavaScript. responsavel pela simulacao do ponto de vista do gladiador.
Equivalente ao gladCodeCore.c e ao gladCodeCore.py. Todas as funções que o usuario pode chamar
diretamente estão em gladCodeAPI.js.

Uso (socket_compile.sh): node gladCodeCore.js code<i>.js
- inicia a comunicacao com o servidor
- roda o codigo do usuario (funções setup e loop)
- faz a chamada do setup, espera os outros gladiadores e chama o loop enquanto a simulacao rodar
- termina a comunicacao com o servidor

O servidor responde cada mensagem antes da próxima, e as funções da API retornam essa resposta.
Sockets do Node são assíncronos, então a conexão fica numa worker thread e a thread principal
espera cada resposta com Atomics.wait: o código do usuário é síncrono como em C e Python.
*/

const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

const HOST = '127.0.0.1';
const PORT = 8888;
/** Maior resposta aceita, em bytes (o servidor responde no máximo 2000). */
const REPLY_BYTES = 65536;
/**
 * Maior mensagem enviada, em bytes: o servidor lê 2000 por vez, e uma mensagem maior viraria duas
 * respostas, tirando as próximas do passo (o C corta speak em 999 caracteres pelo mesmo motivo).
 */
const MESSAGE_BYTES = 1999;
/** Mensagem interna: a worker responde quando estiver conectada ao servidor. */
const CONNECT = '\u0000connect';
/** Linha que o servidor escreve antes do código do usuário (ver setupBlock em api/helpers/gladiator-code.js). */
const USER_CODE_MARKER = '// start of user code';

// ---------------------------------------------------------------------------------------------
// worker thread: guarda a conexão TCP e devolve cada resposta na memória compartilhada
// ---------------------------------------------------------------------------------------------

/**
 * Conecta ao servidor (tentando de novo a cada 10 ms, como o cliente Python) e repassa as
 * mensagens da thread principal. Cada resposta é escrita em `bytes`, seu tamanho em `state[1]`,
 * e `state[0]` vira 1 para acordar a thread principal. Uma conexão fechada responde vazio.
 */
function socketWorker() {
    const net = require('node:net');
    const state = new Int32Array(workerData.shared, 0, 2);
    const bytes = new Uint8Array(workerData.shared, 8);

    let socket = null;
    let connected = false;
    let closed = false;
    let pending = false;
    let waitingConnect = false;

    const reply = text => {
        const data = Buffer.from(text, 'utf8').subarray(0, REPLY_BYTES);
        bytes.set(data);
        Atomics.store(state, 1, data.length);
        Atomics.store(state, 0, 1);
        Atomics.notify(state, 0);
    };

    const connect = () => {
        socket = net.connect(PORT, HOST);
        socket.setNoDelay(true);
        socket.on('connect', () => {
            connected = true;
            if (waitingConnect) {
                waitingConnect = false;
                reply('1');
            }
        });
        socket.on('data', chunk => {
            if (!pending) return;
            pending = false;
            reply(chunk.toString('utf8'));
        });
        socket.on('error', () => {
            // servidor ainda não está escutando: tenta de novo
            if (!connected) setTimeout(connect, 10);
        });
        socket.on('close', () => {
            if (!connected) return;
            closed = true;
            if (pending) {
                pending = false;
                reply('');
            }
        });
    };

    parentPort.on('message', message => {
        if (message === CONNECT) {
            if (connected) reply('1');
            else waitingConnect = true;
            return;
        }
        if (closed || !connected) {
            reply('');
            return;
        }
        pending = true;
        socket.write(message, 'utf8');
    });

    connect();
}

// ---------------------------------------------------------------------------------------------
// thread principal: envia mensagens e espera as respostas
// ---------------------------------------------------------------------------------------------

let worker = null;
let state = null;
let bytes = null;
const decoder = new TextDecoder('utf-8');

/**
 * Corta uma mensagem em {@link MESSAGE_BYTES} bytes UTF-8 sem partir um caractere.
 *
 * @param {string} message
 * @returns {string}
 */
function limitMessage(message) {
    const data = Buffer.from(message, 'utf8');
    if (data.length <= MESSAGE_BYTES) return message;
    return data.subarray(0, MESSAGE_BYTES).toString('utf8').replace(/\uFFFD+$/, '');
}

/**
 * Envia uma mensagem ao servidor e espera a resposta.
 *
 * @param {string} message Comando e argumentos separados por espaço (ex. `moveTo 12.5 12.5`).
 * @returns {string} A resposta, ou `"0"` quando a conexão foi fechada.
 */
function sendMessage(message) {
    if (!worker) throw new Error('As funções da gladCode só podem ser chamadas dentro de setup() e loop()');
    Atomics.store(state, 0, 0);
    worker.postMessage(limitMessage(`${message}`));
    Atomics.wait(state, 0, 0);
    const reply = decoder.decode(bytes.slice(0, Atomics.load(state, 1)));
    return reply === '' ? '0' : reply;
}

/** Inicia a worker thread e espera a conexão com o servidor. */
function initClient() {
    const shared = new SharedArrayBuffer(8 + REPLY_BYTES);
    state = new Int32Array(shared, 0, 2);
    bytes = new Uint8Array(shared, 8);
    worker = new Worker(__filename, { workerData: { shared } });
    worker.unref();
    sendMessage(CONNECT);
}

/** @returns {boolean} Se a simulação começou (todos os gladiadores prontos). */
function startSim() {
    return Boolean(parseInt(sendMessage('startSimulation'), 10));
}

/** @returns {boolean} Se a simulação ainda roda para este gladiador. */
function running() {
    return Boolean(parseInt(sendMessage('isSimRunning'), 10));
}

function endSocketComm() {
    sendMessage('endSocketComm');
}

/**
 * Separa o arquivo do gladiador no marcador que o servidor escreve depois do `setup()`. Aceita
 * quebras de linha `\r\n` (código colado de um editor no Windows).
 *
 * @param {string} code Arquivo completo.
 * @returns {{ setup: string, user: string }} `setup` é o que vem antes do marcador (vazio sem
 *   marcador) e `user` o código do usuário, compilado à parte para que os erros contem as linhas a
 *   partir dele, como o editor as mostra.
 */
function splitSource(code) {
    const lines = code.split(/\r?\n/);
    const marker = lines.indexOf(USER_CODE_MARKER);
    if (marker === -1) return { setup: '', user: code };
    return { setup: lines.slice(0, marker).join('\n'), user: lines.slice(marker + 1).join('\n') };
}

/**
 * Escreve um erro do código do usuário em stderr (errorc.txt) sem as linhas internas do cliente.
 *
 * @param {unknown} error
 * @param {string} filename Nome do arquivo do gladiador (ex. `code0.js`).
 */
function reportError(error, filename) {
    let text = error instanceof Error && error.stack ? error.stack : String(error);
    // o Node mostra antes do erro a linha que o lançou: só serve quando ela é do usuário
    const source = /^(.+):\d+\n[\s\S]*?\n\n/.exec(text);
    if (source && source[1] !== filename) text = text.slice(source[0].length);
    const lines = text.split('\n').filter(line => !/^\s+at /.test(line) || line.includes(filename));
    process.stderr.write(`${lines.join('\n')}\n`);
}

/**
 * Roda um gladiador. As funções da API ficam globais. O `setup()` que o servidor escreveu antes do
 * marcador é compilado à parte, com as funções da API como parâmetros, então um `setup()` declarado
 * pelo usuário (ex. copiado de um exemplo) ou uma função da API redefinida por ele não muda os
 * atributos. Não é uma barreira de segurança: como em Python, o código do usuário tem o Node inteiro
 * (`process`, sockets) e o contêiner é o sandbox. Depois roda o código do usuário no contexto global,
 * que declara `loop()` (`function loop()`, ou `const loop = () => ...`), e o ciclo da simulação.
 *
 * @param {string} file Caminho do arquivo do gladiador.
 */
function main(file) {
    const fs = require('node:fs');
    const path = require('node:path');
    const vm = require('node:vm');
    const filename = path.basename(file);
    const { setup: setupCode, user } = splitSource(fs.readFileSync(file, 'utf8'));
    const api = require('./gladCodeAPI.js');

    let setup;
    let loop;
    try {
        if (setupCode) {
            const names = Object.keys(api);
            setup = vm.compileFunction(`${setupCode}\nreturn typeof setup === 'function' ? setup : undefined;`, names, { filename: 'setup.js' })(...names.map(name => api[name]));
        }
        Object.assign(globalThis, api);
        new vm.Script(user, { filename }).runInThisContext();
        loop = vm.runInThisContext("typeof loop === 'function' ? loop : undefined");
        if (!loop) throw new ReferenceError('function loop() não foi declarada');
        if (loop.constructor.name !== 'Function') throw new TypeError('loop() precisa ser uma função comum (sem async ou function*)');
    }
    catch (error) {
        reportError(error, filename);
        process.exit(1);
    }

    try {
        initClient();
        setup?.();
        if (startSim()) {
            while (running()) loop();
        }
        endSocketComm();
    }
    catch (error) {
        reportError(error, filename);
        process.exit(1);
    }
    process.exit(0);
}

// gladCodeAPI.js guarda sendMessage ao ser carregado
module.exports = { sendMessage };

if (!isMainThread) socketWorker();
else if (require.main === module) main(process.argv[2]);
