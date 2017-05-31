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

/**
 * loads a course from fs
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
            let titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
            let title = "";
            for (let i = 0; i < COURSE_NAME_LENGTH; i+=2) {
                let charBuf = Buffer.allocUnsafe(2);
                charBuf.writeUInt16BE(titleBuf.readUInt16BE(i), 0);
                if (charBuf.readUInt16BE(0) === 0) {
                    break;
                }
                title += charBuf.toString('utf16le');
            }
            let makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
            let maker = "";
            for (let i =  0; i < COURSE_MAKER_LENGTH; i+=2) {
                let charBuf = Buffer.allocUnsafe(2);
                charBuf.writeUInt16BE(makerBuf.readUInt16BE(i), 0);
                if (charBuf.readUInt16BE(0) === 0) {
                    break;
                }
                maker += charBuf.toString('utf16le');
            }
            let gameStyle = data.slice(COURSE_GAME_STYLE_OFFSET, COURSE_GAME_STYLE_OFFSET + 2).toString();
            let courseTheme = data.readUInt8(COURSE_THEME_OFFSET);
            try {
                let course = new Course(courseId, data, dataSub, coursePath, title, maker, gameStyle, courseTheme);
                resolve(course);
            } catch (err) {
                reject(err);
            }
        });
    });

}

/**
 * loads a course from fs
 * @function loadCourseSync
 * @param {string} coursePath - path to course on fs
 * @param {number} [courseId] - course ID inside save
 * @returns {Course}
 */
export function loadCourseSync (coursePath, courseId) {

    let data = fs.readFileSync(path.resolve(`${coursePath}/course_data.cdt`));
    let dataSub = fs.readFileSync(path.resolve(`${coursePath}/course_data_sub.cdt`));
    let titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
    let title = "";
    for (let i = 0; i < COURSE_NAME_LENGTH; i+=2) {
        let charBuf = Buffer.allocUnsafe(2);
        charBuf.writeUInt16BE(titleBuf.readUInt16BE(i), 0);
        if (charBuf.readUInt16BE(0) === 0) {
            break;
        }
        title += charBuf.toString('utf16le');
    }
    let makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
    let maker = "";
    for (let i =  0; i < COURSE_MAKER_LENGTH; i+=2) {
        let charBuf = Buffer.allocUnsafe(2);
        charBuf.writeUInt16BE(makerBuf.readUInt16BE(i), 0);
        if (charBuf.readUInt16BE(0) === 0) {
            break;
        }
        maker += charBuf.toString('utf16le');
    }
    let gameStyle = data.slice(COURSE_GAME_STYLE_OFFSET, COURSE_GAME_STYLE_OFFSET + 2).toString();
    let courseTheme = data.readUInt8(COURSE_THEME_OFFSET);
    return new Course(courseId, data, dataSub, coursePath, title, maker, gameStyle, courseTheme);

}

/**
 * deserializes a node buffer or Uint8Array
 * @param {Buffer | Uint8Array} buffer
 * @returns {Course}
 */
export function deserialize (buffer) {
    return Course.deserialize(buffer);
}

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
class Course {

    constructor (id, data, dataSub, path, title, maker, gameStyle, courseTheme) {

        if (!fs.existsSync(path)) {
            throw new Error("Path does not exists: " + path);
        }
        this[courseId] = id;
        this[courseData] = data;
        this[courseDataSub] = dataSub;
        this[coursePath] = path;
        this.title = title;
        this.maker = maker;
        this.gameStyle = COURSE_GAME_STYLE[gameStyle];
        this.courseTheme = COURSE_THEME[COURSE_THEME_BY_ID[courseTheme]];
        this.blocks = [];
        for (let offset = COURSE_BLOCK_DATA_OFFSET; offset < COURSE_BLOCK_DATA_END; offset += COURSE_BLOCK_DATA_LENGTH) {
            let blockData = this[courseData].slice(offset, offset + COURSE_BLOCK_DATA_LENGTH);
            if (blockData.readUInt32BE(28) === 0) {
                break;
            }
            this.blocks.push(new Block(blockData));
        }
        this.blocksSub = [];
        for (let offset = COURSE_BLOCK_DATA_OFFSET; offset < COURSE_BLOCK_DATA_END; offset += COURSE_BLOCK_DATA_LENGTH) {
            let blockData = this[courseDataSub].slice(offset, offset + COURSE_BLOCK_DATA_LENGTH);
            if (blockData.readUInt32BE(28) === 0) {
                break;
            }
            this.blocksSub.push(new Block(blockData));
        }
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
     * sets a new title for this course and optionally recalculates crc checksum
     * @param {string} title - new title
     * @param [boolean} [writeCrc=true] - should crc checksum be recalculated
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
     * sets a new maker for this course and optionally recalculates crc checksum
     * @param {string} makerName - new maker
     * @param [boolean} [writeCrc=true] - should crc checksum be recalculated
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
     * load tnl thumbnails from fs
     * @returns {Array<Tnl>}
     */
    loadTnl () {

        return [
            new Tnl(this[coursePath] + "/thumbnail0.tnl"),
            new Tnl(this[coursePath] + "/thumbnail1.tnl")
        ];

    }

    /**
     * convert tnl thumbnails to jpeg thumbnails
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
     * convert tnl thumbnails to jpeg thumbnails
     */
    loadThumbnailSync () {

        try {
            this.thumbnail = this[tnl].toJpegSync();
            this.thumbnailPreview = this[tnlPreview].toJpegSync();
        } catch (err) {
        }

    }

    /**
     * change thumbnail of this course
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
     *
     * @returns {Promise.<Promise.<*>|*>}
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
     *
     * @returns {Promise.<*>}
     */
    async isThumbnailBroken () {

        try {
            return await this[tnlPreview].isBroken();
        } catch (err) {
            return true;
        }

    }

    /**
     *
     * @returns {Promise.<Promise.<*>|*>}
     */
    async exportJpeg () {

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