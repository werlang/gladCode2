/** Inner markup of MoreSheet (css/components/more-sheet.css). */
export const moreSheetTemplate = `
<div class='more-sheet-scrim' data-close></div>
<section class='more-sheet-panel' role='dialog' aria-modal='true' aria-labelledby='more-sheet-title'>
    <span class='more-sheet-handle' aria-hidden='true'></span>
    <h2 class='visually-hidden' id='more-sheet-title'>Mais seções</h2>
    <a class='more-sheet-identity' href='/profile'>
        <span class='more-sheet-avatar-slot'></span>
        <span class='more-sheet-who'>
            <span class='more-sheet-name'></span>
            <span class='more-sheet-level'></span>
            <span class='more-sheet-xp'><span></span></span>
        </span>
        <span class='more-sheet-profile'>Perfil</span>
    </a>
    <div class='more-sheet-tiles'></div>
    <div class='more-sheet-links'>
        <a href='/editor'>Editor</a>
        <a href='/manual'>Aprender</a>
        <a href='/about'>Sobre</a>
    </div>
</section>`;
