let DefinedManager = require("./defined.js")
let manager = new DefinedManager()
manager.setDefinedID("Plugin")
manager.transformCode((code, name) => {
    code = `//# sourceURL=${name.toUpperCase()}\n
    ${code}`

    //console.log(newCode)
    return code

})

let apps = manager.addDefined("APP", ["./app"], true, ["APP"]) //LOAD ALL API's
