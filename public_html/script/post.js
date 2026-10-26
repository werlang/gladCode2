import { formatMessageTime } from './helpers/date-format.js';
import { renderTemplate } from './helpers/html.js';
import { NewsModel } from './models/news.js';
import { postTemplate } from './templates/post.js';

/**
 * Shows the post named in `#hash` and links its neighbours; an unknown post
 * sends the visitor to the front page.
 */
async function showPost() {
    const hashElement = document.querySelector('#hash');
    const hash = hashElement?.textContent ?? '';
    hashElement?.remove();

    const data = await NewsModel.get(hash);
    if (data.status === 'EMPTY') {
        location.href = 'index';
        return;
    }
    if (data.status !== 'SUCCESS') return;

    document.querySelector('#post').innerHTML = renderTemplate(postTemplate, {
        title: data.post.title,
        time: formatMessageTime(data.post.time, { monthFull: true }),
        body: data.post.body,
    });

    [['prev', data.prev], ['next', data.next]].forEach(([id, target]) => {
        if (!target) return;
        const link = document.querySelector(`#${id}`);
        link.classList.remove('disabled');
        link.href = `post/${target}`;
    });
}

showPost();
