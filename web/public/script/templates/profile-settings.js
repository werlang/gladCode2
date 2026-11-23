/** The Perfil section shell (css/profile-settings.css). */
export const profileShellTemplate = `
<div class='settings-page'>
    <section class='profile-hero surface-card' id='profile-hero'>
        <div class='profile-hero-avatar'>
            <span id='profile-avatar-slot'></span>
            <button type='button' class='profile-photo-button' id='profile-photo-button' aria-label='Trocar foto'><i class='fa-solid fa-camera' aria-hidden='true'></i></button>
            <input id='profile-picture-picker' type='file' accept='image/*' hidden>
        </div>
        <div class='profile-hero-copy'>
            <h1 class='profile-hero-name' id='profile-hero-name' tabindex='-1'></h1>
            <p class='profile-hero-meta' id='profile-hero-meta'></p>
            <div class='profile-hero-xp'>
                <span class='profile-hero-xp-bar'><span id='profile-xp-fill'></span></span>
                <span class='profile-hero-xp-label' id='profile-xp-label'></span>
            </div>
        </div>
        <dl class='profile-hero-stats'>
            <div><dt>Batalhas</dt><dd id='profile-stat-battles'>0</dd></div>
            <div><dt>Vitórias</dt><dd id='profile-stat-wins'>0%</dd></div>
            <div><dt>Renome</dt><dd id='profile-stat-renown'>0</dd></div>
        </dl>
    </section>

    <section class='settings-card surface-card' data-settings='identity'>
        <header class='settings-card-head'>
            <h2>Identidade</h2>
            <span class='settings-card-status' id='identity-status'></span>
        </header>
        <div class='settings-row'>
            <div class='settings-copy'>
                <label for='profile-nickname'>Apelido</label>
                <p>Aparece nas batalhas e no ranking: seus gladiadores lutam como <span class='settings-code'>Nome@<span id='profile-nickname-example'></span></span>.</p>
            </div>
            <div class='settings-field'>
                <input id='profile-nickname' class='input' type='text' maxlength='30' autocomplete='off'>
                <span id='nickname-status'></span>
            </div>
        </div>
        <div class='settings-row'>
            <div class='settings-copy'>
                <span class='settings-label'>Linguagem padrão</span>
                <p>Com qual linguagem o editor abre um gladiador novo.</p>
            </div>
            <div class='settings-field'>
                <div id='language-control' class='segmented-control' role='group' aria-label='Linguagem padrão'></div>
            </div>
        </div>
    </section>

    <section class='settings-card surface-card' data-settings='appearance'>
        <header class='settings-card-head'>
            <h2>Aparência</h2>
            <span class='settings-card-status' id='appearance-status'></span>
        </header>
        <div class='settings-row settings-row--stack'>
            <div class='settings-copy'>
                <span class='settings-label'>Tema do site</span>
            </div>
            <div class='settings-field settings-field--wide'>
                <div id='theme-control' class='choice-cards choice-cards--preview' role='radiogroup' aria-label='Tema do site'></div>
                <button type='button' class='settings-system-link' id='theme-system'>Seguir o tema do sistema</button>
            </div>
        </div>
        <p class='settings-note'>Enquanto você não escolher, seguimos o tema claro ou escuro do seu sistema.</p>
        <div class='settings-row settings-row--stack'>
            <div class='settings-copy'>
                <span class='settings-label'>Como os gladiadores aparecem</span>
            </div>
            <div class='settings-field settings-field--wide'>
                <div id='glad-view-control' class='choice-cards choice-cards--icon' role='radiogroup' aria-label='Como os gladiadores aparecem'></div>
            </div>
        </div>
    </section>

    <section class='settings-card surface-card' data-settings='email'>
        <header class='settings-card-head'>
            <h2>Avisos por e-mail</h2>
            <span class='settings-card-status' id='email-status'></span>
        </header>
        <div id='preferences-list' class='preferences-list'></div>
    </section>

    <footer class='settings-footer'>
        <span><i class='fa-solid fa-cloud-arrow-up' aria-hidden='true'></i> Tudo que você muda aqui é salvo na hora.</span>
    </footer>
</div>`;

/** One e-mail preference row; the switch component is appended to `{{slot}}` by the section. */
export const preferenceRowTemplate = `
<div class='preference-row'>
    <div class='preference-copy'><span>{{label}}</span><small>{{hint}}</small></div>
    <div class='preference-switch' data-preference-slot='{{name}}'></div>
</div>`;
