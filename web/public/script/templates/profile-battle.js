/** Batalhas section shell (css/profile-battle.css). The list cards are built by their controllers so
 * they can use SectionCard and Pagination while the existing windows keep their behaviour. */
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
            <div id='duel-friends'></div>
            <div id='duel-challenge'></div>
        </div>

        <div id='tourn' class='battle-panel wrapper' hidden></div>
        <div id='train' class='battle-panel wrapper' hidden></div>
    </div>
</div>`;

/** The friend-search card of the duel mode. */
export const duelFriendsTemplate = `
<div class='duel-friends'>
    <p class='battle-list-copy'>Escolha um amigo e o gladiador que vai representar você.</p>
    <label class='field-label' for='duel-friend-filter'>Filtrar amigos</label>
    <input id='duel-friend-filter' class='input' type='search' placeholder='apelido-do-usuario' aria-label='Filtrar amigos'>
    <div id='table-friends' class='friend-list' role='list'></div>
</div>`;

/** One pending duel challenge; the accept/refuse buttons stay visible on phones. */
export const duelChallengeRowTemplate = `
<div class='battle-row' role='listitem'>
    <span class='battle-row-avatar'></span>
    <span class='battle-row-main'>
        <span class='battle-row-title'>{{nick}}</span>
        <span class='battle-row-sub'>{{gladiator}} · nível {{level}}</span>
    </span>
    <span class='battle-row-meta' title='{{date}}'>{{elapsed}}</span>
    <span class='battle-row-actions'>
        <button type='button' class='button ghost small refuse'>Recusar</button>
        <button type='button' class='button primary small accept'>Aceitar</button>
    </span>
</div>`;

/** One tournament row of the public or the master's list. */
export const tournamentRowTemplate = `
<div class='battle-row battle-row--button' role='button' tabindex='0'>
    <span class='battle-row-main'>
        <span class='battle-row-title'>{{name}}</span>
        <span class='battle-row-sub'>{{description}}</span>
    </span>
    <span class='battle-row-meta'>{{teams}}/{{maxteams}} equipes</span>
    <span class='battle-row-tag'>{{flex}}</span>
</div>`;

/** One training row; `actions` is markup built by the section (the manager's remove button). */
export const trainingRowTemplate = `
<div class='battle-row battle-row--button' role='button' tabindex='0'>
    <span class='battle-row-main'>
        <span class='battle-row-title'>{{name}}</span>
        <span class='battle-row-sub'>{{description}}</span>
    </span>
    <span class='battle-row-meta'>{{masters}} mestres</span>
    {{{actions}}}
</div>`;

/** A list container inside a SectionCard. */
export const battleRowsTemplate = `<div class='battle-rows' role='list'></div>`;
