<?php
    $output = array();    
    $post = json_decode($argv[1], true);

    $output['id'] = $post['id'];
    $output['action'] = $post['action'];

    $output['resp'] = $post['v1'] + $post['v2'];

    session_start();

    if (isset($_SESSION))
        $output['session'] = $_SESSION;
    if (isset($_COOKIE))
        $output['cookie'] = $_COOKIE;

    echo json_encode($output);
?>