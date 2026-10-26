import { createToast } from '../components/toast.js';
import { copyText } from '../helpers/clipboard.js';
import { formatMessageTime } from '../helpers/date-format.js';
import { createElement, renderTemplate } from '../helpers/html.js';
import { fadeIn } from '../helpers/animate.js';
import { NewsModel } from '../models/news.js';
import { newsPostTemplate, shareLinkTemplate } from '../templates/profile.js';

/**
 * Opens the window with a post's public link.
 *
 * @param {string} hash Post hash.
 */
function sharePost(hash) {
    const fog = createElement(renderTemplate(shareLinkTemplate, { link: `${location.origin}/post/${hash}` }));
    document.body.append(fog);
    fadeIn(fog, undefined, 'flex');
    fog.addEventListener('click', () => fog.remove());
    const box = fog.querySelector('#link-box');
    box.addEventListener('click', event => event.stopPropagation());
    box.querySelector('button').addEventListener('click', async () => {
        await copyText(box.querySelector('input').value);
        createToast('Link da publicação copiado para área de transferência', 'success');
    });
}

/**
 * The NOTÍCIAS tab: the latest news posts.
 */
export class NewsTab {
    #container = document.querySelector('#panel #news-container');

    /** Loads the first page of posts. */
    async show() {
        const posts = await NewsModel.list(0);
        this.#container.replaceChildren();
        posts.forEach(post => {
            const element = createElement(renderTemplate(newsPostTemplate, {
                title: post.title,
                time: formatMessageTime(post.time, { monthFull: true }),
                body: post.body,
            }));
            element.querySelector('.share').addEventListener('click', () => sharePost(post.hash));
            this.#container.append(element);
        });
    }
}
