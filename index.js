/*let isProd = true;
try {
    require("babel-polyfill");
} catch (err) {
    isProd = false;
}*/
//if (process.env.NODE_ENV === 'production') {
/*if (isProd) {
    var smm = require("./legacy/main.js");
    module.exports = {
        loadSave: smm.loadSave,
        loadSaveSync: smm.loadSaveSync,
        loadImage: smm.loadImage,
        loadCourse: smm.loadCourse,
        loadCourseSync: smm.loadCourseSync
    };
} else {*/
    //var smm = require("./build/main.js");
import * as smm from "./src/main";
    module.exports = {
        loadSave: smm.loadSave,
        loadSaveSync: smm.loadSaveSync,
        loadImage: smm.loadImage,
        loadCourse: smm.loadCourse,
        loadCourseSync: smm.loadCourseSync
    };
//}