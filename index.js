if (process.env.NODE_ENV === 'production') {
    var smm = require("./legacy/main.js");
    module.exports = {
        loadSave: smm.loadSave,
        loadSaveSync: smm.loadSaveSync,
        loadImage: smm.loadImage
    };
} else {
    let smm = require("./src/main.js");
    module.exports = {
        loadSave: smm.loadSave,
        loadSaveSync: smm.loadSaveSync,
        loadImage: smm.loadImage
    };
}