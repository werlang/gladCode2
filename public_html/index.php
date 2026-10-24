<!DOCTYPE html>

<html lang="pt-BR">
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="keywords" content="Programação, Gladiador, Arena, Robocode, RPG">
    <meta name="description" content="Programe gladiadores em C, Python ou blocos e veja seu código lutar na arena.">
    <meta name="theme-color" content="#0b1d2b">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />

    <meta property="og:title" content="gladCode">
    <meta property="og:image" content="https://www.gladcode.dev/icon/gladcode_icon.png">
    <meta property="og:image:width" content="200">
    <meta property="og:image:height" content="200">

    <meta property="og:url" content="https://gladcode.dev">
    <meta property="og:description" content="Programe gladiadores em C, Python ou blocos e veja seu código lutar na arena.">

    <title>gladCode</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Roboto:wght@400;500;700&family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet">

    <link rel='stylesheet' href="css/index.css?v=<?php echo filemtime(__DIR__.'/css/index.css') ?>"/>
    <link rel='stylesheet' href="css/dialog.css"/>
    <link rel='stylesheet' href="css/header.css"/>

    <script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>

    <script type="module" src="script/index.js?v=<?php echo filemtime(__DIR__.'/script/index.js') ?>"></script>
    <script src="script/dialog.js"></script>

    <script type="module" src="script/google-login.js"></script>
    <script type="module" src="script/header.js"></script>

    </head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VT4EF5GTBP"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-VT4EF5GTBP');
    </script>
<?php
    include("header.php");
    if (isset($_GET['login'])){
        if (isset($_SESSION['user'])){
            $link = "profile.php?t=".$_GET['login'];
            header("Location: $link");
        }
        else
            echo "<div id='loginhash' hidden>".htmlspecialchars($_GET['login'])."</div>";
    }
    $logged = isset($_SESSION['user']);
?>

<body class='home'>
<main>
    <section id='hero'>
        <div class='hero-copy'>
            <p class='eyebrow'>Programação &times; arena</p>
            <h1>Você escreve a estratégia.<br><span>Eles lutam.</span></h1>
            <p class='lead'>Programe o comportamento de gladiadores em C, Python ou blocos. Dentro da arena eles não recebem ajuda: cada passo, golpe e magia sai da lógica que você escreveu.</p>
            <div class='actions'>
                <a class='btn primary' href='editor'>Criar meu gladiador</a>
                <a class='btn ghost' href='manual'>Como funciona</a>
            </div>
            <ul class='facts'>
                <li>Gratuito</li>
                <li>Mais de 70 funções de combate</li>
                <li>Partidas ranqueadas e torneios</li>
            </ul>
        </div>

        <div class='hero-stage' aria-label='Exemplo de código e batalha'>
            <figure class='code-panel'>
                <div class='code-bar'>
                    <div class='tabs' role='tablist' aria-label='Linguagem do exemplo'>
                        <button role='tab' aria-selected='true' data-lang='c'>gladiador.c</button>
                        <button role='tab' aria-selected='false' data-lang='py'>gladiador.py</button>
                    </div>
                </div>
<pre class='code' data-lang='c'><code><span class='l'><span class='k'>int</span> start = <span class='n'>1</span>;</span>
<span class='l'><span class='f'>loop</span>(){</span>
<span class='l'>    <span class='k'>if</span> (<span class='a'>getLowHp</span>()){</span>
<span class='l'>        <span class='k'>float</span> d = <span class='a'>getDistToTarget</span>();</span>
<span class='l'>        <span class='k'>if</span> (!<span class='a'>isSlowed</span>() &amp;&amp; d &gt; <span class='n'>2</span>)</span>
<span class='l'>            <span class='a'>charge</span>();</span>
<span class='l'>        <span class='k'>else if</span> (d &lt;= <span class='n'>1</span>)</span>
<span class='l'>            <span class='a'>attackMelee</span>();</span>
<span class='l'>        <span class='k'>else</span></span>
<span class='l'>            <span class='a'>moveToTarget</span>();</span>
<span class='l'>    }</span>
<span class='l'>    <span class='k'>else if</span> (start || !<span class='a'>isSafeHere</span>()){</span>
<span class='l'>        <span class='k'>if</span> (<span class='a'>moveTo</span>(<span class='n'>12.5</span>, <span class='n'>12.5</span>))</span>
<span class='l'>            start = <span class='n'>0</span>;</span>
<span class='l'>    }</span>
<span class='l'>    <span class='k'>else</span></span>
<span class='l'>        <span class='a'>turn</span>(<span class='n'>5</span>);</span>
<span class='l'>}</span></code></pre>
<pre class='code' data-lang='py' hidden><code><span class='l'>start = <span class='k'>True</span></span>
<span class='l'><span class='k'>def</span> <span class='f'>loop</span>():</span>
<span class='l'>    <span class='k'>global</span> start</span>
<span class='l'>    <span class='k'>if</span> <span class='a'>getLowHp</span>():</span>
<span class='l'>        d = <span class='a'>getDistToTarget</span>()</span>
<span class='l'>        <span class='k'>if not</span> <span class='a'>isSlowed</span>() <span class='k'>and</span> d &gt; <span class='n'>2</span>:</span>
<span class='l'>            <span class='a'>charge</span>()</span>
<span class='l'>        <span class='k'>elif</span> d &lt;= <span class='n'>1</span>:</span>
<span class='l'>            <span class='a'>attackMelee</span>()</span>
<span class='l'>        <span class='k'>else</span>:</span>
<span class='l'>            <span class='a'>moveToTarget</span>()</span>
<span class='l'>    <span class='k'>elif</span> start <span class='k'>or not</span> <span class='a'>isSafeHere</span>():</span>
<span class='l'>        <span class='k'>if</span> <span class='a'>moveTo</span>(<span class='n'>12.5</span>, <span class='n'>12.5</span>):</span>
<span class='l'>            start = <span class='k'>False</span></span>
<span class='l'>    <span class='k'>else</span>:</span>
<span class='l'>        <span class='a'>turn</span>(<span class='n'>5</span>)</span></code></pre>
            </figure>
            <figure class='arena-panel'>
                <video src='image/battle-movie.mp4' muted loop playsinline preload='auto' aria-label='Gravação de uma batalha na arena'></video>
                <figcaption><span class='live'></span>Batalha simulada a partir do código</figcaption>
            </figure>
        </div>
    </section>

    <section id='steps' aria-labelledby='steps-title'>
        <header class='section-head'>
            <p class='eyebrow'>Do editor à arena</p>
            <h2 id='steps-title'>Três passos até a primeira vitória</h2>
        </header>
        <ol class='step-list'>
            <li class='step'>
                <img class='sprite' src='image/huntress.png' data-anim='image/huntress.gif' alt='' width='64' height='64'>
                <h3>Programe a lógica</h3>
                <p>Use toda a sintaxe básica da linguagem e funções para mover, virar, atacar, lançar magias e detectar inimigos. Não existe terminal: o gladiador só sabe o que o seu código perguntar.</p>
                <a href='docs'>Ver as funções</a>
            </li>
            <li class='step'>
                <img class='sprite' src='image/archer.png' data-anim='image/archer.gif' alt='' width='64' height='64'>
                <h3>Monte o gladiador</h3>
                <p>Escolha a aparência e distribua pontos entre força, agilidade e inteligência. Guerreiro, ladino, mago ou qualquer mistura: cada combinação muda o que a sua estratégia consegue fazer.</p>
                <a href='editor'>Abrir o editor</a>
            </li>
            <li class='step'>
                <img class='sprite' src='image/mage.png' data-anim='image/mage.gif' alt='' width='64' height='64'>
                <h3>Entre na arena</h3>
                <p>Teste contra outros gladiadores, suba de nível durante a luta e dispute partidas ranqueadas, torneios e treinos com a comunidade. Só os fortes chegam ao topo.</p>
                <a href='manual'>Conhecer a simulação</a>
            </li>
        </ol>
    </section>

    <section id='videos' aria-labelledby='videos-title'>
        <header class='section-head'>
            <p class='eyebrow'>Assista</p>
            <h2 id='videos-title'>Veja a gladCode em ação</h2>
        </header>
        <div class='video-grid'>
            <button class='video' data-video='te1M98UDKiM'>
                <span class='thumb'><img src='https://img.youtube.com/vi/te1M98UDKiM/mqdefault.jpg' alt='' loading='lazy'><span class='play' aria-hidden='true'></span></span>
                <span class='title'>Desenvolva sua lógica</span>
                <span class='desc'>Como o código vira comportamento na arena.</span>
            </button>
            <button class='video' data-video='tjMjqQ14AS8'>
                <span class='thumb'><img src='https://img.youtube.com/vi/tjMjqQ14AS8/mqdefault.jpg' alt='' loading='lazy'><span class='play' aria-hidden='true'></span></span>
                <span class='title'>Entre no clima</span>
                <span class='desc'>Aparência, atributos e o criador de gladiadores.</span>
            </button>
            <button class='video' data-video='5QQtfruq8_8'>
                <span class='thumb'><img src='https://img.youtube.com/vi/5QQtfruq8_8/mqdefault.jpg' alt='' loading='lazy'><span class='play' aria-hidden='true'></span></span>
                <span class='title'>Sinta o poder</span>
                <span class='desc'>Magias, habilidades e subida de nível.</span>
            </button>
            <button class='video' data-video='Wrc-0_Kq-_4'>
                <span class='thumb'><img src='https://img.youtube.com/vi/Wrc-0_Kq-_4/mqdefault.jpg' alt='' loading='lazy'><span class='play' aria-hidden='true'></span></span>
                <span class='title'>Conheça suas ferramentas</span>
                <span class='desc'>As funções que dão vida aos gladiadores.</span>
            </button>
        </div>
    </section>

    <section id='join' aria-labelledby='join-title'>
        <div class='join-card'>
            <div class='join-sprites' aria-hidden='true'>
                <img src='image/warrior.gif' alt='' width='64' height='64'>
                <img src='image/orc.gif' alt='' width='64' height='64'>
            </div>
            <div class='join-copy'>
                <h2 id='join-title'>Os portões estão abertos</h2>
                <?php if ($logged): ?>
                <p>Seus gladiadores estão esperando. Ajuste a estratégia, confira o ranking e desafie seus amigos.</p>
                <div class='actions'>
                    <a class='btn primary' href='news'>Ir para o meu perfil</a>
                </div>
                <?php else: ?>
                <p>Entre com sua conta do Google para salvar seus gladiadores, acompanhar o ranking e disputar partidas contra outros jogadores.</p>
                <div class='actions'>
                    <button class='btn primary' id='account'>Entrar com Google</button>
                </div>
                <?php endif; ?>
            </div>
            <div class='join-community'>
                <h3>Comunidade</h3>
                <p>Mostre seus gladiadores, troque estratégias e tire dúvidas.</p>
                <ul>
                    <li><a href='https://forms.gle/BDbSmcLpPgwLe4Uc7' target='_blank' rel='noopener'>WhatsApp</a></li>
                    <li><a href='https://www.reddit.com/r/gladcode/' target='_blank' rel='noopener'>Reddit</a></li>
                    <li><a href='https://www.facebook.com/gladcode/' target='_blank' rel='noopener'>Facebook</a></li>
                </ul>
            </div>
        </div>
    </section>
</main>
<footer id='site-footer'>
    <nav aria-label='Links do rodapé'>
        <a href='about'>O projeto</a>
        <a href='creditos'>Créditos</a>
        <a href='stats'>Estatísticas</a>
        <a href='mailto:pswerlang@gmail.com'>Contato</a>
    </nav>
    <span>Copyright © 2018-<?php echo date('Y') ?> Pablo Werlang</span>
</footer>
</body>
</html>
