import {translator} from "./translate.js";

translator.translate([
    "dias",
    "meses",
    "horas",
    "minutos",
    "Janeiro",
    "Fevereiro", 
    "Março", 
    "Abril", 
    "Maio", 
    "Junho", 
    "Julho", 
    "Agosto", 
    "Setembro", 
    "Outubro", 
    "Novembro", 
    "Dezembro"
])

const post = async function(path, args = {}, options = {}){
    // xhr option. When you want the progress
    // pass progress event callback.
    // php must set content-length-uncompressed
    // js can access e.uncompressedLengthComputable and e.uncompressedTotal as substitutes to e.lengthComputable and e.total
    if (options.xhr){
        const request = new XMLHttpRequest();
        if (options.progress){
            request.addEventListener('progress', e => {
                if (!e.lengthComputable){
                    const uncLength = request.getResponseHeader('content-length-uncompressed');
                    if (uncLength){
                        e.uncompressedTotal = parseInt(uncLength);
                        e.uncompressedLengthComputable = true;
                    }
                }
                options.progress(e);
            });
        }
        if (options.loadend){
            request.addEventListener('loadend', e => options.loadend(e));
        }
        if (options.loadstart){
            request.addEventListener('loadstart', e => options.loadstart(e));
        }
        request.open('POST', path);
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

        const response = new Promise(resolve => {
            request.onreadystatechange = () => {
                if(request.readyState == 4 && request.status == 200) {
                    let data = request.responseText;
                    // console.log(request.getAllResponseHeaders())
                    try {
                        data = JSON.parse(data);
                    }
                    catch(e){
                        resolve({error: e, request: request, data: data});
                    }
            
                    resolve(data);        
                }
            }
        })

        request.send(new URLSearchParams(args).toString());

        return response;
    }
    else{
        const response = await fetch(path, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(args).toString()
        })
        if (!response.ok) { throw response }
        let data = await response.text()
        
        try {
            data = JSON.parse(data)
        }
        catch(e){
            return {error: e, http: response, data: data}
        }
    
        return data
    }
}

function getTimeSince(min){
    min = parseInt(min);
    var hour = parseInt(min/60);
    min = min%60;
    var day = parseInt(hour/24);
    hour = hour%24;
    var month = parseInt(day/30);
    day = day%30;
    
    if (month > 0)
        return month +" "+ translator.getTranslated("meses", false);
    else if (day > 0)
        return day +" "+ translator.getTranslated("dias", false);
    else if (hour > 0)
        return hour +" "+ translator.getTranslated("horas", false);
    else
        return min +" "+ translator.getTranslated("minutos", false);
}

function getDate(msgTime, {short, month_full}={}){
    if (short){
        const now = new Date()
        msgTime = new Date(msgTime)
        
        const secNow = Math.round(now.getTime() / 1000)
        const secMsg = Math.round(msgTime.getTime() / 1000)
        
        const diff = (secNow - secMsg) / 60
        return getTimeSince(diff)
    }
    else{
        let months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        if (!month_full){
            for (let i in months){
                months[i] = translator.getTranslated(months[i], false).toLowerCase().slice(0,3)
            }
        }

        const t = new Date(msgTime)
        const string = `${t.getDate()} de ${months[t.getMonth()]} de ${t.getFullYear()} às ${('0'+t.getHours()).slice(-2)}:${('0'+t.getMinutes()).slice(-2)}`
        return string
    }
}

function $index(elem){
    return Array.from(elem.parentNode.children).indexOf(elem)
}

function deepMerge(a, b){
    for (let i in b){
        if (a[i] && typeof b[i] == 'object' && typeof a[i] == 'object'){
            a[i] = deepMerge({...a[i]}, {...b[i]});
        }
        // attribute doesnt exist in previous
        else{
            a[i] = b[i];
        }
    }
    // if all elements have numeric keys, return array, else object
    return Object.keys(a).map(e => parseInt(e)).some(e => isNaN(e)) ? a : Object.values(a);
    
}

function mergeLog(data){
    const log = typeof data == "string" ? JSON.parse(data) : data
    for (let i in log){
        // make projectile id its actual id attribute
        const newproj = {};
        log[i].projectiles.forEach(e => {
            newproj[e.id] = e;
            delete e.id;
        })
        log[i].projectiles = newproj

        if (i > 0){
            // create a copy of now and previous. replace provious projectiles log
            const temp = {...log[i-1]};
            temp.projectiles = {};
            log[i] = deepMerge(temp, {...log[i]});
        }
    }
    return log
}

async function waitFor(callback, time){
    return new Promise(resolve => {
        (function checkReady() {
            const resp = callback()
            if (resp){
                resolve(resp)
            }
            else{
                setTimeout(() => checkReady(), time || 10)
            }
        })()
    })
}

function copyToClipboard(text) {
    const input = document.createElement('input');
    input.value = text;
    document.querySelector('body').insertAdjacentElement('beforeend', input);
    input.select();
    document.execCommand("copy");
    input.remove();
}

function fadeIn(element, options){
    if (options && options.css){
        element.classList.add('fadein');
        setTimeout(() => element.classList.remove('fadein'), 1);
    }
    else{
        const time = options && options.time ? options.time : 0.3;
        element.style.opacity = '0';
        setTimeout(() => element.style.transition = `${time}s opacity`, 10);
        setTimeout(() => element.style.opacity = '1', 20);
        setTimeout(() => element.removeAttribute('style'), time * 1000);
    }
}

export {post, getDate, getTimeSince, $index, deepMerge, mergeLog, waitFor, copyToClipboard, fadeIn}
