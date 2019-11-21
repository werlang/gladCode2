<?php

function send_node_message($data){
    $data_string = json_encode($data);

    $hostname = $_SERVER['HTTP_HOST'];
    $protocol = $_SERVER['REQUEST_SCHEME'];
    $ch = curl_init("$protocol://$hostname:3000/phpcallback"); 
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                                                                     
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);                                                                  
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);                                                                      
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(                                                                          
        'Content-Type: application/json',                                                                                
        'Content-Length: ' . strlen($data_string))                                                                       
    );                                                                                                                   

    echo curl_exec($ch)."\n";
    curl_close($ch);
}
?>