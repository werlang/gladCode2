/** PotionSlot and PotionCard markup (css/components/potion-slot.css, potion-card.css). */

export const potionSlotTemplate = `
<article class='potion-slot' data-state='empty' data-kind='hp'>
    <div class='potion-slot-head'>
        <span class='potion-slot-icon'>{{{icon}}}</span>
        <span class='potion-slot-copy'>
            <span class='potion-slot-name'></span>
            <span class='potion-slot-sub'></span>
        </span>
    </div>
    <div class='potion-slot-foot'>
        <span class='potion-slot-meter' aria-hidden='true'><span class='potion-slot-bar'></span></span>
        <span class='potion-slot-time' role='timer'></span>
        <button type='button' class='potion-slot-cancel' aria-label='Cancelar encomenda' hidden>{{{close}}}</button>
    </div>
</article>`;

export const potionCardTemplate = `
<article class='potion-card' data-kind='hp'>
    <div class='potion-card-head'>
        <span class='potion-card-icon'>{{{icon}}}</span>
        <span class='potion-card-title'>
            <span class='potion-card-name'></span>
            <span class='potion-card-code'></span>
        </span>
    </div>
    <p class='potion-card-description'></p>
    <div class='potion-card-foot'>
        <span class='potion-card-price'>{{{coin}}}<span></span></span>
        <button type='button' class='button small potion-card-order'>Encomendar</button>
    </div>
</article>`;

/** FormStreak and ResultPill root markup. */
export const formStreakTemplate = `
<div class='form-streak'>
    <span class='form-streak-label'></span>
    <span class='form-streak-tiles'></span>
</div>`;

export const formStreakTileTemplate = `<span class='form-streak-tile' data-result='{{result}}' title='{{title}}' aria-label='{{title}}'>{{letter}}</span>`;

export const resultPillTemplate = `<span class='result-pill' data-tone='neutral'></span>`;
