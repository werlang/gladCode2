var $jscomp=$jscomp||{};$jscomp.scope={};$jscomp.findInternal=function(a,b,c){a instanceof String&&(a=String(a));for(var d=a.length,e=0;e<d;e++){var f=a[e];if(b.call(c,f,e,a))return{i:e,v:f}}return{i:-1,v:void 0}};$jscomp.ASSUME_ES5=!1;$jscomp.ASSUME_NO_NATIVE_MAP=!1;$jscomp.ASSUME_NO_NATIVE_SET=!1;$jscomp.SIMPLE_FROUND_POLYFILL=!1;
$jscomp.defineProperty=$jscomp.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)};$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);
$jscomp.polyfill=function(a,b,c,d){if(b){c=$jscomp.global;a=a.split(".");for(d=0;d<a.length-1;d++){var e=a[d];e in c||(c[e]={});c=c[e]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&$jscomp.defineProperty(c,a,{configurable:!0,writable:!0,value:b})}};$jscomp.polyfill("Array.prototype.find",function(a){return a?a:function(a,c){return $jscomp.findInternal(this,a,c).v}},"es6","es3");
$(document).ready(function(){$("#header #search").addClass("visible");$("#header #search").click(function(){$(this).hasClass("visible")&&($("#side-menu").addClass("mobile"),$("#side-menu").hide().show("slide",{direction:"right"},300),$("#side-menu input").focus(),$("#side-menu a").click(function(){$("#side-menu").fadeOut(function(){$("#side-menu").removeClass("mobile")})}))});$("#side-menu").load("side-menu.html",function(){$("#side-menu li").each(function(){0!=$(this).next("ul").length&&$(this).prepend("<i class='material-icons'>arrow_forward_ios</i>")});
$("#side-menu li").removeClass("visible");$("#side-menu li i").removeClass("open");$("#side-menu > ul > li").addClass("visible");$("#side-menu #search input").on("input",function(){$("#side-menu li").removeClass("visible");$("#side-menu li i").removeClass("open");var a=$(this).val();if(1>=a.length)$("#side-menu > ul > li").addClass("visible");else{var b=new RegExp("[\\w]*"+a+"[\\w]*","ig");$("#side-menu li").each(function(){$(this).text().match(b)&&($(this).addClass("visible"),$(this).parent().prev("li").addClass("visible").parent().prev("li").addClass("visible"))});
$("#side-menu li").each(function(){"none"!=$(this).css("display")&&$(this).children("i").addClass("open")})}});$("#side-menu li").click(function(a){a=$(this).next("ul");"none"!=a.children().css("display")?(a.find("li").removeClass("visible"),a.find("li i").removeClass("open"),$(this).children("i").removeClass("open")):(a.children("li").addClass("visible"),$(this).children("i").addClass("open"))});menuLoadFlag=!0})});
function scrollTo(a,b){a&&(b||(b=0),$([document.documentElement,document.body]).animate({scrollTop:a.offset().top+b},1E3))}var menuLoadFlag=!1;function menu_loaded(){var a=$.Deferred(),b=setInterval(function(){if(menuLoadFlag)return clearInterval(b),a.resolve(!0)},10);return a.promise()}
$(document).scroll(function(){var a,b;$("#side-menu li a").each(function(){var c=window.location.href.split("/");c=c[c.length-1].split("#")[0];var d=$(this).attr("href").split("#"),e=d[1];d=d[0];d==c&&e&&$("#"+e).length&&(c=Math.abs($(document).scrollTop()-$("#"+e).offset().top),!a||c<a)&&(a=c,b=$(this).parent())});b&&(b.siblings("li.here").removeClass("here"),b.addClass("here"),b.children("i").hasClass("open")||b.click(),$(b.siblings("li").find("i.open").click()))});
