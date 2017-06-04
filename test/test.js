const smm  = require("../lib");
const fs   = require("fs");
const path = require("path");

(async () => {

    let save = await smm.loadSave("C:/Users/Public/Games/Cemu/cemu_1.7.4/mlc01/emulatorSave/44fc5929");
    //let save = smm.loadSaveSync("C:/Users/Public/Games/Cemu/cemu_1.7.4/mlc01/emulatorSave/44fc5929");
    //let save = await smm.loadSave("C:/Users/Public/Games/Cemu/cemu_1.6.4/mlc01/emulatorSave/1358e99f");

    //save.reorderSync();
    //await save.reorder();

    save.loadCoursesSync();
    //save.exportJpeg();
    await save.importThumbnail();
    await save.exportThumbnail();
    //await save.unlockAmiibos();

    //console.log(save.courses);
    let course = save.courses.course001;
    let serialized = await course.serialize();
    let deserialized = smm.deserialize(serialized);
    //console.log(deserialized);
    //console.log(course);
    //console.log(Object.is(JSON.parse(JSON.stringify(course)), JSON.parse(JSON.stringify(deserialized))));
    //console.log(await course.serializeGzipped());
    //console.log(JSON.stringify(course).length);
    //fs.writeFileSync(`${__dirname}/course001.json`, JSON.stringify(course, null, 2));
    //fs.writeFileSync(`${__dirname}/course001s.json`, JSON.stringify(deserialized, null, 2));

    //save.loadCourseElements(); // for whole save folder
    //courses["course001"].loadElements(); // for single course
    //fs.writeFileSync(`${__dirname}/course001.json`, JSON.stringify(courses["course001"].getElements(), null, 2));
    //courses["course001"].writeCrc();

    // internally done by reorder()
    //save.writeCrc(); // writes crc checksum to 'save.dat'


    /*let jpeg = smm.loadImage(`${__dirname}/4k_test.png`);

    // default conversion
    let tnl = await jpeg.fromJpeg();
    fs.writeFileSync(`${__dirname}/4k_test.tnl`, tnl);

    // to wide
    let tnl_wide = await jpeg.fromJpeg(true);
    fs.writeFileSync(`${__dirname}/4k_test_wide.tnl`, tnl_wide);

    // to 4:3
    let tnl_43 = await jpeg.fromJpeg(false);
    fs.writeFileSync(`${__dirname}/4k_test_43.tnl`, tnl_43);*/

})();