$(document).ready( function(){
	$('#support input').click( function(){
		if ($('#support #one-time:checked').length)
			$('#support #method').slideDown();
		else{
			$('#support #method').fadeOut();
			$('#support #method input').removeProp('checked');
		}

		$('#support .donate').addClass('hidden');
		$('#support #buttons').hide();

		if ($('#support #crypto:checked').length)
			$('#support #bitcoin, #support #ethereum').removeClass('hidden');
		if ($('#support #boleto:checked').length + $('#support #card:checked').length)
			$('#support #pagseguro').removeClass('hidden');
		if ($('#support #monthly:checked').length + $('#support #card:checked').length)
			$('#support #paypal').removeClass('hidden');

		$('#support #buttons').slideDown('fast');
	});

	$('#support .donate.small').click( function(){
		var id = $(this).attr('id');
		console.log($('#footer #'+ id).length);
		$('#footer #'+ id).click();
	});
});