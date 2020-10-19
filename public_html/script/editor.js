import {loader} from "./loader.js"
import {header, login} from "./header.js"
import {createToast, Message, tooltip} from "./dialog.js"
import { post, waitFor } from "./utils.js"

header.load()

var gladid;
var pieces;
var wannaSave = false;
var sim

let user = false
let loadGlad = false

const codeEditor = {
    ready: false,
    saved: true,
    tested: true
}

const sampleGlads = {
    'Wanderer': {'difficulty': 1, 'filename': 'samples/gladbots/Wanderer.c'},
    'Runner': {'difficulty': 1, 'filename': 'samples/gladbots/Runner.c'},
    'Blinker': {'difficulty': 1, 'filename': 'samples/gladbots/Blinker.c'},
    'Arch': {'difficulty': 2, 'filename': 'samples/gladbots/Arch.c'},
    'Patient': {'difficulty': 2, 'filename': 'samples/gladbots/Patient.c'},
    'Warrior': {'difficulty': 2, 'filename': 'samples/gladbots/Warrior.c'},
    'Mage': {'difficulty': 2, 'filename': 'samples/gladbots/Mage.c'},
    'Rogue': {'difficulty': 2, 'filename': 'samples/gladbots/Rogue.c'},
    'Archie': {'difficulty': 3, 'filename': 'samples/gladbots/Archie.c'},
    'War Maker': {'difficulty': 3, 'filename': 'samples/gladbots/WarMaker.c'},
    'Magnus': {'difficulty': 3, 'filename': 'samples/gladbots/Magnus.c'},
    'Rouge': {'difficulty': 3, 'filename': 'samples/gladbots/Rouge.c'},
}

codeEditor.init = async function(){
    await loader.load("ace")

    const editor = ace.edit("code")

    editor.session.setUseSoftTabs(true)
    editor.session.setOption("tabSize", 4)
    editor.setTheme("ace/theme/dreamweaver")
    editor.setFontSize(18)
    editor.getSession().setUseWrapMode(true)
    editor.$blockScrolling = Infinity

    editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    });

    // get functions info
    fetch("script/functions.json").then(async data => {
        data = await data.json()
        const dataTable = Object.values(data).map(data => {
            return {
                name: data.name.default,
                syntax: data.syntax,
                description: data.description.brief,
                snippet: data.snippet
            }
        })
        // console.log(dataTable)

        // create snippet completer
        const langTools = ace.require("ace/ext/language_tools")
        langTools.addCompleter({
            getCompletions: function(editor, session, pos, prefix, callback) {
                if (prefix.length === 0) { callback(null, []); return }

                callback(null, dataTable.map( function(table) {
                    return {
                        value: table.syntax[editor.language],
                        caption: table.name,
                        snippet: table.snippet[editor.language],
                        description: table.description,
                        syntax: table.syntax[editor.language],
                        score: 1000,
                        meta: `gladCode-${editor.language}`
                    }
                }))
            },
            getDocTooltip: function(item) {
                if (item.meta.split('-')[0] == 'gladCode'){
                    let func
                    if (editor.language == 'c'){
                        func = `<b>${item.syntax.replace(/(int[ \*]{0,1} |float[ \*]{0,1} |double[ \*]{0,1} |char[ \*]{0,1} |void[ \*]{0,1})/g, "</b>$1<b>")}</b>`
                    }
                    else if (editor.language == 'python'){
                        func = `<b>${item.syntax}</b>`
                    }

                    item.docHTML = `${func}<hr>${item.description}<hr>${item.snippet}`
                }
                else if (item.snippet) {
                    item.docHTML = `<b>${item.caption}</b><hr>${item.snippet}`
                }
                // console.log(item)
            }
        })
    })

    editor.on("change", () => {
        this.saved = false
        this.tested = false

        const lang = getLanguage(editor.getValue())
        if (lang == "c" && editor.language != 'c'){
            editor.session.setMode("ace/mode/c_cpp")
            editor.language = 'c';
        }
        else if (lang == "python" && editor.language != 'python'){
            editor.session.setMode("ace/mode/python")
            editor.language = 'python'
        }

        // if (tutorial.enabled && user.language == 'blocks'){
        //     tutorial.show([
        //         'checkStep'
        //     ])
        // }

    });

    this.ready = true
    this.editor = editor
    editor.focus()

    return editor
}

codeEditor.isReady = function(){
    return waitFor(() => this.ready)
}

let editor
codeEditor.init().then( d => editor = d)

const buttons = {}

buttons.skin = {
    ready: false,
    init: async function(){
        const {spriteGen} = await loader.load("spritegen")
        await spriteGen.init(document.querySelector("#fog-skin"))

        this.ready = true
    },
    click: async function(){
        if (!this.ready){
            await this.init()
            this.ready = true
        }

        document.querySelector("#fog-skin").classList.remove("hidden")
        this.active = true
    }
}

buttons.open = {
    ready: false,
    init: function() {
        $('#fog-glads #btn-glad-cancel').click( function(){
            buttons.fade(document.querySelector('#fog-glads'))
        });
        $('#fog-glads #btn-glad-open').click( function(){
            if (codeEditor.saved){
                var id = $('#fog-glads .glad-preview.selected').data('id');
                window.location.href = "glad-"+id;
            }
            else{
                var name = $('#fog-glads .glad-preview.selected .glad span').html()
                new Message({
                    message: `Deseja abrir o gladiador <ignore><b>${name}</b></ignore> para edição? Todas alterações no gladiador atual serão perdidas`,
                    buttons: {yes: "Sim", no: "Não"}
                }).show().click('yes', () => {
                    codeEditor.saved = true;
                    var id = $('#fog-glads .glad-preview.selected').data('id');
                    window.location.href = "glad-"+id;
                })
            }
        });
    },
    click: async function(){
        const container = document.querySelector('#fog-glads .glad-card-container')
        if (container.innerHTML == ""){
            container.innerHTML = `<i class='fas fa-spinner fa-pulse'></i>`
        }

        if (!this.ready){
            this.init()
            this.ready = true
        }

        buttons.fade(document.querySelector('#fog-glads'))
        $('#fog-glads #btn-glad-open').prop('disabled',true);

        const {gladCard} = await loader.load("gladcard")
        const gladData = await gladCard.load(container, {
            remove: true,
            mmr: true
        })

        if (container.querySelector('.fa-spinner')){
            container.querySelector('.fa-spinner').remove()
        }

        if ($('#fog-glads .glad-preview').length == 0){
            window.location.href = "newglad";
        }

        $('#fog-glads .glad-preview').click( function(){
            $('#fog-glads #btn-glad-open').removeAttr('disabled');
            $('#fog-glads .glad-preview').removeClass('selected');
            $(this).addClass('selected');
        });

        $('#fog-glads .glad-preview').dblclick( function(){
            $('#fog-glads #btn-glad-open').click();
        });

        document.querySelectorAll('#fog-glads .glad-preview .delete').forEach((e,i) => {
            e.addEventListener('click', () => {
                const card = e.closest('.glad-preview')
                const glad = card.querySelector('.info .glad').textContent
                new Message({
                    message: `Deseja remover o gladiador <ignore><b>${glad}</b></ignore>?`,
                    buttons: {yes: "SIM", no: "NÃO"}
                }).show().click('yes', async () => {
                    card.style.opacity = 0.5
                    await post("back_glad.php",{
                        action: "DELETE",
                        id: gladData[i].id
                    })
                    card.remove()
                    createToast("Gladiador removido", "success")
                })
            })
        })
    }
}

buttons.test = {
    ready: false,
    init: function(){
        const num = ["","one","two","three"];
        let enemyBox = ""
        for (var i in sampleGlads){
            enemyBox += `<div class='glad'>
                <div class='name'>${i}</div>
                <div class='diff ${num[sampleGlads[i].difficulty]}'>
                    <div class='bar'></div><div class='bar'></div><div class='bar'></div>
                </div>
            </div>`
        }

        const sampleRows = document.createElement("DIV")
        sampleRows.innerHTML = enemyBox
        sampleRows.querySelectorAll('.glad').forEach((e,i) => {
            bindGladList(e, Object.values(sampleGlads)[i].filename)
            document.querySelector('#fog-battle #list').appendChild(e)
        })
        
        login.wait().then(async data => {
            user = data
            if (user.status == "SUCCESS" ){
                const data = await post("back_glad.php",{
                    action: "GET",
                })
                // console.log(data)

                let enemyBox = ""
                for (let i in data){
                    enemyBox += `<div class='glad'>
                        <div class='name'>${data[i].name}</div>
                        <div class='diff none'>
                            <div class='bar'></div><div class='bar'></div><div class='bar'></div>
                        </div>
                    </div>`
                }

                const myRows = document.createElement("DIV")
                myRows.innerHTML = enemyBox
                myRows.querySelectorAll('.glad').forEach((e,i) => {
                    bindGladList(e, data[i])
                    document.querySelector('#fog-battle #list').appendChild(e)
                })
            }
        })

        function bindGladList(obj, info){
            if (window.jQuery && obj instanceof jQuery){
                obj = $(obj)[0]
            }

            obj.addEventListener('click', function(){
                const filename = typeof info == "string" ? info : null
                if (obj.classList.contains('selected')){
                    obj.classList.remove('selected')
                    document.querySelector('#fog-battle .glad-card-container').innerHTML = ""
                }
                else if (document.querySelectorAll('#fog-battle #list .glad.selected').length < 4){
                    obj.classList.add('selected')
                    
                    loader.load("gladcard").then( ({gladCard}) => {
                        if (filename){
                            gladCard.getFromFile(filename).then(data => loadCard(data))
                        }
                        else{
                            loadCard(info)
                        }
    
                        function loadCard(data){
                            gladCard.load(document.querySelector('#fog-battle .glad-card-container'), {
                                code: true,
                                customLoad: [data]
                            })
                        }
                    })

                }

                const rows_selected = document.querySelectorAll('#fog-battle #list .glad.selected')
                if (rows_selected.length > 0){
                    const length = rows_selected.length
                    document.querySelector('#fog-battle #btn-battle').removeAttribute('disabled')
                    document.querySelector('#fog-battle #list-title span').innerHTML = length +" selecionados"
                }
                else{
                    document.querySelector('#fog-battle #btn-battle').setAttribute('disabled',true)
                    document.querySelector('#fog-battle #list-title span').innerHTML = ""
                }
            });
        }
    },
    click: function(){
        if (!this.ready){
            this.init()
            this.ready = true
        }

        if (!document.querySelector("#test").classList.contains('disabled')){
            showTestWindow()

            function showTestWindow(){
                // let t = tutorial.show([
                //     'checkStep',
                //     'oponent',
                //     'learnAttack',
                //     'checkAttack',
                //     'checkGetHit',
                //     'checkReact',
                //     'checkSafe',
                //     'checkFireball',
                //     'checkTeleport',
                //     'checkUpgrade',
                //     'checkBreakpoint'
                // ])
                let t = false

                if (t === false){
                    setLoadGlad();
                    if (!document.querySelector("#test").contains('disabled')){
                        buttons.fade(document.querySelector('#fog-battle'))
                        const name = document.querySelector('#float-card .glad-preview .glad span').innerHTML
                        document.querySelector('#fog-battle h3 span').innerHTML = name
                    }
                }
            }
        }

    }
}

buttons.fade = function(window){
    if (window.classList.contains("hidden")){
        window.classList.remove("hidden")
        window.classList.add("fade")
        setTimeout(() => window.classList.remove("fade"), 1)
    }
    else{
        window.classList.add("hidden")
    }
}

// handle editor resize when chat is toggled
login.wait().then( () => loader.load("chat").then( ({chat}) => {
    chat.init(document.querySelector('#chat-panel'), {
        full: false,
        expandWidth: "-65px"
    }).then( async () => {
        await codeEditor.isReady()
        document.querySelector('#chat-panel #show-hide').addEventListener('click', () => {
            change_size()
        })

        // $(window).resize( () => {
        //     setTimeout( () => {
        //         change_size();
        //     },1000);
        // })

        function change_size(){
            setTimeout(() => {
                const w = document.querySelector('#chat-panel').clientWidth
                document.querySelector('#panel-right').style.width = `${w}px`
                editor.resize()
                document.querySelector('#float-card').style['margin-right'] = `${w}px`
            }, 1000);
        }
    })
}))

loader.load("jquery").then( () => $(document).ready(async () => {
    $('#header-editor').addClass('here')
    await codeEditor.isReady()

    login.wait().then(async data => {
        //console.log(data);
        user = data
        if (user.status == "SUCCESS"){
            if (user.tutor == "1"){
                tutorial.enabled = true
                tutorial.show()
            }

            var pic = new Image();
            pic.src = user.foto;
            $('#profile-icon img').attr('src', pic.src);

            pic.onerror = function(){
                $('#profile-icon img').attr('src', "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=");
            }

            if (user.language == 'blocks'){
                blocks.toggle({active: true, create: true})
            }

            editor.setTheme("ace/theme/"+ user.theme);
            editor.setFontSize(user.font +"px");

            const glad = document.querySelector('#glad-code')
            if (glad){
                if (glad.innerHTML == "0"){
                    glad.remove()
                    buttons.skin.click()
                }
                else{
                    const glads = await post("back_glad.php", {
                        action: "GET"
                    })
                    // console.log(glads)
                    for (let i in glads){
                        if (glads[i].id == glad.innerHTML){
                            loadGlad = glads[i]
    
                            glad.remove()
    
                            if (loadGlad.blocks){
                                // TODO load blocks before use
                                blocks.toggle({active: true, load: true})
                            }
    
                            editor.setValue(loadGlad.code)
                            editor.gotoLine(1,0,true)
                            codeEditor.saved = true
                            codeEditor.tested = true
    
                            break
                        }
                    }
                }
            }
            else{
                buttons.open.click()
            }
        }
        else{
            buttons.skin.click()
        }

    });

    document.querySelector('#header-container').classList.add('small')

    $('#float-card .glad-preview').click( function(){
        buttons.skin.click()
    });

    // mobile only
    $('#panel-left-opener').click( function(){
        if ($(this).hasClass('open')){
            $('#panel-left').width(0).addClass('hidden');
            $(this).removeClass('open');
        }
        else{
            $('#panel-left').width(65).removeClass('hidden');
            $(this).addClass('open');
        }
    });

    $('#profile-icon').click(async function(){
        if (user.logged){
            window.location.href = "glads"
        }
        else{
            const {google} = await loader.load("google")
            google.login().then( () => {
                window.location.reload()
            })
        }
    });

    $('#new').click( function(){
        if (codeEditor.saved)
            window.location.href = "newglad";
        else{
            new Message({
                message: "Deseja criar um novo gladiador e perder as alterações feitas no gladiador atual?",
                buttons: {yes: "Sim", no: "Não"}
            }).show().click('yes', () => {
                codeEditor.saved = true
                window.location.href = "newglad"
            })
        }
    });

    $('#open').click(async function(){
        if (!$(this).hasClass('disabled')){
            if (!user.logged){
                new Message({
                    message: "Você precisa fazer LOGIN no sistema para visualizar seus gladiadores",
                    buttons: {cancel: "Cancelar", ok: "LOGIN"}
                }).show().click('ok', async () => {
                    const {google} = await loader.load("google")
                    google.login().then(function(data) {
                        //console.log(data);
                        user = data.email;
                        setLoadGlad();
                        $('#login').html(data.nome).off().click( function(){
                            window.location.href = "news";
                        });
                        buttons.open.click()
                    });
                });
            }
            else{
                buttons.open.click()
            }
        }
    });

    $('#save').click( function(){
        if (!$(this).hasClass('disabled')){
            if (user.logged){
                setLoadGlad();
                //console.log(loadGlad);

                getBannedFunctions(editor.getValue()).then( function(banned){
                    if (banned.length){
                        var msg = "Você possui funções em seu código que são permitidas somente para teste. Remova-as e tente salvar novamente.<ul>Funções:";
                        for (let i in banned){
                            msg += `<li><b>${banned[i]}</b></li>`;
                        }
                        msg += "</ul>"
                        showMessage(msg);
                    }
                    else if (codeEditor.tested){
                        var action = "INSERT";
                        if (gladid)
                            action = "UPDATE";
                        var nome = $('#distribuicao #nome').val();

                        let args = {
                            action: action,
                            id: gladid,
                            nome: nome,
                            vstr: $('#float-card .glad-preview .info .attr .str span').html(),
                            vagi: $('#float-card .glad-preview .info .attr .agi span').html(),
                            vint: $('#float-card .glad-preview .info .attr .int span').html(),
                            skin: JSON.stringify(pieces),
                        }

                        if (loadGlad.blocks)
                            args.blocks = loadGlad.blocks

                        // console.log(args)
                        post("back_glad.php", args).then( function(data){
                            //console.log(data);
                            $('#fog').remove();
                            if (data.search("LIMIT") != -1)
                                new Message({message: `Você não pode possuir mais de <ignore><b>${data.LIMIT}</b></ignore> gladiadores simultaneamente. Aumente seu nível de mestre para desbloquear mais gladiadores.`}).show();
                            else if (data == "EXISTS")
                                new Message({message: `O nome <ignore><b>${nome}</b></ignore> já está sendo usado por outro gladiador`}).show();
                            else if (data == "INVALID")
                                new Message({message: `CHEATER`}).show();
                            else if (data.search("ID") != -1){
                                gladid = JSON.parse(data).ID;
                                if (action == "INSERT"){
                                    new Message({
                                        message: `O gladiador <ignore><b>${nome}</b></ignore> foi criado e gravado em seu perfil. Deseja inscrevê-lo para competir contra outros gladiadores?`,
                                        buttons: {yes: "Sim", no: "Agora não"}
                                    }).show().click('yes', () => {
                                        window.open('battle.ranked')
                                    })
                                }
                                else{
                                    new Message({message: `Gladiador <ignore><b>${nome}</b></ignore> gravado`}).show();
                                }
                                codeEditor.saved = true;
                            }
                        });
                    }
                    else{
                        $('body').append(`<div id='fog'>
                            <div id='save-box'>
                                <div id='message'>Gravando alterações no gladiador <span class='highlight'>${loadGlad.name}</span>. Aguarde...</div>
                                <div id='button-container'><button class='button'>OK</button></div>
                            </div>
                        </div>`);

                        var sample = {
                            "Archie": sampleGlads['Archie'],
                            "War Maker": sampleGlads['War Maker'],
                            "Magnus": sampleGlads['Magnus'],
                            "Rouge": sampleGlads['Rouge']
                        };

                        var glads = [];
                        for (let i in sample){
                            var filename = `samples/gladbots/${sample[i].filename}.c`;
                            getGladFromFile(filename).then( function(data){
                                glads.push(data.code);
                                if (glads.length == 4)
                                    loadReady(glads);
                            });
                        }

                        function loadReady(glads){
                            btnbattle_click($('#save-box button'), glads).then( hash => {
                                // console.log(hash);
                                if (hash !== false){
                                    post("back_log.php", {
                                        action: "DELETE",
                                        hash: hash
                                    });

                                    codeEditor.tested = true;
                                    $('#save').click();
                                }
                                else{
                                    $('#fog').remove();
                                }
                            });
                        }
                    }
                });
            }
            else{
                new Message({
                    message: `Você precisa fazer LOGIN no sistema para salvar seu gladiador`,
                    buttons: {cancel: "Cancelar", ok: "LOGIN"}
                }).show().click('ok', async () => {
                    const {google} = await loader.load("google")
                    google.login().then(function(data) {
                        //console.log(data);
                        user = data.email;
                        setLoadGlad();
                        $('#login').html(data.nome).off().click( function(){
                            window.location.href = "news";
                        });
                    });
                });
            }
        }
    });

    $('#skin').click( function(){
        buttons.skin.click()
    });

    $('#test').click( function(){
        buttons.test.click()
    })



    var progbtn;
    $('#fog-battle #btn-cancel').click( function(){
        if (progbtn && progbtn.isActive()){
            progbtn.kill();
            if (sim && sim.running)
                sim.abort();
        }
        else
            $('#fog-battle').hide();
    });

    $('#fog-battle #btn-battle').click( function(){
        var glads = [];
        var totalGlads = $('#fog-battle #list .glad.selected').length;
        $('#fog-battle #list .glad.selected').each( function(){
            var selected = $(this)
            var name = $(this).find('.name').html();
            if (!selected.data('info')){
                const filename = sampleGlads[name].filename
                getGladFromFile(filename).then( function(data){
                    glads.push(data.code);
                    if (glads.length == totalGlads)
                        loadReady(glads);
                });
            }
            //my own glads
            else{
                glads.push(selected.data('info').id);
                if (glads.length == totalGlads)
                    loadReady(glads);
            }
        });

        function loadReady(glads){
            btnbattle_click($('#fog-battle #btn-battle'), glads).then( hash => {
                if (hash !== false){
                    new Message({
                        message: `Deseja visualizar a batalha?`,
                        buttons: {yes: "Sim", no: "Não"}
                    }).show().click(null, data => {
                        if (data.button == "yes")
                            window.open("play/"+ hash);
                        else{
                            post("back_log.php", {
                                action: "DELETE",
                                hash: hash
                            });
                        }
                        if (wannaSave){
                            new Message({
                                message: `Gladiador testado com sucesso. Deseja gravá-lo?`,
                                buttons: {yes: "Sim", no: "Não"}
                            }).show().click('yes', () => {
                                $('#save').click();
                            });
                            wannaSave = false;
                        }

                        tutorial.show([
                            'watchCodeMove',
                            'moveBackForth',
                            'askMoveNext',
                            'detectEnemy',
                            'getHit',
                            'reactHit',
                            'safe',
                            'fireball',
                            'teleport',
                            'upgrade',
                            'breakpoint'
                        ])
                    });
                    progbtn.kill();
                    //$('#fog-battle #btn-cancel').removeAttr('disabled');
                    $('#fog-battle').hide();
                }
            });
        }
    });

    async function btnbattle_click(btn, glads){
        progbtn = new ProgressButton(btn, ["Executando batalha...","Aguardando resposta do servidor"]);

        var breakpoints = [];
        $('.ace_breakpoint').each( function() {
            breakpoints.push($(this).text());
        });
        if (!breakpoints.length)
            breakpoints = false;

        glads.push(loadGlad.code);

        return new Promise( (resolve, reject) => {
            // console.log(glads)
            sim = new Simulation({
                glads: glads,
                savecode: true,
                origin: "editor",
                single: true,
                breakpoints: breakpoints,
                terminal: true,
            })
            sim.run().then( data => {
                // console.log(data);
                if (data.error){
                    //$('#fog-battle #btn-cancel').removeAttr('disabled');
                    $('#fog-battle').hide();
                    resolve(false);
                }
                else{
                    resolve(data.simulation);
                }
                progbtn.kill();
            })
        });
    }

    $('#switch').click( function(){
        blocks.toggle({ask: true})
    })

    $('#settings').click( function(){
        var themes = ["ambiance", "chaos", "chrome", "clouds", "clouds_midnight", "cobalt", "crimson_editor", "dawn", "dracula", "dreamweaver", "eclipse", "github", "gob", "gruvbox", "idle_fingers", "iplastic", "katzenmilch", "kr_theme", "kuroir", "merbivore", "merbivore_soft", "mono_industrial", "monokai", "pastel_on_dark", "solarized_dark", "solarized_light", "sqlserver", "terminal", "textmate", "tomorrow", "tomorrow_night_blue", "tomorrow_night_bright", "tomorrow_night_eighties", "tomorrow_night", "twilight", "vibrant_ink", "xcode"];

        $('body').append("<div id='fog'><div id='settings-window'><div id='title'><h2>Preferências do editor</h2></div><div id='settings-content'><div id='options'><h3>Temas</h3><div id='list'></div><h3>Tamanho da fonte</h3><div id='font-size'><button class='button font-small'><img src='icon/font_minus.png'></button><button class='button font-big'><img src='icon/font_plus.png'></button></div></div><div id='sample'><h3>Visualização</h3><pre id='code-sample'></pre></div></div><div id='button-container'><button class='button' id='cancel'>Cancelar</button><button class='button' id='change'>ALTERAR</button></div></div></div>");

        for (var i in themes){
            $('#settings-window #list').append("<div class='theme'>"+ themes[i] +"</div>");
            if (user.logged && user.theme == themes[i] || !user.logged && themes[i] == "dreamweaver")
                $('#settings-window #list .theme').last().addClass('selected');
        }

        var sample = ace.edit("code-sample");
        if (user.logged){
            sample.setTheme("ace/theme/"+ user.theme);
            sample.setFontSize(user.font +"px");
        }
        sample.getSession().setMode("ace/mode/c_cpp");
        sample.setReadOnly(true);

        sample.setValue("int start = 1;\n\nloop(){\n    upgradeSTR(5);\n    if (getCloseEnemy()){\n        float dist = getDist(getTargetX(), getTargetY());\n        if (dist < 0.8 && isTargetVisible()){\n            attackMelee();\n        }\n        else\n            moveToTarget();\n    }\n    else{\n        if (start){\n            if(moveTo(12.5,12.5))\n                start = 0;\n        }\n        else\n            turnLeft(50);\n    }\n}", -1);

        $('#settings-window #list .theme').click( function(){
            $('#settings-window #list .theme').removeClass('selected');
            $(this).addClass('selected');

            var theme = $(this).html();
            sample.setTheme("ace/theme/"+theme);
        });

        $('#settings-window #font-size .button').click( function(){
            var font = parseInt(sample.getFontSize());
            if ($(this).hasClass('font-small')){
                sample.setFontSize(font-2);
            }
            else if ($(this).hasClass('font-big')){
                sample.setFontSize(font+2);
            }
            sample.resize();
        });

        $('#settings-window #cancel').click( function(){
            $('#fog').remove();
        });
        $('#settings-window #change').click( function(){
            var theme = sample.getTheme().split("/")[2];
            var font = parseInt(sample.getFontSize());

            editor.setTheme(sample.getTheme());
            editor.setFontSize(sample.getFontSize());
            $('#fog').remove();

            if (user.logged){
                post("back_login.php",{
                    action: "EDITOR",
                    theme: theme,
                    font: font
                }).then( function(){
                    user.theme = theme;
                    user.font = font;
                });
            }
        });
    });

    $('#help').click( function(){
        $('body').append("<div id='fog'><div id='help-window'><div id='title'>Que tipo de ajuda você gostaria?</div><div id='cat-container'><div id='docs' class='categories'><img src='icon/document.png'><span>Leitura</span></div><div id='video' class='categories'><img src='icon/video.png'><span>Vídeo</span></div><div id='tutorial' class='categories'><img src='icon/tutor.png'><span>Tutorial</span></div></div>");

        $('#fog').hide().fadeIn();
        $('#fog').click( function(){
            $(this).remove();
        });

        $('#help-window #tutorial').click( function(){
            tutorial.enabled = true
            tutorial.show();
        });
        $('#help-window #docs').click( function(e){
            e.stopPropagation();
            if (!$(this).hasClass('selected')){
                $('#help-window .categories').removeClass('selected');
                $(this).addClass('selected');
                $('#help-window #subcat').remove();
                $('#help-window').append("<div id='subcat'><a href='manual' class='button' target='_blank'>Manual da gladCode</a><a href='docs' class='button' target='_blank'>Referência das funções</a></div>");
                $('#help-window #subcat').hide().slideDown();
            }
        });
        $('#help-window #video').click( function(e){
            e.stopPropagation();
            if (!$(this).hasClass('selected')){
                $('#help-window .categories').removeClass('selected');
                $(this).addClass('selected');
                $('#help-window #subcat').remove();
                $('#help-window').append("<div id='subcat'><button class='video button' data-video='te1M98UDKiM'>Introdução e conceitos</button><button class='video button' data-video='tjMjqQ14AS8'>Editor de gladiadores</button><button class='video button' data-video='Wrc-0_Kq-_4'>Programando gladiadores</button><button class='video button' data-video='5QQtfruq8_8'>Habilidades e efeitos</button><button class='video button' data-video='hzxe5rmyODI'>Programação com blocos</button></div>");
                $('#help-window #subcat').hide().slideDown();

                $('#help-window .video.button').click( function(){
                    $('#fog').remove();
                    var vid = $(this).data('video');
                    $('body').append("<div id='fog' class='dark'><div id='video-container'><iframe width='100%' height='100%' src='https://www.youtube.com/embed/"+ vid +"' frameborder='0' allowfullscreen></iframe><div id='remove'></div></div></div>");
                    $('#fog').hide().fadeIn();

                    $('#fog #remove').click( function(){
                        $('#fog').remove();
                    });
                });
            }
        });
    });

    // editor.on("guttermousedown", function(e) {
    //     var target = e.domEvent.target;

    //     if (e.domEvent.button != 0) //left mouse button
    //         return;

    //     if (target.className.indexOf("ace_gutter-cell") == -1){
    //         return;
    //     }

    //     if (!editor.isFocused()){
    //         return;
    //     }

    //     var breakpoints = e.editor.session.getBreakpoints(row, 0);
    //     var row = e.getDocumentPosition().row;

    //     var Range = require('ace/range').Range;

    //     // If there's a breakpoint already defined, it should be removed, offering the toggle feature
    //     if(typeof breakpoints[row] === typeof undefined){
    //         let lang = getLanguage(editor.getValue())
    //         var brackets = 0;
    //         for (let i=0 ; i < editor.session.getLength() ; i++){
    //             var line = editor.session.getLine(i);
    //             var ln = parseInt($(target).text()) - 1;

    //             if (i == ln){
    //                 var rowdif = row;
    //                 if (editor.session.getLine(ln).indexOf("else") != -1){
    //                     rowdif = row + 1;
    //                 }

    //                 if ((lang == 'c' && brackets == 0) || (lang == 'python' && line.indexOf('  ') == -1)){
    //                     new Message({message: `Breakpoints só podem ser inseridos dentro de funções`}).show();
    //                 }
    //                 else{
    //                     e.editor.session.setBreakpoint(rowdif);

    //                     var marker = editor.session.getMarkers();
    //                     var marked = false;
    //                     for (let i in marker){
    //                         if (marker[i].clazz == 'line-breakpoint' && marker[i].range.start.row == rowdif){
    //                             marked = true;
    //                         }
    //                     }
    //                     if (!marked)
    //                         editor.session.addMarker(new Range(rowdif,0,rowdif,1),'line-breakpoint','fullLine');
    //                 }

    //             }

    //             if (lang == 'c'){
    //                 if (line.indexOf("{") != -1)
    //                     brackets++;
    //                 if (line.indexOf("}") != -1)
    //                     brackets--;
    //             }
    //         }

    //     }else{
    //         e.editor.session.clearBreakpoint(row);

    //         var marker = editor.session.getMarkers();
    //         for (let i in marker){
    //             if (marker[i].clazz == 'line-breakpoint' && marker[i].range.start.row == row){
    //                 editor.session.removeMarker(marker[i].id);
    //             }
    //         }
    //     }

    //     e.stop();
    // });

    // editor.on("guttermouseup", function(e) {
    // });
}))

// trying to leave page
window.onbeforeunload = function() {
    return codeEditor.saved ? null : true
}

function setLoadGlad(){
    loadGlad = {};
    var skin = [];
    for (var i in selected)
        skin.push(i);
    loadGlad.skin = JSON.stringify(skin);
    loadGlad.id = gladid;
    loadGlad.user = user.apelido;
    loadGlad.name = $('#distribuicao #nome').val();
    loadGlad.vstr = $('#distribuicao .slider').eq(0).val();
    loadGlad.vagi = $('#distribuicao .slider').eq(1).val();
    loadGlad.vint = $('#distribuicao .slider').eq(2).val();
    delete loadGlad.blocks

    var language = getLanguage(editor.getValue());
    if (language == "c"){
        var setup = `setup(){\n    setName(\"${loadGlad.name}\");\n    setSTR(${loadGlad.vstr});\n    setAGI(${loadGlad.vagi});\n    setINT(${loadGlad.vint});\n    setSkin(\"${loadGlad.skin}\");\n    setUser(\"${loadGlad.user}\");\n    setSlots(\"-1,-1,-1,-1\");\n}\n\n`;
        loadGlad.code = setup + editor.getValue();
    }
    else if (language == "python" || language == 'blocks'){
        var setup = `def setup():\n    setName(\"${loadGlad.name}\")\n    setSTR(${loadGlad.vstr})\n    setAGI(${loadGlad.vagi})\n    setINT(${loadGlad.vint})\n    setSkin(\"${loadGlad.skin}\")\n    setUser(\"${loadGlad.user}\")\n    setSlots(\"-1,-1,-1,-1\")\n# start of user code\n`;
        loadGlad.code = setup + editor.getValue();

        if (language == 'blocks'){
            loadGlad.blocks = blocks.save()
        }
    }
}

async function getBannedFunctions(code){
    return new Promise( (resolve, reject) => {
        $.getJSON("banned_functions.json", function(banned){
            banned = banned.functions;
            var found = [];
            for (let i in banned){
                if (code.indexOf(banned[i]) != -1)
                    found.push(banned[i]);
            }
            resolve(found);
        });
    });
}

function getLanguage(code){
    var language = "c";
    if (blocks.active)
        language = 'blocks'
    else if (code.indexOf("def loop():") != -1)
        language = "python";

    return language;
}

const blocks = {
    ready: false,
    active: false
}

blocks.toolbox = async function(){
    const tabs = [
        {pt: "Lógica", en: "Logic"},
        {pt: "Repetições", en: "Loops"},
        {pt: "Matemática", en: "Math"},
        {pt: "Valores", en: "Values"},
        {pt: "Variáveis", en: "Variables"},
        {pt: "Funções", en: "Functions"},
        {pt: "Melhorias", en: "Upgrade"},
        {pt: "Movimentação", en: "Movement"},
        {pt: "Ataque", en: "Attack"},
        {pt: "Informações", en: "Information"},
        {pt: "Percepção", en: "Perception"},
        {pt: "Habilidades", en: "Abilities"},
        {pt: "Itens", en: "Items"},
    ]

    let xml_text = await (await fetch("blockly_toolbox.xml")).text()

    const user = await login.wait()
    if (user.speak != 'pt'){
        tabs.forEach(e => {
            const pattern = new RegExp(`category name="${e.pt}"`, 'g')
            xml_text = xml_text.replace(pattern, `category name="${e[user.speak]}"`)
        })
    }
    return xml_text
}

blocks.init = async function(){
    if (this.ready){
        return this.Blockly
    }

    const {Blockly} = await loader.load("Blockly")
    this.Blockly = Blockly

    this.editor = {};

    document.querySelector('#blocks').innerHTML = await this.toolbox()
    
    this.editor.workspace = Blockly.inject('blocks', {
        toolbox: document.querySelector('#blocks #toolbox'),
        zoom: { controls: true },
        grid: { spacing: 20, length: 0, snap: true },
        scrollbars: true,
        trashcan: true
    })

    this.editor.workspace.addChangeListener( () => {
        const code = Blockly.Python.workspaceToCode(this.editor.workspace)

        if (code != "def loop():\n  pass\n"){
            editor.setValue(code)
            // console.log(code)
        }
    })

    const loop = `<xml><block type="loop" x="60" y="50"></block></xml>`;
    const xmlDom = Blockly.Xml.textToDom(loop);
    Blockly.Xml.domToWorkspace(xmlDom, this.editor.workspace)

    this.ready = true
    codeEditor.saved = true
    codeEditor.tested = true

    return Blockly
}

blocks.toggle = async function({active = null, ask = false, load = false, create = false} = {}){
    const Blockly = await this.init()

    if (create){
        const loop = `<xml><block type="loop" x="60" y="50"></block></xml>`;
        const xmlDom = Blockly.Xml.textToDom(loop);
        Blockly.Xml.domToWorkspace(xmlDom, this.editor.workspace)
    }
    else if (load){
        this.load({xml: loadGlad.blocks})
    }

    new ResizeObserver(() => {
        Blockly.svgResize(this.editor.workspace);
    }).observe(document.querySelector('#blocks'))

    if (active === true || active === false){
        this.active = active
    }
    else{
        this.active = !this.active
    }

    if (!this.active){
        document.querySelector('#blocks').classList.remove('active')
        document.querySelector('#code').classList.add('active')

        this.active = false

        document.querySelector('#switch i').classList.remove('fa-code')
        document.querySelector('#switch i').classList.add('fa-puzzle-piece')
        document.querySelector('#switch').title = 'Alternar para editor de blocos'
        tooltip()

        const code = Blockly.Python.workspaceToCode(this.editor.workspace)
        editor.setValue(code)
        editor.gotoLine(1,0,true)
        editor.focus()
    }
    else if (!ask){
        change()
    }
    else{
        this.active = false
        new Message({
            message: `Se você alternar para o editor de blocos perderá seu código. Deseja continuar?`,
            buttons: {yes: "SIM", no: "NÃO"}
        }).show().click('yes', () => {
            change()
        });
    }

    function change(){
        document.querySelector('#blocks').classList.add('active')
        document.querySelector('#code').classList.remove('active')

        blocks.active = true

        document.querySelector('#switch i').classList.remove('fa-puzzle-piece')
        document.querySelector('#switch i').classList.add('fa-code')
        
        document.querySelector('#switch').title = 'Alternar para editor de código'
        tooltip()
    }
}

blocks.save = async function(){
    const Blockly = await this.init()
    const xmlDom = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    return Blockly.Xml.domToText(xmlDom);
}

blocks.load = async function({path, xml}){
    const Blockly = await this.init()

    if (path){
        xml = await (await fetch(path)).text()
    }

    Blockly.mainWorkspace.clear()
    const dom = Blockly.Xml.textToDom(xml)
    Blockly.Xml.domToWorkspace(dom, Blockly.mainWorkspace)
}

