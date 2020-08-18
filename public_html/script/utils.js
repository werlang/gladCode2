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

    // $.post(path, {
    //     args
    // }).then( data => {
    //     try{
    //         data = JSON.parse(data)
    //     } catch(e) {
    //         return {error: e, data: data}
    //     }
    //     return data
    // })
}

export {post}