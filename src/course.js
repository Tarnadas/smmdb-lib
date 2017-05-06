const Promise = require("bluebird");
const crc32   = require("buffer-crc32");

const fs   = require("fs");
const path = require("path");

const getElement = require("./element");

const COURSE_SIZE = 0x15000;

const COURSE_CRC_LENGTH = 0x10;
const COURSE_CRC_PRE_BUF  = Buffer.from("000000000000000B", "hex");
const COURSE_CRC_POST_BUF = Buffer.alloc(4);

const COURSE_NAME_OFFSET = 0x28;
const COURSE_NAME_LENGTH = 0x42;

const COURSE_MAKER_OFFSET = 0x91;
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

module.exports = createCourse;

async function createCourse (courseId, coursePath) {

    return new Promise ((resolve) => {
        fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), async (err, data) => {
            if (err) throw err;
            let dataSub = await new Promise((resolve) => {
                fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), async (err, data) => {
                    resolve(data);
                });
            });
            let titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
            let title = "";
            for (let i = 0; i < COURSE_NAME_LENGTH; i+=2) {
                //let charBuf = Buffer.concat([titleBuf.slice(i+1, i+2), titleBuf.slice(i, i+1)]);
                let charBuf = Buffer.allocUnsafe(2);
                charBuf.writeUInt16BE(titleBuf.readUInt16LE(i));
                if (charBuf.readUInt16LE(0) === 0) {
                    break;
                }
                title += charBuf.toString('utf16le');
            }
            let makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
            let maker = "";
            for (let i = 0; i < COURSE_MAKER_LENGTH; i+=2) {
                let charBuf = Buffer.allocUnsafe(2);
                charBuf.writeUInt16BE(makerBuf.readUInt16LE(i));
                if (charBuf.readUInt16LE(0) === 0) {
                    break;
                }
                maker += charBuf.toString('utf16le');
            }
            let type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
            let environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);
            resolve(new Course(courseId, data, dataSub, coursePath, title, maker, type, environment));
        });
    });
}

function Course (id, data, dataSub, path, title, maker, type, environment) {
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

Course.prototype = {

    writeCrc: async function () {

        await Promise.all([
            new Promise (async (resolve) => {
                try {
                    let fileWithoutCrc = this[courseData].slice(16);
                    let crc = Buffer.alloc(4);
                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                    let crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);
                    this[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                    fs.writeFile(path.resolve(`${this.path}/course_data.cdt`), this[courseData], null, () => {
                        resolve();
                    });
                } catch (err) {
                    console.log(err);
                }
            }),
            new Promise (async (resolve) => {
                try {
                    let fileWithoutCrc = this[courseDataSub].slice(16);
                    let crc = Buffer.alloc(4);
                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                    let crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);
                    this[courseDataSub] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                    fs.writeFile(path.resolve(`${this.path}/course_data_sub.cdt`), this[courseDataSub], null, () => {
                        resolve();
                    })
                } catch (err) {
                    console.log(err);
                }
            })
        ]);

    },

    loadElements: function () {
        this[elements] = [];
        for (let offset = COURSE_ELEMENT_DATA_OFFSET; offset < COURSE_ELEMENT_DATA_END; offset += COURSE_ELEMENT_DATA_LENGTH) {
            let elementData = this[courseData].slice(offset, offset + COURSE_ELEMENT_DATA_LENGTH);
            if (elementData.readUInt32BE(28) === 0) {
                break;
            }
            this[elements].push(getElement(elementData));
        }
    },

    getElements: function () {
        return this[elements];
    }

};