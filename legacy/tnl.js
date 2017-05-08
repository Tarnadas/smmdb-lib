"use strict";

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var Promise = require("bluebird");
var jimp = require("jimp");
var crc32 = require("buffer-crc32");

var fs = require("fs");
var path = require("path");

module.exports = Tnl;

var TNL_SIZE = 0xC800;
var TNL_JPEG_MAX_SIZE = 0xC7F8;
var TNL_DIMENSION = [[720, 81], [320, 240]];
var TNL_ASPECT_RATIO = [TNL_DIMENSION[0][0] / TNL_DIMENSION[0][1], TNL_DIMENSION[1][0] / TNL_DIMENSION[1][1]];
var TNL_ASPECT_RATIO_THRESHOLD = [3.5, 0.3];

function Tnl(pathToFile) {
    this.pathToFile = path.resolve(pathToFile);
    if (!fs.existsSync(this.pathToFile)) throw new Error("No such file exists:\n" + this.pathToFile);
}

Tnl.prototype = {

    toJpeg: function () {
        var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
            var _this = this;

            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            return _context.abrupt("return", new Promise(function (resolve) {
                                fs.readFile(_this.pathToFile, function (err, data) {
                                    if (err) throw err;
                                    var length = data.readUInt32BE(4);
                                    var jpeg = data.slice(8, 8 + length);
                                    resolve(jpeg);
                                });
                            }));

                        case 1:
                        case "end":
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        function toJpeg() {
            return _ref.apply(this, arguments);
        }

        return toJpeg;
    }(),

    toJpegSync: function toJpegSync() {

        var data = fs.readFileSync(this.pathToFile);
        var length = data.readUInt32BE(4);
        return data.slice(8, 8 + length);
    },

    fromJpeg: function () {
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(isWide) {
            var _this2 = this;

            var doClip = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            return regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            return _context4.abrupt("return", new Promise(function () {
                                var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(resolve, reject) {
                                    var sizeOK, data, image, skipPreprocessing, length, padding, fileWithoutCrc, crcBuffer, tnl;
                                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                                        while (1) {
                                            switch (_context3.prev = _context3.next) {
                                                case 0:
                                                    sizeOK = false;
                                                    _context3.next = 3;
                                                    return new Promise(function (resolve) {
                                                        fs.readFile(_this2.pathToFile, function (err, data) {
                                                            if (err) throw err;
                                                            resolve(data);
                                                        });
                                                    });

                                                case 3:
                                                    data = _context3.sent;

                                                    if (data.length <= TNL_JPEG_MAX_SIZE) {
                                                        sizeOK = true;
                                                    }

                                                    _context3.next = 7;
                                                    return jimp.read(_this2.pathToFile);

                                                case 7:
                                                    image = _context3.sent;
                                                    skipPreprocessing = false;

                                                    if (sizeOK && (image.bitmap.width === TNL_DIMENSION[0][0] && image.bitmap.height === TNL_DIMENSION[0][1] || image.bitmap.width === TNL_DIMENSION[1][0] && image.bitmap.height === TNL_DIMENSION[1][1])) {
                                                        skipPreprocessing = true;
                                                    }

                                                    // image pre-processing

                                                    if (skipPreprocessing) {
                                                        _context3.next = 12;
                                                        break;
                                                    }

                                                    return _context3.delegateYield(regeneratorRuntime.mark(function _callee2() {
                                                        var aspectRatio, quality;
                                                        return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                                            while (1) {
                                                                switch (_context2.prev = _context2.next) {
                                                                    case 0:
                                                                        if (isWide === null) {
                                                                            aspectRatio = image.bitmap.width / image.bitmap.height;

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

                                                                        quality = 80;
                                                                        _context2.next = 5;
                                                                        return new Promise(function (resolve) {
                                                                            image.quality(quality);
                                                                            image.getBuffer(jimp.MIME_JPEG, function (err, buffer) {
                                                                                resolve(buffer);
                                                                            });
                                                                        });

                                                                    case 5:
                                                                        data = _context2.sent;

                                                                    case 6:
                                                                        if (!(data.length > TNL_JPEG_MAX_SIZE)) {
                                                                            _context2.next = 14;
                                                                            break;
                                                                        }

                                                                        quality -= 5;
                                                                        if (quality < 0) {
                                                                            reject("File could not be transformed into jpeg with lowest quality setting.");
                                                                        }
                                                                        _context2.next = 11;
                                                                        return new Promise(function (resolve) {
                                                                            image.quality(quality);
                                                                            image.getBuffer(jimp.MIME_JPEG, function (err, buffer) {
                                                                                resolve(buffer);
                                                                            });
                                                                        });

                                                                    case 11:
                                                                        data = _context2.sent;
                                                                        _context2.next = 6;
                                                                        break;

                                                                    case 14:
                                                                    case "end":
                                                                        return _context2.stop();
                                                                }
                                                            }
                                                        }, _callee2, _this2);
                                                    })(), "t0", 12);

                                                case 12:

                                                    // wrap tnl data around jpeg
                                                    length = Buffer.alloc(4);

                                                    length.writeUInt32BE(data.length, 0);

                                                    padding = Buffer.alloc(0xC800 - data.length - 8);
                                                    fileWithoutCrc = Buffer.concat([length, data, padding], 0xC800 - 4);
                                                    crcBuffer = Buffer.alloc(4);

                                                    crcBuffer.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);

                                                    tnl = Buffer.concat([crcBuffer, fileWithoutCrc], TNL_SIZE);

                                                    resolve(tnl);

                                                case 20:
                                                case "end":
                                                    return _context3.stop();
                                            }
                                        }
                                    }, _callee3, _this2);
                                }));

                                return function (_x3, _x4) {
                                    return _ref3.apply(this, arguments);
                                };
                            }()));

                        case 1:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function fromJpeg(_x2) {
            return _ref2.apply(this, arguments);
        }

        return fromJpeg;
    }(),

    isBroken: function () {
        var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
            var _this3 = this;

            return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            return _context5.abrupt("return", new Promise(function (resolve) {
                                fs.readFile(_this3.pathToFile, function (err, data) {
                                    if (err) throw err;
                                    var length = data.readUInt32BE(4);
                                    var jpeg = data.slice(8, 8 + length);
                                    var zeros = 0;
                                    for (var i = 0; i < jpeg.length; i++) {
                                        if (jpeg.readUInt8(i) === 0) {
                                            zeros++;
                                        }
                                    }
                                    resolve(zeros / jpeg.length > 0.9);
                                });
                            }));

                        case 1:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function isBroken() {
            return _ref4.apply(this, arguments);
        }

        return isBroken;
    }()

};