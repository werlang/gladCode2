/** Section panel (css/components/section-card.css); the element also carries `.surface-card`. */
export const sectionCardTemplate = `
<section class='section-card surface-card'>
    <header class='section-card-header' hidden>
        <h2 class='section-card-title'></h2>
        <div class='section-card-actions'></div>
    </header>
    <div class='section-card-body'></div>
</section>`;

/** Error state: a message and the retry action. `message` is escaped. */
export const sectionCardErrorTemplate = `
<div class='section-card-error' role='alert'>
    <span>{{message}}</span>
    <button type='button' class='button secondary small' data-section-retry>Tentar novamente</button>
</div>`;

