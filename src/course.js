import Promise from "bluebird"
import crc32   from "buffer-crc32"

import fs from "fs"
import path from "path"

import getElement from "./element"
import Tnl from "./tnl"

const COURSE_SIZE = 0x15000;

const COURSE_CRC_LENGTH = 0x10;
const COURSE_CRC_PRE_BUF  = Buffer.from("000000000000000B", "hex");
const COURSE_CRC_POST_BUF = Buffer.alloc(4);

const COURSE_NAME_OFFSET = 0x29;
const COURSE_NAME_LENGTH = 0x40;

const COURSE_MAKER_OFFSET = 0x92;
const COURSE_MAKER_LENGTH = 0x14;

const COURSE_TYPE_OFFSET = 0x6A;
const COURSE_TYPE_M1 = "M1";
const COURSE_TYPE_M3 = "M3";
const COURSE_TYPE_MW = "MW";
const COURSE_TYPE_WU = "WU";
const COURSE_TYPES = {};
COURSE_TYPES[COURSE_TYPE_M1] = "Super Mario Bros";
COURSE_TYPES[COURSE_TYPE_M3] = "Super Mario Bros 3";
COURSE_TYPES[COURSE_TYPE_MW] = "Super Mario World";
COURSE_TYPES[COURSE_TYPE_WU] = "New Super Mario Bros U";

const COURSE_ENVIRONMENT_OFFSET = 0x6D;
const COURSE_ENVIRONMENT_NORMAL = 0;
const COURSE_ENVIRONMENT_UNDERGROUND = 1;
const COURSE_ENVIRONMENT_LAVA = 2;
const COURSE_ENVIRONMENT_AIRSHIP = 3;
const COURSE_ENVIRONMENT_UNDERWATER = 4;
const COURSE_ENVIRONMENT_GHOSTHOUSE = 5;
const COURSE_ENVIRONMENTS = {};
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_NORMAL]      = "Normal";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_UNDERGROUND] = "Underground";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_LAVA]        = "Lava";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_AIRSHIP]     = "Airship";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_UNDERWATER]  = "Underwater";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_GHOSTHOUSE]  = "Ghost House";

const COURSE_ELEMENT_DATA_OFFSET = 0x1B0;
const COURSE_ELEMENT_DATA_LENGTH = 0x20;
const COURSE_ELEMENT_DATA_END = 0x145F0;

const courseData    = Symbol();
const courseDataSub = Symbol();
const elements      = Symbol();

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
                charBuf.writeUInt16BE(titleBuf.readUInt16BE(i));
                if (charBuf.readUInt16BE(0) === 0) {
                    break;
                }
                title += charBuf.toString('utf16le');
            }
            let makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
            let maker = "";
            for (let i =  0; i < COURSE_MAKER_LENGTH; i+=2) {
                let charBuf = Buffer.allocUnsafe(2);
                charBuf.writeUInt16BE(makerBuf.readUInt16BE(i));
                if (charBuf.readUInt16BE(0) === 0) {
                    break;
                }
                maker += charBuf.toString('utf16le');
            }
            let type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
            let environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);
            try {
                let course = new Course(courseId, data, dataSub, coursePath, title, maker, type, environment)
                resolve(course);
            } catch (err) {
                reject(err);
            }
        });
    });

}

export function loadCourseSync (coursePath, courseId) {

    let data = fs.readFileSync(path.resolve(`${coursePath}/course_data.cdt`));
    let dataSub = fs.readFileSync(path.resolve(`${coursePath}/course_data_sub.cdt`));
    let titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
    let title = "";
    for (let i = 0; i < COURSE_NAME_LENGTH; i+=2) {
        let charBuf = Buffer.allocUnsafe(2);
        charBuf.writeUInt16BE(titleBuf.readUInt16BE(i));
        if (charBuf.readUInt16BE(0) === 0) {
            break;
        }
        title += charBuf.toString('utf16le');
    }
    let makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
    let maker = "";
    for (let i =  0; i < COURSE_MAKER_LENGTH; i+=2) {
        let charBuf = Buffer.allocUnsafe(2);
        charBuf.writeUInt16BE(makerBuf.readUInt16BE(i));
        if (charBuf.readUInt16BE(0) === 0) {
            break;
        }
        maker += charBuf.toString('utf16le');
    }
    let type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
    let environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);
    return new Course(courseId, data, dataSub, coursePath, title, maker, type, environment);

}

class Course {
    constructor (id, data, dataSub, path, title, maker, type, environment) {
        if (!fs.existsSync(path)) {
            throw new Error("Path does not exists: " + path);
        }
        this.id = id;
        this[courseData] = data;
        this[courseDataSub] = dataSub;
        this.path = path;
        this.title = title;
        this.maker = maker;
        this.type = type;
        this.type_readable = COURSE_TYPES[type];
        this.environment = environment;
        this.environmentReadable = COURSE_ENVIRONMENTS[environment];
    }

    async writeCrc () {

        return await Promise.all([
            new Promise (async (resolve, reject) => {
                try {
                    let fileWithoutCrc = this[courseData].slice(16);
                    let crc = Buffer.alloc(4);
                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                    let crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);
                    this[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                    fs.writeFileSync(path.resolve(`${this.path}/course_data.cdt`), this[courseData]);
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
                    fs.writeFileSync(path.resolve(`${this.path}/course_data_sub.cdt`), this[courseDataSub]);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
        ]);

    }

    loadElements () {
        this[elements] = [];
        for (let offset = COURSE_ELEMENT_DATA_OFFSET; offset < COURSE_ELEMENT_DATA_END; offset += COURSE_ELEMENT_DATA_LENGTH) {
            let elementData = this[courseData].slice(offset, offset + COURSE_ELEMENT_DATA_LENGTH);
            if (elementData.readUInt32BE(28) === 0) {
                break;
            }
            this[elements].push(getElement(elementData));
        }
    }

    getElements () {
        return this[elements];
    }

    async setTitle (title, writeCrc) {
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
        if (!!writeCrc) {
            return await this.writeCrc();
        }
    }

    async setMaker (makerName, writeCrc) {
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
        if (!!writeCrc) {
            await this.writeCrc();
        }
    }

    async setThumbnail (pathToThumbnail) {

        let jpeg = new Tnl(path.resolve(pathToThumbnail));
        return await Promise.all([
            new Promise(async (resolve) => {
                let tnl = await jpeg.fromJpeg(true);
                fs.writeFile(path.join(this.path, 'thumbnail0.tnl'), tnl, () => {
                    resolve();
                });
            }),
            new Promise(async (resolve) => {
                let tnl = await jpeg.fromJpeg(false);
                fs.writeFile(path.join(this.path, 'thumbnail1.tnl'), tnl, () => {
                    resolve();
                });
            })
        ])

    }

    async isThumbnailBroken () {

        try {
            let tnl = new Tnl(path.join(this.path, 'thumbnail1.tnl'));
            return await tnl.isBroken();
        } catch (err) {
            return true;
        }

    }

    async exportJpeg () {

        let exists = false;
        await new Promise((resolve) => {
            fs.access(this.path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                exists = !err;
                resolve();
            });
        });
        if (exists) {
            return await Promise.all([
                new Promise(async (resolve) => {
                    try {
                        let tnl = new Tnl(this.path + "/thumbnail0.tnl");
                        let jpeg = await tnl.toJpeg();
                        fs.writeFile(this.path + "/thumbnail0.jpg", jpeg, null, () => {
                            resolve();
                        })
                    } catch (err) {
                        resolve();
                    }
                }),
                new Promise(async (resolve) => {
                    try {
                        let tnl = new Tnl(this.path + "/thumbnail1.tnl");
                        let jpeg = await tnl.toJpeg();
                        fs.writeFile(this.path + "/thumbnail1.jpg", jpeg, null, () => {
                            resolve();
                        });
                    } catch (err) {
                        resolve();
                    }
                })
            ]);
        }

    }
}