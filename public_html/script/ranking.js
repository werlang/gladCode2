$(document).ready( function(){
	$.post("back_rank.php",{})
	.done( function(data){
		data = JSON.parse(data).glads;
		for (var i in data){
			var pos = parseInt(i)+1;
			$('.table tbody').append("<tr><td>"+ pos +"º</td><td>"+ data[i].glad +"</td><td>"+ data[i].user +"</td><td>"+ parseInt(data[i].mmr) +"</td></tr>");
		}
	});
});