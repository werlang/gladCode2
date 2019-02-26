<?php
	function getTempName(){
		$tempname = "";
		for ($i = 0 ; $i < 10 ; $i++){
			$tempname .= rand(0,9);
		}
		return $tempname;
	}

	if ($_POST['code'] != ""){
		$output = ""; 
		$error = "";
		$sberror = "";
		
		$code = $_POST['code'];
		$input = $_POST['input'];
		$foldername = getTempName();
		$path = "/home/gladcode/temp";
		$target_file = "$path/$foldername/file.c";
		system("mkdir $path/$foldername && cp $path/compilerun.sh $path/$foldername/compilerun.sh && echo \"$input\" > $path/$foldername/input.txt");
		file_put_contents($target_file, $code);
		system("$path/callscript.sh $foldername &>> $path/$foldername/error.txt");
		
		if (file_exists("$path/$foldername/output.txt"))
			$output = file_get_contents ("$path/$foldername/output.txt");
		if (file_exists("$path/$foldername/error.txt"))
			$error = file_get_contents ("$path/$foldername/error.txt");

		system("rm -rf $path/$foldername");
		
		echo "$error|$output";
	}
?>
