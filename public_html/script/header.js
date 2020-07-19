var user;
waitLogged()

$(document).ready( function() {
    $('#menu-button').click( function() {
        $('body').append("<div id='fog'><div id='menu'></div></div>");
        $('#fog #menu').html("<a href='index'><img src='icon/logo.png'></a>"+ $('#h-items').html());
        
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
                window.location.href = "news";
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
            window.location.href = "news";
        });
    });	
    
    waitLogged().then( data => {
        if (data.status == "NOTLOGGED")
            $('.mobile #profile, .desktop #login').removeClass('hidden');
        else{
            socket_request('login', {}).then( function(res, err){
                if (err) return console.log(err);
                if (res.session === false){
                    $.post("back_login.php", {
                        action: "UNSET"
                    }).done( function(data){
                        data = JSON.parse(data);
                        if (data.status == "LOGOUT")
                            window.location.reload();
                    });
                }
                else
                    $('.mobile #login, .desktop #profile').removeClass('hidden');
            });

            translator.translate($('#header')).then( () => {
                // let langObj = $(`#header #language #lang-${user.speak}.item`)
                // $('#header #language .title').html(langObj.text())
                // langObj.addClass('hidden')
            })
        }
    })

    if ($('#footer').length){
        $('#footer').load("footer.php", async () => {
            await waitLogged()
            translator.translate($('#footer'))
        });
    }

    $('#header #language .item').click( async function() {
        let lang = $(this).attr('id').split('-')[1]
        
        let data = await post("back_login.php", {
            action: "SPOKEN_LANGUAGE",
            language: lang
        })
        console.log(data)
        if (data.status == "SUCCESS"){
            window.location.reload()
        }
    })
});

async function waitLogged(){
    if (user){
        return user
    }
    else{
        return new Promise( (resolve, reject) => {
            post("back_login.php", {
                action: "GET"
            }).then( data => {
                user = data
                resolve(user)
            })
        })
    }
}

async function post(path, args){
    return $.post(path, args).then( data => {
        try{
            data = JSON.parse(data)
        } catch(e) {
            return {error: e, data: data}
        }
        return data
    })
}

function decodeHTML(str) {
    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
        '\'': '&#39;'
    };
    for (var i in escapeMap){
        var regexp = new RegExp(escapeMap[i],"g");
        str = str.replace(regexp, i);
    }
    return str;
}

var translator = {
    ready: true
}

translator.translate = async function(elements){
    let lang = (user && user.speak) ? user.speak : 'pt'
    let contents = this.translations ? this.translations : {}
    
    if (elements.translate){
        let values = []
        var keys = []
        for (let i in elements.translate){
            values.push(elements.translate[i])
            keys.push(i)
        }
        elements = values
    }
    
    elements = Array.isArray(elements) ? elements : [elements]

    // console.log(elements)
    // search for contents to put in local obj
    for (let element of elements){
        if (typeof element === 'string'){
            if (!contents[element]){
                contents[element] = {}
            }
        }
        else{
            element.find(`*`).contents().each(function(){
                // check for template
                if (!$(this).data('skipTranslation')){
                    if ($(this).data('translationTemplate')){
                        let temp = $(this).data('translationTemplate')
                        contents[temp] = {template: temp}
                    }

                    if (lang != 'pt'){
                        // replace contents
                        if (this.nodeType == 3 && !this.textContent.includes("\n") && !this.textContent.includes("\t") && !$(this).hasClass('translated') && !this.textContent.match(/^[\d\s]+$/) && !this.textContent.match(/^\W+$/)){
                            let text = this.textContent.replace(/(\w+)/, "$1")
                            if (text.length && !contents[text]){
                                contents[text] = {}
                            }
                        }
                        // replace other fields
                        let fieldList = ['title', 'placeholder']

                        for (let field of fieldList){
                            if (this[field] && this[field].length && !$(this).hasClass('translated')){
                                if (!contents[this[field]]){
                                    contents[this[field]] = {}
                                }
                            }
                        }
                    }
                }
            })
        }
    }

    // check what is meant to be translated and send to back
    let toTranslate = []
    for (let i in contents){
        if (!contents[i][lang]){
            toTranslate.push(i)
        }
    }

    if (toTranslate.length){
        let data = await post("back_translation.php", {
            action: "TRANSLATE",
            language: lang,
            data: JSON.stringify(toTranslate),
        })
        // console.log(data)

        for (let i in data.response){
            contents[i][lang] = data.response[i]
        }
    }

    this.translations = contents

    let stringResponse = []
    for (element of elements){
        if (typeof element === 'string'){
            if (contents[element]){
                stringResponse.push(contents[element][lang])
            }
        }
        else{
            element.find(`*`).contents().each(function(){
                // replace template
                if (!$(this).data('skipTranslation')){
                    if ($(this).data('translationTemplate')){
                        let temp = $(this).data('translationTemplate')
                        this.textContent = contents[temp][lang]
                        bind_translated($(this))
                    }
                    else if (lang != 'pt'){
                        // replace contents
                        if (this.nodeType == 3){
                            if (contents[this.textContent] && !$(this).hasClass('translated')){                
                                this.textContent = ` ${contents[this.textContent][lang]} `
                                bind_translated($(this).parent())
                                // console.log($(this).parent())
                            }
                        }

                        // replace other fields
                        let fieldList = ['title', 'placeholder']

                        for (let field of fieldList){
                            if (this[field]){
                                if (contents[this[field]]){
                                    this[field] = `${contents[this[field]][lang]}`
                                    bind_translated($(this))
                                }
                            }
                        }
                        
                    }
                }
            })

            function bind_translated(obj){
                obj.addClass('translated')

                if (user.preferences.translation == "1"){
                    obj.hover( function(m) {
                        // create element

                        $('.improve-box').remove()
                        obj.append(`<div class='improve-box'><i class='fas fa-language'></i></div>`)

                        setTimeout( () => {
                            // show element
                            if (!obj.find('.improve-box').hasClass('visible')){
                                obj.find('.improve-box').css({
                                    'top': obj.position().top,
                                    'left': obj.position().left
                                })
                                obj.find('.improve-box').addClass('visible')
                                obj.find('.improve-box').off().click( function(e) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    $(this).remove()
                                    let text = obj.text().trim()
                                    new Message({
                                        message: "Sugira uma tradução melhor para o texto:",
                                        input: {
                                            default: text
                                        },
                                        buttons: {ok: "OK", cancel: "Cancelar"}
                                    }).show().click('ok', async input => {
                                        let advice = {
                                            old: text,
                                            new: input.input
                                        }
                                        
                                        let data = await post("back_translation.php", {
                                            action: "SUGGEST",
                                            original: advice.old,
                                            suggestion: advice.new,
                                            language: user.speak
                                        })
                                        // console.log(data)

                                        new Message({message: "Sugestão enviada"}).show()
                                    })
                                })
                            }
                        }, 2000)
                    })

                    obj.mouseleave( function() {
                        // remove element
                        obj.find('.improve-box').remove()
                    })
                }
            }

        }
    }

    if (keys && keys.length){
        let obj = {}
        for (let i in keys){
            obj[keys[i]] = stringResponse[i]
        }
        stringResponse = obj
    }

    return stringResponse
    
}