var smm = require("./src/main.js");
var smmLegacy = require("./legacy/main.js");

module.exports = {
    loadSave: smm.loadSave,
    loadSaveSync: smm.loadSaveSync,
    loadImage: smm.loadImage,
    legacy: smmLegacy
};