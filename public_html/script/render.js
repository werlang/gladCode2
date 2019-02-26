function update_battle(json){
	//clear canvas
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, canvas_size + sidesize, canvas_size);

	//poison
	if (json.poison || json.poison === 0){
		ctx.fillStyle = "green";
		ctx.globalAlpha = 0.1;
		ctx.fillRect(0, 0, canvas_size, canvas_size);

		ctx.globalAlpha = 1;
		ctx.beginPath();
		ctx.arc(canvas_size/2, canvas_size/2, json.poison * canvas_rate, 0, 2 * Math.PI, false);
		ctx.fillStyle = 'white';
		ctx.fill();
	}

	//draw borders
	ctx.strokeStyle = "black";
	ctx.strokeRect(0, 0, canvas_size, canvas_size);
	
	var nglad = json.glads.length;
	var bodyrad = 0.5 * canvas_rate;

	var i;
	for (i=0 ; i<nglad ; i++){
		var x = parseFloat(json.glads[i].x) * canvas_rate;
		var y = parseFloat(json.glads[i].y) * canvas_rate;
		var he = parseFloat(json.glads[i].head);
		var hp = parseFloat(json.glads[i].hp);
		var ap = parseFloat(json.glads[i].ap);
		var name = json.glads[i].name;
		var xp = parseInt(json.glads[i].xp);
		var lvl = parseInt(json.glads[i].lvl);
		var STR = parseInt(json.glads[i].STR);
		var AGI = parseInt(json.glads[i].AGI);
		var INT = parseInt(json.glads[i].INT);
		
		//glad body
		ctx.beginPath();
		ctx.arc(x, y, bodyrad, 0, 2 * Math.PI, false);
		ctx.fillStyle = 'white';
		ctx.fill();
		ctx.strokeStyle = 'blue';
		ctx.stroke();

		//glad head
		ctx.beginPath();
		ctx.arc(x + bodyrad * Math.sin(he * (Math.PI) / 180), y + bodyrad * -Math.cos(he * (Math.PI) / 180), bodyrad/3, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.stroke();

		//side gray rectangles
		if (i%2 == 0){
			ctx.fillStyle = "gray";
			ctx.globalAlpha = 0.1;
			ctx.fillRect(canvas_size + 30 + i*40, 20, 35, 106);
			ctx.globalAlpha = 1;
		}

		//glad text
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'normal 7pt arial';
		ctx.fillStyle = 'red';
		ctx.fillText(i, x, y);
		
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText(name, canvas_size + 35 + i*40, 12*(i%2) + 20);
		ctx.fillText(i, canvas_size + 35 + i*40, 44);
		ctx.fillText(hp.toFixed(1), canvas_size + 35 + i*40, 56);
		ctx.fillText(ap.toFixed(1), canvas_size + 35 + i*40, 68);
		ctx.fillText(lvl, canvas_size + 35 + i*40, 80);
		ctx.fillText(xp + "%", canvas_size + 35 + i*40, 92);
		ctx.fillText(STR, canvas_size + 35 + i*40, 104);
		ctx.fillText(AGI, canvas_size + 35 + i*40, 116);
		ctx.fillText(INT, canvas_size + 35 + i*40, 128);
	}
	//draw arc from melee hit
	for (i=0 ; i<nglad ; i++){
		
		var action = json.glads[i].action;

		if (action == 6){ //melee attack
			var x = parseFloat(json.glads[i].x) * canvas_rate;
			var y = parseFloat(json.glads[i].y) * canvas_rate;
			var he = parseFloat(json.glads[i].head);
			ctx.beginPath();
			he = (he/360 * 2*Math.PI) - Math.PI/2;
			ctx.arc(x, y, bodyrad * 2, he-Math.PI/2, he+Math.PI/2, false);
			ctx.strokeStyle = 'red';
			ctx.stroke();
		}
	}
	//draw projectiles
	for (i=0 ; i<json.projectiles.length ; i++){
		var x = parseFloat(json.projectiles[i].x) * canvas_rate;
		var y = parseFloat(json.projectiles[i].y) * canvas_rate;
		var head = parseFloat(json.projectiles[i].head);
		var hip = 0.5 * canvas_rate;
		var x0 = x - Math.cos((head-90)/180*Math.PI)*hip;
		var y0 = y - Math.sin((head-90)/180*Math.PI)*hip;
		ctx.beginPath();
		ctx.moveTo(x0,y0);
		ctx.lineTo(x,y);
		ctx.strokeStyle = 'red';
		ctx.stroke();
	}
	
	//text status 
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText("TIME: "+json.simtime.toFixed(1), canvas_size + 5, 5);
	ctx.fillText("HP", canvas_size + 5, 56);
	ctx.fillText("AP", canvas_size + 5, 68);
	ctx.fillText("LVL", canvas_size + 5, 80);
	ctx.fillText("XP", canvas_size + 5, 92);
	ctx.fillText("STR", canvas_size + 5, 104);
	ctx.fillText("AGI", canvas_size + 5, 116);
	ctx.fillText("INT", canvas_size + 5, 128);
}

var canvas_size, canvas_rate, sidesize;
var canvas, ctx;
var istep = false;

$(document).ready( function(){
	//Canvas stuff
	canvas = $("#canvas")[0];
	ctx = canvas.getContext("2d");
	canvas_size = parseInt($("#canvas").attr('height'));
	sidesize = parseInt($("#canvas").attr('width')) - canvas_size;
	canvas_rate = canvas_size / 25;
	
	restartCanvas();
	//var img = new Image();
	//img.src = "icon/logo.png";
});

function restartCanvas(){
	$('canvas').show();
	$('#terminal').hide();

	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, canvas_size + sidesize, canvas_size);

	var img = $('#header #logo img')[0];
	var rate = img.width / img.height;
	var w = canvas_size + sidesize - 50;
	var h = w/rate;
	ctx.drawImage(img, 25, canvas_size/2 - h/2, w, h);
}