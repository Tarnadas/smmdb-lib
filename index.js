const crc32 = require("buffer-crc32");

const fs    = require("fs");
const path  = require("path");

const SAVE_SIZE  = 0xA000;
const SAVE_ORDER_OFFSET = 0x4340;
const SAVE_ORDER_SIZE = 120;
const SAVE_ORDER_EMPTY = 0xFF;

const TNL_SIZE = 0xC800;
const TNL_JPEG_MAX_SIZE = 0xC7F8;

module.exports = {
    loadSave: loadSave,
    loadImage: loadImage
};

async function loadSave(pathToSave) {
    return new Promise((resolve) => {
        pathToSave = path.resolve(pathToSave);
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
}

Save.prototype = {

    writeCrc: async function () {

        return new Promise((resolve) => {
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

        return new Promise(async (resolve, reject) => {
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

    }

};

function Tnl(pathToFile) {
    this.pathToFile = path.resolve(pathToFile);
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

    fromJpeg: async function () {

        return new Promise((resolve, reject) => {
            fs.readFile(this.pathToFile, (err, data) => {
                if (err) throw err;
                if (data.length > TNL_JPEG_MAX_SIZE) {
                    reject("File size too big. Maximum length is 0xC7F8 bytes.");
                }
                let length = Buffer.alloc(4);
                length.writeUInt32BE(data.length, 0);

                let padding = Buffer.alloc(0xC800 - data.length - 8);

                let fileWithoutCrc = Buffer.concat([length, data, padding], 0xC800 - 4);

                let crcBuffer = Buffer.alloc(4);
                crcBuffer.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);

                let tnl = Buffer.concat([crcBuffer, fileWithoutCrc], TNL_SIZE);
                resolve(tnl);
            })
        });

    }

};

Number.prototype.pad = function(size) {
    let s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
};