/** A single-choice card group (css/components/choice-cards.css). */
export const choiceCardsTemplate = `<div class='choice-cards choice-cards--{{variant}}' role='radiogroup'></div>`;

/** One card; `{{preview}}` is trusted markup built by the section. */
export const choiceCardTemplate = `
<button type='button' class='choice-card' role='radio' aria-checked='false'>
    <span class='choice-card-preview' aria-hidden='true'>{{{preview}}}</span>
    <span class='choice-card-copy'>
        <span class='choice-card-title'>{{title}}</span>
        <span class='choice-card-description'>{{description}}</span>
    </span>
    <span class='choice-card-badge' hidden>{{badge}}</span>
</button>`;
