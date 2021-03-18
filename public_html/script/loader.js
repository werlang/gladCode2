export const loader = {}

const paths = {
    Dropzone: "./dropzone.js",
    Croppie: "./croppie.js",
    Prism: [
        "https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/prism.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/plugins/autoloader/prism-autoloader.min.js"
    ],
    jqueryui: "https://code.jquery.com/ui/1.12.1/jquery-ui.min.js",
    jquery: "https://code.jquery.com/jquery-3.4.1.min.js",
    gladcard: "./glad-card.js",
    google: "./googlelogin.js",
    chat: "./chat.js",
    cloudinary: "./cloudinary.js",
    Blockly: "./blocks.js",
    potions: "./profile-potions.js",
    reports: "./profile-report.js",
    runsim: "./runSim.js",
    stats: "./stats_func.js",
    messages: "./profile-message.js",
    emoji: "./emoji.js",
    ranking: "./profile-rank.js",
    tourn: "./profile-tourn.js",
    train: "./profile-train.js",
    translator: "./translate.js",
    utils: "./utils.js",
    header: "./header.js",
    ace: "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.min.js",
    spritegen: "./sprite.js",
    editorblocks: "./editor-blocks.js",
    render: "./render.js",
    assets: "./assets.js",
    dialog: "./dialog.js",
}

const callbacks = {
    Prism: async () => {
        await new Promise(resolve => {
            checkAutoloader()
            function checkAutoloader(){
                if (Prism.plugins.autoloader){
                    resolve(true)
                }
                else{
                    setTimeout( () => {
                        checkAutoloader()
                    }, 50)
                }
            }
        })
        Prism.plugins.autoloader.languages_path = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/components/"
    },

    Blockly: async module => {
        // console.log((await module))
        return (await module).Blockly.initCustomBlocks()
    },

    ace: async () => {
        window.define = ace.define

        ace.config.set("packaged", true)
        ace.config.set("basePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/")
    
        return await import("https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ext-language_tools.min.js")
    }
}

const status = {}
status.isLoaded = async function(pack){
    return new Promise(resolve => {
        (function checkReady(){
            if (status[pack] && status[pack].loaded){
                resolve(true)
            }
            else{
                setTimeout(() => checkReady(), 50)
            }
        })()
    })
}

loader.load = async function(pack){
    // trying to load more than one module
    if (Array.isArray(pack)){
        let importArray = []
        for (let i in pack){
            // call loader to load each individually
            importArray.push(this.load(pack[i]))
        }
        return Promise.all(importArray)
    }
    else{
        // not loaded yet. if already loaded, do not import again
        if (!this[pack]){
            status[pack] = { pending: true }
            // if there is more than one script to load in the pack
            if (Array.isArray(paths[pack])){
                let importArray = []
                for (let i in paths[pack]){
                    const path = paths[pack][i]
                    importArray.push(import(path))
                }
                // the pack is the composed promise of all imports
                this[pack] = Promise.all(importArray)
            }
            else{
                this[pack] = import(paths[pack])
            }

            // if the pack has a callback, run it after the import is done
            if (callbacks[pack]){
                await this[pack]
                await callbacks[pack](this[pack])
                status[pack].pending = false
                status[pack].loaded = true
            }
            else{
                this[pack].then( () => {
                    status[pack].pending = false
                    status[pack].loaded = true
                })
            }
    }

        if (status[pack].pending){
            await status.isLoaded(pack)
        }

        // return the import promise
        return this[pack]
    }
}
