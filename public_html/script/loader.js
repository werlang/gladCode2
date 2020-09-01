export const loader = {}

const paths = {
    Dropzone: "./dropzone.js",
    Croppie: "./croppie.js",
    Prism: [
        "https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/prism.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/plugins/autoloader/prism-autoloader.min.js"
    ],
    jqueryui: "https://code.jquery.com/ui/1.12.1/jquery-ui.min.js",
    gladcard: "./glad-card.js",
    google: "./googlelogin.js",
    chat: "./chat.js",
    cloudinary: "https://widget.cloudinary.com/v2.0/global/all.js",
    Blockly: [
        "./blockly.js",
        "./pt-br.js",
        "./python.js"
        // "https://cdn.jsdelivr.net/gh/google/blockly@3.20200625.2/msg/js/pt-br.min.js",
        // "https://cdn.jsdelivr.net/gh/google/blockly@3.20200625.2/python_compressed.js",

        // "https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/blockly.min.js",
        // "https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/msg/pt-br.js",
        // "https://cdn.jsdelivr.net/npm/blockly@3.20200123.1/python.js"
    ]
}

const callbacks = {
    Prism: () => {
        Prism.plugins.autoloader.languages_path = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.17.1/components/"
    }
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
                this[pack].then( () => {
                    callbacks[pack]()
                })
            }
        }
        // return the import promise
        return this[pack]
    }
}
