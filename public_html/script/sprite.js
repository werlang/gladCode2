import {assets} from "./assets.js"
import { loader } from "./loader.js";

export const spriteGen = {
    active: false,
    ready: false
}

spriteGen.init = async function(el){
    assets.fill()

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

    this.draw()
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
        // $('#distribuicao .slider').val(0).change();
        
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
            this.gladiator.code = login.user.language == 'python' ? "def loop():\n    #comportamento do gladiador\n" : "loop(){\n    //comportamento do gladiador\n}"

            // console.log(this.gladiator)

            document.querySelector("#fog-skin .close").click()
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
    document.querySelectorAll('#distribuicao .slider-container').forEach(e => e.addEventListener('mouseenter', () => {
        const text = {
            str: {
                'path': 'sprite/images/strength.png',
                'title': 'Força - STR',
                'description': 'Força física e resistência do gladiador.',
                'list': [
                    {'path': 'sprite/images/decapitation.png',	'description': 'Dano físico, o dano causado com armas corpo-a-corpo'},
                    {'path': 'sprite/images/healing.png',	'description': 'Pontos de vida, responsáveis por manter o gladiador vivo'}
                ]
            },
            agi: {
                'path': 'sprite/images/agility.png',
                'title': 'Agilidade - AGI',
                'description': 'Agilidade, rapidez e destreza do gladiador.',
                'list': [
                    {'path': 'sprite/images/bullseye.png',	'description': 'Precisão, o dano causado com armas à distância'},
                    {'path': 'sprite/images/sprint.png',	'description': 'Velocidade de movimento dentro da arena'},
                    {'path': 'sprite/images/blades.png',	'description': 'Velocidade de execução de ataques'}
                ]
            },
            int: {
                'path': 'sprite/images/smart.png',
                'title': 'Inteligência - INT',
                'description': 'Rapidez de raciocínio e Capacidade intelectual do gladiador.',
                'list': [
                    {'path': 'sprite/images/energy.png',	'description': 'Poder mágico, o dano causado com habilidades mágicas'},
                    {'path': 'sprite/images/3balls.png',	'description': 'Velocidade de execução de uma habilidade'},
                    {'path': 'sprite/images/energise.png',	'description': 'Pontos de habilidade, usados para lançar habilidades'}
                ]
            }
        }
        // console.log(text[e.id])

        document.querySelector('#info').innerHTML = `
        <div id='title'>
            <img src='${text[e.id].path}'><span>${text[e.id].title}</span>
        </div>
        <div id='body'>
            <p class='fill'>${text[e.id].description}</p>
            <p>Determina as seguintes características:</p>
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

spriteGen.draw = function(){
    // draw on the main canvas
    // console.log(this.selected)
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
    Promise.all(loaded).then(res => {
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
    })
}

function load_assets(image) {
    var prev = document.createElement("canvas");
    prev.setAttribute("width", 64);
    prev.setAttribute("height", 64);
    var prevctx = prev.getContext("2d");
    var imgRef = image.path;

    var img = new Image();

    if (image.png)
        img.src = "sprite/images/" + imgRef;
    else
        img.src = "sprite/Universal-LPC-spritesheet/" + imgRef;

    img.onload = function() { callback(img) };

    if ( $('.img-button.item#'+ image.id).length == 0)
        $('#right-container').append("<div class='img-button item' id='"+ image.id +"'></div>");
    $('.img-button.item#'+ image.id).append(prev);

    if (image.default)
        $('.img-button.item#'+ image.id).addClass('selected');
    for (var i in selected){
        if (selected[i].id == image.id){
            $('.img-button.item').removeClass('selected');
            $('.img-button.item#'+ image.id).addClass('selected');
        }
    }

    var callback = function(img) {
        try {
            var line = 10, col = 0;
            var s = 64;
            if (image.line)
                line = image.line;
            if (image.col)
                col = image.col;

            if (image.oversize)
                s = 192;

            if (image.png)
                prevctx.drawImage(img, 0, 0, image.width, image.height, 0, 0, 64, 64);
            else if (image.scale){
                var dx = 0, dy = 0;
                if (image.posx)
                    dx = image.posx;
                if (image.posy)
                    dy = image.posy;
                prevctx.drawImage(img, col * s, line * s, s, s, s/2 - image.scale*s/2 + dx, s/2 - image.scale*s/2 + dy, 64*image.scale, 64*image.scale);
            }
            else
                prevctx.drawImage(img, col * s, line * s, s, s, 0, -5, 64, 64);
        } catch (err) {
            console.log(err);
        }
    };
    $('.img-button.item#'+ image.id).click( function() {
        var imageParent = [];
        if (Array.isArray(image.parent))
            imageParent = image.parent;
        else
            imageParent.push(image.parent);

        for (var i in selected){
            var selectedParent = [];
            if (Array.isArray(selected[i].parent))
                selectedParent = selected[i].parent;
            else
                selectedParent.push(selected[i].parent);

            for (var j in selectedParent){
                for (var k in imageParent){
                    if (selectedParent[j] == imageParent[k])
                        delete selected[i];
                }
            }
        }
        selected[image.id] = image;
        $('.img-button.item').removeClass('selected');
        $(this).addClass('selected');
        //console.log(selected);
        reload_reqs(true);
    });
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

spriteGen.getGlad = function(){
    return this.gladiator || false
}

function reload_reqs(keepItems){
    if (!keepItems)
        $('#right-container').html("");
    var visible = {};
    setTimeout( function(){
        var parentList = parentTree[$('.img-button.sub.selected').attr('id')];
        //verifique quem é visivel pelo parent
        $.each( parentList , function(index, image) {
            image = getImage(image);
            var visibleFlag = true;

            //define quais vao ser visiveis baseado no parent
            if (Array.isArray(image.parent)){
                for (let i=0 ; i < image.parent.length ; i++){
                    if ( $('.img-button#'+image.parent[i]).hasClass('selected') )
                        break;
                }
                if (i == image.parent.length)
                    visibleFlag = false;
            }
            else{
                if ( !$('.img-button#'+image.parent).hasClass('selected') )
                    visibleFlag = false;
            }

            if (visibleFlag)
                visible[image.id] = image;

        });

        //torna invivel pelo requerimento
        $.each(images, function(index,image) {
            if (image.req){
                if (image.req.or){
                    for (let i=0 ; i<image.req.or.length ; i++){
                        if( selected[image.req.or[i]] )
                            break;
                    }
                    if (i == image.req.or.length){
                        delete visible[image.id];
                        delete selected[image.id];
                    }
                }
                else if (image.req.and){
                    for (let i=0 ; i<image.req.and.length ; i++){
                        if( !selected[image.req.and[i]] ){
                            delete visible[image.id];
                            delete selected[image.id];
                            break;
                        }
                    }
                }
                else if (image.req.not){
                    for (let i=0 ; i<image.req.not.length ; i++){
                        if( selected[image.req.not[i]] ){
                            delete visible[image.id];
                            delete selected[image.id];
                            break;
                        }
                    }
                }
                else{
                    if( !selected[image.req] ){
                        delete visible[image.id];
                        delete selected[image.id];
                    }
                }
            }
        });

        //reseta o shape se troca de sexo
        var shapeOK = false;
        $.each(selected, function(index,image) {
            if (image.parent == 'shape')
                shapeOK = true;
        });
        if (!shapeOK){
            if (selected['male'])
                selected['male-light'] = getImage('male-light');
            else
                selected['female-light'] = getImage('female-light');
        }

        //torna visivel cores do cabelo
        if ($('#style').hasClass('selected')){
            var color = lastcolor;
            $.each(selected, function(index,image) {
                if (image.parent[1] == 'color'){
                    color = image.id.split("_")[1];
                    lastcolor = color;
                }
            });
            $.each(images, function(index,image) {
                if (image.parent[1] == 'color'){
                    if ($(this).attr('id').split("_")[1] == color)
                        visible[image.id] = image;
                    else
                        delete visible[image.id];
                }

            });
        }
        //torna visivel cores da barba
        if ($('#facial').hasClass('selected')){
            var color = lastcolor;
            $.each(selected, function(index,image) {
                if (image.parent[1] == 'bcolor'){
                    color = image.id.split("_")[1];
                    lastcolor = color;
                }
            });
            $.each(images, function(index,image) {
                if (image.parent[1] == 'bcolor'){
                    if (image.id.split("_")[1] == color)
                        visible[image.id] = image;
                    else
                        delete visible[image.id];
                }

            });
        }
        //torna visivel estilos de cabelo
        if ($('#color').hasClass('selected')){
            var style;
            $.each(selected, function(index,image) {
                if (image.parent[0] == 'style')
                    style = image.id.split("_")[0];
            });
            $.each(images, function(index,image) {
                if (image.parent[0] == 'style'){
                    if (image.id.split("_")[0] == style)
                        visible[image.id] = image;
                    else
                        delete visible[image.id];
                }
            });
        }
        //torna visivel cores de barba
        if ($('#bcolor').hasClass('selected')){
            var facial;
            $.each(selected, function(index,image) {
                if (image.parent[0] == 'facial'){
                    facial = image.id.split("_")[0];
                }
            });
            $.each(images, function(index,image) {
                if (image.parent[0] == 'facial'){
                    if (image.id.split("_")[0] == facial)
                        visible[image.id] = image;
                    else
                        delete visible[image.id];
                }
            });
        }
        //coloca not available
        $('.img-button.sub.n-av').removeClass('n-av');

        if ( selected['male-orc'] || selected['male-red_orc'] || selected['skeleton'] || selected['female-orc'] || selected['female-red_orc'] )
            $('#eyes, #ears').addClass('n-av');

        if ( selected['hair_none'] )
            $('#color').addClass('n-av');

        if ( selected['facial_none'] )
            $('#bcolor').addClass('n-av');

        if ( selected['male_chain'] || selected['female_chain'] )
            $('#shirt, #legs').addClass('n-av');

        $.each( selected , function(index,image) {
            //torna invisivel pelo block
            if (Array.isArray(image.block)){
                for (let i=0 ; i<image.block.length ; i++)
                    $('#'+ image.block[i]).addClass('n-av');
            }
            else
                $('#'+ image.block).addClass('n-av');

            //selectiona a move no botao la em cima
            if (image.move && $('.img-button#'+image.parent).hasClass('selected')){
                anim_num = moveEnum[image.move];
                $('#animation').find('img').attr('src', 'sprite/images/'+ move[anim_num].image +'.png' );
            }

            //seleciona os itens agregados (arrows)
            if (image.parent == 'none' && selected[image.id])
                delete selected[image.id]

            if (image.select){
                selected[image.select] = getImage(image.select);
            }


        });
        //remove os items not avaliable
        $.each( $('.img-button.sub.n-av') , function() {
            var list = parentTree[$(this).attr('id')];
            for (var i in list){
                if (selected[list[i]])
                    delete selected[list[i]];
            }
        });

        if (!keepItems){
            for (var i in visible){
                load_assets(visible[i]);
            }
        }
        draw();
    },1);
}

// function load_glad_generator(element){

    // element.load('glad-create.html', function(){
    //     // buildIndex();

    //     $('.img-button.sub').addClass('hidden');
    //     $('#middle-container').append(canvas);
    //     reload_reqs();

        // $('.slider-container').on('touchstart mouseenter', function() {
        //     text = [
        //         {
        //             'path': 'sprite/images/strength.png',
        //             'title': 'Força - STR',
        //             'description': 'Força física e resistência do gladiador.',
        //             'list': [
        //                 {'path': 'sprite/images/decapitation.png',	'description': 'Dano físico, o dano causado com armas corpo-a-corpo'},
        //                 {'path': 'sprite/images/healing.png',	'description': 'Pontos de vida, responsáveis por manter o gladiador vivo'}
        //             ]
        //         },
        //         {
        //             'path': 'sprite/images/agility.png',
        //             'title': 'Agilidade - AGI',
        //             'description': 'Agilidade, rapidez e destreza do gladiador.',
        //             'list': [
        //                 {'path': 'sprite/images/bullseye.png',	'description': 'Precisão, o dano causado com armas à distância'},
        //                 {'path': 'sprite/images/sprint.png',	'description': 'Velocidade de movimento dentro da arena'},
        //                 {'path': 'sprite/images/blades.png',	'description': 'Velocidade de execução de ataques'}
        //             ]
        //         },
        //         {
        //             'path': 'sprite/images/smart.png',
        //             'title': 'Inteligência - INT',
        //             'description': 'Rapidez de raciocínio e Capacidade intelectual do gladiador.',
        //             'list': [
        //                 {'path': 'sprite/images/energy.png',	'description': 'Poder mágico, o dano causado com habilidades mágicas'},
        //                 {'path': 'sprite/images/3balls.png',	'description': 'Velocidade de execução de uma habilidade'},
        //                 {'path': 'sprite/images/energise.png',	'description': 'Pontos de habilidade, usados para lançar habilidades'}
        //             ]
        //         },
        //     ];

        //     index = $('.slider-container').index($(this));
        //     $('#info #title img').attr('src', text[index].path);
        //     $('#info #title span').html(text[index].title);
        //     $('#info #body .fill').html(text[index].description);
        //     $('#info ul').html("");
        //     $.each( text[index].list , function(i, item) {
        //         $('#info ul').append("<li><img src='"+ item.path +"'><span>"+ item.description +"</span></li>");
        //     });

        // });

        // $('#save-glad').click( function() {
        //     $('#distribuicao-container').css({'display':'flex', 'height':$('#skin-container').outerHeight()});
        //     $('#skin-container').hide();

        //     var cvpoint = document.createElement('canvas');
        //     cvpoint.setAttribute("width", 64);
        //     cvpoint.setAttribute("height", 64);
        //     var pct = cvpoint.getContext("2d");
        //     pct.drawImage(canvas, 64, 64, 64, 64, 0, 0, 64, 64);
        //     $('#cv').html(cvpoint);

        //     codeEditor.saved = false;
        //     codeEditor.tested = false;
        // });

        // $('#get-code').click( function() {
        //     createFloatCard();
        // });

        // async function createFloatCard(arg){
        //     var nome = $('#distribuicao #nome').val();
        //     if (nome.length <= 2 || !nome.match(/^[\w À-ú]+?$/g) ){
        //         $('#distribuicao #nome').addClass('error');
        //         $('#distribuicao #nome').focus();
        //     }
        //     else{
        //         $('#distribuicao #nome').removeClass('error');

        //         pieces = []
        //         $.each( selected, function(index, image) {
        //             pieces.push(image.id);
        //         });

        //         var vstr = $('#distribuicao .slider-input').eq(0).val();
        //         var vagi = $('#distribuicao .slider-input').eq(1).val();
        //         var vint = $('#distribuicao .slider-input').eq(2).val();
        //         var codigo = "loop(){\n    //comportamento do gladiador\n}";
        //         if (user.language == 'python')
        //             codigo = "def loop():\n    #comportamento do gladiador\n";

        //         if (tutorial.getLesson() == 'skin')
        //             tutorial.next(true)

        //         if (editor){
        //             if (editor.getValue() == ""){
        //                 editor.setValue(codigo);
        //                 editor.gotoLine(1,0,true);
        //             }
        //             editor.focus();
        //             $('#save, #test').removeClass('disabled');
        //             $('#fog-skin').hide();
        //             $('#back').click();

        //             const {gladCard} = await loader.load("gladcard")
        //             gladCard.load($('#fog-battle .glad-card-container'), {
        //                 customLoad: [{
        //                     name: nome,
        //                     vstr: vstr,
        //                     vagi: vagi,
        //                     vint: vint,
        //                     skin: JSON.stringify(pieces)
        //                 }]
        //             })

        //         }
        //     }
        //     codeEditor.saved = false;
        //     codeEditor.tested = false;
        // }

        // $('#back').click( function() {
        //     $('#distribuicao-container').hide();
        //     $('#skin-container').show();
        // });
        // $('#reset').click( function() {
        //     $('.img-button').removeClass('selected');
        //     $('.img-button .sub').addClass('hidden');
        //     $('#distribuicao #nome').val("");
        //     $('#distribuicao .slider').val(0).change();
        //     selected = {};
        //     for (var i in images){
        //         if (images[i].default)
        //             selected[images[i].id] = images[i];
        //     }
        //     reload_reqs();
        //     $('#distribuicao-container').hide();
        //     $('#skin-container').show();
        // });
        // $('.img-button.cat').click( function() {
        //     if (!$(this).hasClass('n-av')){
        //         $('.img-button.cat').removeClass('selected');
        //         $('.img-button.sub').removeClass('selected');

        //         $('.img-button.sub').addClass('hidden');
        //         $.each( menus[$(this).attr('id')], function(index, name) {
        //             $('#'+ name).removeClass('hidden');
        //         });

        //         $(this).addClass('selected');

        //         reload_reqs();
        //     }
        // });

        // $('.img-button.sub').click( function() {
        //     if (!$(this).hasClass('n-av')){
        //         $('.img-button.sub').removeClass('selected');
        //         $(this).addClass('selected');
        //         reload_reqs();
        //     }
        // });

        // $('#turn').click( function() {
        //     direction = (direction + 1)%4;
        //     draw();
        // });

        // $('#down-scale').click( function() {
        //     if (scale > 1)
        //         scale -= 0.5;
        //     draw();
        // });
        // $('#up-scale').click( function() {
        //     if (scale < 3.5)
        //         scale += 0.5;
        //     draw();
        // });
        // var j=0;
        // $('#play-pause').click( function(){
        //     if (animationOn){
        //         animationOn = false;
        //         j = 0;
        //         $(this).find('img').attr('src','sprite/images/play.png');
        //     }
        //     else{
        //         animationOn = true;
        //         $(this).find('img').attr('src','sprite/images/pause.png');
        //     }
        //     draw();
        // });

        // $('#animation').click( function(){
        //     var attacks = {'walk': true, 'cast': true, 'thrust': false, 'slash': false, 'shoot': false};
        //     $.each( selected, function(index,image) {
        //         if (image.move)
        //             attacks[image.move] = true;
        //     });

        //     do{
        //         anim_num = (anim_num + 1) % move.length;
        //     }while(!attacks[ move[anim_num].name ]);

        //     j = 0;

        //     $(this).find('img').attr('src', 'sprite/images/'+ move[anim_num].image +'.png' );
        // });

        // setInterval( function() {
        //     ctx.clearRect(0, 0, canvas.width, canvas.height);
        //     if (animationOn)
        //         j++;
        //     if ( j >= move[anim_num].sprites )
        //         j = 0;
        //     i = (direction + move[anim_num].line);
        //     //ctx.drawImage(spritesheet, j*64, i*64, 64, 64, 0, -5, 64, 64);
        //     ctx.drawImage(spritesheet, 192*j, 192*i, 192, 192, 192/2 - 192*scale/2, 192/2 - 192*scale/2 - 5, 192*scale, 192*scale);
        // }, 1000/10);

        // function calcAttrValue(slider) {
        //     if (slider == 0)
        //         return 0;
        //     return calcAttrValue(slider - 1) + Math.ceil(slider/6);
        // }

        // $(document).on('input change', '#distribuicao .slider', function() {
        //     $(this).parents('.slider-container').find('.slider-value').html(calcAttrValue($(this).val()));
        //     $(this).parents('.slider-container').find('.slider-input').val($(this).val());
        //     $('#get-code').prop('disabled','true');

        //     var soma = 0;
        //     $('#distribuicao .slider-value').each( function() {
        //         soma += parseInt($(this).html());
        //     });

        //     var numobj = $('#distribuicao #remaining span');
        //     numobj.html(50 - soma);

        //     if (soma == 50){
        //         $('#get-code').html("GERAR CÓDIGO");
        //         $('#get-code').removeAttr('disabled');
        //         numobj.css('color','#4caf50');
        //     }
        //     else if (soma > 50)
        //         numobj.css('color','#f44336');
        //     else
        //         numobj.css('color','black');
        // });

        // $('.close').click( function(){
        //     $('#fog-skin').hide();
        // });

    //     login.wait().then( data => {
    //         user = data
    //         if (loadGlad){
    //             selected = {};
    //             var skin;
    //             var errorSkin = false;
    //             try{
    //                 skin = JSON.parse(loadGlad.skin);
    //             }
    //             catch(error){
    //                 errorSkin = true;
    //                 skin = [];
    //             }
    //             for (var i in skin){
    //                 if (getImage(skin[i]))
    //                     selected[skin[i]] = getImage(skin[i]);
    //             }

    //             //console.log(selected);
    //             gladid = loadGlad.id;
    //             $('#distribuicao #nome').val(loadGlad.name);
    //             $('#distribuicao .slider').eq(0).val(loadGlad.vstr);
    //             $('#distribuicao .slider').eq(1).val(loadGlad.vagi);
    //             $('#distribuicao .slider').eq(2).val(loadGlad.vint);
    //             $('#distribuicao .slider').change();

    //             if (!errorSkin){
    //                 fetchSpritesheet(JSON.stringify(skin)).then( function(data){
    //                     createFloatCard({image: getSpriteThumb(data,'walk','down')});
    //                 });
    //             }

    //             codeEditor.saved = true;
    //         }
    //     });
    // });
// }

// function draw() {
//     var imgReady = 0;
//     var selectedArray = [];
//     for (var i in selected)
//         selectedArray.push(selected[i]);

//     selectedArray.sort(function(a, b){
//         return getLayer(a) - getLayer(b);
//     });

//     function getLayer(a){
//         var directionEnum = ['up', 'left', 'down', 'right'];
//         if (a.layer && a.layer.default){
//             if (a.layer[ directionEnum[direction] ])
//                 return a.layer[ directionEnum[direction] ];
//             else
//                 return a.layer.default;
//         }
//         return a.layer;

//     }

//     var img = new Array();
//     for(i=0 ; i < selectedArray.length ; i++){
//         if (selectedArray[i].path != '' && !selectedArray[i].png){
//             img[i] = new Image();
//             img[i].src = "sprite/Universal-LPC-spritesheet/" + selectedArray[i].path;
//             img[i].onload = function() {
//                 imgReady++;
//             };
//         }
//         else
//             imgReady++;
//     }

//     var tempss = document.createElement("canvas");
//     tempss.width = spritesheet.width;
//     tempss.height = spritesheet.height;
//     var tempctx = tempss.getContext("2d");

//     interval = setInterval( function() {
//         if (imgReady == selectedArray.length){
//             clearInterval(interval);
//             for(i=0 ; i < selectedArray.length ; i++){
//                 if (img[i]){
//                     if (selectedArray[i].oversize){
//                         var line = move[moveEnum[selectedArray[i].move]].line;
//                         var sprites = move[moveEnum[selectedArray[i].move]].sprites;
//                         for (let k=0 ; k<4 ; k++){
//                             for (let j=0 ; j<sprites ; j++){
//                                 tempctx.drawImage(img[i], j*192, k*192, 192, 192, j*192, line*192 + k*192, 192, 192);
//                             }
//                         }
//                     }
//                     else{
//                         for (let k=0 ; k<21 ; k++){
//                             for (let j=0 ; j<13 ; j++){
//                                 tempctx.drawImage(img[i], j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64);
//                             }
//                         }
//                     }
//                 }
//             }
//             spritectx.clearRect(0, 0, spritesheet.width, spritesheet.height);
//             spritectx.drawImage(tempss, 0, 0);
//         }
//     }, 10);
// }

