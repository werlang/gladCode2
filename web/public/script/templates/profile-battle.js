/** Batalhas section shell (css/profile-battle.css). The tournament/training inner markup is kept
 * because those flows keep their existing windows and tables; the ranked/duel parts are rebuilt. */
export const battleShellTemplate = `
<div class='battle-page'>
    <div id='battle-header'></div>
    <div id='battle-invite'></div>
    <div id='battle-modes'></div>
    <div class='battle-panels'>
        <div id='ranked' class='battle-panel wrapper'>
            <section class='ranked-arena'>
                <header class='ranked-head'>
                    <h2>ESCOLHA SEU GLADIADOR</h2>
                    <p>O adversário é sorteado entre gladiadores de renome parecido.</p>
                </header>
                <div class='ranked-layout'>
                    <div id='ranked-picker'></div>
                    <div id='ranked-versus'></div>
                </div>
            </section>
        </div>

        <div id='duel' class='battle-panel wrapper' hidden>
            <section class='battle-list surface-card'>
                <div class='battle-list-head'>
                    <h2>Desafiar um amigo</h2>
                    <p>Escolha um amigo e o gladiador que vai representar você.</p>
                </div>
                <div id='duel-friend-search'>
                    <input class='input' type='search' placeholder='apelido-do-usuario' aria-label='Filtrar amigos'>
                </div>
                <div id='table-friends' class='friend-list'></div>
                <div class='battle-list-actions'>
                    <button id='challenge' class='button primary' disabled>DESAFIAR</button>
                </div>
            </section>
            <section id='duel-challenge' class='battle-list surface-card hidden'>
                <div class='battle-list-head'><h2>Desafios para duelo</h2></div>
                <div class='table'></div>
            </section>
        </div>

        <div id='tourn' class='battle-panel wrapper' hidden>
            <section class='battle-list surface-card'>
                <div class='title open'><h2>Torneios públicos abertos</h2><div id='offset' class='open'><span class='start'>0</span> - <span class='end'>0</span> de <span class='total'>0</span><button id='prev' aria-label='Anterior'><i class='fas fa-chevron-left'></i></button><button id='next' aria-label='Próxima'><i class='fas fa-chevron-right'></i></button></div></div>
                <div id='table-open' class='table'></div>
                <div class='battle-list-actions'>
                    <button id='create' class='button primary'>CRIAR UM TORNEIO</button>
                    <button id='join' class='button neutral'>INGRESSAR EM UM TORNEIO</button>
                </div>
            </section>
            <section class='battle-list surface-card'>
                <div class='title mine' id='mytourn'><h2>Meus torneios</h2><div id='offset' class='mine'><span class='start'>0</span> - <span class='end'>0</span> de <span class='total'>0</span><button id='prev' aria-label='Anterior'><i class='fas fa-chevron-left'></i></button><button id='next' aria-label='Próxima'><i class='fas fa-chevron-right'></i></button></div></div>
                <div id='table-mytourn' class='table'></div>
            </section>
        </div>

        <div id='train' class='battle-panel wrapper' hidden>
            <section class='battle-list surface-card'>
                <div class='title manage'><h2>Treinos que gerencio</h2><div id='offset' class='manage'><span class='start'>0</span> - <span class='end'>0</span> de <span class='total'>0</span><button id='prev' aria-label='Anterior'><i class='fas fa-chevron-left'></i></button><button id='next' aria-label='Próxima'><i class='fas fa-chevron-right'></i></button></div></div>
                <div id='table-manage' class='table'></div>
                <div class='battle-list-actions'>
                    <button id='create' class='button primary'>NOVO TREINO</button>
                </div>
            </section>
            <section class='battle-list surface-card'>
                <div class='title part'><h2>Treinos que participo</h2><div id='offset' class='part'><span class='start'>0</span> - <span class='end'>0</span> de <span class='total'>0</span><button id='prev' aria-label='Anterior'><i class='fas fa-chevron-left'></i></button><button id='next' aria-label='Próxima'><i class='fas fa-chevron-right'></i></button></div></div>
                <div id='table-part' class='table'></div>
                <div class='battle-list-actions'>
                    <button id='join' class='button neutral'>PARTICIPAR DE TREINO</button>
                </div>
            </section>
        </div>
    </div>
</div>`;
