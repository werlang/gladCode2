var user;
post("back_login.php", {
    action: "GET"
}).then( data => user = data )

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

    waitLogged().then( async () => {
        let langObj = $(`#header #language #lang-${user.speak}.item`)
        $('#header #language .title').html(langObj.text())
        langObj.addClass('hidden')

        await translator.init({
            ignore: ['C'],
            force: {
                "Não": "No"
            }
        })
        await translator.translate($('body'))
        if (user.speak != 'pt'){
            translator.googleTranslate($('body'))
        }
    })
});

async function waitLogged(){
    return await new Promise( (resolve, reject) => {
        loginReady();
        function loginReady(){
            setTimeout( function() {
                if (user)
                    resolve(user);
                else
                    loginReady();
            }, 100);
        }
    });
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

var translator = {}

translator.init = function({force, ignore}){
    this.ignore = []
    if (ignore){
        this.ignore = ignore
    }

    if (force){
        this.translations = []
        for (let k in force){
            this.translations.push({
                pt: k,
                en: force[k]
            })
        }
    }

    return $.getJSON(`script/translation.json`, data => {
        this.template = data
    })
}

translator.translate = async function(element){
    if (!this.template){
        return false
    }
    else {
        let info = this.template
        let lang = user && user.speak ? user.speak : 'pt'

        var fieldcheck = ['title', 'placeholder']

        // console.log(data)
        element.find(`*`).contents().each(function(){
            // replace contents
            if (this.nodeType == 3){
                let v = this.textContent.replace(/\{\{(\w+)\}\}/, "$1")
                if (v.length && info[v]){
                    this.textContent = this.textContent.replace(this.textContent, info[v][lang])
                }
            }

            let fields = []
            for (let check of fieldcheck){
                if (this[check] && this[check] != ""){
                    fields.push(check)
                }
            }
    
            for (let field of fields){
                let replace = this[field].replace(/\{\{(\w+)\}\}/, "$1")
                if (replace.length && info[replace]){
                    this[field] = this[field].replace(this[field], info[replace][lang])
                }
            }
        })

        return this
    }
}

translator.googleTranslate = async function(elements) {
    let lang = (user && user.speak) ? user.speak : 'pt'
    let contents = this.translations ? this.translations : []

    let ignoreList = this.ignore

    if (lang != 'pt'){
        elements = Array.isArray(elements) ? elements : [elements]

        for (element of elements){
            element.find(`*`).contents().each(function(){
                // replace contents
                if (this.nodeType == 3 && !this.textContent.includes("\n") && !this.textContent.includes("\t") && !ignoreList.includes(this.textContent)){
                    let text = this.textContent.replace(/(\w+)/, "$1")
                    if (text.length && !contents.filter(e => e.pt == text).length){
                        contents.push({pt: text})
                    }
                }
                // replace titles
                if (this.title && this.title.length){
                    if (!contents.filter(e => e.pt == this.title).length){
                        contents.push({pt: this.title})
                    }
                }
            })
        }

        const apiKey = "AIzaSyDfENHlgZgw6BDTbevnSJKiZP30BRIJe2g"
        const url = `https://www.googleapis.com/language/translate/v2`

        let calls = []
        for (let i in contents){
            if (!contents[i].en){
                calls[i] = $.post(url, {
                    q: contents[i].pt,
                    source: 'pt',
                    target: lang,
                    key: apiKey
                }).done( data => {
                    // console.log(data)
                    contents[i].en = decodeHTML(data.data.translations[0].translatedText)
                })
            }
        }

        for (let call of calls){
            await call
        }

        this.translations = contents
        
        for (element of elements){
            element.find(`*`).contents().each(function(){
                // replace contents
                if (this.nodeType == 3){
                    let item = contents.filter(e => e.pt == this.textContent)
                    if (item.length){
                        this.textContent = ` ${this.textContent.replace(item[0].pt, item[0].en)} `
                    }
                }

                if (this.title){
                    let item = contents.filter(e => e.pt == this.title)
                    if (item.length){
                        this.title = item[0].en
                    }
                }
            })
        }
    }

    return this
}