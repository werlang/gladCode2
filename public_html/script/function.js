$(document).ready( function() {
	$('#learn').addClass('here');
	
	var func = "";
	if ($('#vget').length)
		func = $('#vget').val();

	if (func == "")
		load_content("");
	else{
		$('#language select').selectmenu({
			change: function( event, ui ) {
				let ext = {
					c: "c",
					python: "py",
					blocks: "blk"
				};

				var lang_word = 'function';
				if ($('#dict').html() == 'pt')
					lang_word = 'funcao';

				window.location.href = `${lang_word}/${func}.${ext[ui.item.value]}`;
			}
		});
			
		$.getJSON(`script/functions/${func}.json`, async data => {
			await load_content(data);		
			await menu_loaded();
			
			var loc = $('#temp-name').html().toLowerCase();
			$('#side-menu li a').each( function(){
				if ($(this).html().toLowerCase() == loc){
					$(this).parent().addClass('here visible').siblings('li').addClass('visible');
					$(this).parents('ul').prev('li').addClass('here visible');
					$('li.here i').addClass('open');
				}
			});
		}).fail( function(){
			load_content("");
		});
	}

});

async function load_content(item){
	if (!item || item == ""){
		var func = $('#vget').val();
		$('#content').html("<h1>Função <i>"+ func +"</i> não encontrada.</h1><p><a href='docs'>Voltar para documentação</a></p>")
		return false;
	}

	var user = await waitLogged();

	var language;

	// set language to c or python only, and only if set in GET
	if ($('#get-lang').length){
		var ext = $('#get-lang').html();

		if (ext == 'c')
			language = "c";
		else if (ext == 'py')
			language = "python";
		else if (ext == 'blk')
			language = 'blocks'

		$('#get-lang').remove();
	}
	
	// if language is not set in GET, or set wrong, set user language, else set c
	if (!language){
		if (user)
			language = user.language
		else
			language = 'c';
	}

	$('#language select').val(language).selectmenu('refresh');

	if (language == 'blocks'){
		$('title').html("gladCode - "+ item.syntax[language])
		$('#temp-name').html(item.syntax[language])
		$('#temp-syntax').html(`<img src='script/functions/blockimg/${item.name.toLowerCase()}.png'>`)
	}
	else{
		$('title').html("gladCode - "+ item.name)
		$('#temp-name').html(item.name)

		$('#temp-syntax').html(item.syntax[language])

		$('#temp-syntax').attr('class', `language-${language}`)
		Prism.highlightElement($('#temp-syntax')[0])
	}

	$('#temp-description').html(item.description.long)

	var param = item.param.default;
	if (user && item.param[language])
		param = item.param[language];

	for (let i in param){
		if (param[i].name == "void")
			$('#temp-param').append("<p>"+ param[i].description +"</p>");
		else
			$('#temp-param').append("<p class='syntax'>"+ param[i].name +"</p><p>"+ param[i].description +"</p>");
	}
	
	var treturn = item.treturn.default;
	if (user && item.treturn[language])
		treturn = item.treturn[language];

	$('#temp-return').html(treturn);

	await new Promise( (resolve, reject) => {
		$('#temp-sample').load(`script/functions/samples/${item.sample[language]}`, () => {
			if (language == 'blocks')
				loadBlockSample($('#temp-sample'))
			else{
				$('#temp-sample').attr('class', `language-${language}`);
				Prism.highlightElement($('#temp-sample')[0]);
			}
			resolve(true);
		});
	});

	$('#temp-explain').html(item.explain);

	var funcs = {};
	funcs[item.name] = item.ptname;

	for (let i in item.seealso){
		let data = await findFunc(item.seealso[i].toLowerCase())
		if (language == 'blocks')
			data.name = data.syntax.blocks

		$('#temp-seealso').append("<tr><td><a href='function/"+ data.name.toLowerCase() +"'>"+ data.name +"</a></td><td>"+ data.description.brief +"</td></tr>")
		funcs[data.name] = data.ptname
	}

	loadDict(funcs, $('#dict').html());

	return true;
}

async function findFunc(name){
	return await $.getJSON(`script/functions/${name}.json`, () => {});
}

function loadDict(func, lang){
	if (lang == 'pt'){
		for (let name in func){
			var pattern = new RegExp("([^f=\\w])"+ name +"([\\W])", 'g');
			var replace = '$1'+ func[name] +'$2';
			$('#content #template').html($('#content #template').html().replace(pattern, replace));
		}
		var pattern = new RegExp("href=\"function/([\\w]*?)\"", 'g');
		var replace = "href='funcao/$1'";
		$('#content #template').html($('#content #template').html().replace(pattern, replace));
	}
}

function loadBlockSample(obj){
	let xml = obj.html()
	console.log(xml)
}