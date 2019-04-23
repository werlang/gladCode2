$(document).ready( function(){
    $('#side-menu').load("docs-menu.html", function(){
		var icon = "<i class='material-icons'>arrow_forward_ios</i>";
		$('#side-menu li').each( function(){
			if ($(this).next('ul').length != 0)
				$(this).prepend(icon);
		});
		
        $('#side-menu li').hide();
        $('#side-menu li i').removeClass('open');
        $('#side-menu > ul > li').show();
        
        $('#side-menu #search input').on('input', function(){
            $('#side-menu li').hide();
            var text = $(this).val();
            if (text.length <= 1){
                $('#side-menu > ul > li').show();
            }
            else{
                var pattern = new RegExp("[\\w]*"+ text +"[\\w]*","ig");
                $('#side-menu li').each(function(){
                    if ($(this).text().match(pattern)){
                        $(this).show();
                        $(this).parent().prev('li').show().parent().prev('li').show();
                    }
                });
                $('#side-menu li').each(function(){
					if ($(this).css('display') != 'none')
						$(this).children('i').addClass('open');
					else
						$(this).children('i').removeClass('open');
				});
            }
        });

        $('#side-menu a').click( function(e){
            e.preventDefault();
            var list = $(this).parent().next('ul');
            if (list.children().css('display') != 'none'){
                list.find('li').slideUp();
				$(this).prev('i').removeClass('open');
			}
            else{
                list.children('li').slideDown();
				$(this).prev('i').addClass('open');
			}
        });
    });
});