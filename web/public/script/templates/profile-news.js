/** Notícias section shell (css/news.css). */
export const newsShellTemplate = `
<div class='news-page'>
    <div class='news-layout'>
        <section class='news-feed' id='news-feed' aria-label='Notícias publicadas'>
            <div id='news-featured'></div>
            <div class='news-previous surface-card' id='news-previous' hidden>
                <h2 class='news-previous-title'>ANTERIORES</h2>
                <div id='news-list'></div>
                <button type='button' class='button neutral small news-more' id='news-more' hidden>Ver mais notícias</button>
            </div>
            <div id='news-empty' hidden></div>
            <div id='news-error' hidden></div>
        </section>
        <aside class='news-aside'>
            <section class='news-todo' aria-labelledby='news-todo-title'>
                <header class='news-todo-head'>
                    <h2 id='news-todo-title'>Aguardando você</h2>
                    <span class='news-todo-count' id='news-todo-count'>0</span>
                </header>
                <div id='news-todo-list'></div>
                <p class='news-todo-empty' id='news-todo-empty' hidden>Tudo em dia por aqui.</p>
            </section>
            <section class='news-tournament surface-card' id='news-tournament' hidden>
                <span class='news-eyebrow'>PRÓXIMO TORNEIO</span>
                <h2 id='news-tournament-name'></h2>
                <div class='news-countdown' id='news-countdown' aria-live='off'>
                    <span class='news-countdown-value' data-news-time='hours'>--</span><span class='news-countdown-sep'>:</span><span class='news-countdown-value' data-news-time='minutes'>--</span><span class='news-countdown-sep'>:</span><span class='news-countdown-value' data-news-time='seconds'>--</span>
                    <span class='news-countdown-label'>para começar</span>
                </div>
                <a class='news-bracket' id='news-bracket' href='#'>Ver chaveamento</a>
            </section>
        </aside>
    </div>
</div>`;

/** The featured post. `ribbon` and `mediaClass` are trusted markup/class names. */
export const featuredNewsTemplate = `
<article class='news-featured-card surface-card {{mediaClass}}'>
    <div class='news-featured-media'>
        <img src='{{image}}' alt='{{imageAlt}}'>
        {{{ribbon}}}
    </div>
    <div class='news-featured-body'>
        <div class='news-meta'>
            <span class='news-chip'>{{category}}</span>
            {{{versionHtml}}}
            <span aria-hidden='true'>·</span>
            <time>{{date}}</time>
        </div>
        <h2 class='news-featured-title'>{{title}}</h2>
        <p class='news-featured-excerpt'>{{excerpt}}</p>
        <a class='news-read' href='/post/{{hash}}'>Ler notícia <span aria-hidden='true'>›</span></a>
    </div>
</article>`;

/** The engine version a post announces, when it carries one. */
export const newsVersionTemplate = `<span class='news-version'>v{{version}}</span>`;

/** One previous post row. */
export const previousNewsTemplate = `
<a class='news-row {{unreadClass}}' href='/post/{{hash}}'>
    <span class='news-row-date'><b>{{day}}</b><span>{{month}}</span></span>
    <span class='news-row-copy'><b>{{title}}</b><span>{{excerpt}}</span></span>
    <span class='news-chip'>{{category}}</span>
</a>`;

/** One "Aguardando você" row. `icon` is trusted inline SVG. */
export const newsTodoTemplate = `
<div class='news-todo-item news-todo-item--{{kind}}'>
    <span class='news-todo-icon' aria-hidden='true'>{{{icon}}}</span>
    <div class='news-todo-copy'>
        <span class='news-todo-text'>{{text}}</span>
        <a href='{{href}}'>{{action}}</a>
    </div>
</div>`;

/** Primary error card with retry. */
export const newsErrorTemplate = `
<div class='news-error surface-card' role='alert'>
    <span>{{message}}</span>
    <button type='button' class='button secondary small' id='news-retry'>Tentar novamente</button>
</div>`;
