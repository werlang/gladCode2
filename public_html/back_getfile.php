<?php
    session_start();
    if (!isset($_SESSION['user'])) {
        http_response_code(403);
        exit("AUTH_REQUIRED");
    }

    if (isset($_POST['action'])){
        $action = $_POST['action'];
        $path = "/home/gladcode/user";

        // Prevent path traversal
        if (isset($_POST['dir']) && (strpos($_POST['dir'], '..') !== false || strpos($_POST['dir'], "\0") !== false)) {
            exit("INVALID_DIR");
        }
        if (isset($_POST['name']) && (strpos($_POST['name'], '..') !== false || strpos($_POST['name'], '/') !== false || strpos($_POST['name'], '\\') !== false || strpos($_POST['name'], "\0") !== false)) {
            exit("INVALID_NAME");
        }

        if ($action == "FILE"){
            $href = $_POST['href'] ?? '';
            $real = realpath($href);
            if ($real && str_starts_with($real, $path) && file_exists($real)) {
                echo file_get_contents($real);
            } else {
                echo "NULL";
            }
        }
        elseif ($action == "DIR"){
            $dir = $_POST['dir'] ?? '';
            $targetDir = "$path/$dir";
            if (!is_dir($targetDir)) {
                echo "||";
                exit;
            }
            $files = scandir($targetDir);
            $files_only = Array();
            $folders_only = Array();
            foreach ($files as $file){
                if (is_dir("$targetDir/$file")){
                    if ($file != "." && $file != "..")
                        array_push($folders_only, $file);
                }
                else
                    array_push($files_only, $file);
            }
            echo implode("|",$folders_only) . "||" . implode("|",$files_only);
        }
        elseif ($action == "NEWDIR"){
            $name = $_POST['name'] ?? '';
            $dir = $_POST['dir'] ?? '';
            $targetDir = "$path/$dir/$name";
            if (!file_exists($targetDir)) {
                mkdir($targetDir, 0755, true);
            }
        }
        elseif ($action == "REMOVE"){
            $name = $_POST['name'] ?? '';
            $dir = $_POST['dir'] ?? '';
            $targetPath = "$path/$dir/$name";
            $realTarget = realpath($targetPath);
            if ($realTarget && str_starts_with($realTarget, $path)) {
                if (is_dir($realTarget)) {
                    rmdir($realTarget);
                } elseif (is_file($realTarget)) {
                    unlink($realTarget);
                }
            }
        }
        elseif ($action == "SAVE"){
            $name = $_POST['name'] ?? '';
            $dir = $_POST['dir'] ?? '';
            $text = $_POST['text'] ?? '';
            $targetDir = "$path/$dir";
            if (is_dir($targetDir)) {
                file_put_contents("$targetDir/$name", $text);
            }
        }
        elseif ($action == "SYNC"){
            $pathArg = $_POST['path'] ?? '';
            $text = $_POST['text'] ?? '';
            $real = realpath($pathArg);
            if ($real && str_starts_with($real, $path)) {
                file_put_contents($real, $text);
            }
        }
    }
?>