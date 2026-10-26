import { showLoginDialog } from './components/header.js';
import { createElement, renderTemplate } from './helpers/html.js';
import { fadeIn } from './helpers/animate.js';
import { videoModalTemplate } from './templates/index.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Login prompts for the profile tabs that redirect here without a session. */
const LOGIN_MESSAGES = {
    messages: 'Faça login para visualizar sua mensagem',
    friends: 'Faça login para ver seus pedidos de amizade',
    battle: 'Faça login para visualizar suas batalhas e desafios',
};

/**
 * Switches the hero code sample between languages.
 */
function bindCodeTabs() {
    const tabs = document.querySelectorAll('#hero .tabs button');
    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(other => other.setAttribute('aria-selected', String(other === tab)));
        document.querySelectorAll('#hero .code').forEach(code => {
            code.hidden = code.dataset.lang !== tab.dataset.lang;
        });
    }));
}

/**
 * Steps the highlighted line through the visible code sample while the arena
 * video plays, only while the hero is on screen.
 */
function runCodeTrace() {
    // reduced motion keeps the poster frame and a still code panel
    if (reducedMotion) return;

    const hero = document.querySelector('#hero');
    const video = hero?.querySelector('video');
    if (!video) return;

    let timer = null;
    let index = 0;

    const tick = () => {
        const lines = [...hero.querySelectorAll('.code:not([hidden]) .l')];
        if (!lines.length) return;
        lines.forEach(line => line.classList.remove('run'));
        // skip blank and closing-brace lines, they never "run"
        let tries = 0;
        do {
            index = (index + 1) % lines.length;
            tries++;
        } while (/^\s*[{}]?\s*$/.test(lines[index].textContent) && tries < lines.length);
        lines[index].classList.add('run');
    };

    const start = () => {
        timer ??= setInterval(tick, 700);
    };
    const stop = () => {
        clearInterval(timer);
        timer = null;
    };

    new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
            video.play().catch(() => {});
            start();
        }
        else {
            video.pause();
            stop();
        }
    }), { threshold: 0.2 }).observe(hero);
}

/**
 * Opens a YouTube video in a modal that Escape or a click closes.
 *
 * @param {HTMLElement} trigger The `.video` card, refocused on close.
 */
function openVideo(trigger) {
    const fog = createElement(renderTemplate(videoModalTemplate, { hash: trigger.dataset.video }));
    document.body.append(fog);
    fadeIn(fog, reducedMotion ? 0 : 400, 'flex');
    fog.querySelector('#remove').focus();

    function close() {
        fog.remove();
        document.removeEventListener('keydown', onKey);
        trigger.focus();
    }
    function onKey(event) {
        if (event.key === 'Escape') close();
    }
    fog.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
}

document.querySelector('#header')?.classList.add('big');
document.querySelector('#header-container')?.classList.add('small');

bindCodeTabs();
runCodeTrace();

document.querySelector('#account')?.addEventListener('click', () => showLoginDialog('Faça login no sistema'));
document.querySelectorAll('#videos .video').forEach(video => video.addEventListener('click', () => openVideo(video)));

const loginHash = document.querySelector('#loginhash');
if (loginHash) {
    showLoginDialog(LOGIN_MESSAGES[loginHash.textContent] ?? 'Faça login para ir para o seu perfil');
}
