"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.deserialize = exports.loadCourseSync = exports.loadCourse = undefined;

var _course = require("./course");

Object.defineProperty(exports, "loadCourse", {
    enumerable: true,
    get: function () {
        return _course.loadCourse;
    }
});
Object.defineProperty(exports, "loadCourseSync", {
    enumerable: true,
    get: function () {
        return _course.loadCourseSync;
    }
});
Object.defineProperty(exports, "deserialize", {
    enumerable: true,
    get: function () {
        return _course.deserialize;
    }
});
exports.loadSave = loadSave;
exports.loadSaveSync = loadSaveSync;
exports.loadImage = loadImage;

var _bluebird = require("bluebird");

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _save = require("./save");

var _save2 = _interopRequireDefault(_save);

var _tnl = require("./tnl");

var _tnl2 = _interopRequireDefault(_tnl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function loadSave(pathToSave) {
    return new _bluebird2.default(resolve => {
        pathToSave = _path2.default.resolve(pathToSave);
        if (!_fs2.default.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
        _fs2.default.access(pathToSave, _fs2.default.constants.R_OK | _fs2.default.constants.W_OK, err => {
            if (err) throw new Error("Please close your emulator before executing your script");
        });
        _fs2.default.readFile(_path2.default.resolve(`${pathToSave}/save.dat`), (err, data) => {
            if (err) throw err;
            resolve(new _save2.default(pathToSave, data));
        });
    });
}

function loadSaveSync(pathToSave) {
    pathToSave = _path2.default.resolve(pathToSave);
    if (!_fs2.default.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`);
    _fs2.default.access(pathToSave, _fs2.default.constants.R_OK | _fs2.default.constants.W_OK, err => {
        if (err) throw new Error("Please close your emulator before executing your script");
    });
    let data = _fs2.default.readFileSync(_path2.default.resolve(`${pathToSave}/save.dat`));
    return new _save2.default(pathToSave, data);
}

function loadImage(pathToFile) {
    return new _tnl2.default(pathToFile);
}