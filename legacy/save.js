"use strict";

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var Promise = require("bluebird");
var crc32 = require("buffer-crc32");

var fs = require("fs");
var path = require("path");

var createCourse = require("./course");

var SAVE_SIZE = 0xA000;

var SAVE_ORDER_OFFSET = 0x4340;
var SAVE_ORDER_SIZE = 120;
var SAVE_ORDER_EMPTY = 0xFF;

var SAVE_CRC_LENGTH = 0x10;
var SAVE_CRC_PRE_BUF = Buffer.from("0000000000000015", "hex");
var SAVE_CRC_POST_BUF = Buffer.alloc(4);

module.exports = Save;

function Save(pathToSave, data) {
    this.pathToSave = pathToSave;
    this.data = data;
    this.courses = {};
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
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
            var _this2 = this;

            return regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            _context3.next = 2;
                            return new Promise(function () {
                                var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(resolve, reject) {
                                    var numbers, i, index, missingNo, _i, promises, _loop, _i2, _loop2, _i3, _i4;

                                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                        while (1) {
                                            switch (_context2.prev = _context2.next) {
                                                case 0:
                                                    _context2.prev = 0;

                                                    if (!(_this2.data.slice(SAVE_ORDER_OFFSET, SAVE_ORDER_OFFSET + SAVE_ORDER_SIZE).readUInt32BE(0) !== 0)) {
                                                        _context2.next = 21;
                                                        break;
                                                    }

                                                    // find all unused slots
                                                    numbers = [];

                                                    for (i = SAVE_ORDER_SIZE - 1; i >= 0; i--) {
                                                        index = _this2.data.readUInt8(SAVE_ORDER_OFFSET + i);

                                                        if (index !== 255) {
                                                            numbers.push(index);
                                                        }
                                                    }
                                                    missingNo = [];

                                                    for (_i = 0; _i < SAVE_ORDER_SIZE; _i++) {
                                                        if (!numbers.includes(_i)) {
                                                            missingNo.push(_i);
                                                        }
                                                    }

                                                    // rename course folders
                                                    promises = [];

                                                    _loop = function _loop(_i2) {
                                                        var index = _this2.data.readUInt8(SAVE_ORDER_OFFSET + _i2);
                                                        if (index !== 255) {
                                                            promises.push(new Promise(function (resolve) {
                                                                var srcPath = path.resolve(_this2.pathToSave + "/course" + _i2.pad(3));
                                                                var dstPath = path.resolve(_this2.pathToSave + "/course" + index.pad(3) + "_reorder");
                                                                fs.rename(srcPath, dstPath, function () {
                                                                    resolve();
                                                                });
                                                                resolve();
                                                            }));
                                                        }
                                                    };

                                                    for (_i2 = 0; _i2 < SAVE_ORDER_SIZE; _i2++) {
                                                        _loop(_i2);
                                                    }
                                                    _context2.next = 11;
                                                    return Promise.all(promises);

                                                case 11:
                                                    promises = [];

                                                    _loop2 = function _loop2(_i3) {
                                                        promises.push(new Promise(function (resolve) {
                                                            var srcPath = path.resolve(_this2.pathToSave + "/course" + _i3.pad(3) + "_reorder");
                                                            var dstPath = path.resolve(_this2.pathToSave + "/course" + _i3.pad(3));
                                                            fs.rename(srcPath, dstPath, function () {
                                                                // somehow this does not throw an error if srcPath does not exist
                                                                resolve();
                                                            });
                                                            resolve();
                                                        }));
                                                    };

                                                    for (_i3 = 0; _i3 < SAVE_ORDER_SIZE; _i3++) {
                                                        _loop2(_i3);
                                                    }
                                                    _context2.next = 16;
                                                    return Promise.all(promises);

                                                case 16:

                                                    // write bytes to 'save.dat'
                                                    for (_i4 = 0; _i4 < SAVE_ORDER_SIZE; _i4++) {
                                                        if (missingNo.includes(_i4)) {
                                                            _this2.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + _i4);
                                                        } else {
                                                            _this2.data.writeUInt8(_i4, SAVE_ORDER_OFFSET + _i4);
                                                        }
                                                    }

                                                    // recalculate checksum
                                                    _this2.writeCrc();

                                                    resolve();
                                                    _context2.next = 22;
                                                    break;

                                                case 21:
                                                    reject("No course has been saved so far");

                                                case 22:
                                                    _context2.next = 27;
                                                    break;

                                                case 24:
                                                    _context2.prev = 24;
                                                    _context2.t0 = _context2["catch"](0);

                                                    console.log(_context2.t0);

                                                case 27:
                                                case "end":
                                                    return _context2.stop();
                                            }
                                        }
                                    }, _callee2, _this2, [[0, 24]]);
                                }));

                                return function (_x, _x2) {
                                    return _ref3.apply(this, arguments);
                                };
                            }());

                        case 2:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function reorder() {
            return _ref2.apply(this, arguments);
        }

        return reorder;
    }(),

    reorderSync: function reorderSync() {

        try {
            if (this.data.slice(SAVE_ORDER_OFFSET, SAVE_ORDER_OFFSET + SAVE_ORDER_SIZE).readUInt32BE(0) !== 0) {
                // find all unused slots
                var numbers = [];
                for (var i = SAVE_ORDER_SIZE - 1; i >= 0; i--) {
                    var index = this.data.readUInt8(SAVE_ORDER_OFFSET + i);
                    if (index !== 255) {
                        numbers.push(index);
                    }
                }
                var missingNo = [];
                for (var _i5 = 0; _i5 < SAVE_ORDER_SIZE; _i5++) {
                    if (!numbers.includes(_i5)) {
                        missingNo.push(_i5);
                    }
                }

                // rename course folders
                for (var _i6 = 0; _i6 < SAVE_ORDER_SIZE; _i6++) {
                    var _index = this.data.readUInt8(SAVE_ORDER_OFFSET + _i6);
                    if (_index !== 255) {
                        var srcPath = path.resolve(this.pathToSave + "/course" + _i6.pad(3));
                        var dstPath = path.resolve(this.pathToSave + "/course" + _index.pad(3) + "_reorder");
                        fs.renameSync(srcPath, dstPath);
                    }
                }
                for (var _i7 = 0; _i7 < SAVE_ORDER_SIZE; _i7++) {
                    var _srcPath = path.resolve(this.pathToSave + "/course" + _i7.pad(3) + "_reorder");
                    var _dstPath = path.resolve(this.pathToSave + "/course" + _i7.pad(3));
                    try {
                        fs.renameSync(_srcPath, _dstPath);
                    } catch (err) {// ignore
                    }
                }

                // write bytes to 'save.dat'
                for (var _i8 = 0; _i8 < SAVE_ORDER_SIZE; _i8++) {
                    if (missingNo.includes(_i8)) {
                        this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + _i8);
                    } else {
                        this.data.writeUInt8(_i8, SAVE_ORDER_OFFSET + _i8);
                    }
                }

                // recalculate checksum
                this.writeCrc();
            } else {
                console.log("No course has been saved so far");
            }
        } catch (err) {
            console.log(err);
        }
    },

    exportJpeg: function () {
        var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
            var _this3 = this;

            var promises, _loop3, i;

            return regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            promises = [];

                            _loop3 = function _loop3(i) {
                                var coursePath = path.resolve(_this3.pathToSave + "/course" + i.pad(3) + "/");
                                promises.push(new Promise(function () {
                                    var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(resolve) {
                                        var exists;
                                        return regeneratorRuntime.wrap(function _callee6$(_context6) {
                                            while (1) {
                                                switch (_context6.prev = _context6.next) {
                                                    case 0:
                                                        exists = false;
                                                        _context6.next = 3;
                                                        return new Promise(function (resolve) {
                                                            fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                                                exists = !err;
                                                                resolve();
                                                            });
                                                        });

                                                    case 3:
                                                        if (!exists) {
                                                            _context6.next = 6;
                                                            break;
                                                        }

                                                        _context6.next = 6;
                                                        return Promise.all([new Promise(function () {
                                                            var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(resolve) {
                                                                var tnl, jpeg;
                                                                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                                                                    while (1) {
                                                                        switch (_context4.prev = _context4.next) {
                                                                            case 0:
                                                                                _context4.prev = 0;
                                                                                tnl = new Tnl(coursePath + "/thumbnail0.tnl");
                                                                                _context4.next = 4;
                                                                                return tnl.toJpeg();

                                                                            case 4:
                                                                                jpeg = _context4.sent;

                                                                                fs.writeFile(coursePath + "/thumbnail0.jpg", jpeg, null, function () {
                                                                                    resolve();
                                                                                });
                                                                                _context4.next = 11;
                                                                                break;

                                                                            case 8:
                                                                                _context4.prev = 8;
                                                                                _context4.t0 = _context4["catch"](0);

                                                                                resolve();

                                                                            case 11:
                                                                            case "end":
                                                                                return _context4.stop();
                                                                        }
                                                                    }
                                                                }, _callee4, _this3, [[0, 8]]);
                                                            }));

                                                            return function (_x4) {
                                                                return _ref6.apply(this, arguments);
                                                            };
                                                        }()), new Promise(function () {
                                                            var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(resolve) {
                                                                var tnl, jpeg;
                                                                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                                                                    while (1) {
                                                                        switch (_context5.prev = _context5.next) {
                                                                            case 0:
                                                                                _context5.prev = 0;
                                                                                tnl = new Tnl(coursePath + "/thumbnail1.tnl");
                                                                                _context5.next = 4;
                                                                                return tnl.toJpeg();

                                                                            case 4:
                                                                                jpeg = _context5.sent;

                                                                                fs.writeFile(coursePath + "/thumbnail1.jpg", jpeg, null, function () {
                                                                                    resolve();
                                                                                });
                                                                                _context5.next = 11;
                                                                                break;

                                                                            case 8:
                                                                                _context5.prev = 8;
                                                                                _context5.t0 = _context5["catch"](0);

                                                                                resolve();

                                                                            case 11:
                                                                            case "end":
                                                                                return _context5.stop();
                                                                        }
                                                                    }
                                                                }, _callee5, _this3, [[0, 8]]);
                                                            }));

                                                            return function (_x5) {
                                                                return _ref7.apply(this, arguments);
                                                            };
                                                        }())]);

                                                    case 6:
                                                        resolve();

                                                    case 7:
                                                    case "end":
                                                        return _context6.stop();
                                                }
                                            }
                                        }, _callee6, _this3);
                                    }));

                                    return function (_x3) {
                                        return _ref5.apply(this, arguments);
                                    };
                                }()));
                            };

                            for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                _loop3(i);
                            }
                            _context7.next = 5;
                            return Promise.all(promises);

                        case 5:
                        case "end":
                            return _context7.stop();
                    }
                }
            }, _callee7, this);
        }));

        function exportJpeg() {
            return _ref4.apply(this, arguments);
        }

        return exportJpeg;
    }(),

    importJpeg: function () {
        var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11() {
            var _this4 = this;

            var promises, _loop4, i;

            return regeneratorRuntime.wrap(function _callee11$(_context11) {
                while (1) {
                    switch (_context11.prev = _context11.next) {
                        case 0:
                            promises = [];

                            _loop4 = function _loop4(i) {
                                var coursePath = path.resolve(_this4.pathToSave + "/course" + i.pad(3) + "/");
                                promises.push(new Promise(function () {
                                    var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10(resolve) {
                                        var exists;
                                        return regeneratorRuntime.wrap(function _callee10$(_context10) {
                                            while (1) {
                                                switch (_context10.prev = _context10.next) {
                                                    case 0:
                                                        exists = false;
                                                        _context10.next = 3;
                                                        return new Promise(function (resolve) {
                                                            fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                                                exists = !err;
                                                                resolve();
                                                            });
                                                        });

                                                    case 3:
                                                        if (!exists) {
                                                            _context10.next = 6;
                                                            break;
                                                        }

                                                        _context10.next = 6;
                                                        return Promise.all([new Promise(function () {
                                                            var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(resolve) {
                                                                var jpeg, tnl;
                                                                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                                                                    while (1) {
                                                                        switch (_context8.prev = _context8.next) {
                                                                            case 0:
                                                                                _context8.prev = 0;
                                                                                jpeg = new Tnl(coursePath + "/thumbnail0.jpg");
                                                                                _context8.next = 4;
                                                                                return jpeg.fromJpeg(true);

                                                                            case 4:
                                                                                tnl = _context8.sent;

                                                                                fs.writeFile(coursePath + "/thumbnail0.tnl", tnl, null, function () {
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

                                                            return function (_x7) {
                                                                return _ref10.apply(this, arguments);
                                                            };
                                                        }()), new Promise(function () {
                                                            var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(resolve) {
                                                                var jpeg, tnl;
                                                                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                                                                    while (1) {
                                                                        switch (_context9.prev = _context9.next) {
                                                                            case 0:
                                                                                _context9.prev = 0;
                                                                                jpeg = new Tnl(coursePath + "/thumbnail1.jpg");
                                                                                _context9.next = 4;
                                                                                return jpeg.fromJpeg(false);

                                                                            case 4:
                                                                                tnl = _context9.sent;

                                                                                fs.writeFile(coursePath + "/thumbnail1.tnl", tnl, null, function () {
                                                                                    resolve();
                                                                                });
                                                                                _context9.next = 11;
                                                                                break;

                                                                            case 8:
                                                                                _context9.prev = 8;
                                                                                _context9.t0 = _context9["catch"](0);

                                                                                resolve();

                                                                            case 11:
                                                                            case "end":
                                                                                return _context9.stop();
                                                                        }
                                                                    }
                                                                }, _callee9, _this4, [[0, 8]]);
                                                            }));

                                                            return function (_x8) {
                                                                return _ref11.apply(this, arguments);
                                                            };
                                                        }())]);

                                                    case 6:
                                                        resolve();

                                                    case 7:
                                                    case "end":
                                                        return _context10.stop();
                                                }
                                            }
                                        }, _callee10, _this4);
                                    }));

                                    return function (_x6) {
                                        return _ref9.apply(this, arguments);
                                    };
                                }()));
                            };

                            for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                _loop4(i);
                            }
                            _context11.next = 5;
                            return Promise.all(promises);

                        case 5:
                        case "end":
                            return _context11.stop();
                    }
                }
            }, _callee11, this);
        }));

        function importJpeg() {
            return _ref8.apply(this, arguments);
        }

        return importJpeg;
    }(),

    loadCourses: function () {
        var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13() {
            var _this5 = this;

            var promises, _loop5, i;

            return regeneratorRuntime.wrap(function _callee13$(_context13) {
                while (1) {
                    switch (_context13.prev = _context13.next) {
                        case 0:
                            promises = [];

                            _loop5 = function _loop5(i) {
                                promises.push(new Promise(function () {
                                    var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(resolve) {
                                        var exists, courseName, coursePath;
                                        return regeneratorRuntime.wrap(function _callee12$(_context12) {
                                            while (1) {
                                                switch (_context12.prev = _context12.next) {
                                                    case 0:
                                                        exists = false;
                                                        courseName = "course" + i.pad(3);
                                                        coursePath = path.resolve(_this5.pathToSave + "/" + courseName + "/");
                                                        _context12.next = 5;
                                                        return new Promise(function (resolve) {
                                                            fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                                                exists = !err;
                                                                resolve();
                                                            });
                                                        });

                                                    case 5:
                                                        if (!exists) {
                                                            _context12.next = 9;
                                                            break;
                                                        }

                                                        _context12.next = 8;
                                                        return createCourse(i, coursePath);

                                                    case 8:
                                                        _this5.courses[courseName] = _context12.sent;

                                                    case 9:
                                                        resolve();

                                                    case 10:
                                                    case "end":
                                                        return _context12.stop();
                                                }
                                            }
                                        }, _callee12, _this5);
                                    }));

                                    return function (_x9) {
                                        return _ref13.apply(this, arguments);
                                    };
                                }()));
                            };

                            for (i = 0; i < SAVE_ORDER_SIZE; i++) {
                                _loop5(i);
                            }
                            _context13.next = 5;
                            return Promise.all(promises);

                        case 5:
                            return _context13.abrupt("return", this.courses);

                        case 6:
                        case "end":
                            return _context13.stop();
                    }
                }
            }, _callee13, this);
        }));

        function loadCourses() {
            return _ref12.apply(this, arguments);
        }

        return loadCourses;
    }(),

    loadCoursesSync: function () {
        var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
            var i, courseName, _coursePath;

            return regeneratorRuntime.wrap(function _callee14$(_context14) {
                while (1) {
                    switch (_context14.prev = _context14.next) {
                        case 0:
                            i = 0;

                        case 1:
                            if (!(i < SAVE_ORDER_SIZE)) {
                                _context14.next = 16;
                                break;
                            }

                            courseName = "course" + i.pad(3);
                            _coursePath = path.resolve(this.pathToSave + "/" + courseName + "/");
                            _context14.prev = 4;

                            fs.accessSync(_coursePath, fs.constants.R_OK | fs.constants.W_OK);
                            _context14.next = 8;
                            return createCourse(i, _coursePath);

                        case 8:
                            this.courses[courseName] = _context14.sent;
                            _context14.next = 13;
                            break;

                        case 11:
                            _context14.prev = 11;
                            _context14.t0 = _context14["catch"](4);

                        case 13:
                            i++;
                            _context14.next = 1;
                            break;

                        case 16:
                            return _context14.abrupt("return", this.courses);

                        case 17:
                        case "end":
                            return _context14.stop();
                    }
                }
            }, _callee14, this, [[4, 11]]);
        }));

        function loadCoursesSync() {
            return _ref14.apply(this, arguments);
        }

        return loadCoursesSync;
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