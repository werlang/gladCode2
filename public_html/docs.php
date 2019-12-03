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
	<link rel='stylesheet' href="css/docs.css"/>
	<link rel='stylesheet' href="css/side-menu.css"/>
	<link rel='stylesheet' href="css/header.css"/>
	
	<script src='https://code.jquery.com/jquery-3.4.1.min.js'></script>
	<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>
	<script src="script/docs.js"></script>
	<script src="script/side-menu.js"></script>
	<script src="script/googlelogin.js"></script>
	<script src="script/socket.js"></script>
	<script src="script/header.js"></script>
	
	</head>
<body>
	<?php include("header.php"); ?>
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
							<td><a href='function/upgradestr'>upgradeSTR</a></td>
							<td>Aprimora o atributo Força.</td>
						</tr>
						<tr>
							<td><a href='function/upgradeagi'>upgradeAGI</a></td>
							<td>Aprimora o atributo Agilidade.</td>
						</tr>
						<tr>
							<td><a href='function/upgradeint'>upgradeINT</a></td>
							<td>Aprimora Inteligência.</td>
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
							<td><a href='function/moveforward'>moveForward</a></td>
							<td>Move o gladiador para frente uma quantidade de passos.</td>
						</tr>
						<tr>
							<td><a href='function/moveto'>moveTo</a></td>
							<td>Move o gladiador para um ponto.</td>
						</tr>
						<tr>
							<td><a href='function/movetotarget'>moveToTarget</a></td>
							<td>Move o gladiador para o alvo.</td>
						</tr>
						<tr>
							<td><a href='function/stepforward'>stepForward</a></td>
							<td>Move o gladiador para frente.</td>
						</tr>
						<tr>
							<td><a href='function/stepback'>stepBack</a></td>
							<td>Move o gladiador para trás.</td>
						</tr>
						<tr>
							<td><a href='function/stepleft'>stepLeft</a></td>
							<td>Move o gladiador para esquerda.</td>
						</tr>
						<tr>
							<td><a href='function/stepright'>stepRight</a></td>
							<td>Move o gladiador para direita.</td>
						</tr>
						<tr>
							<td><a href='function/turnleft'>turnLeft</a></td>
							<td>Rotaciona o gladiador no sentido anti-horário.</td>
						</tr>
						<tr>
							<td><a href='function/turnright'>turnRight</a></td>
							<td>Rotaciona o gladiador no sentido horário.</td>
						</tr>
						<tr>
							<td><a href='function/turn'>turn</a></td>
							<td>Rotaciona o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/turnto'>turnTo</a></td>
							<td>Rotaciona o gladiador para um ponto.</td>
						</tr>
						<tr>
							<td><a href='function/turntotarget'>turnToTarget</a></td>
							<td>Rotaciona o gladiador para o alvo.</td>
						</tr>
						<tr>
							<td><a href='function/turntolasthit'>turnToLastHit</a></td>
							<td>Rotaciona o gladiador para a origem do último ataque recebido.</td>
						</tr>
						<tr>
							<td><a href='function/turntoangle'>turnToAngle</a></td>
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
							<td><a href='function/attackmelee'>attackMelee</a></td>
							<td>Realiza um ataque corpo-a-corpo.</td>
						</tr>
						<tr>
							<td><a href='function/attackranged'>attackRanged</a></td>
							<td>Realiza um ataque de longa distância.</td>
						</tr>
					</tbody>
				</table>

				<h2 id='nav-info'>Informações do gladiador</h2>
				
				<p>As funções de informação são a maneira que o gladiador conhece sobre si mesmo. Através delas ela sabe onde ele está, para onde está olhando e como está sua saúde.</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function/getstr'>getSTR</a></td>
							<td>Retorna o valor do atributo Força (STR) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/getagi'>getAGI</a></td>
							<td>Retorna o valor do atributo Agilidade (AGI) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/getint'>getINT</a></td>
							<td>Retorna o valor do atributo Inteligência (INT) do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/getlvl'>getLvl</a></td>
							<td>Retorna o nível do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/getx'>getX</a></td>
							<td>Retorna a coordenada x do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/gety'>getY</a></td>
							<td>Retorna a coordenada y do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/gethp'>getHp</a></td>
							<td>Retorna os pontos de vida do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/getap'>getAp</a></td>
							<td>Retorna os pontos de habilidade do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/getspeed'>getSpeed</a></td>
							<td>Retorna a velocidade do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/gethead'>getHead</a></td>
							<td>Retorna a direção do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/gethit'>getHit</a></td>
							<td>Descobre se o gladiador foi atacado.</td>
						</tr>
						<tr>
							<td><a href='function/getlasthittime'>getLastHitTime</a></td>
							<td>Retorna o tempo desde o último ataque recebido.</td>
						</tr>
						<tr>
							<td><a href='function/getlasthitangle'>getLastHitAngle</a></td>
							<td>Retorna o ângulo de onde veio o último ataque.</td>
						</tr>
						<tr>
							<td><a href='function/getblocktimeleft'>getBlockTimeLeft</a></td>
							<td>Retorna o tempo restante para expirar o efeito Proteção.</td>
						</tr>
						<tr>
							<td><a href='function/getambushtimeleft'>getAmbushTimeLeft</a></td>
							<td>Retorna o tempo restante para expirar o efeito Invisibilidade.</td>
						</tr>
						<tr>
							<td><a href='function/speak'>speak</a></td>
							<td>Mostra um balão de fala com uma mensagem.</td>
						</tr>
					</tbody>
				</table>

				<h2 id='nav-sense'>Percepção do ambiente</h2>
				
				<p>Com as funções de informação os gladiadores conseguem determinar características sobre o ambiente e detectar os perigos ao redor, além de saber informações sobre seu alvo.</p>
				
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function/issafehere'>isSafeHere</a></td>
							<td>Descobre se o gladiador está dentro da nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='function/issafethere'>isSafeThere</a></td>
							<td>Descobre se o ponto está dentro da nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='function/getsaferadius'>getSafeRadius</a></td>
							<td>Retorna o raio da área livre de nuvem tóxica.</td>
						</tr>
						<tr>
							<td><a href='function/howmanyenemies'>howManyEnemies</a></td>
							<td>Retorna a quantidade de inimigos no campo de visão.</td>
						</tr>
						<tr>
							<td><a href='function/getcloseenemy'>getCloseEnemy</a></td>
							<td>Procura um inimigo próximo.</td>
						</tr>
						<tr>
							<td><a href='function/getfarenemy'>getFarEnemy</a></td>
							<td>Procura um inimigo distante.</td>
						</tr>
						<tr>
							<td><a href='function/getlowhp'>getLowHp</a></td>
							<td>Procura um inimigo com menos vida.</td>
						</tr>
						<tr>
							<td><a href='function/gethighhp'>getHighHp</a></td>
							<td>Procura um inimigo com mais vida.</td>
						</tr>
						<tr>
							<td><a href='function/gettargetx'>getTargetX</a></td>
							<td>Retorna o valor da coordenada x do alvo.</td>
						</tr>
						<tr>
							<td><a href='function/gettargety'>getTargetY</a></td>
							<td>Retorna o valor da coordenada y do alvo.</td>
						</tr>
						<tr>
							<td><a href='function/gettargethealth'>getTargetHealth</a></td>
							<td>Retorna a vida do alvo.</td>
						</tr>
						<tr>
							<td><a href='function/gettargetspeed'>getTargetSpeed</a></td>
							<td>Retorna a velocidade do alvo.</td>
						</tr>
						<tr>
							<td><a href='function/gettargethead'>getTargetHead</a></td>
							<td>Retorna a direção do alvo.</td>
						</tr>
						<tr>
							<td><a href='function/doyouseeme'>doYouSeeMe</a></td>
							<td>Descobre se o alvo enxerga o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/istargetvisible'>isTargetVisible</a></td>
							<td>Descobre se alvo está no campo de visão.</td>
						</tr>
						<tr>
							<td><a href='function/isstunned'>isStunned</a></td>
							<td>Verifica se o alvo está atordoado.</td>
						</tr>
						<tr>
							<td><a href='function/isburning'>isBurning</a></td>
							<td>Verifica se o alvo está queimando.</td>
						</tr>
						<tr>
							<td><a href='function/isprotected'>isProtected</a></td>
							<td>Verifica se o alvo está protegido.</td>
						</tr>
						<tr>
							<td><a href='function/isrunning'>isRunning</a></td>
							<td>Verifica se o alvo está correndo.</td>
						</tr>
						<tr>
							<td><a href='function/isslowed'>isSlowed</a></td>
							<td>Verifica se o alvo está lerdo.</td>
						</tr>
						<tr>
							<td><a href='function/getsimtime'>getSimTime</a></td>
							<td>Retorna o tempo da simulação.</td>
						</tr>
					</tbody>
				</table>

				<h2 id='nav-hab'>Habilidades</h2>

				<p>As habilidades são técnicas especiais e magias que permitem que os gladiadores realizem feitos especiais para aniquilar seus inimigos ou se proteger. Ao usar uma habilidade o gladiador gasta seus pontos de habilidade, que recuperam automaticamente ao longo do tempo.</p>
				
				<p>Após a execução de uma função de habilidade, o gladiador ficará impossibilitado de agir e ficará esperando um tempo de acordo com seu atributo <b>velocidade de habilidade</b>. Após este tempo o gladiador continuará a execução de seu código normalmente.</p>

				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function/fireball'>fireball</a></td>
							<td>Arremessa um projétil flamejante.</td>
						</tr>
						<tr>
							<td><a href='function/teleport'>teleport</a></td>
							<td>Transporta instantaneamente o gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/charge'>charge</a></td>
							<td>Corre em direção ao alvo e o ataca.</td>
						</tr>
						<tr>
							<td><a href='function/block'>block</a></td>
							<td>Aumenta a defesa do gladiador.</td>
						</tr>
						<tr>
							<td><a href='function/assassinate'>assassinate</a></td>
							<td>Dispara um ataque que pode causar dano e efeito adicional no alvo.</td>
						</tr>
						<tr>
							<td><a href='function/ambush'>ambush</a></td>
							<td>Torna-se invisível.</td>
						</tr>
					</tbody>
				</table>

				<h2 id='nav-math'>Matemática</h2>
				
				<p>As funções matemáticas estão presentes na gladCode para ajudar o competidor a realizar cálculos relativos à arena.</p>
			
				<table class='table t-funcs'>
					<tbody>
						<tr>
							<td><a href='function/getdist'>getDist</a></td>
							<td>Retorna a distância até o ponto.</td>
						</tr>
						<tr>
							<td><a href='function/getdisttotarget'>getDistToTarget</a></td>
							<td>Retorna a distância até o alvo fixado.</td>
						</tr>
						<tr>
							<td><a href='function/getangle'>getAngle</a></td>
							<td>Retorna o ângulo até o ponto.</td>
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