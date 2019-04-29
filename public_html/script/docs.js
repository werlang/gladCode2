$(document).ready( function(){
    menu_loaded().then( function(data){
        $('#side-menu #docs').addClass('here');
        $('#side-menu #docs').click();
    });

    $(document).scroll( function(){
        var mindist, winner;
        $('#side-menu li a').each( function(){
            var href = $(this).attr('href').split("#");
            var hash = href[1];
            href = href[0];
            if (href == 'docs' && hash && $('#'+ hash).length){
                var dist = Math.abs($(document).scrollTop() - $('#'+ hash).offset().top);
                if (!mindist || dist < mindist){
                    mindist = dist;
                    winner = $(this).parent();
                }
            }
        });
        winner.siblings('li.here').removeClass('here');
        winner.addClass('here');

        if (!winner.children('i').hasClass('open'))
            winner.click();
        $(winner.siblings('li').find('i.open').click());
});
    
});