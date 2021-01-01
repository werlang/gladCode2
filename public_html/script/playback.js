import { mergeLog } from "./utils.js"
import { loader } from "./loader.js"
import { header } from "./header.js"

var json = {};
var hashes = [], newindex = new Array();
var steps = new Array();
var istep;
var loghash;
var fullscreen = false;
var timeSlider = 0; 
var potionList = {}

header.load()

const simulation = {
    paused: true,
    time: 0,

    stepButton: {
        index: 4,
        options: [-10,-5,-2,-1,1,2,5,10],

        getValue: function(){
            return Math.round(this.options[this.index])
        },
        setValue: function(value){
            const i = this.options.indexOf(value)
            this.index = i != -1 ? i : 4
        },
        back: function(){
            this.index = this.index > 0 ? this.index - 1 : 0
        },    
        forward: function(){
            this.index = this.index < this.options.length - 1 ? this.index + 1 : this.options.length - 1
        },    
    },

    advance: function(direction) {
        if (this.paused){
            this.stepButton.setValue(direction == 'back' ? -1 : 1)

            document.querySelector('#fowd-step .speed').innerHTML = ""
            document.querySelector('#back-step .speed').innerHTML = this.stepButton.getValue()
        }
        else{
            this.stepButton[direction]()
            
            if (this.stepButton.getValue() > 0){
                document.querySelector('#back-step .speed').innerHTML = ""
                document.querySelector('#fowd-step .speed').innerHTML = this.stepButton.getValue() + 'x'
            }
            else{
                document.querySelector('#fowd-step .speed').innerHTML = ""
                document.querySelector('#back-step .speed').innerHTML = this.stepButton.getValue() + 'x'
            }
        }

        clearTimeout(this.timeout)
        this.startTimer()
    },

    back: function(){
        this.advance('back')
    },
    
    forward: function(){
        this.advance('forward')
    },

    pause: function(){
        this.step.setValue(1)

        if (this.paused){
            this.paused = false
            document.querySelector('#pause').classList.add('paused')
            document.querySelector('#back-step .speed').innerHTML = '-1x'
            document.querySelector('#fowd-step .speed').innerHTML = '1x'
        }
        else{
            this.paused = true
            document.querySelector('#pause').classList.remove('paused')
            document.querySelector('#back-step .speed').innerHTML = '-1'
            document.querySelector('#fowd-step .speed').innerHTML = '+1'
            this.step.setValue(1)
        }

        clearTimeout(this.timeout)
        this.startTimer()
    },

    startTimer: function(){
        this.timeout = setTimeout(() => {
            if (this.time < 0){
                this.time = 0
            }
            else if (this.time > this.steps.length - 1){
                this.time = this.steps.length - 1

                const winner = {}
                this.steps[this.time].glads.forEach((e,i) => {
                    //revive gladiator when running backwards
                    if (parseFloat(e.hp) > 0 && !document.querySelector('.ui-glad')[i].classList.contains('dead') &&
                    !winner.id || winner.hp < parseFloat(e.hp)){
                        winner.name = e.name
                        winner.hp = parseFloat(e.hp)
                        winner.team = e.user
                        winner.id = i
                    }
                })

                if (this.showScore && !document.querySelector('#end-message')){
                    if (!winner.id){
                        winner.name = "Empate"
                        winner.team = ""
                    }
                    document.querySelector('body').insertAdjacentHTML('beforeend', `<div id='fog'>
                        <div id='end-message'>
                            <div id='victory'>VITÓRIA</div>
                            <div id='image-container'>
                                <div id='image'></div>
                                <div id='name-team-container'>
                                    <span id='name'>${name}</span>
                                    <span id='team'>${team}</span>
                                </div>
                            </div>
                            <div id='button-container'>
                                <button class='button' id='retornar' title='Retornar para a batalha'>OK</button>
                                <button class='button small' id='share' title='Compartilhar'><i class="fas fa-share-alt"></i></button>
                            </div>
                        </div>
                    </div>`)

                    document.querySelector('#end-message #retornar').addEventListener('click', () => {
                        this.showScore = false
                        document.querySelector('#fog').remove()
                    })

                    document.querySelector('#end-message #share').click('click', () => {
                        document.querySelector('#end-message').classList.add('hidden')

                        const link = "play/"+ loghash

                        const twitter = `<a id='twitter' class='button' title='Compartilhar pelo Twitter' href='https://twitter.com/intent/tweet?text=Veja%20esta%20batalha:&url=https://${link}&hashtags=gladcode' target='_blank'><i class="fab fa-twitter"></i></a>`

                        const facebook = `<a id='facebook' class='button' title='Compartilhar pelo Facebook' href='https://www.facebook.com/sharer/sharer.php?u=${link}' target='_blank'><i class="fab fa-facebook-square"></i></a>`

                        const whatsapp = `<a id='whatsapp' class='button' title='Compartilhar pelo Whatsapp' href='https://api.whatsapp.com/send?text=Veja esta batalha:%0a${link}%0a%23gladcode' target='_blank'><i class="fab fa-whatsapp"></i></a>`

                        document.querySelector('#fog').insertAdjacentHTML('beforeend', `<div id='url'>
                            <div id='link'>
                                <span id='title'>Compartilhar batalha</span>
                                <span id='site'>gladcode.dev/play/</span>
                                <span id='hash'>${loghash}</span>
                            </div>
                            <div id='social'>
                                <div id='getlink' class='button' title='Copiar link'><i class="fas fa-link"></i></div>
                                ${twitter + facebook + whatsapp}
                            </div>
                            <button id='close' class='button'>OK</button>
                        </div>`)
                        
                        document.querySelector('#url #social #getlink').addEventListener('click', () => {
                            copyToClipboard(link)
                            document.querySelector('#url #hash').innerHTML = 'Link copiado'
                            document.querySelector('#url #hash').classList.add('clicked')
                            setTimeout(() => {
                                document.querySelector('#url #hash').classList.remove('clicked')
                                document.querySelector('#url #hash').innerHTML = loghash
                            }, 500)
                        })
                        
                        document.querySelector('#url #close').addEventListener('click', () => {
                            document.querySelector('#url').remove()
                            document.querySelector('#end-message').classList.remove('hidden')
                        })
                    })

                    if (winner.id){
                        document.querySelector('#end-message #image').innerHTML = getSpriteThumb(hashes[newindex[winner.id]],'walk','down')
                    }
                    
                    document.querySelector('#end-message').classList.add('fadein')
                    setTimeout(() => {
                        document.querySelector('#end-message').classList.remove('fadein')
                    }, 1000)

                    music.pause()
                    victory.play('', 0, music.volume / 0.1)
                }
            }
            else if (!this.showScore){
                document.querySelector('#fog').remove()
                this.showScore = true
                music.resume()
            }
            phaser_update(this.steps[this.time])
            if (!this.paused){
                this.time += this.stepButton.getValue() > 0 ? 1 : -1
            }
        }, 100 / this.step.getValue())
    }

}

(async () => {
    document.querySelector('#loadbar #status').innerHTML = "Página carregada"
    document.querySelector('#footer-wrapper').classList.add('white')

    document.querySelector('#back-step').addEventListener('click', () => {
        simulation.back()
    })

    document.querySelector('#fowd-step').addEventListener('click', () => {
        simulation.forward()
    })

    document.querySelector('#pause').addEventListener('click', () => {
        simulation.pause()
    })

    document.querySelector('#fullscreen').addEventListener('click', () => {
        setFullScreen(!isFullScreen())
    })

})()

$(document).ready( function() {    
    if ($('#log').html().length){
        var log;
        
        if ($('#log').html().length > 32)
            new Message({message: `Erro na URL`}).show();
        else{
            loghash = $('#log').html();
            queryLog();

            post("back_play.php", {
                action: "GET_PREF"
            }).then( function(data){
                // console.log(data);
                prefs.bars = (data.show_bars === true || data.show_bars == 'true');
                prefs.fps = (data.show_fps === true || data.show_fps == 'true');
                prefs.text = (data.show_text === true || data.show_text == 'true');
                prefs.speech = (data.show_speech === true || data.show_speech == 'true');
                
                prefs.crowd = parseFloat(data.crowd);

                prefs.sound.music = parseFloat(data.music_volume);
                $('#sound').data('music', parseFloat(data.music_volume));
                prefs.sound.sfx = parseFloat(data.sfx_volume);
                $('#sound').data('sfx', parseFloat(data.sfx_volume));
                changeSoundIcon();

                if (data.show_frames === true || data.show_frames == 'true'){
                    $('#ui-container').fadeIn();
                    prefs.frames = true;
                }
                else{
                    $('#ui-container').fadeOut();
                    prefs.frames = false;
                }
            });
        }
        
        function queryLog(){
            $.ajax({
                xhr: function() {
                    var xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener("progress", function(evt) {
                        if (evt.lengthComputable) {
                            var percentComplete = evt.loaded / evt.total;
                            //Do something with upload progress here
                        }
                   }, false);
            
                   xhr.addEventListener("progress", function(evt) {
                       if (evt.lengthComputable) {
                           var percentComplete = (100 * evt.loaded / evt.total).toFixed(0);
                           $('#loadbar #status').html("Fazendo download do log de batalha");
                           $('#loadbar #second .bar').width(percentComplete +"%");
                           $('#loadbar #main .bar').width(percentComplete/4 +"%");
                       }
                   }, false);
            
                   return xhr;
                },
                type: 'POST',
                url: "back_log.php",
                data: {
                    action: "GET",
                    loghash: loghash
                },
                success: function(data){
                    // console.log(data);
                    try{
                        data = JSON.parse(data);
                    }
                    catch(error){
                        console.log(error);
                    }

                    if (data.status == "EXPIRED"){
                        $('#loadbar').html(`<img src='icon/logo.png'><div><span>Esta batalha é muito antiga e não está mais acessível</span></div>`)
                        clearInterval(istep)
                    }
                    else if (data.status != "SUCCESS"){
                        // window.location.href = "https://gladcode.dev";
                        $('#loadbar').html(`<img src='icon/logo.png'><div><span>Esta batalha não consta nos registros</span></div>`)
                        clearInterval(istep)
                    }
                    else{
                        let log = JSON.parse(data.log)
                        // console.log(log)
                        var glads = log[0].glads;
                        stab = [];
                        gender = [];
                        
                        // console.log(log);
                        for (var i in glads){
                            //console.log(glads[i].skin);
                            var skin = glads[i].skin;
                            keepOrder(i,hashes,skin);
                            skin = JSON.parse(skin);
                            
                            stab[i] = "0";
                            gender[i] = "male";
                            for (var j in skin){
                                var item = getImage(skin[j]);
                                if (item.move == 'thrust')
                                    stab[i] = "1";
                                if (item.id == 'female')
                                    gender[i] = "female";
                            }
                        }
                        
                        function keepOrder(i, hashes, skin){
                            fetchSpritesheet(skin).then( function(data){
                                hashes[i] = data;
                                var pct = (100 * hashes.length / glads.length).toFixed(0);
                                $('#loadbar #status').html("Montando gladiadores");
                                $('#loadbar #second .bar').width(pct +"%");
                                $('#loadbar #main .bar').width(25 + pct/4 +"%");

                                if (hashes.length == glads.length){
                                    setTimeout( function(){
                                        const simulation = log
                                        json = {};
                                                    
                                        $('#loadbar #status').html("Carregando render");
                                        if (load_phaser()){
                                            //console.log(simulation[0]);
                                            create_ui(simulation[0].glads.length);
                                            $( "#time" ).slider("option", "max", simulation.length);
                                            for (let i=0 ; i<simulation[0].glads.length ; i++){
                                                simulation[0].glads[i].name = simulation[0].glads[i].name.replace(/#/g," "); //destroca os # nos nomes por espaços
                                                simulation[0].glads[i].user = simulation[0].glads[i].user.replace(/#/g," ");
                                                newindex[i] = i;
                                            }
                                    
                                            steps = mergeLog(simulation)
                                            start_timer(steps)
                                        }
                                    }, 100);
                                }
                            });
                        }

                    }
                }
            });
        }
    }
    $('#log').remove();
    
    $('#help').click( function(){
        $('body').append(`<div id='fog'>
        <div id='help-window' class='blue-window'>
            <div id='content'>
                <h2>Controle da câmera</h2>
                <div class='table'>
                    <div class='row'>
                        <div class='cell'><img src='icon/mouse_drag.png'>/<img src='icon/arrows_keyboard.png'></div>
                        <div class='cell'>Mover a câmera</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><img src='icon/mouse_scroll.png'>/<img src='icon/plmin_keyboard.png'></div>
                        <div class='cell'>Zoom da arena</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><img src='icon/select_glad.png'>/<img src='icon/numbers_keyboard.png'></div>
                        <div class='cell'>Acompanhar um gladiador</div>
                    </div>
                </div>
                <h2>Teclas de atalho</h2>
                <div class='table'>
                    <div class='row'>
                        <div class='cell'><span class='key'>M</span></div><div class='cell'>Mostrar/ocultar molduras</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>B</span></div><div class='cell'>Mostrar/ocultar barras de hp e ap</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>F</span></div><div class='cell'>Mostrar/ocultar taxa de atualização</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>ESPAÇO</span></div><div class='cell'>Parar/Continuar simulação</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>A</span></div>
                        <div class='cell'>Retroceder simulação</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>D</span></div>
                        <div class='cell'>Avançar simulação</div>
                    </div>
                    <div class='row'>
                        <div class='cell'><span class='key'>S</span></div>
                        <div class='cell'>Liga/desliga Música e efeitos sonoros</div>
                    </div>
                </div>
            </div>
            <div id='button-container'><button class='button' id='ok'>OK</button></div>
        </div>
        </div>`);

        $('#help-window #ok').click( function(){
            $('#fog').remove();
        });
    });

    $('#settings').click( function(){
        $('body').append(`<div id='fog'>
        <div id='settings-window' class='blue-window'>
            <h2>Preferências</h2>
            <div class='check-container'>
                <div id='pref-bars'><label><input type='checkbox' class='checkslider'>Mostrar barras de hp e ap (B)</label></div>
                <div id='pref-frames'><label><input type='checkbox' class='checkslider'>Mostrar molduras dos gladiadores (M)</label></div>
                <div id='pref-fps'><label><input type='checkbox' class='checkslider'>Mostrar taxa de atualização da tela (FPS) (F)</label></div>
                <div id='pref-text'><label><input type='checkbox' class='checkslider'>Mostrar valores numéricos de hp, ap e dano (T)</label></div>
                <div id='pref-speech'><label><input type='checkbox' class='checkslider'>Mostrar balões de fala</label></div>
                <div id='volume-container'>
                    <h3>Volume do áudio</h3>
                    <p>Efeitos sonoros</p>
                    <div id='sfx-volume'></div>
                    <p>Música</p>
                    <div id='music-volume'></div>
                </div>
                <div id='crowd-container'>
                    <h3>Número de espectadores</h3>
                    <div id='n-crowd'></div>
                </div>
            </div>
            <div id='button-container'><button class='button' id='ok'>OK</button></div></div>
        </div>`);

        var soundtest = game.add.audio('lvlup');
        $( "#sfx-volume" ).slider({
            range: "min",
            min: 0,
            max: 1,
            step: 0.01,
            create: function( event, ui ) {
                $(this).slider('value', prefs.sound.sfx);
            },
            slide: function( event, ui ) {
                prefs.sound.sfx = ui.value;
                soundtest.stop();
                soundtest.play('', 0.5, prefs.sound.sfx);

                changeSoundIcon();
            },
        });

        $( "#music-volume" ).slider({
            range: "min",
            min: 0,
            max: 0.1,
            value: 0.1,
            step: 0.001,
            create: function( event, ui ) {
                $(this).slider('value', music.volume);
            },
            slide: function( event, ui ) {
                music.volume = ui.value;

                changeSoundIcon();
            },
        });

        $( "#n-crowd" ).slider({
            range: "min",
            min: 0,
            max: 1,
            value: prefs.crowd,
            step: 0.1,
            create: function( event, ui ) {
            },
            slide: ( event, ui ) => {
                changeCrowd(ui.value);
                prefs.crowd = ui.value;
            }
        });

        if (prefs.bars)
            $('#pref-bars input').prop('checked', true);
        if ($('#ui-container').css('display') == 'flex')
            $('#pref-frames input').prop('checked', true);
        if (prefs.fps)
            $('#pref-fps input').prop('checked', true);
        if (prefs.text)
            $('#pref-text input').prop('checked', true);
        if (prefs.speech)
            $('#pref-speech input').prop('checked', true);

        $('.checkslider').each( function(){
            $(this).after("<div class='checkslider trail'><div class='checkslider thumb'></div></div>").hide()
        })

        $('#settings-window #ok').click( function(){
            post("back_play.php", {
                action: "SET_PREF",
                show_bars: prefs.bars,
                show_frames: $('#pref-frames input').prop('checked'),
                show_fps: prefs.fps,
                show_text: prefs.text,
                show_speech: prefs.speech,
                sfx_volume: prefs.sound.sfx,
                music_volume: music.volume,
                crowd: prefs.crowd
            }).then( function(data){
                //console.log(data);
            });

            $('#fog').remove();
        });

        $('#pref-bars input').change( function(){
            if ($(this).prop('checked'))
                prefs.bars = true;
            else
                prefs.bars = false;
        });

        $('#pref-frames input').change( function(){
            if ($(this).prop('checked')){
                $('#ui-container').fadeIn();
                prefs.frames = true;
            }
            else{
                $('#ui-container').fadeOut();
                prefs.frames = false;
            }
        });

        $('#pref-fps input').change( function(){
            if ($(this).prop('checked'))
                prefs.fps = true;
            else
                prefs.fps = false;
        });		

        $('#pref-text input').change( function(){
            if ($(this).prop('checked'))
                prefs.text = true;
            else
                prefs.text = false;
        });		

        $('#pref-speech input').change( function(){
            if ($(this).prop('checked'))
                prefs.speech = true;
            else
                prefs.speech = false;
        });		
    });

    $('#sound').click( function(){
        if (music.volume > 0){
            $(this).data('music', music.volume);
            music.volume = 0;
        }
        else if (prefs.sound.sfx > 0){
            $(this).data('sfx', prefs.sound.sfx);
            prefs.sound.sfx = 0;
        }
        else{
            music.volume = $(this).data('music');
            if (music.volume == 0)
                music.volume = 0.1;
    
            prefs.sound.sfx = $(this).data('sfx');
            if (prefs.sound.sfx == 0)
                prefs.sound.sfx = 1;
        }
        changeSoundIcon();

        post("back_play.php",{
            action: "SET_PREF",
            music_volume: music.volume,
            sfx_volume: prefs.sound.sfx
        });
    })

    function changeSoundIcon(){
        if ((!music && parseFloat($('#sound').data('music')) > 0) || (music && music.volume > 0))
            $('#sound').find('img').prop('src','icon/music.png');
        else if (prefs.sound.sfx > 0)
            $('#sound').find('img').prop('src','icon/music-off.png');
        else
            $('#sound').find('img').prop('src','icon/mute.png');
    }
    
    $( "#time" ).slider({
        range: "min",
        min: 0,
        max: 0,
        value: timestep,
        create: function( event, ui ) {
            $(this).append("<div class='ui-slider-time'></div>");
        },
        change: function( event, ui ) {
            var h = Math.floor(ui.value/600);
            var m = Math.floor(ui.value/10)%60;
            if (m < 10)
                m = "0"+ m;
            var time = h +":"+ m;
            $(this).find('.ui-slider-time').html(time);
            $(this).find('.ui-slider-time').css('left', $(this).find('.ui-slider-handle').css('left'));
        },
        slide: function( event, ui ) {
            timestep = ui.value;
        }
    });

    $([window, document]).focusin(function(){
        //console.log("entrou");
    }).focusout(function(){
        pausesim = false; //coloca false na var
        $('#pause').click(); //clica no botao e pause fica true
    });	

    // checkbox
    $('.checkslider').each( function(){
        $(this).after("<div class='checkslider trail'><div class='checkslider thumb'></div></div>").hide()
    })
    
});

function isFullScreen(){
    var isfs = (document.fullscreenElement && document.fullscreenElement !== null) ||
        (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
        (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
        (document.msFullscreenElement && document.msFullscreenElement !== null);
    if (isfs)
        return true;
    else
        return false;
}

function setFullScreen(state){
    if (state){
        var elem = $("body")[0];
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
        else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        }
        else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            elem.webkitRequestFullscreen();
        }
        else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
        fullscreen = true;
    }
    else{
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
        else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        fullscreen = false;
    }
    setTimeout( function(){
        resize();
    }, 100);
}

$(window).resize( function() {
    resize();
});

function resize() {
    if (game){
        var canvasH, canvasW;
        if ($(window).width() > $(window).height()){
            var usefulRatio = screenH / arenaD; //ration between entire and useful part of the background
            canvasH = $(window).height();
            canvasW = Math.min($(window).width(), screenW * game.camera.scale.x); //if the screen is smaller than deginated area for the canvas, use the small area
            game.camera.scale.x = $(window).height() * usefulRatio / screenH;
            game.camera.scale.y = $(window).height() * usefulRatio / screenH;
            if ($(window).height() < 450 && $(window).height() < $(window).width() && $('#dialog-box').length == 0){
                new Message({message: `Em dispositivos móveis, a visualização das lutas é melhor no modo retrato`}).show();
            }

        }
        else{
            if ($('#dialog-box').length){
                $('#fog').remove();
            }

            var usefulRatio = screenW / arenaD;
            canvasH = Math.min($(window).height(), screenH * game.camera.scale.y);
            canvasW = $(window).width();
            game.camera.scale.x = $(window).width() * usefulRatio / screenW;
            game.camera.scale.y = $(window).width() * usefulRatio / screenW;
            if ($(window).height() < 600 && !isFullScreen() && !fullscreen && $('#dialog-box').length == 0){
                new Message({
                    message: `Em dispositivos móveis, a visualização das lutas é melhor em tela cheia. Deseja trocar?`, 
                    buttons: {no: 'Não', yes: 'SIM'} 
                }).show().click('yes', () => {
                    setFullScreen(true);
                    $('#fog').remove();
                    fullscreen = true;
                });
            }
        }	
        game.scale.setGameSize(canvasW, canvasH); //this is that it should be, dont mess
        game.camera.bounds.width = screenW; //leave teh bounds alone, dont mess here
        game.camera.bounds.height = screenH;
        game.camera.y = (arenaY1 + arenaD/2) * game.camera.scale.y - game.height/2; //middle of the arena minus middle of the screen
        game.camera.x = (arenaX1 + arenaD/2) * game.camera.scale.x - game.width/2;

        $('#canvas-div canvas').click();
    }
}

//the entire reason of adding a uiVars is to avoid verifying DOM on each cycle, which is very slow
uiVars = [];
function create_ui(nglad){
    $('#ui-container').html("");
    for (let i=0 ; i<nglad ; i++){
        $('#ui-container').append("<div class='ui-glad'></div>");
        $('.ui-glad').last().load("ui_template.html", function(){
            $(this).click( function(){
                if ($(this).hasClass('follow') || $(this).hasClass('dead')){
                    game.camera.unfollow();
                    $('.ui-glad').removeClass('follow');
                    $('#details').remove();
                }
                else{
                    game.camera.follow(sprite[i]);
                    $('.ui-glad').removeClass('follow');
                    $(this).addClass('follow');
                    createDetailedWindow();
                }
            });
        });
        uiVars.push({});
    }
    uiVars.showtext = true;
}

function copyToClipboard(text) {
    $('body').append("<input type='text' id='icopy' value='"+ text +"'>");
    $('#icopy').select();
    document.execCommand("copy");
    $('#icopy').remove();
}	

function changeCrowd (value) {
    for (let i in npc){
        var r = Math.random();
        var alive = npc[i].sprite.body.alive;
        if (r < value && !alive){
            for (let j in npc[i].sprite)
                npc[i].sprite[j].revive();
        }
        else if (r > value && alive){
            for (let j in npc[i].sprite)
                npc[i].sprite[j].kill();
        }
    }
}

function createDetailedWindow(){
    var index = $('.ui-glad').index($('.follow'));
    var glad = json.glads[index];

    $('#details').remove();
    $('body').append(`<div id='details'>
        <div id='title' class='span-col-2'>
            <i class="fas fa-arrows-alt" title='Mover'></i>
            <span>Detalhes do gladiador</span>
            <i id='minimize' class="fas fa-window-minimize" title='Minimizar'></i>
        </div>
        <div id='content'>
            <span>Name:</span><input class='col-3 left' value='${glad.name}' readonly>
            <span>LVL:</span><input readonly>
            <span>XP:</span><input readonly>
            <span>X:</span><input readonly>
            <span>HP:</span><input readonly>
            <span>Y:</span><input readonly>
            <span>AP:</span><input readonly>
            <span>STR:</span><input readonly>
            <span>Head:</span><div id='head'><input readonly><span>🡅</span></div>
            <span>AGI:</span><input readonly>
            <span>Action:</span><input readonly>
            <span>INT:</span><input readonly>
            <div id='buffs'>
                <span>Buffs:</span>
                <span>Valor</span>
                <span>Tempo</span>
                <div id='box'><div></div><div></div><div></div></div>
            </div>
            <span>AS:</span><input readonly>
            <span>CS:</span><input readonly>
            <span>Speed:</span><input readonly>
            <span>Locked:</span><input readonly>
            <div id='items'>
                <span>Items:</span>
                <div id='box'></div>
            </div>
            <div id='code'>
                <span>Comandos:</span>
                <span>Durac.</span>
                <span>Tempo</span>
                <div id='box'></div>
            </div>
        </div>
    </div>`);

    var box = "";
    for (let i in glad.buffs){
        box += `<span>${i}</span><span>0.0</span><span>0.0</span>`;
    }
    $('#details #buffs #box').html(box);

    $('#details').hide().fadeIn().draggable({
        handle: "#title"
    });

    $('#details #minimize').click( function(){
        $('#details').animate({
            "top": $(window).height() - 33,
            "left": $(window).width() - 350
        });

    });

    if (Object.keys(potionList).length == 0){
        potionList.ready = post("back_slots.php", {
            action: "ITEMS"
        }).then( data => {
            let potions = data.potions
            // console.log(potions)
            for (i in potions){
                let p = potions[i]
                potionList[p.id] = i
            }
            // console.log(potionList)
        })
    }

}

async function updateDetailedWindow(){
    var index = $('.ui-glad').index($('.follow'));
    var glad = json.glads[index];

    var info = [
        glad.name,
        glad.lvl,
        `${glad.xp} / ${glad.tonext}`,
        glad.x.toFixed(1),
        `${glad.hp.toFixed(1)} / ${glad.maxhp}`,
        glad.y.toFixed(1),
        `${glad.ap.toFixed(1)} / ${glad.maxap}`,
        glad.STR,
        glad.head.toFixed(1),
        glad.AGI,
        getActionName(glad.action),
        glad.INT,
        glad.as.toFixed(1),
        glad.cs.toFixed(1),
        glad.spd.toFixed(1),
        glad.lockedfor.toFixed(1)
    ];

    $('#details input').each( function(i){
        $(this).val(info[i]);
    });

    $('#details #head span').css({"transform": `rotate(${glad.head.toFixed(0)}deg)`});

    var c = 0;
    for (let i in glad.buffs){
        if (parseFloat(glad.buffs[i].timeleft) > 0 && !$('#details #buffs #box span').eq(c*3).hasClass('active')){
            for (let j=0 ; j<3 ; j++)
                $('#details #buffs #box span').eq(j + c*3).addClass('active');
        }
        else if (parseFloat(glad.buffs[i].timeleft) == 0 && $('#details #buffs #box span').eq(c*3).hasClass('active')){
            for (let j=0 ; j<3 ; j++)
                $('#details #buffs #box span').eq(j + c*3).removeClass('active');
        }

        $('#details #buffs #box span').eq(1 + c*3).html(glad.buffs[i].value.toFixed(1));
        $('#details #buffs #box span').eq(2 + c*3).html(glad.buffs[i].timeleft.toFixed(1));

        c++;
    }

    if (glad.code){
        if (glad.code != $('#details #code #box .name').last().text()){
            $('#details #code #box').append(`<div class='row'>
                <div class='name'>${glad.code}</div>
                <div class='duration'>0.1</div>
                <div class='time'>${json.simtime.toFixed(1)}</div>
            </div>`)

            if ($('#details #code #box .row').length > 5){
                $('#details #code #box .row').first().remove()
            }
        }
        else{
            let time = parseFloat($('#details #code #box .row').last().find('.duration').text())
            $('#details #code #box .row').last().find('.duration').text((time + 0.1).toFixed(1))
        }
    }

    let allPotions = '😎'
    await potionList.ready
    for (let i in glad.items){
        let item = $('#details #items #box .row').eq(i).find('span')
        
        if (item.length){
            let text = item.text()
            if (text == '-' || glad.items[i] == 0){
                item.addClass('used')
            }
            else {
                item.removeClass('used')
            }
        }
        else{
            let potion
            if (glad.items[i] > 0){
                potion = potionList[glad.items[i]]
            }
            else if (glad.items[i] == 0){
                potion = '-'
            }
            else if (glad.items[i] == -1){
                potion = allPotions
            }
            $('#details #items #box').append(`<div class='row'><span>${potion}</span></div>`)
        }
    }
}

function getActionName(action){
    for (let item of actionlist){
        if (item.value == action)
            return item.name;
    }
    return false;
}