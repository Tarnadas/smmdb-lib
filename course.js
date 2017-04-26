const Promise = require("bluebird");
const crc32   = require("buffer-crc32");

const fs   = require("fs");
const path = require("path");

const getElement = require("./element");

const COURSE_NAME_OFFSET = 0x28;
const COURSE_NAME_LENGTH = 0x42;

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

const courseData  = Symbol();
const elements = Symbol();

module.exports = createCourse;

async function createCourse(courseId, coursePath) {

    return new Promise((resolve) => {
        fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), (err, data) => {
            if (err) throw err;
            let titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
            let title = "";
            for (let i = 0; i < COURSE_NAME_LENGTH; i++) {
                let charBuf = titleBuf.slice(i, i+1);
                if (charBuf.readUInt8(0) !== 0) {
                    title += charBuf.toString();
                }
            }
            let makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
            let maker = "";
            let doBreak = false;
            for (let i = 0; i < COURSE_MAKER_LENGTH; i++) {
                let charBuf = makerBuf.slice(i, i+1);
                if (charBuf.readUInt8(0) === 0) {
                    if (doBreak) break;
                    doBreak = true;
                } else {
                    doBreak = false;
                    maker += charBuf.toString();
                }
            }
            let type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
            let environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);
            resolve(new Course(courseId, data, coursePath, title, maker, type, environment));
        });
    });
}

function Course (id, data, path, title, maker, type, environment) {
    this.id = id;
    this[courseData] = data;
    this.path = path;
    this.title = title;
    this.maker = maker;
    this.type = type;
    this.type_readable = COURSE_TYPES[type];
    this.environment = environment;
    this.environmentReadable = COURSE_ENVIRONMENTS[environment];
}

Course.prototype = {

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