/**
 * HomePage - Landing page component
 * Main entry point for the application
 */

import Page from '../core/Page.js';

export default class HomePage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'gladCode - Onde a programação e os jogos se encontram',
            requiresAuth: false,
        });
    }

    render() {
        return `
            <div class="home-page">
                <section class="hero">
                    <div class="container">
                        <h1 class="hero__title">Onde a programação e os jogos se encontram</h1>
                        <p class="hero__subtitle">
                            Programe o comportamento de seus gladiadores e faça-os lutar usando 
                            magias e habilidades especiais enquanto eles ganham poder e experiência. 
                            Não parece divertido?
                        </p>
                        <div class="hero__actions">
                            <button class="button button--primary" data-action="login">
                                Fazer Login
                            </button>
                            <a href="#/docs" class="button button--secondary">
                                Saiba Mais
                            </a>
                        </div>
                    </div>
                </section>

                <section class="features">
                    <div class="container">
                        <div class="feature-grid">
                            <div class="feature-card">
                                <div class="feature-card__icon">🎯</div>
                                <h3 class="feature-card__title">Desenvolva sua lógica</h3>
                                <p class="feature-card__text">
                                    Treine suas habilidades de programação e veja os resultados em um 
                                    ambiente diferente da tradicional tela preta. Na gladCode a lógica 
                                    que você criar definirá o comportamento e a inteligência dos gladiadores.
                                </p>
                                <a href="#/manual" class="feature-card__link">Conheça a simulação →</a>
                            </div>

                            <div class="feature-card">
                                <div class="feature-card__icon">⚔️</div>
                                <h3 class="feature-card__title">Entre no clima</h3>
                                <p class="feature-card__text">
                                    Ambientado com uma temática de fantasia medieval, a gladCode proporciona 
                                    uma experiência épica e divertida onde você pode criar seus gladiadores 
                                    para serem guerreiros, ladinos, magos ou qualquer combinação que você preferir.
                                </p>
                                <a href="#/editor" class="feature-card__link">Crie seu gladiador →</a>
                            </div>

                            <div class="feature-card">
                                <div class="feature-card__icon">🔮</div>
                                <h3 class="feature-card__title">Sinta o poder</h3>
                                <p class="feature-card__text">
                                    Tenha à sua disposição uma série de magias e habilidades especiais que 
                                    farão seus oponentes cair aos seus pés. A combinação escolhida de atributos 
                                    do gladiador, combinada ao uso eficiente das habilidades farão seu gladiador 
                                    subir de nível.
                                </p>
                            </div>

                            <div class="feature-card">
                                <div class="feature-card__icon">📚</div>
                                <h3 class="feature-card__title">Conheça suas ferramentas</h3>
                                <p class="feature-card__text">
                                    Na gladCode, você possui à sua disposição toda sintaxe básica da linguagem 
                                    de programação. Existem mais de 50 funções que possibilitam os gladiadores 
                                    executarem as mais diversas ações dentro da arena.
                                </p>
                                <a href="#/docs" class="feature-card__link">Aprenda mais →</a>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="cta">
                    <div class="container">
                        <h2 class="cta__title">Como participo?</h2>
                        <p class="cta__text">
                            Para participar basta fazer login com sua conta do Google. Fazendo login 
                            você poderá criar e editar todos seus gladiadores, visualizar seu ranking 
                            e comparar com o de seus amigos e também disputar emocionantes partidas multiplayer.
                        </p>
                        <div id="google-login-button"></div>
                    </div>
                </section>
            </div>
        `;
    }

    async afterMount() {
        // Get auth service from global app
        if (window.app && window.app.auth) {
            // Render Google login button if not authenticated
            if (!window.app.auth.isAuthenticated()) {
                const buttonContainer = this.find('#google-login-button');
                if (buttonContainer) {
                    window.app.auth.renderButton(buttonContainer, {
                        theme: 'filled_blue',
                        size: 'large',
                    });
                }
            }
        }
    }

    addEventListeners() {
        // Login button handler
        this.on('click', '[data-action="login"]', async () => {
            if (window.app && window.app.auth) {
                try {
                    await window.app.auth.prompt();
                    // Redirect to profile after login
                    this.navigate('/profile');
                } catch (error) {
                    console.error('Login failed:', error);
                }
            }
        });
    }
}
