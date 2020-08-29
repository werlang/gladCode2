import {translator} from "./translate.js"

function showTerminal(title, message){
    $('#fog').remove()
    $('body').append(`<div id='fog'>
        <div id='terminal'>
            <div id='title'><span>${title}</span><div id='close'></div></div>
            <pre>${message}</pre>
        </div>
    </div>`);
    $('#terminal #close').click( function() {
        $('#terminal').parents('#fog').remove();
    })
}

function createToast(message, type) {
    var icon;
    if (type == 'error')
        icon = 'times-circle';
    else if (type == 'info')
        icon = 'exclamation-circle';
    else if (type == 'success')
        icon = 'check-circle';

    document.querySelector('body').insertAdjacentHTML('beforeend', `<div class='toast ${type}'><i class='fas fa-${icon}'></i><span>${message}</span></div>`)
    document.querySelectorAll(".toast").forEach((e,i) => {
        translator.translate(e)
        e.style.bottom = `calc(${i*1.5}em + ${i*20}px)`
        setTimeout( function(){
            e.classList.add('fading')
            setTimeout( function(){
                e.remove()
            }, 3000)
        }, 2000)
    })
}

const tooltip = function(delay = 700){
    const body = document.querySelector('body')
    body.addEventListener("mouseenter", createTooltip, true)
    body.addEventListener("mouseleave", removeTooltip, true)

    function createTooltip(e){
        const mouse = {x: e.x, y: e.y}
        e = e.target
        if (e.title){
            e.setAttribute('tooltip', e.title)
            
            body.querySelectorAll('.tooltip').forEach(e => {
                e.classList.add('hidden')
            })
            
            body.insertAdjacentHTML('beforeend', `<div class='tooltip hidden'>${e.title}</div>`) 
            e.title = ''

            setTimeout( () => {
                const tooltipList = body.querySelectorAll('.tooltip')
                const last = tooltipList[tooltipList.length - 1]
                if (tooltipList && last){
                    last.classList.remove('hidden')
                    adjustPosition(last, mouse)
                }
            }, Math.max(delay, 10))
        }
    }

    function removeTooltip(e){
        const mouse = {x: e.x, y: e.y}
        e = e.target
        if (e.hasAttribute('tooltip')){
            e.title = e.getAttribute('tooltip')
            e.removeAttribute('tooltip')

            const tooltip = body.querySelectorAll('.tooltip')
            if (tooltip.length > 1){
                const tpReveal = tooltip[tooltip.length - 2]
                tpReveal.classList.remove('hidden')
                adjustPosition(tpReveal, mouse)

            }
            if (tooltip.length > 0){
                tooltip[tooltip.length - 1].remove()
            }
        }

    }

    function adjustPosition(e, mouse){
        const offset = {x: 15, y: 15}

        const width = e.clientWidth

        e.style.left = mouse.x + offset.x + "px"
        e.style.top = mouse.y + offset.y + "px"

        if (e.clientHeight > 30){
            e.style.left = mouse.x - width + "px"
        }

    }
}


// ---------------------------------------------------------------------------------------------
// Message class
// let m = new Message({<options>})
// 
// options object:
// message: Message to be shown
// buttons: {id: "text_shown", ...} 
//          if null, an OK button will be placed: {ok: "OK"}
// input:   A text input to be shown.
//          If null, no input will be placed
//          If true, a simple text field will be placed
//          {default: "default_text", placeholder: "placeholder_text", enter: id}
//          default: Pre-filled value in the field
//          placeholder: Placeholder html attr of the field
//          focus: Boolean. If true, the input start with focus when the message appears
//          enter:  Id from the buttons object. When enter is pressed, this button will be clicked
//                  If no enter id is given, 'ok', then 'yes' will be default values
// textarea:    A textarea element to be placed. Mutually exclusive with input
//              If true, a simple textarea is placed
//              {value: "pre_filled_text", placeholder: "placeholder_text", maxlength: 0}
//              value: A default value to be placed inside the textarea
//              placeholder: Placeholder html attr of the field
//              maxlength: Maximum length of the text inserted
// class:   class to be appended in the dialog box
// preventKill: Prevent dialog box from closing when a button is pressed,
// translate: Default true. If false, prevent message box to be translated
// 
// Methods:
// show():  async function to show the message box
// kill():  Manually close the box. Useful when preventKill is set to true
// click(button, callback): Bind a custom callback when button is clicked
//                          callback arg receive the value of the input field
//                          Ex: m.click('ok', resp => console.log(resp))
// getButton(str):  Return the jquery object of the button of the given name
// ----------------------------------------------------------------------------------------------

class Message {
    constructor(options){
        this.message = options.message
        if (options.buttons)
            this.buttons = options.buttons
        else
            this.buttons = { ok: 'OK'}

        if (options.input){
            this.input = {
                default: '',
                placeholder: '',
                enter: "OK"
            }
            if (options.input.default)
                this.input.default = options.input.default
            if (options.input.placeholder){
                this.input.placeholder = options.input.placeholder
            }
            if (options.input.focus){
                this.input.focus = true
            }
            
            if (options.input.enter)
                this.input.enter = options.input.enter
            else if (this.buttons.ok)
                this.input.enter = 'ok'
            else if (this.buttons.yes)
                this.input.enter = 'yes'
        }
        else if (options.textarea){
            this.textarea = {
                value: '',
                placeholder: '',
                maxlength: 0
            }
            if (options.textarea.value)
                this.textarea.value = options.textarea.value
            if (options.textarea.placeholder){
                this.textarea.placeholder = options.textarea.placeholder
            }
            if (options.textarea.maxlength)
                this.textarea.maxlength = options.textarea.maxlength
        }

        if (options.preventKill){
            this.preventKill = true
        }

        if (options.class){
            this.class = options.class
        }

        this.translate = true
        if (options.translate === false){
            this.translate = false
        }

    }

    show(){
        let buttonsDOM = ""
        for (let id in this.buttons){
            buttonsDOM += `<button class='button' id='dialog-button-${id}'>${this.buttons[id]}</button>`
        }

        let input = this.input ? `<input type='text' class='input' value='${this.input.default}' placeholder='${this.input.placeholder}'>` : ''

        let maxlength = this.textarea && this.textarea.maxlength ? `<span id='charcount'>${this.textarea.maxlength} caracteres</span>` : ""
        let textarea = this.textarea ? `<textarea class='input' placeholder='${this.textarea.placeholder}' ${this.textarea.maxlength ? `maxlength=${this.textarea.maxlength}`: ""}>${this.textarea.value}</textarea>${maxlength}` : ''

        document.querySelector('body').insertAdjacentHTML('beforeend', `<div id='fog' class='hidden'>
            <div id='dialog-box' ${this.class ? `class='${this.class}'` : ''}>
                <div id='message'>${this.message}</div>
                ${input}${textarea}
                <div id='button-container'>${buttonsDOM}</div>
            </div>
        </div>`)

        const fog = document.querySelector('#fog.hidden')

        setTimeout( () => {
            fog.classList.remove('hidden')
            if (this.input && this.input.focus){
                fog.querySelector('.input').focus()    
            }
        }, 100)

        const box = fog.querySelector('#dialog-box')
        box.querySelector('*').display = 'none'

        if (!box.classList.contains('skip-translation')){
            if (this.translate){
                // console.log($('#dialog-box').html())
                translator.translate(box).then( () => {
                    box.querySelector('*').display = 'flex'
                })
            }
            else{
                box.querySelector('*').display = 'flex'
            }

            if (this.input && this.input.placeholder){
                if (this.translate){
                    translator.translate(this.input.placeholder).then( data => {
                        $('#dialog-box input').attr('placeholder', data)
                    })
                }
                else{
                    $('#dialog-box input').attr('placeholder', this.input.placeholder)
                }
            }
        }
        else{
            $('#fog #dialog-box *').show()
        }

        if (this.input){
            $('#dialog-box .input').focus()
            $('#dialog-box .input').keyup( e => {
                if (e.keyCode == 13 && this.input.enter){
                    $(`#dialog-box #dialog-button-${this.input.enter}`).click()
                }
            })            
        }
        else if (this.textarea && this.textarea.maxlength){
            $('#dialog-box .input').focus()
            let carac_str = "caracteres"
            translator.translate([
                "caracteres"
            ]).then( data => {
                carac_str = data
                $('#dialog-box #charcount').html(`${this.textarea.maxlength} ${data}`)
            })

            $('#dialog-box .input').on('input', () => {
                var left = this.textarea.maxlength - $('#dialog-box .input').val().length
                $('#dialog-box #charcount').html(`${left} ${carac_str}`)
                if (left < 0)
                    $('#dialog-box #charcount').addClass('alert')
                else{
                    $('#dialog-box #charcount').removeClass('alert')
                    $('#dialog-box .input').removeClass('alert')
                }
            })
        }

        for (let id in this.buttons){
            $(`#dialog-box #dialog-button-${id}`).click( async () => {
                if (!this.preventKill){
                    $('#dialog-box').parents('#fog').remove()
                }
            })
        }
        
        return this
    }

    kill(){
        $('#dialog-box').parents('#fog').remove()
    }

    click(button, fn){
        return new Promise( resolve => {
            if (!button){
                $(`#dialog-box .button`).off().click( async function() {
                    if (fn){
                        if (this.input){
                            fn({
                                button: $(this).attr('id').split('-')[2],
                                input: $('#dialog-box .input').val()
                            })
                        }
                        else{
                            fn({ button: $(this).attr('id').split('-')[2] })
                        }
                    }
    
                    if (!this.preventKill){
                        $('#dialog-box').parents('#fog').remove()
                    }
    
                    if (this.input){
                        resolve({
                            input: $('#dialog-box .input').val(),
                            button: $(this).attr('id').split('-')[2]
                        })
                    }
                    else{
                        resolve({ button: $(this).attr('id').split('-')[2] })
                    }    
                })
            }
            else{
                $(`#dialog-box #dialog-button-${button}`).off().click( async () => {
                    if (fn){
                        if (this.input || this.textarea){
                            fn({input: $('#dialog-box .input').val()})
                        }
                        else{
                            fn(true)
                        }
                    }
    
                    if (!this.preventKill){
                        $('#dialog-box').parents('#fog').remove()
                    }
    
                    if (this.input){
                        resolve({input: $('#dialog-box .input').val()})
                    }
                    else{
                        resolve(true)
                    }    
                })

            }

        })
    }

    getButton(name) {
        return $(`#dialog-box #dialog-button-${name}`)
    }
}

export {Message, createToast, showTerminal, tooltip}