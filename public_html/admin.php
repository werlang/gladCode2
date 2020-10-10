<!DOCTYPE html>

<?php
    session_start();
    include_once "connection.php";

    $sql = "SELECT id FROM usuarios WHERE email = 'pswerlang@gmail.com'";
    $result = runQuery($sql);
    $row = $result->fetch_assoc();
    $id = $row['id'];

    if(!isset($_SESSION['user']) || $_SESSION['user'] != $id) 
        header("Location: index");
?>

<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Atualização</title>

    <link type='text/css' rel='stylesheet' href='css/admin.css'/> 

    <script src="https://cdn.quilljs.com/1.3.6/quill.js" async></script>
    <script type="module" src="script/admin.js" async></script>
</head>
<body>
    <div id='frame'>
        <div id='side-menu'>
            <div id='title'><span>ADMIN AREA</span></div>
            <div class='item selected' id='update'><span>ATUALIZAÇÕES</span></div>
            <div class='item' id='translate'><span>TRADUÇÕES</span></div>
            <div class='item' id='posts'><span>NOTÍCIAS</span></div>
        </div>
        <div id='content-area'>
            <div id='update' class='content-box visible'>
                <div id='version'>
                    <div>Versão atual: <span id='current'></span></div>
                    <div id='type'>
                        <p>Tipo de mudança:</p>
                        <select>
                            <option>Reformulação (N.x.x)</option>
                            <option>Novas funcionalidades (x.N.x)</option>
                            <option selected>Alterações menores (x.x.N)</option>
                        </select>
                    </div>
                    <div>Nova versão: <input id='new'></div>
                </div>
                <div id='changes'>
                    <p>Sumário de mudanças</p>
                    <textarea></textarea>
                </div>
                <div id='postlink'>
                    <p>Link para o post completo</p>
                    <input type='text'>
                </div>
                <div id='keep-updated'>
                    <label><input type='checkbox'>Manter códigos atualizados</label>
                </div>
                <div id='pass-div'>
                    <p>Senha do administrador</p>
                    <input type='password'>
                </div>
                <button id='send' class='button'>Atualizar gladCode</button>
            </div>
            <div id='translate' class='content-box'>
                <h2>Sugestões de tradução</h2>
                <table class='table'>
                    <thead><tr><th>Usuário</th><th>Original</th><th>Sugestão</th><th>Idioma</th><th>Data</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div id='posts' class='content-box'>
                <h2>Notícias</h2>

                <table class='table'>
                    <thead><tr><th>Hash</th><th>Título</th><th>Data</th></tr></thead>
                    <tbody></tbody>
                </table>

                <h2>Nova notícia</h2>

                <input id='title' type='text' class='input' placeholder='Título da postagem...'>

                <div id='editor-container'>
                    <div id='editor'></div>
                </div>

                <div id='button-container'>
                    <button id='preview' class='button'>Ver HTML</button>
                    <button id='send' class='button'>POSTAR</button>
                </div>
                
                <div id='html-container'>
                    <textarea id='html'></textarea>
                </div>
            </div>
            <div id='footer'></div>
        </div>
    </div>

</body>
</html>