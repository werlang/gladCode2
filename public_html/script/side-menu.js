export const menu = {}

menu.load = async function(){
    const search = document.querySelector('#header #search')
    const menuEl = document.querySelector('#side-menu')

    if (search){
        search.classList.add('visible');
        search.addEventListener('click', function(){
            if (search.classList.contains('visible')){
                menuEl.classList.add('mobile')
                menuEl.style.display = 'block'
                // menu. .hide().show("slide", { direction: "right" }, 300);
                menuEl.querySelector('input').focus()
                menuEl.querySelectorAll('a').forEach(e => e.addEventListener('click', () => {
                    menuEl.classList.remove('mobile')
                    menuEl.style.display = 'none'
                    // $('#side-menu').fadeOut( function(){
                    //     $('#side-menu').removeClass('mobile');
                    // });
                }))
            }
        })
    }

    return new Promise( resolve => {
        fetch("side-menu.html").then( async response => {
            const content = await response.text()
            menuEl.innerHTML = content
    
            const icon = "<i class='fas fa-chevron-right'></i>";
            menuEl.querySelectorAll('li').forEach(e => {
                if (e.nextElementSibling && e.nextElementSibling.tagName == "ul"){
                    e.insertAdjacentHTML('afterbegin', icon)
                }
                e.classList.remove('visible')
                
                if (e.querySelector("i")){
                    e.querySelector("i").classList.remove('open')
                }
            })
            
            menuEl.querySelectorAll('#side-menu > ul > li').forEach(e => e.classList.add('visible'))
            
            const input = menuEl.querySelector('#search input')
            input.addEventListener('input', () => {
                menuEl.querySelectorAll('li').forEach(e => {
                    e.classList.remove('visible')
                    e.querySelector('i').classList.remove('open')
                })
    
                const text = input.value
                if (text.length <= 1){
                    document.querySelectorAll('#side-menu > ul > li').forEach(e => e.classList.add('visible'))
                }
                else{
                    const pattern = new RegExp(`[\\w]*${text}[\\w]*`,"ig")
                    menuEl.querySelectorAll('li').forEach(e => {
                        if (e.textContent.match(pattern)){
                            e.classList.add('visible')
                            e.parentNode.previousElementSibling.classList.add('visible').parentNode.previousElementSibling.classList.add('visible')
                        }
                        if (e.style.display != 'none'){
                            e.querySelectorAll('i').forEach(e => e.classList.add('open'))
                        }
                    });
                }
            });
    
            menuEl.querySelectorAll('li').forEach(e => e.addEventListener('click', () => {
                //console.log($(this));
                //e.preventDefault();
                const list = e.nextElementSibling
    
                if (list.querySelector('li.visible')){
                    list.querySelectorAll('li.visible').forEach(e => {
                        e.classList.remove('visible')
                        e.querySelector('i').classList.remove('open')
                    })
    
                    e.querySelector('i').classList.remove('open')
                }
                else{
                    list.querySelectorAll('li').forEach(e => e.classList.add('visible'))

                    if (e.querySelector('i')){
                        e.querySelector('i').classList.add('open')
                    }
                }
            }))
    
            resolve(true)
        })
    })
}

// TODO: fix this without JQuery
// $(document).scroll( function(){
//     var mindist, winner;
//     $('#side-menu li a').each( function(){
//         var loc = window.location.href.split("/");
//         loc = loc[loc.length - 1].split("#")[0];
//         var href = $(this).attr('href').split("#");
//         var hash = href[1];
//         href = href[0];
//         if (href == loc && hash && $('#'+ hash).length){
//             var dist = Math.abs($(document).scrollTop() - $('#'+ hash).offset().top);
//             if (!mindist || dist < mindist){
//                 mindist = dist;
//                 winner = $(this).parent();
//             }
//         }
//     });
//     if (winner){
//         winner.siblings('li.here').removeClass('here');
//         winner.addClass('here');

//         if (!winner.children('i').hasClass('open'))
//             winner.click();
//         $(winner.siblings('li').find('i.open').click());
//     }
// });

