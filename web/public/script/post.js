import { formatMessageTime } from './helpers/date-format.js';
import { renderTemplate } from './helpers/html.js';
import { TemplateVar } from './helpers/template-var.js';
import { NewsModel } from './models/news.js';
import { postTemplate } from './templates/post.js';

/**
 * Shows the post named in the URL (`/post/<hash>`) and links its neighbours; an unknown post
 * sends the visitor to the front page.
 */
async function showPost() {
    const hash = TemplateVar.get('postHash') ?? '';

    let data;
    try {
        data = await NewsModel.get(hash);
    }
    catch (error) {
        if (error.code === 'NEWS_NOT_FOUND' || error.code === 'INVALID_HASH') location.href = '/';
        throw error;
    }

    document.querySelector('#post').innerHTML = renderTemplate(postTemplate, {
        title: data.post.title,
        time: formatMessageTime(data.post.time, { monthFull: true }),
        body: data.post.body,
    });

    [['prev', data.previous], ['next', data.next]].forEach(([id, target]) => {
        if (!target) return;
        const link = document.querySelector(`#${id}`);
        link.classList.remove('disabled');
        link.href = `post/${target}`;
    });
}

showPost();
