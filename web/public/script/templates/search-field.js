/** Search field (css/components/search-field.css). */
export const searchFieldTemplate = `
<form class='search-field {{variant}}' role='search'>
    <i class='fas fa-magnifying-glass search-field-icon' aria-hidden='true'></i>
    <input class='search-field-input' type='search' autocomplete='off'>
    <button class='search-field-clear' type='button' aria-label='Limpar busca' hidden>
        <i class='fas fa-xmark' aria-hidden='true'></i>
    </button>
</form>`;
