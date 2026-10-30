export const savingTemplate = `
<div id='fog'>
    <div id='save-box' role='dialog' aria-modal='true'>
        <div id='message'>Gravando alterações no gladiador <span class='highlight'>{{name}}</span>. Aguarde...</div>
        <div id='button-container'><button class='button neutral'>OK</button></div>
    </div>
</div>`;

export const opponentTemplate = `<div class='glad' role='button' tabindex='0'><div class='name'>{{name}}</div><div class='diff {{difficulty}}'><div class='bar'></div><div class='bar'></div><div class='bar'></div></div></div>`;

export const codeBoxTemplate = `
<div id='fog'>
    <div id='code-box' role='dialog' aria-modal='true'>
        {{{content}}}
        <div id='button-container'><button id='close' class='button'>Fechar</button></div>
    </div>
</div>`;

export const settingsTemplate = `
<div id='fog'>
    <div id='settings-window' role='dialog' aria-modal='true' aria-label='Preferências do editor'>
        <div id='title'><h2>Preferências do editor</h2></div>
        <div id='settings-content'>
            <div id='options'>
                <h3>Temas</h3>
                <div id='list'>{{{themes}}}</div>
                <h3>Tamanho da fonte</h3>
                <div id='font-size'>
                    <button class='button font-small' aria-label='Diminuir fonte'><img src='icon/font_minus.png' alt=''></button>
                    <button class='button font-big' aria-label='Aumentar fonte'><img src='icon/font_plus.png' alt=''></button>
                </div>
            </div>
            <div id='sample'><h3>Visualização</h3><pre id='code-sample'></pre></div>
        </div>
        <div id='button-container'><button class='button block' id='cancel'>Cancelar</button><button class='button block' id='change'>ALTERAR</button></div>
    </div>
</div>`;

export const themeTemplate = `<div class='theme {{selected}}' role='button' tabindex='0'>{{name}}</div>`;

export const helpTemplate = `
<div id='fog'>
    <div id='help-window' role='dialog' aria-modal='true' aria-label='Ajuda'>
        <div id='title'>Que tipo de ajuda você gostaria?</div>
        <div id='cat-container'>
            <div id='docs' class='categories' role='button' tabindex='0'><img src='icon/document.png' alt=''><span>Leitura</span></div>
            <div id='video' class='categories' role='button' tabindex='0'><img src='icon/video.png' alt=''><span>Vídeo</span></div>
            <div id='tutorial' class='categories' role='button' tabindex='0'><img src='icon/tutor.png' alt=''><span>Tutorial</span></div>
        </div>
    </div>
</div>`;

export const helpDocsTemplate = `<div id='subcat'><a href='manual' class='button' target='_blank'>Manual da gladCode</a><a href='docs' class='button' target='_blank'>Referência das funções</a></div>`;

export const helpVideosTemplate = `<div id='subcat'>{{{buttons}}}</div>`;

export const helpVideoButtonTemplate = `<button class='video button'>{{title}}</button>`;

export const videoTemplate = `
<div id='fog' class='dark'>
    <div id='video-container'>
        <iframe width='100%' height='100%' src='https://www.youtube.com/embed/{{id}}' frameborder='0' allowfullscreen></iframe>
        <div id='remove' role='button' tabindex='0' aria-label='Fechar vídeo'></div>
    </div>
</div>`;

/** The sample program of the settings preview. */
export const sampleCode = 'int start = 1;\n\nloop(){\n    upgradeSTR(5);\n    if (getCloseEnemy()){\n        float dist = getDist(getTargetX(), getTargetY());\n        if (dist < 0.8 && isTargetVisible()){\n            attackMelee();\n        }\n        else\n            moveToTarget();\n    }\n    else{\n        if (start){\n            if(moveTo(12.5,12.5))\n                start = 0;\n        }\n        else\n            turnLeft(50);\n    }\n}';
