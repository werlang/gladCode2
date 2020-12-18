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
        if (obj instanceof jQuery){
            obj = $(obj)[0]
        }

        this.oldhtml = obj.innerHTML

        obj.innerHTML = "<div id='bar'></div><div id='oldcontent'><span></span></div>"

        const bar = obj.querySelector('#bar')
        bar.style['background-color'] = '#00638d'
        bar.style['border-radius'] = '3px'
        bar.style['width'] = '0px'
        bar.style['height'] = '100%'

        obj.setAttribute('disabled', true)
        obj.style.padding = 0

        const old = obj.querySelector('#oldcontent')
        old.style['display'] = 'flex'
        old.style['align-items'] = 'center'
        old.style['justify-content'] = 'center'
        old.style['width'] = '100%'
        old.style['height'] = '100%'
        old.style['white-space'] = 'nowrap'
        old.style['overflow-x'] = 'hidden'
        old.style['margin-top'] = `-${obj.offsetHeight}px`
        old.querySelector('span').innerHTML = text[0]

        this.bsize = 0
        this.obj = obj
        this.active = true

        const maxTime = 20
        const roulTime = 2
        const uni = obj.offsetWidth / (maxTime * 100)
        let roul = 0, rcont = 0

        translator.translate(text).then(data => {
            text = data
            old.querySelector('span').innerHTML = text[0]            
        })

        const run = () => {
            if (bar.offsetWidth >= obj.offsetWidth){
                this.active = false
            }

            if (this.active){
                this.bsize += uni
                bar.style.width = `${this.bsize.toFixed(0)}px`
                
                rcont++
                if (rcont % (roulTime * 100) == 0){
                    const span = old.querySelector('span')
                    span.innerHTML = text[roul]
                    span.style = {position: "absolute"}
                    roul = (roul + 1) % text.length
                    while (span.offsetWidth > old.offsetWidth - 15){
                        const font = parseFloat(document.defaultView.getComputedStyle(span).getPropertyValue('font-size').split("px")[0])
                        span.style['font-size'] = `${font - 0.1}px`
                    }
                }

                setTimeout(() => run(), 10)
            }
            else {
                // this.kill()
                // translator.translate(["ERRO DE CONEXÃO", "Falha ao obter resposta do servidor dentro do tempo limite."]).then(text => showTerminal(text[0], text[1]))
            }
        }
        run()
    }

    kill(){
        this.obj.innerHTML = this.oldhtml
        this.obj.removeAttribute('disabled')
        const old = this.obj.querySelector('#oldcontent')
        old && old.remove()
    }

    set(text, porc){
        console.log("PROGRESSBAR: 'SET' METHOD IS DISABLED")
        // this.obj.html("<div id='bar'></div>");
        // this.obj.find('#bar').css({'background-color':'#00638d','width':'0px','height':'100%','border-radius':'3px'});
        // this.obj.prop('disabled','true');
        // this.obj.css('padding','0');
        // this.obj.append("<div id='oldcontent'>"+ text +"</div>");
        // $('#oldcontent').css({'margin':this.obj.css('margin'),'display':'flex','align-items':'center','justify-content':'center','position':'absolute','top':this.obj.position().top,'left':this.obj.position().left,'width':this.obj.width(),'height':this.obj.height()});
        // this.bsize = this.obj.width() / 100 * porc;
        // this.obj.find('#bar').width(this.bsize.toFixed(0));
    }

    isActive(){
        return this.obj.querySelector('#oldcontent') ? true : false
    }
}

export {Simulation, ProgressButton}