/*
how to include google login in your page:
1 - add the following tags in the php page:
    <meta name="google-signin-client_id" content="108043684563-uhl9ui9p47r5fadmu31mr3mmg7g4936n.apps.googleusercontent.com">
    <script src="https://apis.google.com/js/platform.js" async defer></script>
    <script type="text/javascript" src="script/googlelogin.js"></script>
    
2 - call google.init function on the page load:

3 - call googleLogin to authenticate
    google_login().then( function(data){
        data = JSON.parse(data);
    });

    data contains a json with the following attributes:
    email: user email
    nome: user first name
    sobrenome: user last name
    foto: user picture
    pasta: folder name on the server
*/

import {socket} from "./socket.js"
import {post} from "./utils.js"

const google = {
    auth2: null
}

google.init = function(){ 
    var gapiInt = setInterval(gapiReady, 10);
    
    function gapiReady() {
        if (typeof gapi !== 'undefined'){
            gapi.load('auth2', function(){
                // Retrieve the singleton for the GoogleAuth library and set up the client.
                google.auth2 = gapi.auth2.init({
                    client_id: '108043684563-uhl9ui9p47r5fadmu31mr3mmg7g4936n.apps.googleusercontent.com',
                    cookiepolicy: 'single_host_origin',
                    // Request scopes in addition to 'profile' and 'email'
                    //scope: 'additional_scope'
                });
            });
            clearInterval(gapiInt);
        }
    }

    //if node is not logged, logout from php
    socket.request('login', {}).then( function(res, err){
        if (err) return console.log(err);
        if (res.session === false){
            $.post("back_login.php", {
                action: "UNSET"
            }).done( function(data){
                data = JSON.parse(data);
                if (data.status == "LOGOUT")
                    window.location.reload();
            });
        }
    });
}

google.login = function(){
    return new Promise( resolve => {
        google.auth2.signIn().then( function() {
            var id_token = google.auth2.currentUser.get().getAuthResponse().id_token;
            // console.log(id_token);
            post( "back_login.php", {
                action: "SET",
                token: id_token
            }).then( data => {
                // console.log(data);
                resolve(data)
            });
            
            if (socket){
                socket.request('login', {
                    token: id_token
                }).then( function(res, err){
                    if (err) return console.log(err);
                })
            }
    
        }).catch( function(error){
            // console.log(error);
        });
    })
}

google.logout = async function() {
    //logout on google api
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.disconnect();
    auth2.signOut()

    //unset php session
    await post( "back_login.php", {
        action: "UNSET",
    }).then( data => {
    })

    //destroy node session
    if (socket){
        await socket.request('login', {
            logout: true
        }).then( function(res, err){
            if (err) return console.log(err);
        })
    }

    return true;
}

export {google}
