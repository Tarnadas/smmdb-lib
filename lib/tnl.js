"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Jpeg = exports.Tnl = undefined;

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _jimp = require("jimp");

var jimp = _interopRequireWildcard(_jimp);

var _bufferCrc = require("buffer-crc32");

var _bufferCrc2 = _interopRequireDefault(_bufferCrc);

var _fs = require("fs");

var fs = _interopRequireWildcard(_fs);

var _path = require("path");

var path = _interopRequireWildcard(_path);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TNL_SIZE = 0xC800;
const TNL_JPEG_MAX_SIZE = 0xC7F8;
const TNL_DIMENSION = [[720, 81], [320, 240]];
const TNL_ASPECT_RATIO = [TNL_DIMENSION[0][0] / TNL_DIMENSION[0][1], TNL_DIMENSION[1][0] / TNL_DIMENSION[1][1]];
const TNL_ASPECT_RATIO_THRESHOLD = [3.5, 0.3];

class Image {
    constructor(data) {
        if (data instanceof Buffer) {
            this.data = data;
        } else {
            this.pathToFile = path.resolve(data);
            if (!fs.existsSync(this.pathToFile)) throw new Error(`No such file exists:\n${this.pathToFile}`);
        }
    }
    async readFile() {
        this.data = await new _bluebird2.default(resolve => {
            fs.readFile(this.pathToFile, (err, data) => {
                if (err) throw err;
                resolve(data);
            });
        });
        return this;
    }
    readFileSync() {
        this.data = fs.readFileSync(this.pathToFile);
        return this;
    }
}

/**
 * A TNL file
 * @class Tnl
 */
class Tnl extends Image {

    constructor(data) {
        super(data);
    }

    /**
     * Convert to JPEG
     * @function toJpeg
     * @memberOf Tnl
     * @instance
     * @returns {Promise.<Buffer|ArrayBuffer>}
     */
    async toJpeg() {

        if (!this.data) {
            await this.readFile();
        }
        let length = this.data.readUInt32BE(4);
        return this.data.slice(8, 8 + length);
    }

    /**
     * Synchronous version of {@link Tnl.toJpeg}
     * @function toJpegSync
     * @memberOf Tnl
     * @instance
     * @returns {Buffer|ArrayBuffer}
     */
    toJpegSync() {

        if (!this.data) {
            this.data = fs.readFileSync(this.pathToFile);
        }
        let length = this.data.readUInt32BE(4);
        return this.data.slice(8, 8 + length);
    }

    /**
     * Check if TNL thumbnail is broken and needs fix
     * @function isBroken
     * @memberOf Tnl
     * @instance
     * @returns {Promise.<boolean>}
     */
    async isBroken() {

        if (!this.data) {
            await this.readFile();
        }
        let length = this.data.readUInt32BE(4);
        let jpeg = this.data.slice(8, 8 + length);
        let count = 0;
        try {
            for (let i = 0; i < jpeg.length; i += 4) {
                if (jpeg.readUInt32BE(i) === 0xA2800A28) {
                    count++;
                }
            }
        } catch (err) {}
        return count * 4 / jpeg.length > 0.5;
    }

}

exports.Tnl = Tnl; /**
                    * A JPEG file
                    * @class Jpeg
                    */

class Jpeg extends Image {

    constructor(pathToFile) {
        super(pathToFile);
    }

    /**
     * Convert to TNL
     * @function toTnl
     * @memberOf Jpeg
     * @instance
     * @returns {Promise.<Buffer|ArrayBuffer>}
     */
    async toTnl(isWide, doClip = false) {

        return new _bluebird2.default(async (resolve, reject) => {

            let sizeOK = false;
            if (!this.data) {
                await this.readFile();
            }
            if (this.data.length <= TNL_JPEG_MAX_SIZE) {
                sizeOK = true;
            }

            let image = await jimp.read(this.data);
            let skipPreprocessing = false;
            if (sizeOK && (image.bitmap.width === TNL_DIMENSION[0][0] && image.bitmap.height === TNL_DIMENSION[0][1] || image.bitmap.width === TNL_DIMENSION[1][0] && image.bitmap.height === TNL_DIMENSION[1][1])) {
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

                let quality = 95;
                this.data = await new _bluebird2.default(resolve => {
                    image.quality(quality);
                    image.getBuffer(jimp.MIME_JPEG, (err, buffer) => {
                        resolve(buffer);
                    });
                });

                // lower quality until it fits
                while (this.data.length > TNL_JPEG_MAX_SIZE) {
                    quality -= 5;
                    if (quality < 0) {
                        reject("File could not be transformed into jpeg with lowest quality setting.");
                    }
                    this.data = await new _bluebird2.default(resolve => {
                        image.quality(quality);
                        image.getBuffer(jimp.MIME_JPEG, (err, buffer) => {
                            resolve(buffer);
                        });
                    });
                }
            }

            // wrap TNL data around JPEG
            let length = Buffer.alloc(4);
            length.writeUInt32BE(this.data.length, 0);

            let padding = Buffer.alloc(0xC800 - this.data.length - 8);

            let fileWithoutCrc = Buffer.concat([length, this.data, padding], 0xC800 - 4);

            let crcBuffer = Buffer.alloc(4);
            crcBuffer.writeUInt32BE(_bufferCrc2.default.unsigned(fileWithoutCrc), 0);

            let tnl = Buffer.concat([crcBuffer, fileWithoutCrc], TNL_SIZE);
            resolve(tnl);
        });
    }

}
exports.Jpeg = Jpeg;