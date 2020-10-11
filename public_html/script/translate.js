import {Message} from "./dialog.js"
import {loader} from "./loader.js"

// const loginReady = login.wait()

const translator = {
    ready: true
}

translator.translate = async function(elements){
    const {login} = await loader.load("header")
    const user = await login.wait()
    let lang = this.language ? this.language : user.speak
    let contents = this.translations ? this.translations : {}
    
    // console.log(elements)
    if (!(elements instanceof HTMLElement) && elements.translate){
        let values = []
        var keys = []
        for (let i in elements.translate){
            values.push(elements.translate[i])
            keys.push(i)
        }
        elements = values
    }
    
    elements = Array.isArray(elements) ? elements : [elements]

    // search for contents to put in local obj
    for (let element of elements){
        if (typeof element === 'string'){
            if (!contents[element]){
                const el = element

                if (el.indexOf("<ignore>") != -1){
                    const before = el.split("<ignore>")[0]
                    const after = el.split("</ignore>")[1]

                    contents[before] = {}
                    contents[after] = {}
                }
                else{
                    contents[el] = {}
                }
            }
        }
        else{
            if (window.jQuery && element instanceof jQuery){
                element = $(element)[0]
            }

            element.querySelectorAll(`*`).forEach( e => {
                // check for template
                if (!e.classList.contains('skip-translation') && !e.closest('.skip-translation')){
                    // if (e.dataset['translationTemplate']){
                    //     let temp = e.dataset['translationTemplate']
                    //     contents[temp] = {template: temp}
                    // }
                    
                    if (lang != 'pt'){
                        // replace contents
                        // console.log(e.textContent)
        
                        if (!e.classList.contains('translated') && !e.closest('ignore')){
                            e.childNodes.forEach(e => {
                                const text = e.textContent.trim()
                                if (e.nodeType == 3 && text.length && !contents[text] && !text.match(/^[\d\s]+$/) && !text.match(/^\W+$/)){
                                    contents[text] = {}
                                    // console.log(text)
                                }
                                e.parentNode.classList.add('translating')
                            })
                        }

                        // replace other fields
                        let fieldList = ['title', 'placeholder']       

                        for (let field of fieldList){
                            if (e[field] && e[field].length && !e.classList.contains('translated')){
                                if (!contents[e[field]]){
                                    contents[e[field]] = {}
                                }
                                e.classList.add('translating')
                            }
                        }
                    }
                    else{
                        e.classList.remove('translating')
                        const parent = e.closest('.translating')
                        if (parent){
                            parent.classList.remove('translating')
                        }
                    }

                }
            })

            element.querySelectorAll(`ignore`).forEach( e => {
                e.replaceWith(...e.childNodes)
            })
        }
    }

    // console.log(contents)
    // check what is meant to be translated and send to back
    let toTranslate = []
    for (let i in contents){
        if (!contents[i][lang]){
            toTranslate.push(i)
        }
    }

    if (toTranslate.length){
        const {post} = await loader.load("utils")
        let data = await post("back_translation.php", {
            action: "TRANSLATE",
            language: lang,
            data: JSON.stringify(toTranslate),
        })
        // console.log(data)

        for (let i in data.response){
            contents[i][lang] = data.response[i]
        }
    }

    this.translations = {...this.translations, ...contents}

    // console.log(contents)
    // console.log(elements)
    let stringResponse = []
    for (let element of elements){
        if (typeof element === 'string'){
            if (element.indexOf("<ignore>") != -1){
                const before = element.split("<ignore>")[0]
                const after = element.split("</ignore>")[1]
                const prop = element.split("<ignore>")[1].split("</ignore>")[0]

                if (contents[before] && contents[before][lang] && contents[after] && contents[after][lang]){
                    let resp = contents[before][lang] + prop + contents[after][lang]
                    stringResponse.push(resp)    
                }
    
            }
            else{
                if (contents[element] && contents[element][lang]){
                    let resp = contents[element][lang]
                    stringResponse.push(resp)
                }
            }
        }
        else{
            if (window.jQuery && element instanceof jQuery){
                element = $(element)[0]
            }

            element.querySelectorAll(`*`).forEach( e => {
                // replace template
                if (!e.classList.contains('skip-translation') && !e.closest('.skip-translation')){
                    if (e.dataset['translationTemplate']){
                        let temp = e.dataset['translationTemplate']
                        e.textContent = contents[temp][lang]
                        translator.bind(e)
                    }
                    else if (lang != 'pt'){
                        // replace contents

                        if (!e.closest('ignore')){
                            e.childNodes.forEach(e => {  
                                const text = e.textContent.trim()      
                                if (e.nodeType == 3 && text.length){
                                    // console.log(text, !e.parentNode.classList.contains('translated'))
                                    if (contents[text]){
                                        e.textContent = ' '+ contents[text][lang] +' '
                                        stringResponse.push(e.textContent)
                                        translator.bind(e.parentNode)
                                    }
                                }
                            })
                        }

                        // replace other fields
                        let fieldList = ['title', 'placeholder']

                        for (let field of fieldList){
                            if (e[field]){
                                if (contents[e[field]]){
                                    e[field] = `${contents[e[field]][lang]}`
                                    stringResponse.push(e[field])
                                    translator.bind(e)
                                }
                            }
                        }
                        
                    }
                }
                
                e.classList.remove('translating')
            })
        }
    }

    if (keys && keys.length){
        let obj = {}
        for (let i in keys){
            obj[keys[i]] = stringResponse[i]
        }
        stringResponse = obj
    }

    return stringResponse
    
}

translator.getTranslated = function(str, dom=true, bind=true){
    if (!this.translations || !this.translations[str] || !this.translations[str][this.language]){
        return str
    }

    let translated = this.translations[str][this.language]

    let prop = str
    let orig_num = str
    let orig_text = str

    if (str.indexOf("<prop-number>") != -1){
        prop = prop.replace(/<prop-number>\d+<\/prop-number>/g, this.prop_number)
        orig_num = orig_num.match(/<prop-number>(\d+)<\/prop-number>/)[1]
    }

    if (str.indexOf("<prop-text>") != -1){
        prop = prop.replace(/<prop-text>.+<\/prop-text>/g, this.prop_text)
        orig_text = orig_text.match(/<prop-text>(.+)<\/prop-text>/)[1]
    }
    
    translated = this.translations[prop][this.language]
    translated = translated.replace(this.prop_number, orig_num)
    translated = translated.replace(this.prop_text, orig_text)

    if (dom){
        translated = `<span class='translating'>${translated}</span>`
    }

    if (bind){
        setTimeout( () => {
            translator.bind()
        }, 50)
    }

    return translated
}

translator.bind = function (obj){
    if (obj){
        bind(obj)
    }
    else{
        document.querySelectorAll('.translating').forEach(e => bind(e))
    }

    function bind(obj){
        // console.log(obj)
        obj.classList.add('translated')
        obj.classList.remove('translating')
        const p = obj.closest('.translating') 
        p && p.classList.remove('translating')
    
        if (translator.suggest){
            obj.addEventListener('mouseenter', e => hoverHandler(obj, e))
            
            function hoverHandler(obj, mouse) {
                document.querySelectorAll('.improve-box').forEach(e => e.remove())
                obj.insertAdjacentHTML('beforeend', `<div class='improve-box' data-time='${(new Date()).getTime()}'><i class='fas fa-language'></i></div>`)
    
                const waitTime = 2000
                const offset = {x: 5, y: -5}

                setTimeout( () => {
                    // show element
                    const box = obj.querySelector('.improve-box')
                    if (box){
                        const timePassed = parseFloat(box.dataset.time) + waitTime <= (new Date()).getTime()
                        if (!box.classList.contains('visible') && timePassed){
                            box.style.top = mouse.y + offset.y + "px"
                            box.style.left = mouse.x + offset.x + "px"

                            box.classList.add('visible')
                            // box.removeEventListener('click')
                            box.addEventListener('click', function(e) {
                                e.preventDefault()
                                e.stopPropagation()
                                this.remove()
                                let text = obj.textContent.trim()

                                if (document.querySelector('#dialog-box')){
                                    document.querySelector('#dialog-box').closest('#fog').remove()
                                }
                                
                                new Message({
                                    message: "Sugira uma tradução melhor para o texto:",
                                    input: {
                                        default: text
                                    },
                                    buttons: {ok: "OK", cancel: "Cancelar"}
                                }).show().click('ok', async input => {
                                    let advice = {
                                        old: text,
                                        new: input.input
                                    }
                                    
                                    const {post} = await loader.load("utils")
                                    const {login} = await loader.load("header")
                                    const user = await login.wait()

                                    let data = await post("back_translation.php", {
                                        action: "SUGGEST",
                                        original: advice.old,
                                        suggestion: advice.new,
                                        language: user.speak
                                    })
                                    // console.log(data)
        
                                    new Message({message: "Sugestão enviada"}).show()
                                })
                            })
                        }
                    }
                }, waitTime)
            }
    
            obj.addEventListener('mouseleave', function() {
                // remove element
                const box = obj.querySelector('.improve-box')
                box && box.remove()
            })
        }
 
    }
}

export {translator}
