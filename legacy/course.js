"use strict";

var createCourse = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(courseId, coursePath) {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        return _context3.abrupt("return", new Promise(function (resolve) {
                            fs.readFile(path.resolve(coursePath + "/course_data.cdt"), function () {
                                var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(err, data) {
                                    var dataSub, titleBuf, title, i, charBuf, makerBuf, maker, doBreak, _i, _charBuf, type, environment;

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

                                                    for (i = 0; i < COURSE_NAME_LENGTH; i++) {
                                                        charBuf = titleBuf.slice(i, i + 1);

                                                        if (charBuf.readUInt8(0) !== 0) {
                                                            title += charBuf.toString();
                                                        }
                                                    }
                                                    makerBuf = data.slice(COURSE_MAKER_OFFSET, COURSE_MAKER_OFFSET + COURSE_MAKER_LENGTH);
                                                    maker = "";
                                                    doBreak = false;
                                                    _i = 0;

                                                case 12:
                                                    if (!(_i < COURSE_MAKER_LENGTH)) {
                                                        _context2.next = 25;
                                                        break;
                                                    }

                                                    _charBuf = makerBuf.slice(_i, _i + 1);

                                                    if (!(_charBuf.readUInt8(0) === 0)) {
                                                        _context2.next = 20;
                                                        break;
                                                    }

                                                    if (!doBreak) {
                                                        _context2.next = 17;
                                                        break;
                                                    }

                                                    return _context2.abrupt("break", 25);

                                                case 17:
                                                    doBreak = true;
                                                    _context2.next = 22;
                                                    break;

                                                case 20:
                                                    doBreak = false;
                                                    maker += _charBuf.toString();

                                                case 22:
                                                    _i++;
                                                    _context2.next = 12;
                                                    break;

                                                case 25:
                                                    type = data.slice(COURSE_TYPE_OFFSET, COURSE_TYPE_OFFSET + 2).toString();
                                                    environment = data.readUInt8(COURSE_ENVIRONMENT_OFFSET);

                                                    resolve(new Course(courseId, data, dataSub, coursePath, title, maker, type, environment));

                                                case 28:
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

var Promise = require("bluebird");
var crc32 = require("buffer-crc32");

var fs = require("fs");
var path = require("path");

var getElement = require("./element");

var COURSE_SIZE = 0x15000;

var COURSE_CRC_LENGTH = 0x10;
var COURSE_CRC_PRE_BUF = Buffer.from("000000000000000B", "hex");
var COURSE_CRC_POST_BUF = Buffer.alloc(4);

var COURSE_NAME_OFFSET = 0x28;
var COURSE_NAME_LENGTH = 0x42;

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

module.exports = createCourse;

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
    }

};