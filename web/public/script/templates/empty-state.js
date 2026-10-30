/**
 * Shared empty state (css/components/empty-state.css): a medallion icon, a title, a summary and an
 * optional action row that hides itself when empty. Callers pick the variant and build the action.
 *
 * Expects:
 * - `variantClass`: '' or 'compact' (inside lists and tables)
 * - `icon`: Font Awesome icon name, without `fa-`
 * - `title`, `summary`
 * - `actionHtml`: action markup built by the caller (a `.button` or link), or ''
 */
export const emptyStateTemplate = `
<div class='empty-state {{variantClass}}'>
    <div class='empty-state-medallion' aria-hidden='true'><i class='fa-solid fa-{{icon}}'></i></div>
    <h3 class='empty-state-title'>{{title}}</h3>
    <div class='empty-state-summary'>{{summary}}</div>
    <div class='empty-state-actions'>{{{actionHtml}}}</div>
</div>`;
