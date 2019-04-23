$(document).ready( function(){
    $('#side-menu').load("docs-menu.html", function(){
        $('#side-menu li').hide();
        $('#side-menu > ul > li').show();
        
        $('#side-menu #search input').on('input', function(){
            $('#side-menu li').hide();
            var text = $(this).val();
            if (text.length <= 1){
                $('#side-menu > ul > li').show();
            }
            else{
                var pattern = new RegExp("[\\w]*"+ text +"[\\w]*","ig");
                $.each($('#side-menu li'), function(index,item){
                    if ($(item).text().match(pattern)){
                        $(item).show();
                        $(item).parent().prev('li').show().parent().prev('li').show();
                    }
                });
            }
        });

        $('#side-menu a').click( function(e){
            e.preventDefault();
            var list = $(this).parent().next('ul');
            if (list.children().css('display') != 'none')
                list.find('li').hide();
            else
                list.children('li').show();
        });
    });
});