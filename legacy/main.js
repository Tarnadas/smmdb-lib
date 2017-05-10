"use strict";

var loadSave = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(pathToSave) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        return _context.abrupt("return", new Promise(function (resolve) {
                            pathToSave = path.resolve(pathToSave);
                            if (!fs.existsSync(pathToSave)) throw new Error("No such folder exists:\n" + pathToSave);
                            fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, function (err) {
                                if (err) throw new Error("Please close your emulator before executing your script");
                            });
                            fs.readFile(path.resolve(pathToSave + "/save.dat"), function (err, data) {
                                if (err) throw err;
                                resolve(new Save(pathToSave, data));
                            });
                        }));

                    case 1:
                    case "end":
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function loadSave(_x) {
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

var fs = require("fs");
var path = require("path");

var Save = require("./save");
var Tnl = require("./tnl");
var course = require("./course");

module.exports = {
    loadSave: loadSave,
    loadSaveSync: loadSaveSync,
    loadImage: loadImage,
    loadCourse: course.createCourse,
    loadCourseSync: course.createCourseSync
};

function loadSaveSync(pathToSave) {
    pathToSave = path.resolve(pathToSave);
    if (!fs.existsSync(pathToSave)) throw new Error("No such folder exists:\n" + pathToSave);
    fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, function (err) {
        if (err) throw new Error("Please close your emulator before executing your script");
    });
    var data = fs.readFileSync(path.resolve(pathToSave + "/save.dat"));
    return new Save(pathToSave, data);
}

function loadImage(pathToFile) {
    return new Tnl(pathToFile);
}