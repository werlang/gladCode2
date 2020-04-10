$(document).ready(async function(){
    let hash = $('#hash').html()

    if (hash){
        let data = JSON.parse(await $.post("back_train.php", {
            action: "JOIN",
            hash: hash
        }))
        // console.log(data)
        
        let message
        let redirect = true
        
        if (data.status == "JOINED"){
            window.location.href = 'battle'
        }
        else if (data.status == "NOTFOUND"){
            message = "Treino não encontrado"
        }
        else if (data.status == "EXPIRED"){
            message = "O código para ingresso deste treino expirou"
        }
        else if (data.status == "ALLOWED"){
            redirect = false
            selectedGlad.choose(hash)
        }

        if (redirect){
            let msgbox = showMessage(message)
            $('#fog').addClass('black')
            await msgbox
            window.location.href = "battle"
        }
    }
})

var selectedGlad = {
    choose: async function(hash){
        this.hash = hash
        var box = `<div id='fog'>
            <div class='glad-box'>
                <div id='title'>Escolha o gladiador que participará do treino</div>
                <div class='glad-card-container'></div>
                <div id='button-container'>
                    <button id='select' class='button' disabled>SELECIONAR</button>
                </div>
            </div>
        </div>`;
        $('body').append(box);

        load_glad_cards($('#fog .glad-card-container'), {
            clickHandler: function(){
                if (!$(this).hasClass('old')){
                    $('#fog #btn-glad-open').removeAttr('disabled');
                    $('#fog .glad-preview').removeClass('selected');
                    $(this).addClass('selected');
                    $('.glad-box #select').removeAttr('disabled');
                }
            },
            dblClickHandler: function(){
                if ($('#fog .glad-card-container .selected').length)
                    $('#fog .glad-box #select').click();
            }
        })
        $('#fog').addClass('black')

        $('#fog .glad-box #select').click( async function(){
            let glad = $('#fog .glad-preview.selected').data('id')
            let data = JSON.parse(await $.post("back_train.php", {
                action: "JOIN",
                hash: hash,
                glad: glad,
                redirect: true
            }))
            // console.log(data)

            if (data.status == "SUCCESS"){
                $('.glad-box').hide()
                await showMessage("Você ingressou no treino")
                window.location.href = 'battle.train'
            }
        });
    }
}

// TODO login quando nao esta logado para escolher glad