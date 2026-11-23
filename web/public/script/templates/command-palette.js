/** Inner markup of CommandPalette (css/components/command-palette.css). */
export const commandPaletteTemplate = `
<div class='command-palette-scrim' data-close></div>
<section class='command-palette-panel' role='dialog' aria-modal='true' aria-label='Busca global'>
    <label class='command-palette-search'>
        {{{searchIcon}}}
        <span class='visually-hidden'>Buscar</span>
        <input class='command-palette-input' type='search' autocomplete='off' aria-controls='command-palette-results' aria-autocomplete='list'>
        <kbd>Esc</kbd>
    </label>
    <div class='command-palette-results' id='command-palette-results' role='listbox' aria-label='Resultados'></div>
    <p class='command-palette-empty' hidden>Nenhum resultado.</p>
</section>`;
