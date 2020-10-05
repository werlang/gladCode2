<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <BASE href="../">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode</title>

    <link rel='stylesheet' href="css/function.css"/>
    
    <script src="https://kit.fontawesome.com/c1a16f97ec.js" crossorigin="anonymous" async></script>
    <script src='https://code.jquery.com/jquery-3.4.1.min.js' async></script>

    <script type="module" src="script/function.js" async></script>
    
    </head>
<body>
    <div id='frame'>
        <div id='side-menu'></div>
        <div id='right-side'>
            <div id='content'>			
                <div id='language'>
                    <label>Linguagem: </label>
                    <select>
                        <option value='c'>C</option>
                        <option value='python'>Python</option>
                        <option value='blocks'>Blocos</option>
                    </select>
                </div>

                <div id='template'>
                    <h2 id='temp-name'></h2>
                    <pre><code class="language-c" id='temp-syntax'></code></pre>
                    <p id='temp-description'></p>
                                
                    <h3>Parâmetros</h3>
                    <div id='temp-param'></div>
                    
                    <h3>Retorno</h3>
                    <p id='temp-return'></p>
                    
                    <h3>Exemplo</h3>
                    <pre><code class="language-c" id='temp-sample'></code></pre>
                    <p id='temp-explain'></p>
                    
                    <h3>Veja também</h3>
                    <table class='table t-funcs'>
                        <tbody id='temp-seealso'>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id='footer'></div>
        </div>
    </div>
    <?php
        $func = "";
        if (isset($_GET['f']))
            echo "<input type='hidden' id='vget' value='". $_GET['f'] ."'>";
        if (isset($_GET['l']))
            echo "<div id='dict' hidden>". $_GET['l'] ."</div>";
        if (isset($_GET['p']))
            echo "<div id='get-lang' hidden>". $_GET['p'] ."</div>";
        
    ?>
</body>
</html>