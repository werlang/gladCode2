import GoogleLogin from "./google-login.js";
import LocalData from "./local-data.js";

var user;
window.user = user;

post("back_login.php", {
    action: "GET"
}).then( data => user = data )

$(document).ready( async function() {
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
    
    $('.mobile #login, .desktop #login').click( function(){
        showDialog("<div>Faça login no sistema</div><div id='google-login'></div>", []);
        GoogleLogin.renderButton($('#google-login')[0]);
    });	

    GoogleLogin.init().then(async () => {
        let googleCredential = GoogleLogin.getCredential();
        if (googleCredential) return;
        GoogleLogin.prompt();
    });
    
    GoogleLogin.onFail(() => {
        GoogleLogin.removeCredential();
    });
    
    GoogleLogin.onSignIn(async () => {
        let googleCredential = GoogleLogin.getCredential();
        // console.log(googleCredential);
        if (!googleCredential) return;

        const credentialData = {};
        credentialData.googleid = googleCredential;

        await $.post( "back_login.php", {
            action: "SET",
            token: googleCredential
        } )

        const user = await post("back_login.php", { action: "GET" });
        console.log(user);
        new LocalData({ id: 'user'}).set({ data: user });
        location.href = '/profile';

    });
    
    $('.mobile #profile, .desktop #login').removeClass('hidden');

    if ($('#footer').length){
        $('#footer').load("footer.php", async () => {
            // await waitLogged()
            translator.translate($('#footer'))
        });
    }

    await translator.init()
    await translator.translate($('body'))
});

async function waitLogged(){
    return await new Promise( (resolve, reject) => {
        loginReady();
        function loginReady(){
            setTimeout( async function() {
                const data = new LocalData({ id: 'user' }).get();
                if (data) {
                    window.user = data;
                    resolve(data);
                }
                else
                    loginReady();
            }, 100);
        }
    });
}
window.waitLogged = waitLogged;

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
window.post = post;

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

translator.init = function(){
    return $.getJSON(`script/translation.json`, data => {
        this.info = data
    })
}

translator.translate = async function(element){
    if (!this.info){
        return false
    }
    else {
        let info = this.info
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
