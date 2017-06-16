"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.COURSE_CONSTANTS = undefined;

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _from = require("babel-runtime/core-js/array/from");

var _from2 = _interopRequireDefault(_from);

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _symbol = require("babel-runtime/core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _bufferCrc = require("buffer-crc32");

var _bufferCrc2 = _interopRequireDefault(_bufferCrc);

var _protobufjs = require("protobufjs");

var _protobufjs2 = _interopRequireDefault(_protobufjs);

var _bundle = require("smm-protobuf/proto/bundle.json");

var proto = _interopRequireWildcard(_bundle);

var _fileType = require("file-type");

var _fileType2 = _interopRequireDefault(_fileType);

var _readChunk = require("read-chunk");

var _readChunk2 = _interopRequireDefault(_readChunk);

var _node7z = require("node-7z");

var _node7z2 = _interopRequireDefault(_node7z);

var _tmp = require("tmp");

var _tmp2 = _interopRequireDefault(_tmp);

var _rimraf = require("rimraf");

var _rimraf2 = _interopRequireDefault(_rimraf);

var _bitwise = require("bitwise");

var _bitwise2 = _interopRequireDefault(_bitwise);

var _fs = require("fs");

var fs = _interopRequireWildcard(_fs);

var _path = require("path");

var path = _interopRequireWildcard(_path);

var _zlib = require("zlib");

var zlib = _interopRequireWildcard(_zlib);

var _ = require(".");

var _tile = require("./tile");

var _tile2 = _interopRequireDefault(_tile);

var _sound = require("./sound");

var _sound2 = _interopRequireDefault(_sound);

var _tnl = require("./tnl");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const sound = fs.readFileSync(path.join(__dirname, "../data/sound.bwv"));
//import { unzip }  from "cross-unzip"


const root = _protobufjs2.default.Root.fromJSON(proto);
const smmCourse = root.lookupType('SMMCourse');

const COURSE_CONSTANTS = exports.COURSE_CONSTANTS = {
    SIZE: 0x15000,

    CRC_LENGTH: 0x10,
    CRC_PRE_BUF: Buffer.from("000000000000000B", "hex"),
    CRC_POST_BUF: Buffer.alloc(4),

    TIMESTAMP_0_OFFSET: 0x1,
    TIMESTAMP_1_OFFSET: 0x14,

    NAME_OFFSET: 0x29,
    NAME_LENGTH: 0x40,

    MAKER_OFFSET: 0x92,
    MAKER_LENGTH: 0x14,

    GAME_STYLE_OFFSET: 0x6A,
    GAME_STYLE: root.lookupEnum('SMMCourse.GameStyle').values,
    GAME_STYLE_BY_ID: root.lookupEnum('SMMCourse.GameStyle').valuesById,

    THEME_OFFSET: 0x6D,
    THEME: root.lookupEnum('SMMCourse.CourseTheme').values,
    THEME_BY_ID: root.lookupEnum('SMMCourse.CourseTheme').valuesById,

    TIME_OFFSET: 0x70,

    AUTO_SCROLL_OFFSET: 0x72,
    AUTO_SCROLL: root.lookupEnum('SMMCourse.AutoScroll').values,
    AUTO_SCROLL_BY_ID: root.lookupEnum('SMMCourse.AutoScroll').valuesById,

    WIDTH_OFFSET: 0x76,

    TILE_AMOUNT_OFFSET: 0xEE, // uint_16

    TILES_OFFSET: 0xF0,

    SOUND_OFFSET: 0x145F0,
    SOUND_END_OFFSET: 0x14F50
};

const courseId = (0, _symbol2.default)();
const coursePath = (0, _symbol2.default)();
const courseData = (0, _symbol2.default)();
const courseDataSub = (0, _symbol2.default)();
const tnl = (0, _symbol2.default)();
const tnlPreview = (0, _symbol2.default)();
const endiannessBE = (0, _symbol2.default)();

/**
 * Represents a Super Mario Maker course
 * @class Course
 */
class Course {

    constructor(isWiiU, id, data, dataSub, path) {

        if (!!path && !fs.existsSync(path)) {
            throw new Error("Path does not exists: " + path);
        }
        this[courseId] = id;
        if (isWiiU) {
            this[endiannessBE] = true;
            this[courseData] = data;
            this[courseDataSub] = dataSub;
            if (!!path) {
                [this[tnl], this[tnlPreview]] = this.loadTnl();
                this.loadThumbnailSync();
            }
        } else {
            this[endiannessBE] = false;
            this[courseData] = data.slice(0x1C, 0x15000 + 0x1C);
            this[courseDataSub] = data.slice(0x15000 + 0x1C, 2 * 0x15000 + 0x1C);
            this.changeEndian();
            // TODO convert 3DS thumbnail to jpeg
            this.thumbnail = Buffer.alloc(0xABE0); //data.slice(2 * 0x15000 + 0x1C, 2 * 0x15000 + 0x1C + 0x157C0);
            this.thumbnailPreview = Buffer.alloc(0xABE0); //data.slice(2 * 0x15000 + 0x1C, 2 * 0x15000 + 0x1C + 0x157C0);
        }
        this[coursePath] = path;

        if (!this[courseData] || !this[courseDataSub]) return this;

        /**
         * Title of course
         * @member {string} title
         * @memberOf Course
         * @instance
         */
        this.title = "";
        let titleBuf = this[courseData].slice(COURSE_CONSTANTS.NAME_OFFSET, COURSE_CONSTANTS.NAME_OFFSET + COURSE_CONSTANTS.NAME_LENGTH);
        for (let i = 0; i < COURSE_CONSTANTS.NAME_LENGTH; i += 2) {
            let charBuf = Buffer.allocUnsafe(2);
            charBuf.writeUInt16BE(titleBuf.readUInt16BE(i), 0);
            if (charBuf.readUInt16BE(0) === 0) {
                break;
            }
            this.title += charBuf.toString('utf16le');
        }

        /**
         * Maker name
         * @member {string} maker
         * @memberOf Course
         * @instance
         */
        this.maker = "";
        let makerBuf = this[courseData].slice(COURSE_CONSTANTS.MAKER_OFFSET, COURSE_CONSTANTS.MAKER_OFFSET + COURSE_CONSTANTS.MAKER_LENGTH);
        for (let i = 0; i < COURSE_CONSTANTS.MAKER_LENGTH; i += 2) {
            let charBuf = Buffer.allocUnsafe(2);
            charBuf.writeUInt16BE(makerBuf.readUInt16BE(i), 0);
            if (charBuf.readUInt16BE(0) === 0) {
                break;
            }
            this.maker += charBuf.toString('utf16le');
        }

        /**
         * Game style of course
         * @member {number} gameStyle
         * @memberOf Course
         * @instance
         */
        this.gameStyle = COURSE_CONSTANTS.GAME_STYLE[this[courseData].slice(COURSE_CONSTANTS.GAME_STYLE_OFFSET, COURSE_CONSTANTS.GAME_STYLE_OFFSET + 2).toString()];

        /**
         * Course theme
         * @member {number} courseTheme
         * @memberOf Course
         * @instance
         */
        this.courseTheme = this[courseData].readUInt8(COURSE_CONSTANTS.THEME_OFFSET);

        /**
         * Course theme sub
         * @member {number} courseThemeSub
         * @memberOf Course
         * @instance
         */
        this.courseThemeSub = this[courseDataSub].readUInt8(COURSE_CONSTANTS.THEME_OFFSET);

        /**
         * Completion time
         * @member {number} time
         * @memberOf Course
         * @instance
         */
        this.time = this[courseData].readUInt16BE(COURSE_CONSTANTS.TIME_OFFSET);

        /**
         * Course auto scroll
         * @member {number} autoScroll
         * @memberOf Course
         * @instance
         */
        this.autoScroll = this[courseData].readUInt8(COURSE_CONSTANTS.AUTO_SCROLL_OFFSET);

        /**
         * CourseSub auto scroll
         * @member {number} autoScrollSub
         * @memberOf Course
         * @instance
         */
        this.autoScrollSub = this[courseDataSub].readUInt8(COURSE_CONSTANTS.AUTO_SCROLL_OFFSET);

        /**
         * Course width
         * @member {number} width
         * @memberOf Course
         * @instance
         */
        this.width = this[courseData].readUInt16BE(COURSE_CONSTANTS.WIDTH_OFFSET);

        /**
         * CourseSub width
         * @member {number} widthSub
         * @memberOf Course
         * @instance
         */
        this.widthSub = this[courseDataSub].readUInt16BE(COURSE_CONSTANTS.WIDTH_OFFSET);

        /**
         * Tiles of main course
         * @member {Array<Tile>} tiles
         * @memberOf Course
         * @instance
         */
        this.tiles = [];
        let tileAmount = this[courseData].readUInt16BE(COURSE_CONSTANTS.TILE_AMOUNT_OFFSET);
        for (let i = 0, offset = COURSE_CONSTANTS.TILES_OFFSET; i < tileAmount; i++, offset += _tile.TILE_CONSTANTS.SIZE) {
            let tileData = this[courseData].slice(offset, offset + _tile.TILE_CONSTANTS.SIZE);
            this.tiles.push(new _tile2.default(tileData));
        }

        /**
         * Tiles of sub course
         * @member {Array<Tile>} tilesSub
         * @memberOf Course
         * @instance
         */
        this.tilesSub = [];
        tileAmount = this[courseDataSub].readUInt16BE(COURSE_CONSTANTS.TILE_AMOUNT_OFFSET);
        for (let i = 0, offset = COURSE_CONSTANTS.TILES_OFFSET; i < tileAmount; i++, offset += _tile.TILE_CONSTANTS.SIZE) {
            let tileData = this[courseDataSub].slice(offset, offset + _tile.TILE_CONSTANTS.SIZE);
            this.tilesSub.push(new _tile2.default(tileData));
        }

        /**
         * Course sounds
         * @member {Array<Sound>} sounds
         * @memberOf Course
         * @instance
         */
        this.sounds = [];
        for (let offset = COURSE_CONSTANTS.SOUND_OFFSET; offset < COURSE_CONSTANTS.SOUND_END_OFFSET; offset += _sound.SOUND_CONSTANTS.SIZE) {
            if (this[courseData].readUInt8(offset) !== 0xFF) {
                let soundData = this[courseData].slice(offset, offset + _sound.SOUND_CONSTANTS.SIZE);
                this.sounds.push(new _sound2.default(soundData));
            }
        }

        /**
         * Course sounds
         * @member {Array<Sound>} soundsSub
         * @memberOf Course
         * @instance
         */
        this.soundsSub = [];
        for (let offset = COURSE_CONSTANTS.SOUND_OFFSET; offset < COURSE_CONSTANTS.SOUND_END_OFFSET; offset += _sound.SOUND_CONSTANTS.SIZE) {
            if (this[courseDataSub].readUInt8(offset) !== 0xFF) {
                let soundData = this[courseDataSub].slice(offset, offset + _sound.SOUND_CONSTANTS.SIZE);
                this.soundsSub.push(new _sound2.default(soundData));
            }
        }
    }

    static async fromObject(obj) {

        let course = new Course();
        (0, _assign2.default)(course, obj);

        let data = [courseData, courseDataSub];
        let courseTheme = ['courseTheme', 'courseThemeSub'];
        let autoScroll = ['autoScroll', 'autoScrollSub'];
        let width = ['width', 'widthSub'];
        let tiles = ['tiles', 'tilesSub'];
        let sounds = ['sounds', 'soundsSub'];
        for (let i = 0; i < data.length; i++) {
            // meta
            course[data[i]] = Buffer.alloc(COURSE_CONSTANTS.TILES_OFFSET);
            course[data[i]].writeUInt8(0xB, 7);
            course[data[i]].writeUInt16BE(course.tiles.length, COURSE_CONSTANTS.TILE_AMOUNT_OFFSET);
            course[data[i]].write(course.title, COURSE_CONSTANTS.NAME_OFFSET, 'utf16le');
            course[data[i]].write(course.maker, COURSE_CONSTANTS.MAKER_OFFSET, 'utf16le');
            course[data[i]].write(COURSE_CONSTANTS.GAME_STYLE_BY_ID[course.gameStyle], COURSE_CONSTANTS.GAME_STYLE_OFFSET);
            course[data[i]].writeUInt8(course[courseTheme[i]], COURSE_CONSTANTS.THEME_OFFSET);
            course[data[i]].writeUInt16BE(course.time, COURSE_CONSTANTS.TIME_OFFSET);
            course[data[i]].writeUInt8(course[autoScroll[i]], COURSE_CONSTANTS.AUTO_SCROLL_OFFSET);
            course[data[i]].writeUInt16BE(course[width[i]], COURSE_CONSTANTS.WIDTH_OFFSET);

            // tiles
            let tileBuffer = Buffer.alloc(0);
            for (let j = 0; j < course[tiles[i]].length; j++) {
                tileBuffer = Buffer.concat([tileBuffer, course[tiles[i]][j].tileData]);
            }
            course[data[i]] = Buffer.concat([course[data[i]], tileBuffer], COURSE_CONSTANTS.SOUND_OFFSET);

            // sounds
            let soundBuffer = Buffer.alloc(0);
            for (let j = 0; j < course[sounds[i]].length; j++) {
                soundBuffer = Buffer.concat([soundBuffer, _sound2.default.toBuffer(course[sounds[i]][j])]);
            }
            for (let j = COURSE_CONSTANTS.SOUND_OFFSET + soundBuffer.length; j < COURSE_CONSTANTS.SOUND_END_OFFSET; j += 8) {
                soundBuffer = Buffer.concat([soundBuffer, _sound.SOUND_CONSTANTS.SOUND_DEFAULT]);
            }
            course[data[i]] = Buffer.concat([course[data[i]], soundBuffer], COURSE_CONSTANTS.SIZE);
        }
        await course.writeCrc();

        try {
            let jpeg = new _tnl.Jpeg(course.thumbnail);
            course[tnl] = await jpeg.toTnl(true);
            jpeg = new _tnl.Jpeg(course.thumbnailPreview);
            course[tnlPreview] = await jpeg.toTnl(false);
        } catch (err) {}

        return course;
    }

    /**
     * Writes course to fs inside save folder.
     * This function should not be called directly. Instead call save.addCourse(course)
     * @function writeToSave
     * @memberOf Course
     * @instance
     * @param {number} id - course ID inside save
     * @param {string} pathToCourse - path to course on fs
     */
    writeToSave(id, pathToCourse) {

        this[courseId] = id;
        if (!!pathToCourse) {
            this[coursePath] = pathToCourse;
        }
        if (!fs.existsSync(this[coursePath])) {
            fs.mkdirSync(this[coursePath]);
        }
        fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data.cdt`), this[courseData]);
        fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data_sub.cdt`), this[courseDataSub]);
        fs.writeFileSync(path.resolve(`${this[coursePath]}/sound.bwv`), sound);
        fs.writeFileSync(path.resolve(`${this[coursePath]}/thumbnail0.tnl`), this[tnl]);
        fs.writeFileSync(path.resolve(`${this[coursePath]}/thumbnail1.tnl`), this[tnlPreview]);
    }

    /**
     * Writes crc checksum of course to fs
     * @function writeCrc
     * @memberOf Course
     * @instance
     * @param {boolean} writeToFs - should file on fs be overwritten with new CRC checksum
     * @returns {Promise.<void>}
     */
    async writeCrc(writeToFs = false) {

        return await _bluebird2.default.all([new _bluebird2.default(async (resolve, reject) => {
            try {
                let fileWithoutCrc = this[courseData].slice(16);
                let crc = Buffer.alloc(4);
                crc.writeUInt32BE(_bufferCrc2.default.unsigned(fileWithoutCrc), 0);
                let crcBuffer = Buffer.concat([COURSE_CONSTANTS.CRC_PRE_BUF, crc, COURSE_CONSTANTS.CRC_POST_BUF], COURSE_CONSTANTS.CRC_LENGTH);
                this[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_CONSTANTS.SIZE);
                if (writeToFs) {
                    fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data.cdt`), this[courseData]);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        }), new _bluebird2.default(async (resolve, reject) => {
            try {
                let fileWithoutCrc = this[courseDataSub].slice(16);
                let crc = Buffer.alloc(4);
                crc.writeUInt32BE(_bufferCrc2.default.unsigned(fileWithoutCrc), 0);
                let crcBuffer = Buffer.concat([COURSE_CONSTANTS.CRC_PRE_BUF, crc, COURSE_CONSTANTS.CRC_POST_BUF], COURSE_CONSTANTS.CRC_LENGTH);
                this[courseDataSub] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_CONSTANTS.SIZE);
                if (writeToFs) {
                    fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data_sub.cdt`), this[courseDataSub]);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        })]);
    }

    to3DS() {

        if (this[endiannessBE]) {
            this.changeEndian();
        }
        return Buffer.concat([Buffer.alloc(0x1C), this[courseData], this[courseDataSub], Buffer.alloc(0x157C0), Buffer.alloc(0xCE4)]);
    }

    changeEndian() {

        this[endiannessBE] = !this[endiannessBE];
        let chEnd = buf => {
            return Buffer.concat([buf.slice(0x0, 0x4), buf.slice(0x4, 0x8).swap32(), buf.slice(0x8, 0x10), buf.slice(0x10, 0x12).swap16(), buf.slice(0x12, 0x28), buf.slice(0x28, 0x6A).swap16(), buf.slice(0x6A, 0x70), buf.slice(0x70, 0x72).swap16(), buf.slice(0x72, 0x74), buf.slice(0x74, 0x78).swap32(), buf.slice(0x78, 0xEC), buf.slice(0xEC, 0xF0).swap32()].concat((0, _from2.default)(function* () {
                for (let i = 0xF0; i < 0x145F0; i += 0x20) {
                    yield buf.slice(i, i + 4).swap32();
                    yield buf.slice(i + 4, i + 8).swap32();
                    yield buf.slice(i + 8, i + 0xA).swap16();
                    yield buf.slice(i + 0xA, i + 0xC);
                    yield buf.slice(i + 0xC, i + 0x10).swap32();
                    yield buf.slice(i + 0x10, i + 0x14).swap32();
                    yield buf.slice(i + 0x14, i + 0x18).swap32();
                    yield buf.slice(i + 0x18, i + 0x1A);
                    yield buf.slice(i + 0x1A, i + 0x1C).swap16();
                    yield buf.slice(i + 0x1C, i + 0x1E).swap16();
                    yield buf.slice(i + 0x1E, i + 0x20);
                }
            }())).concat((0, _from2.default)(function* () {
                for (let i = 0x145F0; i < 0x14F50; i += 0x8) {
                    yield buf.slice(i, i + 0x8);
                }
            }())), 0x15000);
        };
        [this[courseData], this[courseDataSub]] = [chEnd(this[courseData]), chEnd(this[courseDataSub])];
        let crc0 = _bufferCrc2.default.unsigned(this[courseData].slice(0x10));
        let crc1 = _bufferCrc2.default.unsigned(this[courseDataSub].slice(0x10));
        if (this[endiannessBE]) {
            this[courseData].writeUInt32BE(crc0, 8);
            this[courseDataSub].writeUInt32BE(crc1, 8);
        } else {
            this[courseData].writeUInt32LE(crc0, 8);
            this[courseDataSub].writeUInt32LE(crc1, 8);
        }
    }

    /**
     * Sets a new title for this course and optionally recalculates crc checksum
     * @function setTitle
     * @memberOf Course
     * @instance
     * @param {string} title - new title
     * @param {boolean} [writeCrc=true] - should crc checksum be recalculated
     * @returns {Promise.<void>}
     */
    async setTitle(title, writeCrc = true) {
        for (let i = COURSE_CONSTANTS.NAME_OFFSET, j = 0; i < COURSE_CONSTANTS.NAME_OFFSET + COURSE_CONSTANTS.NAME_LENGTH; i += 2, j++) {
            if (j < title.length) {
                this[courseData].write(title.charAt(j), i, 'utf16le');
                this[courseDataSub].write(title.charAt(j), i, 'utf16le');
            } else {
                this[courseData].writeUInt16BE(0, i);
                this[courseDataSub].writeUInt16BE(0, i);
            }
        }
        this.title = title.substr(0, COURSE_CONSTANTS.NAME_LENGTH / 2);
        if (writeCrc) {
            return await this.writeCrc();
        }
    }

    /**
     * Sets a new maker for this course and optionally recalculates crc checksum
     * @function setMaker
     * @memberOf Course
     * @instance
     * @param {string} makerName - new maker
     * @param {boolean} [writeCrc=true] - should crc checksum be recalculated
     * @returns {Promise.<void>}
     */
    async setMaker(makerName, writeCrc = true) {
        for (let i = COURSE_CONSTANTS.MAKER_OFFSET, j = 0; i < COURSE_CONSTANTS.MAKER_OFFSET + COURSE_CONSTANTS.MAKER_LENGTH; i += 2, j++) {
            if (j < makerName.length) {
                this[courseData].write(makerName.charAt(j), i, 'utf16le');
                this[courseDataSub].write(makerName.charAt(j), i, 'utf16le');
            } else {
                this[courseData].writeUInt16BE(0, i);
                this[courseDataSub].writeUInt16BE(0, i);
            }
        }
        this.maker = makerName.substr(0, COURSE_CONSTANTS.MAKER_LENGTH / 2);
        if (writeCrc) {
            await this.writeCrc();
        }
    }

    /**
     * Load TNL thumbnails from fs.
     * Implicitly called by constructor
     * @function loadTnl
     * @memberOf Course
     * @instance
     * @returns {Array<Tnl>}
     */
    loadTnl() {

        return [new _tnl.Tnl(this[coursePath] + "/thumbnail0.tnl").readFileSync().data, new _tnl.Tnl(this[coursePath] + "/thumbnail1.tnl").readFileSync().data];
    }

    /**
     * Convert TNL thumbnails to JPEG thumbnails
     * @function loadThumbnail
     * @memberOf Course
     * @instance
     * @returns {null}
     */
    async loadThumbnail() {

        try {
            this.thumbnail = await new _tnl.Tnl(this[tnl]).toJpeg();
            this.thumbnailPreview = await new _tnl.Tnl(this[tnlPreview]).toJpeg();
        } catch (err) {
            console.log(err);
        }
        return null;
    }

    /**
     * Synchronous version of {@link Course#loadThumbnail}
     * @function loadThumbnailSync
     * @memberOf Course
     * @instance
     */
    loadThumbnailSync() {

        try {
            this.thumbnail = new _tnl.Tnl(this[tnl]).toJpegSync();
            this.thumbnailPreview = new _tnl.Tnl(this[tnlPreview]).toJpegSync();
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Change thumbnail of this course
     * @function setThumbnail
     * @memberOf Course
     * @instance
     * @param {string} pathToThumbnail - path to new thumbnail on fs
     * @param {string} [pathToThumbnailPreview] - path to new thumbnailPreview on fs
     * @returns {Promise.<void>}
     */
    async setThumbnail(pathToThumbnail, pathToThumbnailPreview) {

        let jpeg = new _tnl.Jpeg(path.resolve(pathToThumbnail));
        this[tnl] = new _tnl.Tnl((await jpeg.toTnl(true)));
        this.thumbnail = await this[tnl].toJpeg();
        if (!!pathToThumbnailPreview) {
            jpeg = new _tnl.Jpeg(path.resolve(pathToThumbnailPreview));
        } else {
            jpeg = new _tnl.Jpeg(path.resolve(pathToThumbnail));
        }
        this[tnlPreview] = new _tnl.Tnl((await jpeg.toTnl(false, true)));
        this.thumbnailPreview = await this[tnlPreview].toJpeg();
        return null;
    }

    /**
     * Check if this course's thumbnail is broken
     * @function isThumbnailBroken
     * @memberOf Course
     * @instance
     * @returns {Promise.<boolean>}
     */
    async isThumbnailBroken() {

        try {
            if (!!this[tnl] && !this.thumbnail) {
                await this.loadThumbnail();
            }
            return await new _tnl.Jpeg(this.thumbnailPreview).isBroken();
        } catch (err) {
            return true;
        }
    }

    /**
     * Write TNL thumbnail to fs
     * @function writeThumbnail
     * @memberOf Course
     * @instance
     * @returns {Promise.<void>}
     * @throws {Error} course must be part of a {@link Save}
     */
    async writeThumbnail() {

        return await _bluebird2.default.all([new _bluebird2.default(resolve => {
            fs.writeFile(path.join(this[coursePath], 'thumbnail0.tnl'), this[tnl].data, () => {
                resolve();
            });
        }), new _bluebird2.default(resolve => {
            fs.writeFile(path.join(this[coursePath], 'thumbnail1.tnl'), this[tnlPreview].data, () => {
                resolve();
            });
        })]);
    }

    /**
     * Write JPEG thumbnail to fs
     * @function exportThumbnail
     * @memberOf Course
     * @instance
     * @returns {Promise.<void>}
     * @throws {Error} course must be part of a {@link Save}
     * @throws {Error} thumbnail must not be null
     */
    async exportThumbnail() {

        if (!this[coursePath]) throw new Error("Course does not exist on file system");
        if (!this[tnl] && !this.thumbnail) throw new Error("Could not find thumbnail");
        if (!this.thumbnail) {
            await this.loadThumbnail();
        }
        return await _bluebird2.default.all([new _bluebird2.default(async (resolve, reject) => {
            fs.writeFile(this[coursePath] + "/thumbnail0.jpg", this.thumbnail, null, err => {
                if (err) reject(err);
                resolve();
            });
        }), new _bluebird2.default(async (resolve, reject) => {
            fs.writeFile(this[coursePath] + "/thumbnail1.jpg", this.thumbnailPreview, null, err => {
                if (err) reject(err);
                resolve();
            });
        })]);
    }

    /**
     * Synchronous version of {@link Course#exportThumbnail}
     * @function exportThumbnailSync
     * @memberOf Course
     * @instance
     * @throws {Error} course must be part of a {@link Save}
     * @throws {Error} thumbnail must not be null
     */
    exportThumbnailSync() {

        if (!this[coursePath]) throw new Error("Course does not exist on file system");
        if (!this[tnl] && !this.thumbnail) throw new Error("Could not find thumbnail");
        if (!this.thumbnail) {
            this.loadThumbnailSync();
        }
        fs.writeFileSync(this[coursePath] + "/thumbnail0.jpg", this.thumbnail);
        fs.writeFileSync(this[coursePath] + "/thumbnail1.jpg", this.thumbnailPreview);
    }

    /**
     * Decompresses a file and loads all included courses into an array.
     * Requires p7zip for Unix and 7z.exe for Windows (Place exe in same folder as package.json or add to PATH)
     * @function decompress
     * @memberOf Course
     * @instance
     * @param {string} filePath - path of compressed file
     * @returns {Array.<Course>}
     */
    static async decompress(filePath) {
        let mime = (0, _fileType2.default)(_readChunk2.default.sync(filePath, 0, 4100)).mime;
        if (mime !== 'application/x-rar-compressed' && mime !== 'application/zip' && mime !== 'application/x-7z-compressed' && mime !== 'application/x-tar') {
            throw new Error("Could not decompress file! Unknown format: " + mime);
        }

        // decompress
        let tmpDir = await new _bluebird2.default((resolve, reject) => {
            _tmp2.default.dir({ unsafeCleanup: true }, (err, path) => {
                if (err) reject(err);
                resolve(path);
            });
        });
        /*await new Promise((resolve, reject) => {
            unzip(filePath, tmpDir, err => {
                if (err) reject(err);
                resolve();
            });
        });*/
        let zip = new _node7z2.default();
        try {
            await zip.extractFull(filePath, tmpDir);
        } catch (err) {
            console.log(err);
            return null;
        }

        // get course folders
        let courseFolders = [];
        let getCourseFolders = async filePath => {
            await new _bluebird2.default(resolve => {
                fs.readdir(filePath, async (err, files) => {
                    if (err) throw err;
                    for (let i = 0; i < files.length; i++) {
                        let isFolder = /^[^.]+$/.test(files[i]);
                        let isCourseFolder = /[c|C]ourse\d{3}$/.test(files[i]);
                        if (isCourseFolder) {
                            courseFolders.push(path.join(filePath, files[i]));
                        } else if (isFolder) {
                            await getCourseFolders(path.join(filePath, files[i]));
                        }
                    }

                    resolve();
                });
            });
        };
        await getCourseFolders(tmpDir);

        // load courses
        let courses = [];
        for (let i = 0; i < courseFolders.length; i++) {
            courses.push((await (0, _.loadCourse)(courseFolders[i])));
        }
        (0, _rimraf2.default)(tmpDir, () => {});
        return courses;
    }

    /**
     * Serializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
     * @function serialize
     * @memberOf Course
     * @instance
     * @returns {Promise.<Buffer>}
     */
    async serialize() {
        if (!!this[tnl] && !this.thumbnail) {
            await this.loadThumbnail();
        }
        return Buffer.from(JSON.parse((0, _stringify2.default)(smmCourse.encode(this).finish())));
    }

    /**
     * Serializes and gzips
     * @function serializeGzipped
     * @memberOf Course
     * @instance
     * @returns {Promise.<Buffer>}
     */
    async serializeGzipped() {
        if (!!this[tnl] && !this.thumbnail) {
            await this.loadThumbnail();
        }
        return await new _bluebird2.default((resolve, reject) => {
            zlib.gzip(Buffer.from(JSON.parse((0, _stringify2.default)(smmCourse.encode(this).finish()))), (err, buffer) => {
                if (err) reject(err);
                resolve(buffer);
            });
        });
    }

    /**
     * Deserializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
     * @function deserialize
     * @memberOf Course
     * @instance
     * @param {Buffer|Uint8Array} buffer - Node Buffer or Uint8Array to be converted to a {@link Course}
     * @returns {Promise<Course>}
     */
    static async deserialize(buffer) {
        try {
            buffer = zlib.gunzipSync(buffer);
        } catch (err) {}
        let obj = smmCourse.toObject(smmCourse.decode(Buffer.from(buffer)), {
            arrays: true
        });
        return await this.fromObject(obj);
    }
}
exports.default = Course;