import { BaseComponent } from './base-component.js';
import { site } from '../helpers/request.js';
import { fadeOut, show } from '../helpers/animate.js';

const SLIDE_MS = 300;

/**
 * Last path segment of the current page, without its hash.
 *
 * @returns {string}
 */
function currentPage() {
    return location.pathname.split('/').at(-1);
}

/**
 * The documentation tree on the left of the manual and docs pages
 * (side-menu.html): collapsible sections, a filter box, a mobile drawer opened
 * by the header search icon and the entry of the section in view highlighted.
 */
export class SideMenu extends BaseComponent {
    /** Resolves once side-menu.html is in place. */
    ready;

    /**
     * @param {HTMLElement} element The `#side-menu` container.
     */
    constructor(element) {
        super(element);
        this.ready = this.#load();
        this.#bindMobileToggle();
        this.on(document, 'scroll', () => this.#highlightSection(), { passive: true });
    }

    /**
     * Opens a page's own entry, the one whose id is the current page.
     */
    selectCurrentPage() {
        const entry = this.element.querySelector(`#${CSS.escape(currentPage())}`);
        if (!entry) return;
        entry.classList.add('here');
        entry.click();
    }

    async #load() {
        const markup = await site.get('side-menu.html');
        this.element.innerHTML = typeof markup === 'string' ? markup : '';

        this.#items().forEach(item => {
            if (item.nextElementSibling?.tagName === 'UL') {
                item.insertAdjacentHTML('afterbegin', "<i class='fas fa-chevron-right'></i>");
            }
            this.on(item, 'click', () => this.#toggleSection(item));
        });
        this.#collapseAll();

        const filter = this.element.querySelector('#search input');
        this.on(filter, 'input', () => this.#filter(filter.value));
        return this;
    }

    /** @returns {HTMLLIElement[]} Every entry of the tree. */
    #items() {
        return [...this.element.querySelectorAll('li')];
    }

    /** Shows the top-level entries only. */
    #collapseAll() {
        this.#items().forEach(item => item.classList.remove('visible'));
        this.element.querySelectorAll('li i').forEach(icon => icon.classList.remove('open'));
        this.element.querySelectorAll(':scope > ul > li').forEach(item => item.classList.add('visible'));
    }

    /**
     * Expands or collapses the list that follows an entry.
     *
     * @param {HTMLLIElement} item Clicked entry.
     */
    #toggleSection(item) {
        const list = item.nextElementSibling?.tagName === 'UL' ? item.nextElementSibling : null;
        const first = list?.firstElementChild;
        const icon = item.querySelector(':scope > i');

        if (first && getComputedStyle(first).display !== 'none') {
            list.querySelectorAll('li').forEach(child => child.classList.remove('visible'));
            list.querySelectorAll('li i').forEach(childIcon => childIcon.classList.remove('open'));
            icon?.classList.remove('open');
        }
        else {
            list?.querySelectorAll(':scope > li').forEach(child => child.classList.add('visible'));
            icon?.classList.add('open');
        }
    }

    /**
     * Shows the entries matching a text, with the sections that hold them.
     *
     * @param {string} text Filter text; one character or less shows the top level.
     */
    #filter(text) {
        this.#collapseAll();
        if (text.length <= 1) return;

        this.element.querySelectorAll(':scope > ul > li').forEach(item => item.classList.remove('visible'));
        const needle = text.toLowerCase();
        this.#items().forEach(item => {
            if (!item.textContent.toLowerCase().includes(needle)) return;
            item.classList.add('visible');
            const parent = item.parentElement.previousElementSibling;
            if (parent?.tagName === 'LI') {
                parent.classList.add('visible');
                const grandParent = parent.parentElement.previousElementSibling;
                if (grandParent?.tagName === 'LI') grandParent.classList.add('visible');
            }
        });
        this.#items().forEach(item => {
            if (getComputedStyle(item).display !== 'none') {
                item.querySelector(':scope > i')?.classList.add('open');
            }
        });
    }

    /**
     * The header search icon opens the menu as a full-width drawer on small
     * screens; following a link closes it.
     */
    #bindMobileToggle() {
        const searchIcon = document.querySelector('#header #search');
        if (!searchIcon) return;
        searchIcon.classList.add('visible');

        this.on(searchIcon, 'click', async () => {
            this.element.classList.add('mobile');
            show(this.element);
            this.element.animate?.([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], SLIDE_MS);
            await this.ready;
            this.element.querySelector('input')?.focus();
        });

        this.on(this.element, 'click', async event => {
            if (!this.element.classList.contains('mobile') || !event.target.closest('a')) return;
            await fadeOut(this.element);
            this.element.classList.remove('mobile');
            this.element.style.display = '';
        });
    }

    /**
     * Highlights the entry of the anchor nearest the scroll position and
     * collapses its open siblings.
     */
    #highlightSection() {
        const page = currentPage();
        let nearest = null;
        let winner = null;

        this.element.querySelectorAll('li a').forEach(link => {
            const [href, hash] = link.getAttribute('href').split('#');
            const anchor = hash && href === page ? document.getElementById(hash) : null;
            if (!anchor) return;
            const distance = Math.abs(anchor.getBoundingClientRect().top);
            if (nearest === null || distance < nearest) {
                nearest = distance;
                winner = link.parentElement;
            }
        });
        if (!winner) return;

        [...winner.parentElement.children].forEach(sibling => {
            if (sibling !== winner) sibling.classList.remove('here');
        });
        winner.classList.add('here');

        if (!winner.querySelector(':scope > i')?.classList.contains('open')) {
            winner.click();
        }
        [...winner.parentElement.children]
            .filter(sibling => sibling !== winner && sibling.tagName === 'LI')
            .forEach(sibling => {
                if (sibling.querySelector('i.open')) sibling.click();
            });
    }
}
