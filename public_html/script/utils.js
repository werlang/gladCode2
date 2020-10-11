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

const post = async function(path, args){
    // console.log(new URLSearchParams(args).toString())
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
    a = {...a}
    b = {...b}

    for (let i in b){
        if (a[i] && typeof b[i] == 'object' && typeof a[i] == 'object'){
            a[i] = deepMerge(a[i], b[i])
        }
        else{
            a[i] = b[i]
        }
    }

    return a
}

function mergeLog(data){
    const log = typeof data == "string" ? JSON.parse(data) : data
    for (let i in log){
        // make projectile id its actual id attribute
        const newproj = {}
        for (let j in log[i].projectiles){
            const proj = log[i].projectiles[j]
            newproj[proj.id] = proj
            delete proj.id
        }
        log[i].projectiles = newproj

        if (i > 0){
            const temp = {...log[i-1]}
            temp.projectiles = {}
            log[i] = deepMerge(temp, log[i])
        }
    }
    return log
}

export {post, getDate, getTimeSince, $index, deepMerge, mergeLog}
