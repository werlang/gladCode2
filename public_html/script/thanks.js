$(document).ready( function(){
    $('#footer-wrapper').addClass('white');
    $('#header').addClass('big');

    $.post("back_thanks.php",{
        action: "CHECK"
    }).done( function(data){
        if (data != "NOT SET"){
            var url = data;
            $('#url').remove();
        
            var countdown = 10;
            var countInt = setInterval(function(){
                countdown--;
                if (countdown == 0){
                    $.post("back_thanks.php",{
                        action: "UNSET"
                    }).done( function(data){
                        //console.log(data);
                    });
                    clearInterval(countInt);
                    window.location.href = url;
                }
                $('h3 span').html(countdown);
            }, 1000);
        }
        else
            window.location.href = 'index.php';
    });
});
