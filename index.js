const Promise = require("bluebird");

const fs   = require("fs");
const path = require("path");

const Save = require( "./save");
const Tnl = require("./tnl");

module.exports = {
    loadSave: loadSave,
    loadImage: loadImage
};

async function loadSave(pathToSave) {
    return new Promise((resolve) => {
        pathToSave = path.resolve(pathToSave);
        if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
        fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, (err) => {
            if (err) throw new Error("Please close you emuulator before executing your script");
        });
        fs.readFile(path.resolve(`${pathToSave}/save.dat`), (err, data) => {
            if (err) throw err;
            resolve(new Save(pathToSave, data));
        });
    });
}

function loadImage(pathToFile) {
    return new Tnl(pathToFile);
}