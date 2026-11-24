/** The game-style gladiator card (css/components/gladiator-card.css). */
export const gladiatorCardTemplate = `
<article class='gladiator-card' data-state='ready' data-variant='full'>
    <div class='gladiator-frame'>
        <div class='gladiator-body'>
            <div class='gladiator-stage'>
                <span class='gladiator-image'></span>
                <span class='gladiator-crest' title='Linguagem'><span>{{crest}}</span></span>
                <span class='gladiator-status'><i aria-hidden='true'></i><span>{{status}}</span></span>
                <span class='gladiator-stamp' hidden>{{stamp}}</span>
                <span class='gladiator-renown' title='Renome'>{{{crown}}}<span>{{mmr}}</span></span>
            </div>
            <div class='gladiator-copy'>
                <div class='gladiator-heading'>
                    <h2 class='gladiator-name'></h2>
                    <p class='gladiator-record'></p>
                </div>
                <dl class='gladiator-attrs'></dl>
                <p class='gladiator-alert' hidden></p>
                <div class='gladiator-actions'>
                    <a class='gladiator-edit' href='#'>{{{codeIcon}}}<span class='gladiator-action-label'>{{editLabel}}</span></a>
                    <button type='button' class='gladiator-fight'>{{{swords}}}<span class='gladiator-lock' hidden>{{{lock}}}</span><span class='gladiator-action-label'>{{fightLabel}}</span></button>
                    <button type='button' class='gladiator-more' aria-label='Mais ações' aria-expanded='false'>{{{more}}}</button>
                </div>
                <div class='gladiator-menu' hidden>
                    <button type='button' data-card-action='code'>Ver código</button>
                    <button type='button' data-card-action='delete'>Excluir gladiador</button>
                </div>
            </div>
        </div>
    </div>
</article>`;

/** One attribute row inside the card. */
export const gladiatorAttrTemplate = `
<div class='gladiator-attr gladiator-attr--{{key}}'>
    <dt title='{{full}}'><span>{{short}}</span></dt>
    <span class='gladiator-segments' aria-hidden='true'>{{{segments}}}</span>
    <dd>{{value}}</dd>
</div>`;

/** The empty-slot card of the Gladiadores grid. */
export const gladiatorEmptyTemplate = `
<a class='gladiator-empty' href='/newglad'>
    <span class='gladiator-empty-emblem' aria-hidden='true'>{{{plus}}}</span>
    <span class='gladiator-empty-title'>{{title}}</span>
    <span class='gladiator-empty-copy'>Recrute um gladiador em C, Python ou blocos e treine-o no editor.</span>
</a>`;

/** The card's portrait slot receives the 3D portrait or the sprite; its own markup is static. */
export const gladiatorPickerTemplate = `<div class='gladiator-picker' role='group'></div>`;

/** One picker mini-card. */
export const gladiatorPickTemplate = `
<button type='button' class='gladiator-pick' aria-pressed='false'>
    <span class='gladiator-pick-ribbon'>ESCOLHIDO</span>
    <span class='gladiator-pick-stage'>
        <span class='gladiator-pick-image'></span>
        <span class='gladiator-pick-lock' hidden>{{{lock}}}</span>
    </span>
    <span class='gladiator-pick-copy'>
        <span class='gladiator-pick-name'></span>
        <span class='gladiator-pick-mmr'>{{{crown}}}<span></span></span>
        <span class='gladiator-pick-note'></span>
    </span>
</button>`;

/** The ranked versus panel. */
export const versusPanelTemplate = `
<aside class='versus-panel' aria-label='Batalha ranqueada'>
    <div class='versus-stage'>
        <span class='versus-side'>
            <span class='versus-portrait versus-portrait--mine'><span class='versus-image'></span></span>
            <span class='versus-name versus-name--mine' hidden></span>
        </span>
        <span class='versus-mark' aria-hidden='true'>VS</span>
        <span class='versus-side'>
            <span class='versus-portrait versus-portrait--enemy'><span class='versus-image'></span></span>
            <span class='versus-name versus-name--enemy'>Sorteado</span>
        </span>
    </div>
    <dl class='versus-facts'>
        <div><dt>Poções levadas</dt><dd class='versus-potions'>Nenhuma</dd></div>
        <div><dt>Recompensa</dt><dd class='versus-reward'>Renome e prata</dd></div>
    </dl>
    <button type='button' class='versus-fight' disabled>{{{swords}}}<span>PROCURAR ADVERSÁRIOS</span></button>
</aside>`;

/** A pending invite banner (a duel challenge on Batalhas). */
export const inviteBannerTemplate = `
<section class='invite-banner' aria-label='Desafio pendente' hidden>
    <span class='invite-avatar'></span>
    <span class='invite-copy'>
        <span class='invite-message'></span>
        <span class='invite-detail'></span>
    </span>
    <span class='invite-actions'>
        <button type='button' class='button neutral invite-refuse'></button>
        <button type='button' class='button primary invite-accept'></button>
    </span>
</section>`;
