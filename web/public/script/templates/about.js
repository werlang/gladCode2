/** Crypto wallet window of the donation section. */
export const walletTemplate = `
<div id='fog'>
    <div id='crypto-box' class='size-{{size}}' role='dialog' aria-modal='true' aria-label='Carteira {{name}}'>
        <div id='close' role='button' tabindex='0' aria-label='Fechar'>X</div>
        <div id='title'>Carteira {{name}}:</div>
        <div id='qrcode'><img src='{{qrcode}}' alt='QR code da carteira {{name}}'></div>
        <div id='wallet' role='button' tabindex='0' title='Copiar para área de transferência'><img src='{{icon}}' alt=''><span>{{pretty}}</span></div>
    </div>
</div>`;
