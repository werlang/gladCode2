<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Documentação</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700" type="text/css">
	<link type='text/css' rel='stylesheet' href='css/table.css'/> 
	<link type='text/css' rel='stylesheet' href='css/docs.css'/> 
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
</head>
<body>
	<?php include("header.php"); ?>
	<div id='frame'>
		<div id='content-box'>
			
			<h1>Documentação da API gladCode</h1>
			
			<p>Para a programação dos gladiadores, é necessário o uso de funções específicas para interação com os diversos aspectos da gladCode, como movimento, detecção de inimigos, e uso de habilidades. Nas seções abaixo está descrito a sintaxe de cada função disponível. </p>
			
			<div class='video'><iframe src="https://www.youtube.com/embed/Wrc-0_Kq-_4" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
			
			<div class='nav'>
				<a href='#nav-setup'>Setup</a>
				<a href='#nav-up'>Melhorias</a>
				<a href='#nav-mov'>Movimento</a>
				<a href='#nav-att'>Ataque</a>
				<a href='#nav-info'>Informações</a>
				<a href='#nav-sense'>Percepção</a>
				<a href='#nav-math'>Matemática</a>
				<a href='#nav-hab'>Habilidades</a>
			</div>

			<h2 id='nav-setup'>Setup</h2>
			
				<p>As funções de setup servem para definir as características do gladiador, como nome e atributos básicos. Elas podem ser chamadas somente dentro da função setup() no <a href='manual.php#nav-prog'>código do gladiador</a>.</p>
			
				<p><b>OBS: A função setup, bem como todas funções que devem estar contidas dentro da mesma, só devem estar presentes caso o modo clássico de <a href='socks.php' target='_blank'>batalha</a> ou <a href='tournment.php' target='_blank'>torneio</a> esteja sendo executado. Caso contrário, o <a href='editor.php' target='_blank'>editor de gladiadores</a> se encarrega de adicionar as informações do gladiador para o servidor.</b></p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=setname&l=pt'>mudaNome</a></td>
							<td>Atribui um nome para o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=setstr&l=pt'>mudaFOR</a></td>
							<td>Atribui um valor para o atributo Força (STR) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=setagi&l=pt'>mudaAGI</a></td>
							<td>Atribui um valor para o atributo Agilidade (AGI) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=setint&l=pt'>mudaINT</a></td>
							<td>Atribui um valor para o atributo Inteligência (INT) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=setspritesheet&l=pt'>mudaAparencia</a></td>
							<td>Atribui ao gladiador uma aparência.</td>
						</tr>
					</tbody>
				</table>
			
			<h2 id='nav-up'>Melhorias</h2>
			
				<p>As funções de melhoria definem que tipo de aprimoramento o gladiador está buscando. Toda vez que o gladiador <a href='manual.php#xp-table'>sobe de nível</a>, ele ganha um ponto em um atributo básico. As funções de melhoria indicam qual atributo será aprimorado na próxima vez que ele subir de nível. Estas funções podem ser chamadas tanto no setup() quanto no loop().</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=upgradestr&l=pt'>melhoraFOR</a></td>
							<td>Indica que o gladiador deve aprimorar o atributo Força.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=upgradeagi&l=pt'>melhoraAGI</a></td>
							<td>Indica que o gladiador deve aprimorar o atributo Agilidade.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=upgradeint&l=pt'>melhoraINT</a></td>
							<td>Indica que o gladiador deve aprimorar o atributo Inteligência.</td>
						</tr>
					</tbody>
				</table>
				<h3></h3>
			
			<h2 id='nav-mov'>Movimento</h2>
			
				<p>As funções de movimento servem para posicionar o gladiador pela arena. Com elas o gladiador pode controlar para onde deseja ir e olhar. Sem elas ele se torna um alvo fácil. </p>
				
				<p>Somente uma função de movimento será executada pelo gladiador em cada intervalo da simulação (0.1s). Após uma ter sido chamada, o gladiador ficará esperando até que a próxima etapa inicie para continuar a execução de seu código.</p>

				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=moveforward&l=pt'>moveFrente</a></td>
							<td>Move o gladiador para frente uma quantidade de passos.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=moveto&l=pt'>movePara</a></td>
							<td>Move o gladiador para um ponto.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=movetotarget&l=pt'>moveParaAlvo</a></td>
							<td>Move o gladiador para o alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=stepforward&l=pt'>passoFrente</a></td>
							<td>Move o gladiador para frente.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=stepback&l=pt'>passoTras</a></td>
							<td>Move o gladiador para trás.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=stepleft&l=pt'>passoEsquerda</a></td>
							<td>Move o gladiador para esquerda.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=stepright&l=pt'>passoDireita</a></td>
							<td>Move o gladiador para direita.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turnleft&l=pt'>viraEsquerda</a></td>
							<td>Rotaciona o gladiador no sentido anti-horário.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turnright&l=pt'>viraDireita</a></td>
							<td>Rotaciona o gladiador no sentido horário.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turn&l=pt'>vira</a></td>
							<td>Rotaciona o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turnto&l=pt'>viraPara</a></td>
							<td>Rotaciona o gladiador para um ponto.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turntotarget&l=pt'>viraParaAlvo</a></td>
							<td>Rotaciona o gladiador para o alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turntolasthit&l=pt'>viraFuiAcertado</a></td>
							<td>Rotaciona o gladiador para a origem do último ataque recebido.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=turntoangle&l=pt'>viraParaAngulo</a></td>
							<td>Rotaciona o gladiador para um ângulo.</td>
						</tr>
					</tbody>
				</table>

			<h2 id='nav-att'>Ataque</h2>

				<p>Através das funções de ataque que os gladiadores conseguem causar dano em seus inimigos e removê-los da competição.</p>
			
				<p>Após a execução de uma função de ataque, o gladiador ficará impossibilitado de agir e ficará esperando um tempo de acordo com seu atributo <b>velocidade de ataque</b>. Após este tempo o gladiador continuará a execução de seu código normalmente.</p>

				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=attackmelee&l=pt'>ataqueCorpo</a></td>
							<td>Realiza um ataque corpo-a-corpo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=attackranged&l=pt'>ataqueDistancia</a></td>
							<td>Realiza um ataque de longa distância.</td>
						</tr>
					</tbody>
				</table>

			<h2 id='nav-info'>Informações do gladiador</h2>
			
				<p>As funções de informação são a maneira que o gladiador conhece sobre si mesmo. Através delas ela sabe onde ele está, para onde está olhando e como está sua saúde.</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=getstr&l=pt'>pegaFOR</a></td>
							<td>Retorna o valor do atributo Força (STR) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getagi&l=pt'>pegaAGI</a></td>
							<td>Retorna o valor do atributo Agilidade (AGI) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getint&l=pt'>pegaINT</a></td>
							<td>Retorna o valor do atributo Inteligência (INT) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getx&l=pt'>pegaX</a></td>
							<td>Retorna a coordenada x do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gety&l=pt'>pegaY</a></td>
							<td>Retorna a coordenada y do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gethp&l=pt'>pegaPv</a></td>
							<td>Retorna os pontos de vida do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getap&l=pt'>pegaPa</a></td>
							<td>Retorna os pontos de habilidade do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getspeed&l=pt'>pegaVelocidade</a></td>
							<td>Retorna a velocidade do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gethead&l=pt'>pegaDirecao</a></td>
							<td>Retorna a direção do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gethit&l=pt'>fuiAcertado</a></td>
							<td>Descobre se o gladiador foi atacado.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getlasthittime&l=pt'>tempoFuiAcertado</a></td>
							<td>Retorna o tempo desde o último ataque recebido.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getlasthitangle&l=pt'>anguloFuiAcertado</a></td>
							<td>Retorna o ângulo de onde veio o último ataque.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getblocktimeleft&l=pt'>tempoBloqueio</a></td>
							<td>Retorna o tempo restante para expirar o efeito Proteção.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getambushtimeleft&l=pt'>tempoEmboscada</a></td>
							<td>Retorna o tempo restante para expirar o efeito Invisibilidade.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=speak&l=pt'>fala</a></td>
							<td>Mostra um balão de fala com uma mensagem.</td>
						</tr>
					</tbody>
				</table>

			<h2 id='nav-sense'>Percepção do ambiente</h2>
			
				<p>Com as funções de informação os gladiadores conseguem determinar características sobre o ambiente e detectar os perigos ao redor, além de saber informações sobre seu alvo.</p>
				
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=issafehere&l=pt'>seguroAqui</a></td>
							<td>Descobre se o gladiador está dentro da nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=issafethere&l=pt'>seguroLa</a></td>
							<td>Descobre se o ponto está dentro da nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getsaferadius&l=pt'>pegaRaioSeguro</a></td>
							<td>Retorna o raio da área livre de nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=howmanyenemies&l=pt'>quantosInimigos</a></td>
							<td>Retorna a quantidade de inimigos no campo de visão.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getcloseenemy&l=pt'>pegaInimigoProximo</a></td>
							<td>Procura um inimigo próximo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getfarenemy&l=pt'>pegaInimigoDistante</a></td>
							<td>Procura um inimigo distante.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getlowhp&l=pt'>pegaVidaBaixa</a></td>
							<td>Procura um inimigo com menos vida.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gethighhp&l=pt'>pegaVidaAlta</a></td>
							<td>Procura um inimigo com mais vida.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gettargetx&l=pt'>pegaXAlvo</a></td>
							<td>Retorna o valor da coordenada x do alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gettargety&l=pt'>pegaYAlvo</a></td>
							<td>Retorna o valor da coordenada y do alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gettargethealth&l=pt'>pegaSaudeAlvo</a></td>
							<td>Retorna a vida do alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gettargetspeed&l=pt'>pegaVelocidadeAlvo</a></td>
							<td>Retorna a velocidade do alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=gettargethead&l=pt'>pegaDirecaoAlvo</a></td>
							<td>Retorna a direção do alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=doyouseeme&l=pt'>voceMeVe</a></td>
							<td>Descobre se o alvo enxerga o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=istargetvisible&l=pt'>alvoVisivel</a></td>
							<td>Descobre se alvo está no campo de visão.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=isstunned&l=pt'>estaAtordoado</a></td>
							<td>Verifica se o alvo está atordoado.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=isburning&l=pt'>estaQueimando</a></td>
							<td>Verifica se o alvo está queimando.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=isprotected&l=pt'>estaProtegido</a></td>
							<td>Verifica se o alvo está protegido.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=isrunning&l=pt'>estaCorrendo</a></td>
							<td>Verifica se o alvo está correndo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=isslowed&l=pt'>estaLento</a></td>
							<td>Verifica se o alvo está lento.</td>
						</tr>
					</tbody>
				</table>
			
			<h2 id='nav-math'>Matemática</h2>
			
				<p>As funções matemáticas estão presentes na gladCode para ajudar o competidor a realizar cálculos relativos à arena.</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=getdist&l=pt'>pegaDistancia</a></td>
							<td>Retorna a distância até o ponto.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getdisttotarget&l=pt'>pegaDistanciaAlvo</a></td>
							<td>Retorna a distância até o alvo fixado.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=getangle&l=pt'>pegaAngulo</a></td>
							<td>Retorna o ângulo até o ponto.</td>
						</tr>
					</tbody>
				</table>

			<h2 id='nav-hab'>Habilidades</h2>

				<p>As habilidades são técnicas especiais e magias que permitem que os gladiadores realizem feitos especiais para aniquilar seus inimigos ou se proteger. Ao usar uma habilidade o gladiador gasta seus pontos de habilidade, que recuperam automaticamente ao longo do tempo.</p>
				
				<p>Após a execução de uma função de habilidade, o gladiador ficará impossibilitado de agir e ficará esperando um tempo de acordo com seu atributo <b>velocidade de habilidade</b>. Após este tempo o gladiador continuará a execução de seu código normalmente.</p>

				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function.php?f=fireball&l=pt'>bolaFogo</a></td>
							<td>Arremessa um projétil flamejante.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=teleport&l=pt'>teletransporte</a></td>
							<td>Transporta instantaneamente o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=charge&l=pt'>investida</a></td>
							<td>Corre em direção ao alvo e o ataca.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=block&l=pt'>bloqueio</a></td>
							<td>Aumenta a defesa do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=assassinate&l=pt'>assassinar</a></td>
							<td>Dispara um ataque que pode causar dano e efeito adicional no alvo.</td>
						</tr>
						<tr>
							<td><a href='function.php?f=ambush&l=pt'>emboscada</a></td>
							<td>Torna-se invisível.</td>
						</tr>
					</tbody>
				</table>
				
		</div>
	</div>
	<div id='footer-wrapper'>
		<div id='footer'>
			<div>© 2018 gladcode.tk</div>
			<div>Pablo Werlang</div>
			<div><a href='mailto:pswerlang@gmail.com'>pswerlang@gmail.com</a></div>
			<div><a target='_blank' href='creditos.txt'>Créditos</a></div>
		</div>
	</div>
</body>
</html>