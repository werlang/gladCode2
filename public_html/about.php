<!DOCTYPE html>
<html>
<head>
	<meta charset='utf-8' />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" type="image/gif" href="icon/gladcode_icon.png" />
	<title>gladCode - Sobre</title>
	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
	<link type='text/css' rel='stylesheet' href='css/about.css'/> 
	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
	<script type="text/javascript" src="script/jquery.min.js"></script>
	<script type="text/javascript" src="jquery-ui/jquery-ui.min.js"></script>
</head>
<body>
    <?php include("header.php"); ?>
	<div id='frame'>
		<div id='mission-container'><div id='mission'>
			<div id='line1'>Programar pode ser divertido</div>
			<div id='line2'>É nisso que a gladCode acredita</div>
		</div></div>
		<div class='info-card'>
			<div id='title'>A História</div>
			<div>A ideia por trás da gladCode surgiu no fim de 2016 </div>
		</div>
		<div class='info-card'>
			<img class='image' id='myself' src='image/pablo.jpg'>
			<div class='text'>
				Sou Pablo Werlang. Graduado em <a href='ecomp.c3.furg.br'>Engenharia de Computação</a> em 2011 pela <a href='furg.br'>Universidade Federal do Rio Grande (FURG)</a>, sou fascinado por games desde muito pequeno. Cresci jogando coisas como <a href='https://pt.wikipedia.org/wiki/The_Legend_of_Zelda_(s%C3%A9rie)'>Zelda</a>, <a href='https://pt.wikipedia.org/wiki/Chrono_Trigger'>Chrono Trigger</a>, <a href='https://pt.wikipedia.org/wiki/Final_Fantasy'>Final Fantasy</a>, <a href='https://pt.wikipedia.org/wiki/Warcraft'>Warcraft</a>, <a href='https://pt.wikipedia.org/wiki/Age_of_Empires'>Age of Empires</a>, <a href='https://pt.wikipedia.org/wiki/Monkey_Island'>Monkey Island</a>, etc. Sempre fui o nerd da turma, e com muito orgulho.
			</div>
		</div>

		<div>
			<div id='long' hidden>
				Ainda durante a faculdade um professor apresentou para a turma um programa traria a inspiração para a gladCode anos mais tarde. Este programa possuía uma linguagem própria, e nele, nós alunos deveríamos programar a inteligência de um robô virtual, que deveria batalhar contra os robôs dos outros alunos em um mini torneio realizado após a entrega do trabalho da disciplina.
				Os anos se passaram. Hoje sou professor do <a href='ifsul.edu.br'>Instituto Federal Sul-Riograndense (IFSul)</a> - Campus Charqueadas e ministro principalmente disciplinas de lógica de programação e linguagem de programação C.

				No campus Charqueadas existe um evento anual chamado <a href='charcode.tk'>CharCode</a>. Neste evento existem hoje quatro modalidades: Hackathon, Maratona de programação, <a href='https://robocode.sourceforge.io/'>Robocode</a> e a gladCode. Durante a CharCode 2016 eu e outros professores estávamos conversando sobre a Robocode, quando surgiu a ideia de desenvolver um software semelhante, com a diferença de usar a linguagem C, ao invés de Java, pois traria um engajamento maior dos alunos novatos do campus (pois C é ensinado desde o início do curso), e principalmente usando uma temática dos RPGs antigos ambientados em fantasia medieval.
				Resolvi então tocar adiante o projeto que nomeei gladCode (pois se trataria de uma arena de gladiadores), e em 2017 foi incluído na CharCode a nova modalidade: a gladCode. Este meu novo projeto tinha por objetivo auxiliar alunos no processo de aprendizado de conceitos de lógica ao mesmo tempo que permitia que eles tivessem contato com a linguagem C em um ambiente gráfico, fugindo da tela preta do terminal, enquanto se divertiam em uma competição ambientada em uma temática de jogos estilo RPG.

				A primeira versão da gladCode rodava localmente e funcionava no Windows. O repositório <a href='https://github.com/werlang/gladCode'>gladCode</a> contém a primeira versão do projeto, para quem quiser entender como funciona.

				Na gladCode todos códigos criados pelo usuário precisavam incluir o arquivo-fonte da simulação. Este arquivo continha a função principal (main) e iniciava uma thread responsável por controlar o gladiador do usuário. Além de um processo para cada usuário, um outro processo responsável por gerenciar a simulação e intermediador os dados recebidos pelo processo de cada gladiador também era iniciada. A simulação era então executada, e após isso um log era gerado em um arquivo contendo o que aconteceu em cada instante de tempo da simulação. Este log era o histórico da luta, descrito em texto. Um render das lutas, responsável por mostrar na tela as animações referentes ao log da criado pela simulação, foi desenvolvido em Java pelo meu colega Maurício Escobar. Além disso uma interface gráfica também foi desenvolvida por mim em C para permitir que as equipes da competição selecionassem seus arquivos com os códigos-fonte e as imagens dos gladiadores. As imagens dos gladiadores eram extraídas do <a href='http://gaurav.munjal.us/Universal-LPC-Spritesheet-Character-Generator/'>gerador de folha de sprites</a> do <a href='http://lpc.opengameart.org/'>projeto LPC</a>, que diga-se de passagem é um maravilhoso projeto artístico que permite aos novos desenvolvedores de games criarem personagens altamente personalizáveis.

				Embora um enorme desafio desafio do ponto de vista técnico, a gladCode foi um sucesso. Mas o projeto, muito promissor e elogiado por alunos e professores não podia para por aí. A gladCode era um programa que exigia um certo trabalho para rodar, e isso muitas vezes era um impecilho na hora de um aluno iniciante dar os primeiros passos. Então 2018 começou com o desafio de transportar a gladCode para um sistema web, permitindo que o usuário execute e visualize a simulação no navegador, sem precisar instalar nada.

				Como eu precisava que o servidor compilasse e executasse os programas, eu precisava de acesso root ao servidor, por isso contratei um <a href='https://www.hostinger.com.br/tutoriais/o-que-e-vps-como-escolher-um-servidor-vps'>VPS</a> para hospedar o projeto. Depois da tarefa de configuração do servidor (que eu nunca tinha tido contato até então) percebi que eu precisaria executar o código do usuário em um ambiente seguro e isolado, então fui apresentado ao <a href='https://www.docker.com/'>Docker</a> e seus containers, e desta empreitada surgiu o <a href='code.php'>compilador C</a> da gladCode.

				Após esta etapa precisei fazer o port de todo o código da gladCode para linux para executar no servidor, então aproveitei o momento para modificar a estrutura do programa. A partir de então a comunicação entre os processos passou a ser feita por troca de mensagens em um servidor <a href='https://blog.pantuza.com/artigos/o-que-sao-e-como-funcionam-os-sockets'>socket</a> ao invés de por <a href='https://pt.wikipedia.org/wiki/Mem%C3%B3ria_compartilhada'>memória compartilhada</a>. Esta mudança permitiu criar uma <a href='https://pt.wikipedia.org/wiki/Interface_de_programa%C3%A7%C3%A3o_de_aplica%C3%A7%C3%B5es'>API</a> onde no futuro se tornaria muito mais simples adicionar suporte à outras linguagens de programação além do C. Troquei também o padrão de comunicação do log da simulação por <a href='https://www.json.org/json-pt.html'>JSON</a>, visto que a comunicação entre o servidor e o usuário seria feita pelo navegador em linguagem javascript. Assim nasceu a segunda versão da gladCode.

				Como a renderização da simulação agora seria feita no navegador, utilizando a <a href='https://phaser.io/'>framework Phaser</a> programei o novo render da gladCode.
				Os passos seguintes foram a criação das páginas de documentação do projeto e o editor de aparência dos gladiadores, que permitia ao usuário de maneira intuitiva escolher cada peça de equipamento que comporia seu novo gladiador, e gravá-lo no banco da dados do servidor.
				
				Na Charcode 2018 a modalidade gladCode utilizou a hoje chamada interface de <a href='tournment.php'>torneio clássico</a> para realizar a competição, que permitiu a geração dos logs das batalhas para visualização posterior.

				Os próximos passos da gladCode seriam torná-la um sistema multiplayer online, onde os usuários criariam seu perfil, salvariam seus códigos e seus gladiadores no servidor, e os colocariam para batalhar contra os gladiadores de outros usuários em um sistema de ranking online da plataforma. Desta forma nasceu o <a href='editor.php'>editor de gladiadores</a>, que une o editor da aparência do gladiador com o editor de texto do compilador C da gladCode. A página de perfil do usuário foi criada permitindo ao usuário comunicar-se com seus amigos, visualizar seu ranking, e inscrver seus gladiadores em batalhas.
			</div>
        </div>
	</div>
	<?php include("footer.php"); ?>
</body>
</html>