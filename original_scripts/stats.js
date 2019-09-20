$(document).ready( function() {
	menu_loaded().then( function(data){
		var loc = window.location.href.split("/");
		loc = loc[loc.length - 1];
		$('#side-menu #'+loc).addClass('here');
	});    
	$('#learn').addClass('here');

	//$('#footer-wrapper').addClass('white');

	$( "#date-str, #date-end" ).datepicker({
		showAnim: "slideDown",
		dateFormat: "dd/mm/yy",
		dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
		dayNamesMin: ['D','S','T','Q','Q','S','S','D'],
		dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
		monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
		monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
		nextText: 'Próximo',
		prevText: 'Anterior'
    });
	
	$( "#date-str, #date-end" ).change( function() {
		$.when(load_stats($("#date-str").val(), $("#date-end").val())).then( function(data) {
			load_table(data);
		});
	});
	
	$.when(load_stats()).then( function(data){
		load_table(data);
	});
});

function load_table(data){
	data = JSON.parse(data);
	//console.log(data);
	$('.table tbody').html("");
	if (data.average.length != 0){
		var table = [], row = 0, col = 1;
		var first = true;
		for (var i in data){
			if (i != "nbattles"){
				if (first){
					for (var a in data[i]){
						table[row] = [];
						table[row][0] = a;
						row++;
					}
					first = false;
				}
				row = 0;
				for (var a in data[i]){
					table[row][col] = data[i][a];
					row++;
				}
				col++;
			}
		}
		for (var i in table){
			$('.table tbody').append("<tr><td>"+ table[i][0] +"</td><td>"+ (table[i][2]).toFixed(1) +"%</td><td>"+ (table[i][1]).toFixed(1) +"</td><td>"+ (table[i][3]).toFixed(1) +"%</td></tr>");
		}
		$('#nbattles span').html(data.nbattles);
		$('#nbattles').show();
	}
	else{
		$('.table tbody').html("<tr><td colspan=4>Nenhuma batalha encontrada</td></tr>");
		$('#nbattles').hide();
	}
}
