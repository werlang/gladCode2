<?php
    session_start();
    include_once "connection.php";
    $action = $_POST['action'];
    $output = array();
    date_default_timezone_set('America/Sao_Paulo');
    
    if ($action == "GET"){
        if(isset($_SESSION['user'])){
            $user = $_SESSION['user'];

            $sql = "SELECT * FROM usuarios WHERE id = '$user'";
            $result = runQuery($sql);
            $nrows = $result->num_rows;

            $nrows = $result->num_rows;			
            if ($nrows == 1){
                $row = $result->fetch_assoc();
                
                $info = array();
                $info['id'] = $row['id'];
                $info['email'] = $row['email'];
                $info['apelido'] = $row['apelido'];
                $info['nome'] = $row['nome'];
                $info['sobrenome'] = $row['sobrenome'];
                $info['ativo'] = $row['ativo'];
                $info['premium'] = is_null($row['premium']) ? false : true;
                $info['credits'] = $row['credits'];
                $info['pasta'] = $row['pasta'];
                $info['speak'] = $row['spoken_language'];
                $info['lvl'] = $row['lvl'];
                $info['xp'] = $row['xp'];
                $info['silver'] = $row['silver'];
                $info['tutor'] = $row['showTutorial'];
                $info['theme'] = $row['editor_theme'];
                $info['font'] = $row['editor_font'];
                $info['preferences'] = array();
                $info['preferences']['message'] = $row['pref_message'];
                $info['preferences']['friend'] = $row['pref_friend'];
                $info['preferences']['update'] = $row['pref_update'];
                $info['preferences']['duel'] = $row['pref_duel'];
                $info['preferences']['tourn'] = $row['pref_tourn'];
                $info['language'] = $row['pref_language'];
                $info['apothecary'] = $row['apothecary'];

                if (exif_imagetype($row['foto']) == IMAGETYPE_PNG){
                    $foto = $row['foto'];
                }
                else{
                    $gladcode = 'gladcodehashsecret36';
                    $email = $row['email'];
                    $hash = md5( $gladcode . strtolower( trim( $email ) ) );
                    $foto = mysql_escape_string("https://www.gravatar.com/avatar/$hash?d=retro");

                    $sql = "UPDATE usuarios SET foto = '$foto' WHERE id = '$user'";
                    $result = runQuery($sql);
                }
                $info['foto'] = $foto;

                $output = $info;
                $output['status'] = "SUCCESS";
            }
            else
                $output['status'] = "NOTFOUND";
            
            $sql = "UPDATE usuarios SET ativo = now() WHERE id = '$user'";
            $result = runQuery($sql);

            $sql = "SELECT now(), ativo FROM usuarios WHERE id = '$user'";
            $result = runQuery($sql);
            $row = $result->fetch_assoc();
            //$output['debug'] = $row;
        }
        else
            $output['status'] = "NOTLOGGED";
    }
    elseif ($action == "SET"){
        if (isset($_POST['admin'])){
            $admin = json_decode($_POST['admin'], true);

            $pass = mysql_escape_string($admin['pass']);
            if (md5($pass) == '07aec7e86e12014f87918794f521183b'){
                if (isset($admin['glad'])){
                    $glad = mysql_escape_string($admin['glad']);
                    $sql = "SELECT u.id FROM gladiators g INNER JOIN usuarios u ON g.master = u.id WHERE g.cod = $glad";
                }
                else if (isset($admin['user'])){
                    $user = mysql_escape_string($admin['user']);
                    $sql = "SELECT id FROM usuarios WHERE id = $user";
                }

                $result = runQuery($sql);
                $row = $result->fetch_assoc();
                $_SESSION['user'] = $row['id'];
                $output['status'] = "ADMIN";
            }
            else
                $output['status'] = "WRONG";
        }
        else{
            $token = $_POST['token'];

            $output = array();

            $call = "curl https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=$token >> auth";
            system($call);

            if (file_exists("auth")){
                $google_resp = json_decode(file_get_contents("auth"), true);
                system("rm -rf auth");

                if (isset($google_resp['sub'])){
                    $email = $google_resp['email'];
                    $nome = $google_resp['given_name'];
                    $sobrenome = $google_resp['family_name'];
                    $googleid = $google_resp['sub'];

                    $gladcode = 'gladcodehashsecret36';
                    $hash = md5( $gladcode . strtolower( trim( $email ) ) );
                    $foto = "https://www.gravatar.com/avatar/$hash?d=retro";
            
                    $sql = "SELECT * FROM usuarios WHERE email = '$email' OR googleid = '$googleid'";
                    $result = runQuery($sql);
                    $nrows = $result->num_rows;
                    $row = $result->fetch_assoc();
                    
                    if ($nrows == 0){
                        $apelido = $nome . rand(100,999);
                        $pasta = md5($email);
                        $sql = "INSERT INTO usuarios (googleid,email,nome,apelido,sobrenome,pasta,ativo,foto) VALUES ('$googleid','$email','$nome','$apelido','$sobrenome','$pasta',now(), '$foto')";
                        $result = runQuery($sql);
                        $path = "/home/gladcode/user";
                        system("mkdir $path/$pasta");
                        $id = $conn->insert_id;

                        //join gladcode room
                        $sql = "INSERT INTO chat_users (room, user, joined, visited, privilege) VALUES (1, '$id', now(3), now(3), 1)";
                        $result = runQuery($sql);
                    }
                    else{
                        $pasta = $row['pasta'];
                        $id = $row['id'];
            
                        if (is_null($row['googleid']) || $row['email'] != $email){
                            $sql = "UPDATE usuarios SET googleid = '$googleid', email = '$email' WHERE id = $id";
                            $result = runQuery($sql);
                        }
                    }
                    
                    $_SESSION['user'] = $id;
            
                    $output['id'] = $id;
                    $output['email'] = $email;
                    $output['nome'] = $nome;
                    $output['sobrenome'] = $sobrenome;
                    $output['foto'] = $foto;
                    $output['pasta'] = $pasta;
            
                }
                else
                    $output['status'] = "INVALID";
            }
            else
                $output['status'] = "FILE ERROR";
        }
    }
    elseif ($action == "UNSET"){
        if (isset($_SESSION['user']))
            $output['status'] = "LOGOUT";
        else
            $output['status'] = "NOCHANGE";

        unset($_SESSION['user']);
    }
    elseif ($action == "UPDATE"){
        if(isset($_SESSION['user'])){
            $user = $_SESSION['user'];
            $nickname = mysql_escape_string($_POST['nickname']);
            $language = mysql_escape_string($_POST['language']);
            $picture = $_POST['picture'];
            $preferences = (array)json_decode($_POST['preferences']);
            $pref_message = $preferences['message'];
            $pref_friend = $preferences['friend'];
            $pref_update = $preferences['update'];
            $pref_duel = $preferences['duel'];
            $pref_tourn = $preferences['tourn'];
            
            $sql = "SELECT id FROM usuarios WHERE apelido = '$nickname' AND id != '$user'";
            $result = runQuery($sql);

            if ($result->num_rows == 0){
                $sql = "SELECT pasta FROM usuarios WHERE id = '$user'";
                $result = runQuery($sql);
                $row = $result->fetch_assoc();
                $pasta = $row['pasta'];

                $pattern = '#^data:image/\w+;base64,#i';
                if ($picture != "profpics/$pasta.png"){
                    $picture = base64_decode(preg_replace($pattern, '', $picture));
                    file_put_contents("profpics/$pasta.png",$picture);
                    $picture = "profpics/$pasta.png";
                }
                
                $sql = "UPDATE usuarios SET apelido = '$nickname', foto = '$picture', pref_message = '$pref_message', pref_friend = '$pref_friend', pref_update = '$pref_update', pref_duel = '$pref_duel', pref_tourn = '$pref_tourn', pref_language = '$language' WHERE id = '$user'";
                $result = runQuery($sql);

                $output['status'] = "SUCCESS";
            }
            else
                $output['status'] = "EXISTS";;
        }
        else
            $output['status'] = "NOTLOGGED";;
    }
    elseif ($action == "TUTORIAL_END"){
        if(isset($_SESSION['user'])){
            $user = $_SESSION['user'];
            $sql = "UPDATE usuarios SET showTutorial = '0' WHERE id = '$user'";
            $result = runQuery($sql);
            $output['status'] = "SUCCESS";
        }
    }
    elseif ($action == "TUTORIAL_LANGUAGE"){
        if(isset($_SESSION['user'])){
            $user = $_SESSION['user'];
            $language = mysql_escape_string($_POST['language']);
            $sql = "UPDATE usuarios SET pref_language = '$language' WHERE id = '$user'";
            $result = runQuery($sql);
            $output['status'] = "SUCCESS";
        }
    }
    elseif ($action == "EDITOR"){
        $user = $_SESSION['user'];
        $theme = mysql_escape_string($_POST['theme']);
        $font = mysql_escape_string($_POST['font']);

        $sql = "UPDATE usuarios SET editor_theme = '$theme', editor_font = '$font' WHERE id = '$user'";
        $result = runQuery($sql);
    }
    elseif ($action == "PREMIUM"){
        $output['status'] = "NOSUPPORT";

        // $user = $_SESSION['user'];
        // $sql = "SELECT premium FROM usuarios WHERE id = $user";
        // $result = runQuery($sql);
        // $row = $result->fetch_assoc();
        
        // if (!is_null($row['premium'])){
        //     $output['status'] = "PREMIUM";
        // }
        // else{
        //     $sql = "UPDATE usuarios SET premium = now(), credits = 30 WHERE id = $user";
        //     $result = runQuery($sql);

        //     $output['status'] = "SUCCESS";
        // }
    }
    elseif ($action == "SPOKEN_LANGUAGE"){
        $user = $_SESSION['user'];
        $lang = mysql_escape_string($_POST['language']);

        $available_languages = array('pt', 'en');
        if (in_array($lang, $available_languages)){
            $sql = "UPDATE usuarios SET spoken_language = '$lang' WHERE id = $user";
            $result = runQuery($sql);

            $output['status'] = "SUCCESS";
        }
        else{
            $output['status'] = "INVALID";
        }
    }
    elseif ($action == "TRANSLATE"){
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
                $response[$i] = json_decode($response[$i], true)['data']['translations'][0]['translatedText'];
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

    echo json_encode($output);
?>