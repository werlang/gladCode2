<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
    <title>gladCode - Documentação</title>
    <link rel='stylesheet' href="css/docs.css"/>
    <script type="module" src="script/docs.js" async></script>
    
    </head>
<body>
    <div id='frame'>
        <div id='side-menu'></div>
        <div id='right-side'>
            <div id='content'>			
                <h1 id='nav-intro'>Documentação da API gladCode</h1>
                
                <p>Para a programação dos gladiadores, é necessário o uso de funções específicas para interação com os diversos aspectos da gladCode, como movimento, detecção de inimigos, e uso de habilidades. Nas seções abaixo está descrito a sintaxe de cada função disponível. </p>
                
                <div class='video'><iframe src="https://www.youtube.com/embed/Wrc-0_Kq-_4" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
                
                <p>As funções da gladCode também pode ser usadas no idioma Português. Caso deseje consulta-las, <a href='docs-ptbr'>clique aqui</a>.</p>
                
                <h2 id='nav-up'>Melhorias</h2>
                
                <p>As funções de melhoria definem que tipo de aprimoramento o gladiador está buscando. Toda vez que o gladiador <a href='manual#xp-table'>sobe de nível</a>, ele ganha 5 pontos de aprimoramento. Estes pontos podem ser gastos para melhorar um atributo básico. As funções de melhoria usam estes pontos e aumentam o atributo escolhido.</p>
            
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='upgradestr'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='upgradeagi'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='upgradeint'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                <h3></h3>
                
                <h2 id='nav-mov'>Movimento</h2>
                
                <p>As funções de movimento servem para posicionar o gladiador pela arena. Com elas o gladiador pode controlar para onde deseja ir e olhar. Sem elas ele se torna um alvo fácil.</p>
                
                <p>Somente uma função de movimento será executada pelo gladiador em cada intervalo da simulação (0.1s). Após uma ter sido chamada, o gladiador ficará esperando até que a próxima etapa inicie para continuar a execução de seu código.</p>
                
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='moveforward'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='moveto'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='movetotarget'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='stepforward'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='stepback'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='stepleft'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='stepright'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turnleft'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turnright'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turn'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turnto'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turntotarget'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turntolasthit'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='turntoangle'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-att'>Ataque</h2>

                <p>Através das funções de ataque que os gladiadores conseguem causar dano em seus inimigos e removê-los da competição.</p>
                
                <p>Após a execução de uma função de ataque, o gladiador ficará impossibilitado de agir e ficará esperando um tempo de acordo com seu atributo <b>velocidade de ataque</b>. Após este tempo o gladiador continuará a execução de seu código normalmente.</p>
                
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='attackmelee'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='attackranged'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-info'>Informações do gladiador</h2>
                
                <p>As funções de informação são a maneira que o gladiador conhece sobre si mesmo. Através delas ela sabe onde ele está, para onde está olhando e como está sua saúde.</p>
            
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='getstr'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getagi'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getint'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getlvl'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getx'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gety'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gethp'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getap'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getspeed'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gethead'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gethit'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getlasthittime'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getlasthitangle'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getblocktimeleft'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getambushtimeleft'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getburntimeleft'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='speak'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-sense'>Percepção do ambiente</h2>
                
                <p>Com as funções de informação os gladiadores conseguem determinar características sobre o ambiente e detectar os perigos ao redor, além de saber informações sobre seu alvo.</p>
                
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='issafehere'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='issafethere'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getsaferadius'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='howmanyenemies'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getcloseenemy'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getfarenemy'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getlowhp'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gethighhp'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gettargetx'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gettargety'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gettargethealth'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gettargetspeed'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='gettargethead'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='doyouseeme'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='istargetvisible'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='isstunned'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='isburning'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='isprotected'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='isrunning'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='isslowed'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getsimtime'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-hab'>Habilidades</h2>

                <p>As habilidades são técnicas especiais e magias que permitem que os gladiadores realizem feitos especiais para aniquilar seus inimigos ou se proteger. Ao usar uma habilidade o gladiador gasta seus pontos de habilidade, que recuperam automaticamente ao longo do tempo.</p>
                
                <p>Após a execução de uma função de habilidade, o gladiador ficará impossibilitado de agir e ficará esperando um tempo de acordo com seu atributo <b>velocidade de habilidade</b>. Após este tempo o gladiador continuará a execução de seu código normalmente.</p>

                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='fireball'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='teleport'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='charge'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='block'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='assassinate'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='ambush'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-item'>Uso de itens</h2>
                
                <p>As funções de uso de itens levam em consideração itens adquiridos no seu perfil de mestre. Eles podem ser usados para conceder vantagens dentro da arena</p>
            
                <table class='table t-funcs'>
                    <tbody>
                    <tr>
                        <td><a href='useitem'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='isitemready'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-math'>Matemática</h2>
                
                <p>As funções matemáticas estão presentes na gladCode para ajudar o competidor a realizar cálculos relativos à arena.</p>
            
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='getdist'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getdisttotarget'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='getangle'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <h2 id='nav-test'>Funções de teste</h2>
                
                <p>As funções de teste servem para testar situações de combate específicas, e elas podem ser usadas <b>somente dentro do editor</b>, e nas batalhas de teste. O código de um gladiador não pode ser salvo enquanto possuir alguma destas funções.</p>
            
                <table class='table t-funcs'>
                    <tbody>
                        <tr>
                            <td><a href='setposition'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='sethp'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='setap'></a></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><a href='lvlup'></a></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

            </div>
            <div id='ads'>
            </div>
            <div id='footer'></div>
        </div>
    </div>
</body>
</html>