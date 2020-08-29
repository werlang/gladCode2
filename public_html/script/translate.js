import {post} from "./utils.js"
import {Message} from "./dialog.js"
import {login} from "./header.js"

const translator = {
    ready: true,
    prop_number : "995471",
    prop_text: "foobarproptextfoobar"
}

translator.translate = async function(elements){
    let lang = this.language ? this.language : 'pt'
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
                let el = element

                if (el.indexOf("<prop-number>") != -1){
                    el = el.replace(/<prop-number>\d+<\/prop-number>/g, this.prop_number)
                }

                if (el.indexOf("<prop-text>") != -1){
                    el = el.replace(/<prop-text>.+<\/prop-text>/g, this.prop_text)
                }

                contents[el] = {}
            }
        }
        else{
            if (element instanceof jQuery){
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

                        // const el_prop_text = e.querySelector("prop-text")
                        // const el_prop_number = e.querySelector("prop-number")
                        // if (el_prop_number){
                        //     e.dataset['propnumber'] = el_prop_number.innerHTML
                        //     el_prop_number.innerHTML = this.prop_number
                        // }
                        // if (el_prop_text){
                        //     e.dataset['proptext'] = el_prop_text.innerHTML
                        //     el_prop_text.innerHTML = this.prop_text
                        // }
        
                        if (e.parentNode && !e.textContent.includes("\n") && !e.textContent.includes("\t") && !e.classList.contains('translated') && !e.textContent.match(/^[\d\s]+$/) && !e.textContent.match(/^\W+$/)){
                            let text = e.textContent.replace(/(\w+)/, "$1")
                            if (text.length && !contents[text]){
                                contents[text] = {}
                                // console.log(text)
                            }
                            e.parentNode.classList.add('translating')
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
                        const p = e.closest('.translating') && p.classList.remove('translating')
                    }
                }
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
            let prop = element
            let orig_num = element
            let orig_text = element
            
            if (element.indexOf("<prop-number>") != -1){
                prop = prop.replace(/<prop-number>\d+<\/prop-number>/g, this.prop_number)
                orig_num = orig_num.match(/<prop-number>(\d+)<\/prop-number>/)[1]
            }
            
            if (element.indexOf("<prop-text>") != -1){
                prop = prop.replace(/<prop-text>.+<\/prop-text>/g, this.prop_text)
                orig_text = orig_text.match(/<prop-text>(.+)<\/prop-text>/)[1]
            }

            if (contents[prop] && contents[prop][lang]){
                let resp = contents[prop][lang]
                resp = resp.replace(this.prop_number, orig_num)
                resp = resp.replace(this.prop_text, orig_text)
                stringResponse.push(resp)
            }
        }
        else{
            if (element instanceof jQuery){
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

                        // if (e.dataset && e.dataset['propnumber']){
                        //     contents[e.textContent][lang] = contents[e.textContent][lang].replace(this.prop_number, e.dataset['propnumber'])
                        //     delete e.dataset['propnumber']
                        // }

                        // if (e.dataset && e.dataset['proptext']){
                        //     contents[e.textContent][lang] = contents[e.textContent][lang].replace(this.prop_text, e.dataset['proptext'])
                        //     console.log(contents[e.textContent][lang])
                        //     delete e.dataset['proptext']
                        // }

                        e.childNodes.forEach(e => {        
                            if (e.nodeType == 3){
                                // console.log(e.textContent)
                                if (contents[e.textContent] && !e.parentNode.classList.contains('translated')){
                                    e.textContent = ` ${contents[e.textContent][lang]} `
                                    stringResponse.push(e.textContent)
                                    translator.bind(e.parentNode)
                                }
                            }
                        })

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
            obj.addEventListener('mouseenter', () => hoverHandler(obj))
            obj.addEventListener('mouseleave', () => hoverHandler(obj))
            
            function hoverHandler(obj) {
                document.querySelectorAll('.improve-box').forEach(e => e.remove())
                obj.insertAdjacentHTML('beforeend', `<div class='improve-box' data-time='${(new Date()).getTime()}'><i class='fas fa-language'></i></div>`)
    
                const waitTime = 2000
                setTimeout( () => {
                    // show element
                    const box = obj.querySelector('.improve-box')
                    if (box){
                        const timePassed = parseFloat(box.dataset.time) + waitTime <= (new Date()).getTime()
                        if (!box.classList.contains('visible') && timePassed){
                            box.style.top = obj.offsetTop
                            box.style.left = obj.offsetLeft
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
                                    
                                    let data = await post("back_translation.php", {
                                        action: "SUGGEST",
                                        original: advice.old,
                                        suggestion: advice.new,
                                        language: login.user.speak
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
