# gladCode Gladiator API Reference

The functions a gladiator calls, in **C** (`Payload/gladCodeAPI.c`, plus Portuguese aliases in
`ptbrFunc.c`), **Python** (`Payload/gladCodeAPI.py`) and **JavaScript** (`Payload/gladCodeAPI.js`).
The player-facing reference is generated from `web/public/script/functions/<name>.json` (syntax,
snippet, sample and return text per language); this table is built from the same data.

---

## 🛰️ Socket protocol

Every engine call is one synchronous TCP message to `gladCodeServerMain` on `127.0.0.1:8888`,
answered before the next one. `setSpritesheet` is the exception: it is an editor-source declaration
and the runtime clients do not send it.

```
<command> [arg1] [arg2] ...
```

The raw answer is text: usually a number, `0`/`1` for yes/no, `done`, a name, or `SANDBOX ONLY`.
The public functions convert it:

| Answer | C | Python | JavaScript |
| :--- | :--- | :--- | :--- |
| number | `float`/`int` | `float`/`int` | `number` |
| yes/no | `int` (1/0) | `True`/`False` | `true`/`false` |
| target position/speed/heading/distance out of sight (`getTargetX`, `getTargetY`, `getTargetSpeed`, `getTargetHead`, `getDistToTarget`) | `-1` | `False` | `false` |
| target health with no visible target (`getTargetHealth`) | `-1` | `-1` | `false` |
| target status with no visible target (`isStunned`, `isBurning`, `isProtected`, `isRunning`, `isSlowed`) | `-1` (truthy) | `True` (legacy `bool(-1)`) | `false` |
| connection closed (raw transport) | `0` | `0` | `"0"` |

`setName` sends spaces as `#`. Since the protocol is plain text, a new language only needs a
client that sends these strings (see *Adding a language* below).

---

## 📚 Functions

Python and JavaScript share the call syntax (`getDist(x, y)`); the C column shows the types.

| Function | C | Python / JavaScript | Description |
| :--- | :--- | :--- | :--- |
| `ambush` | `int ambush ( void );` | `ambush()` | Torna-se invisível e pode atordoar o alvo. |
| `assassinate` | `int assassinate ( float x, float y );` | `assassinate(x, y)` | Dispara um ataque que pode causar dano e efeito adicional no alvo. |
| `attackMelee` | `void attackMelee ( void );` | `attackMelee()` | Realiza um ataque corpo-a-corpo. |
| `attackRanged` | `int attackRanged ( float x, float y );` | `attackRanged(x, y)` | Realiza um ataque de longa distância. |
| `block` | `int block ( void );` | `block()` | Aumenta a defesa do gladiador. |
| `charge` | `int charge ( void );` | `charge()` | Corre em direção ao alvo e o ataca. |
| `doYouSeeMe` | `int doYouSeeMe ( void );` | `doYouSeeMe()` | Descobre se o alvo enxerga o gladiador. |
| `fireball` | `int fireball ( float x, float y );` | `fireball(x, y)` | Arremessa um projétil flamejante. |
| `getAGI` | `int getAGI ( void );` | `getAGI()` | Retorna o valor do atributo Agilidade (AGI) do gladiador. |
| `getAmbushTimeLeft` | `float getAmbushTimeLeft ( void );` | `getAmbushTimeLeft()` | Retorna o tempo restante para expirar o efeito Invisibilidade. |
| `getAngle` | `float getAngle ( float x, float y );` | `getAngle(x, y)` | Retorna o ângulo até o ponto. |
| `getAp` | `float getAp ( void );` | `getAp()` | Retorna os pontos de habilidade do gladiador. |
| `getBlockTimeLeft` | `float getBlockTimeLeft ( void );` | `getBlockTimeLeft()` | Retorna o tempo restante para expirar o efeito Proteção. |
| `getBurnTimeLeft` | `float getBurnTimeLeft ( void );` | `getBurnTimeLeft()` | Retorna o tempo restante para expirar o efeito Queimadura. |
| `getCloseEnemy` | `int getCloseEnemy ( void );` | `getCloseEnemy()` | Procura um inimigo próximo. |
| `getDist` | `float getDist ( float x, float y );` | `getDist(x, y)` | Retorna a distância até o ponto. |
| `getDistToTarget` | `float getDistToTarget ( void );` | `getDistToTarget()` | Retorna a distância até o alvo fixado. |
| `getFarEnemy` | `int getFarEnemy ( void );` | `getFarEnemy()` | Procura um inimigo distante. |
| `getHead` | `float getHead ( void );` | `getHead()` | Retorna a direção do gladiador. |
| `getHighHp` | `int getHighHp ( void );` | `getHighHp()` | Procura um inimigo com mais vida. |
| `getHit` | `int getHit ( void );` | `getHit()` | Descobre se o gladiador foi atacado. |
| `getHp` | `float getHp ( void );` | `getHp()` | Retorna os pontos de vida do gladiador. |
| `getINT` | `int getINT ( void );` | `getINT()` | Retorna o valor do atributo Inteligência (INT) do gladiador. |
| `getLastHitAngle` | `float getLastHitAngle ( void );` | `getLastHitAngle()` | Retorna o ângulo de onde veio o último ataque. |
| `getLastHitTime` | `float getLastHitTime ( void );` | `getLastHitTime()` | Retorna o tempo desde o último ataque recebido. |
| `getLowHp` | `int getLowHp ( void );` | `getLowHp()` | Procura um inimigo com menos vida. |
| `getLvl` | `int getLvl ( void );` | `getLvl()` | Retorna o nível do gladiador. |
| `getSafeRadius` | `float getSafeRadius ( void );` | `getSafeRadius()` | Retorna o raio da área livre de nuvem tóxica. |
| `getSimTime` | `float getSimTime ( void );` | `getSimTime()` | Retorna o tempo da simulação. |
| `getSpeed` | `float getSpeed ( void );` | `getSpeed()` | Retorna a velocidade do gladiador. |
| `getSTR` | `int getSTR ( void );` | `getSTR()` | Retorna o valor do atributo Força (STR) do gladiador. |
| `getTargetHead` | `float getTargetHead ( void );` | `getTargetHead()` | Retorna a direção do alvo. |
| `getTargetHealth` | `float getTargetHealth ( void );` | `getTargetHealth()` | Retorna a vida do alvo. |
| `getTargetSpeed` | `float getTargetSpeed ( void );` | `getTargetSpeed()` | Retorna a velocidade do alvo. |
| `getTargetX` | `float getTargetX ( void );` | `getTargetX()` | Retorna o valor da coordenada x do alvo. |
| `getTargetY` | `float getTargetY ( void );` | `getTargetY()` | Retorna o valor da coordenada y do alvo. |
| `getX` | `float getX ( void );` | `getX()` | Retorna a coordenada x do gladiador. |
| `getY` | `float getY ( void );` | `getY()` | Retorna a coordenada y do gladiador. |
| `howManyEnemies` | `int howManyEnemies ( void );` | `howManyEnemies()` | Retorna a quantidade de inimigos no campo de visão. |
| `isBurning` | `int isBurning ( void );` | `isBurning()` | Verifica se o alvo está queimando. |
| `isItemReady` | `int isItemReady ( char *item );` | `isItemReady(item)` | Verifica se o item está disponível para ser usado. |
| `isProtected` | `int isProtected ( void );` | `isProtected()` | Verifica se o alvo está protegido. |
| `isRunning` | `int isRunning ( void );` | `isRunning()` | Verifica se o alvo está correndo. |
| `isSafeHere` | `int isSafeHere ( void );` | `isSafeHere()` | Descobre se o gladiador está em uma posição segura, fora da nuvem tóxica. |
| `isSafeThere` | `int isSafeThere ( float x, float y );` | `isSafeThere(x, y)` | Descobre se o ponto está em uma posição segura, fora da nuvem tóxica. |
| `isSlowed` | `int isSlowed ( void );` | `isSlowed()` | Verifica se o alvo está lento. |
| `isStunned` | `int isStunned ( void );` | `isStunned()` | Verifica se o alvo está atordoado. |
| `isTargetVisible` | `int isTargetVisible ( void );` | `isTargetVisible()` | Descobre se alvo está no campo de visão e pode ser visto. |
| `lvlUp` | `void lvlUp ( int valor );` | `lvlUp(valor)` | Faz com que o gladiador ganhe níveis. |
| `moveForward` | `void moveForward ( float passos );` | `moveForward(passos)` | Move o gladiador para frente uma quantidade de passos. |
| `moveTo` | `int moveTo ( float x, float y );` | `moveTo(x, y)` | Move o gladiador em direção a um ponto. |
| `moveToTarget` | `int moveToTarget ( void );` | `moveToTarget()` | Move o gladiador em direção ao alvo. |
| `setAGI` | `void setAGI ( int valor );` | `setAGI(valor)` | Atribui um valor para o atributo Agilidade (AGI) do gladiador. |
| `setAp` | `void setAp ( float valor );` | `setAp(valor)` | Modifica os pontos de habilidade do gladiador. |
| `setHp` | `void setHp ( float valor );` | `setHp(valor)` | Modifica os pontos de vida do gladiador. |
| `setINT` | `void setINT ( int valor );` | `setINT(valor)` | Atribui um valor para o atributo Inteligência (INT) do gladiador. |
| `setName` | `void setName ( char * nome );` | `setName(nome)` | Atribui um nome para o gladiador. |
| `setPosition` | `void setPosition ( float x, float y );` | `setPosition(x, y)` | Posiciona o gladiador em um ponto da arena. |
| `setSpritesheet` | `void setSpritesheet ( char * hash );` | `setSpritesheet(hash)` | Declara a aparência que o editor associa ao gladiador. |
| `setSTR` | `void setSTR ( int valor );` | `setSTR(valor)` | Atribui um valor para o atributo Força (STR) do gladiador. |
| `speak` | `void speak ( char * formato, ... );` | `speak(texto)` | Mostra um balão de fala com uma mensagem. |
| `stepBack` | `float stepBack ( void );` | `stepBack()` | Move o gladiador para trás. |
| `stepForward` | `float stepForward ( void );` | `stepForward()` | Move o gladiador para frente. |
| `stepLeft` | `float stepLeft ( void );` | `stepLeft()` | Move o gladiador para esquerda. |
| `stepRight` | `float stepRight ( void );` | `stepRight()` | Move o gladiador para direita. |
| `teleport` | `int teleport ( float x, float y );` | `teleport(x, y)` | Transporta instantaneamente o gladiador. |
| `turn` | `void turn ( float angulo );` | `turn(angulo)` | Rotaciona o gladiador. |
| `turnLeft` | `float turnLeft ( float angulo );` | `turnLeft(angulo)` | Rotaciona o gladiador no sentido anti-horário. |
| `turnRight` | `float turnRight ( float angulo );` | `turnRight(angulo)` | Rotaciona o gladiador no sentido horário. |
| `turnTo` | `int turnTo ( float x, float y );` | `turnTo(x, y)` | Rotaciona o gladiador para um ponto. |
| `turnToAngle` | `int turnToAngle ( float angulo );` | `turnToAngle(angulo)` | Rotaciona o gladiador para um ângulo. |
| `turnToLastHit` | `int turnToLastHit ( void );` | `turnToLastHit()` | Rotaciona o gladiador para a origem do último ataque recebido. |
| `turnToTarget` | `int turnToTarget ( void );` | `turnToTarget()` | Rotaciona o gladiador para o alvo. |
| `upgradeAGI` | `int upgradeAGI ( int pontos );` | `upgradeAGI(pontos)` | Aprimora o atributo Agilidade. |
| `upgradeINT` | `int upgradeINT ( int pontos );` | `upgradeINT(pontos)` | Aprimora o atributo Inteligência. |
| `upgradeSTR` | `int upgradeSTR ( int pontos );` | `upgradeSTR(pontos)` | Aprimora o atributo Força. |
| `useItem` | `int useItem ( char *item );` | `useItem(item)` | Usa um item encomendado do apotecário. |

Internal client calls, not listed in the player reference: `getName()`, `setSlots("a,b,c,d")`
(written by the server's `setup()`) and `breakpoint("text")` (inserted by the API before the
editor's breakpoint lines). `setPosition`, `setHp`, `setAp` and `lvlUp` only work in editor test
battles (`sandbox`).

---

## 🟨 JavaScript client

- **Runtime**: Node.js 22 in the `gladcode2-vm` image (copied from `node:22-alpine` with its musl
  loader; gcc 4.8 and Python 3.4 of the Ubuntu 14.04 base stay as they were). `socket_compile.sh`
  runs `node --no-warnings gladCodeCore.js code<i>.js 2>> errorc.txt`; the engine treats a
  `code<i>.js` like a `code<i>.py` (no binary to wait for).
- **Synchronous calls**: Node sockets are asynchronous, so `gladCodeCore.js` keeps the TCP
  connection in a worker thread and blocks the main thread on `Atomics.wait` until the answer
  lands in a `SharedArrayBuffer`. Gladiator code is plain synchronous JavaScript, like C and
  Python: `loop()` must be an ordinary function (`async` and generators are refused), and timers
  or promises never get a turn.
- **File layout**: the run folder's `code<i>.js` is the full source as stored: the server's
  `setup()`, the line `// start of user code`, then the user code. `gladCodeCore.js` compiles
  the part before that marker on its own (the API names are its parameters), so a `setup()`
  declared (say, copied from a sample) or an API function redefined by user code does not change
  the attributes. This guards against mistakes only: see *Trust*. The user code
  then runs as a classic script in the global scope, where the API functions are globals; it must
  declare `loop` (`function loop()` or `const loop = () => ...`). Calling the API at the top
  level throws (there is no connection before `setup()`).
- **Errors**: syntax and runtime errors go to `errorc.txt` with line numbers counted from the
  first user line (the editor's numbering) and the client's own stack frames removed; a crash
  mid-battle closes the socket, so the engine marks the gladiator `"crashed":1` like a C or
  Python crash. Sandbox battles show `errorc.txt` to the player; battles that count ignore it.
- **Messages** are cut at 1999 UTF-8 bytes: the engine reads 2000 at a time, and a longer
  message would answer twice and put every later reply out of step. (The engine keeps less
  anyway: 299 bytes per command, `explodeFunc.c`, and 249 for speech; C builds `speak` in a
  1000-byte buffer.)
- **Language detection** (`api/helpers/gladiator-code.js` `detectLanguage`, and the same rule
  in `web/public/script/helpers/code-language.js`): `def loop():` is Python; a `loop(){` line
  (also `void loop()`, brace on the next line) is C; a line starting with `function loop(` or
  `loop =` (optionally declared `const`, `let` or `var`) is JavaScript; anything else is C. C is checked before JavaScript and
  the JavaScript patterns must start a line, so a comment or a string never moves a saved C
  gladiator. The flip side: JavaScript with a `loop(){` line (in a block comment, a method
  shorthand, a bare `loop()` call line) reads as C and fails at once in the editor test.
  `globalThis.loop = ...` is not recognised.
- **Trust**: like Python, a JavaScript gladiator has the whole runtime (`process`, sockets) and can
  read the run folder. It can also call the client's exported raw `sendMessage()` before the
  server-written `setup()` runs, forging its name, redistributing attributes within the 50-point
  budget the engine enforces, or requesting potion slots. Compiling `setup()` apart prevents
  accidental overrides, not attacks; the container is the sandbox. Closing this needs checks in
  the engine (slots and names against what the API sent), not in the clients.

## ➕ Adding a language

1. A client in `Payload/` sending the protocol above and running `setup()` then
   `while (running()) loop()`; an entry in `socket_compile.sh`; the engine's wait loop in
   `gladCodeServerMain.c` learns its file extension; the interpreter in `Setup/Dockerfile`.
2. `api/helpers/gladiator-code.js`: `detectLanguage`, `setupBlock`, `insertBreakpoints`,
   `engineSource`, `stripSetup`; `LANGUAGES` in `api/model/user.js`.
3. Web: `helpers/code-language.js`, `editor/attributes.js` `gladiatorSource`, the editor's starter
   code, the tutorial branches, the language selects (profile, function page), `function.js`
   URL extensions, `simulation-report.js` file names.
4. Reference: a syntax/snippet/sample entry per function JSON and the samples, then
   `web/scripts/compress-functions.js`.
5. Tests: `tests/engine/run.sh` battles (healthy, crashes, stderr forge, speak injection).
