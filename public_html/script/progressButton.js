class progressButton {
	constructor(obj, text){
		this.oldhtml = obj.html();

		obj.html("<div id='bar'></div>");
		obj.find('#bar').css({'background-color':'#00638d','width':'0px','height':'100%','border-radius':'3px'});
		obj.prop('disabled','true');
		obj.css('padding','0');
		obj.append("<div id='oldcontent'></div>");
		$('#oldcontent').css({'margin':obj.css('margin'),'display':'flex','align-items':'center','justify-content':'center','position':'absolute','top':obj.position().top,'left':obj.position().left,'width':obj.width(),'height':obj.height()});
		
		this.bsize = 0;
		this.obj = obj;
		var self = this;
		var roul = 0, rcont = 0;
		
		this.progint = setInterval(function(){
			var w = obj.find('#bar').width();
			var maxtime = 20;
			var uni = obj.width() / (maxtime * 100);
			self.bsize += uni;
			obj.find('#bar').width(self.bsize.toFixed(0));
			obj.find('#oldcontent').html(text[roul]);
			rcont++;
			if (rcont % 200 == 0)
				roul = (roul + 1) % text.length;
			if (obj.find('#bar').width() >= obj.width()){
				self.kill();
				createTerminal("ERRO DE CONEXÃO","Falha ao obter resposta do servidor. Verifique sua conexão com a internet.");	
				if (ajaxcall)
					ajaxcall.abort();
			}
		}, 10);
	}
	
	kill(){
		clearInterval(this.progint);
		this.obj.html(this.oldhtml);
		this.obj.removeProp('disabled');
		$('#oldcontent').remove();
	}
	
	set(text, porc){
		this.obj.html("<div id='bar'></div>");
		this.obj.find('#bar').css({'background-color':'#00638d','width':'0px','height':'100%','border-radius':'3px'});
		this.obj.prop('disabled','true');
		this.obj.css('padding','0');
		this.obj.append("<div id='oldcontent'>"+ text +"</div>");
		$('#oldcontent').css({'margin':this.obj.css('margin'),'display':'flex','align-items':'center','justify-content':'center','position':'absolute','top':this.obj.position().top,'left':this.obj.position().left,'width':this.obj.width(),'height':this.obj.height()});
		this.bsize = this.obj.width() / 100 * porc;
		this.obj.find('#bar').width(this.bsize.toFixed(0));
	}
}