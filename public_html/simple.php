<?php
	function getTempName(){
		$tempname = "";
		for ($i = 0 ; $i < 10 ; $i++){
			$tempname .= rand(0,9);
		}
		return $tempname;
	}

	if (isset($_POST['submit'])){
		$target_file = "file.c";
		$uploadOk = 1;
		// Check if file already exists
		if (file_exists($target_file)) {
			$fmsg = "Arquivo já existe.";
			$uploadOk = 0;
		}
		// Check file size
		if ($_FILES["fileToUpload"]["size"] > 500000) {
			$fmsg = "Arquivo grande demais.";
			$uploadOk = 0;
		}
		// Check if $uploadOk is set to 0 by an error
		if ($uploadOk == 0) {
			$fmsg .= " Envio não pode ser efetuado.";
		// if everything is ok, try to upload file
		} else {
			$input = $_POST['input'];
			$foldername = getTempName();
			$target_file = $foldername . "/" . $target_file;
			system("mkdir $foldername && cp compilerun.sh $foldername/compilerun.sh && echo \"$input\" > $foldername/input.txt");
			if (move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file)) {
				
				$fmsg = "Arquivo ". basename( $_FILES["fileToUpload"]["name"]). " foi enviado.";
				system("./callscript.sh $foldername &>> $foldername/error.txt");

				if (file_exists("$foldername/output.txt"))
					$output = file_get_contents ("$foldername/output.txt");
				if (file_exists("$foldername/error.txt"))
					$error = file_get_contents ("$foldername/error.txt");

			}
			else {
				$fmsg = "Houve um erro ao enviar o arquivo.";
			}
			system("rm -rf $foldername");
		}
	}
?>

<!DOCTYPE html>
<html>
<body>

<form action="simple.php" method="post" enctype="multipart/form-data">
	<div>
		Escolha o arquivo:
		<input type="file" name="fileToUpload" id="fileToUpload">
	</div>
	<div>
		Entrada
		<input type='text' name='input'>
		<input type="submit" value="Enviar" name="submit">
	</div>
	<?php
		if (isset($fmsg)){
			echo "<h3>Envio:</h3>$fmsg";
			if ($sberror)
				echo "<h3>Erro:</h3>$sberror";
			elseif ($error)
				echo "<h3>Erro:</h3>$error";
			else{
				if ($input)
					echo "<h3>Entrada:</h3>$input";
				if ($output)
					echo "<h3>Saída:</h3>$output";
			}
		}
	?>
</form>

</body>
</html>