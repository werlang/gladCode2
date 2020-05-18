$(document).ready( () => {
    $('#apot-container .help').click( () => {
        new Message({
            message: "Os itens encomendados no apotecário podem ser usados por todos seus gladiadores durante 24h em batalhas ranqueadas."
        }).show()
    })

    var potions
    $.getJSON("script/potions.json", data => {
        let slotsDOM = ""
        potions = data.potions
        for (let i in data.potions){
            let item = data.potions[i]
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
        $('#apot-container #shop-container').html(slotsDOM)
        $('#apot-container #shop-container .info').click( function() {
            let id = $(this).parents('.slot').data('id')
            new Message({message: potions[id].description}).show()
        })

        $('#apot-container #shop-container .buy').click( function() {
            if (!$(this).parents('.slot').hasClass('disabled')){
                let firstslot = $('#apot-container #my-pots .slot.empty').first()

                if (firstslot.length){
                    let id = $(this).parents('.slot').data('id')
                    
                    new Message({
                        message: `Emcomendar <b>${potions[id].name}</b>?`,
                        buttons: {yes: "Sim", no: "Não"}
                    }).show().click('yes', () => {                
                        if (firstslot.length){
                            slots.fill(id)
                        }
                    })
                }
                else {
                    $('#apot-container #shop-container .slot').addClass('disabled')
                }
            }
        })
    })

    waitLogged().then( user => {
        let slotlvl = [5,15,25,35]
        let mypots = ""
        for (let i=0 ; i<4 ; i++){
            if (user.lvl >= slotlvl[i]){
                mypots += `<div class='slot empty'>
                    <div class='top'><div class='empty'></div></div>
                    <div class='mid'><span class='name'>Nenhum item neste espaço</span></div>
                    <div class='bot' title='Tempo restante'><i class='fas fa-clock'></i><span class='time'></span></div>
                </div>`
                slots.items[i].empty = true
            }
            else{
                mypots += `<div class='slot disabled'>
                    <div class='top'><div class='empty'></div></div>
                    <div class='mid'><span>Atinja o nível ${slotlvl[i]} para desbloquear este item</span></div>
                </div>`
                slots.items[i].disabled = true
            }
        }
        $('#apot-container #my-pots').html(mypots)

        slots.refresh()
    })

    var slots = {
        items: [{},{},{},{}]
    }

    slots.fill = function(id){
        for (let i in this.items){
            if (this.items[i].empty && user.silver >= potions[id].price){
                this.items[i].id = id
                this.items[i].empty = false
                user.silver -= potions[id].price
                this.refresh()
                return true
            }
        }
        return false
    }

    slots.refresh = function() {
        for (let i in this.items){
            let item = this.items[i]
            if (!item.disabled && !item.empty && !item.time){
                item.time = new Date().getTime() + 86400000
                $('#apot-container #my-pots .slot').eq(i).removeClass('empty').addClass('filled').html(`
                    <div class='top'><img src='${potions[item.id].icon}'></div>
                    <div class='mid'><span class='name'>${potions[item.id].name}</span></div>
                    <div class='bot'><span class='time'></span><i class='fas fa-clock'></i></div>
                `)

                setInterval( () => {
                    let time = {s: (item.time - new Date()) / 1000}
                    time.m = Math.floor(time.s / 60)
                    time.s = Math.floor(time.s % 60)
                    time.h = Math.floor(time.m / 60)
                    time.m = Math.floor(time.m % 60)

                    time.s = `${time.s}s`
                    time.m = time.m == 0 && time.h == 0 ? '' : `${time.m}m`
                    time.h = time.h == 0 ? '' : `${time.h}h`

                    time.str = `${time.h} ${time.m} ${time.s}`

                    $('#apot-container #my-pots .slot').eq(i).find('.time').html(time.str)
                }, 1000)

                $('#apot-container #my-pots .slot').eq(i).click( () => {
                    new Message({
                        message: `Para usar este item nas batalhas, use no seu código: <code><b>useItem("${item.id}")</b></code>`,
                        buttons: {yes: "Ajuda", no: "OK"}
                    }).show().click('yes', function(){
                        window.open(`manual#items`)
                    })
                })
            }
        }

        if (!this.items.filter(e => e.empty).length){
            $('#apot-container #shop-container .slot').addClass('disabled')
        }

        $('#currencies #silver span').text(user.silver)

        $('#apot-container #shop-container .slot').each( (_,obj) => {
            let id = $(obj).data('id')
            if (user.silver < potions[id].price){
                $(obj).addClass('disabled')
            }
        })
    }
})