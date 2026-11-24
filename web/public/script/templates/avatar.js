/** Master picture (css/components/avatar.css). */
export const avatarTemplate = `
<span class='avatar avatar--{{size}}' role='img'>
    <span class='avatar-ring'>
        <span class='avatar-inner'>
            <img class='avatar-image' alt='' hidden>
            <span class='avatar-initials' aria-hidden='true'></span>
        </span>
    </span>
    <span class='avatar-level' hidden></span>
    <span class='avatar-dot' role='img' hidden></span>
</span>`;
