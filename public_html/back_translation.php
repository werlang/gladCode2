<?php
    session_start();
    include_once "connection.php";
    $action = $_POST['action'];
    $user = $_SESSION['user'];
    $output = array();
    date_default_timezone_set('America/Sao_Paulo');

    if ($action == "TRANSLATE"){
        $target = mysql_escape_string($_POST['language']);

        $data = json_decode($_POST['data'], true);
        $apiKey = "AIzaSyDfENHlgZgw6BDTbevnSJKiZP30BRIJe2g";

        $output['response'] = array();
        $strdata = implode("','", $data);

        // search for existing data
        $sql = "SELECT * FROM translations WHERE pt IN ('$strdata') OR template IN ('$strdata')";
        $result = runQuery($sql);
        // $output['abc'] = array();
        if ($result->num_rows > 0){
            while($row = $result->fetch_assoc()){
                $source = (!is_null($row['template']) && in_array($row['template'], $data)) ? "template" : "pt"; 

                if (in_array($row[$source], $data) && $row[$target] != ''){
                    unset($data[array_search($row[$source], $data)]);
                    $output['response'][$row[$source]] = $row[$target];
                }
                else{
                    // $output['abc'][$row[$source]] = $row[$target];
                }
            }
        }

        // $output['def'] = $data; 

        if (count($data) > 0){
            // use curl_multi pra fazer vários requests
            $multiCurl = curl_multi_init();
            $curl = array();
            foreach($data as $i => $ptdata){
                $ptencoded = urlencode($ptdata);

                $curl[$i] = curl_init();
                $url = "https://www.googleapis.com/language/translate/v2?q=$ptencoded&source=pt&target=$target&key=$apiKey";
                curl_setopt_array($curl[$i], array(
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                    CURLOPT_CUSTOMREQUEST => "GET",
                    CURLOPT_HTTPHEADER => array(
                        "cache-control: no-cache"
                    ),
                ));
                curl_multi_add_handle($multiCurl, $curl[$i]);
            }
            $running = 0;
            do {
                curl_multi_exec($multiCurl, $running);
                usleep(10);
            } while ($running > 0);

            $response = array();
            $translations = array();
            $templates = array();
            foreach($curl as $i => $val){
                $response[$i] = curl_multi_getcontent($val);
                curl_multi_remove_handle($multiCurl, $val);
                $response[$i] = mysql_escape_string(htmlspecialchars_decode(json_decode($response[$i], true)['data']['translations'][0]['translatedText'], ENT_QUOTES));
                $output['response'][$data[$i]] = $response[$i];

                // check if template
                preg_match('/\{\{(\w+)\}\}/', $data[$i], $matches);
                if (isset($matches[1])){
                    $sql = "SELECT * FROM translations WHERE template = '{$data[$i]}'";
                }
                else{
                    $sql = "SELECT * FROM translations WHERE pt = '{$data[$i]}' AND template IS NULL";
                }

                $result = runQuery($sql);
                if ($result->num_rows > 0){
                    $row = $result->fetch_assoc();
                    $sql = "UPDATE translations SET $target = '{$response[$i]}' WHERE id = {$row['id']} AND $target IS NULL";
                    $result = runQuery($sql);
                }
                else{
                    if (!isset($matches[1])){
                        array_push($translations, "('{$data[$i]}', '{$response[$i]}')");
                    }
                    else{
                        array_push($templates, "('{$data[$i]}', '{$response[$i]}')");
                    }
                }
            }
            
            if (count($translations)){
                $translations = implode(",", $translations);
                $sql = "INSERT INTO translations (pt, $target) VALUES $translations";
                $result = runQuery($sql);
            }
            
            if (count($templates)){
                $templates = implode(",", $templates);
                $sql = "INSERT INTO translations (template, $target) VALUES $templates";
                $result = runQuery($sql);
            }

            $output['calls'] = count($curl);
        }

        $output['status'] = "SUCCESS";
    }
    elseif ($action == "SUGGEST"){
        $sug = mysql_escape_string($_POST['suggestion']);
        $ori = mysql_escape_string($_POST['original']);
        $lang = mysql_escape_string($_POST['language']);

        if (!isset($user)){
            $output['status'] = "NOTLOGGED";
        }
        else{
            $sql = "INSERT INTO trans_suggestion (original, suggestion, user, language) VALUES ('$ori', '$sug', $user, '$lang')";
            $result = runQuery($sql);
    
            $output['status'] = "SUCCESS";
        }
    }
    elseif ($action == "GET SUGGESTIONS"){
        $sql = "SELECT email FROM usuarios WHERE id = $user";
        $result = runQuery($sql);

        $row = $result->fetch_assoc();
        if ($row['email'] != 'pswerlang@gmail.com'){
            $output['status'] = "NOTALLOWED";
        }
        else{
            $sql = "SELECT t.id, t.language, t.original, t.suggestion, t.time, u.apelido AS 'user' FROM trans_suggestion t INNER JOIN usuarios u ON u.id = t.user WHERE t.resolved = 0 ORDER BY t.time";
            $result = runQuery($sql);

            $output['suggestions'] = array();
            while($row = $result->fetch_assoc()){
                array_push($output['suggestions'], $row);
            }

            $output['status'] = "SUCCESS";
        }

    }
    elseif ($action == "RESOLVE"){
        $sql = "SELECT email FROM usuarios WHERE id = $user";
        $result = runQuery($sql);

        $row = $result->fetch_assoc();
        if ($row['email'] != 'pswerlang@gmail.com'){
            $output['status'] = "NOTALLOWED";
        }
        else{
            $answer = mysql_escape_string($_POST['answer']);
            $id = mysql_escape_string($_POST['id']);

            $sql = "UPDATE trans_suggestion SET resolved = 1 WHERE id = $id";
            $result = runQuery($sql);

            if ($answer == 'yes'){

                $sql = "SELECT original, suggestion, language FROM trans_suggestion WHERE id = $id";
                $result = runQuery($sql);

                $row = $result->fetch_assoc();
                $suggestion = mysql_escape_string($row['suggestion']);
                $original = mysql_escape_string($row['original']);
                $language = $row['language'];
        
                $sql = "UPDATE translations SET $language = '$suggestion' WHERE $language = '$original'";
                $output['sql'] = $sql;
                $result = runQuery($sql);
            }

            $output['status'] = "SUCCESS";
        }
    }

    echo json_encode($output);
?>