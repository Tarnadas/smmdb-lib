const fs = require("fs");
const path = require("path");
const util = require("util");
const crc32 = require("buffer-crc32");

const GAME_IDS = {
    "1.1": "1358e99f" // TODO add additional game ID support
};

const SAVE_SIZE  = 0xA000;
const SAVE_ORDER_OFFSET = 0x4340;

const TNL_SIZE = 0xC800;
const TNL_JPEG_MAX_SIZE = 0xC7F8;

module.exports = {
    loadSave: loadSave,
    tnl: Tnl
};

async function loadSave(pathToSave) {
    return new Promise((resolve) => {
        pathToSave = path.resolve(pathToSave);
        fs.readFile(path.resolve(`${pathToSave}/mlc01/emulatorSave/${GAME_IDS['1.1']}/save.dat`), (err, data) => {
            if (err) throw err;
            resolve(new Save(pathToSave, data));
        });
    });
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
                let fileBuffer = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
                fs.writeFile(path.resolve(`${this.pathToSave}/mlc01/emulatorSave/${GAME_IDS['1.1']}/save.dat`), fileBuffer, null, () => {
                    resolve();
                })
            } catch (err) {
                console.log(err);
            }
        });
    },
    reorder: function () {

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

// test
(async () => {

    let tnl = new Tnl("C:/Users/Public/Games/Cemu/thumbnail script/yoshi prison break/thumbnail0.tnl");
    let jpeg = await tnl.toJpeg();
    fs.writeFileSync("C:/Users/Public/Games/Cemu/thumbnail script/yoshi prison break/test.jpg", jpeg);

    let save = await loadSave("C:/Users/Public/Games/Cemu/cemu_1.6.4");
    save.writeCrc();

})();