/*
how to include google login in your page:
1 - add the following tags in the php page:
	<meta name="google-signin-client_id" content="108043684563-uhl9ui9p47r5fadmu31mr3mmg7g4936n.apps.googleusercontent.com">
	<script src="https://apis.google.com/js/platform.js" async defer></script>
	<script type="text/javascript" src="script/googlelogin.js"></script>
	
2 - call initGoogleLogin function on the page load:

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

function initGoogleLogin(){
	var googleUser = {};
	
	var gapiInt = setInterval(gapiReady, 10);
	
	function gapiReady() {
		if (typeof gapi !== 'undefined'){
			gapi.load('auth2', function(){
				// Retrieve the singleton for the GoogleAuth library and set up the client.
				auth2 = gapi.auth2.init({
					client_id: '108043684563-uhl9ui9p47r5fadmu31mr3mmg7g4936n.apps.googleusercontent.com',
					cookiepolicy: 'single_host_origin',
					// Request scopes in addition to 'profile' and 'email'
					//scope: 'additional_scope'
				});
			});
			clearInterval(gapiInt);
		}
	}
}

function googleLogin(){
	var loginAjax = $.Deferred();
	
	auth2.signIn().then( function() {
		var id_token = auth2.currentUser.get().getAuthResponse().id_token;
		$.get( "https://www.googleapis.com/oauth2/v3/tokeninfo", {
			id_token: id_token
		} ).done(function( data ) {
			$.post( "back_login.php", {
				action: "SET",
				email: data.email,
				nome: data.given_name,
				sobrenome: data.family_name,
				foto: data.picture,
			} ).done( function(data){
				loginAjax.resolve(JSON.parse(data));
			});
		});
	}).catch( function(error){
		//console.log(error);
	});
						
	return loginAjax.promise();
}

function googleLogout() {
	var resp = $.Deferred();
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.disconnect();
	auth2.signOut().then(function () {
		$.post( "back_login.php", {
			action: "UNSET",
		} ).done(function(data){
			resp.resolve(true);
		});
	});
	return resp.promise();
}