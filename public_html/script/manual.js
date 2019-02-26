function calcAttrValue(slider) {
	if (slider == 0)
		return 0;
	return calcAttrValue(slider - 1) + Math.ceil(slider/3);
}

$(document).ready( function() {
	$(document).on('input change', '#distribuicao .slider', function() {
		$(this).parents('.slider-container').find('.slider-value').html(calcAttrValue($(this).val()));
		$(this).parents('.slider-container').find('.slider-input').val($(this).val());
		$('#distribuicao .button').prop('disabled','true');
		
		var soma = 0;
		$('#distribuicao .slider-value').each( function() {
			soma += parseInt($(this).html());
		});
		if (soma > 25)
			$('#distribuicao .button').html("PONTOS INSUFICIENTES");
		else if (soma < 25)
			$('#distribuicao .button').html(25 - soma + " PONTOS RESTANTES");
		else{
			$('#distribuicao .button').html("GERAR CÓDIGO");
			$('#distribuicao .button').removeProp('disabled');
		}
	});	
	
	$('#distribuicao .button').click( function() {
		var nome = $('#distribuicao #nome').val();
		var vstr = $('#distribuicao .slider-input').eq(0).val();
		var vagi = $('#distribuicao .slider-input').eq(1).val();
		var vint = $('#distribuicao .slider-input').eq(2).val();
		var codigo = "setup(){\n    setName(\""+ nome +"\");\n    setSTR("+ vstr +");\n    setAGI("+ vagi +");\n    setINT("+ vint +");\n}\n\nloop(){\n    //comportamento do gladiador\n}";
		createCodePopup(codigo);
	});
});

function createCodePopup(text){
	$('body').append("<div id='fog'><div id='code-window'><div id='title'><div id='close'></div></div><pre>"+ text +"</pre></div></div>");
	$('#fog #close').click( function() {
		$('#fog').remove();
	});
}