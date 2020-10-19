import {assets} from "./assets.js"

// var lastcolor = 'black';
// var direction = 2;
// var scale = 1;
// var animationOn = false;
// var selected = {};
// var parentTree = new Array();

// var anim_num = 0;
// var move = [
//     {'name': 'walk', 'sprites': 9, 'line': 8, 'image': 'walk'},
//     {'name': 'cast', 'sprites': 7, 'line': 0, 'image': 'magic'},
//     {'name': 'thrust', 'sprites': 8, 'line': 4, 'image': 'thrust'},
//     {'name': 'slash', 'sprites': 6, 'line': 12, 'image': 'slash'},
//     {'name': 'shoot', 'sprites': 13, 'line': 16, 'image': 'arrows'},
// ];
// var moveEnum = {'walk': 0, 'cast': 1, 'thrust': 2, 'slash': 3, 'shoot': 4};

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
        this.open(e.id)
    }))

    // $('.img-button.sub').click( function() {
    //     if (!$(this).hasClass('n-av')){
    //         $('.img-button.sub').removeClass('selected');
    //         $(this).addClass('selected');
    //         reload_reqs();
    //     }
    // });

    document.querySelector("#fog-skin .close").addEventListener("click", () => {
        this.active = false
        document.querySelector("#fog-skin").classList.add("hidden")
    })

    this.ready = true
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
        
        document.querySelector('#right-container').innerHTML = ""
        // for (let i in this.childTree)
        this.childTree[id].forEach(e => {
            this.loadItem(assets.getImage(e), e)
        })
    }
}

spriteGen.loadItem = function(info, name){
    // console.log(info, name)
    const prev = document.createElement("canvas")
    prev.setAttribute("width", 64)
    prev.setAttribute("height", 64)
    const prevctx = prev.getContext("2d")

    const img = new Image()
    img.src = info.png ? `sprite/images/${info.path}` : `sprite/Universal-LPC-spritesheet/${info.path}`
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
        } catch (err) {
            console.log(err)
        }
    }

    if (!document.querySelector(`#${name}.img-button.item`)){
        document.querySelector('#right-container').insertAdjacentHTML('beforeend', `<div class='img-button item' id='${name}'></div>`)
    }
    const item = document.querySelector(`#${name}.img-button.item`)
    item.appendChild(prev)

    if (info.default){
        item.classList.add('selected')
    }

    item.addEventListener('click', () => {
        const imageParent = Array.isArray(info.parent) ? info.parent : [info.parent]

        // for (let i in selected){
        //     var selectedParent = [];
        //     if (Array.isArray(selected[i].parent))
        //         selectedParent = selected[i].parent;
        //     else
        //         selectedParent.push(selected[i].parent);

        //     for (var j in selectedParent){
        //         for (var k in imageParent){
        //             if (selectedParent[j] == imageParent[k])
        //                 delete selected[i];
        //         }
        //     }
        // }
        // selected[image.id] = image;

        document.querySelectorAll('.img-button.item').forEach(e=> e.classList.remove('selected'))
        item.classList.add('selected')
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

// spriteGen.reload = function(){
//     // document.querySelector('#right-container').innerHTML = ""

//     // make 
//     assets.forAllImages((e,i) => {
//         if (e.parent){
//             function isParentSelected(e) {
//                 const isSelected = e => document.querySelector(`.img-button#${e}`).classList.contains('selected')
//                 return Array.isArray(e) ? e.some(e => isSelected(e)) : isSelected(e)
//             }
            
//             if (isParentSelected(e.parent)){
//                 this.visible.push(i)
//             }
//         }
//     })
// }

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

function load_glad_generator(element){

    element.load('glad-create.html', function(){
        // buildIndex();

        $('.img-button.sub').addClass('hidden');
        $('#middle-container').append(canvas);
        reload_reqs();

        $('.slider-container').on('touchstart mouseenter', function() {
            text = [
                {
                    'path': 'sprite/images/strength.png',
                    'title': 'Força - STR',
                    'description': 'Força física e resistência do gladiador.',
                    'list': [
                        {'path': 'sprite/images/decapitation.png',	'description': 'Dano físico, o dano causado com armas corpo-a-corpo'},
                        {'path': 'sprite/images/healing.png',	'description': 'Pontos de vida, responsáveis por manter o gladiador vivo'}
                    ]
                },
                {
                    'path': 'sprite/images/agility.png',
                    'title': 'Agilidade - AGI',
                    'description': 'Agilidade, rapidez e destreza do gladiador.',
                    'list': [
                        {'path': 'sprite/images/bullseye.png',	'description': 'Precisão, o dano causado com armas à distância'},
                        {'path': 'sprite/images/sprint.png',	'description': 'Velocidade de movimento dentro da arena'},
                        {'path': 'sprite/images/blades.png',	'description': 'Velocidade de execução de ataques'}
                    ]
                },
                {
                    'path': 'sprite/images/smart.png',
                    'title': 'Inteligência - INT',
                    'description': 'Rapidez de raciocínio e Capacidade intelectual do gladiador.',
                    'list': [
                        {'path': 'sprite/images/energy.png',	'description': 'Poder mágico, o dano causado com habilidades mágicas'},
                        {'path': 'sprite/images/3balls.png',	'description': 'Velocidade de execução de uma habilidade'},
                        {'path': 'sprite/images/energise.png',	'description': 'Pontos de habilidade, usados para lançar habilidades'}
                    ]
                },
            ];

            index = $('.slider-container').index($(this));
            $('#info #title img').attr('src', text[index].path);
            $('#info #title span').html(text[index].title);
            $('#info #body .fill').html(text[index].description);
            $('#info ul').html("");
            $.each( text[index].list , function(i, item) {
                $('#info ul').append("<li><img src='"+ item.path +"'><span>"+ item.description +"</span></li>");
            });

        });

        $('#save-glad').click( function() {
            $('#distribuicao-container').css({'display':'flex', 'height':$('#skin-container').outerHeight()});
            $('#skin-container').hide();

            var cvpoint = document.createElement('canvas');
            cvpoint.setAttribute("width", 64);
            cvpoint.setAttribute("height", 64);
            var pct = cvpoint.getContext("2d");
            pct.drawImage(canvas, 64, 64, 64, 64, 0, 0, 64, 64);
            $('#cv').html(cvpoint);

            codeEditor.saved = false;
            codeEditor.tested = false;
        });

        $('#get-code').click( function() {
            createFloatCard();
        });

        async function createFloatCard(arg){
            var nome = $('#distribuicao #nome').val();
            if (nome.length <= 2 || !nome.match(/^[\w À-ú]+?$/g) ){
                $('#distribuicao #nome').addClass('error');
                $('#distribuicao #nome').focus();
            }
            else{
                $('#distribuicao #nome').removeClass('error');

                pieces = []
                $.each( selected, function(index, image) {
                    pieces.push(image.id);
                });

                var vstr = $('#distribuicao .slider-input').eq(0).val();
                var vagi = $('#distribuicao .slider-input').eq(1).val();
                var vint = $('#distribuicao .slider-input').eq(2).val();
                var codigo = "loop(){\n    //comportamento do gladiador\n}";
                if (user.language == 'python')
                    codigo = "def loop():\n    #comportamento do gladiador\n";

                if (tutorial.getLesson() == 'skin')
                    tutorial.next(true)

                if (editor){
                    if (editor.getValue() == ""){
                        editor.setValue(codigo);
                        editor.gotoLine(1,0,true);
                    }
                    editor.focus();
                    $('#save, #test').removeClass('disabled');
                    $('#fog-skin').hide();
                    $('#back').click();

                    const {gladCard} = await loader.load("gladcard")
                    gladCard.load($('#fog-battle .glad-card-container'), {
                        customLoad: [{
                            name: nome,
                            vstr: vstr,
                            vagi: vagi,
                            vint: vint,
                            skin: JSON.stringify(pieces)
                        }]
                    })

                }
            }
            codeEditor.saved = false;
            codeEditor.tested = false;
        }

        $('#back').click( function() {
            $('#distribuicao-container').hide();
            $('#skin-container').show();
        });
        $('#reset').click( function() {
            $('.img-button').removeClass('selected');
            $('.img-button .sub').addClass('hidden');
            $('#distribuicao #nome').val("");
            $('#distribuicao .slider').val(0).change();
            selected = {};
            for (var i in images){
                if (images[i].default)
                    selected[images[i].id] = images[i];
            }
            reload_reqs();
            $('#distribuicao-container').hide();
            $('#skin-container').show();
        });
        $('.img-button.cat').click( function() {
            if (!$(this).hasClass('n-av')){
                $('.img-button.cat').removeClass('selected');
                $('.img-button.sub').removeClass('selected');

                $('.img-button.sub').addClass('hidden');
                $.each( menus[$(this).attr('id')], function(index, name) {
                    $('#'+ name).removeClass('hidden');
                });

                $(this).addClass('selected');

                reload_reqs();
            }
        });

        $('.img-button.sub').click( function() {
            if (!$(this).hasClass('n-av')){
                $('.img-button.sub').removeClass('selected');
                $(this).addClass('selected');
                reload_reqs();
            }
        });

        $('#turn').click( function() {
            direction = (direction + 1)%4;
            draw();
        });

        $('#down-scale').click( function() {
            if (scale > 1)
                scale -= 0.5;
            draw();
        });
        $('#up-scale').click( function() {
            if (scale < 3.5)
                scale += 0.5;
            draw();
        });
        var j=0;
        $('#play-pause').click( function(){
            if (animationOn){
                animationOn = false;
                j = 0;
                $(this).find('img').attr('src','sprite/images/play.png');
            }
            else{
                animationOn = true;
                $(this).find('img').attr('src','sprite/images/pause.png');
            }
            draw();
        });

        $('#animation').click( function(){
            var attacks = {'walk': true, 'cast': true, 'thrust': false, 'slash': false, 'shoot': false};
            $.each( selected, function(index,image) {
                if (image.move)
                    attacks[image.move] = true;
            });

            do{
                anim_num = (anim_num + 1) % move.length;
            }while(!attacks[ move[anim_num].name ]);

            j = 0;

            $(this).find('img').attr('src', 'sprite/images/'+ move[anim_num].image +'.png' );
        });

        setInterval( function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (animationOn)
                j++;
            if ( j >= move[anim_num].sprites )
                j = 0;
            i = (direction + move[anim_num].line);
            //ctx.drawImage(spritesheet, j*64, i*64, 64, 64, 0, -5, 64, 64);
            ctx.drawImage(spritesheet, 192*j, 192*i, 192, 192, 192/2 - 192*scale/2, 192/2 - 192*scale/2 - 5, 192*scale, 192*scale);
        }, 1000/10);

        function calcAttrValue(slider) {
            if (slider == 0)
                return 0;
            return calcAttrValue(slider - 1) + Math.ceil(slider/6);
        }

        $(document).on('input change', '#distribuicao .slider', function() {
            $(this).parents('.slider-container').find('.slider-value').html(calcAttrValue($(this).val()));
            $(this).parents('.slider-container').find('.slider-input').val($(this).val());
            $('#get-code').prop('disabled','true');

            var soma = 0;
            $('#distribuicao .slider-value').each( function() {
                soma += parseInt($(this).html());
            });

            var numobj = $('#distribuicao #remaining span');
            numobj.html(50 - soma);

            if (soma == 50){
                $('#get-code').html("GERAR CÓDIGO");
                $('#get-code').removeAttr('disabled');
                numobj.css('color','#4caf50');
            }
            else if (soma > 50)
                numobj.css('color','#f44336');
            else
                numobj.css('color','black');
        });

        $('.close').click( function(){
            $('#fog-skin').hide();
        });

        login.wait().then( data => {
            user = data
            if (loadGlad){
                selected = {};
                var skin;
                var errorSkin = false;
                try{
                    skin = JSON.parse(loadGlad.skin);
                }
                catch(error){
                    errorSkin = true;
                    skin = [];
                }
                for (var i in skin){
                    if (getImage(skin[i]))
                        selected[skin[i]] = getImage(skin[i]);
                }

                //console.log(selected);
                gladid = loadGlad.id;
                $('#distribuicao #nome').val(loadGlad.name);
                $('#distribuicao .slider').eq(0).val(loadGlad.vstr);
                $('#distribuicao .slider').eq(1).val(loadGlad.vagi);
                $('#distribuicao .slider').eq(2).val(loadGlad.vint);
                $('#distribuicao .slider').change();

                if (!errorSkin){
                    fetchSpritesheet(JSON.stringify(skin)).then( function(data){
                        createFloatCard({image: getSpriteThumb(data,'walk','down')});
                    });
                }

                codeEditor.saved = true;
            }
        });
    });
}

function draw() {
    var imgReady = 0;
    var selectedArray = [];
    for (var i in selected)
        selectedArray.push(selected[i]);

    selectedArray.sort(function(a, b){
        return getLayer(a) - getLayer(b);
    });

    function getLayer(a){
        var directionEnum = ['up', 'left', 'down', 'right'];
        if (a.layer && a.layer.default){
            if (a.layer[ directionEnum[direction] ])
                return a.layer[ directionEnum[direction] ];
            else
                return a.layer.default;
        }
        return a.layer;

    }

    var img = new Array();
    for(i=0 ; i < selectedArray.length ; i++){
        if (selectedArray[i].path != '' && !selectedArray[i].png){
            img[i] = new Image();
            img[i].src = "sprite/Universal-LPC-spritesheet/" + selectedArray[i].path;
            img[i].onload = function() {
                imgReady++;
            };
        }
        else
            imgReady++;
    }

    var tempss = document.createElement("canvas");
    tempss.width = spritesheet.width;
    tempss.height = spritesheet.height;
    var tempctx = tempss.getContext("2d");

    interval = setInterval( function() {
        if (imgReady == selectedArray.length){
            clearInterval(interval);
            for(i=0 ; i < selectedArray.length ; i++){
                if (img[i]){
                    if (selectedArray[i].oversize){
                        var line = move[moveEnum[selectedArray[i].move]].line;
                        var sprites = move[moveEnum[selectedArray[i].move]].sprites;
                        for (let k=0 ; k<4 ; k++){
                            for (let j=0 ; j<sprites ; j++){
                                tempctx.drawImage(img[i], j*192, k*192, 192, 192, j*192, line*192 + k*192, 192, 192);
                            }
                        }
                    }
                    else{
                        for (let k=0 ; k<21 ; k++){
                            for (let j=0 ; j<13 ; j++){
                                tempctx.drawImage(img[i], j*64, k*64, 64, 64, 64 + 3*j*64, 64 + 3*k*64, 64, 64);
                            }
                        }
                    }
                }
            }
            spritectx.clearRect(0, 0, spritesheet.width, spritesheet.height);
            spritectx.drawImage(tempss, 0, 0);
        }
    }, 10);
}

