"use strict";

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var Promise = require("bluebird");
var crc32 = require("buffer-crc32");
var copydir = require("copy-dir");
var rimraf = require("rimraf");

var fs = require("fs");
var path = require("path");

var createCourse = require("./course").createCourse;
var createCourseSync = require("./course").createCourseSync;
var Tnl = require("./tnl");

var SAVE_SIZE = 0xA000;

var SAVE_ORDER_OFFSET = 0x4340;
var SAVE_ORDER_SIZE = 120;
var SAVE_ORDER_EMPTY = 0xFF;

var SAVE_AMIIBO_OFFSET = 0x85E0;
var SAVE_AMIIBO_LENGTH = 0x14;

var SAVE_CRC_LENGTH = 0x10;
var SAVE_CRC_PRE_BUF = Buffer.from("0000000000000015", "hex");
var SAVE_CRC_POST_BUF = Buffer.alloc(4);

module.exports = Save;

function Save(pathToSave, data) {
    this.pathToSave = pathToSave;
    this.data = data;
    this.courses = {};

    this.slotToIndex = {};
    for (var i = 0; i < SAVE_ORDER_SIZE; i++) {
        var index = this.data.readUInt8(SAVE_ORDER_OFFSET + i);
        if (index !== 255) {
            this.slotToIndex[i] = index;
        }
    }
}

Save.prototype = {

    writeCrc: function () {
        var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
            var _this = this;

            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            _context.next = 2;
                            return new Promise(function (resolve) {
                                try {
                                    var fileWithoutCrc = _this.data.slice(16);
                                    var crc = Buffer.alloc(4);
                                    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0);
                                    var crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH);
                                    _this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE);
                                    fs.writeFile(path.resolve(_this.pathToSave + "/save.dat"), _this.data, null, function () {
                                        resolve();
                                    });
                                } catch (err) {
                                    console.log(err);
                                }
                            });

                        case 2:
                        case "end":
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        function writeCrc() {
            return _ref.apply(this, arguments);
        }

        return writeCrc;
    }(),

    reorder: function () {
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
            var _this2 = this;

            return regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return new Promise(function () {
                                var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(resolve) {
                                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                                        while (1) {
                                            switch (_context3.prev = _context3.next) {
                                                case 0:
                                                    _context3.prev = 0;
                                                    return _context3.delegateYield(regeneratorRuntime.mark(function _callee2() {
                                                        var promises, slotToIndex, _loop, i, _loop2, _loop3;

                                                        return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                                            while (1) {
                                                                switch (_context2.prev = _context2.next) {
                                                                    case 0:
                                                                        // rename course folders
                                                                        promises = [];
                                                                        slotToIndex = {};

                                                                        Object.assign(slotToIndex, _this2.slotToIndex);

                                                                        _loop = function _loop(i) {
                                                                            promises.push(new Promise(function (resolve) {
                                                                                var value = slotToIndex[i];
                                                                                var srcPath = path.resolve(_this2.pathToSave + "/course" + parseInt(i).pad(3));
                                                                                var dstPath = path.resolve(_this2.pathToSave + "/course" + value.pad(3) + "_reorder");
                                                                                fs.rename(srcPath, dstPath, function () {
                                                                                    _this2.slotToIndex[value] = value;
                                                                                    _this2.data.writeUInt8(value, SAVE_ORDER_OFFSET + value);
                                                                                    resolve();
                                                                                });
                                                                                resolve();
                                                                            }));
                                                                        };

                                                                        for (i in slotToIndex) {
                                                                            _loop(i);
                                                                        }
                                                                        _context2.next = 7;
                                                                        return Promise.all(promises);

                                                                    case 7:
                                                                        promises = [];

                                                                        _loop2 = function _loop2(i) {
                                                                            promises.push(new Promise(function (resolve) {
                                                                                var srcPath = path.resolve(_this2.pathToSave + "/course" + i.pad(3) + "_reorder");
                                                                                var dstPath = path.resolve(_this2.pathToSave + "/course" + i.pad(3));
                                                                                fs.rename(srcPath, dstPath, function (err) {
                                                                                    if (err) {
                                                                                        if (_this2.slotToIndex[i]) {
                                                                                            delete _this2.slotToIndex[i];
                                                                                        }
                                                                                        _this2.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i);
                                                                                    }
                                                                                    resolve();
                                                                                });
                                                                            }));
                                                                        };

                                                                        for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                                                            _loop2(i);
                                                                        }
                                                                        _context2.next = 12;
                                                                        return Promise.all(promises);

                                                                    case 12:
                                                                        promises = [];

                                                                        _loop3 = function _loop3(i) {
                                                                            promises.push(new Promise(function (resolve) {
                                                                                fs.access(path.resolve(_this2.pathToSave + "/course" + i.pad(3)), fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                                                                    if (!err) {
                                                                                        _this2.data.writeUInt8(i, SAVE_ORDER_OFFSET + i);
                                                                                    }
                                                                                    resolve();
                                                                                });
                                                                            }));
                                                                        };

                                                                        for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                                                            _loop3(i);
                                                                        }
                                                                        _context2.next = 17;
                                                                        return Promise.all(promises);

                                                                    case 17:

                                                                        // recalculate checksum
                                                                        _this2.writeCrc();

                                                                        resolve();

                                                                    case 19:
                                                                    case "end":
                                                                        return _context2.stop();
                                                                }
                                                            }
                                                        }, _callee2, _this2);
                                                    })(), "t0", 2);

                                                case 2:
                                                    _context3.next = 7;
                                                    break;

                                                case 4:
                                                    _context3.prev = 4;
                                                    _context3.t1 = _context3["catch"](0);

                                                    console.log(_context3.t1);
                                                    // TODO undo changes

                                                case 7:
                                                case "end":
                                                    return _context3.stop();
                                            }
                                        }
                                    }, _callee3, _this2, [[0, 4]]);
                                }));

                                return function (_x) {
                                    return _ref3.apply(this, arguments);
                                };
                            }());

                        case 2:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function reorder() {
            return _ref2.apply(this, arguments);
        }

        return reorder;
    }(),

    reorderSync: function reorderSync() {

        try {
            // rename course folders
            var slotToIndex = {};
            Object.assign(slotToIndex, this.slotToIndex);
            for (var i in this.slotToIndex) {
                var value = slotToIndex[i];
                var srcPath = path.resolve(this.pathToSave + "/course" + parseInt(i).pad(3));
                var dstPath = path.resolve(this.pathToSave + "/course" + value.pad(3) + "_reorder");
                fs.renameSync(srcPath, dstPath);
                this.slotToIndex[value] = value;
                this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value);
            }
            for (var _i = 0; _i < SAVE_ORDER_SIZE; _i++) {
                var _srcPath = path.resolve(this.pathToSave + "/course" + _i.pad(3) + "_reorder");
                var _dstPath = path.resolve(this.pathToSave + "/course" + _i.pad(3));
                try {
                    fs.renameSync(_srcPath, _dstPath);
                } catch (err) {
                    if (this.slotToIndex[_i]) {
                        delete this.slotToIndex[_i];
                    }
                    this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + _i);
                }
            }
            for (var _i2 = 0; _i2 < SAVE_ORDER_SIZE; _i2++) {
                try {
                    fs.accessSync(path.resolve(this.pathToSave + "/course" + _i2.pad(3)), fs.constants.R_OK | fs.constants.W_OK);
                    this.data.writeUInt8(_i2, SAVE_ORDER_OFFSET + _i2);
                } catch (err) {}
            }

            // recalculate checksum
            this.writeCrc();
        } catch (err) {
            console.log(err);
            // TODO undo changes
        }
    },

    exportJpeg: function () {
        var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
            var _this3 = this;

            var promises, _loop4, key;

            return regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            promises = [];

                            if (!(this.courses === {})) {
                                _context6.next = 4;
                                break;
                            }

                            _context6.next = 4;
                            return this.loadCourses();

                        case 4:
                            _loop4 = function _loop4(key) {
                                promises.push(new Promise(function () {
                                    var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(resolve) {
                                        return regeneratorRuntime.wrap(function _callee5$(_context5) {
                                            while (1) {
                                                switch (_context5.prev = _context5.next) {
                                                    case 0:
                                                        _this3.courses[key].exportJpeg();
                                                        resolve();

                                                    case 2:
                                                    case "end":
                                                        return _context5.stop();
                                                }
                                            }
                                        }, _callee5, _this3);
                                    }));

                                    return function (_x2) {
                                        return _ref5.apply(this, arguments);
                                    };
                                }()));
                            };

                            for (key in this.courses) {
                                _loop4(key);
                            }
                            /*for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
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
                            }*/
                            _context6.next = 8;
                            return Promise.all(promises);

                        case 8:
                            return _context6.abrupt("return", _context6.sent);

                        case 9:
                        case "end":
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function exportJpeg() {
            return _ref4.apply(this, arguments);
        }

        return exportJpeg;
    }(),

    exportJpegSync: function exportJpegSync() {

        for (var i = 0; i < SAVE_ORDER_SIZE; i++) {
            var coursePath = path.resolve(this.pathToSave + "/course" + i.pad(3) + "/");
            var exists = true;
            try {
                fs.accessSync(coursePath, fs.constants.R_OK | fs.constants.W_OK);
            } catch (err) {
                exists = false;
            }
            if (exists) {
                try {
                    var tnl = new Tnl(coursePath + "/thumbnail0.tnl");
                    var jpeg = tnl.toJpegSync();
                    fs.writeFileSync(coursePath + "/thumbnail0.jpg", jpeg);
                } catch (err) {}
                try {
                    var _tnl = new Tnl(coursePath + "/thumbnail1.tnl");
                    var _jpeg = _tnl.toJpegSync();
                    fs.writeFileSync(coursePath + "/thumbnail1.jpg", _jpeg);
                } catch (err) {}
            }
        }
    },

    importJpeg: function () {
        var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
            var _this4 = this;

            var promises, _loop5, i;

            return regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                    switch (_context10.prev = _context10.next) {
                        case 0:
                            promises = [];

                            _loop5 = function _loop5(i) {
                                var coursePath = path.resolve(_this4.pathToSave + "/course" + i.pad(3) + "/");
                                promises.push(new Promise(function () {
                                    var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(resolve) {
                                        var exists;
                                        return regeneratorRuntime.wrap(function _callee9$(_context9) {
                                            while (1) {
                                                switch (_context9.prev = _context9.next) {
                                                    case 0:
                                                        exists = false;
                                                        _context9.next = 3;
                                                        return new Promise(function (resolve) {
                                                            fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                                                exists = !err;
                                                                resolve();
                                                            });
                                                        });

                                                    case 3:
                                                        if (!exists) {
                                                            _context9.next = 6;
                                                            break;
                                                        }

                                                        _context9.next = 6;
                                                        return Promise.all([new Promise(function () {
                                                            var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(resolve) {
                                                                var jpeg, tnl;
                                                                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                                                                    while (1) {
                                                                        switch (_context7.prev = _context7.next) {
                                                                            case 0:
                                                                                _context7.prev = 0;
                                                                                jpeg = new Tnl(coursePath + "/thumbnail0.jpg");
                                                                                _context7.next = 4;
                                                                                return jpeg.fromJpeg(true);

                                                                            case 4:
                                                                                tnl = _context7.sent;

                                                                                fs.writeFile(coursePath + "/thumbnail0.tnl", tnl, null, function () {
                                                                                    resolve();
                                                                                });
                                                                                _context7.next = 11;
                                                                                break;

                                                                            case 8:
                                                                                _context7.prev = 8;
                                                                                _context7.t0 = _context7["catch"](0);

                                                                                resolve();

                                                                            case 11:
                                                                            case "end":
                                                                                return _context7.stop();
                                                                        }
                                                                    }
                                                                }, _callee7, _this4, [[0, 8]]);
                                                            }));

                                                            return function (_x4) {
                                                                return _ref8.apply(this, arguments);
                                                            };
                                                        }()), new Promise(function () {
                                                            var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(resolve) {
                                                                var jpeg, tnl;
                                                                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                                                                    while (1) {
                                                                        switch (_context8.prev = _context8.next) {
                                                                            case 0:
                                                                                _context8.prev = 0;
                                                                                jpeg = new Tnl(coursePath + "/thumbnail1.jpg");
                                                                                _context8.next = 4;
                                                                                return jpeg.fromJpeg(false);

                                                                            case 4:
                                                                                tnl = _context8.sent;

                                                                                fs.writeFile(coursePath + "/thumbnail1.tnl", tnl, null, function () {
                                                                                    resolve();
                                                                                });
                                                                                _context8.next = 11;
                                                                                break;

                                                                            case 8:
                                                                                _context8.prev = 8;
                                                                                _context8.t0 = _context8["catch"](0);

                                                                                resolve();

                                                                            case 11:
                                                                            case "end":
                                                                                return _context8.stop();
                                                                        }
                                                                    }
                                                                }, _callee8, _this4, [[0, 8]]);
                                                            }));

                                                            return function (_x5) {
                                                                return _ref9.apply(this, arguments);
                                                            };
                                                        }())]);

                                                    case 6:
                                                        resolve();

                                                    case 7:
                                                    case "end":
                                                        return _context9.stop();
                                                }
                                            }
                                        }, _callee9, _this4);
                                    }));

                                    return function (_x3) {
                                        return _ref7.apply(this, arguments);
                                    };
                                }()));
                            };

                            for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                _loop5(i);
                            }
                            _context10.next = 5;
                            return Promise.all(promises);

                        case 5:
                        case "end":
                            return _context10.stop();
                    }
                }
            }, _callee10, this);
        }));

        function importJpeg() {
            return _ref6.apply(this, arguments);
        }

        return importJpeg;
    }(),

    unlockAmiibos: function () {
        var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12() {
            var _this5 = this;

            return regeneratorRuntime.wrap(function _callee12$(_context12) {
                while (1) {
                    switch (_context12.prev = _context12.next) {
                        case 0:
                            _context12.next = 2;
                            return new Promise(function () {
                                var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(resolve) {
                                    var i;
                                    return regeneratorRuntime.wrap(function _callee11$(_context11) {
                                        while (1) {
                                            switch (_context11.prev = _context11.next) {
                                                case 0:
                                                    for (i = 0; i < SAVE_AMIIBO_LENGTH; i++) {
                                                        _this5.data.writeUInt8(0xFF, SAVE_AMIIBO_OFFSET + i);
                                                    }
                                                    _context11.next = 3;
                                                    return _this5.writeCrc();

                                                case 3:
                                                    resolve();

                                                case 4:
                                                case "end":
                                                    return _context11.stop();
                                            }
                                        }
                                    }, _callee11, _this5);
                                }));

                                return function (_x6) {
                                    return _ref11.apply(this, arguments);
                                };
                            }());

                        case 2:
                        case "end":
                            return _context12.stop();
                    }
                }
            }, _callee12, this);
        }));

        function unlockAmiibos() {
            return _ref10.apply(this, arguments);
        }

        return unlockAmiibos;
    }(),

    loadCourses: function () {
        var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
            var _this6 = this;

            var promises, _loop6, i;

            return regeneratorRuntime.wrap(function _callee14$(_context14) {
                while (1) {
                    switch (_context14.prev = _context14.next) {
                        case 0:
                            promises = [];

                            _loop6 = function _loop6(i) {
                                promises.push(new Promise(function () {
                                    var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(resolve) {
                                        var exists, courseName, coursePath;
                                        return regeneratorRuntime.wrap(function _callee13$(_context13) {
                                            while (1) {
                                                switch (_context13.prev = _context13.next) {
                                                    case 0:
                                                        exists = false;
                                                        courseName = "course" + i.pad(3);
                                                        coursePath = path.resolve(_this6.pathToSave + "/" + courseName + "/");
                                                        _context13.next = 5;
                                                        return new Promise(function (resolve) {
                                                            fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                                                exists = !err;
                                                                resolve();
                                                            });
                                                        });

                                                    case 5:
                                                        if (!exists) {
                                                            _context13.next = 9;
                                                            break;
                                                        }

                                                        _context13.next = 8;
                                                        return createCourse(coursePath, i);

                                                    case 8:
                                                        _this6.courses[courseName] = _context13.sent;

                                                    case 9:
                                                        resolve();

                                                    case 10:
                                                    case "end":
                                                        return _context13.stop();
                                                }
                                            }
                                        }, _callee13, _this6);
                                    }));

                                    return function (_x7) {
                                        return _ref13.apply(this, arguments);
                                    };
                                }()));
                            };

                            for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                _loop6(i);
                            }
                            _context14.next = 5;
                            return Promise.all(promises);

                        case 5:
                            return _context14.abrupt("return", this.courses);

                        case 6:
                        case "end":
                            return _context14.stop();
                    }
                }
            }, _callee14, this);
        }));

        function loadCourses() {
            return _ref12.apply(this, arguments);
        }

        return loadCourses;
    }(),

    loadCoursesSync: function loadCoursesSync() {

        for (var i = 0; i < SAVE_ORDER_SIZE; i++) {
            var courseName = "course" + i.pad(3);
            var _coursePath = path.resolve(this.pathToSave + "/" + courseName + "/");
            try {
                fs.accessSync(_coursePath, fs.constants.R_OK | fs.constants.W_OK);
                this.courses[courseName] = createCourseSync(_coursePath, i);
            } catch (err) {}
        }
        return this.courses;
    },

    addCourse: function () {
        var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(courseDataPath) {
            var _this7 = this;

            var emptySlotName, emptySlot, i, courseName, cemuSavePath;
            return regeneratorRuntime.wrap(function _callee16$(_context16) {
                while (1) {
                    switch (_context16.prev = _context16.next) {
                        case 0:
                            if (fs.existsSync(courseDataPath)) {
                                _context16.next = 2;
                                break;
                            }

                            throw new Error("Path does not exist: " + courseDataPath);

                        case 2:
                            emptySlotName = "";
                            emptySlot = -1;
                            i = 0;

                        case 5:
                            if (!(i < SAVE_ORDER_SIZE)) {
                                _context16.next = 14;
                                break;
                            }

                            courseName = "course" + i.pad(3);

                            if (this.courses[courseName]) {
                                _context16.next = 11;
                                break;
                            }

                            emptySlotName = courseName;
                            emptySlot = i;
                            return _context16.abrupt("break", 14);

                        case 11:
                            i++;
                            _context16.next = 5;
                            break;

                        case 14:
                            if (!(emptySlot === -1)) {
                                _context16.next = 16;
                                break;
                            }

                            throw new Error("No empty slot inside save");

                        case 16:
                            cemuSavePath = path.join(this.pathToSave, emptySlotName);
                            _context16.prev = 17;
                            _context16.next = 20;
                            return new Promise(function (resolve) {
                                rimraf(cemuSavePath, _asyncToGenerator(regeneratorRuntime.mark(function _callee15() {
                                    return regeneratorRuntime.wrap(function _callee15$(_context15) {
                                        while (1) {
                                            switch (_context15.prev = _context15.next) {
                                                case 0:
                                                    fs.mkdirSync(cemuSavePath);
                                                    copydir.sync(courseDataPath, cemuSavePath);
                                                    _this7.data.writeUInt8(emptySlot, SAVE_ORDER_OFFSET + emptySlot);
                                                    _this7.writeCrc();
                                                    _context15.next = 6;
                                                    return createCourse(cemuSavePath, emptySlot);

                                                case 6:
                                                    _this7.courses[emptySlotName] = _context15.sent;

                                                    resolve();

                                                case 8:
                                                case "end":
                                                    return _context15.stop();
                                            }
                                        }
                                    }, _callee15, _this7);
                                })));
                            });

                        case 20:
                            return _context16.abrupt("return", _context16.sent);

                        case 23:
                            _context16.prev = 23;
                            _context16.t0 = _context16["catch"](17);
                            throw _context16.t0;

                        case 26:
                        case "end":
                            return _context16.stop();
                    }
                }
            }, _callee16, this, [[17, 23]]);
        }));

        function addCourse(_x8) {
            return _ref14.apply(this, arguments);
        }

        return addCourse;
    }(),

    deleteCourse: function () {
        var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(courseId) {
            var _this8 = this;

            var courseName, coursePath;
            return regeneratorRuntime.wrap(function _callee17$(_context17) {
                while (1) {
                    switch (_context17.prev = _context17.next) {
                        case 0:
                            courseName = "course" + courseId.pad(3);
                            coursePath = path.join(this.pathToSave, courseName);

                            if (fs.existsSync(coursePath)) {
                                _context17.next = 4;
                                break;
                            }

                            throw new Error("Course does not exist: " + courseId.pad(3));

                        case 4:
                            _context17.prev = 4;
                            _context17.next = 7;
                            return new Promise(function (resolve) {
                                rimraf(coursePath, function () {
                                    _this8.data.writeUInt8(courseId, SAVE_ORDER_OFFSET + courseId);
                                    _this8.writeCrc();
                                    delete _this8.courses[courseName];
                                    resolve();
                                });
                            });

                        case 7:
                            return _context17.abrupt("return", _context17.sent);

                        case 10:
                            _context17.prev = 10;
                            _context17.t0 = _context17["catch"](4);
                            throw _context17.t0;

                        case 13:
                        case "end":
                            return _context17.stop();
                    }
                }
            }, _callee17, this, [[4, 10]]);
        }));

        function deleteCourse(_x9) {
            return _ref16.apply(this, arguments);
        }

        return deleteCourse;
    }(),

    loadCourseElements: function loadCourseElements() {

        for (var key in this.courses) {
            //noinspection JSUnfilteredForInLoop
            this.courses[key].loadElements();
        }
    }

};

Number.prototype.pad = function (size) {
    var s = String(this);
    while (s.length < (size || 2)) {
        s = "0" + s;
    }
    return s;
};