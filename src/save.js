import Promise from "bluebird"
import crc32   from "buffer-crc32"
import copydir from "copy-dir"
import rimraf  from "rimraf"

import * as fs   from "fs"
import * as path from "path"

import {
    loadCourse, loadCourseSync
} from "."
import {
    Tnl, Jpeg
} from "./tnl"

const SAVE_SIZE  = 0xA000;

const SAVE_ORDER_OFFSET = 0x4340;
const SAVE_ORDER_SIZE = 120;
const SAVE_ORDER_EMPTY = 0xFF;

const SAVE_AMIIBO_OFFSET = 0x85E0;
const SAVE_AMIIBO_LENGTH = 0x14;

const SAVE_CRC_LENGTH = 0x10;
const SAVE_CRC_PRE_BUF  = Buffer.from("0000000000000015", "hex");
const SAVE_CRC_POST_BUF = Buffer.alloc(4);

const slotToIndex = Symbol();

//
// @param {string} pathToSave - path to Super Mario Maker save on fs
// @param {Buffer} data - Node buffer of save.dat file
/**
 * Represents a Super Mario Maker save
 * @class Save
 */
export default class Save {

    constructor (pathToSave, data) {

        /**
         * Path to save
         * @member {string} pathToSave
         * @memberOf Save
         * @instance
         */
        this.pathToSave = pathToSave;

        /**
         * Node buffer of save.dat file
         * @member {Buffer} data
         * @memberOf Save
         * @instance
         */
        this.data = data;

        /**
         * Courses belonging to this save
         * @member {Object.<string,Course>} courses
         * @memberOf Save
         * @instance
         */
        this.courses = {};

        this[slotToIndex] = {};
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let index = this.data.readUInt8(SAVE_ORDER_OFFSET + i);
            if (index !== 255) {
                this[slotToIndex][i] = index;
            }
        }

    }

    /**
     * Writes crc checksum of save.dat
     * @function writeCrc
     * @memberOf Save
     * @instance
     * @returns {Promise.<void>}
     */
    async writeCrc () {

        return await new Promise((resolve) => {
            try {
                let fileWithoutCrc = this.data.slice(16);
                let crc = Buffer.alloc(4);
                crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                let crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH);
                this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
                fs.writeFile(path.resolve(`${this.pathToSave}/save.dat`), this.data, null, () => {
                    resolve();
                })
            } catch (err) {
                console.log(err);
            }
        });

    }

    /**
     * Synchronous version of {@link Save#writeCrc}
     * @function writeCrcSync
     * @memberOf Save
     * @instance
     */
    writeCrcSync () {

        let fileWithoutCrc = this.data.slice(16);
        let crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
        let crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH);
        this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
        fs.writeFileSync(path.resolve(`${this.pathToSave}/save.dat`), this.data);

    }

    /**
     * Reorders course folders to match actual in game appearance
     * @function reorder
     * @memberOf Save
     * @instance
     * @returns {Promise.<void>}
     */
    async reorder () {

        return await new Promise(async (resolve) => {
            try {
                // rename course folders
                let promises = [];
                let sti = {};
                Object.assign(sti, this[slotToIndex]);
                for (let i in sti) {
                    promises.push(new Promise((resolve) => {
                        let value = sti[i];
                        let srcPath = path.resolve(`${this.pathToSave}/course${parseInt(i).pad(3)}`);
                        let dstPath = path.resolve(`${this.pathToSave}/course${value.pad(3)}_reorder`);
                        fs.rename(srcPath, dstPath, () => {
                            this[slotToIndex][value] = value;
                            this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value);
                            resolve();
                        });
                        resolve();
                    }));
                }
                await Promise.all(promises);
                promises = [];
                for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                    promises.push(new Promise((resolve) => {
                        let srcPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}_reorder`);
                        let dstPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}`);
                        fs.rename(srcPath, dstPath, (err) => {
                            if (err) {
                                if (this[slotToIndex][i]) {
                                    delete this[slotToIndex][i];
                                }
                                this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i);
                            }
                            resolve();
                        });
                    }));
                }
                await Promise.all(promises);
                promises = [];
                for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                    promises.push(new Promise((resolve) => {
                        fs.access(path.resolve(`${this.pathToSave}/course${i.pad(3)}`), fs.constants.R_OK | fs.constants.W_OK, (err) => {
                            if (!err) {
                                this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
                            }
                            resolve();
                        })
                    }));
                }
                await Promise.all(promises);

                // recalculate checksum
                await this.writeCrc();

                resolve();
            } catch (err) {
                console.log(err);
                // TODO undo changes
            }
        });

    }

    /**
     * Synchronous version of {@link Save#reorder}
     * @function reorderSync
     * @memberOf Save
     * @instance
     */
    reorderSync () {

        try {
            // rename course folders
            let sti = {};
            Object.assign(sti, this[slotToIndex]);
            for (let i in sti) {
                let value = sti[i];
                let srcPath = path.resolve(`${this.pathToSave}/course${parseInt(i).pad(3)}`);
                let dstPath = path.resolve(`${this.pathToSave}/course${value.pad(3)}_reorder`);
                fs.renameSync(srcPath, dstPath);
                this[slotToIndex][value] = value;
                this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value);
            }
            for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                let srcPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}_reorder`);
                let dstPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}`);
                try {
                    fs.renameSync(srcPath, dstPath);
                } catch (err) {
                    if (this[slotToIndex][i]) {
                        delete this[slotToIndex][i];
                    }
                    this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i);
                }
            }
            for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                try {
                    fs.accessSync(path.resolve(`${this.pathToSave}/course${i.pad(3)}`), fs.constants.R_OK | fs.constants.W_OK);
                    this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
                } catch (err) {}
            }

            // recalculate checksum
            this.writeCrc();
        } catch (err) {
            console.log(err);
            // TODO undo changes
        }

    }

    /**
     * Exports all course thumbnails as JPEG within course folders
     * @function exportThumbnail
     * @memberOf Save
     * @instance
     * @returns {Promise.<void>}
     */
    async exportThumbnail () {

        let promises = [];
        if (this.courses === {}) {
            await this.loadCourses();
        }
        for (let key in this.courses) {
            promises.push(new Promise(async (resolve) => {
                await this.courses[key].exportThumbnail();
                resolve();
            }));
        }
        return await Promise.all(promises);

    }

    /**
     * Synchronous version of {@link Save#exportThumbnail}
     * @function exportThumbnailSync
     * @memberOf Save
     * @instance
     */
    exportThumbnailSync () {

        if (this.courses === {}) {
            this.loadCoursesSync();
        }
        for (let key in this.courses) {
            this.courses[key].exportThumbnailSync();
        }

    }

    /**
     * Exports all JPEG thumbnails as TNL within course folders
     * @function importThumbnail
     * @memberOf Save
     * @instance
     * @returns {Promise.<void>}
     */
    async importThumbnail () {

        let promises = [];
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let coursePath = path.resolve(`${this.pathToSave}/course${i.pad(3)}/`);
            promises.push(new Promise(async (resolve) => {
                let exists = false;
                await new Promise((resolve) => {
                    fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        exists = !err;
                        resolve();
                    });
                });
                if (exists) {
                    await Promise.all([
                        new Promise(async (resolve) => {
                            try {
                                let jpeg = new Jpeg(coursePath + "/thumbnail0.jpg");
                                let tnl = await jpeg.toTnl(true);
                                fs.writeFile(coursePath + "/thumbnail0.tnl", tnl, null, () => {
                                    resolve();
                                })
                            } catch (err) {
                                resolve();
                            }
                        }),
                        new Promise(async (resolve) => {
                            try {
                                let jpeg = new Jpeg(coursePath + "/thumbnail1.jpg");
                                let tnl = await jpeg.toTnl(false);
                                fs.writeFile(coursePath + "/thumbnail1.tnl", tnl, null, () => {
                                    resolve();
                                });
                            } catch (err) {
                                resolve();
                            }
                        })
                    ]);
                }
                resolve();
            }));
        }
        return await Promise.all(promises);

    }

    /**
     * Unlocks Amiibos for this save
     * @function unlockAmiibos
     * @memberOf Save
     * @instance
     * @returns {Promise.<void>}
     */
    async unlockAmiibos () {

        return await new Promise(async (resolve) => {
            for (let i = 0; i < SAVE_AMIIBO_LENGTH; i++) {
                this.data.writeUInt8(0xFF, SAVE_AMIIBO_OFFSET + i);
            }
            await this.writeCrc();
            resolve();
        })

    }

    /**
     * Load courses and store them in {@link Save#courses}
     * @function loadCourses
     * @memberOf Save
     * @instance
     * @returns {Object.<string,Course>}
     */
    async loadCourses () {

        let promises = [];
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            promises.push(new Promise(async (resolve) => {
                let courseName = `course${i.pad(3)}`;
                let coursePath = path.resolve(`${this.pathToSave}/${courseName}/`);
                let exists = await new Promise((resolve) => {
                    fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        resolve(!err);
                    });
                });
                if (exists) {
                    try {
                        this.courses[courseName] = await loadCourse(coursePath, i);
                        this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
                    } catch (err) {
                        this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i);
                    }
                } else {
                    this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i);
                }
                resolve();
            }));
        }
        await Promise.all(promises);
        await this.writeCrc();
        return this.courses;

    }

    /**
     * Synchronous version of {@link Save#loadCourses}
     * @function loadCoursesSync
     * @memberOf Save
     * @instance
     * @returns {Object.<string,Course>}
     */
    loadCoursesSync () {

        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let courseName = `course${i.pad(3)}`;
            let coursePath = path.resolve(`${this.pathToSave}/${courseName}/`);
            try {
                fs.accessSync(coursePath, fs.constants.R_OK | fs.constants.W_OK);
                this.courses[courseName] = loadCourseSync(coursePath, i);
                this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
            } catch (err) {
                this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i);
            }
        }
        this.writeCrcSync();
        return this.courses;

    }

    /**
     * Stores a course in this save
     * @function addCourse
     * @memberOf Save
     * @instance
     * @param {Course} course - course to be stored in save
     * @returns {number} course slot ID
     * @throws {Error} Save must have an empty slot
     */
    async addCourse (course) {

        let emptySlotName = "";
        let emptySlot = -1;
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let courseName = `course${i.pad(3)}`;
            if (!this.courses[courseName]) {
                emptySlotName = courseName;
                emptySlot = i;
                break;
            }
        }
        if (emptySlot === -1) {
            throw new Error("No empty slot inside save");
        }
        let cemuSavePath = path.join(this.pathToSave, emptySlotName);
        await course.writeToSave(emptySlot, cemuSavePath);
        this.data.writeUInt8(emptySlot, SAVE_ORDER_OFFSET + emptySlot);
        this.courses[emptySlotName] = course;
        await this.writeCrc();
        return emptySlot;

    }

    /**
     * Stores a course from fs in this save
     * @function addCourseFromFs
     * @memberOf Save
     * @instance
     * @param {string} coursePath - course to be stored in save
     * @returns {number} course slot ID
     * @throws {Error} courseDataPath must exist
     * @throws {Error} Save must have an empty slot
     */
    async addCourseFromFs (coursePath) {

        if (this.courses === {}) {
            await this.loadCourses();
        }
        if (!fs.existsSync(coursePath)) {
            throw new Error("Path does not exist: " + coursePath);
        }
        let emptySlotName = "";
        let emptySlot = -1;
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let courseName = `course${i.pad(3)}`;
            if (!this.courses[courseName]) {
                emptySlotName = courseName;
                emptySlot = i;
                break;
            }
        }
        if (emptySlot === -1) {
            throw new Error("No empty slot inside save");
        }
        let cemuSavePath = path.join(this.pathToSave, emptySlotName);
        try {
            return await new Promise((resolve) => {
                rimraf(cemuSavePath, async () => {
                    fs.mkdirSync(cemuSavePath);
                    copydir.sync(coursePath, cemuSavePath);
                    this.data.writeUInt8(emptySlot, SAVE_ORDER_OFFSET + emptySlot);
                    this.courses[emptySlotName] = await loadCourse(cemuSavePath, emptySlot);
                    await this.writeCrc();
                    resolve(emptySlot);
                })
            });
        } catch (err) {
            throw err;
        }

    }

    /**
     * Deletes a course from this save
     * @function deleteCourse
     * @memberOf Save
     * @instance
     * @param {number} courseId - ID of course to be deleted
     * @returns {Promise<void>}
     * @throws {Error} course with courseId must exist
     */
    async deleteCourse (courseId) {

        if (this.courses === {}) {
            await this.loadCourses();
        }
        let courseName = `course${courseId.pad(3)}`;
        let coursePath = path.join(this.pathToSave, courseName);
        if (!fs.existsSync(coursePath)) {
            throw new Error("Course does not exist: course" + courseId.pad(3));
        }
        try {
            return await new Promise((resolve) => {
                rimraf(coursePath, async () => {
                    this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + courseId);
                    delete this.courses[courseName];
                    await this.writeCrc();
                    resolve();
                })
            });
        } catch (err) {
            throw err;
        }

    }
}

Number.prototype.pad = function(size) {
    let s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
};