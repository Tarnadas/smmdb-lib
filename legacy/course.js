"use strict";

var createCourse = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(coursePath, courseId) {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        return _context3.abrupt("return", new Promise(function (resolve) {
                            fs.readFile(path.resolve(coursePath + "/course_data.cdt"), function () {
                                var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(err, data) {
                                    var dataSub, titleBuf, title, i, charBuf, makerBuf, maker, _i, _charBuf, type, environment;

                                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                        while (1) {
                                            switch (_context2.prev = _context2.next) {
                                                case 0:
                                                    if (!err) {
                                                        _context2.next = 2;
                                                        break;
                                                    }

                                                    throw err;

                                                case 2:
                                                    _context2.next = 4;
                                                    return new Promise(function (resolve) {
                                                        fs.readFile(path.resolve(coursePath + "/course_data.cdt"), function () {
                                                            var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(err, data) {
                                                                return regeneratorRuntime.wrap(function _callee$(_context) {
                                                                    while (1) {
                                                                        switch (_context.prev = _context.next) {
                                                                            case 0:
                                                                                resolve(data);

                                                                            case 1:
                                                                            case "end":
                                                                                return _context.stop();
                                                                        }
                                                                    }
                                                                }, _callee, _this);
                                                            }));

                                                            return function (_x5, _x6) {
                                                                return _ref3.apply(this, arguments);
                                                            };
                                                        }());
                                                    });

                                                case 4:
                                                    dataSub = _context2.sent;
                                                    titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
                                                    title = "";
                                                    i = 0;

                                                case 8:
                                                    if (!(i < COURSE_NAME_LENGTH)) {
                                                        _context2.next = 17;
                                                        break;
                                                    }

                                                    charBuf = Buffer.allocUnsafe(2);

                                                    charBuf.writeUInt16BE(titleBuf.readUInt16BE(i));

                                                    if (!(charBuf.readUInt16BE(0) === 0)) {
                                                        _context2.next = 13;
                                                        break;
                                                    }

                                                    return _context2.abrupt("break", 17);

                                                case 13:
                                                    title += charBuf.toString('utf16le');

                                                case 14:
                                                    i += 2;
                                                    _context2.next = 8;
                                                    break;

                                                case 17:
                                                    makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
                                                    maker = "";
                                                    _i = 0;

                                                case 20:
                                                    if (!(_i < COURSE_MAKER_LENGTH)) {
                                                        _context2.next = 29;
                                                        break;
                                                    }

                                                    _charBuf = Buffer.allocUnsafe(2);

                                                    _charBuf.writeUInt16BE(makerBuf.readUInt16BE(_i));

                                                    if (!(_charBuf.readUInt16BE(0) === 0)) {
                                                        _context2.next = 25;
                                                        break;
                                                    }

                                                    return _context2.abrupt("break", 29);

                                                case 25:
                                                    maker += _charBuf.toString('utf16le');

                                                case 26:
                                                    _i += 2;
                                                    _context2.next = 20;
                                                    break;

                                                case 29:
                                                    type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
                                                    environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);

                                                    resolve(new Course(courseId, data, dataSub, coursePath, title, maker, type, environment));

                                                case 32:
                                                case "end":
                                                    return _context2.stop();
                                            }
                                        }
                                    }, _callee2, _this);
                                }));

                                return function (_x3, _x4) {
                                    return _ref2.apply(this, arguments);
                                };
                            }());
                        }));

                    case 1:
                    case "end":
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function createCourse(_x, _x2) {
        return _ref.apply(this, arguments);
    };
}();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

try {
    require("babel-polyfill");
} catch (err) {
    // ignore
}

var Promise = require("bluebird");
var crc32 = require("buffer-crc32");

var fs = require("fs");
var path = require("path");

var getElement = require("./element");
var Tnl = require("./tnl");

var COURSE_SIZE = 0x15000;

var COURSE_CRC_LENGTH = 0x10;
var COURSE_CRC_PRE_BUF = Buffer.from("000000000000000B", "hex");
var COURSE_CRC_POST_BUF = Buffer.alloc(4);

var COURSE_NAME_OFFSET = 0x29;
var COURSE_NAME_LENGTH = 0x40;

var COURSE_MAKER_OFFSET = 0x92;
var COURSE_MAKER_LENGTH = 0x14;

var COURSE_TYPE_OFFSET = 0x6A;
var COURSE_TYPE_M1 = "M1";
var COURSE_TYPE_M3 = "M3";
var COURSE_TYPE_MW = "MW";
var COURSE_TYPE_WU = "WU";
var COURSE_TYPES = {};
COURSE_TYPES[COURSE_TYPE_M1] = "Super Mario Bros";
COURSE_TYPES[COURSE_TYPE_M3] = "Super Mario Bros 3";
COURSE_TYPES[COURSE_TYPE_MW] = "Super Mario World";
COURSE_TYPES[COURSE_TYPE_WU] = "New Super Mario Bros U";

var COURSE_ENVIRONMENT_OFFSET = 0x6D;
var COURSE_ENVIRONMENT_NORMAL = 0;
var COURSE_ENVIRONMENT_UNDERGROUND = 1;
var COURSE_ENVIRONMENT_LAVA = 2;
var COURSE_ENVIRONMENT_AIRSHIP = 3;
var COURSE_ENVIRONMENT_UNDERWATER = 4;
var COURSE_ENVIRONMENT_GHOSTHOUSE = 5;
var COURSE_ENVIRONMENTS = {};
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_NORMAL] = "Normal";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_UNDERGROUND] = "Underground";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_LAVA] = "Lava";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_AIRSHIP] = "Airship";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_UNDERWATER] = "Underwater";
COURSE_ENVIRONMENTS[COURSE_ENVIRONMENT_GHOSTHOUSE] = "Ghost House";

var COURSE_ELEMENT_DATA_OFFSET = 0x1B0;
var COURSE_ELEMENT_DATA_LENGTH = 0x20;
var COURSE_ELEMENT_DATA_END = 0x145F0;

var courseData = Symbol();
var courseDataSub = Symbol();
var elements = Symbol();

module.exports = {
    createCourse: createCourse,
    createCourseSync: createCourseSync
};

function createCourseSync(coursePath, courseId) {

    var data = fs.readFileSync(path.resolve(coursePath + "/course_data.cdt"));
    var dataSub = fs.readFileSync(path.resolve(coursePath + "/course_data_subn.cdt"));
    var titleBuf = data.slice(COURSE_NAME_OFFSET, COURSE_NAME_OFFSET + COURSE_NAME_LENGTH);
    var title = "";
    for (var i = 0; i < COURSE_NAME_LENGTH; i += 2) {
        var charBuf = Buffer.allocUnsafe(2);
        charBuf.writeUInt16BE(titleBuf.readUInt16BE(i));
        if (charBuf.readUInt16BE(0) === 0) {
            break;
        }
        title += charBuf.toString('utf16le');
    }
    var makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
    var maker = "";
    for (var _i2 = 0; _i2 < COURSE_MAKER_LENGTH; _i2 += 2) {
        var _charBuf2 = Buffer.allocUnsafe(2);
        _charBuf2.writeUInt16BE(makerBuf.readUInt16BE(_i2));
        if (_charBuf2.readUInt16BE(0) === 0) {
            break;
        }
        maker += _charBuf2.toString('utf16le');
    }
    var type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
    var environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);
    return new Course(courseId, data, dataSub, coursePath, title, maker, type, environment);
}

function Course(id, data, dataSub, path, title, maker, type, environment) {
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

    writeCrc: function () {
        var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
            var _this2 = this;

            return regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            _context6.next = 2;
                            return Promise.all([new Promise(function () {
                                var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(resolve) {
                                    var fileWithoutCrc, crc, crcBuffer;
                                    return regeneratorRuntime.wrap(function _callee4$(_context4) {
                                        while (1) {
                                            switch (_context4.prev = _context4.next) {
                                                case 0:
                                                    try {
                                                        fileWithoutCrc = _this2[courseData].slice(16);
                                                        crc = Buffer.alloc(4);

                                                        crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                                                        crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);

                                                        _this2[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                                                        fs.writeFile(path.resolve(_this2.path + "/course_data.cdt"), _this2[courseData], null, function () {
                                                            resolve();
                                                        });
                                                    } catch (err) {
                                                        console.log(err);
                                                    }

                                                case 1:
                                                case "end":
                                                    return _context4.stop();
                                            }
                                        }
                                    }, _callee4, _this2);
                                }));

                                return function (_x7) {
                                    return _ref5.apply(this, arguments);
                                };
                            }()), new Promise(function () {
                                var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(resolve) {
                                    var fileWithoutCrc, crc, crcBuffer;
                                    return regeneratorRuntime.wrap(function _callee5$(_context5) {
                                        while (1) {
                                            switch (_context5.prev = _context5.next) {
                                                case 0:
                                                    try {
                                                        fileWithoutCrc = _this2[courseDataSub].slice(16);
                                                        crc = Buffer.alloc(4);

                                                        crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                                                        crcBuffer = Buffer.concat([COURSE_CRC_PRE_BUF, crc, COURSE_CRC_POST_BUF], COURSE_CRC_LENGTH);

                                                        _this2[courseDataSub] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_SIZE);
                                                        fs.writeFile(path.resolve(_this2.path + "/course_data_sub.cdt"), _this2[courseDataSub], null, function () {
                                                            resolve();
                                                        });
                                                    } catch (err) {
                                                        console.log(err);
                                                    }

                                                case 1:
                                                case "end":
                                                    return _context5.stop();
                                            }
                                        }
                                    }, _callee5, _this2);
                                }));

                                return function (_x8) {
                                    return _ref6.apply(this, arguments);
                                };
                            }())]);

                        case 2:
                        case "end":
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function writeCrc() {
            return _ref4.apply(this, arguments);
        }

        return writeCrc;
    }(),

    loadElements: function loadElements() {
        this[elements] = [];
        for (var offset = COURSE_ELEMENT_DATA_OFFSET; offset < COURSE_ELEMENT_DATA_END; offset += COURSE_ELEMENT_DATA_LENGTH) {
            var elementData = this[courseData].slice(offset, offset + COURSE_ELEMENT_DATA_LENGTH);
            if (elementData.readUInt32BE(28) === 0) {
                break;
            }
            this[elements].push(getElement(elementData));
        }
    },

    getElements: function getElements() {
        return this[elements];
    },

    setTitle: function setTitle(title, writeCrc) {
        for (var i = COURSE_NAME_OFFSET, j = 0; i < COURSE_NAME_OFFSET + COURSE_NAME_LENGTH; i += 2, j++) {
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
            this.writeCrc();
        }
    },

    setMaker: function setMaker(makerName, writeCrc) {
        for (var i = COURSE_MAKER_OFFSET, j = 0; i < COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH; i += 2, j++) {
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
            this.writeCrc();
        }
    },

    setThumbnail: function () {
        var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(pathToThumbnail) {
            var _this3 = this;

            var jpeg;
            return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                    switch (_context9.prev = _context9.next) {
                        case 0:
                            jpeg = new Tnl(path.resolve(pathToThumbnail));
                            _context9.next = 3;
                            return Promise.all([new Promise(function () {
                                var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(resolve) {
                                    var tnl;
                                    return regeneratorRuntime.wrap(function _callee7$(_context7) {
                                        while (1) {
                                            switch (_context7.prev = _context7.next) {
                                                case 0:
                                                    _context7.next = 2;
                                                    return jpeg.fromJpeg(true);

                                                case 2:
                                                    tnl = _context7.sent;

                                                    fs.writeFile(path.join(_this3.path, 'thumbnail0.tnl'), tnl, function () {
                                                        resolve();
                                                    });

                                                case 4:
                                                case "end":
                                                    return _context7.stop();
                                            }
                                        }
                                    }, _callee7, _this3);
                                }));

                                return function (_x10) {
                                    return _ref8.apply(this, arguments);
                                };
                            }()), new Promise(function () {
                                var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(resolve) {
                                    var tnl;
                                    return regeneratorRuntime.wrap(function _callee8$(_context8) {
                                        while (1) {
                                            switch (_context8.prev = _context8.next) {
                                                case 0:
                                                    _context8.next = 2;
                                                    return jpeg.fromJpeg(false);

                                                case 2:
                                                    tnl = _context8.sent;

                                                    fs.writeFile(path.join(_this3.path, 'thumbnail1.tnl'), tnl, function () {
                                                        resolve();
                                                    });

                                                case 4:
                                                case "end":
                                                    return _context8.stop();
                                            }
                                        }
                                    }, _callee8, _this3);
                                }));

                                return function (_x11) {
                                    return _ref9.apply(this, arguments);
                                };
                            }())]);

                        case 3:
                            return _context9.abrupt("return", _context9.sent);

                        case 4:
                        case "end":
                            return _context9.stop();
                    }
                }
            }, _callee9, this);
        }));

        function setThumbnail(_x9) {
            return _ref7.apply(this, arguments);
        }

        return setThumbnail;
    }(),

    isThumbnailBroken: function () {
        var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
            var tnl;
            return regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                    switch (_context10.prev = _context10.next) {
                        case 0:
                            tnl = new Tnl(path.join(this.path, 'thumbnail1.tnl'));
                            _context10.next = 3;
                            return tnl.isBroken();

                        case 3:
                            return _context10.abrupt("return", _context10.sent);

                        case 4:
                        case "end":
                            return _context10.stop();
                    }
                }
            }, _callee10, this);
        }));

        function isThumbnailBroken() {
            return _ref10.apply(this, arguments);
        }

        return isThumbnailBroken;
    }(),

    exportJpeg: function () {
        var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13() {
            var _this4 = this;

            var exists;
            return regeneratorRuntime.wrap(function _callee13$(_context13) {
                while (1) {
                    switch (_context13.prev = _context13.next) {
                        case 0:
                            exists = false;
                            _context13.next = 3;
                            return new Promise(function (resolve) {
                                fs.access(_this4.path, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                    exists = !err;
                                    resolve();
                                });
                            });

                        case 3:
                            if (!exists) {
                                _context13.next = 7;
                                break;
                            }

                            _context13.next = 6;
                            return Promise.all([new Promise(function () {
                                var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(resolve) {
                                    var tnl, jpeg;
                                    return regeneratorRuntime.wrap(function _callee11$(_context11) {
                                        while (1) {
                                            switch (_context11.prev = _context11.next) {
                                                case 0:
                                                    _context11.prev = 0;
                                                    tnl = new Tnl(_this4.path + "/thumbnail0.tnl");
                                                    _context11.next = 4;
                                                    return tnl.toJpeg();

                                                case 4:
                                                    jpeg = _context11.sent;

                                                    fs.writeFile(_this4.path + "/thumbnail0.jpg", jpeg, null, function () {
                                                        resolve();
                                                    });
                                                    _context11.next = 11;
                                                    break;

                                                case 8:
                                                    _context11.prev = 8;
                                                    _context11.t0 = _context11["catch"](0);

                                                    resolve();

                                                case 11:
                                                case "end":
                                                    return _context11.stop();
                                            }
                                        }
                                    }, _callee11, _this4, [[0, 8]]);
                                }));

                                return function (_x12) {
                                    return _ref12.apply(this, arguments);
                                };
                            }()), new Promise(function () {
                                var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(resolve) {
                                    var tnl, jpeg;
                                    return regeneratorRuntime.wrap(function _callee12$(_context12) {
                                        while (1) {
                                            switch (_context12.prev = _context12.next) {
                                                case 0:
                                                    _context12.prev = 0;
                                                    tnl = new Tnl(_this4.path + "/thumbnail1.tnl");
                                                    _context12.next = 4;
                                                    return tnl.toJpeg();

                                                case 4:
                                                    jpeg = _context12.sent;

                                                    fs.writeFile(_this4.path + "/thumbnail1.jpg", jpeg, null, function () {
                                                        resolve();
                                                    });
                                                    _context12.next = 11;
                                                    break;

                                                case 8:
                                                    _context12.prev = 8;
                                                    _context12.t0 = _context12["catch"](0);

                                                    resolve();

                                                case 11:
                                                case "end":
                                                    return _context12.stop();
                                            }
                                        }
                                    }, _callee12, _this4, [[0, 8]]);
                                }));

                                return function (_x13) {
                                    return _ref13.apply(this, arguments);
                                };
                            }())]);

                        case 6:
                            return _context13.abrupt("return", _context13.sent);

                        case 7:
                        case "end":
                            return _context13.stop();
                    }
                }
            }, _callee13, this);
        }));

        function exportJpeg() {
            return _ref11.apply(this, arguments);
        }

        return exportJpeg;
    }()

};