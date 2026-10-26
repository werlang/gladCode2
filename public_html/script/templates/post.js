/** A news post; the body is markup written by the site's editors. */
export const postTemplate = `
<div class='post'>
    <div class='title'>{{{title}}}</div>
    <div class='time'>Publicado em {{time}}</div>
    <div class='body'>{{{body}}}</div>
</div>`;
