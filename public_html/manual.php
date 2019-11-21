<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Documentação</title>
	<link href="https://fonts.googleapis.com/css?family=Roboto|Source+Code+Pro&display=swap" rel="stylesheet">
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet"/>
	
	<link rel='stylesheet' href="css/table.css"/>
	<link rel='stylesheet' href="css/manual.css"/>
	<link rel='stylesheet' href="css/side-menu.css"/>
	<link rel='stylesheet' href="css/prism.css"/>
	<link rel='stylesheet' href="css/header.css"/>
	
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
    <script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	
	<script src="script/docs.js"></script>
	<script src="script/side-menu.js"></script>
	<script src="script/googlelogin.js"></script>
	<script src="script/socket.js"></script>
	<script src="script/header.js"></script>
	<script src="script/prism.js"></script>
	
	</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
        <div id='side-menu'></div>
        <div id='right-side'>
            <div id='content-box'>
                <h1>Conhecendo a gladCode</h1>

                <h2 id='nav-intro'>A Competição</h2>
                <p>Na gladCode existe uma arena onde gladiadores virtuais batalham entre si até somente restar um vivo. Cada jogador, chamado mestre, possui a tarefa de programar o comportamento dos seus gladiadores, de modo que ele aja de maneira autônoma durante a batalha.</p>

                <div class='video'><iframe src="https://www.youtube.com/embed/te1M98UDKiM" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

                <h2 id='nav-glad'>Os Gladiadores</h2>
                <p>Os gladiadores são os representantes dos mestres dentro da arena. E como tal, irão obedecer sua programação fielmente com o objetivo de derrotar os gladiadores dos adversários. Eles possuem características que determinam suas forças e fraquezas. Estas características são chamadas de <strong>atributos</strong> do gladiador. Eles também possuem um <strong>nível</strong>. Este nível indica o quão experiente este gladiador já se tornou dentro da arena.</p>
                <p>Todos gladiadores iniciam em nível 1. Cada nível adicional concede a eles poder adicional na forma de melhorias de atributos. Os gladiadores possui três atributos principais, descritos a seguir:</p>
                <ul>
                    <li><strong>Força (STR)</strong>: Força física e resistência do gladiador. Afeta o dano corpo-a-corpo que o gladiador causa e sua quantidade de pontos de vida.</li>
                    <li><strong>Agilidade (AGI)</strong>: Agilidade, rapidez e destreza do gladiador. Afeta a precisão dos ataques à distância, o deslocamento do gladiador dentro da arena e a velocidade dos ataques dele.</li>
                    <li><strong>Inteligência (INT)</strong>: Rapidez de raciocínio e Capacidade intelectual do gladiador. Afeta a velocidade do gladiador para executar uma habilidade e a quantidade de vezes que ele consegue executar uma habilidade até se esgotar mentalmente.</li>
                </ul>
                <p>Cada um destes três atributos principais são responsáveis por atributos secundários, descritos a seguir:</p>
                <ul>
                    <li><strong>Dano físico</strong> (baseado em STR): Dano causado pelo gladiador ao realizar um ataque corpo-a-corpo. Representa a força bruta do gladiador.</li>
                    <li><strong>Pontos de vida, ou hp</strong> (baseado em STR): Dano que o gladiador suporta levar antes de morrer. Representa a resiliência física do gladiador.</li>
                    <li><strong>Precisão</strong> (baseado em AGI): Dano causado pelo gladiador ao realizar um ataque à distância. Representa a precisão do disparo do gladiador.</li>
                    <li><strong>Velocidade de ataque</strong> (baseado em AGI): Quantidade de ataques que o gladiador consegue executar por segundo. Representa a agilidade do gladiador em combate</li>
                    <li><strong>Velocidade de movimento</strong> (baseado em AGI): Distância que o gladiador consegue percorrer por segundo, medida em passos. Representa a rapidez com que o gladiador caminha.</li>
                    <li><strong>Velocidade de rotação</strong> (baseado em AGI): Quantos graus o gladiador consegue rotacionar por segundo.</li>
                    <li><strong>Poder mágico</strong> (baseado em INT): Dano causado pelo gladiador ao realizar um ataque usando uma habilidade mágica. Representa o nível de conhecimento que o gladiador possui a respeito das artes arcanas.</li>
                    <li><strong>Pontos de habilidade, ou ap</strong> (baseado em INT): Recurso gasto ao executar uma habilidade. Representa a resiliência mental do gladiador.</li>
                    <li><strong>Regeneração de ap</strong> (baseado em INT): Quantidade de pontos de habilidade regenerados por segundo. Representa a capacidade do gladiador de atuar sob pressão.</li>
                    <li><strong>Velocidade de habilidade</strong> (baseado em INT): Quantidade de habilidades que o gladiador consegue executar por segundo. Representa a rapidez de raciocínio do gladiador.</li>
                </ul>

                <h2 id='nav-atrib'>Atributos do gladiador</h2>
                <p>Ao criar um gladiador, os competidores precisam definir a distribuição inicial dos atributos básicos. Cada gladiador precisa receber atributos básicos que somados custam 50 pontos. O custo de cada ponto de atributo é variável, conforme a tabela abaixo:</p>

                <div class='table-wrapper'>
                    <table id='point-cost' class='table'>
                        <tbody>
                            <tr><th>Valor</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td><td>20</td></tr>
                            <tr><th>Custo</th><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>2</td><td>2</td><td>2</td><td>2</td><td>2</td><td>2</td><td>3</td><td>3</td><td>3</td><td>3</td><td>3</td><td>3</td><td>4</td><td>4</td></tr><tr><th>Soma</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>8</td><td>10</td><td>12</td><td>14</td><td>16</td><td>18</td><td>21</td><td>24</td><td>27</td><td>30</td><td>33</td><td>36</td><td>40</td><td>44</td></tr>
                        </tbody>
                    </table>
                </div>

                <p>Não se preocupe, você não precisa memorizar estes custos, pois o <a href='editor'>editor de gladiadores</a> cuida disto para você.</p>

                <img id='img-points' src='image/editor-points.png'>

                <p>Os efeitos dos atributos básicos sobre os secundários estão descritos a seguir:</p>

                <ul>
                    <li>Força (STR)</li>
                    <ul>
                        <li><strong>Dano físico(mdmg)</strong>: 5 mdmg + 0.75 mdmg por ponto de STR</li>
                        <li><strong>Pontos de Vida (hp)</strong>: 100 hp + 10 hp por ponto de STR</li>
                    </ul>
                    <li>Agilidade (AGI)</li>
                    <ul>
                        <li><strong>Precisão(rdmg)</strong>: 5 rdmg + 0.5 rdmg por ponto de AGI</li>
                        <li><strong>Velocidade de Ataque (as)</strong>: 0.5 as + 0.05 as por ponto de AGI</li>
                        <li><strong>Velocidade de Movimento (ms)</strong>: 1 ms + 0.05 ms por ponto de AGI</li>
                        <li><strong>Velocidade de Rotação (ts)</strong>: 90 ts + 9 ts por ponto de AGI</li>
                    </ul>
                    <li>Inteligência (INT)</li>
                    <ul>
                        <li><strong>Poder mágico(sdmg)</strong>: 0.5 sdmg por ponto de INT</li>
                        <li><strong>Pontos de Habilidade (ap)</strong>: 100 ap + 10 ap por ponto de INT</li>
                        <li><strong>Recuperação de ap (reg)</strong>: 5 ap + 0.25 ap por ponto de INT</li>
                        <li><strong>Velocidade de uso de Habilidade (cs)</strong>: 0.5 cs + 0.05 cs por ponto de INT</li>
                    </ul>
                </ul>

                <p>Existem também alguns atributos fixos dos gladiadores, que não sofrem mudanças em seus valores ao longo da simulação:</p>

                <ul>
                    <li><strong>Raio de visão</strong>: 120 graus - Arco de visão do gladiador</li>
                    <li><strong>Distância de visão</strong>: 9 passos - Distância máxima que o gladiador enxerga</li>
                </ul>

                <h2 id='nav-editor'>O editor de gladiadores</h2>

                <p>A página onde você personaliza a aparência, distribui os atributos e programa o comportamento de seu gladiador chama-se <a href='editor'>editor de gladiadores</a>. Nela você começa com uma interface que lhe permite escolher entre diversas opções de itens que configuram a aparência de seu gladiador.</p>

                <img id='img-editor' src='image/editor-glad.png'>

                <p>Após isso você passa para a distribuição dos pontos de atributos do gladiador, onde você possui 25 pontos para distribuir entre os atributos força, agilidade e inteligência do gladiador. Conforme explicado anteriormente, estes atributos irão influenciar o quão bom seu gladiador é em determinadas ações.</p>

                <p>Por último você deve programar seu gladiador usando o editor da página. Para tal você possui a disposição dezenas de funções que permitem o gladiador interagir e perceber o ambiente. Mais sobre a programação dos gladiadores será explicado adiante.</p>

                <h2 id='nav-sim'>Ambiente de simulação</h2>

                <p>Ao construir um gladiador, os competidores usarão as funções da <a href='#nav-prog'>API gladCode</a> para fazer o gladiador interagir com o ambiente. O ambiente representa uma arena, que possui <strong>dimensões 25x25 passos</strong>. As funções que lidam com distância usam a unidade Passos (p), que é uma unidade de medida específica da GladCode. Ela é um número float que representa 1/25 do comprimento total da arena, ou seja, isto quer dizer que a arena mede 25p.</p>

                <div class='row'>
                    <div class='col-2'>					
                        <p>Dentro da arena utilizamos um sistema de <a href='https://pt.wikipedia.org/wiki/Sistema_de_coordenadas_cartesiano' target='_blank'>coordenadas cartesianas</a>, isto quer dizer que um ponto dentro da arena é definido por um par de valores X e Y, onde X significa a distância em relação ao eixo vertical (aumentando da esquerda para a direita) e o Y a distância em relação ao eixo horizontal (aumentando de cima para baixo).
                        
                        <p>A simulação transcorre em intervalos de <strong>tempo de 0.1 segundos.</strong></p>
                        
                        <p>As funções que lidam com ângulo usam graus (g) como unidade de referência, e tomam por base uma circunferência de 360g que começa no <strong>topo</strong> e aumenta no <strong>sentido horário</strong>, conforme a figura ao lado.</p>
                        
                    </div>
                    
                    <div class='col-2'>
                        <img id='img-coords' src='image/circunf.png'>
                    </div>
                </div>

                <p>Os gladiadores irão batalhar dentro da arena utilizando sua própria programação, de forma autônoma até que somente um saia vivo. Caso uma batalha já esteja acontecendo por <strong>45 segundos</strong>, das bordas da arena surgirá um gás tóxico. Esta nuvem mortal lentamente se espalha pela arena em direção ao seu centro, com velocidade <strong>0.1 p/s</strong>. Todos gladiadores que estiverem dentro desta nuvem levam dano continuamente. Esta é uma maneira de garantir que a rodada não irá durar para sempre, além de incentivar que os gladiadores se direcionem para o centro da arena após certo tempo, aumentando as chances de um confronto direto.</p>

                <h2 id='nav-exp'>Experiência</h2>

                <div class='row'>
                    <div class='col-2'>
                        <p>Cada vez que algum gladiador causar dano a outro, ele ganhará <strong>pontos de experiência (xp)</strong> relativos a porcentagem do hp total que foi removido do gladiador atacado. Quando o gladiador atacante atingir uma quantidade de xp determinada (veja tabela ao lado), ele <strong>avançará de nível</strong>, concedendo a ele poder adicional.</p>
                        
                        <p>O poder adicional recebido será <strong>5 pontos de melhoria em qualquer atributo principal</strong> (STR, AGI ou INT), lembrando que ao melhorar os atributos principais, outros atributos secundários também serão melhorados, conforme <a href='#nav-atrib'>explicado anteriormente</a>. Além disso, o gladiador que subir de nível instantaneamente recuperará <strong>(35 + lvl * 5) hp e ap</strong>. Para realizar a melhoria dos atributos, o gladiador precisa chamar as <a href='docs#nav-up'>funções de melhoria</a>. Mais detalhes sobre a programação dos galdiadores será discutido adiante.</p>
                        
                        <p>A tabela ao lado relaciona a quantidade de xp necessária para evoluir cada nível, bem como o xp total que será necessário para chegar no nível. Note que a cada nível, o xp necessário para passar para o próximo nível é acrescido de 20%. Embora a tabela só demonstre os valores até o nível 15, não há limite para o nível dos gladiadores.</p>
                        
                    </div>
                    <div class='col-2'>
                        <table id='xp-table' class='table'>
                            <tbody>
                                <tr><th>Nível</th><th>Xp necessário</th><th>Xp total</th></tr>
                                <tr><td>1</td><td>-</td><td>-</td></tr>
                                <tr><td>2</td><td>25</td><td>25</td></tr>
                                <tr><td>3</td><td>30</td><td>55</td></tr>
                                <tr><td>4</td><td>36</td><td>91</td></tr>
                                <tr><td>5</td><td>43</td><td>134</td></tr>
                                <tr><td>6</td><td>52</td><td>186</td></tr>
                                <tr><td>7</td><td>62</td><td>248</td></tr>
                                <tr><td>8</td><td>75</td><td>323</td></tr>
                                <tr><td>9</td><td>90</td><td>412</td></tr>
                                <tr><td>10</td><td>107</td><td>520</td></tr>
                                <tr><td>11</td><td>129</td><td>649</td></tr>
                                <tr><td>12</td><td>155</td><td>804</td></tr>
                                <tr><td>13</td><td>186</td><td>990</td></tr>
                                <tr><td>14</td><td>223</td><td>1212</td></tr>
                                <tr><td>15</td><td>267</td><td>1480</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>			

                <h2 id='nav-hab'>Habilidades</h2>

                <p>Durante os confrontos, os gladiadores além de se movimentar, e utilizar ataques de curto e longo alcance, podem usar habilidades especiais. Cada habilidade possui um custo em pontos de habilidade (ap) ao ser executada, e causa um efeito específico, descrito na tabela abaixo:</p>

                <table id='habilidades' class='table'>
                    <tbody>
                        <tr>
                            <th>Habilidade</th>
                            <th>Custo (ap)</th>
                            <th>Descrição</th>
                        </tr>
                        <tr>
                            <td><a href='function/fireball'>Fireball</a></td>
                            <td>50</td>
                            <td>Arremessa um projétil que causa 60% do poder mágico de dano num ponto central de impacto. Todos gladiadores num raio de impacto 2p sofrem 180% do poder mágico de dano de queimadura ao longo de 4s. Alvos mais distantes do centro do impacto sofrem menos dano de queimadura</td>
                        </tr>
                        <tr>
                            <td><a href='function/teleport'>Teleport</a></td>
                            <td>50</td>
                            <td>O gladiador imediatamente se transporta para outra localização. A distância máxima percorrida é limitada em 5p + 1p por ponto de poder mágico.</td>
                        </tr>
                        <tr>
                            <td><a href='function/charge'>Charge</a></td>
                            <td>30</td>
                            <td>Corre em direção ao alvo com velocidade 4x. Ao alcançá-lo, realiza um ataque corpo-a-corpo que causa mais dano de acordo com a distância percorrida (entre 0% e 250% do dano físico), além de reduzir a velocidade de movimento do alvo por 5s. O valor da velocidade será alterado de acordo com a equação <a href='https://www.wolframalpha.com/input/?i=Plot%5BE%5E(-0.067+X),+%7BX,+0,+30%7D%5D' target='_blank'>Vel=e<sup>-0.067 STR</sup></a></td>
                        </tr>
                        <tr>
                            <td><a href='function/block'>Block</a></td>
                            <td>50</td>
                            <td>Reduz todo dano levado em 10% * (0.1 + STR/(STR+16)) por 7s. Caso o atacante não esteja no raio de visão do gladiador, o efeito da habilidade é reduzido pela metade</td>
                        </tr>
                        <tr>
                            <td><a href='function/assassinate'>Assassinate</a></td>
                            <td>30</td>
                            <td>Realiza um ataque à distância contra o alvo. Ao acertar, caso o alvo não esteja lhe enxergando OU atordoado causa dano de 170% da Precisão. Caso o alvo não esteja lhe enxergando E esteja atordoado a habilidade causa dano 250% da Precisão.</td>
                        </tr>
                        <tr>
                            <td><a href='function/ambush'>Ambush</a></td>
                            <td>70</td>
                            <td>Torna-se invisível por 1s + (0.1s x AGI). O efeito da habilidade é cancelado ao realizar um ataque ou lançar uma habilidade, e o gladiador não recupera ap enquanto estiver invisível. Ataques realizados enquanto invisível atordoam o alvo por 1.5s</td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-efeito'>Efeitos</h2>

                <p>Ao usar suas habilidades, os gladiadores podem causar em si mesmos ou em outros gladiadores uma série de efeitos temporários, descritos a seguir:</p>

                <table id='status' class='table'>
                    <tbody>
                        <tr>
                            <th>Efeito</th>
                            <th>Descrição</th>
                        </tr>
                        <tr>
                            <td>Queimadura</td>
                            <td>Durante o tempo de duração do efeito, o gladiador continuamente recebe dano. O dano total da queimadura é dividido igualmente durante este tempo.</td>
                        </tr>
                        <tr>
                            <td>Movimentação</td>
                            <td>O gladiador recebe um modificador que altera a velocidade de movimento, aumentando ou reduzindo-a.</td>
                        </tr>
                        <tr>
                            <td>Proteção</td>
                            <td>O gladiador recebe proteção extra a danos, reduzindo o efeito de todo tipo de dano direto causado a ele. Caso o gladiador não enxergue a direção do ataque recebido, a eficácia da proteção é reduzida.</td>
                        </tr>
                        <tr>
                            <td>Invisibilidade</td>
                            <td>Torna o gladiador invisível. Nenhum outro gladiador consegue detectar quem possuir este efeito. O efeito da invisibilidade acaba prematuramente caso o gladiador realize um ataque ou lance uma habilidade.</td>
                        </tr>
                        <tr>
                            <td>Atordoamento</td>
                            <td>O gladiador com este efeito fica impossibilitado de realizar qualquer ação durante o tempo do atordoamento.</td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-prog'>Programação</h2>

                <p>Para dar vida aos gladiadores, os competidores devem programar seu comportamento utilizando a sintaxe de uma linguagem de programação, por isso é recomendável que você tenha pelo menos um conhecimento básico de lógica de programação.</p>

                <p>Atualmente a gladCode possui suporte para programação utilizando a <strong>linguagem de programação C</strong>, mas se você conhece as estruturas básicas de qualquer <a href='https://pt.wikipedia.org/wiki/Programa%C3%A7%C3%A3o_imperativa' target='_blank'>linguagem imperativa</a>, não vai achar difícil se adaptar.</p>

                <p>O ambiente da simulação foi criado especialmente para a gladCode portanto existem funções específicas de entrada, que fazem com que o gladiador perceba o que está acontecendo na arena, e funções de saída que fazem com que o gladiador interaja com os elementos presentes na arena.</p>

                <p>Para programar um gladiador, o código-fonte do programa deverá conter a função <strong>loop()</strong>. Muito importante também é que seu código não possua a função main(). Utilize o <a href='editor' target='_blank'>editor de gladiadores</a> para criar o código de seu gladiador</p>

                <p>O funcionamento é bem simples. Na função loop() será colocado todo o comportamento do gladiador. A cada intervalo de tempo (0.1s) o gladiador irá executar todas as tarefas descritas dentro desta função:</p>

                <pre><code class="language-c">loop(){
    stepForward(); //função que faz mover para frente
}</code></pre>

                <p>No código acima, a cada intervalo de tempo (0.1s) o gladiador irá mover-se o quanto conseguir (depende de sua agilidade) para frente, resultando em sucessivas chamadas da função <a href='function/stepforward' target='_blank'>stepForward</a> ao longo do tempo.</p>

                <p>Porém, existem situações em que o gladiador não consegue executar todos os comando da função loop() em um único intervalo da simulação, como no caso abaixo:</p>

                <pre><code class="language-c">loop(){
    int i;
    for (i=0 ; i&lt10 ; i++) //faz 10 chamadas da função stepForward
        stepForward();
    turnLeft(); //função que rotaciona no sentido anti-horário
}</code></pre>

                <p>Neste caso o gladiador executa o que conseguir (1 chamada da função que move para frente), e a cada novo intervalo de tempo da simulação ele segue executando os próximos passos. Eventualmente, quando ele concluir todas as etapas descritas em sua função loop() (as 10 chamadas de stepForward mais a chamada de <a href='function/turnleft' target='_blank'>turnLeft</a>), ele irá começar novamente a função loop(). Este processo somente encerrará quando o gladiador morrer, ou quando a simulação terminar.</p>

                <p>Note que existem algumas funções que levam mais tempo para serem executadas, como por exemplos as funções de ataque (ex. <a href='function/attackmelee' target='_blank'>attackMelee</a>) e habilidade (ex. <a href='function/fireball' target='_blank'>fireball</a>). Neste caso o gladiador ficará esperando até que possa agir de novo para seguir a execução de seu código. Existem também as funções que não levam tempo algum de simulação para serem executadas, como as funções que detectam o ambiente (ex. <a href='function/gettargetx' target='_blank'>getTargetX</a>).</p>

                <div class='video'><iframe src="https://www.youtube.com/embed/Wrc-0_Kq-_4" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
            </div>
            <div id='footer'></div>
        </div>
    </div>
</body>
</html>