var $jscomp=$jscomp||{};$jscomp.scope={};$jscomp.findInternal=function(a,b,c){a instanceof String&&(a=String(a));for(var d=a.length,e=0;e<d;e++){var f=a[e];if(b.call(c,f,e,a))return{i:e,v:f}}return{i:-1,v:void 0}};$jscomp.ASSUME_ES5=!1;$jscomp.ASSUME_NO_NATIVE_MAP=!1;$jscomp.ASSUME_NO_NATIVE_SET=!1;$jscomp.SIMPLE_FROUND_POLYFILL=!1;
$jscomp.defineProperty=$jscomp.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)};$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);
$jscomp.polyfill=function(a,b,c,d){if(b){c=$jscomp.global;a=a.split(".");for(d=0;d<a.length-1;d++){var e=a[d];e in c||(c[e]={});c=c[e]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&$jscomp.defineProperty(c,a,{configurable:!0,writable:!0,value:b})}};$jscomp.polyfill("Array.prototype.find",function(a){return a?a:function(a,c){return $jscomp.findInternal(this,a,c).v}},"es6","es3");
$(document).ready(function(){function a(a){$(".item-container").hide();0==$(".item-container.open").length&&(a.find(".item-container").slideDown(),a.find(".item-container").addClass("open"),a.find(".item-container").css({left:a.position().left,top:a.position().top+a.height()}))}function b(){$(".item-container").hide();$(".item-container").removeClass("open")}$("#menu-button").click(function(){$("body").append("<div id='fog'><div id='menu'></div></div>");$("#fog #menu").html("<a href='index.php'><img src='icon/logo.png'></a>"+
$("#h-items").html());$("#fog").click(function(){$("#fog #menu").toggle("slide",300,function(){$("#fog").remove()})});$("#fog #menu").click(function(a){a.stopPropagation()});$("#fog #login").click(function(){googleLogin().then(function(a){window.location.href="profile"})});$("#fog #menu").toggle("slide",300)});$(".drop-menu").hover(function(){a($(this))});$(".drop-menu").mouseleave(function(){b()});$(".drop-menu").click(function(){b();a($(this))});initGoogleLogin();$(".mobile #login, .desktop #login").click(function(){googleLogin().then(function(a){window.location.href=
"profile"})});$.post("back_login.php",{action:"GET"}).done(function(a){"NULL"==a?$(".mobile #profile, .desktop #profile").hide():$(".mobile #login, .desktop #login").hide()});$("#footer #ethereum").click(function(){showWallet("eth")});$("#footer #bitcoin").click(function(){showWallet("btc")});$("#paypal, #pagseguro").click(function(){$.post("back_thanks.php",{action:"SET",url:window.location.pathname}).done(function(a){})})});
function showWallet(a){var b={btc:{name:"Bitcoin",wallet:"351JhGwhqGckt6P4F8cSsFCgsHKHCU8tjD",icon:"icon/bitcoin.png",qrcode:"image/qr_btc.png"},eth:{name:"Ethereum",wallet:"0x50E9BBf49C6329FC97493d012fEBB4D04d5de37e",icon:"icon/ethereum.png",qrcode:"image/qr_eth.png"}};if(0==$("#crypto-box").length){var c=b[a].wallet,d={btc:[4,4,4,5,4,4,4,5],eth:[4,4,4,4,5,4,4,4,4,5]},e="",f=0,g;for(g in d[a])e+=c.substring(f,f+d[a][g]),f+=d[a][g],g<d[a].length-1&&(e+=" ");a="<div id='fog'><div id='crypto-box' class='size-"+
d[a].length+"'><div id='close'>X</div><div id='title'>Carteira "+b[a].name+":</div><div id='qrcode'>"+("<img src='"+b[a].qrcode+"'>")+"</div><div id='wallet' title='Copiar para \u00e1rea de transfer\u00eancia'><img src='"+b[a].icon+"'><span>"+e+"</span></div></div></div>";$("body").append(a);$("#crypto-box").hide().fadeIn();$("#crypto-box #close").click(function(){$("#fog").remove()});$("#crypto-box #wallet").click(function(){var a=$("#crypto-box #wallet span");copyToClipboard(c);a.parent().addClass("copied");
a.html("Copiado").fadeOut(1200,function(){a.parent().removeClass("copied");a.html(e).show()})})}}function copyToClipboard(a){$("body").append("<input type='text' id='icopy' value='"+a+"'>");$("#icopy").select();document.execCommand("copy");$("#icopy").remove()};
