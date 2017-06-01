import Promise    from "bluebird"
import crc32      from "buffer-crc32"
import protobuf   from "protobufjs"
import * as proto from "smm-protobuf/proto/bundle.json"

import * as fs   from "fs"
import * as path from "path"
import * as zlib from "zlib"

import Block, { BLOCK_CONSTANTS } from "./block"
import Sound from "./sound"
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

    NAME_OFFSET: 0x29,
    NAME_LENGTH: 0x40,

    MAKER_OFFSET: 0x92,
    MAKER_LENGTH: 0x14,

    GAME_STYLE_OFFSET: 0x6A,
    GAME_STYLE: root.lookupEnum('SMMCourse.GameStyle').values,

    THEME_OFFSET: 0x6D,
    THEME: root.lookupEnum('SMMCourse.CourseTheme').values,
    THEME_BY_ID: root.lookupEnum('SMMCourse.CourseTheme').valuesById,

    BLOCK_AMOUNT_OFFSET: 0xEE, // uint_16

    HEADER_OFFSET: 0xF0,
    HEADER_DEFAULT: Buffer.from(
        `00 00 00 00 00 00 00 00 00 00 01 01 06 00 08 40 
        06 00 08 40 00 00 00 00 45 FF FF FF FF FF FF FF
        00 00 00 50 00 00 00 00 00 50 08 01 06 00 08 40 
        06 00 00 40 00 00 00 00 25 FF FF FF FF FF FF FF
        00 00 01 90 00 00 00 00 00 A0 03 03 06 00 08 40
        06 00 00 40 00 00 00 00 26 FF FF FF FF FF FF FF
        00 00 09 10 00 00 00 00 00 50 0D 02 06 00 08 40
        06 00 00 40 00 00 00 00 1A FF FF FF FF FF FF FF
        00 00 09 10 00 00 00 00 01 40 0A 0B 06 00 08 40
        06 00 00 40 00 00 00 00 1B FF FF FF FF FF FF FF
        00 00 03 70 00 00 00 00 00 F0 09 01 06 00 08 40
        06 00 00 40 00 00 00 00 31 FF FF FF FF FF FF FF`.replace(/\s+/g, ''), "hex"
    ),
    HEADER_LENGTH: 0x60,

    START_Y_OFFSET_0: 0x2B, //uint_8
    START_Y_OFFSET_1: 0x48, //uint_16
    START_MULTIPLIER: 0xA0,

    SOUND_OFFSET: 0x145F0,
    SOUND_LENGTH: 0x960
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

    constructor (id, data, dataSub, path, title, maker, gameStyle, courseTheme) {

        if (!!path && !fs.existsSync(path)) {
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
        this.gameStyle = COURSE_CONSTANTS.GAME_STYLE[gameStyle];
        
        /**
         * Course theme
         * @member {number} courseTheme
         * @memberOf Course
         * @instance
         */
        this.courseTheme = COURSE_CONSTANTS.THEME[COURSE_CONSTANTS.THEME_BY_ID[courseTheme]];

        if (!!this[courseData]) {

            this.startY = this[courseData].readUInt8(COURSE_CONSTANTS.HEADER_OFFSET + COURSE_CONSTANTS.START_Y_OFFSET_0) - 1;

            this.finishX = this[courseData].readUInt8(COURSE_CONSTANTS.HEADER_OFFSET + COURSE_CONSTANTS.START_Y_OFFSET_0) - 1;

            /**
             * Blocks of main course
             * @member {Array<Block>} blocks
             * @memberOf Course
             * @instance
             */
            this.blocks = [];
            let blockAmount = this[courseData].readUInt32BE(COURSE_CONSTANTS.BLOCK_AMOUNT_OFFSET) - 6;
            for (let i = 0, offset = COURSE_CONSTANTS.HEADER_OFFSET + COURSE_CONSTANTS.HEADER_LENGTH; i < blockAmount; i++, offset += BLOCK_CONSTANTS.SIZE) {
                let blockData = this[courseData].slice(offset, offset + BLOCK_CONSTANTS.SIZE);
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
            blockAmount = this[courseDataSub].readUInt32BE(COURSE_CONSTANTS.BLOCK_AMOUNT_OFFSET);
            for (let i = 0, offset = COURSE_CONSTANTS.HEADER_OFFSET; i < blockAmount; i++, offset += BLOCK_CONSTANTS.SIZE) {
                let blockData = this[courseDataSub].slice(offset, offset + BLOCK_CONSTANTS.SIZE);
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
        }

        try {
            [this[tnl], this[tnlPreview]] = this.loadTnl();
        } catch (err) {
        }

    }

    static async fromObject (obj) {

        let course = new Course();
        Object.assign(course, obj);

        this[courseData] = Buffer.alloc(COURSE_CONSTANTS.HEADER_OFFSET);
        console.log(course.blocks);
        this[courseData].writeUInt16BE(course.blocks.length + 6, COURSE_CONSTANTS.BLOCK_AMOUNT_OFFSET);
        let header = Buffer.alloc(COURSE_CONSTANTS.HEADER_LENGTH);
        COURSE_CONSTANTS.HEADER_DEFAULT.copy(header);
        header.writeUInt8(course.startY, COURSE_CONSTANTS.START_Y_OFFSET_0);
        header.writeUInt16BE((course.startY + 1) * COURSE_CONSTANTS.START_MULTIPLIER, COURSE_CONSTANTS.START_Y_OFFSET_0);
        this[courseData] = Buffer.concat([this[courseData], header]);
        let blockBuffer = Buffer.alloc(0);
        for (let i = 0, i < course.blocks.length, i++) {
            let buf = course.blocks[i].toBuffer();
            
        }
        
        //this[courseDataSub] = Buffer.alloc(COURSE_CONSTANTS.SIZE);

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
    async writeCrc (writeToFs) {

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
     * @returns {Course}
     */
    static deserialize (buffer) {
        let obj = smmCourse.toObject(smmCourse.decode(Buffer.from(buffer)), {
            arrays: true
        });
        return this.fromObject(obj);
    }
}