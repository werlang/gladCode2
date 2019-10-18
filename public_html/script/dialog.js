function showDialog(message,buttons){
	var response = $.Deferred();
	$('body').append("<div id='fog'><div id='dialog-box'><div id='message'></div><div id='button-container'></div></div></div>");
	$('#dialog-box #message').html(message);
	$('#fog').hide().fadeIn();
	for (var i in buttons){
		$('#dialog-box #button-container').append("<button class='button'>"+ buttons[i] +"</button>");
	}
	$('#dialog-box .button').click( function(){
		$('#dialog-box').parents('#fog').remove();
		response.resolve($(this).html());
	});
	return response.promise();
}

function showTextArea(message,placeholder,maxchar){
	var response = $.Deferred();
	
	$('body').append("<div id='fog'><div id='dialog-box'><div id='message'>"+ message +"</div><textarea class='input' placeholder='"+ placeholder +"'></textarea><span id='charcount'>"+ maxchar +" caracteres</span><div id='button-container'><button class='button'>CANCELAR</button><button class='button' id='btnok'>OK</button></div></div></div>");
	$('#fog').hide().fadeIn();
	$('#dialog-box .input').focus();
	
	$('#dialog-box .button').click( function(){
		var text = $('#dialog-box .input').val();
		if ($(this).html() == "OK"){
			if ( text.length > maxchar ){
				$('#dialog-box .input').addClass('alert');
				$('#dialog-box .input').focus();
			}
			else{
				response.resolve(text);
				$('#dialog-box').parents('#fog').remove();
			}
		}
		else{
			response.resolve(false);
			$('#dialog-box').parents('#fog').remove();
		}
	});
	
	$('#dialog-box .input').on('input', function(){
		var left = maxchar - $(this).val().length;
		$('#dialog-box #charcount').html(left +" caracteres");
		if (left < 0)
			$('#dialog-box #charcount').addClass('alert');
		else{
			$('#dialog-box #charcount').removeClass('alert');
			$('#dialog-box .input').removeClass('alert');
		}
	});
	return response.promise();
}

function showInput(message,defValue){
	var response = $.Deferred();

	$('body').append("<div id='fog'><div id='dialog-box'><div id='message'></div><input type='text' class='input'><div id='button-container'><button class='button'>CANCELAR</button><button class='button' id='btnok'>OK</button></div></div></div>");
	$('#dialog-box #message').html(message);
	if (!defValue)
		defValue = "";
	$('#dialog-box .input').val(defValue);
	$('#fog').hide().fadeIn();
	$('#dialog-box .input').focus();
	$('#dialog-box .button').click( function(){
		var text = $('#dialog-box .input').val();
		if ($(this).html() == "OK")
			response.resolve(text);
		else
			response.resolve(false);
		$('#dialog-box').parents('#fog').remove();
	});
	$('#dialog-box .input').keyup(function(e){
		if (e.keyCode == 13)
			$('#dialog-box #btnok').click();
	});
	return response.promise();
}

function showMessage(message){
	var response = $.Deferred();
	$('body').append("<div id='fog'><div id='dialog-box'><div id='message'></div><div id='button-container'><button class='button'>OK</button></div></div></div>");
	$('#dialog-box #message').html(message);
	$('#fog').hide().fadeIn();
	$('#dialog-box .button').click( function(){
		$('#dialog-box').parents('#fog').remove();
		response.resolve(true);
	});
	return response.promise();
}

function showTerminal(title, message){
	$('body').append("<div id='fog'><div id='terminal'><div id='title'><span>"+ title +"</span><div id='close'></div></div><pre></pre></div></div>");
	$('#terminal #close').click( function() {
		$('#terminal').parents('#fog').remove();
	});
	$('#terminal pre').html(message);
}

function create_toast(message, type) {
    var icon;
    if (type == 'error')
        icon = 'cancel';
    else if (type == 'info')
        icon = 'error';
    else if (type == 'success')
        icon = 'check_circle';

    $('body').append("<div class='toast "+ type +"'><i class='material-icons'>"+ icon +"</i><span>"+ message +"</span></div>");
    setTimeout( function(){
        $('.toast').fadeOut(3000, function(){
            $(this).remove();
        })
    }, 2000);

}

function create_tooltip(message, obj, args){
	$('#tooltip').remove();
	$('body').append(`<div id='tooltip'>${message}</div>`);

	var thistooltip = $('#tooltip'); //to avoid a running timeout to remove a tooltip just created
	thistooltip.hide().fadeIn(150);
	var docpos = document.body.getBoundingClientRect();
	var elempos = obj[0].getBoundingClientRect();
	thistooltip.css({
		left: elempos.left - docpos.left,
		top: elempos.top - docpos.top
	});

	var fadetime = 2000;
	if (args && args.fadeOut)
		fadetime = args.fadeOut;
	
	var remaintime = 2000;
	if (args && args.remain)
		remaintime = args.remain;

	setTimeout( () => {
		thistooltip.fadeOut(fadetime, () => {
			thistooltip.remove();
		})
	}, remaintime);
}