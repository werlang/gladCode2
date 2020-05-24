$(document).ready( () => {
    var slotlvl
    var potions
    post("back_slots.php", {
        action: "ITEMS"
    }).then (data => {
        // console.log(data)
        potions = data.potions
        
        $('#apot-container #browse').click( function(){
            if (!$(this).attr('disabled')){
                let slotsDOM = ""
                for (let i in potions){
                    let item = potions[i]
                    slotsDOM += `<div class='slot' data-id='${i}'>
                        <div class='top'><img src='${item.icon}'></div>
                        <div class='mid'><i class='fas fa-coins'></i><span>${item.price}</span></div>
                        <div class='bot'>
                            <span class='name'>${item.name}</span>
                            <div class='button-container'>
                                <span class='info' title='Informações'><i class='fas fa-question-circle'></i></span>
                                <span class='buy' title='Encomendar produto'><i class='fas fa-thumbs-up'></i></span>
                            </div>
                        </div>
                    </div>`
                }

                $('body').append(`<div id='fog'>
                    <div id='browse-potions'>
                        <h2>Estes são os produtos que você pode encomendar:</h2>
                        <div id='shop-container'>
                            ${slotsDOM}
                        </div>
                        <button id='close'>CANCELAR</button>
                    </div>
                </div>`)
                $('#fog').hide().fadeIn()
                slots.refresh()

                $('#browse-potions #close').click( function() {
                    $('#fog').remove()
                })

                $('#browse-potions .info').click( function() {
                    let id = $(this).parents('.slot').data('id')
                    new Message({message: potions[id].description}).show()
                })
        
                $('#browse-potions .buy').click( function() {
                    if (!$(this).parents('.slot').hasClass('disabled')){
                        let firstslot = $('#apot-container #my-pots .slot.empty').first()
        
                        if (firstslot.length){
                            let id = $(this).parents('.slot').data('id')
                            
                            new Message({
                                message: `Emcomendar <b>${potions[id].name}</b>?`,
                                buttons: {yes: "Sim", no: "Não"}
                            }).show().click('yes', () => {                
                                if (firstslot.length){
                                    $('#fog').remove()
                                    if (slots.fill(id)){
                                        create_toast(`Item ${potions[id].name} encomandado`, "success")
                                    }
                                    else{
                                        create_toast(`O item não pôde ser adquirido`, "error")
                                    }
                                }
                            })
                        }
                        else {
                            $('#apot-container #browse').attr('disabled', true)
                        }
                    }
                })
            }
        })

        waitLogged().then( () => {
            slots.refresh()
        })
    })

    waitLogged().then( () => {
        let mypots = ""
        for (let i=0 ; i<4 ; i++){
            mypots += `<div class='slot empty'>
                <div class='top'><div class='empty'></div></div>
                <div class='mid'><span class='name'>Nenhum item neste espaço</span></div>
                <div class='bot' title='Tempo restante'><i class='fas fa-clock'></i><span class='time'></span></div>
            </div>`
            if (!slots.items[i].empty){
                slots.items[i].empty = true
            }
        }
        $('#apot-container #my-pots').html(mypots)
    })

    $('#menu #potions').click( () => {
        slots.refresh()
    })

    var slots = {
        items: [{},{},{},{}]
    }

    slots.fill = function(id){
        for (let i in this.items){
            if (this.items[i].empty && parseInt(user.silver) >= parseInt(potions[id].price)){
                this.items[i].id = id
                this.items[i].empty = false
                this.items[i].counting = false
                user.silver -= potions[id].price

                post("back_slots.php", {
                    action: "BUY",
                    id: id
                }).then( data => {
                    // console.log(data)
                    this.refresh()
                })

                return true
            }
        }
        return false
    }

    slots.refresh = async function() {
        let data = await post("back_slots.php", {
            action: "SLOTS"
        })
        // console.log(data)

        slotlvl = data.slotlvl
        for (let i=0 ; i<4 ; i++){
            // enable new slot
            if (data.lvl >= slotlvl[i] && this.items[i].disabled){
                $('#apot-container #my-pots .slot').eq(i).removeClass('disabled').addClass('empty').html(`
                    <div class='top'><div class='empty'></div></div>
                    <div class='mid'><span class='name'>Nenhum item neste espaço</span></div>
                    <div class='bot' title='Tempo restante'><i class='fas fa-clock'></i><span class='time'></span></div>
                `)
                delete this.items[i].disabled
                this.items[i].empty = true
            }
            // disable slot
            else if (data.lvl < slotlvl[i] && !this.items[i].disabled){
                $('#apot-container #my-pots .slot').eq(i).removeClass('empty').addClass('disabled').html(`
                    <div class='top'><div class='empty'></div></div>
                    <div class='mid'><span>Atinja o nível ${slotlvl[i]} para desbloquear este item</span></div>
                `)
                this.items[i].disabled = true
                delete this.items[i].empty
            }
        }

        this.time = new Date().getTime() / 1000

        for (let i=0 ; i<4 ; i++){
            if (!this.items[i].disabled){
                this.items[i].empty = true
            }
        }
        for (let i in data.slots){
            this.items[i].id = data.slots[i].id
            this.items[i].name = data.slots[i].name
            this.items[i].icon = data.slots[i].icon
            this.items[i].description = data.slots[i].description
            this.items[i].time = data.slots[i].time
            this.items[i].empty = false
        }


        for (let i in this.items){
            let item = this.items[i]
            if (!item.disabled && !item.empty && !item.counting){
                $('#apot-container #my-pots .slot').eq(i).removeClass('empty').addClass('filled').html(`
                    <div class='top'><img src='${item.icon}'></div>
                    <div class='mid'><span class='name'>${item.name}</span></div>
                    <div class='bot'><span class='time'></span><i class='fas fa-clock'></i></div>
                `)

                item.counting = true
                this.countTime(i)

                $('#apot-container #my-pots .slot').eq(i).click( () => {
                    new Message({
                        message: `Para usar este item nas batalhas, use no seu código: <code><b>useItem("${item.id}")</b></code>`,
                        buttons: {yes: "Ajuda", no: "OK"}
                    }).show().click('yes', function(){
                        window.open(`manual#items`)
                    })
                })
            }
            else if (item.empty){
                $('#apot-container #my-pots .slot').eq(i).addClass('empty').html(`
                    <div class='top'><div class='empty'></div></div>
                    <div class='mid'><span class='name'>Nenhum item neste espaço</span></div>
                    <div class='bot' title='Tempo restante'><i class='fas fa-clock'></i><span class='time'></span></div>
                `)
            }
        }

        $('#apot-container #browse').removeAttr('disabled')
        if (!this.items.filter(e => e.empty).length){
            $('#apot-container #browse').attr('disabled', true)
        }

        $('#currencies #silver span').text(user.silver)

        $('#browse-potions .slot').each( (_,obj) => {
            let id = $(obj).data('id')
            if (parseInt(user.silver) < parseInt(potions[id].price)){
                $(obj).addClass('disabled')
            }
        })
    }

    slots.countTime = function(i){
        let item = this.items[i]
        setTimeout( () => {
            let elapsed = new Date().getTime() / 1000 - this.time
            let time = {s: parseInt(item.time) - elapsed}

            if (time.s < 0){
                item.counting = false
                slots.refresh()
            }
            else {
                time.m = Math.floor(time.s / 60)
                time.s = Math.floor(time.s % 60)
                time.h = Math.floor(time.m / 60)
                time.m = Math.floor(time.m % 60)

                time.s = `${time.s}s`
                time.m = time.m == 0 && time.h == 0 ? '' : `${time.m}m`
                time.h = time.h == 0 ? '' : `${time.h}h`

                time.str = `${time.h} ${time.m} ${time.s}`

                $('#apot-container #my-pots .slot').eq(i).find('.time').html(time.str)
                this.countTime(i)
            }
        }, 1000)
    }
})