/** A gladiator card, styled by css/glad-card.css. */
export const gladCardTemplate = `
<div class='glad-preview'>
    <div class="delete-container">
        <div class="delete" title="Clique para remover o gladiador"><img src="icon/delete.png" alt="Remover"></div>
    </div>
    <div class='image'></div>
    <div class='info'>
        <div class='row attr'>
            <div class='str' title='Força'><img src='res/str_icon.png' alt=''><span>{{vstr}}</span></div>
            <div class='agi' title='Agilidade'><img src='sprite/images/sprint.png' alt=''><span>{{vagi}}</span></div>
            <div class='int' title='Inteligência'><img src='res/int_icon.png' alt=''><span>{{vint}}</span></div>
        </div>
        <div class='row glad'><span>{{name}}</span></div>
        <div class='row master'>{{master}}</div>
        <div class='row code'>
            <button class='button' title='Ver código-fonte'>&lt;/&gt;</button>
        </div>
    </div>
</div>`;

export const codeBlocksModalTemplate = `
<div id='fog' class='code'>
    <div class='float-box'>
        <div id='code-ws'></div>
        <div id='button-container'><button class='button'>FECHAR</button></div>
    </div>
</div>`;

export const codeModalTemplate = `
<div id='fog' class='code'>
    <div class='float-box'>
        <pre id='code' class='line-numbers language-{{language}}'><code class='language-{{language}}'>{{code}}</code></pre>
        <div id='button-container'><button class='button'>FECHAR</button></div>
    </div>
</div>`;
