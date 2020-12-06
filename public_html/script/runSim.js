import {showTerminal} from "./dialog.js"
import {post} from "./utils.js"
import {translator} from "./translate.js"

//required to provide inside glads object:
//name, user, code, skin, vstr, vagi, vint
//or an array with ids

class Simulation{
    constructor(args){
        this.args = args
        this.running = false

        if (args.terminal){
            this.terminal = args.terminal
            delete this.args.terminal
        }
    }

    async run(){
        this.running = true
        let call = post("back_simulation.php", {
            args: JSON.stringify(this.args)
        })
        this.call = call
        return new Promise( (resolve, reject) => {
            this.call.then( data => {
                // console.log(data)
                if (data.error){
                    if (this.terminal){
                        this.showTerm({error: data.error})
                    }

                    this.running = false
                    reject({ error: data.error })
                }
                else{
                    if (this.terminal){
                        this.showTerm(data)
                    }

                    this.running = false
                    this.hash = data
                    resolve(data)
                }

            })
        })
    }

    abort(){
        this.running = false
        this.call.abort()
    }

    showTerm(data){
        if (data.error){
            let error = data.error.split("/usercode/").join("");
            for (let i in this.args.glads){
                let glad = this.args.glads[i]
                if (glad.name){
                    error = error.split(`code${i}.c`).join(`<span>${glad.name}</span>`);
                    error = error.split(`code${i}.py`).join(`<span>${glad.name}</span>`);
                }
                else{
                    var pattern = /setName\("([\w\W]*?)"\)/;
                    var match = glad.match(pattern);
                    if (match){
                        error = error.split(`code${i}.c`).join(`<span>${match[1]}</span>`);
                        error = error.split(`code${i}.py`).join(`<span>${match[1]}</span>`);
                    }
                }
            }
            var pattern = /\\n/g;
            error = error.replace(pattern, '\n');
            translator.translate("ERRO DE SINTAXE").then(text => showTerminal(text, error))
            console.log(data)
        }
        else if (data.output == "CLIENT TIMEOUT"){
            translator.translate([
                "ERRO NA SIMULAÇÃO",
                `A gladCode está tendo problemas entre a conexão do simulador e os gladiadores. Por favor, reporte este problema para <ignore><a href='mailto:contato@gladcode.dev'><span>contato@gladcode.dev</span></a></ignore>`
            ]).then(text => showTerminal(text[0], text[1]))
            console.log(data)
        }
        else if (data.output.indexOf("timed out") != -1){
            var glad = data.output.split("Gladiator ")[1].split(" timed out")[0];
            translator.translate([
                "GLADIADOR EM LOOP",
                `O código do gladiador <ignore><span>${glad}</span></ignore> está em uma repetição da qual não consegue sair.\nEle foi desativado para não comprometer a simulação.\n\nRevise o código-fonte e tente novamente.`
            ]).then(text => showTerminal(text[0], text[1]))
            console.log(data)
        }
    }
}

class ProgressButton {
    constructor(obj, text){
        if (!(obj instanceof jQuery)){
            obj = $(obj)
        }

        this.oldhtml = obj.html();

        obj.html("<div id='bar'></div><div id='oldcontent'></div>");
        obj.find('#bar').css({
            'background-color':'#00638d',
            'width':'0px',
            'height':'100%',
            'border-radius':'3px'
        });
        obj.prop('disabled','true');
        obj.css('padding','0');
        obj.append("<div id='oldcontent'></div>");
        $('#oldcontent').css({
            'display':'flex',
            'align-items':'center',
            'justify-content':'center',
            'width':'100%',
            'height':'100%',
            'margin-top':obj.outerHeight()*-1
        });

        this.bsize = 0;
        this.obj = obj;
        var self = this;
        var roul = 0, rcont = 0;

        translator.translate(text).then(text => {
            this.progint = setInterval(function(){
                var maxtime = 20;
                var uni = obj.width() / (maxtime * 100);
                self.bsize += uni;
                obj.find('#bar').width(self.bsize.toFixed(0));
                obj.find('#oldcontent').html(text[roul]);
                rcont++;
                if (rcont % 200 == 0)
                    roul = (roul + 1) % text.length;
                if (obj.find('#bar').width() >= obj.width()){
                    self.kill()
                    translator.translate(["ERRO DE CONEXÃO", "Falha ao obter resposta do servidor dentro do tempo limite."]).then(text => showTerminal(text[0], text[1]))
                }
            }, 10);
        })
    }

    kill(){
        clearInterval(this.progint);
        this.obj.html(this.oldhtml);
        this.obj.removeAttr('disabled');
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

    isActive(){
        if (this.obj.find('#oldcontent').length > 0)
            return true;
        else
            return false;
    }
}

export {Simulation, ProgressButton}