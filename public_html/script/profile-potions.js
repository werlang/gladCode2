$(document).ready( () => {
    $('#apot-container .help').click( () => {
        new Message({
            message: "Os itens encomendados no apotecário podem ser usados por todos seus gladiadores durante 24h em batalhas ranqueadas."
        }).show()
    })

    $.getJSON("script/potions.json", data => {
        let slots = ""
        let info = []
        for (let i in data.potions){
            let item = data.potions[i]
            slots += `<div class='slot'>
                <div class='top'><img src='${item.icon}'></div>
                <div class='mid'><i class='fas fa-coins'></i><span>${item.price}</span></div>
                <div class='bot'>
                    <span class='name'>${item.name}</span>
                    <div class='button-container'>
                        <span class='info' title='Informações'><i class='fas fa-question-circle'></i></span>
                        <span title='Encomendar produto'><i class='fas fa-thumbs-up'></i></span>
                    </div>
                </div>
            </div>`
            info.push(item.description)
        }
        $('#apot-container #shop-container').html(slots)
        $('#apot-container #shop-container .info').click( function() {
            let i = $('.info').index(this)
            new Message({message: info[i]}).show()
        })
    })
})