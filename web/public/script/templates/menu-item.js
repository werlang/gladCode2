/** MenuItem (css/components/menu-item.css): one link in the Painel rail. */
export const menuItemTemplate = `
<a class='menu-item menu-item--{{section}}' href='{{href}}'>
    <span class='menu-item-icon'>{{{icon}}}</span>
    <span class='menu-item-label'>{{label}}</span>
    <span class='menu-item-badge-slot'></span>
</a>`;
