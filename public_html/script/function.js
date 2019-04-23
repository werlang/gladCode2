$(document).ready( function() {
	
	var found = false;
	var func = $('#vget').val();

	if (func == "")
		load_content("");
	else{
		$.getJSON("script/functions/"+ func, function(data){
			load_content(data);
		
			if ($('#dict').length){
				loadDict(func, $('#dict').html());
				$('#dict').remove()
			}
		}).fail( function(){
			load_content("");
		});
	}

});

function load_content(item){
	if (!item){
		var func = $('#vget').val();
		$('#content-box').html("<h1>Função <i>"+ func +"</i> não encontrada.</h1><p><a href='docs'>Voltar para documentação</a></p>")
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
			$('#temp-seealso').append("<tr><td><a href='function/"+ i.toLowerCase() +"'>"+ i +"</a></td><td>"+ data.description.brief +"</td></tr>");
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

function loadDict(func, lang){
	var content = [];
	var cont = 1, total;
	findFunc(func).then( function(data){
		content.push(data);
		total = data.seealso.length + 1;
		for (var i in data.seealso){
			findFunc(data.seealso[i].toLowerCase()).then( function(data){
				content.push(data);
				cont++;
			});
		}
	});
	var sync = setInterval(function() {
		if (cont == total){
			clearInterval(sync);
			if (lang == 'pt'){
				for (var i in content){
					var pattern = new RegExp("([^f=\\w])"+ content[i].name +"([\\W])", 'g');
					var replace = '$1'+ content[i].ptname +'$2';
					$('#content-box').html($('#content-box').html().replace(pattern, replace));
				}
				var pattern = new RegExp("<a href=\"function/([\\w]*?)\"", 'g');
				var replace = "<a href='funcao/$1'";
				$('#content-box').html($('#content-box').html().replace(pattern, replace));
			}
		}
	}, 10);
}