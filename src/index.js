import Promise from "bluebird"

import * as fs   from "fs"
import * as path from "path"

import Save   from "./save"
import Course, { COURSE_CONSTANTS } from "./course"
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
 * @function loadSaveSync
 * @param {string} pathToSave - path to save on fs
 * @return {Save}
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

/**
 * Loads a course from fs
 * @function loadCourse
 * @param {string} coursePath - path to course on fs
 * @param {number} [courseId] - course ID inside save
 * @return {Promise.<Course>}
 */
export async function loadCourse (coursePath, courseId) {

    return new Promise ((resolve, reject) => {
        fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), async (err, data) => {
            if (err || !data) {
                reject(err);
            }
            let dataSub = await new Promise((resolve, reject) => {
                fs.readFile(path.resolve(`${coursePath}/course_data_sub.cdt`), async (err, data) => {
                    if (err || !data) {
                        reject(err);
                    }
                    resolve(data);
                });
            });
            try {
                let course = new Course(courseId, data, dataSub, coursePath);
                resolve(course);
            } catch (err) {
                reject(err);
            }
        });
    });

}

/**
 * Synchronous version of {@link loadCourse}
 * @function loadCourseSync
 * @param {string} coursePath - path to course on fs
 * @param {number} [courseId] - course ID inside save
 * @returns {Course}
 */
export function loadCourseSync (coursePath, courseId) {

    let data = fs.readFileSync(path.resolve(`${coursePath}/course_data.cdt`));
    let dataSub = fs.readFileSync(path.resolve(`${coursePath}/course_data_sub.cdt`));
    return new Course(courseId, data, dataSub, coursePath);

}

/**
 * Decompresses a file and loads all included courses into an array
 * @function decompress
 * @param {string} filePath - path of compresses file
 * @returns {Promise.<Array.<Course>>}
 */
export async function decompress (filePath) {
    return await Course.decompress(filePath);
}

/**
 * Deserializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
 * @function deserialize
 * @param {Buffer|Uint8Array} buffer - Node Buffer or Uint8Array to be converted to a {@link Course}
 * @returns {Promise.<Course>}
 */
export async function deserialize (buffer) {
    return await Course.deserialize(buffer);
}

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
    //} else if (ending === 'jpg' || ending === 'jpeg') {
        //return new Jpeg(pathToFile);
    } else {
        //throw new Error("image must either be jpeg or tnl ");
        return new Jpeg(pathToFile);
    }
}