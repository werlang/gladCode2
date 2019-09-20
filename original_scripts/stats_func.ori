function save_stats(hash){
	var json;
	$.post("back_log.php",{
		action: "GET",
		loghash: hash,
	}).done( function(data){
		//console.log(data);
		json = JSON.parse(data);

		var steps = [];
		$.extend(steps, json); //hard copy json to steps
		
		var abilities = {
			'fireball': {'id': 0, 'uses': 0},
			'teleport': {'id': 1, 'uses': 0},
			'charge': {'id': 2, 'uses': 0},
			'block': {'id': 3, 'uses': 0},
			'assassinate': {'id': 4, 'uses': 0},
			'ambush': {'id': 5, 'uses': 0},
			'melee': {'id': 6, 'uses': 0},
			'ranged': {'id': 7, 'uses': 0},
			'win': {}
		};
		
		var glads = [];
		for (var g in steps[0].glads)
			glads[g] = {"charge": false};
	
		//build a complete log from marging previous steps
		var tempjson = {};
		for (var i in steps){
			tempjson.projectiles = {};
			$.extend( true, tempjson, steps[i] ); //merge json objects
			steps[i] = JSON.parse(JSON.stringify(tempjson));
		}
	
		var wonhab = [];
		var gladwon;
		var step = steps[steps.length - 1];
		for (var g in step.glads){
			if (step.glads[g].hp > 0)
				gladwon = g;
		}
		//console.log(gladwon);
	
		for (var s in steps){
			for (var a in abilities){
				for (var g in steps[s].glads){
					if (steps[s].glads[g].action == abilities[a].id){
						if (a == 'charge')
							glads[g].charge = true;
						else if (glads[g].charge === true){
							glads[g].charge = false;
							abilities.charge.uses++;
						}
						else
							abilities[a].uses++;
					}
				}
				if (gladwon && steps[s].glads[gladwon].action == abilities[a].id){
					var ex = false;
					for (var k in wonhab){
						if (wonhab[k] == a)
							ex = true;
					}
					if (!ex)
						wonhab.push(a);
				}
			}
		}
		//console.log(steps);
		//console.log(wonhab);
		//console.log(abilities);
		
		$.post( "back_stats.php", {
			action: 'SAVE',
			fireball: abilities.fireball.uses,
			teleport: abilities.teleport.uses,
			charge: abilities.charge.uses,
			block: abilities.block.uses,
			assassinate: abilities.assassinate.uses,
			ambush: abilities.ambush.uses,
			melee: abilities.melee.uses,
			ranged: abilities.ranged.uses,
			win: JSON.stringify(wonhab)
		})
		.done(function( data ) {
		});
	
	});
	
}

function load_stats(startDate,endDate){
	if (!startDate)
		startDate = '';
	if (!endDate)
		endDate = '';
	var ajax = $.post( "back_stats.php", {
		action: 'load',
		start: startDate,
		end: endDate
	})
	.done(function( data ) {
		//this function returns ajax deferred
		//get data in $.when(load_stats()).then( function(data) { //cod });
	});	
	return ajax;
}