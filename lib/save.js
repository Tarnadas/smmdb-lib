"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _bufferCrc = require("buffer-crc32");

var _bufferCrc2 = _interopRequireDefault(_bufferCrc);

var _copyDir = require("copy-dir");

var _copyDir2 = _interopRequireDefault(_copyDir);

var _rimraf = require("rimraf");

var _rimraf2 = _interopRequireDefault(_rimraf);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _course = require("./course");

var _tnl = require("./tnl");

var _tnl2 = _interopRequireDefault(_tnl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SAVE_SIZE = 0xA000;

const SAVE_ORDER_OFFSET = 0x4340;
const SAVE_ORDER_SIZE = 120;
const SAVE_ORDER_EMPTY = 0xFF;

const SAVE_AMIIBO_OFFSET = 0x85E0;
const SAVE_AMIIBO_LENGTH = 0x14;

const SAVE_CRC_LENGTH = 0x10;
const SAVE_CRC_PRE_BUF = Buffer.from("0000000000000015", "hex");
const SAVE_CRC_POST_BUF = Buffer.alloc(4);

class Save {

    constructor(pathToSave, data) {
        this.pathToSave = pathToSave;
        this.data = data;
        this.courses = {};

        this.slotToIndex = {};
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let index = this.data.readUInt8(SAVE_ORDER_OFFSET + i);
            if (index !== 255) {
                this.slotToIndex[i] = index;
            }
        }
    }

    async writeCrc() {

        return await new _bluebird2.default(resolve => {
            try {
                let fileWithoutCrc = this.data.slice(16);
                let crc = Buffer.alloc(4);
                crc.writeUInt32BE(_bufferCrc2.default.unsigned(fileWithoutCrc), 0);
                let crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH);
                this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
                _fs2.default.writeFile(_path2.default.resolve(`${this.pathToSave}/save.dat`), this.data, null, () => {
                    resolve();
                });
            } catch (err) {
                console.log(err);
            }
        });
    }

    writeCrcSync() {

        let fileWithoutCrc = this.data.slice(16);
        let crc = Buffer.alloc(4);
        crc.writeUInt32BE(_bufferCrc2.default.unsigned(fileWithoutCrc), 0);
        let crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH);
        this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
        _fs2.default.writeFileSync(_path2.default.resolve(`${this.pathToSave}/save.dat`), this.data);
    }

    async reorder() {

        await new _bluebird2.default(async resolve => {
            try {
                // rename course folders
                let promises = [];
                let slotToIndex = {};
                (0, _assign2.default)(slotToIndex, this.slotToIndex);
                for (let i in slotToIndex) {
                    promises.push(new _bluebird2.default(resolve => {
                        let value = slotToIndex[i];
                        let srcPath = _path2.default.resolve(`${this.pathToSave}/course${parseInt(i).pad(3)}`);
                        let dstPath = _path2.default.resolve(`${this.pathToSave}/course${value.pad(3)}_reorder`);
                        _fs2.default.rename(srcPath, dstPath, () => {
                            this.slotToIndex[value] = value;
                            this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value);
                            resolve();
                        });
                        resolve();
                    }));
                }
                await _bluebird2.default.all(promises);
                promises = [];
                for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                    promises.push(new _bluebird2.default(resolve => {
                        let srcPath = _path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}_reorder`);
                        let dstPath = _path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}`);
                        _fs2.default.rename(srcPath, dstPath, err => {
                            if (err) {
                                if (this.slotToIndex[i]) {
                                    delete this.slotToIndex[i];
                                }
                                this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i);
                            }
                            resolve();
                        });
                    }));
                }
                await _bluebird2.default.all(promises);
                promises = [];
                for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                    promises.push(new _bluebird2.default(resolve => {
                        _fs2.default.access(_path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}`), _fs2.default.constants.R_OK | _fs2.default.constants.W_OK, err => {
                            if (!err) {
                                this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
                            }
                            resolve();
                        });
                    }));
                }
                await _bluebird2.default.all(promises);

                // recalculate checksum
                this.writeCrc();

                resolve();
            } catch (err) {
                console.log(err);
                // TODO undo changes
            }
        });
    }

    reorderSync() {

        try {
            // rename course folders
            let slotToIndex = {};
            (0, _assign2.default)(slotToIndex, this.slotToIndex);
            for (let i in this.slotToIndex) {
                let value = slotToIndex[i];
                let srcPath = _path2.default.resolve(`${this.pathToSave}/course${parseInt(i).pad(3)}`);
                let dstPath = _path2.default.resolve(`${this.pathToSave}/course${value.pad(3)}_reorder`);
                _fs2.default.renameSync(srcPath, dstPath);
                this.slotToIndex[value] = value;
                this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value);
            }
            for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                let srcPath = _path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}_reorder`);
                let dstPath = _path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}`);
                try {
                    _fs2.default.renameSync(srcPath, dstPath);
                } catch (err) {
                    if (this.slotToIndex[i]) {
                        delete this.slotToIndex[i];
                    }
                    this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i);
                }
            }
            for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                try {
                    _fs2.default.accessSync(_path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}`), _fs2.default.constants.R_OK | _fs2.default.constants.W_OK);
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

    async exportJpeg() {

        let promises = [];
        if (this.courses === {}) {
            await this.loadCourses();
        }
        for (let key in this.courses) {
            promises.push(new _bluebird2.default(async resolve => {
                await this.courses[key].exportJpeg();
                resolve();
            }));
        }
        return await _bluebird2.default.all(promises);
    }

    exportJpegSync() {

        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let coursePath = _path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}/`);
            let exists = true;
            try {
                _fs2.default.accessSync(coursePath, _fs2.default.constants.R_OK | _fs2.default.constants.W_OK);
            } catch (err) {
                exists = false;
            }
            if (exists) {
                try {
                    let tnl = new _tnl2.default(coursePath + "/thumbnail0.tnl");
                    let jpeg = tnl.toJpegSync();
                    _fs2.default.writeFileSync(coursePath + "/thumbnail0.jpg", jpeg);
                } catch (err) {}
                try {
                    let tnl = new _tnl2.default(coursePath + "/thumbnail1.tnl");
                    let jpeg = tnl.toJpegSync();
                    _fs2.default.writeFileSync(coursePath + "/thumbnail1.jpg", jpeg);
                } catch (err) {}
            }
        }
    }

    async importJpeg() {

        let promises = [];
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let coursePath = _path2.default.resolve(`${this.pathToSave}/course${i.pad(3)}/`);
            promises.push(new _bluebird2.default(async resolve => {
                let exists = false;
                await new _bluebird2.default(resolve => {
                    _fs2.default.access(coursePath, _fs2.default.constants.R_OK | _fs2.default.constants.W_OK, err => {
                        exists = !err;
                        resolve();
                    });
                });
                if (exists) {
                    await _bluebird2.default.all([new _bluebird2.default(async resolve => {
                        try {
                            let jpeg = new _tnl2.default(coursePath + "/thumbnail0.jpg");
                            let tnl = await jpeg.fromJpeg(true);
                            _fs2.default.writeFile(coursePath + "/thumbnail0.tnl", tnl, null, () => {
                                resolve();
                            });
                        } catch (err) {
                            resolve();
                        }
                    }), new _bluebird2.default(async resolve => {
                        try {
                            let jpeg = new _tnl2.default(coursePath + "/thumbnail1.jpg");
                            let tnl = await jpeg.fromJpeg(false);
                            _fs2.default.writeFile(coursePath + "/thumbnail1.tnl", tnl, null, () => {
                                resolve();
                            });
                        } catch (err) {
                            resolve();
                        }
                    })]);
                }
                resolve();
            }));
        }
        await _bluebird2.default.all(promises);
    }

    async unlockAmiibos() {

        await new _bluebird2.default(async resolve => {
            for (let i = 0; i < SAVE_AMIIBO_LENGTH; i++) {
                this.data.writeUInt8(0xFF, SAVE_AMIIBO_OFFSET + i);
            }
            await this.writeCrc();
            resolve();
        });
    }

    async loadCourses() {

        let promises = [];
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            promises.push(new _bluebird2.default(async resolve => {
                let courseName = `course${i.pad(3)}`;
                let coursePath = _path2.default.resolve(`${this.pathToSave}/${courseName}/`);
                let exists = await new _bluebird2.default(resolve => {
                    _fs2.default.access(coursePath, _fs2.default.constants.R_OK | _fs2.default.constants.W_OK, err => {
                        resolve(!err);
                    });
                });
                if (exists) {
                    try {
                        this.courses[courseName] = await (0, _course.loadCourse)(coursePath, i);
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
        await _bluebird2.default.all(promises);
        await this.writeCrc();
        return this.courses;
    }

    loadCoursesSync() {

        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let courseName = `course${i.pad(3)}`;
            let coursePath = _path2.default.resolve(`${this.pathToSave}/${courseName}/`);
            try {
                _fs2.default.accessSync(coursePath, _fs2.default.constants.R_OK | _fs2.default.constants.W_OK);
                this.courses[courseName] = (0, _course.loadCourseSync)(coursePath, i);
                this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
            } catch (err) {
                this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i);
            }
        }
        this.writeCrcSync();
        return this.courses;
    }

    async addCourse(courseDataPath) {

        if (this.courses === {}) {
            await this.loadCourses();
        }
        if (!_fs2.default.existsSync(courseDataPath)) {
            throw new Error("Path does not exist: " + courseDataPath);
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
        let cemuSavePath = _path2.default.join(this.pathToSave, emptySlotName);
        try {
            return await new _bluebird2.default(resolve => {
                (0, _rimraf2.default)(cemuSavePath, async () => {
                    _fs2.default.mkdirSync(cemuSavePath);
                    _copyDir2.default.sync(courseDataPath, cemuSavePath);
                    this.data.writeUInt8(emptySlot, SAVE_ORDER_OFFSET + emptySlot);
                    this.courses[emptySlotName] = await (0, _course.loadCourse)(cemuSavePath, emptySlot);
                    await this.writeCrc();
                    resolve(emptySlot);
                });
            });
        } catch (err) {
            throw err;
        }
    }

    async deleteCourse(courseId) {

        if (this.courses === {}) {
            await this.loadCourses();
        }
        let courseName = `course${courseId.pad(3)}`;
        let coursePath = _path2.default.join(this.pathToSave, courseName);
        if (!_fs2.default.existsSync(coursePath)) {
            throw new Error("Course does not exist: course" + courseId.pad(3));
        }
        try {
            return await new _bluebird2.default(resolve => {
                (0, _rimraf2.default)(coursePath, async () => {
                    this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + courseId);
                    delete this.courses[courseName];
                    await this.writeCrc();
                    resolve();
                });
            });
        } catch (err) {
            throw err;
        }
    }

    loadCourseElements() {

        for (let key in this.courses) {
            //noinspection JSUnfilteredForInLoop
            this.courses[key].loadElements();
        }
    }
}

exports.default = Save;
Number.prototype.pad = function (size) {
    let s = String(this);
    while (s.length < (size || 2)) {
        s = "0" + s;
    }
    return s;
};