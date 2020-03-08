<?php
	include_once "connection.php";
	session_start();
	include("back_node_message.php");
    date_default_timezone_set('America/Sao_Paulo');

	$user = null;
	if (isset($_SESSION['user']))
		$user = $_SESSION['user'];

	$output = array();
	$outtext = ""; 
	$error = "";
	$cancel_run = false;
	
	$foldername = md5('folder'.microtime()*rand());
	$path = "/home/gladcode";

	system("mkdir $path/temp/$foldername && cp $path/Payload/* $path/temp/$foldername");

	$ids = array();
	$codes = array();
	$skins = array();

	$args = json_decode($_POST['args'], true);

	$glads = array();
	if (isset($args['glads']))
		$glads = $args["glads"];
	if (isset($_SESSION['match'])){
		$glads = array_merge($glads, $_SESSION["match"]);
		unset($_SESSION['match']);
	}
	
	$userglad = "";
	if (isset($args['duel'])){
		$id = mysql_escape_string($args['duel']);
		$sql = "SELECT gladiator1 FROM duels WHERE id = '$id' AND user2 = '$user' AND log IS NULL";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		$userglad = $glads;
		$glads = array($glads, $row['gladiator1']);

		$version = file_get_contents("version");
		$glads_string = implode(",", $glads);
		$sql = "SELECT version FROM gladiators WHERE cod IN ($glads_string)";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		while ($row = $result->fetch_assoc()){
			if ($version != $row['version'])
				$cancel_run = true;
		}

	}

	if (isset($args['tournament'])){
		if (isset($_SESSION['tourn-group'])){
			$groupid = mysql_escape_string($args['tournament']);
			if (isset($_SESSION['tourn-group'][$groupid]) && $_SESSION['tourn-group'][$groupid] != md5("tourn-group-$groupid-id")){
				$groupid = null;
				$cancel_run = true;
			}
			unset($_SESSION['tourn-group'][$groupid]);

			$sql = "SELECT log FROM groups WHERE id = $groupid";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
			$row = $result->fetch_assoc();
			if ($row['log'] == null){
				$sql = "SELECT grt.gladiator FROM group_teams grt WHERE grt.groupid = '$groupid'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
	
				while($row = $result->fetch_assoc()){
					array_push($glads, $row['gladiator']);
				}
			}
			else
				$groupid = null;
		}
		else{
			$groupid = null;
			$cancel_run = true;
		}
	}

	foreach ($glads as $glad){
		if (ctype_digit($glad)){
			array_push($ids, $glad);
		}
		else{
			$code = htmlspecialchars_decode($glad);

			$nick = getUser($code);
			if ($nick === false)
				$nick = "user". count($codes);

			$hash = getSkin($code);
			$code = preg_replace('/setSpritesheet\("[\d\w]*?"\)[;]{0,1}/', "", $code);
			$code = preg_replace('/setSkin\("[\W\w]*?"\)[;]{0,1}/', "", $code);
			$code = preg_replace('/setUser\("[\W\w]*?"\)[;]{0,1}/', "", $code);

			preg_match('/setName\("([\W\w]*?)"\)/', $code, $name);
			$name = $name[1];

			if (strlen($hash) != 32){
				$skins[$name .'@'. $nick] = $hash;
			}
			else{
				$sql = "SELECT skin FROM skins WHERE hash = '$hash'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				if ($result->num_rows > 0){
					$row = $result->fetch_assoc();
					$skins[$name .'@'. $nick] = $row['skin'];
				}
			}	

			$pattern = '/setName\("([\w À-ú]+?)"\)/';
			$replacement = 'setName("$1@'. $nick .'")';
			$code = preg_replace($pattern, $replacement, $code);
			array_push($codes, $code);
		}
	}

	if (isset($args['breakpoints']) && $args['breakpoints'] !== false && isset($args['single'])){
		$code = $codes[count($codes) - 1];
		$oldcode = $code;
		$breakpoints = $args['breakpoints'];

		//add {} in single line blocks to avoid messing with structure if breakpoint is inserted in between
		$pattern = '/((?:(?:if)||(?:for)|(?:while))[ ]{0,1}\([^\n]*?\))\n(.*)|(else)\n(.*)/';
		$replacement = '$1$3{'. PHP_EOL .'$2$4}';
		$code = preg_replace($pattern, $replacement, $code);

		$code = explode(PHP_EOL, $code);
		foreach ($code as $i => $line){
			if ($line == "}"){
				$setup = $i + 2;
				break;
			}
		}
		//insert breakpoint line
		foreach ($breakpoints as $ln){
			$line = $ln - 1 + $setup;
			$hint = preg_replace('/\s*(.*?)[{};]*/', "$1", $code[$line]);
			$code[$line] = "breakpoint(\"". $hint ."\");". PHP_EOL . $code[$line];
			$code = preg_replace($pattern, $replacement, $code);
				
		}
		$code = implode(PHP_EOL, $code);
		$codes[count($codes) - 1] = $code;
	}


	if (count($ids) > 0){
		$ids = implode(",", $ids);
		$sql = "SELECT code, apelido, vstr, vagi, vint, g.name, skin FROM gladiators g INNER JOIN usuarios u ON g.master = u.id WHERE g.cod IN ($ids)";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

		while($row = $result->fetch_assoc()){
			$code = $row['code'];
			$nick = $row['apelido'];
			$name = $row['name'];
			$vstr = $row['vstr'];
			$vagi = $row['vagi'];
			$vint = $row['vint'];
			$skins[$name .'@'. $nick] = $row['skin'];

			$language = getLanguage($code);
			if ($language == "c"){
				$setup = "setup(){\n\tsetName(\"$name@$nick\");\n\tsetSTR($vstr);\n\tsetAGI($vagi);\n\tsetINT($vint);\n}\n\n";
			}
			else if ($language == "python"){
				$setup = "def setup():\n\tsetName(\"$name@$nick\")\n\tsetSTR($vstr)\n\tsetAGI($vagi)\n\tsetINT($vint)\n\n";
			}

			$code = $setup . $code;

			array_push($codes, $code);
		}
	}

	$invalid_attr = false;
	foreach($codes as $i => $code){
		if (!validate_attr($code)){
			$invalid_attr = true;
		}

		$language = getLanguage($code);
		if ($language == "c"){
			$code = "#include \"gladCodeCore.c\"\n". $code;
			file_put_contents("$path/temp/$foldername/code$i.c",$code);
		}
		else if ($language == "python"){
			$code = "from gladCodeAPI import *\n\n". $code ."\n\ninitClient()\nsetup()\nif startSim():\n\twhile running():\n\t\tloop()\n";
			file_put_contents("$path/temp/$foldername/code$i.py",$code);
		}
	}

	if ($cancel_run)
		$output['simulation'] = null;
	elseif (!$invalid_attr){		
		system("$path/script/call_socket.sh $foldername &>> $path/temp/$foldername/error.txt");
		
		if (file_exists("$path/temp/$foldername/outputc.txt"))
			$outtext .= file_get_contents ("$path/temp/$foldername/outputc.txt");
		if (file_exists("$path/temp/$foldername/outputs.txt"))
			$outtext .= file_get_contents ("$path/temp/$foldername/outputs.txt");
		if (file_exists("$path/temp/$foldername/error.txt"))
			$error .= file_get_contents ("$path/temp/$foldername/error.txt");
		if (file_exists("$path/temp/$foldername/errors.txt"))
			$error .= file_get_contents ("$path/temp/$foldername/errors.txt");
		if (file_exists("$path/temp/$foldername/errorc.txt"))
			$error .= file_get_contents ("$path/temp/$foldername/errorc.txt");

		$spechar = array("\n", "\r", "\t", "\"");
		$repchar = array("\\n", "\\r", "\\t", '\\"');
		
		if ($error != ""){
			$error = str_replace($spechar, $repchar, $error);
		}
		if ($outtext != ""){
			$outtext = str_replace($spechar, $repchar, $outtext);
		}
		
		//stream the file contents
		if ($error == "" && file_exists("$path/temp/$foldername/simlog")){
			if (isset($args['savecode']) && $args['savecode'] === true){
				if (isset($args['breakpoints']) && $args['breakpoints'] !== false && isset($args['single'])){
					$codes[count($codes)-1] = $oldcode;
				}

				// remove banned functions
				$banned = json_decode(file_get_contents("banned_functions.json"), true)['functions'];

				$code = $codes[count($codes) - 1];
				foreach($banned as $function){
					$pattern = '/'. $function .'.*/';
					$code = preg_replace($pattern, "", $code);
				}
				$codes[count($codes) - 1] = $code;

				// save code on session
				$language = getLanguage($code);
				if ($language == "c"){
					$_SESSION['code'] = preg_replace('/setup\(\)[\w\W]*?{[\w\W]*?}\n\n/', "", $codes[count($codes)-1]);
				}
				else if ($language == "python"){
					$_SESSION['code'] = preg_replace('/def setup\(\)[\w\W]*?:[\w\W]*?\n\n/', "", $codes[count($codes)-1]);
				}
				//echo $_SESSION['code'];
			}

			$file = "[". file_get_contents("$path/temp/$foldername/simlog") ."]";

			$simulation = json_decode($file);
			foreach ($simulation[0]->{'glads'} as $gkey => $glad){
				$nick = preg_replace('/#/', " ", $glad->{'user'});
				$name = preg_replace('/#/', " ", $glad->{'name'});
				foreach($skins as $key => $skin){
					$key = explode("@", $key);
					if ($name == $key[0] && $nick == $key[1]){
						$simulation[0]->{'glads'}[$gkey]->{'skin'} = $skin;
						//cannot uncomment this because C crashes
						//$simulation[0]->{'glads'}[$gkey]->{'user'} = $user;
						//$simulation[0]->{'glads'}[$gkey]->{'name'} = $name;
					}
				}
			}
			//$output['test'] = json_encode($simulation);

			$file = json_encode($simulation);
			
			$hash = save_log($conn, $file);

			if (isset($args['ranked'])){
				$deaths = death_times($conn, $ids, $file);
				$rewards = battle_rewards($conn, $deaths, $user);
				send_reports($conn, $rewards, $hash);
			}
			if (isset($args['duel']) && !$cancel_run){
				$id = mysql_escape_string($args['duel']);
				$sql = "UPDATE duels SET log = '$hash', gladiator2 = '$userglad', time = now() WHERE id = '$id' AND user2 = '$user'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
			}
			if (isset($args['tournament']) && $groupid != null){
				$sql = "SELECT l.id FROM logs l WHERE l.hash = '$hash'";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				$row = $result->fetch_assoc();
				$logid = $row['id'];

				$sql = "SELECT log FROM groups WHERE id = $groupid";
				if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				$row = $result->fetch_assoc();
				if ($row['log'] == null){
					$sql = "UPDATE groups SET log = '$logid' WHERE id = '$groupid'";
					if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
				}
			}

			$output['simulation'] = $hash;
			//echo "{\"error\":\"$error\",\"output\":\"$output\",\"simulation\":\"$hash\"}";
		}
		$output['error'] = $error;
		$output['output'] = $outtext;
			//echo "{\"error\":\"$error\",\"output\":\"$output\",\"simulation\":\"\"}";
		
	}
	else{
		//echo "{\"error\":\"INVALID_ATTR\",\"output\":\"\",\"simulation\":\"\"}";
		$output['error'] = "INVALID_ATTR";
	}

	echo json_encode($output);

	system("rm -rf $path/temp/$foldername");
	
	function getSkin($subject) {
		$pattern = '/setSpritesheet\("([\d\w]*?)"\)[;]{0,1}/';
		$hash = codeMatch($subject, $pattern);

		if ($hash === false){
			$pattern = '/setSkin\("([\W\w]*?)"\)[;]{0,1}/';
			$hash = codeMatch($subject, $pattern);
		}

		return $hash;
	}

	function getUser($subject) {
		$pattern = '/setUser\("([\W\w]*?)"\)[;]{0,1}/';
		return codeMatch($subject, $pattern);
	}

	function getSTR($subject) {
		$pattern = '/setSTR\(([\d]{1,2})\)[;]{0,1}/';
		return codeMatch($subject, $pattern);
	}
	
	function getAGI($subject) {
		$pattern = '/setAGI\(([\d]{1,2})\)[;]{0,1}/';
		return codeMatch($subject, $pattern);
	}

	function getINT($subject) {
		$pattern = '/setINT\(([\d]{1,2})\)[;]{0,1}/';
		return codeMatch($subject, $pattern);
	}

	function codeMatch($subject, $pattern){
		preg_match ( $pattern , $subject , $matches );
		if (count($matches) < 2 || $matches[1] == 'undefined')
			return false;
		else
			return $matches[1];
	}

	function calcAttrValue($attr){
		if ($attr == 0)
			return 0;
		return calcAttrValue($attr - 1) + ceil($attr/6);
	}

	function validate_attr($code){
		$vstr = getSTR($code);
		$vagi = getAGI($code);
		$vint = getINT($code);
		$soma = calcAttrValue($vstr) + calcAttrValue($vagi) + calcAttrValue($vint);
		if ($soma == 50)
			return true;
		else {
			return false;
		}
	}

	function save_log($conn, $log){
		$version = file_get_contents("version");
		$hash = substr(md5('log'.microtime()*rand()), 0,16);

		$single = "0";
		if (isset($args['single'])){
			$single = "1";
		}

		$sql = "INSERT INTO logs (time, version, hash, singleView) VALUES (now(), '$version', '$hash', '$single')";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
		
		$id = $conn->insert_id;
		file_put_contents("logs/$id",$log);
		return $hash;
	}

	function battle_rewards($conn, $deaths, $user){
		$ids = array();
		$times = array();
		foreach($deaths as $glad){
			array_push($ids,$glad['id']);
			array_push($times,$glad['time']);
		}

		$ids = implode(",", $ids);
		$sql = "SELECT g.cod, g.mmr, g.master, u.lvl, u.xp FROM gladiators g INNER JOIN usuarios u ON u.id = g.master WHERE cod IN ($ids) ORDER BY FIELD(cod,$ids)";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: '. $sql ); }

		$glads = array();
		$i = 0;
		while($row = $result->fetch_assoc()){
			$glads[$i] = array();
			$glads[$i]['id'] = $row['cod'];
			$glads[$i]['time'] = $times[$i];
			$glads[$i]['mmr'] = $row['mmr'];
			$glads[$i]['master'] = $row['master'];
			$glads[$i]['masterlvl'] = $row['lvl'];
			$glads[$i]['masterxp'] = $row['xp'];
			$i++;
		}

		$nglads = count($glads);
		$rewards = updateMMR($glads, $conn);
		
		$glad_rewards = array();
		foreach($glads as $i => $glad)
			$glad_rewards[$glad['id']] = $rewards[$i];

		foreach($glads as $i => $glad){
			if ($glad['master'] == $user){
				$thisglad = $i;
				break;
			}
		}

		$glad = $glads[$thisglad];
		$lvl = $glad['masterlvl'];
		$xp = $glad['masterxp'];
		
		/*
			$income = 1000 + 30% de bonus em cima do mmr = dinheiro que a arena arrecadou
			$silver = income * 
				0.7 -> 30% lucro do governo
				300 -> manutencao da arena
				/10 -> /2 porque metade é apostas e metade é ingressos, /5 porque os ingressos vao pra cada gladiador
				-20 -> custo de manutencao do gladiador
			na vitória -> ganha a parte das apostas
		*/
		$income = 1000 + ($glad['mmr'] - 1000) * 0.3;
		//$silver = (0.7 * $income - 300)/10 - 20;
		$xplose = 100;
		$xpwin = 150;
		$xp += $xplose;
		if ($thisglad == 0){
			$xp += $xpwin;
			//$silver += (0.7 * $income - 300)/2;
		}
		
		/*
		y = ax+b;
		a = 2; b = 0 = numeros de lutas que precisa ganhar
		130 = xp médio por luta
		*/
		$a = 1.9;
		$b = 1;
		$avgxp = ($xplose * $nglads + $xpwin) / $nglads;
		$tonext = ($a * $lvl + $b) * $avgxp;

		if ($lvl == 60)
			$xp = 0;
		elseif ($xp >= $tonext && $lvl < 60){
			$lvl++;
			$xp -= $tonext;
		}
		
		$sql = "UPDATE usuarios SET lvl = '$lvl', xp = '$xp' WHERE id = '$user'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

		send_node_message(array(
			'profile notification' => array('user' => array($user))
		));

		return $glad_rewards;
	}

	function updateMMR($glads, $conn){
		$reward = calcReward($glads);
				
		foreach($glads as $i => $glad){
			$mmr = $reward[$i];
			$id = $glad['id'];
			
			$sql = "UPDATE gladiators SET mmr = mmr + '$mmr' WHERE cod = '$id'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		}		
		
		return $reward;
	}
	
	function calcReward($glads){
		$maxReward = 10;
		$timeWeight = 1.5;
		$winWeight = 1;
		$nglad = count($glads);
		
		$rewardRaw = array();
		$timeDiff = $glads[1]['time'] - $glads[$nglad-1]['time'];
		
		$avgmmr = 0;
		foreach($glads as $i => $glad){
			$diff = $glad['time'] - $glads[$nglad-1]['time'];
			if ($timeDiff == 0)
				$timeNorm = 1;
			else
				$timeNorm = $diff/$timeDiff;

			$win = 0;
			if ($i == 0 || $glad['time'] == $glads[0]['time']){
				$win = 1;
				$timeNorm = 1;
			}
			$rewardRaw[$i] = ($timeNorm * $nglad * $timeWeight) + ($win * $nglad * $winWeight);
			$avgmmr += $glad['mmr'];
		}
		$avgmmr /= $nglad;
		$evenReward = array_sum($rewardRaw) / $nglad;
		$rewardWeighted = array();
		$rewardDev = array();
		
		foreach($glads as $i => $glad){
			$rewardWeighted[$i] = $rewardRaw[$i] - $evenReward;
			$rewardNorm = $rewardWeighted[$i] / $rewardWeighted[0] * $maxReward;

			$mmrDev = $glad['mmr'] / $avgmmr;
			
			if ($rewardNorm > 0)
				$rewardDev[$i] = $rewardNorm / max($mmrDev, 0.5);
			else
				$rewardDev[$i] = $rewardNorm * min($mmrDev, 2);
			
			//faz perder menos quanto mais próximo de mmr 0
			if ($rewardDev[$i] < 0 && $glad['mmr'] < 1000){ 
				$bias = 0.001 * $glad['mmr'] - 1;
				$rewardDev[$i] = $rewardDev[$i] + $rewardDev[$i] * $bias;
			}
		}		
		
		return $rewardDev;
	}	

	function death_times($conn, $ids, $log){
		$log = json_decode($log, true);
		$deaths = array();

		foreach($log[0]['glads'] as $glad){
			$member = array(
				'name' => preg_replace('/#/', " ", $glad['name']),
				'user' => preg_replace('/#/', " ", $glad['user'])
			);
			array_push($deaths, $member);
		}

		foreach($log as $i => $step){
			foreach($step['glads'] as $g => $glad){
				if (isset($glad['hp'])){
					$deaths[$g]['time'] = floatval($step['simtime']);
					$deaths[$g]['hp'] = floatval($glad['hp']);
				}
			}
		}

		uasort($deaths, "death_sort");

		foreach($deaths as $i => $glad){
			$name = $glad['name'];
			$nick = $glad['user'];
			$sql = "SELECT g.cod FROM gladiators g INNER JOIN usuarios u ON g.master = u.id WHERE g.name = '$name' AND u.apelido = '$nick'";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

			while($row = $result->fetch_assoc()){
				$deaths[$i]['id'] = $row['cod'];
			}
		}
		return $deaths;
	}

	function death_sort($a,$b) {
		if ($a['hp'] > 0 && $b['hp'] <= 0)
			return -1;
		if ($b['hp'] > 0 && $a['hp'] <= 0)
			return 1;
		return $b['time'] - $a['time'];
	}

	function send_reports($conn, $rewards, $log){
		$sql = "SELECT id FROM logs WHERE hash = '$log'";
		if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
		$row = $result->fetch_assoc();
		$log = $row['id'];
		
		$masters = array();
		foreach($rewards as $glad => $reward){
			$sql = "INSERT INTO reports (log, gladiator, reward) VALUES ('$log', '$glad', '$reward')";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }

			$sql = "SELECT master FROM gladiators WHERE cod = $glad";
			if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']. SQL: ['. $sql .']'); }
			$row = $result->fetch_assoc();
			array_push($masters, $row['master']);
		}

		send_node_message(array(
			'profile notification' => array('user' => $masters)
		));
	}

	function getLanguage($code){
		$language = "c";
		if (strpos($code, "def loop():") !== false)
			$language = "python";
		
		return $language;
	}
?>