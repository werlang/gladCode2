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
				window.location.href = "https://gladcode.tk/profile.php";
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
			element.find('.item-container').slideDown();
			element.find('.item-container').addClass('open');
			element.find('.item-container').css({'left': element.position().left, 'top': element.position().top + element.height()});
		}
	}
	function menu_close(){
		$('.item-container').hide();
		$('.item-container').removeClass('open');
	}
	
	initGoogleLogin();

	$('.mobile #login, .desktop #login').click( function(){
		googleLogin().then( function(data){
			window.location.href = "https://gladcode.tk/profile.php";
		});
	});	
	
	$.post("back_login.php", {
		action: "GET"
	}).done( function(data){
		//console.log(data);
		if (data == "NULL")
			$('.mobile #profile, .desktop #profile').hide();
		else
			$('.mobile #login, .desktop #login').hide();
	});
	
});
