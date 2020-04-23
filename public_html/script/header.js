var user;

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
    
    $.post("back_login.php", {
        action: "GET"
    }).done( function(data){
        // console.log(data);
        data = JSON.parse(data);
        user = data;
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
    });

    if ($('#footer').length){
        $('#footer').load("footer.php");
    }

    $('#header .item #english').click( () => {
    })

});

templateTranslate('pt')

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

function templateTranslate(lang){
    $.getJSON(`script/translation.json`, data => {
        // console.log(data)
        $(`span`).contents().each(function(){
            let v = this.textContent.replace(/\{\{(\w+)\}\}/, "$1")
            if (v.length && data[v]){
                this.textContent = this.textContent.replace(this.textContent, data[v][lang])
            }
        })
    })
}

async function googleTranslate(parent){
    let content = []
    // search every element

    parent.find('*').contents().filter(function() {
        return this.nodeType == 3
    }).each(function(){
        // this.textContent = this.textContent.replace('Hi I am text','Hi I am replace');

        // get only final elements: exclude empty, with new line and tabs
        if (this.textContent.length > 0 && !this.textContent.includes("\n") && !this.textContent.includes("\t")){
            content.push(this.textContent)
        }
    })
    // get only unique
    content = content.filter( (e, i) => content.indexOf(e) == i)
    let translation = []
    // console.log(content)

    const apiKey = "AIzaSyDfENHlgZgw6BDTbevnSJKiZP30BRIJe2g"
    const url = `https://www.googleapis.com/language/translate/v2`

    let calls = []
    for (let i in content){
        calls[i] = $.post(url, {
            q: content[i],
            source: 'pt',
            target: 'en',
            key: apiKey
        }).done( data => {
            // console.log(data)
            translation[i] = decodeHTML(data.data.translations[0].translatedText)
        })
    }

    for (let call of calls){
        await call
    }
    
    parent.find('*').contents().filter(function() {
        return this.nodeType == 3
    }).each(function(){
        let index = content.indexOf(this.textContent)
        if (index != -1){
            this.textContent = ` ${this.textContent.replace(content[index], translation[index])} `
        }
    })

}