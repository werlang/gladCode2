/** Dialog shell; `#fog`, `#dialog-box` and friends are styled by css/dialog.css. */
export const dialogTemplate = `
<div id='fog' class='dialog-fog'>
    <div id='dialog-box' class='{{boxClass}}' role='dialog' aria-modal='true'>
        <div id='message'>{{{message}}}</div>
        {{{field}}}
        <div id='button-container'>{{{buttons}}}</div>
    </div>
</div>`;

export const dialogButtonTemplate = `<button type='button' class='button' id='dialog-button-{{id}}'>{{{label}}}</button>`;

export const dialogInputTemplate = `<input type='text' class='input' value='{{value}}' placeholder='{{placeholder}}'>`;

export const terminalTemplate = `
<div id='fog' class='dialog-fog'>
    <div id='terminal' role='dialog' aria-modal='true'>
        <div id='title'><span>{{title}}</span><div id='close' role='button' tabindex='0' aria-label='Fechar'></div></div>
        <pre>{{{message}}}</pre>
    </div>
</div>`;

export const toastTemplate = `<div class='toast {{type}}' role='status'><i class='fas fa-{{icon}}'></i><span>{{{message}}}</span></div>`;
