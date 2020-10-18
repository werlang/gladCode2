export const spriteGen = {
    active: false,
    ready: false
}

spriteGen.init = async function(el){
    const template = await (await fetch('glad-create.html')).text()

    this.ready = true
}

function buildIndex(){
    for (let i=0 ; i<images.length ; i++) {
        imageIndex[ images[i].id ] = i;

        if (images[i].parent){
            if (Array.isArray(images[i].parent)){
                for (j in images[i].parent){
                    if (!parentTree[images[i].parent[j]]){
                        parentTree.push(images[i].parent[j]);
                        parentTree[images[i].parent[j]] = new Array();
                    }
                    parentTree[images[i].parent[j]].push(images[i].id);
                }
            }
            else{
                if (!parentTree[images[i].parent]){
                    parentTree.push(images[i].parent);
                    parentTree[images[i].parent] = new Array();
                }
                parentTree[images[i].parent].push(images[i].id);
            }
        }
        if (images[i].default)
            selected[images[i].id] = images[i];
    }
}


function load_glad_generator(element){

    element.load('glad-create.html', function(){
        buildIndex();

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