<?php
	/*
	function getTempName(){
		$tempname = "";
		for ($i = 0 ; $i < 10 ; $i++){
			$tempname .= rand(0,9);
		}
		return $tempname;
	}
	*/
	
	$output = ""; 
	$error = "";
	
	//$foldername = getTempName();
	$foldername = $_POST['folder'];
	$path = "/home/gladcode/temp";

	system("mkdir $path/$foldername && cp $path/Payload/* $path/$foldername");

	$i=0;
	while( isset($_FILES["file$i"]['tmp_name']) || isset($_POST["code$i"])){
		if (isset($_FILES["file$i"]['tmp_name']))
			$code[$i] = file_get_contents ($_FILES["file$i"]['tmp_name']);
		elseif (isset($_POST["code$i"]))
			$code[$i] = $_POST["code$i"];
		
		$code[$i] = '#include "gladCodeCore.c"' . "\n" . $code[$i];
		if (isset($_POST["team$i"])){
			$pattern = '/setName\("([\w À-ú]+?)"\);/';
			$replacement = 'setName("$1@'. $_POST["team$i"] .'");';
			$code[$i] = preg_replace($pattern, $replacement, $code[$i]);
		}
		file_put_contents("$path/$foldername/code$i.c",$code[$i]);
		$i++;
	}
	//echo $code[0];

	system("$path/call_socket.sh $foldername &>> $path/$foldername/error.txt");
	
	if (file_exists("$path/$foldername/outputc.txt"))
		$output .= file_get_contents ("$path/$foldername/outputc.txt");
	if (file_exists("$path/$foldername/outputs.txt"))
		$output .= file_get_contents ("$path/$foldername/outputs.txt");
	if (file_exists("$path/$foldername/error.txt"))
		$error .= file_get_contents ("$path/$foldername/error.txt");
	if (file_exists("$path/$foldername/errors.txt"))
		$error .= file_get_contents ("$path/$foldername/errors.txt");
	if (file_exists("$path/$foldername/errorc.txt"))
		$error .= file_get_contents ("$path/$foldername/errorc.txt");

	$spechar = array("\n", "\r", "\t", "\"");
	$repchar = array("\\n", "\\r", "\\t", '\\"');
	
	if ($error != ""){
		$error = str_replace($spechar, $repchar, $error);
	}
	if ($output != ""){
		$output = str_replace($spechar, $repchar, $output);
	}

	//stream the file contents
	if (file_exists("$path/$foldername/simlog")){
		$file = fopen("$path/$foldername/simlog","r");
		
		ob_start();
		
		echo "{\"error\":\"$error\",\"output\":\"$output\",\"simulation\":[";
		
		while(!feof($file)){
			echo fgets($file);
			flush();
			usleep(1);
			
		}
		
		echo "]}";
		
		$length = ob_get_length();
		header('Content-Length: '.$length."\r\n");
		header('Accept-Ranges: bytes'."\r\n");
		ob_end_flush(); 
		
	}
	else
		echo "{\"error\":\"$error\",\"output\":\"$output\",\"spritesheet\":\"\",\"simulation\":\"\"}";
	
	system("rm -rf $path/$foldername");
?>