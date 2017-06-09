import Promise    from "bluebird"
import crc32      from "buffer-crc32"
import protobuf   from "protobufjs"
import * as proto from "smm-protobuf/proto/bundle.json"
import fileType   from "file-type"
import readChunk  from "read-chunk"
import { unzip }  from "cross-unzip"
import tmp        from "tmp"

import * as fs   from "fs"
import * as path from "path"
import * as zlib from "zlib"

import { loadCourse } from "."
import Block, { BLOCK_CONSTANTS } from "./block"
import Sound, { SOUND_CONSTANTS } from "./sound"
import {
    Tnl, Jpeg
} from "./tnl"

const sound = fs.readFileSync(path.join(__dirname, "../data/sound.bwv"));

const root = protobuf.Root.fromJSON(proto);
const smmCourse = root.lookupType('SMMCourse');

export const COURSE_CONSTANTS = {
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

    BLOCK_AMOUNT_OFFSET: 0xEE, // uint_16

    BLOCKS_OFFSET: 0xF0,

    SOUND_OFFSET: 0x145F0,
    SOUND_END_OFFSET: 0x14F50
};

const courseId      = Symbol();
const coursePath    = Symbol();
const courseData    = Symbol();
const courseDataSub = Symbol();
const tnl           = Symbol();
const tnlPreview    = Symbol();

/**
 * Represents a Super Mario Maker course
 * @class Course
 */
export default class Course {

    constructor (id, data, dataSub, path) {

        if (!!path && !fs.existsSync(path)) {
            throw new Error("Path does not exists: " + path);
        }
        this[courseId] = id;
        this[courseData] = data;
        this[courseDataSub] = dataSub;
        this[coursePath] = path;

        if (!!path) {
            [this[tnl], this[tnlPreview]] = this.loadTnl();
            this.loadThumbnailSync();
        }

        if (!this[courseData]) return this;

        /**
         * Title of course
         * @member {string} title
         * @memberOf Course
         * @instance
         */
        this.title = "";
        let titleBuf = data.slice(COURSE_CONSTANTS.NAME_OFFSET, COURSE_CONSTANTS.NAME_OFFSET + COURSE_CONSTANTS.NAME_LENGTH);
        for (let i = 0; i < COURSE_CONSTANTS.NAME_LENGTH; i+=2) {
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
        let makerBuf = data.slice(COURSE_CONSTANTS.MAKER_OFFSET, COURSE_CONSTANTS.MAKER_OFFSET + COURSE_CONSTANTS.MAKER_LENGTH);
        for (let i =  0; i < COURSE_CONSTANTS.MAKER_LENGTH; i+=2) {
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
        this.gameStyle = COURSE_CONSTANTS.GAME_STYLE[data.slice(COURSE_CONSTANTS.GAME_STYLE_OFFSET, COURSE_CONSTANTS.GAME_STYLE_OFFSET + 2).toString()];

        /**
         * Course theme
         * @member {number} courseTheme
         * @memberOf Course
         * @instance
         */
        this.courseTheme = data.readUInt8(COURSE_CONSTANTS.THEME_OFFSET);

        /**
         * Course theme sub
         * @member {number} courseThemeSub
         * @memberOf Course
         * @instance
         */
        this.courseThemeSub = dataSub.readUInt8(COURSE_CONSTANTS.THEME_OFFSET);

        /**
         * Completion time
         * @member {number} time
         * @memberOf Course
         * @instance
         */
        this.time = data.readUInt16BE(COURSE_CONSTANTS.TIME_OFFSET);

        /**
         * Course auto scroll
         * @member {number} autoScroll
         * @memberOf Course
         * @instance
         */
        this.autoScroll = data.readUInt8(COURSE_CONSTANTS.AUTO_SCROLL_OFFSET);

        /**
         * CourseSub auto scroll
         * @member {number} autoScrollSub
         * @memberOf Course
         * @instance
         */
        this.autoScrollSub = dataSub.readUInt8(COURSE_CONSTANTS.AUTO_SCROLL_OFFSET);

        /**
         * Course width
         * @member {number} width
         * @memberOf Course
         * @instance
         */
        this.width = data.readUInt16BE(COURSE_CONSTANTS.WIDTH_OFFSET);

        /**
         * CourseSub width
         * @member {number} widthSub
         * @memberOf Course
         * @instance
         */
        this.widthSub = dataSub.readUInt16BE(COURSE_CONSTANTS.WIDTH_OFFSET);

        /**
         * Blocks of main course
         * @member {Array<Block>} blocks
         * @memberOf Course
         * @instance
         */
        this.blocks = [];
        let blockAmount = this[courseData].readUInt16BE(COURSE_CONSTANTS.BLOCK_AMOUNT_OFFSET);
        for (let i = 0, offset = COURSE_CONSTANTS.BLOCKS_OFFSET; i < blockAmount; i++, offset += BLOCK_CONSTANTS.SIZE) {
            let blockData = this[courseData].slice(offset, offset + BLOCK_CONSTANTS.SIZE);
            this.blocks.push(new Block(blockData));
        }

        /**
         * Blocks of sub course
         * @member {Array<Block>} blocksSub
         * @memberOf Course
         * @instance
         */
        this.blocksSub = [];
        blockAmount = this[courseDataSub].readUInt16BE(COURSE_CONSTANTS.BLOCK_AMOUNT_OFFSET);
        for (let i = 0, offset = COURSE_CONSTANTS.BLOCKS_OFFSET; i < blockAmount; i++, offset += BLOCK_CONSTANTS.SIZE) {
            let blockData = this[courseDataSub].slice(offset, offset + BLOCK_CONSTANTS.SIZE);
            this.blocksSub.push(new Block(blockData));
        }

        /**
         * Course sounds
         * @member {Array<Sound>} sounds
         * @memberOf Course
         * @instance
         */
        this.sounds = [];
        for (let offset = COURSE_CONSTANTS.SOUND_OFFSET; offset < COURSE_CONSTANTS.SOUND_END_OFFSET; offset += SOUND_CONSTANTS.SIZE) {
            if (this[courseData].readUInt8(offset) !== 0xFF) {
                let soundData = this[courseData].slice(offset, offset + SOUND_CONSTANTS.SIZE);
                this.sounds.push(new Sound(soundData));
            }
        }

        /**
         * Course sounds
         * @member {Array<Sound>} soundsSub
         * @memberOf Course
         * @instance
         */
        this.soundsSub = [];
        for (let offset = COURSE_CONSTANTS.SOUND_OFFSET; offset < COURSE_CONSTANTS.SOUND_END_OFFSET; offset += SOUND_CONSTANTS.SIZE) {
            if (this[courseDataSub].readUInt8(offset) !== 0xFF) {
                let soundData = this[courseDataSub].slice(offset, offset + SOUND_CONSTANTS.SIZE);
                this.soundsSub.push(new Sound(soundData));
            }
        }

    }

    static async fromObject (obj) {

        let course = new Course();
        Object.assign(course, obj);

        let data        = [courseData, courseDataSub];
        let courseTheme = ['courseTheme', 'courseThemeSub'];
        let autoScroll  = ['autoScroll', 'autoScrollSub'];
        let width       = ['width', 'widthSub'];
        let blocks      = ['blocks', 'blocksSub'];
        let sounds      = ['sounds', 'soundsSub'];
        for (let i = 0; i < data.length; i++) {
            // meta
            course[data[i]] = Buffer.alloc(COURSE_CONSTANTS.BLOCKS_OFFSET);
            course[data[i]].writeUInt8(0xB, 7);
            course[data[i]].writeUInt16BE(course.blocks.length, COURSE_CONSTANTS.BLOCK_AMOUNT_OFFSET);
            course[data[i]].write(course.title, COURSE_CONSTANTS.NAME_OFFSET, 'utf16le');
            course[data[i]].write(course.maker, COURSE_CONSTANTS.MAKER_OFFSET, 'utf16le');
            course[data[i]].write(COURSE_CONSTANTS.GAME_STYLE_BY_ID[course.gameStyle], COURSE_CONSTANTS.GAME_STYLE_OFFSET);
            course[data[i]].writeUInt8(course[courseTheme[i]], COURSE_CONSTANTS.THEME_OFFSET);
            course[data[i]].writeUInt16BE(course.time, COURSE_CONSTANTS.TIME_OFFSET);
            course[data[i]].writeUInt8(course[autoScroll[i]], COURSE_CONSTANTS.AUTO_SCROLL_OFFSET);
            course[data[i]].writeUInt16BE(course[width[i]], COURSE_CONSTANTS.WIDTH_OFFSET);

            // blocks
            let blockBuffer = Buffer.alloc(0);
            for (let j = 0; j < course[blocks[i]].length; j++) {
                blockBuffer = Buffer.concat([blockBuffer, course[blocks[i]][j].blockData]);
            }
            course[data[i]] = Buffer.concat([course[data[i]], blockBuffer], COURSE_CONSTANTS.SOUND_OFFSET);

            // sounds
            let soundBuffer = Buffer.alloc(0);
            for (let j = 0; j < course[sounds[i]].length; j++) {
                soundBuffer = Buffer.concat([soundBuffer, Sound.toBuffer(course[sounds[i]][j])]);
            }
            for (let j = COURSE_CONSTANTS.SOUND_OFFSET + soundBuffer.length; j < COURSE_CONSTANTS.SOUND_END_OFFSET; j += 8) {
                soundBuffer = Buffer.concat([soundBuffer, SOUND_CONSTANTS.SOUND_DEFAULT]);
            }
            course[data[i]] = Buffer.concat([course[data[i]], soundBuffer], COURSE_CONSTANTS.SIZE);
        }
        await course.writeCrc();

        let jpeg = new Jpeg(course.thumbnail);
        course[tnl] = await jpeg.toTnl(true);
        jpeg = new Jpeg(course.thumbnailPreview);
        course[tnlPreview] = await jpeg.toTnl(false);

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
    writeToSave (id, pathToCourse) {

        this[courseId] = id;
        this[coursePath] = pathToCourse;
        if (!fs.existsSync(this[coursePath])){
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
    async writeCrc (writeToFs = false) {

        return await Promise.all([
            new Promise (async (resolve, reject) => {
                try {
                    let fileWithoutCrc = this[courseData].slice(16);
                    let crc = Buffer.alloc(4);
                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                    let crcBuffer = Buffer.concat([COURSE_CONSTANTS.CRC_PRE_BUF, crc, COURSE_CONSTANTS.CRC_POST_BUF], COURSE_CONSTANTS.CRC_LENGTH);
                    this[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_CONSTANTS.SIZE);
                    if (writeToFs) {
                        fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data.cdt`), this[courseData]);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }),
            new Promise (async (resolve, reject) => {
                try {
                    let fileWithoutCrc = this[courseDataSub].slice(16);
                    let crc = Buffer.alloc(4);
                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                    let crcBuffer = Buffer.concat([COURSE_CONSTANTS.CRC_PRE_BUF, crc, COURSE_CONSTANTS.CRC_POST_BUF], COURSE_CONSTANTS.CRC_LENGTH);
                    this[courseDataSub] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_CONSTANTS.SIZE);
                    if (writeToFs) {
                        fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data_sub.cdt`), this[courseDataSub]);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
        ]);

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
    async setTitle (title, writeCrc = true) {
        for (let i = COURSE_CONSTANTS.NAME_OFFSET, j = 0; i < COURSE_CONSTANTS.NAME_OFFSET + COURSE_CONSTANTS.NAME_LENGTH; i+=2, j++) {
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
    async setMaker (makerName, writeCrc = true) {
        for (let i = COURSE_CONSTANTS.MAKER_OFFSET, j = 0; i < COURSE_CONSTANTS.MAKER_OFFSET + COURSE_CONSTANTS.MAKER_LENGTH; i+=2, j++) {
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
    loadTnl () {

        return [
            (new Tnl(this[coursePath] + "/thumbnail0.tnl")).readFileSync().data,
            (new Tnl(this[coursePath] + "/thumbnail1.tnl")).readFileSync().data
        ];

    }

    /**
     * Convert TNL thumbnails to JPEG thumbnails
     * @function loadThumbnail
     * @memberOf Course
     * @instance
     * @returns {null}
     */
    async loadThumbnail () {

        try {
            this.thumbnail = await new Tnl(this[tnl]).toJpeg();
            this.thumbnailPreview = await new Tnl(this[tnlPreview]).toJpeg();
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
    loadThumbnailSync () {

        try {
            this.thumbnail = new Tnl(this[tnl]).toJpegSync();
            this.thumbnailPreview = new Tnl(this[tnlPreview]).toJpegSync();
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
    async setThumbnail (pathToThumbnail, pathToThumbnailPreview) {

        let jpeg = new Jpeg(path.resolve(pathToThumbnail));
        this[tnl] = new Tnl(await jpeg.toTnl(true));
        this.thumbnail = await this[tnl].toJpeg();
        if (!!pathToThumbnailPreview) {
            jpeg = new Jpeg(path.resolve(pathToThumbnailPreview));
        }
        this[tnlPreview] = new Tnl(await jpeg.toTnl(false));
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
    async isThumbnailBroken () {

        try {
            return await this[tnlPreview].isBroken();
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
    async writeThumbnail () {

        return await Promise.all([
            new Promise(resolve => {
                fs.writeFile(path.join(this[coursePath], 'thumbnail0.tnl'), this[tnl].data, () => {
                    resolve();
                });
            }),
            new Promise(resolve => {
                fs.writeFile(path.join(this[coursePath], 'thumbnail1.tnl'), this[tnlPreview].data, () => {
                    resolve();
                });
            })
        ]);

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
    async exportThumbnail () {

        if (!this[coursePath]) throw new Error("Course does not exist on file system");
        if (!this[tnl] && !this.thumbnail) throw new Error("Could not find thumbnail");
        if (!this.thumbnail) {
            await this.loadThumbnail();
        }
        return await Promise.all([
            new Promise(async (resolve, reject) => {
                fs.writeFile(this[coursePath] + "/thumbnail0.jpg", this.thumbnail, null, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            }),
            new Promise(async (resolve, reject) => {
                fs.writeFile(this[coursePath] + "/thumbnail1.jpg", this.thumbnailPreview, null, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            })
        ]);

    }

    /**
     * Synchronous version of {@link Course#exportThumbnail}
     * @function exportThumbnailSync
     * @memberOf Course
     * @instance
     * @throws {Error} course must be part of a {@link Save}
     * @throws {Error} thumbnail must not be null
     */
    exportThumbnailSync () {

        if (!this[coursePath]) throw new Error("Course does not exist on file system");
        if (!this[tnl] && !this.thumbnail) throw new Error("Could not find thumbnail");
        if (!this.thumbnail) {
            this.loadThumbnailSync();
        }
        fs.writeFileSync(this[coursePath] + "/thumbnail0.jpg", this.thumbnail);
        fs.writeFileSync(this[coursePath] + "/thumbnail1.jpg", this.thumbnailPreview);

    }

    /**
     * Decompresses a file and loads all included courses into an array
     * @function decompress
     * @memberOf Course
     * @instance
     * @param {string} filePath - path of compressed file
     * @returns {Array.<Course>}
     */
    static async decompress (filePath) {
        let mime = fileType(readChunk.sync(filePath, 0, 4100)).mime;
        if (mime !== 'application/x-rar-compressed' && mime !== 'application/zip' && mime !== 'application/x-7z-compressed' && mime !== 'application/x-tar') {
            throw new Error("Could not decompress file! Unknown format: " + mime)
        }

        // decompress
        let tmpDir = await new Promise((resolve, reject) => {
            tmp.dir({ unsafeCleanup: true }, (err, path) => {
                if (err) reject(err);
                resolve(path);
            })
        });
        await new Promise((resolve, reject) => {
            unzip(filePath, tmpDir, err => {
                if (err) reject(err);
                resolve();
            });
        });

        // get course folders
        let courseFolders = [];
        let getCourseFolders = async (filePath) => {
            await new Promise((resolve) => {
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
                })
            })
        };
        await getCourseFolders(tmpDir);

        // load courses
        let courses = [];
        for (let i = 0; i < courseFolders.length; i++) {
            courses.push(await loadCourse(courseFolders[i]));
        }
        //rimraf(tmpDir, () => {});
        return courses;
    }

    /**
     * Serializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
     * @function serialize
     * @memberOf Course
     * @instance
     * @returns {Promise.<Buffer>}
     */
    async serialize () {
        if (!!this[tnl] && !this.thumbnail) {
            await this.loadThumbnail();
        }
        return Buffer.from(JSON.parse(JSON.stringify(smmCourse.encode(this).finish())));
    }

    /**
     * Serializes and gzips
     * @function serializeGzipped
     * @memberOf Course
     * @instance
     * @returns {Promise.<Buffer>}
     */
    async serializeGzipped () {
        if (!!this[tnl] && !this.thumbnail) {
            await this.loadThumbnail();
        }
        return await new Promise((resolve, reject) => {
            zlib.deflate(Buffer.from(JSON.parse(JSON.stringify(smmCourse.encode(this).finish()))), (err, buffer) => {
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
    static async deserialize (buffer) {
        try {
            buffer = zlib.inflateSync(buffer);
        } catch (err) {}
        let obj = smmCourse.toObject(smmCourse.decode(Buffer.from(buffer)), {
            arrays: true
        });
        return await this.fromObject(obj);
    }
}