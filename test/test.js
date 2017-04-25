let smm  = require("../index");
let fs   = require("fs");
let path = require("path");

(async () => {

    let save = await smm.loadSave("C:/Users/Public/Games/Cemu/cemu_1.6.4/mlc01/emulatorSave/1358e99f");

    await save.reorder();

    await save.importJpeg();
    await save.exportJpeg();

    let courses = await save.loadCourses();

    //console.log(JSON.stringify(courses));
    // or write to file
    fs.writeFileSync(`${__dirname}/courses.json`, JSON.stringify(courses, null, 2));

    // internally done by reorder()
    save.writeCrc(); // writes crc checksum to 'save.dat'

    let jpeg = smm.loadImage(`${__dirname}/4k_test.jpg`);

    // default conversion
    let tnl = await jpeg.fromJpeg();
    fs.writeFileSync(`${__dirname}/4k_test.tnl`, tnl);

    // to wide
    let tnl_wide = await jpeg.fromJpeg(true);
    fs.writeFileSync(`${__dirname}/4k_test_wide.tnl`, tnl_wide);

    // to 4:3
    let tnl_43 = await jpeg.fromJpeg(false);
    fs.writeFileSync(`${__dirname}/4k_test_43.tnl`, tnl_43);

})();