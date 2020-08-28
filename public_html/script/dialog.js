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

    $('body').append(`<div class='toast ${type}'><i class='fas fa-${icon}'></i><span>${message}</span></div>`);
    translator.translate($('.toast'))

    $('.toast').each( (i,e) => {
        $(e).css({ 'bottom': `calc(${i*1.5}em + ${i*20}px)` })
    })
    setTimeout( function(){
        $('.toast').fadeOut(3000, function(){
            $(this).remove();
        })
    }, 2000);

}

$(document).ready( () => {
    $(document).tooltip()
    $(document).tooltip("option", "show.delay", 700)
})

/*
it works, but jquery UI provides a better alternative
function create_tooltip(message, obj, args){
    $('#tooltip').remove();
    $('body').append(`<div id='tooltip'>${message}</div>`);

    var thistooltip = $('#tooltip'); //to avoid a running timeout to remove a tooltip just created
    thistooltip.hide().fadeIn(150);
    var docpos = document.body.getBoundingClientRect();
    var elempos = obj[0].getBoundingClientRect();
    thistooltip.css({
        left: elempos.left - docpos.left,
        top: elempos.top - docpos.top
    });

    var fadetime = 2000;
    if (args && args.fadeOut)
        fadetime = args.fadeOut;
    
    var remaintime = 2000;
    if (args && args.remain)
        remaintime = args.remain;

    setTimeout( () => {
        thistooltip.fadeOut(fadetime, () => {
            thistooltip.remove();
        })
    }, remaintime);
}
*/


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

        $('body').append(`<div id='fog'>
            <div id='dialog-box' ${this.class ? `class='${this.class}'` : ''}>
                <div id='message'>${this.message}</div>
                ${input}${textarea}
                <div id='button-container'>${buttonsDOM}</div>
            </div>
        </div>`)
        $('#fog').hide().fadeIn()
        $('#fog #dialog-box *').hide()

        if (!$('#dialog-box').hasClass('skip-translation')){
            if (this.translate){
                translator.translate($('#dialog-box')).then( () => {
                    $('#fog #dialog-box *').show()
                })
            }
            else{
                $('#fog #dialog-box *').show()
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

export {Message, createToast, showTerminal}