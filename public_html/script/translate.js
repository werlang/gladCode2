import {post} from "./header.js"
import {Message} from "./dialog.js"

const translator = {
    ready: true
}

translator.translate = async function(elements){
    let lang = this.language ? this.language : 'pt'
    let contents = this.translations ? this.translations : {}
    
    if (elements.translate){
        let values = []
        var keys = []
        for (let i in elements.translate){
            values.push(elements.translate[i])
            keys.push(i)
        }
        elements = values
    }
    
    elements = Array.isArray(elements) ? elements : [elements]

    // console.log(elements)
    // search for contents to put in local obj
    for (let element of elements){
        if (typeof element === 'string'){
            if (!contents[element]){
                if (element.indexOf("<prop-number>") != -1){
                    let prop = element.replace(/<prop-number>\d+<\/prop-number>/g, "995471")
                    contents[prop] = {}
                }
                else{
                    contents[element] = {}
                }

            }
        }
        else{
            element.find(`*`).contents().each(function(){
                // check for template
                if (!$(this).hasClass('skip-translation') && !$(this).parents('.skip-translation').length){
                    if ($(this).data('translationTemplate')){
                        let temp = $(this).data('translationTemplate')
                        contents[temp] = {template: temp}
                    }

                    if (lang != 'pt'){
                        // replace contents
                        if (this.nodeType == 3 && !this.textContent.includes("\n") && !this.textContent.includes("\t") && !$(this).hasClass('translated') && !this.textContent.match(/^[\d\s]+$/) && !this.textContent.match(/^\W+$/)){
                            let text = this.textContent.replace(/(\w+)/, "$1")
                            if (text.length && !contents[text]){
                                contents[text] = {}
                            }
                            $(this).parent().addClass('translating')
                            // console.log($(this).text())
                        }
                        // replace other fields
                        let fieldList = ['title', 'placeholder']

                        for (let field of fieldList){
                            if (this[field] && this[field].length && !$(this).hasClass('translated')){
                                if (!contents[this[field]]){
                                    contents[this[field]] = {}
                                }
                                $(this).addClass('translating')
                            }
                        }
                    }
                    else{
                        $(this).removeClass('translating')
                        $(this).parents().removeClass('translating')
                    }
                }
            })
        }
    }

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
            if (element.indexOf("<prop-number>") != -1){
                let prop = element.replace(/<prop-number>\d+<\/prop-number>/g, "995471")
                let orig = element.match(/<prop-number>(\d+)<\/prop-number>/)[1]
                let resp = contents[prop][lang].replace("995471", orig)
                stringResponse.push(resp)
            }
            else if (contents[element]){
                stringResponse.push(contents[element][lang])
            }
        }
        else{
            element.find(`*`).contents().each(function(){
                // replace template
                if (!$(this).hasClass('skip-translation') && !$(this).parents('.skip-translation').length){
                    if ($(this).data('translationTemplate')){
                        let temp = $(this).data('translationTemplate')
                        this.textContent = contents[temp][lang]
                        translator.bind($(this))
                    }
                    else if (lang != 'pt'){
                        // replace contents
                        if (this.nodeType == 3){
                            // console.log(this.textContent)
                            if (contents[this.textContent] && !$(this).hasClass('translated')){
                                this.textContent = ` ${contents[this.textContent][lang]} `
                                translator.bind($(this).parent())
                            }
                        }

                        // replace other fields
                        let fieldList = ['title', 'placeholder']

                        for (let field of fieldList){
                            if (this[field]){
                                if (contents[this[field]]){
                                    this[field] = `${contents[this[field]][lang]}`
                                    translator.bind($(this))
                                }
                            }
                        }
                        
                    }
                }
                
                $(this).removeClass('translating')
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
    if (!this.translations || !this.translations[str]){
        return str
    }

    let translated = this.translations[str][this.language]

    if (str.indexOf("<prop-number>") != -1){
        let prop = str.replace(/<prop-number>\d+<\/prop-number>/g, "995471")
        let orig = str.match(/<prop-number>(\d+)<\/prop-number>/)[1]
        translated = this.translations[prop][this.language].replace("995471", orig)
    }

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
        $('.translating').each( function(){
            bind($(this))
        })
    }

    function bind(obj){
        obj.addClass('translated')
        obj.removeClass('translating')
        obj.parents().removeClass('translating')
    
        if (translator.suggest){
            obj.hover( function(m) {
                // create element
    
                $('.improve-box').remove()
                obj.append(`<div class='improve-box' data-time='${(new Date()).getTime()}'><i class='fas fa-language'></i></div>`)
    
                let waitTime = 2000
                setTimeout( () => {
                    // show element
                    let box = obj.find('.improve-box')
                    let timePassed = parseFloat(box.data('time')) + waitTime <= (new Date()).getTime()
                    if (!box.hasClass('visible') && timePassed){
                        box.css({
                            'top': obj.position().top,
                            'left': obj.position().left
                        })
                        box.addClass('visible')
                        box.off().click( function(e) {
                            e.preventDefault()
                            e.stopPropagation()
                            $(this).remove()
                            let text = obj.text().trim()
                            $('#dialog-box').parents('#fog').remove()
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
                                    language: user.speak
                                })
                                // console.log(data)
    
                                new Message({message: "Sugestão enviada"}).show()
                            })
                        })
                    }
                }, waitTime)
            })
    
            obj.mouseleave( function() {
                // remove element
                obj.find('.improve-box').remove()
            })
        }
 
    }
}

export {translator}
