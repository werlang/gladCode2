import GoogleLogin from "./google-login.js";

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showLogin(msg) {
    showDialog(`${msg}<div id='google-login' style='display: flex; justify-content: center'></div>`, ["Cancelar"]);
    GoogleLogin.init().then(() => {
        GoogleLogin.renderButton($('#google-login')[0]);
    });
}

// Steps the highlighted line through the visible code sample while the arena video plays
function runCodeTrace() {
    let timer = null;
    let index = 0;

    const tick = () => {
        const lines = $('#hero .code:not([hidden]) .l');
        lines.removeClass('run');
        // skip blank and closing-brace lines, they never "run"
        do {
            index = (index + 1) % lines.length;
        } while (/^\s*[{}]?\s*$/.test(lines.eq(index).text()));
        lines.eq(index).addClass('run');
    };

    const start = () => { if (!timer) timer = setInterval(tick, 700); };
    const stop = () => { clearInterval(timer); timer = null; };

    const video = $('#hero video')[0];
    // reduced motion keeps the poster frame and a still code panel
    if (reducedMotion) return;

    // play only while the hero is on screen
    new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                video.play().catch(() => {});
                start();
            }
            else {
                video.pause();
                stop();
            }
        });
    }, { threshold: 0.2 }).observe($('#hero')[0]);
}

$(document).ready( function() {
    $('#header').addClass('big');
    $('#header-container').addClass('small');

    $('#hero .tabs button').click( function() {
        const lang = $(this).data('lang');
        $('#hero .tabs button').attr('aria-selected', 'false');
        $(this).attr('aria-selected', 'true');
        $('#hero .code').attr('hidden', true);
        $(`#hero .code[data-lang='${lang}']`).removeAttr('hidden');
    });

    runCodeTrace();

    $('#account').click( function(){
        showLogin("Faça login no sistema");
    });

    $('#videos .video').click( function() {
        const hash = $(this).data('video');

        $('body').append(`<div id='fog'><div id='video-container' role='dialog' aria-label='Vídeo'><iframe src='https://www.youtube.com/embed/${hash}?autoplay=1' allow='autoplay; encrypted-media' allowfullscreen></iframe><button id='remove' aria-label='Fechar vídeo'></button></div></div>`);
        $('#fog').hide().fadeIn(reducedMotion ? 0 : 400);
        $('#fog #remove').focus();

        const close = () => {
            $('#fog').remove();
            $(document).off('keydown.video');
            this.focus();
        };
        $('#fog').click(close);
        $(document).on('keydown.video', e => { if (e.key == 'Escape') close(); });
    });

    if ($('#loginhash').length){
        var tab = $('#loginhash').html();

        var loginMessage = {
            'messages': "Faça login para visualizar sua mensagem",
            'friends': "Faça login para ver seus pedidos de amizade",
            'battle': "Faça login para visualizar suas batalhas e desafios"
        };

        let msg = loginMessage[tab]
        if (!loginMessage[tab])
            msg = "Faça login para ir para o seu perfil"

        showLogin(msg);
    }
});
