"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.loadSave = loadSave;
exports.loadSaveSync = loadSaveSync;
exports.loadCourse = loadCourse;
exports.loadCourseSync = loadCourseSync;
exports.deserialize = deserialize;
exports.loadImage = loadImage;

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require("fs");

var fs = _interopRequireWildcard(_fs);

var _path = require("path");

var path = _interopRequireWildcard(_path);

var _save = require("./save");

var _save2 = _interopRequireDefault(_save);

var _course = require("./course");

var _course2 = _interopRequireDefault(_course);

var _tnl = require("./tnl");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Loads a save from fs
 * @function loadSave
 * @param {string} pathToSave - path to save on fs
 * @return {Promise.<Save>}
 * @throws {Error} pathToSave must exist and must have read/write privileges
 */
async function loadSave(pathToSave) {
    return new _bluebird2.default(resolve => {
        pathToSave = path.resolve(pathToSave);
        if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
        fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, err => {
            if (err) throw new Error("Please close your emulator before executing your script");
        });
        fs.readFile(path.resolve(`${pathToSave}/save.dat`), (err, data) => {
            if (err) throw err;
            resolve(new _save2.default(pathToSave, data));
        });
    });
}

/**
 * Synchronous version of {@link loadSave}
 * @function loadSave
 * @param {string} pathToSave - path to save on fs
 * @return {Save}
 * @throws {Error} pathToSave must exist and must have read/write privileges
 */
function loadSaveSync(pathToSave) {
    pathToSave = path.resolve(pathToSave);
    if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
    fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, err => {
        if (err) throw new Error("Please close your emulator before executing your script");
    });
    let data = fs.readFileSync(path.resolve(`${pathToSave}/save.dat`));
    return new _save2.default(pathToSave, data);
}

/**
 * Loads a course from fs
 * @function loadCourse
 * @param {string} coursePath - path to course on fs
 * @param {number} [courseId] - course ID inside save
 * @return {Promise.<Course>}
 */
async function loadCourse(coursePath, courseId) {

    return new _bluebird2.default((resolve, reject) => {
        fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), async (err, data) => {
            if (err || !data) {
                reject(err);
            }
            let dataSub = await new _bluebird2.default((resolve, reject) => {
                fs.readFile(path.resolve(`${coursePath}/course_data_sub.cdt`), async (err, data) => {
                    if (err || !data) {
                        reject(err);
                    }
                    resolve(data);
                });
            });
            try {
                let course = new _course2.default(courseId, data, dataSub, coursePath);
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
function loadCourseSync(coursePath, courseId) {

    let data = fs.readFileSync(path.resolve(`${coursePath}/course_data.cdt`));
    let dataSub = fs.readFileSync(path.resolve(`${coursePath}/course_data_sub.cdt`));
    return new _course2.default(courseId, data, dataSub, coursePath);
}

/**
 * Deserializes a Node buffer or Uint8Array
 * @function deserialize
 * @param {Buffer | Uint8Array} buffer
 * @returns {Course}
 */
function deserialize(buffer) {
    return _course2.default.deserialize(buffer);
}

/**
 * Load JPEG or TNL image
 * @function loadImage
 * @param {string} pathToFile - path to image on fs
 * @return {Tnl | Jpeg}
 * @throws {Error} pathToFile must exist, must have read/write privileges and file must be JPEG or TNL
 */
function loadImage(pathToFile) {
    let split = pathToFile.split('.');
    let ending = split[split.length - 1];
    if (ending === 'tnl') {
        return new _tnl.Tnl(pathToFile);
    } else if (ending === 'jpg' || ending === 'jpeg') {
        return new _tnl.Jpeg(pathToFile);
    } else {
        throw new Error("image must either be jpeg or tnl ");
    }
}