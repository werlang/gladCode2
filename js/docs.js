$(document).ready( function(){
    menu_loaded().then( function(data){
        var loc = window.location.href.split("/");
        loc = loc[loc.length - 1];
        $('#side-menu #'+loc).addClass('here');
        $('#side-menu #'+loc).click();
    }); 
    
    $('#learn').addClass('here');
});