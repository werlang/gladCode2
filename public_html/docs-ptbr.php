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
			
				<p>As funções de setup servem para definir as características do gladiador, como nome e atributos básicos. Elas podem ser chamadas somente dentro da função setup() no <a href='manual#nav-prog'>código do gladiador</a>.</p>
			
				<p><b>OBS: A função setup, bem como todas funções que devem estar contidas dentro da mesma, só devem estar presentes caso o modo clássico de <a href='socks' target='_blank'>batalha</a> ou <a href='tournment' target='_blank'>torneio</a> esteja sendo executado. Caso contrário, o <a href='editor' target='_blank'>editor de gladiadores</a> se encarrega de adicionar as informações do gladiador para o servidor.</b></p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='funcao/setname'>mudaNome</a></td>
							<td>Atribui um nome para o gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/setstr'>mudaFOR</a></td>
							<td>Atribui um valor para o atributo Força (STR) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/setagi'>mudaAGI</a></td>
							<td>Atribui um valor para o atributo Agilidade (AGI) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/setint'>mudaINT</a></td>
							<td>Atribui um valor para o atributo Inteligência (INT) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/setspritesheet'>mudaAparencia</a></td>
							<td>Atribui ao gladiador uma aparência.</td>
						</tr>
					</tbody>
				</table>
			
			<h2 id='nav-up'>Melhorias</h2>
			
				<p>As funções de melhoria definem que tipo de aprimoramento o gladiador está buscando. Toda vez que o gladiador <a href='manual#xp-table'>sobe de nível</a>, ele ganha um ponto em um atributo básico. As funções de melhoria indicam qual atributo será aprimorado na próxima vez que ele subir de nível. Estas funções podem ser chamadas tanto no setup() quanto no loop().</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='funcao/upgradestr'>melhoraFOR</a></td>
							<td>Indica que o gladiador deve aprimorar o atributo Força.</td>
						</tr>
						<tr>
							<td><a href='funcao/upgradeagi'>melhoraAGI</a></td>
							<td>Indica que o gladiador deve aprimorar o atributo Agilidade.</td>
						</tr>
						<tr>
							<td><a href='funcao/upgradeint'>melhoraINT</a></td>
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
							<td><a href='funcao/moveforward'>moveFrente</a></td>
							<td>Move o gladiador para frente uma quantidade de passos.</td>
						</tr>
						<tr>
							<td><a href='funcao/moveto'>movePara</a></td>
							<td>Move o gladiador para um ponto.</td>
						</tr>
						<tr>
							<td><a href='funcao/movetotarget'>moveParaAlvo</a></td>
							<td>Move o gladiador para o alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/stepforward'>passoFrente</a></td>
							<td>Move o gladiador para frente.</td>
						</tr>
						<tr>
							<td><a href='funcao/stepback'>passoTras</a></td>
							<td>Move o gladiador para trás.</td>
						</tr>
						<tr>
							<td><a href='funcao/stepleft'>passoEsquerda</a></td>
							<td>Move o gladiador para esquerda.</td>
						</tr>
						<tr>
							<td><a href='funcao/stepright'>passoDireita</a></td>
							<td>Move o gladiador para direita.</td>
						</tr>
						<tr>
							<td><a href='funcao/turnleft'>viraEsquerda</a></td>
							<td>Rotaciona o gladiador no sentido anti-horário.</td>
						</tr>
						<tr>
							<td><a href='funcao/turnright'>viraDireita</a></td>
							<td>Rotaciona o gladiador no sentido horário.</td>
						</tr>
						<tr>
							<td><a href='funcao/turn'>vira</a></td>
							<td>Rotaciona o gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/turnto'>viraPara</a></td>
							<td>Rotaciona o gladiador para um ponto.</td>
						</tr>
						<tr>
							<td><a href='funcao/turntotarget'>viraParaAlvo</a></td>
							<td>Rotaciona o gladiador para o alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/turntolasthit'>viraFuiAcertado</a></td>
							<td>Rotaciona o gladiador para a origem do último ataque recebido.</td>
						</tr>
						<tr>
							<td><a href='funcao/turntoangle'>viraParaAngulo</a></td>
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
							<td><a href='funcao/attackmelee'>ataqueCorpo</a></td>
							<td>Realiza um ataque corpo-a-corpo.</td>
						</tr>
						<tr>
							<td><a href='funcao/attackranged'>ataqueDistancia</a></td>
							<td>Realiza um ataque de longa distância.</td>
						</tr>
					</tbody>
				</table>

			<h2 id='nav-info'>Informações do gladiador</h2>
			
				<p>As funções de informação são a maneira que o gladiador conhece sobre si mesmo. Através delas ela sabe onde ele está, para onde está olhando e como está sua saúde.</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='funcao/getstr'>pegaFOR</a></td>
							<td>Retorna o valor do atributo Força (STR) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/getagi'>pegaAGI</a></td>
							<td>Retorna o valor do atributo Agilidade (AGI) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/getint'>pegaINT</a></td>
							<td>Retorna o valor do atributo Inteligência (INT) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/getlvl'>pegaNivel</a></td>
							<td>Retorna o nível do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/getx'>pegaX</a></td>
							<td>Retorna a coordenada x do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/gety'>pegaY</a></td>
							<td>Retorna a coordenada y do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/gethp'>pegaPv</a></td>
							<td>Retorna os pontos de vida do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/getap'>pegaPa</a></td>
							<td>Retorna os pontos de habilidade do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/getspeed'>pegaVelocidade</a></td>
							<td>Retorna a velocidade do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/gethead'>pegaDirecao</a></td>
							<td>Retorna a direção do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/gethit'>fuiAcertado</a></td>
							<td>Descobre se o gladiador foi atacado.</td>
						</tr>
						<tr>
							<td><a href='funcao/getlasthittime'>tempoFuiAcertado</a></td>
							<td>Retorna o tempo desde o último ataque recebido.</td>
						</tr>
						<tr>
							<td><a href='funcao/getlasthitangle'>anguloFuiAcertado</a></td>
							<td>Retorna o ângulo de onde veio o último ataque.</td>
						</tr>
						<tr>
							<td><a href='funcao/getblocktimeleft'>tempoBloqueio</a></td>
							<td>Retorna o tempo restante para expirar o efeito Proteção.</td>
						</tr>
						<tr>
							<td><a href='funcao/getambushtimeleft'>tempoEmboscada</a></td>
							<td>Retorna o tempo restante para expirar o efeito Invisibilidade.</td>
						</tr>
						<tr>
							<td><a href='funcao/speak'>fala</a></td>
							<td>Mostra um balão de fala com uma mensagem.</td>
						</tr>
					</tbody>
				</table>

			<h2 id='nav-sense'>Percepção do ambiente</h2>
			
				<p>Com as funções de informação os gladiadores conseguem determinar características sobre o ambiente e detectar os perigos ao redor, além de saber informações sobre seu alvo.</p>
				
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='funcao/issafehere'>seguroAqui</a></td>
							<td>Descobre se o gladiador está dentro da nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='funcao/issafethere'>seguroLa</a></td>
							<td>Descobre se o ponto está dentro da nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='funcao/getsaferadius'>pegaRaioSeguro</a></td>
							<td>Retorna o raio da área livre de nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='funcao/howmanyenemies'>quantosInimigos</a></td>
							<td>Retorna a quantidade de inimigos no campo de visão.</td>
						</tr>
						<tr>
							<td><a href='funcao/getcloseenemy'>pegaInimigoProximo</a></td>
							<td>Procura um inimigo próximo.</td>
						</tr>
						<tr>
							<td><a href='funcao/getfarenemy'>pegaInimigoDistante</a></td>
							<td>Procura um inimigo distante.</td>
						</tr>
						<tr>
							<td><a href='funcao/getlowhp'>pegaVidaBaixa</a></td>
							<td>Procura um inimigo com menos vida.</td>
						</tr>
						<tr>
							<td><a href='funcao/gethighhp'>pegaVidaAlta</a></td>
							<td>Procura um inimigo com mais vida.</td>
						</tr>
						<tr>
							<td><a href='funcao/gettargetx'>pegaXAlvo</a></td>
							<td>Retorna o valor da coordenada x do alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/gettargety'>pegaYAlvo</a></td>
							<td>Retorna o valor da coordenada y do alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/gettargethealth'>pegaSaudeAlvo</a></td>
							<td>Retorna a vida do alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/gettargetspeed'>pegaVelocidadeAlvo</a></td>
							<td>Retorna a velocidade do alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/gettargethead'>pegaDirecaoAlvo</a></td>
							<td>Retorna a direção do alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/doyouseeme'>voceMeVe</a></td>
							<td>Descobre se o alvo enxerga o gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/istargetvisible'>alvoVisivel</a></td>
							<td>Descobre se alvo está no campo de visão.</td>
						</tr>
						<tr>
							<td><a href='funcao/isstunned'>estaAtordoado</a></td>
							<td>Verifica se o alvo está atordoado.</td>
						</tr>
						<tr>
							<td><a href='funcao/isburning'>estaQueimando</a></td>
							<td>Verifica se o alvo está queimando.</td>
						</tr>
						<tr>
							<td><a href='funcao/isprotected'>estaProtegido</a></td>
							<td>Verifica se o alvo está protegido.</td>
						</tr>
						<tr>
							<td><a href='funcao/isrunning'>estaCorrendo</a></td>
							<td>Verifica se o alvo está correndo.</td>
						</tr>
						<tr>
							<td><a href='funcao/isslowed'>estaLento</a></td>
							<td>Verifica se o alvo está lento.</td>
						</tr>
						<tr>
							<td><a href='funcao/getsimtime'>pegaTempo</a></td>
							<td>Retorna o tempo da simulação.</td>
						</tr>
					</tbody>
				</table>
			
			<h2 id='nav-math'>Matemática</h2>
			
				<p>As funções matemáticas estão presentes na gladCode para ajudar o competidor a realizar cálculos relativos à arena.</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='funcao/getdist'>pegaDistancia</a></td>
							<td>Retorna a distância até o ponto.</td>
						</tr>
						<tr>
							<td><a href='funcao/getdisttotarget'>pegaDistanciaAlvo</a></td>
							<td>Retorna a distância até o alvo fixado.</td>
						</tr>
						<tr>
							<td><a href='funcao/getangle'>pegaAngulo</a></td>
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
							<td><a href='funcao/fireball'>bolaFogo</a></td>
							<td>Arremessa um projétil flamejante.</td>
						</tr>
						<tr>
							<td><a href='funcao/teleport'>teletransporte</a></td>
							<td>Transporta instantaneamente o gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/charge'>investida</a></td>
							<td>Corre em direção ao alvo e o ataca.</td>
						</tr>
						<tr>
							<td><a href='funcao/block'>bloqueio</a></td>
							<td>Aumenta a defesa do gladiador.</td>
						</tr>
						<tr>
							<td><a href='funcao/assassinate'>assassinar</a></td>
							<td>Dispara um ataque que pode causar dano e efeito adicional no alvo.</td>
						</tr>
						<tr>
							<td><a href='funcao/ambush'>emboscada</a></td>
							<td>Torna-se invisível.</td>
						</tr>
					</tbody>
				</table>
				
		</div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>