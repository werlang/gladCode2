var $jscomp=$jscomp||{};$jscomp.scope={};$jscomp.findInternal=function(a,b,e){a instanceof String&&(a=String(a));for(var c=a.length,d=0;d<c;d++){var f=a[d];if(b.call(e,f,d,a))return{i:d,v:f}}return{i:-1,v:void 0}};$jscomp.ASSUME_ES5=!1;$jscomp.ASSUME_NO_NATIVE_MAP=!1;$jscomp.ASSUME_NO_NATIVE_SET=!1;$jscomp.SIMPLE_FROUND_POLYFILL=!1;
$jscomp.defineProperty=$jscomp.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,e){a!=Array.prototype&&a!=Object.prototype&&(a[b]=e.value)};$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);
$jscomp.polyfill=function(a,b,e,c){if(b){e=$jscomp.global;a=a.split(".");for(c=0;c<a.length-1;c++){var d=a[c];d in e||(e[d]={});e=e[d]}a=a[a.length-1];c=e[a];b=b(c);b!=c&&null!=b&&$jscomp.defineProperty(e,a,{configurable:!0,writable:!0,value:b})}};$jscomp.polyfill("Array.prototype.find",function(a){return a?a:function(a,e){return $jscomp.findInternal(this,a,e).v}},"es6","es3");
var code,startloop=!1,json={},hashes=[],newindex=[],steps=[],timestep=0,pausesim=!0,stepIncrement=1,istep,tournHash,loghash,fullscreen=!1,sfxVolume=1,timeSlider=0;
$(document).ready(function(){function a(){!music&&0<parseFloat($("#sound").data("music"))||music&&0<music.volume?$("#sound").find("img").prop("src","icon/music.png"):0<sfxVolume?$("#sound").find("img").prop("src","icon/music-off.png"):$("#sound").find("img").prop("src","icon/mute.png")}$("#loadbar #status").html("P\u00e1gina carregada");$("#footer-wrapper").addClass("white");$("#tourn").html().length&&(tournHash=$("#tourn").html());$("#tourn").remove();if($("#log").html().length){var b=function(){$.ajax({xhr:function(){var a=
new window.XMLHttpRequest;a.upload.addEventListener("progress",function(a){},!1);a.addEventListener("progress",function(a){a.lengthComputable&&(a=(100*a.loaded/a.total).toFixed(0),$("#loadbar #status").html("Fazendo download do log de batalha"),$("#loadbar #second .bar").width(a+"%"),$("#loadbar #main .bar").width(a/4+"%"))},!1);return a},type:"POST",url:"back_log.php",data:{action:"GET",loghash:loghash},success:function(a){if("NULL"==a)window.location.href=tournHash?"https://gladcode.tk/tournment.php?t="+
tournHash:"https://gladcode.tk";else{try{e=JSON.parse(a)}catch(g){var c=g;console.log(g)}if(c)b();else{a=function(a,c,b){fetchSpritesheet(b).then(function(b){c[a]=b;b=(100*c.length/f.length).toFixed(0);$("#loadbar #status").html("Montando gladiadores");$("#loadbar #second .bar").width(b+"%");$("#loadbar #main .bar").width(25+b/4+"%")})};var f=e[0].glads;stab=[];gender=[];for(var d in f){c=f[d].skin;a(d,hashes,c);c=JSON.parse(c);stab[d]="0";gender[d]="male";for(var k in c){var h=getImage(c[k]);"thrust"==
h.move&&(stab[d]="1");"female"==h.id&&(gender[d]="female")}}var l=setInterval(function(){hashes.length==f.length&&(clearInterval(l),startBattle(e))},10)}}}})},e;32<$("#log").html().length?showMessage("Erro na URL"):(loghash=$("#log").html(),b(),$.post("back_play.php",{action:"GET_PREF"}).done(function(b){b=JSON.parse(b);showbars=!0===b.show_bars||"true"==b.show_bars;showFPS=!0===b.show_fps||"true"==b.show_fps;$("#sound").data("music",parseFloat(b.music_volume));sfxVolume=parseFloat(b.sfx_volume);
$("#sound").data("sfx",parseFloat(b.sfx_volume));a();!0===b.show_frames||"true"==b.show_frames?($("#ui-container").fadeIn(),showFrames=!0):($("#ui-container").fadeOut(),showFrames=!1)}))}$("#log").remove();var c=4,d=[-10,-5,-2,-1,1,2,5,10];$("#back-step").click(function(){pausesim?(0<stepIncrement?stepIncrement=-1:0<timestep&&(stepIncrement*=1.1),timestep+=Math.round(stepIncrement),$("#fowd-step .speed").html(""),$("#back-step .speed").html(Math.round(stepIncrement))):(0<c&&c--,stepIncrement=d[c],
3>=c?($("#fowd-step .speed").html(""),$("#back-step .speed").html(d[c]+"x")):($("#back-step .speed").html(""),$("#fowd-step .speed").html(d[c]+"x")));clearInterval(istep);start_timer(steps)});$("#fowd-step").click(function(){pausesim?(0>stepIncrement?stepIncrement=1:timestep<$("#time").slider("option","max")-1&&(stepIncrement*=1.1),timestep+=Math.round(stepIncrement),$("#back-step .speed").html(""),$("#fowd-step .speed").html("+"+Math.round(stepIncrement))):(c<d.length-1&&c++,stepIncrement=d[c],3>=
c?($("#fowd-step .speed").html(""),$("#back-step .speed").html(d[c]+"x")):($("#back-step .speed").html(""),$("#fowd-step .speed").html(d[c]+"x")));clearInterval(istep);start_timer(steps)});$("#pause").click(function(){stepIncrement=1;c=4;pausesim?(pausesim=!1,$("#pause #img-play").hide(),$("#pause #img-pause").show(),$("#back-step .speed").html("-1x"),$("#fowd-step .speed").html("1x")):(pausesim=!0,$("#pause #img-pause").hide(),$("#pause #img-play").show(),stepIncrement=1,c=4,$("#back-step .speed").html("-1"),
$("#fowd-step .speed").html("+1"));clearInterval(istep);start_timer(steps)});$("#fullscreen").click(function(){setFullScreen(!isFullScreen())});$("#help").click(function(){$("body").append("<div id='fog'><div id='help-window' class='blue-window'><div id='content'><h2>Controle da c\u00e2mera</h2><div class='table'><div class='row'><div class='cell'><img src='icon/mouse_drag.png'>/<img src='icon/arrows_keyboard.png'></div><div class='cell'>Mover a c\u00e2mera</div></div><div class='row'><div class='cell'><img src='icon/mouse_scroll.png'>/<img src='icon/plmin_keyboard.png'></div><div class='cell'>Zoom da arena</div></div><div class='row'><div class='cell'><img src='icon/select_glad.png'>/<img src='icon/numbers_keyboard.png'></div><div class='cell'>Acompanhar um gladiador</div></div></div><h2>Teclas de atalho</h2><div class='table'><div class='row'><div class='cell'><span class='key'>M</span></div><div class='cell'>Mostrar/ocultar molduras</div></div><div class='row'><div class='cell'><span class='key'>B</span></div><div class='cell'>Mostrar/ocultar barras de hp e ap</div></div><div class='row'><div class='cell'><span class='key'>F</span></div><div class='cell'>Mostrar/ocultar taxa de atualiza\u00e7\u00e3o</div></div><div class='row'><div class='cell'><span class='key'>ESPA\u00c7O</span></div><div class='cell'>Parar/Continuar simula\u00e7\u00e3o</div></div><div class='row'><div class='cell'><span class='key'>A</span></div><div class='cell'>Retroceder simula\u00e7\u00e3o</div></div><div class='row'><div class='cell'><span class='key'>D</span></div><div class='cell'>Avan\u00e7ar simula\u00e7\u00e3o</div></div><div class='row'><div class='cell'><span class='key'>S</span></div><div class='cell'>Liga/desliga M\u00fasica e efeitos sonoros</div></div></div></div><div id='button-container'><button class='button' id='ok'>OK</button></div></div></div>");
$("#help-window #ok").click(function(){$("#fog").remove()})});$("#settings").click(function(){$("body").append("<div id='fog'><div id='settings-window' class='blue-window'><h2>Prefer\u00eancias</h2><div class='check-container'><div id='pref-bars'><label><input type='checkbox' class='checkslider'>Mostrar barras de hp e ap</label></div><div id='pref-frames'><label><input type='checkbox' class='checkslider'>Mostrar molduras dos gladiadores</label></div><div id='pref-fps'><label><input type='checkbox' class='checkslider'>Mostrar taxa de atualiza\u00e7\u00e3o da tela (FPS)</label></div><div id='volume-container'><h3>Volume do \u00e1udio</h3><p>Efeitos sonoros</p><div id='sfx-volume'></div><p>M\u00fasica</p><div id='music-volume'></div></div></div><div id='button-container'><button class='button' id='ok'>OK</button></div></div></div>");
var b=game.add.audio("lvlup");$("#sfx-volume").slider({range:"min",min:0,max:1,step:.01,create:function(a,b){$(this).slider("value",sfxVolume)},slide:function(c,d){sfxVolume=d.value;b.stop();b.play("",.5,sfxVolume);a()}});$("#music-volume").slider({range:"min",min:0,max:.1,value:.1,step:.001,create:function(a,b){$(this).slider("value",music.volume)},slide:function(b,c){music.volume=c.value;a()}});showbars&&$("#pref-bars input").prop("checked",!0);"flex"==$("#ui-container").css("display")&&$("#pref-frames input").prop("checked",
!0);showFPS&&$("#pref-fps input").prop("checked",!0);$(".checkslider").each(function(){create_checkbox($(this))});$("#settings-window #ok").click(function(){$.post("back_play.php",{action:"SET_PREF",show_bars:showbars,show_frames:$("#pref-frames input").prop("checked"),show_fps:showFPS,sfx_volume:sfxVolume,music_volume:music.volume});$("#fog").remove()});$("#pref-bars input").change(function(){showbars=$(this).prop("checked")?!0:!1});$("#pref-frames input").change(function(){$(this).prop("checked")?
$("#ui-container").fadeIn():$("#ui-container").fadeOut()});$("#pref-fps input").change(function(){showFPS=$(this).prop("checked")?!0:!1})});$("#sound").click(function(){0<music.volume?($(this).data("music",music.volume),music.volume=0):0<sfxVolume?($(this).data("sfx",sfxVolume),sfxVolume=0):(music.volume=$(this).data("music"),0==music.volume&&(music.volume=.1),sfxVolume=$(this).data("sfx"),0==sfxVolume&&(sfxVolume=1));a();$.post("back_play.php",{action:"SET_PREF",music_volume:music.volume,sfx_volume:sfxVolume})});
$("#time").slider({range:"min",min:0,max:0,value:timestep,create:function(a,b){$(this).append("<div class='ui-slider-time'></div>")},change:function(a,b){a=Math.floor(b.value/600);b=Math.floor(b.value/10)%60;10>b&&(b="0"+b);b=a+":"+b;$(this).find(".ui-slider-time").html(b);$(this).find(".ui-slider-time").css("left",$(this).find(".ui-slider-handle").css("left"))},slide:function(a,b){timestep=b.value}});$([window,document]).focusin(function(){}).focusout(function(){pausesim=!1;$("#pause").click()})});
function isFullScreen(){return document.fullscreenElement&&null!==document.fullscreenElement||document.webkitFullscreenElement&&null!==document.webkitFullscreenElement||document.mozFullScreenElement&&null!==document.mozFullScreenElement||document.msFullscreenElement&&null!==document.msFullscreenElement?!0:!1}
function setFullScreen(a){a?(a=$("body")[0],a.requestFullscreen?a.requestFullscreen():a.mozRequestFullScreen?a.mozRequestFullScreen():a.webkitRequestFullscreen?a.webkitRequestFullscreen():a.msRequestFullscreen&&a.msRequestFullscreen(),fullscreen=!0):(document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?document.webkitExitFullscreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.msExitFullscreen&&document.msExitFullscreen(),fullscreen=!1);setTimeout(function(){resize()},
100)}$(window).resize(function(){resize()});
function resize(){if($(window).width()>$(window).height()){var a=screenH/arenaD;var b=$(window).height();var e=Math.min($(window).width(),screenW*game.camera.scale.x);game.camera.scale.x=$(window).height()*a/screenH;game.camera.scale.y=$(window).height()*a/screenH;600>$(window).height()&&$(window).height()<$(window).width()&&showMessage("Em dispositivos m\u00f3veis, a visualiza\u00e7\u00e3o das lutas \u00e9 melhor no modo retrato").then(function(a){window.location.reload()})}else a=screenW/arenaD,
b=Math.min($(window).height(),screenH*game.camera.scale.y),e=$(window).width(),game.camera.scale.x=$(window).width()*a/screenW,game.camera.scale.y=$(window).width()*a/screenW,600>$(window).height()&&!isFullScreen()&&!fullscreen&&showDialog("Em dispositivos m\u00f3veis, a visualiza\u00e7\u00e3o das lutas \u00e9 melhor em tela cheia. Deseja trocar?",["N\u00e3o","SIM"]).then(function(a){"SIM"==a&&setFullScreen(!0);$("#fog").remove();fullscreen=!0});game.scale.setGameSize(e,b);game.camera.bounds.width=
screenW;game.camera.bounds.height=screenH;game.camera.y=(arenaY1+arenaD/2)*game.camera.scale.y-game.height/2;game.camera.x=(arenaX1+arenaD/2)*game.camera.scale.x-game.width/2}var show_final_score=!0;
function start_timer(a){istep=setInterval(function(){if(startloop){0>timestep&&(timestep=0);if(timestep>a.length-1){timestep=a.length-1;for(i in a[timestep].glads)if(0<parseFloat(a[timestep].glads[i].hp)&&!$(".ui-glad").eq(i).hasClass("dead")&&(!d||e<parseFloat(a[timestep].glads[i].hp))){var b=a[timestep].glads[i].name;var e=parseFloat(a[timestep].glads[i].hp);var c=a[timestep].glads[i].user;var d=i}show_final_score&&!$("#end-message").length&&(d||(b="Empate",c=""),$("body").append("<div id='fog'><div id='end-message'><div id='victory'>VIT\u00d3RIA</div><div id='image-container'><div id='image'></div><div id='name-team-container'><span id='name'>"+
b+"</span><span id='team'>"+c+"</span></div></div><div id='button-container'><button class='button' id='retornar' title='Retornar para a batalha'>OK</button><button class='button small' id='share' title='Compartilhar'><img src='icon/share.png'></button></div></div></div>"),$("#end-message #retornar").click(function(){show_final_score=!1;$("#fog").remove();tournHash&&(window.location.href="https://gladcode.tk/tournment.php?t="+tournHash)}),$("#end-message #share").click(function(){$("#end-message").hide();
var a="gladcode.tk/play/"+loghash,b="<a id='twitter' class='button' title='Compartilhar pelo Twitter' href='https://twitter.com/intent/tweet?text=Veja%20esta%20batalha:&url=https://"+a+"&hashtags=gladcode' target='_blank'><img src='icon/twitter.png'></a>",c="<a id='facebook' class='button' title='Compartilhar pelo Facebook' href='https://www.facebook.com/sharer/sharer.php?u="+a+"' target='_blank'><img src='icon/facebook.png'></a>",d="<a id='whatsapp' class='button' title='Compartilhar pelo Whatsapp' href='https://api.whatsapp.com/send?text=Veja esta batalha:%0a"+
a+"%0a%23gladcode' target='_blank'><img src='icon/whatsapp.png'></a>";$("#fog").append("<div id='url'><div id='link'><span id='title'>Compartilhar batalha</span><span id='site'>gladcode.tk/play/</span><span id='hash'>"+loghash+"</span></div><div id='social'><div id='getlink' class='button' title='Copiar link'><img src='icon/link.png'></div>"+b+c+d+"</div><button id='close' class='button'>OK</button></div>");$("#url #social #getlink").click(function(){copyToClipboard(a);$("#url #hash").html("Link copiado");
$("#url #hash").addClass("clicked");setTimeout(function(){$("#url #hash").removeClass("clicked");$("#url #hash").html(loghash)},500)});$("#url #close").click(function(){$("#url").remove();$("#end-message").show()})}),d&&$("#end-message #image").html(getSpriteThumb(hashes[newindex[d]],"walk","down")),$("#end-message").hide(),$("#end-message").fadeIn(1E3),music.pause(),victory.play("",0,music.volume/.1))}else show_final_score||($("#fog").remove(),show_final_score=!0,music.resume());phaser_update(a[timestep]);
pausesim||(timestep+=stepIncrement/Math.abs(stepIncrement))}},100/Math.abs(stepIncrement))}uiVars=[];
function create_ui(a){$("#ui-container").html("");for(var b={$jscomp$loop$prop$i$0$2:0};b.$jscomp$loop$prop$i$0$2<a;b={$jscomp$loop$prop$i$0$2:b.$jscomp$loop$prop$i$0$2},b.$jscomp$loop$prop$i$0$2++)$("#ui-container").append("<div class='ui-glad'></div>"),$(".ui-glad").last().load("ui_template.html",function(a){return function(){$(this).click(function(){$(this).hasClass("follow")||$(this).hasClass("dead")?(game.camera.unfollow(),$(".ui-glad").removeClass("follow")):(game.camera.follow(sprite[a.$jscomp$loop$prop$i$0$2]),
$(".ui-glad").removeClass("follow"),$(this).addClass("follow"))})}}(b)),uiVars.push({})}
function startBattle(a){json={};startloop=!1;$("#loadbar #status").html("Carregando render");load_phaser();create_ui(a[0].glads.length);$("#time").slider("option","max",a.length);for(b=0;b<a[0].glads.length;b++)a[0].glads[b].name=a[0].glads[b].name.replace(/#/g," "),a[0].glads[b].user=a[0].glads[b].user.replace(/#/g," "),newindex[b]=b;for(var b in a)json.projectiles={},$.extend(!0,json,a[b]),steps.push(JSON.parse(JSON.stringify(json)));startloop=!0;start_timer(steps)}
function copyToClipboard(a){$("body").append("<input type='text' id='icopy' value='"+a+"'>");$("#icopy").select();document.execCommand("copy");$("#icopy").remove()};
