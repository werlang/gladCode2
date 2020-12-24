import {assets} from "./assets.js"
import { loader } from "./loader.js"
import { tutorial } from "./tutorial.js"
import { translator } from "./translate.js"

const translatorReady = translator.translate([
    "Agilidade, rapidez e destreza do gladiador.",
    "Agilidade",
    "Dano físico, o dano causado com armas corpo-a-corpo",
    "Força física e resistência do gladiador.",
    "Força",
    "Inteligência",
    "Poder mágico, o dano causado com habilidades mágicas",
    "Pontos de habilidade, usados para lançar habilidades",
    "Pontos de vida, responsáveis por manter o gladiador vivo",
    "Precisão, o dano causado com armas à distância",
    "Rapidez de raciocínio e Capacidade intelectual do gladiador.",
    "Velocidade de execução de ataques",
    "Velocidade de execução de uma habilidade",
    "Velocidade de movimento dentro da arena",
    "Determina as seguintes características",
])

export const spriteGen = {
    active: false,
    ready: false
}

spriteGen.init = async function(el){
    if (this.ready){
        return true
    }

    assets.fill()

    this.element = el

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("width", 192);
    this.canvas.setAttribute("height", 192);
    this.ctx = this.canvas.getContext("2d");
    this.spritesheet = document.createElement("canvas");
    this.spritesheet.setAttribute("width", 192 * 13);
    this.spritesheet.setAttribute("height", 192 * 21);
    this.spritectx = this.spritesheet.getContext("2d");

    this.selected = []
    this.childTree = {}
    this.visible = []
    this.loadedItems = {}
    this.loadedSpritesheets = {}

    this.color = 'black'
    this.bcolor = 'black'
    this.animation = {
        enabled: false,
        type: 'walk',
        direction: 2,
        frame: 0
    }
    this.scale = 1

    this.move = {
        walk: {'sprites': 9, 'line': 8, 'image': 'walk'},
        cast: {'sprites': 7, 'line': 0, 'image': 'magic'},
        thrust: {'sprites': 8, 'line': 4, 'image': 'thrust'},
        slash: {'sprites': 6, 'line': 12, 'image': 'slash'},
        shoot: {'sprites': 13, 'line': 16, 'image': 'arrows'},
    }

    // build child tree
    assets.forAllImages((e,n) => {
        if (e.parent){
            const parent = Array.isArray(e.parent) ? e.parent : [e.parent]
            for (let i in parent){
                if (!this.childTree[parent[i]]){
                    this.childTree[parent[i]] = []
                }
                this.childTree[parent[i]].push(n)
            }
        }

        if (e.default){
            this.selected.push(n)
        }
    })
    // console.log(this.childTree)

    el.innerHTML = await (await fetch('glad-create.html')).text()
    translator.translate(el)

    document.querySelectorAll('.img-button.sub').forEach(e => e.classList.add('hidden'))
    document.querySelector('#middle-container').appendChild(this.canvas)

    document.querySelectorAll('.img-button').forEach(e => e.addEventListener('click', () => {
        if (!e.classList.contains("n-av")){
            this.open(e.id)
        }
    }))

    document.querySelectorAll("#fog-skin .close").forEach(e => e.addEventListener("click", () => {
        this.active = false
        document.querySelector("#fog-skin").classList.add("hidden")
    }))

    await this.draw()
    this.reload()

    this.ready = true

    // bind buttons' actions
    document.querySelector('#fog-skin #turn').addEventListener('click', () => {
        this.animation.direction = (this.animation.direction + 1) % 4
        this.draw()
    })

    document.querySelector('#fog-skin #down-scale').addEventListener('click', () => {
        this.scale = Math.max(this.scale - 0.5, 1)
        this.draw()
    })

    document.querySelector('#fog-skin #up-scale').addEventListener('click', () => {
        this.scale = Math.min(this.scale + 0.5, 3.5)
        this.draw()
    })

    document.querySelector('#fog-skin #play-pause').addEventListener('click', async event => {
        const obj = event.target
        if (this.animation.enabled){
            this.animation.enabled = false
            this.animation.frame = 0
            obj.src = 'sprite/images/play.png'
        }
        else{
            this.animation.enabled = true
            obj.src = 'sprite/images/pause.png'
        }
        this.draw()
    })

    document.querySelector('#fog-skin #animation').addEventListener('click', event => {
        const attacks = {walk: true, cast: true, thrust: false, slash: false, shoot: false}
        this.selected.forEach(e => {
            const img = assets.getImage(e)
            if (img && img.move){
                attacks[img.move] = true
            }
        })

        const avMoves = Object.entries(attacks).filter(e => e[1]).map(e => e[0])
        const newIndex = (avMoves.indexOf(this.animation.type) + 1) % avMoves.length
        this.animation.type = avMoves[newIndex]

        this.animation.frame = 0

        event.target.src = `sprite/images/${this.move[this.animation.type].image}.png`
    })

    document.querySelector('#fog-skin #save-glad').addEventListener('click', () => {
        document.querySelector('#fog-skin #distribuicao-container').style.display = 'flex'
        document.querySelector('#fog-skin #skin-container').style.display = 'none'

        const cvpoint = document.createElement('canvas')
        cvpoint.setAttribute("width", 64)
        cvpoint.setAttribute("height", 64)
        const pct = cvpoint.getContext("2d")
        pct.drawImage(this.canvas, 64, 64, 64, 64, 0, 0, 64, 64)
        document.querySelector('#fog-skin #cv').innerHTML = ""
        document.querySelector('#fog-skin #cv').appendChild(cvpoint)
    })

    document.querySelector('#fog-skin #back').addEventListener('click', () => {
        document.querySelector('#fog-skin #distribuicao-container').style.display = 'none'
        document.querySelector('#fog-skin #skin-container').style.display = 'flex'
    })

    document.querySelector('#fog-skin #reset').addEventListener('click', () => {
        document.querySelectorAll('.img-button').forEach(e => e.classList.remove('selected'))
        document.querySelectorAll('.img-button.sub').forEach(e => e.classList.add('hidden'))
        document.querySelector('#distribuicao #nome').value = ""

        document.querySelectorAll('#distribuicao .slider').forEach(e => {
            e.value = 0
            e.dispatchEvent(new Event('input'))
        })

        this.selected = []
        this.visible = []
        assets.forAllImages((e,n) => {
            if (e.default){
                this.selected.push(n)
            }
        })

        this.reload()
        this.draw()

        document.querySelector('#fog-skin #back').click()
    })

    document.querySelector('#fog-skin #get-code').addEventListener('click', async () => {
        const name = document.querySelector('#distribuicao #nome')
        if (name.value.length <= 2 || !name.value.match(/^[\w À-ú]+?$/g) ){
            name.classList.add('error')
            name.focus()
        }
        else{
            name.classList.remove('error')

            this.gladiator = {}

            this.gladiator.name = name.value
            this.gladiator.skin = this.selected

            this.gladiator.vstr = document.querySelector('#distribuicao #str .slider-input').value
            this.gladiator.vagi = document.querySelector('#distribuicao #agi .slider-input').value
            this.gladiator.vint = document.querySelector('#distribuicao #int .slider-input').value

            const {login} = await loader.load("header")
            this.gladiator.code = login.user.language == 'python' ? "def loop():\n    # comportamento do gladiador\n" : "loop(){\n    // comportamento do gladiador\n}"

            // console.log(this.gladiator)

            document.querySelector("#fog-skin .close").click()

            if (tutorial.getLesson() == 'skin'){
                tutorial.next(true)
            }
        }
    })

    // slider action
    document.querySelectorAll('#distribuicao .slider').forEach(e => e.addEventListener('input', () => {
        function calcAttrValue(slider) {
            return slider == 0 ? 0 : calcAttrValue(slider - 1) + Math.ceil(slider/6)
        }
        e.closest('.slider-container').querySelector('.slider-value').textContent = calcAttrValue(e.value)
        e.closest('.slider-container').querySelector('.slider-input').value = e.value

        let sum = 0
        document.querySelectorAll('#distribuicao .slider-value').forEach(e => sum += parseInt(e.textContent))

        const numobj = document.querySelector('#distribuicao #remaining span')
        numobj.innerHTML = 50 - sum

        const button = document.querySelector('#get-code')
        button.setAttribute('disabled', true)
        numobj.classList.remove('red', 'green')
        if (sum == 50){
            button.innerHTML = "GERAR CÓDIGO"
            button.removeAttribute('disabled')
            numobj.classList.add('green')
        }
        else if (sum > 50){
            numobj.classList.add('red')
        }
    }))

    // slider hover info
    document.querySelectorAll('#distribuicao .slider-container').forEach(e => e.addEventListener('mouseenter', async () => {
        const text = {
            str: {
                'path': 'sprite/images/strength.png',
                'title': `${translator.getTranslated("Força")} - STR`,
                'description': translator.getTranslated("Força física e resistência do gladiador."),
                'list': [
                    {'path': 'sprite/images/decapitation.png',	'description': translator.getTranslated("Dano físico, o dano causado com armas corpo-a-corpo")},
                    {'path': 'sprite/images/healing.png',	'description': translator.getTranslated("Pontos de vida, responsáveis por manter o gladiador vivo")}
                ]
            },
            agi: {
                'path': 'sprite/images/agility.png',
                'title': `${translator.getTranslated("Agilidade")} - AGI`,
                'description': translator.getTranslated("Agilidade, rapidez e destreza do gladiador."),
                'list': [
                    {'path': 'sprite/images/bullseye.png',	'description': translator.getTranslated("Precisão, o dano causado com armas à distância")},
                    {'path': 'sprite/images/sprint.png',	'description': translator.getTranslated("Velocidade de movimento dentro da arena")},
                    {'path': 'sprite/images/blades.png',	'description': translator.getTranslated("Velocidade de execução de ataques")}
                ]
            },
            int: {
                'path': 'sprite/images/smart.png',
                'title': `${translator.getTranslated("Inteligência")} - INT`,
                'description': translator.getTranslated("Rapidez de raciocínio e Capacidade intelectual do gladiador."),
                'list': [
                    {'path': 'sprite/images/energy.png',	'description': translator.getTranslated("Poder mágico, o dano causado com habilidades mágicas")},
                    {'path': 'sprite/images/3balls.png',	'description': translator.getTranslated("Velocidade de execução de uma habilidade")},
                    {'path': 'sprite/images/energise.png',	'description': translator.getTranslated("Pontos de habilidade, usados para lançar habilidades")}
                ]
            }
        }
        // console.log(text[e.id])
        await translatorReady

        document.querySelector('#info').innerHTML = `
        <div id='title'>
            <img src='${text[e.id].path}'><span>${text[e.id].title}</span>
        </div>
        <div id='body'>
            <p class='fill'>${text[e.id].description}</p>
            <p>${translator.getTranslated("Determina as seguintes características")}:</p>
            <ul>${text[e.id].list.map(e => `<li><div class='blue'><img src='${e.path}'></div><span>${e.description}</span></li>`).join("")}</ul>
        </div>`
    }))
}

spriteGen.open = function(id){
    const menus = {
        body: ['gender', 'shape', 'ears', 'eyes'],
        hair: ['style', 'color', 'facial', 'bcolor'],
        cloth: ['shirt', 'armor', 'legs', 'feet'],
        misc: ['head', 'shoulder', 'hands', 'cape', 'belt'],
        equip: ['melee', 'ranged', 'shield'],
    }

    // first level
    if (menus[id]){
        document.querySelectorAll(`.img-button.cat.selected`).forEach(e => e.classList.remove('selected'))
        document.querySelector(`#${id}.img-button.cat`).classList.add('selected')
        document.querySelectorAll(`.img-button.sub`).forEach(e => e.classList.add('hidden'))
        menus[id].forEach(e => document.querySelector(`#${e}.img-button.sub.hidden`).classList.remove('hidden'))
    }
    // second level
    else if (this.childTree[id]){
        document.querySelectorAll(`.img-button.sub.selected`).forEach(e => e.classList.remove('selected'))
        document.querySelector(`#${id}.img-button.sub`).classList.add('selected')

        // remove menus from selected
        this.selected = this.selected.filter(e => !(Object.keys(menus).includes(e) || Object.values(menus).some(a => a.includes(e))))
        this.selected.push(id)

        this.reload()
    }
}

spriteGen.loadItem = function(info, name){
    // console.log(info, name)
    const prev = document.createElement("canvas")
    prev.setAttribute("width", 64)
    prev.setAttribute("height", 64)
    const prevctx = prev.getContext("2d")

    if (!document.querySelector(`#${name}.img-button.item`)){
        document.querySelector('#right-container').insertAdjacentHTML('beforeend', `<div class='img-button item' id='${name}'></div>`)
    }
    const item = document.querySelector(`#${name}.img-button.item`)
    if (info.path){
        item.innerHTML = `<i class='fas fa-spinner fa-pulse'></i>`

        const src = info.png ? `sprite/images/${info.path}` : `sprite/Universal-LPC-spritesheet/${info.path}`

        if (this.loadedItems[src]){
            item.innerHTML = ""
            item.appendChild(this.loadedItems[src])
        }
        else{
            const img = new Image()
            img.src = src
            img.onload = () => {
                try {
                    let line = info.line || 10
                    let col = info.col || 0
                    let s = info.oversize ? 192 : 64

                    if (info.png){
                        prevctx.drawImage(img, 0, 0, info.width, info.height, 0, 0, 64, 64)
                    }
                    else if (info.scale){
                        let dx = info.posx || 0
                        let dy = info.posy || 0
                        prevctx.drawImage(img, col * s, line * s, s, s, s/2 - info.scale*s/2 + dx, s/2 - info.scale*s/2 + dy, 64*info.scale, 64*info.scale)
                    }
                    else{
                        prevctx.drawImage(img, col * s, line * s, s, s, 0, -5, 64, 64)
                    }
                    item.innerHTML = ""
                    item.appendChild(prev)
                    this.loadedItems[src] = prev
                    this.loadedSpritesheets[src] = img
                } catch (err) {
                    console.log(err)
                }
            }
        }
    }

    item.addEventListener('click', () => {
        const imageParent = Array.isArray(info.parent) ? info.parent : [info.parent]
        // remove from selected the siblings
        this.selected = this.selected.filter(e => !imageParent.some(a => this.childTree[a].includes(e)))
        this.selected.push(name)

        document.querySelectorAll('.img-button.item').forEach(e=> e.classList.remove('selected'))
        item.classList.add('selected')

        // switch to matching animation
        if (info.move){
            this.animation.type = info.move
            this.animation.frame = 0
            document.querySelector("#fog-skin #animation img").src = `sprite/images/${this.move[info.move].image}.png`
        }

        // select aggregate items (arrows)
        if (info.select){
            this.selected.push(info.select)
        }

        this.reload()
        this.draw()
    })
}

spriteGen.draw = async function(){
    // draw on the main canvas
    // console.log(this.selected)
    if (!this.selected){
        return false
    }

    const getLayer = a => {
        const directionEnum = ['up', 'left', 'down', 'right']
        const i = assets.getImage(a)
        if (!i || !i.layer){
            return false
        }
        else if (i.layer && i.layer.default){
            return i.layer[ directionEnum[this.animation.direction] ] || i.layer.default
        }
        else{
            return i.layer
        }
    }
    this.selected.sort((a,b) => getLayer(a) - getLayer(b))
    // console.log(this.selected)

    const tempss = document.createElement("canvas");
    tempss.width = this.spritesheet.width;
    tempss.height = this.spritesheet.height;
    const tempctx = tempss.getContext("2d");

    const loaded = []
    this.selected.forEach(e => {
        const meta = assets.getImage(e)
        if (meta && meta.path && !meta.png){
            const src = `sprite/Universal-LPC-spritesheet/${meta.path}`
            loaded.push(new Promise(resolve => {
                if (this.loadedSpritesheets[src]){
                    resolve({img: this.loadedSpritesheets[src], meta: meta})
                }
                else{
                    const img = new Image()
                    img.src = src
                    img.onload = () => {
                        this.loadedSpritesheets[src] = img
                        resolve({img: img, meta: meta})
                    }
                }
            }))
        }
    })

    // when all images loaded
    const res = await Promise.all(loaded)

    res.forEach(e => {
        if (e.meta.oversize){
            const line = this.move[e.meta.move].line
            const sprites = this.move[e.meta.move].sprites
            for (let k=0 ; k<4 ; k++){
                for (let j=0 ; j<sprites ; j++){
                    tempctx.drawImage(e.img, j*192, k*192, 192, 192, j*192, line*192 + k*192, 192, 192)
                }
            }
        }
        else{
            for (let k=0 ; k<21 ; k++){
                for (let j=0 ; j<13 ; j++){
                    tempctx.drawImage(e.img, j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64)
                }
            }
        }
    })

    this.spritectx.clearRect(0, 0, this.spritesheet.width, this.spritesheet.height)
    this.spritectx.drawImage(tempss, 0, 0)

    // update canvas with spritesheet
    const updateCanvas = () => {
        const line = (this.animation.direction + this.move[this.animation.type].line)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.drawImage(this.spritesheet, 192*this.animation.frame, 192*line, 192, 192, 192/2 - 192*this.scale/2, 192/2 - 192*this.scale/2 - 5, 192*this.scale, 192*this.scale)

        if (this.animation.enabled){
            this.animation.frame = (this.animation.frame + 1) % this.move[this.animation.type].sprites
            this.animation.running = true
            setTimeout( () => updateCanvas(), 100)
        }
        else{
            this.animation.running = false
        }
    }
    if (!this.animation.running){
        updateCanvas()
    }
}

spriteGen.reload = function(){
    // console.log(this.selected)

    document.querySelector('#right-container').innerHTML = ""

    // match equipment with gender
    const gender = this.selected.includes('male') ? 'male' : 'female'
    this.selected = this.selected.map(e => e.replace(/(?:fe){0,1}male/, gender)).filter(e => assets.getImage(e) || Array.from(document.querySelectorAll(`.img-button.sub.selected`)).some(d => d.id == e))

    if (document.querySelector(`.img-button.sub.selected`)){
        const id = document.querySelector(`.img-button.sub.selected`).id

        // make visible by parents
        this.visible = this.childTree[id]

        // make visible by requirements
        this.visible.forEach(e => {
            const img = assets.getImage(e)
            if (img.req){
                const removeOr = img.req.or && !img.req.or.some(e => this.selected.includes(e))
                const removeAnd = img.req.and && !img.req.and.every(e => this.selected.includes(e))
                const removeNot = img.req.not && !img.req.not.some(e => this.selected.includes(e))
                const removeSingle = typeof img.req == 'string' && !this.selected.includes(img.req)

                if (removeSingle || removeOr || removeAnd || removeNot){
                    this.visible = this.visible.filter(a => a != e)
                }
            }
        })

        // make visible only matching hair styles and colors
        if (this.selected.includes('style')){
            // get hair color
            let color = this.selected.filter(e => assets.getImage(e) && assets.getImage(e).parent.includes('color'))
            this.color = color.length ? color[0].split("_")[1] : this.color

            this.visible = this.visible.filter(e => [this.color, 'none'].includes(e.split("_")[1]))
        }
        else if (this.selected.includes('color')){
            // get hair style
            let style = this.selected.filter(e => assets.getImage(e) && assets.getImage(e).parent.includes('style'))[0].split("_")[0]

            this.visible = this.visible.filter(e => e.split("_")[0] == style)
        }
        else if (this.selected.includes('facial')){
            // get beard color
            let color = this.selected.filter(e => assets.getImage(e) && assets.getImage(e).parent.includes('bcolor'))
            this.bcolor = color.length ? color[0].split("_")[1] : this.bcolor

            this.visible = this.visible.filter(e => [this.bcolor, 'none'].includes(e.split("_")[1]))
        }
        else if (this.selected.includes('bcolor')){
            // get hair style
            let style = this.selected.filter(e => assets.getImage(e) && assets.getImage(e).parent.includes('facial'))[0].split("_")[0]

            this.visible = this.visible.filter(e => e.split("_")[0] == style)
        }

    }

    // disable buttons
    document.querySelectorAll(".img-button.n-av").forEach(e => e.classList.remove("n-av"))
    this.selected.forEach(e => {
        const img = assets.getImage(e)
        if (img && img.block){
            const block = Array.isArray(img.block) ? img.block : [img.block]
            block.forEach(e => {
                document.querySelector(`#${e}.img-button`).classList.add('n-av')
                this.selected = this.selected.filter(a => a != e && !this.childTree[e].includes(a))
            })
        }
    })

    // console.log(this.visible)
    // console.log(this.selected)
    this.visible.forEach(e => {
        this.loadItem(assets.getImage(e), e)

        if (this.selected.includes(e)){
            document.querySelector(`#${e}.img-button.item`).classList.add('selected')
        }
    })
}

spriteGen.createGladiator = async function(glad){
    if (glad && glad.skin){
        this.selected = typeof glad.skin === 'string' ? JSON.parse(glad.skin) : glad.skin

        if (!this.ready){
            await this.init()
        }

        this.draw()

        document.querySelector('#distribuicao #nome').value = glad.name

        document.querySelectorAll('#distribuicao .slider').forEach(e => {
            e.value = glad[`v${e.parentNode.id}`]
            e.dispatchEvent(new Event('input'))
        })
    }
    
    this.show()

    return await new Promise(resolve => {
        const check = () => {
            if (this.gladiator){
                const glad = JSON.parse(JSON.stringify(this.gladiator))
                delete this.gladiator
                resolve(glad)
            }
            else if (!this.active){
                resolve(false)
            }
            else{
                setTimeout(() => check(), 10)
            }
        }
        check()
    })
}

spriteGen.show = async function(){
    const window = this.element
    window.classList.remove("hidden")
    window.classList.add("fade")
    setTimeout(() => window.classList.remove("fade"), 1)
    this.active = true
}