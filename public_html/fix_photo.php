<html>
<body>

<?php
include_once "connection.php";
$output = array();

$sql = "SELECT foto, email FROM usuarios WHERE foto NOT LIKE '%gravatar%'";
if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
$nrows = $result->num_rows;

$count = 0;
while ($row = $result->fetch_assoc()){
    $email = $row['email'];
    if (exif_imagetype($row['foto']) != IMAGETYPE_PNG){
        $gladcode = 'gladcodehashsecret36';
        $hash = md5( $gladcode . strtolower( trim( $email ) ) );
        $foto = mysql_escape_string("https://www.gravatar.com/avatar/$hash?d=retro");
    
        $sql = "UPDATE usuarios SET foto = '$foto' WHERE email = '$email'";
        if(!$result2 = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }

        $count++;
    }
}

$output['changed'] = $count;

echo "<div>". json_encode($output) ."</div>"; 

?>

</body>
</html>