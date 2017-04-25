const Promise = require("bluebird");
const crc32   = require("buffer-crc32");
const jimp    = require("jimp");

const fs    = require("fs");
const path  = require("path");

const SAVE_SIZE  = 0xA000;
const SAVE_ORDER_OFFSET = 0x4340;
const SAVE_ORDER_SIZE = 120;
const SAVE_ORDER_EMPTY = 0xFF;

const COURSE_SAVE_NAME_OFFSET = 0x28;
const COURSE_SAVE_NAME_LENGTH = 0x42;
const COURSE_SAVE_MAKER_OFFSET = 0x92;
const COURSE_SAVE_MAKER_LENGTH = 0x14;
const COURSE_SAVE_TYPE_OFFSET = 0x6A;
const COURSE_SAVE_TYPE_READABLE = {
    "M1": "Super Mario Bros",
    "M3": "Super Mario Bros 3",
    "MW": "Super Mario World",
    "WU": "New Super Mario Bros U"
};

const TNL_SIZE = 0xC800;
const TNL_JPEG_MAX_SIZE = 0xC7F8;
const TNL_DIMENSION = [
    [ 720, 81 ],
    [ 320, 240 ]
];
const TNL_ASPECT_RATIO = [
    TNL_DIMENSION[0][0] / TNL_DIMENSION[0][1],
    TNL_DIMENSION[1][0] / TNL_DIMENSION[1][1]
];
const TNL_ASPECT_RATIO_THRESHOLD = [ 3.5, 0.3 ];

module.exports = {
    loadSave: loadSave,
    loadImage: loadImage
};

async function loadSave(pathToSave) {
    return new Promise((resolve) => {
        pathToSave = path.resolve(pathToSave);
        if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
        fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, (err) => {
            if (err) throw new Error("Please close you emuulator before executing your script");
        });
        fs.readFile(path.resolve(`${pathToSave}/save.dat`), (err, data) => {
            if (err) throw err;
            resolve(new Save(pathToSave, data));
        });
    });
}

function loadImage(pathToFile) {
    return new Tnl(pathToFile);
}

function Save(pathToSave, data) {
    this.pathToSave = pathToSave;
    this.data = data;
    this.courses = {};
}

Save.prototype = {

    writeCrc: async function () {

        await new Promise((resolve) => {
            try {
                let fileWithoutCrc = this.data.slice(16);
                let crc = Buffer.alloc(4);
                crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                let crcBuffer = Buffer.concat([Buffer.from("0000000000000015", "hex"), crc, Buffer.alloc(4)], 16);
                this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
                fs.writeFile(path.resolve(`${this.pathToSave}/save.dat`), this.data, null, () => {
                    resolve();
                })
            } catch (err) {
                console.log(err);
            }
        });

    },

    reorder: async function () {

        await new Promise(async (resolve, reject) => {
            try {
                if (this.data.slice(SAVE_ORDER_OFFSET, SAVE_ORDER_OFFSET + SAVE_ORDER_SIZE).readUInt32BE(0) !== 0) {
                    // find all unused slots
                    let numbers = [];
                    for (let i = SAVE_ORDER_SIZE - 1; i > 0; i--) {
                        let index = this.data.readUInt8(SAVE_ORDER_OFFSET + i);
                        if (index !== 255) {
                            numbers.push(index);
                        }
                    }
                    let missingNo = [];
                    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                        if (!numbers.includes(i)) {
                            missingNo.push(i);
                        }
                    }

                    // rename course folders
                    let promises = [];
                    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                        let index = this.data.readUInt8(SAVE_ORDER_OFFSET + i);
                        if (index !== 255) {
                            promises.push(new Promise((resolve) => {
                                let srcPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}`);
                                let dstPath = path.resolve(`${this.pathToSave}/course${(index).pad(3)}_reorder`);
                                fs.rename(srcPath, dstPath, () => {
                                    resolve();
                                });
                            }));
                        }
                    }
                    await Promise.all(promises);
                    promises = [];
                    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                        promises.push(new Promise((resolve) => {
                            let srcPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}_reorder`);
                            let dstPath = path.resolve(`${this.pathToSave}/course${i.pad(3)}`);
                            fs.rename(srcPath, dstPath, () => {
                                // somehow this does not throw an error if srcPath does not exist
                                resolve();
                            });
                        }));
                    }
                    await Promise.all(promises);

                    // write bytes to 'save.dat'
                    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
                        if (missingNo.includes(i)) {
                            this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i);
                        } else {
                            this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
                        }
                    }

                    // recalculate checksum
                    this.writeCrc();

                    resolve();
                } else {
                    reject("No course has been saved so far");
                }
            } catch (err) {
                console.log(err);
            }
        });

    },

    exportJpeg: async function () {

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
                                let tnl = new Tnl(coursePath + "/thumbnail0.tnl");
                                let jpeg = await tnl.toJpeg();
                                fs.writeFile(coursePath + "/thumbnail0.jpg", jpeg, null, () => {
                                    resolve();
                                })
                            } catch (err) {
                                resolve();
                            }
                        }),
                        new Promise(async (resolve) => {
                            try {
                                let tnl = new Tnl(coursePath + "/thumbnail1.tnl");
                                let jpeg = await tnl.toJpeg();
                                fs.writeFile(coursePath + "/thumbnail1.jpg", jpeg, null, () => {
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
        await Promise.all(promises);

    },

    importJpeg: async function () {

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
                                let jpeg = new Tnl(coursePath + "/thumbnail0.jpg");
                                let tnl = await jpeg.fromJpeg(true);
                                fs.writeFile(coursePath + "/thumbnail0.tnl", tnl, null, () => {
                                    resolve();
                                })
                            } catch (err) {
                                resolve();
                            }
                        }),
                        new Promise(async (resolve) => {
                            try {
                                let jpeg = new Tnl(coursePath + "/thumbnail1.jpg");
                                let tnl = await jpeg.fromJpeg(false);
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
        await Promise.all(promises);

    },

    loadCourses: async function () {

        let promises = [];
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
            let course = `course${i.pad(3)}`;
            let coursePath = path.resolve(`${this.pathToSave}/${course}/`);
            promises.push(new Promise(async (resolve) => {
                let exists = false;
                await new Promise((resolve) => {
                    fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        exists = !err;
                        resolve();
                    });
                });
                if (exists) {
                    fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), (err, data) => {
                        if (err) throw err;
                        let titleBuf = data.slice(COURSE_SAVE_NAME_OFFSET, COURSE_SAVE_NAME_OFFSET + COURSE_SAVE_NAME_LENGTH);
                        let title = "";
                        for (let i = 0; i < COURSE_SAVE_NAME_LENGTH; i++) {
                            let charBuf = titleBuf.slice(i, i+1);
                            if (charBuf.readUInt8(0) !== 0) {
                                title += charBuf.toString();
                            }
                        }
                        let makerBuf = data.slice(COURSE_SAVE_MAKER_OFFSET, COURSE_SAVE_MAKER_OFFSET + COURSE_SAVE_MAKER_LENGTH);
                        let maker = "";
                        let doBreak = false;
                        for (let i = 0; i < COURSE_SAVE_MAKER_LENGTH; i++) {
                            let charBuf = makerBuf.slice(i, i+1);
                            if (charBuf.readUInt8(0) === 0) {
                                if (doBreak) break;
                                doBreak = true;
                            } else {
                                doBreak = false;
                                maker += charBuf.toString();
                            }
                        }
                        let type = data.slice(COURSE_SAVE_TYPE_OFFSET, COURSE_SAVE_TYPE_OFFSET + 2).toString();
                        this.courses[course] = {
                            title: title,
                            maker: maker,
                            type: type,
                            type_readable: COURSE_SAVE_TYPE_READABLE[type]
                        };
                        resolve();
                    });
                } else {
                    resolve();
                }
            }));
        }
        await Promise.all(promises);
        return this.courses;

    }

};

function Tnl(pathToFile) {
    this.pathToFile = path.resolve(pathToFile);
    if (!fs.existsSync(this.pathToFile)) throw new Error(`No such file exists:\n${this.pathToFile}`);
}

Tnl.prototype = {

    toJpeg: async function () {

        return new Promise((resolve) => {
            fs.readFile(this.pathToFile, (err, data) => {
                if (err) throw err;
                let length = data.readUInt32BE(4);
                let jpeg = data.slice(8, 8 + length);
                resolve(jpeg);
            })
        });

    },

    fromJpeg: async function (isWide, doClip = false) {

        return new Promise(async (resolve, reject) => {

            let sizeOK = false;
            let data = await new Promise((resolve) => {
                fs.readFile(this.pathToFile, (err, data) => {
                    if (err) throw err;
                    resolve(data);
                });
            });
            if (data.length <= TNL_JPEG_MAX_SIZE) {
                sizeOK = true;
            }

            let image = await jimp.read(this.pathToFile);
            let skipPreprocessing = false;
            if (sizeOK && (image.bitmap.width === TNL_DIMENSION[0][0] && image.bitmap.height === TNL_DIMENSION[0][1] ||
                image.bitmap.width === TNL_DIMENSION[1][0] && image.bitmap.height === TNL_DIMENSION[1][1])) {
                skipPreprocessing = true;
            }

            // image pre-processing
            if (!skipPreprocessing) {
                if (isWide === null) {
                    let aspectRatio = image.bitmap.width / image.bitmap.height;
                    if (aspectRatio > TNL_ASPECT_RATIO[0] - TNL_ASPECT_RATIO_THRESHOLD[0] && aspectRatio < TNL_ASPECT_RATIO[0] + TNL_ASPECT_RATIO_THRESHOLD[0]) {
                        isWide = true;
                    } else if (aspectRatio > TNL_ASPECT_RATIO[1] - TNL_ASPECT_RATIO_THRESHOLD[1] && aspectRatio < TNL_ASPECT_RATIO[1] + TNL_ASPECT_RATIO_THRESHOLD[1]) {
                        isWide = false;
                    }
                    if (isWide === null) {
                        isWide = TNL_ASPECT_RATIO[0] - TNL_ASPECT_RATIO_THRESHOLD[0] - aspectRatio <= TNL_ASPECT_RATIO[1] + TNL_ASPECT_RATIO_THRESHOLD[1] + aspectRatio;
                    }
                }

                if (isWide) {
                    if (doClip) {
                        image.cover(TNL_DIMENSION[0][0], TNL_DIMENSION[0][1]);
                    } else {
                        image.contain(TNL_DIMENSION[0][0], TNL_DIMENSION[0][1]);
                    }
                } else {
                    if (doClip) {
                        image.cover(TNL_DIMENSION[1][0], TNL_DIMENSION[1][1]);
                    } else {
                        image.contain(TNL_DIMENSION[1][0], TNL_DIMENSION[1][1]);
                    }
                }

                let quality = 80;
                data = await new Promise((resolve) => {
                    image.quality(quality);
                    image.getBuffer(jimp.MIME_JPEG, (err, buffer) => { resolve(buffer); });
                });

                // lower quality until it fits
                while (data.length > TNL_JPEG_MAX_SIZE) {
                    quality -= 5;
                    if (quality < 0) {
                        reject("File could not be transformed into jpeg with lowest quality setting.");
                    }
                    data = await new Promise((resolve) => {
                        image.quality(quality);
                        image.getBuffer(jimp.MIME_JPEG, (err, buffer) => { resolve(buffer); });
                    });
                }
            }

            // wrap tnl data around jpeg
            let length = Buffer.alloc(4);
            length.writeUInt32BE(data.length, 0);

            let padding = Buffer.alloc(0xC800 - data.length - 8);

            let fileWithoutCrc = Buffer.concat([length, data, padding], 0xC800 - 4);

            let crcBuffer = Buffer.alloc(4);
            crcBuffer.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);

            let tnl = Buffer.concat([crcBuffer, fileWithoutCrc], TNL_SIZE);
            resolve(tnl);

        });

    }

};

Number.prototype.pad = function(size) {
    let s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
};