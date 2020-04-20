var user;

$(document).ready( function() {
	$('#menu-button').click( function() {
		$('body').append("<div id='fog'><div id='menu'></div></div>");
		$('#fog #menu').html("<a href='index.php'><img src='icon/logo.png'></a>"+ $('#h-items').html());
		
		$('#fog').click( function() {
			$('#fog #menu').toggle("slide", 300, function() {
				$('#fog').remove();
			});
		});
		$('#fog #menu').click( function(e) {
			e.stopPropagation();
		});
		$('#fog #login').click( function(){
			googleLogin().then( function(data){
				window.location.href = "news";
			});
		});	
		
		$('#fog #menu').toggle("slide", 300); //precisa jquery ui
	});
	
	$('.drop-menu').hover( function() {
		menu_open($(this));
	});
	$('.drop-menu').mouseleave( function() {
		menu_close();
	});
	$('.drop-menu').click( function() {
		menu_close();
		menu_open($(this));
	});
	function menu_open(element){
		$('.item-container').hide();
		if ($('.item-container.open').length == 0){
			var container = element.find('.item-container');
			container.slideDown().addClass('open');
			
			var left = element.position().left;
			if (element.position().left + container.find('.item').width() > $(window).width())
				left = element.position().left + element.width() - container.width();

			container.css({
				'left': left, 
				'top': element.position().top + element.height()
			});

		}
	}
	function menu_close(){
		$('.item-container').hide();
		$('.item-container').removeClass('open');
	}
	
	initGoogleLogin();

	$('.mobile #login, .desktop #login').click( function(){
		googleLogin().then( function(data){
			window.location.href = "news";
		});
	});	
	
	$.post("back_login.php", {
		action: "GET"
	}).done( function(data){
		// console.log(data);
		data = JSON.parse(data);
		user = data;
		if (data.status == "NOTLOGGED")
			$('.mobile #profile, .desktop #login').removeClass('hidden');
		else{
			socket_request('login', {}).then( function(res, err){
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
				else
					$('.mobile #login, .desktop #profile').removeClass('hidden');
			});
		}
	});

	if ($('#footer').length)
		$('#footer').load("footer.php");
});

async function waitLogged(){
	return await new Promise( (resolve, reject) => {
		loginReady();
		function loginReady(){
			setTimeout( function() {
				if (user)
					resolve(user);
				else
					loginReady();
			}, 100);
		}
	});
}

async function post(path, args){
    return $.post(path, args).then( data => {
        try{
            data = JSON.parse(data)
        } catch(e) {
            return {error: e, data: data}
        }
        return data
    })
}


