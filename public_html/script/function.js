$(document).ready( function() {
	
	var found = false;
	var func = $('#vget').val();

	$.getJSON("script/functions/"+ func, function(data){
		load_content(data);
	
		if ($('#dict').length){
			loadDict($('#dict').html());
			$('#dict').remove()
		}
		});

});

function load_content(item){
	if (!item){
		var func = $('#vget').val();
		$('#content-box').html("<h1>Função <i>"+ func +"</i> não encontrada.</h1><p><a href='docs.php'>Voltar para documentação</a></p>")
		return;
	}	
	
	$('title').html("gladCode - "+ item.name);
	$('#temp-name').html(item.name);
	$('#temp-syntax').html(item.syntax);
	$('#temp-description').html(item.description.long);
	
	$.each(item.param, function(k,i) {
		if (i.name == "void")
			$('#temp-param').append("<p>"+ i.description +"</p>");
		else
			$('#temp-param').append("<p class='syntax'>"+ i.name +"</p><p>"+ i.description +"</p>");
	});
	
	$('#temp-return').html(item.treturn);
	$('#temp-sample').html(item.sample);
	$('#temp-explain').html(item.explain);

	$.each(item.seealso, function(k,i) {
		findFunc(i.toLowerCase()).then( function(data){
			$('#temp-seealso').append("<tr><td><a href='function.php?f="+ i.toLowerCase() +"'>"+ i +"</a></td><td>"+ data.description.brief +"</td></tr>");
		});
	});
}

function findFunc(name){
	var response = $.Deferred();
	$.getJSON("script/functions/"+name, function(data){
		return response.resolve(data);
	});
	return response.promise();
}

function loadDict(lang){
	if (lang == 'pt'){
		for (var i in content){
			var pattern = new RegExp("([^f=\\w])"+ content[i].name +"([\\W])", 'g');
			var replace = '$1'+ content[i].ptname +'$2';
			$('#content-box').html($('#content-box').html().replace(pattern, replace));
		}
		var pattern = new RegExp("<a href=\"function\\.php\\?f=([\\w]*?)\"", 'g');
		var replace = "<a href='function.php?f=$1&l=pt'";
		$('#content-box').html($('#content-box').html().replace(pattern, replace));
	}
}