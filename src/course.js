import Promise    from "bluebird"
import crc32      from "buffer-crc32"
import protobuf   from "protobufjs"
import * as proto from "smm-protobuf/proto/bundle.json"

import * as fs   from "fs"
import * as path from "path"
import * as zlib from "zlib"

import Block from "./block"
import Sound from "./sound"
import {
    Tnl, Jpeg
} from "./tnl"

const sound = fs.readFileSync(path.join(__dirname, "../data/sound.bwv"));

const root = protobuf.Root.fromJSON(proto);
const smmCourse = root.lookupType('SMMCourse');

const COURSE_SIZE = 0x15000;

const COURSE_CRC_LENGTH = 0x10;
const COURSE_CRC_PRE_BUF  = Buffer.from("000000000000000B", "hex");
const COURSE_CRC_POST_BUF = Buffer.alloc(4);

const COURSE_NAME_OFFSET = 0x29;
const COURSE_NAME_LENGTH = 0x40;

const COURSE_MAKER_OFFSET = 0x92;
const COURSE_MAKER_LENGTH = 0x14;

const COURSE_GAME_STYLE_OFFSET = 0x6A;
const COURSE_GAME_STYLE = root.lookupEnum('SMMCourse.GameStyle').values;

const COURSE_THEME_OFFSET = 0x6D;
const COURSE_THEME = root.lookupEnum('SMMCourse.CourseTheme').values;
const COURSE_THEME_BY_ID = root.lookupEnum('SMMCourse.CourseTheme').valuesById;

const COURSE_BLOCK_DATA_OFFSET = 0x1B0;
const COURSE_BLOCK_DATA_LENGTH = 0x20;
const COURSE_BLOCK_DATA_END = 0x145F0;

const courseId      = Symbol();
const coursePath    = Symbol();
const courseData    = Symbol();
const courseDataSub = Symbol();
const tnl           = Symbol();
const tnlPreview    = Symbol();

/**
 * Represents a Super Mario Maker course
 * @class Course
 * @param id
 * @param data
 * @param dataSub
 * @param path
 * @param title
 * @param maker
 * @param gameStyle
 * @param courseTheme
 */
export default class Course {

    constructor (id, data, dataSub, path, title, maker, gameStyle, courseTheme) {

        if (!fs.existsSync(path)) {
            throw new Error("Path does not exists: " + path);
        }
        this[courseId] = id;
        this[courseData] = data;
        this[courseDataSub] = dataSub;
        this[coursePath] = path;
        
        /**
         * Title of course
         * @member {string} title
         * @memberOf Course
         * @instance
         */
        this.title = title;
        
        /**
         * Maker name
         * @member {string} maker
         * @memberOf Course
         * @instance
         */
        this.maker = maker;
        
        /**
         * Game style of course
         * @member {number} gameStyle
         * @memberOf Course
         * @instance
         */
        this.gameStyle = COURSE_GAME_STYLE[gameStyle];
        
        /**
         * Course theme
         * @member {number} courseTheme
         * @memberOf Course
         * @instance
         */
        this.courseTheme = COURSE_THEME[COURSE_THEME_BY_ID[courseTheme]];
        
        /**
         * Blocks of main course
         * @member {Array<Block>} blocks
         * @memberOf Course
         * @instance
         */
        this.blocks = [];
        for (let offset = COURSE_BLOCK_DATA_OFFSET; offset < COURSE_BLOCK_DATA_END; offset += COURSE_BLOCK_DATA_LENGTH) {
            let blockData = this[courseData].slice(offset, offset + COURSE_BLOCK_DATA_LENGTH);
            if (blockData.readUInt32BE(28) === 0) {
                break;
            }
            this.blocks.push(new Block(blockData));
        }
        
        /**
         * Blocks of sub course
         * @member {Array<Block>} blocksSub
         * @memberOf Course
         * @instance
         */
        this.blocksSub = [];
        for (let offset = COURSE_BLOCK_DATA_OFFSET; offset < COURSE_BLOCK_DATA_END; offset += COURSE_BLOCK_DATA_LENGTH) {
            let blockData = this[courseDataSub].slice(offset, offset + COURSE_BLOCK_DATA_LENGTH);
            if (blockData.readUInt32BE(28) === 0) {
                break;
            }
            this.blocksSub.push(new Block(blockData));
        }
        
        /**
         * Course sounds
         * @member {Array<Sound>} sounds
         * @memberOf Course
         * @instance
         */
        this.sounds = [];
        // TODO add sounds
        try {
            [this[tnl], this[tnlPreview]] = this.loadTnl();
        } catch (err) {
        }

    }

    /**
     * Writes course to fs inside save folder.
     * This function should not be called directly. Instead call save.addCourse(course)
     * @function writeToSave
     * @memberOf Course
     * @instance
     * @param id - course ID inside save
     * @param pathToCourse - path on fs to course
     */
    writeToSave (id, pathToCourse) {

        this[courseId] = id;
        this[coursePath] = pathToCourse;
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
     * @returns {Promise.<void>}
     */
    async writeCrc () {

        return await Promise.all([
            new Promise (async (resolve, reject) => {
                try {
                    let fileWithoutCrc = this[courseData].slice(16);
                    let crc = Buffer.alloc(4);
                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                    let crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);
                    this[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                    fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data.cdt`), this[courseData]);
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
                    let crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);
                    this[courseDataSub] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                    fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data_sub.cdt`), this[courseDataSub]);
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
        for (let i = COURSE_NAME_OFFSET, j = 0; i < COURSE_NAME_OFFSET + COURSE_NAME_LENGTH; i+=2, j++) {
            if (j < title.length) {
                this[courseData].write(title.charAt(j), i, 'utf16le');
                this[courseDataSub].write(title.charAt(j), i, 'utf16le');
            } else {
                this[courseData].writeUInt16BE(0, i);
                this[courseDataSub].writeUInt16BE(0, i);
            }
        }
        this.title = title.substr(0, COURSE_NAME_LENGTH / 2);
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
        for (let i = COURSE_MAKER_OFFSET, j = 0; i < COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH; i+=2, j++) {
            if (j < makerName.length) {
                this[courseData].write(makerName.charAt(j), i, 'utf16le');
                this[courseDataSub].write(makerName.charAt(j), i, 'utf16le');
            } else {
                this[courseData].writeUInt16BE(0, i);
                this[courseDataSub].writeUInt16BE(0, i);
            }
        }
        this.maker = makerName.substr(0, COURSE_MAKER_LENGTH / 2);
        if (writeCrc) {
            await this.writeCrc();
        }
    }

    /**
     * Load tnl thumbnails from fs.
     * Implicitly called by constructor
     * @function loadTnl
     * @memberOf Course
     * @instance
     * @returns {Array<Tnl>}
     */
    loadTnl () {

        return [
            new Tnl(this[coursePath] + "/thumbnail0.tnl"),
            new Tnl(this[coursePath] + "/thumbnail1.tnl")
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
            this.thumbnail = await this[tnl].toJpeg();
            this.thumbnailPreview = await this[tnlPreview].toJpeg();
        } catch (err) {
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
            this.thumbnail = this[tnl].toJpegSync();
            this.thumbnailPreview = this[tnlPreview].toJpegSync();
        } catch (err) {
        }

    }

    /**
     * Change thumbnail of this course
     * @function setThumbnail
     * @memberOf Course
     * @instance
     * @param {string} pathToThumbnail - path to new thumbnail on fs
     * @returns {null}
     */
    async setThumbnail (pathToThumbnail) {

        let jpeg = new Jpeg(path.resolve(pathToThumbnail));
        this[tnl] = await jpeg.toTnl(true);
        this.thumbnail = await this[tnl].toJpeg();
        this[tnlPreview] = await jpeg.toTnl(false);
        this.thumbnailPreview = await this[tnlPreview].toJpeg();
        return null;

    }

    /**
     * Write thumbnail to fs
     * @function writeThumbnail
     * @memberOf Course
     * @instance
     * @returns {Promise.<void>}
     * @throws {Error} course must be part of a {@link Save}
     */
    async writeThumbnail () {
        
        return await Promise.all([
            new Promise(resolve => {
                fs.writeFile(path.join(this[coursePath], 'thumbnail0.tnl'), this[tnl], () => {
                    resolve();
                });
            }),
            new Promise(resolve => {
                fs.writeFile(path.join(this[coursePath], 'thumbnail1.tnl'), this[tnlPreview], () => {
                    resolve();
                });
            })
        ]);
        
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
     * Write thumbnail to fs
     * @function writeThumbnail
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
     *
     */
    exportJpegSync () {

        if (!this[coursePath]) throw new Error("Course does not exist on file system");
        if (!this[tnl] && !this.thumbnail) throw new Error("Could not find thumbnail");
        if (!this.thumbnail) {
            this.loadThumbnailSync();
        }
        fs.writeFileSync(this[coursePath] + "/thumbnail0.jpg", this.thumbnail);
        fs.writeFileSync(this[coursePath] + "/thumbnail1.jpg", this.thumbnailPreview);

    }

    /**
     *
     * @returns {Promise<Buffer>}
     */
    async serialize () {
        if (!!this[tnl] && !this.thumbnail) {
            await this.loadThumbnail();
        }
        return Buffer.from(JSON.parse(JSON.stringify(smmCourse.encode(this).finish())));
    }

    /**
     *
     * @returns {Promise.<*>}
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
     *
     * @param buffer
     * @returns {*|boolean}
     */
    static deserialize (buffer) {
        let obj = smmCourse.toObject(smmCourse.decode(Buffer.from(buffer)), {
            arrays: true
        });
        return Object.setPrototypeOf(obj, this.prototype);
    }
}