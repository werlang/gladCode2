import { loader } from "./loader.js"
import { header, login } from "./header.js"
import { createToast, Message } from "./dialog.js"
import { post, waitFor } from "./utils.js"
import { tutorial } from "./tutorial.js"

header.load()

var wannaSave = false;

let user = false
let loadGlad = {}
let blocks = false

const codeEditor = {
    ready: false,
    saved: true,
    tested: true
}

const sampleGlads = {
    'Wanderer':  {'difficulty': 1, 'filename': 'samples/gladbots/Wanderer.c'},
    'Runner':    {'difficulty': 1, 'filename': 'samples/gladbots/Runner.c'},
    'Blinker':   {'difficulty': 1, 'filename': 'samples/gladbots/Blinker.c'},
    'Arch':      {'difficulty': 2, 'filename': 'samples/gladbots/Arch.c'},
    'Patient':   {'difficulty': 2, 'filename': 'samples/gladbots/Patient.c'},
    'Warrior':   {'difficulty': 2, 'filename': 'samples/gladbots/Warrior.c'},
    'Mage':      {'difficulty': 2, 'filename': 'samples/gladbots/Mage.c'},
    'Rogue':     {'difficulty': 2, 'filename': 'samples/gladbots/Rogue.c'},
    'Archie':    {'difficulty': 3, 'filename': 'samples/gladbots/Archie.c'},
    'War Maker': {'difficulty': 3, 'filename': 'samples/gladbots/WarMaker.c'},
    'Magnus':    {'difficulty': 3, 'filename': 'samples/gladbots/Magnus.c'},
    'Rouge':     {'difficulty': 3, 'filename': 'samples/gladbots/Rouge.c'},
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

        const value = editor.getValue()
        loadGlad.code = value
        const lang = getLanguage(value)
        if (lang == "c" && editor.language != 'c'){
            editor.session.setMode("ace/mode/c_cpp")
            editor.language = 'c';
        }
        else if (lang == "python" && editor.language != 'python'){
            editor.session.setMode("ace/mode/python")
            editor.language = 'python'
        }

        if (tutorial.enabled && user.language == 'blocks'){
            tutorial.show([
                'checkStep'
            ])
        }
    });

    this.ready = true
    this.editor = editor
    editor.focus()

    // breakpoints
    editor.on("guttermousedown", function(e) {
        var target = e.domEvent.target;

        if (e.domEvent.button != 0) //left mouse button
            return;

        if (target.className.indexOf("ace_gutter-cell") == -1){
            return;
        }

        if (!editor.isFocused()){
            return;
        }

        const row = e.getDocumentPosition().row;
        const breakpoints = e.editor.session.getBreakpoints(row, 0);

        const Range = require('ace/range').Range;

        // If there's a breakpoint already defined, it should be removed, offering the toggle feature
        if(typeof breakpoints[row] === typeof undefined){
            let lang = getLanguage(editor.getValue())
            var brackets = 0;
            for (let i=0 ; i < editor.session.getLength() ; i++){
                var line = editor.session.getLine(i);
                var ln = parseInt($(target).text()) - 1;

                if (i == ln){
                    var rowdif = row;
                    if (editor.session.getLine(ln).indexOf("else") != -1){
                        rowdif = row + 1;
                    }

                    if ((lang == 'c' && brackets == 0) || (lang == 'python' && line.indexOf('  ') == -1)){
                        new Message({message: `Breakpoints só podem ser inseridos dentro de funções`}).show();
                    }
                    else{
                        e.editor.session.setBreakpoint(rowdif);

                        var marker = editor.session.getMarkers();
                        var marked = false;
                        for (let i in marker){
                            if (marker[i].clazz == 'line-breakpoint' && marker[i].range.start.row == rowdif){
                                marked = true;
                            }
                        }
                        if (!marked){
                            editor.session.addMarker(new Range(rowdif,0,rowdif,1),'line-breakpoint','fullLine');
                        }
                    }

                }

                if (lang == 'c'){
                    if (line.indexOf("{") != -1)
                        brackets++;
                    if (line.indexOf("}") != -1)
                        brackets--;
                }
            }

        }else{
            e.editor.session.clearBreakpoint(row);

            const marker = editor.session.getMarkers();
            for (let i in marker){
                if (marker[i].clazz == 'line-breakpoint' && marker[i].range.start.row == row){
                    editor.session.removeMarker(marker[i].id);
                }
            }
        }

        e.stop();
    });

    // editor.on("guttermouseup", function(e) {
    // });

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

        this.spriteGen = spriteGen
        this.ready = true
    },
    click: async function(){
        if (!this.ready){
            await this.init()
            this.ready = true
        }

        const glad = await this.spriteGen.createGladiator(loadGlad)
        // console.log(glad)
        if (glad){
            // create float card
            const {gladCard} = await loader.load("gladcard")
            gladCard.load(document.querySelector('#float-card .glad-card-container'), {
                customLoad: [glad],
                clickHandler: () => {
                    this.click()
                }
            })

            if (editor.getValue() == ""){
                editor.setValue(glad.code)
                editor.gotoLine(1,0,true)
            }
            else{
                glad.code = editor.getValue()
            }

            codeEditor.saved = false
            codeEditor.tested = false
            
            loadGlad = glad
            buttons.save.enable()
            buttons.test.enable()
        }

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
    disabled: true,
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
            this.bindGladList(e, Object.values(sampleGlads)[i].filename)
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
                    this.bindGladList(e, data[i])
                    document.querySelector('#fog-battle #list').appendChild(e)
                })
            }
        })

        document.querySelector('#fog-battle #btn-cancel').addEventListener('click', () => {
            if (this.progress && this.progress.isActive()){
                this.progress.kill()
                // if (sim && sim.running){
                //     sim.abort()
                // }
            }
            else{
                document.querySelector('#fog-battle').classList.add('hidden')
            }
        }) 
        
        document.querySelector('#fog-battle #btn-battle').addEventListener('click', async () => {
            let glads = []
            document.querySelectorAll('#fog-battle #list .glad.selected').forEach(e => {
                const name = e.querySelector('.name').innerHTML
                //my own glads
                // console.log(this.glads)
                if (this.glads[name] && this.glads[name].id){
                    glads.push(this.glads[name].id);
                }
                else{
                    glads.push(new Promise(async resolve => {
                        const {gladCard} = await loader.load("gladcard")
                        const filename = sampleGlads[name].filename
                        const data = await gladCard.getFromFile(filename)
                        resolve(data.code)
                    }))
                }
            })

            glads = (await Promise.all(glads)).map(e => e.code || e)

            this.battle(document.querySelector('#fog-battle #btn-battle'), glads).then( hash => {
                if (hash !== false){
                    new Message({
                        message: `Deseja visualizar a batalha?`,
                        buttons: {yes: "Sim", no: "Não"}
                    }).show().click(null, data => {
                        if (data.button == "yes"){
                            window.open("play/"+ hash)
                        }
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
                                document.querySelector('#save').click()
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
                    this.progress.kill()
                    //$('#fog-battle #btn-cancel').removeAttr('disabled');
                    document.querySelector('#fog-battle').classList.add('hidden')
                }
            })
        })

        this.ready = true
    },
    bindGladList: function(obj, info){
        if (window.jQuery && obj instanceof jQuery){
            obj = $(obj)[0]
        }

        obj.addEventListener('click', () => {
            const filename = typeof info == "string" ? info : null
            if (obj.classList.contains('selected')){
                obj.classList.remove('selected')
                document.querySelector('#fog-battle .glad-card-container').innerHTML = ""
            }
            else if (document.querySelectorAll('#fog-battle #list .glad.selected').length < 4){
                obj.classList.add('selected')
                
                loader.load("gladcard").then( async ({gladCard}) => {
                    if (filename){
                        info = await gladCard.getFromFile(filename)
                    }

                    if (!this.glads){
                        this.glads = {}
                    }
                    this.glads[info.name] = info

                    gladCard.load(document.querySelector('#fog-battle .glad-card-container'), {
                        code: true,
                        customLoad: [info]
                    })
                })

            }

            const rows_selected = document.querySelectorAll('#fog-battle #list .glad.selected')
            if (rows_selected.length > 0){
                document.querySelector('#fog-battle #btn-battle').removeAttribute('disabled')
                document.querySelector('#fog-battle #list-title span').innerHTML = rows_selected.length +" selecionados"
            }
            else{
                document.querySelector('#fog-battle #btn-battle').setAttribute('disabled',true)
                document.querySelector('#fog-battle #list-title span').innerHTML = ""
            }
        })
    },
    click: function(){
        if (!this.ready){
            this.init()
        }

        // console.log(this.disabled)
        if (!this.disabled){
            let t = tutorial.show([
                'checkStep',
                'oponent',
                'learnAttack',
                'checkAttack',
                'checkGetHit',
                'checkReact',
                'checkSafe',
                'checkFireball',
                'checkTeleport',
                'checkUpgrade',
                'checkBreakpoint'
            ])

            if (t === false){
                buttons.fade(document.querySelector('#fog-battle'))
                document.querySelector('#fog-battle h3 span').innerHTML = loadGlad.name
            }
        }

    },
    enable: function(){
        if (this.disabled){
            this.disabled = false
            document.querySelector("#test").classList.remove('disabled')
        }
    },
    battle: async function(button, glads){
        const {ProgressButton, Simulation} = await loader.load("runsim")
        this.progress = new ProgressButton(button, ["Executando batalha...","Aguardando resposta do servidor"]);

        const breakpoints = Array.from(document.querySelectorAll('.ace_breakpoint')).filter(e => e.textContent)
    
        glads.push(appendSetup(loadGlad.code))
    
        // console.log(loadGlad)
        return new Promise(resolve => {
            // console.log(glads)
            this.sim = new Simulation({
                glads: glads,
                savecode: true,
                origin: "editor",
                single: true,
                breakpoints: breakpoints.length ? breakpoints : false,
                terminal: true,
            })
            this.sim.run().then( data => {
                // console.log(data);
                if (data.error){
                    document.querySelector('#fog-battle').classList.add('hidden')
                    resolve(false)
                }
                else{
                    resolve(data.simulation)
                }
                this.progress.kill()
            })
        })
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

buttons.save = {
    disabled: true,
    enable: function(){
        if (this.disabled){
            this.disabled = false
            document.querySelector("#save").classList.remove('disabled')
        }
    },
    click: async function() {
        if (!this.disabled){
            if (user.logged){
                //console.log(loadGlad);

                const banned = await getBannedFunctions(editor.getValue())
                if (banned.length){
                    showMessage(`Você possui funções em seu código que são permitidas somente para teste. Remova-as e tente salvar novamente.<ul>Funções:<li><b>${banned.join("</b></li><li><b>")}</b></li></ul>`)
                }
                else if (codeEditor.tested){
                    const action = loadGlad.id ? "UPDATE" : "INSERT"

                    const args = {
                        action: action,
                        nome: loadGlad.name,
                        vstr: loadGlad.vstr,
                        vagi: loadGlad.vagi,
                        vint: loadGlad.vint,
                        skin: loadGlad.skin,
                    }

                    if (loadGlad.blocks){
                        args.blocks = loadGlad.blocks
                    }
                    if (loadGlad.id){
                        args.id = loadGlad.id
                    }

                    // console.log(args)
                    const data = await post("back_glad.php", args)
                    //console.log(data);

                    if (data.status == "LIMIT"){
                        new Message({message: `Você não pode possuir mais de <ignore><b>${data.value}</b></ignore> gladiadores simultaneamente. Aumente seu nível de mestre para desbloquear mais gladiadores.`}).show()
                    }
                    else if (data.status == "EXISTS"){
                        new Message({message: `O nome <ignore><b>${loadGlad.name}</b></ignore> já está sendo usado por outro gladiador`}).show()
                    }
                    else if (data.status == "INVALID"){
                        new Message({message: `CHEATER`}).show()
                    }
                    else if (data.status == "SUCCESS"){
                        loadGlad.id = data.id;
                        if (action == "INSERT"){
                            new Message({
                                message: `O gladiador <ignore><b>${loadGlad.name}</b></ignore> foi criado e gravado em seu perfil. Deseja inscrevê-lo para competir contra outros gladiadores?`,
                                buttons: {yes: "Sim", no: "Agora não"}
                            }).show().click('yes', () => {
                                window.open('battle.ranked')
                            })
                        }
                        else{
                            new Message({message: `Gladiador <ignore><b>${loadGlad.name}</b></ignore> gravado`}).show()
                        }
                        codeEditor.saved = true
                    }
                }
                else{
                    document.querySelector('body').insertAdjacentHTML('beforeend', `<div id='fog' class='save'>
                        <div id='save-box'>
                            <div id='message'>Gravando alterações no gladiador <span class='highlight'>${loadGlad.name}</span>. Aguarde...</div>
                            <div id='button-container'><button class='button'>OK</button></div>
                        </div>
                    </div>`)

                    const sample = ['Archie', 'War Maker', 'Magnus', 'Rouge']
                    const glads = await Promise.all(sample.map(async e => {
                        const {gladCard} = await loader.load("gladcard")
                        const data = await gladCard.getFromFile(sampleGlads[e].filename)
                        return data.code
                    }))

                    const hash = await buttons.test.battle(document.querySelector('#save-box button'), glads)
                    // console.log(hash);
                    if (hash !== false){
                        post("back_log.php", {
                            action: "DELETE",
                            hash: hash
                        })

                        codeEditor.tested = true
                        document.querySelector('#fog.save').remove()
                        this.click()
                    }
                    else{
                        document.querySelector('#fog.save').remove()
                    }
                }
            }
            else{
                new Message({
                    message: `Você precisa fazer LOGIN no sistema para salvar seu gladiador`,
                    buttons: {cancel: "Cancelar", ok: "LOGIN"}
                }).show().click('ok', async () => {
                    const {google} = await loader.load("google")
                    google.login().then(function(data) {
                        //console.log(data);
                        $('#login').html(data.nome).off().click( function(){
                            window.location.href = "news";
                        });
                    });
                });
            }
        }
    }
}


// handle editor resize when chat is toggled
login.wait().then(async () => {
    if (login.user.logged){
        loader.load("chat").then( ({chat}) => {
            chat.init(document.querySelector('#chat-panel'), {
                full: false,
                expandWidth: "-65px"
            }).then( async () => {
                await codeEditor.isReady()
                document.querySelector('#chat-panel #show-hide').addEventListener('click', () => {
                    setTimeout(() => {
                        const w = document.querySelector('#chat-panel').clientWidth
                        document.querySelector('#panel-right').style.width = `${w}px`
                        editor.resize()
                        document.querySelector('#float-card').style['margin-right'] = `${w}px`
                    }, 1000)
                })
            })
        })
    }
    else{
        await codeEditor.isReady()
        document.querySelector('#chat-panel').style.display = 'none'
        document.querySelector('#panel-right').style.width = `0px`
        editor.resize()
        document.querySelector('#float-card').style['margin-right'] = `0px`
    }
})

loader.load("jquery").then( () => $(document).ready(async () => {
    $('#header-editor').addClass('here')
    document.querySelector('#header-container').classList.add('small')
    await codeEditor.isReady()

    login.wait().then(async data => {
        // console.log(data)
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

            editor.setTheme("ace/theme/"+ user.theme);
            editor.setFontSize(user.font +"px");
            
            // load glad from url
            const gladDiv = document.querySelector('#glad-code')

            if (user.language == 'blocks' && !gladDiv){
                blocks.toggle({active: true, create: true})
            }

            if (gladDiv){
                const gladid = parseInt(gladDiv.innerHTML)
                if (gladid == 0){
                    gladDiv.remove()
                    buttons.skin.click()
                }
                else{
                    const glads = await post("back_glad.php", {
                        action: "GET"
                    })
                    const glad = glads.filter(e => e.id == gladid)[0]
                    if (glad){
                        loadGlad = glad
                        loadGlad.id = gladid

                        gladDiv.remove()

                        if (loadGlad.blocks){
                            // TODO load blocks before use
                            blocks.toggle({active: true, load: loadGlad.blocks})
                        }

                        // create float card
                        const {gladCard} = await loader.load("gladcard")
                        gladCard.load(document.querySelector('#float-card .glad-card-container'), {
                            customLoad: [loadGlad],
                            clickHandler: () => {
                                buttons.skin.click()
                            }
                        })

                        editor.setValue(loadGlad.code)
                        editor.gotoLine(1,0,true)
                        codeEditor.saved = true
                        codeEditor.tested = true

                        buttons.test.enable()
                        buttons.save.enable()
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

    document.querySelector('#save').addEventListener('click', () => {
        buttons.save.click()
    });

    document.querySelector('#skin').addEventListener('click', () => {
        buttons.skin.click()
    })

    document.querySelector('#test').addEventListener('click', () => {
        buttons.test.click()
    })

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

        $('#settings-window #cancel').click(() => {
            $('#fog').remove();
        })

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
}))

// trying to leave page
window.onbeforeunload = function() {
    return codeEditor.saved ? null : true
}

function appendSetup(){
    const language = getLanguage(editor.getValue())
    let setup = ""
    if (language == "c"){
        setup = `setup(){\n    setName(\"${loadGlad.name}\");\n    setSTR(${loadGlad.vstr});\n    setAGI(${loadGlad.vagi});\n    setINT(${loadGlad.vint});\n    setSkin(\"${loadGlad.skin}\");\n    setUser(\"${loadGlad.user}\");\n    setSlots(\"-1,-1,-1,-1\");\n}\n\n`
    }
    else if (language == "python" || language == 'blocks'){
        setup = `def setup():\n    setName(\"${loadGlad.name}\")\n    setSTR(${loadGlad.vstr})\n    setAGI(${loadGlad.vagi})\n    setINT(${loadGlad.vint})\n    setSkin(\"${loadGlad.skin}\")\n    setUser(\"${loadGlad.user}\")\n    setSlots(\"-1,-1,-1,-1\")\n# start of user code\n`
        
        if (language == 'blocks'){
            loadGlad.blocks = blocks.save()
        }
    }

    return setup + editor.getValue()
}

async function getBannedFunctions(code){
    const req = await fetch("banned_functions.json")
    const banned = (await req.json()).functions
    return banned.filter(e => code.indexOf(e) != -1)
}

function getLanguage(code){
    var language = "c";
    if (blocks.active)
        language = 'blocks'
    else if (code.indexOf("def loop():") != -1)
        language = "python";

    return language;
}

loader.load('editorblocks').then(async module => {
    blocks = module.blocks
    await codeEditor.isReady()
    blocks.init(codeEditor)
})