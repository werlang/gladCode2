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
				window.location.href = "profile";
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
			window.location.href = "profile";
		});
	});	
	
	$.post("back_login.php", {
		action: "GET"
	}).done( function(data){
		//console.log(data);
		data = JSON.parse(data);
		if (data.status == "NOTLOGGED")
			$('.mobile #profile, .desktop #profile').hide();
		else
			$('.mobile #login, .desktop #login').hide();
	});

	if ($('#footer').length)
		$('#footer').load("footer.php");
});

