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
import * as _ from "https://apis.google.com/js/platform.js?onload=onLoadCallback"

const google = {
    auth2: null,
    started: false
}

google.init = function(){ 
    //if node is not logged, logout from php
    socket.request('login', {}).then( async (res, err) => {
        if (err) return console.log(err)
        // console.log(res)
        if (res.session === false){
            const data = await post("back_login.php", {
                action: "UNSET"
            })
            if (data.status == "LOGOUT"){
                window.location.reload()
            }
        }
    })

    return new Promise( resolve => {
        gapi.load('auth2', () => {
            // Retrieve the singleton for the GoogleAuth library and set up the client.
            this.auth2 = gapi.auth2.init({
                client_id: '108043684563-uhl9ui9p47r5fadmu31mr3mmg7g4936n.apps.googleusercontent.com',
                cookiepolicy: 'single_host_origin',
                // Request scopes in addition to 'profile' and 'email'
                //scope: 'additional_scope'
            })
            this.started = true
            resolve(true)
        })
    })    
}

google.login = async function(){
    if (!this.started){
        await this.init()
    }
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
    if (!this.started){
        await this.init()
    }

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
