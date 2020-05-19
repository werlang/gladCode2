function save_stats(hash){
    var json;
    $.post("back_log.php",{
        action: "GET",
        loghash: hash,
    }).done( function(data){
        // console.log(data);
        data = JSON.parse(data);

        var steps = [];
        $.extend(steps, JSON.parse(data.log)); //hard copy json to steps
        
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

        var fivesec = steps[steps.length - 51].glads; //5 seconds
        var laststep = steps[steps.length-1];

        //get who was alive in last 5 secs
        var alive = [];
        for (let i in fivesec){
            if (fivesec[i].hp > 0)
                alive.push(i);
        }

        //average lvl from those alive
        var avglvl = 0;
        var winnerlvl = laststep.glads[gladwon].lvl;
        for (let i in alive){
            avglvl += laststep.glads[alive[i]].lvl;
        }
        avglvl /= alive.length;

        //count how many glads have each attr as their higher
        var high = {STR: 0, AGI: 0, INT: 0};
        for (let i in laststep.glads){
            var STR = laststep.glads[i].STR;
            var AGI = laststep.glads[i].AGI;
            var INT = laststep.glads[i].INT;

            var attr;
            if (STR >= AGI && STR >= INT)
                attr = 'STR';
            if (AGI >= STR && AGI >= INT)
                attr = 'AGI';
            if (INT >= STR && INT >= AGI)
                attr = 'INT';

            high[attr]++;
            //put highest attr in the winners abilities
            if (i == gladwon)
                wonhab.push(attr);
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
            win: JSON.stringify(wonhab),
            avglvl: avglvl,
            winnerlvl: winnerlvl,
            duration: laststep.simtime,
            highstr: high.STR,
            highagi: high.AGI,
            highint: high.INT,
            loghash: hash
        })
        .done(function( data ) {
        });
    
    });
    
}

function load_stats(args){
    var date = '';
    var mmr = '';
    if (args && args.date)
        date = args.date;
    if (args && args.mmr)
        mmr = args.mmr;
    var ajax = $.post( "back_stats.php", {
        action: 'load',
        start: date.start,
        end: date.end,
        smmr: mmr.start,
        emmr: mmr.end
    })
    .done(function( data ) {
        //console.log(data);
        //this function returns ajax deferred
        //get data in $.when(load_stats()).then( function(data) { //cod });
    });	
    return ajax;
}