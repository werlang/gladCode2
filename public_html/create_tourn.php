<html>
<body>

<?php
include_once "connection.php";
$output = array();

//test for creating test tournaments
if (isset($_GET['n']) && isset($_GET['t'])){
    $name = $_GET['n'];
    $nteams = $_GET['t'];
    
    $sql = "INSERT INTO tournament (name, creation, maxteams, flex, manager, hash, password, description) VALUES ('$name', now(), 50, 1, 'pswerlang@gmail.com', '', '', '')";
    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
    $tournid = $conn->insert_id;

    $teams = array();
    for ($i=0 ; $i<$nteams ; $i++){
        $sql = "INSERT INTO teams (name, password, tournament, modified) VALUES ('eq$i','bababa', $tournid, now())";
        if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
        array_push($teams, $conn->insert_id);
    }

    $limit = $nteams*3;
    $glads = array();
    $sql = "SELECT g.cod FROM gladiators g GROUP BY g.master LIMIT $limit";
    if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
    while ($row = $result->fetch_assoc()){
        array_push($glads, $row['cod']);
    }

    foreach($teams as $team){
        for ($i=0 ; $i<3 ; $i++){
            $glad = array_pop($glads);
            $sql = "INSERT INTO gladiator_teams (gladiator, team) VALUES ($glad, $team)";
            if(!$result = $conn->query($sql)){ die('There was an error running the query [' . $conn->error . ']'); }
        }
    }

    $output['status'] = "DONE";
}
else
    $output['status'] = "NOTSET";

echo "<div>". json_encode($output) ."</div>"; 

?>

</body>
</html>