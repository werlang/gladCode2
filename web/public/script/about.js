import { Message } from './components/dialog.js';
import { decorateRadios } from './components/form-controls.js';
import { createElement, renderTemplate } from './helpers/html.js';
import { fadeIn, fadeOut, hide, show, slideDown } from './helpers/animate.js';
import { ThanksModel } from './models/thanks.js';
import { walletTemplate } from './templates/about.js';

/** Donation wallets; `groups` splits the address into readable chunks. */
const WALLETS = {
    bitcoin: {
        name: 'Bitcoin',
        address: '351JhGwhqGckt6P4F8cSsFCgsHKHCU8tjD',
        icon: 'icon/bitcoin.png',
        qrcode: 'image/qr_btc.png',
        groups: [4, 4, 4, 5, 4, 4, 4, 5],
    },
    ethereum: {
        name: 'Ethereum',
        address: '0x50E9BBf49C6329FC97493d012fEBB4D04d5de37e',
        icon: 'icon/ethereum.png',
        qrcode: 'image/qr_eth.png',
        groups: [4, 4, 4, 4, 5, 4, 4, 4, 4, 5],
    },
};

/**
 * Splits a wallet address into space-separated chunks.
 *
 * @param {string} address Wallet address.
 * @param {number[]} groups Chunk lengths.
 * @returns {string}
 */
function prettyAddress(address, groups) {
    let start = 0;
    return groups.map(length => {
        const chunk = address.substring(start, start + length);
        start += length;
        return chunk;
    }).join(' ');
}

/**
 * Opens a wallet window with its QR code; clicking the address copies it.
 *
 * @param {keyof WALLETS} id Wallet id.
 */
function showWallet(id) {
    if (document.querySelector('#crypto-box')) return;

    const wallet = WALLETS[id];
    const pretty = prettyAddress(wallet.address, wallet.groups);
    const fog = createElement(renderTemplate(walletTemplate, {
        size: wallet.groups.length,
        name: wallet.name,
        qrcode: wallet.qrcode,
        icon: wallet.icon,
        pretty,
    }));
    document.body.append(fog);
    const box = fog.querySelector('#crypto-box');
    fadeIn(box);

    const close = fog.querySelector('#close');
    close.addEventListener('click', () => fog.remove());
    close.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') fog.remove();
    });

    const address = fog.querySelector('#wallet');
    const copy = async () => {
        const text = address.querySelector('span');
        await navigator.clipboard?.writeText(wallet.address).catch(() => {});
        address.classList.add('copied');
        text.textContent = 'Copiado';
        await fadeOut(text, 1200);
        address.classList.remove('copied');
        text.textContent = pretty;
        show(text);
    };
    address.addEventListener('click', copy);
    address.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') copy();
    });
}

/**
 * Shows the donation buttons matching the chosen frequency and method.
 */
function bindDonationForm() {
    const support = document.querySelector('#support');
    if (!support) return;

    const method = support.querySelector('#method');
    const buttons = support.querySelector('#buttons');
    const checked = id => Boolean(support.querySelector(`#${id}:checked`));

    support.querySelectorAll('input').forEach(input => input.addEventListener('click', () => {
        if (checked('one-time')) {
            slideDown(method);
        }
        else {
            fadeOut(method);
            method.querySelectorAll('input').forEach(option => {
                option.checked = false;
            });
        }

        support.querySelectorAll('.donate').forEach(button => button.classList.add('hidden'));
        hide(buttons);

        const reveal = (...ids) => ids.forEach(id => support.querySelector(`#${id}`).classList.remove('hidden'));
        if (checked('crypto')) reveal('bitcoin', 'ethereum');
        if (checked('boleto') || checked('card')) reveal('pagseguro');
        if (checked('monthly') || checked('card')) reveal('paypal');

        slideDown(buttons, 200);
    }));

    support.querySelectorAll('.donate.small').forEach(button => {
        button.addEventListener('click', () => showWallet(button.id));
    });

    support.querySelectorAll('#paypal, #pagseguro').forEach(link => {
        link.addEventListener('click', () => ThanksModel.trackDonation(location.pathname));
    });
}

decorateRadios();
bindDonationForm();

document.querySelectorAll('.discontinued').forEach(mode => mode.addEventListener('click', () => {
    new Message({ message: 'Este modo não existe mais na gladCode. Os torneios agora podem ser criados a partir do perfil do usuário.' }).show();
}));
