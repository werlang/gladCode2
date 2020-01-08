$(document).ready( function() {
	$('#learn').addClass('here');
	
	var found = false;
	var func = $('#vget').val();

	if (func == "")
		load_content("");
	else{
		$('#language select').selectmenu({
			change: function( event, ui ) {
				let ext = {
					c: "c",
					python: "py"
				};
				window.location.href = `function/${func}.${ext[ui.item.value]}`;
			}
		});
			
		$.getJSON(`script/functions/${func}.json`, function(data){
			load_content(data);
		
			if ($('#dict').length){
				loadDict(func, $('#dict').html());
				$('#dict').remove();
			}
			menu_loaded().then( function(data){
				var loc = window.location.href.split("/");
				loc = loc[loc.length - 1].split(".")[0];
				$('#side-menu li a').each( function(){
					if ($(this).html().toLowerCase() == loc){
						$(this).parent().addClass('here visible').siblings('li').addClass('visible');
						$(this).parents('ul').prev('li').addClass('here visible');
						$('li.here i').addClass('open');
					}
				});
			});    

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

	waitLogged().then(user => {
		var language;

		// set language to c or python only, and only if set in GET
		if ($('#get-lang').length){
			var ext = $('#get-lang').html();

			if (ext == 'c')
				language = "c";
			else if (ext == 'py')
				language = "python";

			$('#get-lang').remove();
		}
		
		// if language is not set in GET, or set wrong, set user language, else set c
		if (!language){
			if (user && user.language == 'python')
				language = 'python';	
			else
				language = 'c';
		}

		$('#language select').val(language).selectmenu('refresh');

		$('title').html("gladCode - "+ item.name);
		$('#temp-name').html(item.name);

		if (language == 'python')
			$('#temp-syntax').html(item.syntax.python);
		else
			$('#temp-syntax').html(item.syntax.c);

		$('#temp-syntax').attr('class', `language-${language}`);
		Prism.highlightElement($('#temp-syntax')[0]);
		$('#temp-description').html(item.description.long);

		var param = item.param.default;
		if (user && item.param[language])
			param = item.param[language];

		$.each(param, function(k,i) {
			if (i.name == "void")
				$('#temp-param').append("<p>"+ i.description +"</p>");
			else
				$('#temp-param').append("<p class='syntax'>"+ i.name +"</p><p>"+ i.description +"</p>");
		
		});
		
		var treturn = item.treturn.default;
		if (user && item.treturn[language])
			treturn = item.treturn[language];

		$('#temp-return').html(treturn);
		$('#temp-sample').load(`script/functions/samples/${item.sample[language]}`, () => {
			$('#temp-sample').attr('class', `language-${language}`);
			Prism.highlightElement($('#temp-sample')[0]);
		});
		$('#temp-explain').html(item.explain);

		$.each(item.seealso, function(k,i) {
			findFunc(i.toLowerCase()).then( function(data){
				$('#temp-seealso').append("<tr><td><a href='function/"+ i.toLowerCase() +"'>"+ i +"</a></td><td>"+ data.description.brief +"</td></tr>");
			});
		});
	});
}

function findFunc(name){
	var response = $.Deferred();
	$.getJSON(`script/functions/${name}.json`, function(data){
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
					$('#content').html($('#content').html().replace(pattern, replace));
				}
				var pattern = new RegExp("<a href=\"function/([\\w]*?)\"", 'g');
				var replace = "<a href='funcao/$1'";
				$('#content').html($('#content').html().replace(pattern, replace));
			}
		}
	}, 10);
}