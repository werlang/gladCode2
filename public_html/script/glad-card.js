import {assets} from "./assets.js"
import {translator} from "./translate.js"
import {post} from "./utils.js"
import { login } from "./header.js"
import { loader } from "./loader.js";

const translatorReady = (async () => {
    await login.wait()
    await translator.translate([
        "Este gladiador está morto",
        "Este gladiador precisa ser atualizado",
        "Clique para remover o gladiador",
        "Ver código-fonte",
        "Força",
        "Agilidade",
        "Inteligência",
        "Abrir no editor",
        "Fechar"
    ])
    return true
})();

( () => {
    assets.fill()
})()

const gladCard = {}

gladCard.create = function(parent, index, skin, dead){
    fetchSpritesheet(skin).then( function(data){
        var frame = 'walk';
        if (dead)
            frame = 'die';
        parent.find('.glad-preview .image').eq(index).html(getSpriteThumb(data,frame,'down'));
    });
}

gladCard.appendImage = async function({container, data, dead}){
    const spriteSheet = await fetchSpritesheet(data)
    const frame = dead ? 'die' : 'walk'
    container.html(getSpriteThumb(spriteSheet, frame, 'down'))
}

export {gladCard}

function getImage(id){
    for (var i in assets.images){ //assets.images is in assets.js
        if (assets.images[i].id == id)
            return assets.images[i];
    }
    return false;
}

function getSpriteThumb(spritesheet, move, direction){
    var dirEnum = {
        'walk': 8,
        'cast': 0,
        'thrust': 4,
        'slash': 12,
        'shoot': 16,
        'up': 0,
        'left': 1,
        'down': 2,
        'right': 3,
    };
    var line = dirEnum[move] + dirEnum[direction];
    var row = 1;

    if (move == 'die'){
        row = 5;
        line = 20;
    }


    var thumb = document.createElement("canvas");
    thumb.setAttribute("width", 64);
    thumb.setAttribute("height", 64);
    var ctx = thumb.getContext("2d");
    ctx.drawImage(spritesheet, row*192 + 64, line*192 + 64, 64, 64, 0, 0, 64, 64); //10: linha do walk down
    return thumb;
}

function fetchSpritesheet(json) {
    var response = $.Deferred();
    var move = {
        'walk': {'sprites': 9, 'line': 8},
        'cast': {'sprites': 7, 'line': 0},
        'thrust': {'sprites': 8, 'line': 4},
        'slash': {'sprites': 6, 'line': 12},
        'shoot': {'sprites': 13, 'line': 16},
        'die': {'sprites': 6, 'line': 20}
    };

    var errorload = false;
    try{
        json = JSON.parse(json);
    }
    catch(error){
        errorload = true;
        json = {};
    }

    var spritesheet = document.createElement("canvas");
    spritesheet.setAttribute("width", 192 * 13);
    spritesheet.setAttribute("height", 192 * 21);
    var spritectx = spritesheet.getContext("2d");
    
    var imgReady = 0;
    var selectedArray = [];
    for (var i in json){
        if (getImage(json[i]))
            selectedArray.push(getImage(json[i]));
    }
    if (!assets.validateSkin(selectedArray))
        errorload = true;
    
    if (!errorload){
        selectedArray.sort(function(a, b){
            if (a.layer == null)
                return -1;
            else if (b.layer == null)
                return 1;
            else{
                if (typeof a.layer === 'object')
                    a.layer = a.layer.down;
                if (typeof b.layer === 'object')
                    b.layer = b.layer.down;
                return a.layer - b.layer;
            }
        });
        
        spritectx.clearRect(0, 0, spritesheet.width, spritesheet.height);
        var img = new Array();
        for(var i=0 ; i < selectedArray.length ; i++){
            if (selectedArray[i] && selectedArray[i].path != '' && !selectedArray[i].png){
                img[i] = new Image();	
                img[i].src = "sprite/Universal-LPC-spritesheet/" + selectedArray[i].path;
                img[i].onload = function() {
                    imgReady++;
                    if (imgReady == selectedArray.length){
                        drawSprite();
                        return response.resolve(spritesheet);
                    }
                };
            }
            else{
                imgReady++;
                if (imgReady == selectedArray.length){
                    drawSprite();
                    return response.resolve(spritesheet);
                }
            }
        }
            
        function drawSprite() {
            for(var i=0 ; i < selectedArray.length ; i++){
                if (img[i]){
                    if (selectedArray[i].oversize){
                        var line = move[selectedArray[i].move].line;
                        var sprites = move[selectedArray[i].move].sprites;
                        for (var k=0 ; k<4 ; k++){
                            for (var j=0 ; j<sprites ; j++){
                                spritectx.drawImage(img[i], j*192, k*192, 192, 192, j*192, line*192 + k*192, 192, 192);
                            }
                        }
                    }
                    else{
                        for (var k=0 ; k<21 ; k++){
                            for (var j=0 ; j<13 ; j++){
                                spritectx.drawImage(img[i], j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64);
                            }
                        }
                    }
                }
            }
        }
    }
    else{
        var img = new Image();	
        img.src = "res/glad.png";
        img.onload = function() {
            for (var k=0 ; k<21 ; k++){
                for (var j=0 ; j<13 ; j++){
                    spritectx.drawImage(img, j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64);
                }
            }
            return response.resolve(spritesheet);
        };
    }
    return response.promise();
}

// If using customLoad, you must provide following info:
// options.customLoad is an array for every gladiator card to be loaded
//      id, name, vstr, vagi, vint, skin are attributes from the gladiator, loaded from db
// options.dead: boolean. true if is to allow dead glad cards
//      customLoad[i].dead if glad is dead
// options.code: boolean. true if you want to show code button on the card
//      customLoad[i].code, customLoad[i].blocks
//      customLoad[i].oldversion: boolean. Show if the gladiator needs to be udated
// options.master: if you want to show master's name
//      customLoad[i].user is the master name
gladCard.load = async function(obj, options){
    return new Promise( resolve => {
        if (!options.customLoad){
            post("back_glad.php",{
                action: "GET",
            }).then( function(data){
                //console.log(data)
                load_data(data)
            });
        }
        else{
            load_data(options.customLoad);
        }
    
        async function load_data(data){
            await translatorReady

            if (!options.append){
                obj.find('.glad-preview').remove()
            }

            for (let i in data){
                let status = ''
                let title = ''
                if (options.dead && data[i].dead){
                    status = 'dead'
                    title = `title='${translator.getTranslated("Este gladiador está morto", false)}'`
                }
                else if (data[i].oldversion){
                    status = 'old'
                    title = `title='${translator.getTranslated("Este gladiador precisa ser atualizado", false)}'`
                }

                let template = `<div class="delete-container">
                    <div class="delete" title="${translator.getTranslated("Clique para remover o gladiador", false)}"><img src="icon/delete.png"></div>
                </div>
                <div class='image'></div>
                <div class='info'>
                    <div class='row attr'>
                        <div class='str' title='${translator.getTranslated("Força", false)}'><img src='res/str_icon.png'><span>${data[i].vstr}</span></div>
                        <div class='agi' title='${translator.getTranslated("Agilidade", false)}'><img src='sprite/images/sprint.png'><span>${data[i].vagi}</span></div>
                        <div class='int' title='${translator.getTranslated("Inteligência", false)}'><img src='res/int_icon.png'><span>${data[i].vint}</span></div>
                    </div>
                    <div class='row text'>
                        <div class='row glad'><span>${data[i].name}</span></div>
                        ${options.master ? `<div class='row master'>${data[i].user}</div>` : ''}
                    </div>
                    ${options.mmr ? `<div class='row mmr' title='${translator.getTranslated("Renome", false)}'><span>${parseInt(data[i].mmr)}</span><img src='icon/winner-icon.png'></div>` : ''}
                    ${options.code ? `<div class='row code'><button class='button' title='${translator.getTranslated("Ver código-fonte", false)}'>&lt;/&gt;</button></div>` : ''}
                </div>`

                let card = `<div class='glad-preview ${status}' ${title}>${template}</div>`

                obj.append(card)

                const realIndex = options.append ? obj.find('.glad-preview').length + parseInt(i) - 1 : i
                gladCard.appendImage({
                    container: obj.find('.glad-preview .image').eq(realIndex),
                    data: data[i].skin,
                    dead: options.dead && data[i].dead
                })

                card = obj.find(".glad-preview").last()
                card.data('id',data[i].id);

                if (options.code){
                    let code = data[i].code
                    let blocks = data[i].blocks

                    if (code){
                        card.find('.code .button').removeAttr('disabled')
                        card.find('.code .button').click(async function(e){
                            e.stopPropagation();

                            let editor = options.editor ? `<button class='button' id='editor'>${translator.getTranslated("Abrir no editor")}</button>` : ''

                            if (blocks && blocks.length){
                                let xml = blocks
                                $('body').append(`<div id='fog' class='code'>
                                    <div class='float-box'>
                                        <div id='code-ws'></div>
                                        <div id='button-container'>
                                            ${editor}
                                            <button class='button' id='close'>${translator.getTranslated("Fechar")}</button>
                                        </div>
                                    </div>
                                </div>`)
    
                                await loader.load('Blockly')
                                let ws = Blockly.inject('code-ws', {
                                    scrollbars: true,
                                    readOnly: true
                                });
                        
                                xmlDom = Blockly.Xml.textToDom(xml);
                                Blockly.Xml.domToWorkspace(xmlDom, ws);
                            }
                            else{
                                let language = "c"
                                if (code.indexOf("def loop():") != -1)
                                    language = "python"

                                $('body').append(`<div id='fog' class='code'>
                                    <div class='float-box'>
                                        <pre id='code' pre class='line-numbers language-${language}'><code class='language-${language}'>${code}</code></pre>
                                        <div id='button-container'>
                                            ${editor}
                                            <button class='button' id='close'>${translator.getTranslated("Fechar")}</button>
                                        </div>
                                    </div>
                                </div>`)

                                await loader.load('Prism')
                                Prism.highlightElement($('code')[0]);
                            }
        
                            $('#fog.code #close.button').click( function(){
                                $('#fog.code').remove()
                            })
                            $('#fog.code #editor.button').click( function(){
                                window.open(`glad-${data[i].id}`)            
                                $('#fog.code').remove()
                            })
                        });
                    }
                    else{
                        card.find('.code .button').prop('disabled', true)
                    }
                }
            }

            if (!options.code)
                obj.find('.glad-preview .code .button').remove();
            
            if (!options.remove)
                obj.find('.glad-preview .delete-container').remove();
            
            if (options.clickHandler)
                obj.find('.glad-preview').click(options.clickHandler);
            if (options.dblClickHandler)
                obj.find('.glad-preview').dblclick(options.dblClickHandler);

            resolve(data)
        }
    })
}