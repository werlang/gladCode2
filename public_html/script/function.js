class fakeBlock {
    constructor({text, mode, color, input}){
        let svgpath
        if (mode == 'value')
            svgpath = 'image/block-tip-value.svg'
        else if (mode == 'statement')
            svgpath = ['image/block-tip-statement-top.svg', 'image/block-tip-statement-bottom.svg']

        if (input){
            for (let i in input){
                let pattern = new RegExp(`\\{${i}\\}`, "g")
                text = text.replace(pattern, `<div id='${i}'></div>`)
            }
        }    
        this.html = $($.parseHTML(`<div class='fake-block'><div class='tip'></div><div class='text'>${text}</div></div>`))

        if (mode == "value"){
            $.get(svgpath, data => {
                let svg = $(data).find('svg')
                this.html.addClass(mode).find('.tip').html(svg)
        
                this.setColor(color)

                if (input){
                    for (let i in input){
                        this.html.find(`.text #${i}`).html(input[i].getBlock(true))
                    }
                }    
            })
        }
        else{
            $.get(svgpath[0], data => {
                let svg = $(data).find('svg')
                this.html.addClass(mode).find('.tip').append(svg)
        
                this.setColor(color)

                this.html.find('.tip').append(`<div class='mid'></div>`)

                $.get(svgpath[1], data => {
                    let svg = $(data).find('svg')
                    this.html.find('.tip').append(svg)
            
                    this.setColor(color)

                    if (input){
                        for (let i in input){
                            this.html.find(`.text #${i}`).html(input[i].getBlock(true))
                        }
                    }    
                })
            })
        }
    }

    setColor(color){
        this.html.css({'background-color': color})
        this.html.find('.tip path').not('.shadow').css({'fill': color})
        this.html.find('.arrow').css({'color': color})
    }    

    getBlock(clone){
        if (clone)
            return this.html.clone()
        return this.html
    }

    static option(text){
        return `<span class='option'>${text}<span class='arrow'>⯆</span></span>`
    }

    static value(text){
        return `<span class='option'>${text}</span>`
    }
}

var langDict = false

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
                if ($('#dict').length){
                    langDict = $('#dict').html()
                    if (langDict == 'pt')
                        lang_word = 'funcao';
                }

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

    if (!item.syntax[language])
        window.location.href = `function/${item.name.default.toLowerCase()}.c`

    if (language == 'blocks'){
        $('title').html("gladCode - "+ item.name.block)
        $('#temp-name').html(item.name.block)
        $('#temp-syntax').parent().after(`<div id='syntax-ws'></div>`).remove()

        let xml = `<xml>${item.syntax.blocks}</xml>`
        let ws = Blockly.inject('syntax-ws', { readOnly: true });
        xmlDom = Blockly.Xml.textToDom(xml);
        Blockly.Xml.domToWorkspace(xmlDom, ws);

        new ResizeObserver(() => {
            Blockly.svgResize(ws);
        }).observe($('#syntax-ws')[0])
    }
    else{
        $('title').html("gladCode - "+ item.name.default)
        $('#temp-name').html(item.name.default)

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
        let samplePath = `script/functions/samples/${item.sample[language]}`

        if (language == 'blocks'){
            $('#temp-sample').parent().after(`<div id='sample-ws'></div>`).remove()

            $.get(samplePath, code => {
                // console.log(code)

                let ws = Blockly.inject('sample-ws', {
                    scrollbars: true,
                    readOnly: true
                });
        
                xmlDom = Blockly.Xml.textToDom(code);
                Blockly.Xml.domToWorkspace(xmlDom, ws);

                new ResizeObserver(() => {
                    Blockly.svgResize(ws);
                }).observe($('#sample-ws')[0])
        
                resolve(true);
            }, 'text')
        }
        else{
            $('#temp-sample').load(samplePath, () => {
                $('#temp-sample').attr('class', `language-${language}`);
                Prism.highlightElement($('#temp-sample')[0]);

                resolve(true);
            });
        }
    });

    $('#temp-explain').html(item.explain);

    if (langDict){
        var funcsDict = {};
        funcsDict[item.name.default] = item.name[langDict];
    }

    for (let i in item.seealso){
        let data = await findFunc(item.seealso[i].toLowerCase())
        let link = data.name.default.toLowerCase()
        let name = data.name.default

        if (language == 'blocks')
            name = data.name.block

        $('#temp-seealso').append(`<tr>
            <td><a href='function/${link}'>${name}</a></td>
            <td>${data.description.brief}</td></tr>`)

        if (langDict)
            funcsDict[data.name.default] = data.name[langDict]
    }

    if (langDict)
        loadDict(funcsDict)

    return true;
}

async function findFunc(name){
    return await $.getJSON(`script/functions/${name}.json`, () => {});
}

function loadDict(func){
    if (langDict == 'pt'){
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