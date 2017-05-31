import Promise from "bluebird"

import * as fs from "fs"
import * as path from "path"

import Save from "./save"
import {
    Tnl, Jpeg
} from "./tnl"

/**
 * Loads a save from fs
 * @function loadSave
 * @param {string} pathToSave - path to save on fs
 * @return {Promise.<Save>}
 * @throws {Error} pathToSave must exist and must have read/write privileges
 */
export async function loadSave(pathToSave) {
    return new Promise((resolve) => {
        pathToSave = path.resolve(pathToSave);
        if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
        fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, (err) => {
            if (err) throw new Error("Please close your emulator before executing your script");
        });
        fs.readFile(path.resolve(`${pathToSave}/save.dat`), (err, data) => {
            if (err) throw err;
            resolve(new Save(pathToSave, data));
        });
    });
}

/**
 * Synchronous version of {@link loadSave}
 * @function loadSave
 * @param {string} pathToSave - path to save on fs
 * @return {Promise.<Save>}
 * @throws {Error} pathToSave must exist and must have read/write privileges
 */
export function loadSaveSync(pathToSave) {
    pathToSave = path.resolve(pathToSave);
    if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
    fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, (err) => {
        if (err) throw new Error("Please close your emulator before executing your script");
    });
    let data = fs.readFileSync(path.resolve(`${pathToSave}/save.dat`));
    return new Save(pathToSave, data);
}

export {
    loadCourse,
    loadCourseSync,
    deserialize
} from "./course"

/**
 * Load JPEG or TNL image
 * @function loadImage
 * @param {string} pathToFile - path to image on fs
 * @return {Tnl | Jpeg}
 * @throws {Error} pathToFile must exist, must have read/write privileges and file must be JPEG or TNL
 */
export function loadImage(pathToFile) {
    let split = pathToFile.split('.');
    let ending = split[split.length - 1];
    if (ending === 'tnl') {
        return new Tnl(pathToFile);
    } else if (ending === 'jpg' || ending === 'jpeg') {
        return new Jpeg(pathToFile);
    } else {
        throw new Error("image must either be jpeg or tnl ");
    }
}