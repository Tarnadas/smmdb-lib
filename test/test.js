const smm   = require("../lib");
const smmdb = require("smm-api");
const tmp   = require("tmp");
const request = require("request-promise");
const zlib = require("zlib");

const http  = require("http");
const fs    = require("fs");
const path  = require("path");

const Course = require("../lib/Course");

(async () => {

  let save = await smm.loadSave("C:/Users/Public/Games/Cemu/cemu_1.7.4/mlc01/emulatorSave/44fc5929");
  const courses = await save.loadCourses()
  const course = courses.course002
  fs.writeFileSync(path.join(__dirname, 'course3ds'), await course.to3DS())
  //let save = smm.loadSaveSync("C:/Users/Public/Games/Cemu/cemu_1.7.4/mlc01/emulatorSave/44fc5929");
  //let save = await smm.loadSave("C:/Users/Public/Games/Cemu/cemu_1.6.4/mlc01/emulatorSave/1358e99f");

  //save.reorderSync();
  //await save.reorder();

  //let course = await smm.loadCourse(path.join(__dirname, 'courseconverted'), 0, false);
  //course = await smm.deserialize(await course.serialize());
  //await course.writeToSave(0, path.join(__dirname, 'coursetest'));
  //fs.writeFileSync(path.join(__dirname, 'courseconverted'), await course.to3DS());

  let benchmark = async () => {
    let res = await new Promise(resolve => {
      smmdb.search({ ispackage: 1 }, res => {
        resolve(res);
      })
    });
    res = JSON.parse(res);
    fs.mkdirSync(path.join(__dirname, 'coursetest'));
    for (let i in res.courses) {
      console.log(res.courses[i].title);
      let tmpFile = path.join(__dirname, `coursetest/${res.courses[i].title}.course`);
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      await new Promise(async (resolve, reject) => {
        let stream = fs.createWriteStream(tmpFile);
        const req = request({
          method: 'GET',
          uri: "http://smmdb.ddns.net/courses/" + res.courses[i].id
        });
        req.pipe(stream);
        req.on('end', async () => {
          resolve();
        });
      });
      let courses = await smm.decompress(tmpFile);
      let data = Buffer.alloc(0);
      for (let i = 0; i < courses.length; i++) {
        data = Buffer.concat([data, await courses[i].serializeGzipped()]);
      }
      fs.writeFileSync(path.join(__dirname, `coursetest/${res.courses[i].title}.ser`), data);
    }
  };
  //fs.writeFileSync(`${__dirname}/course001s.json`, JSON.stringify(deserialized, null, 2));
  //fs.writeFileSync(`${__dirname}/course_data.cdt`, deserialized.test());

  //save.loadCourseElements(); // for whole save folder
  //courses["course001"].loadElements(); // for single course
  //fs.writeFileSync(`${__dirname}/course001.json`, JSON.stringify(courses["course001"].getElements(), null, 2));
  //courses["course001"].writeCrc();

  // internally done by reorder()
  //save.writeCrc(); // writes crc checksum to 'save.dat'


  /*let jpeg = smm.loadImage(`${__dirname}/4k_test.png`);

  // default conversion
  let tnl = await jpeg.toTnl();
  fs.writeFileSync(`${__dirname}/4k_test.tnl`, tnl);

  // to 4:3
  //jpeg = smm.loadImage(`${__dirname}/4k_test.png`);
  let tnl_43 = await jpeg.toTnl(false);
  fs.writeFileSync(`${__dirname}/4k_test_43.tnl`, tnl_43);
  let jpeg_43 = await new (require('../lib/tnl').Tnl)(tnl_43).toJpeg();
  fs.writeFileSync(`${__dirname}/4k_test_43.jpg`, jpeg_43);

  // to wide
  //jpeg = smm.loadImage(`${__dirname}/4k_test.png`);
  let tnl_wide = await jpeg.toTnl(true);
  fs.writeFileSync(`${__dirname}/4k_test_wide.tnl`, tnl_wide);
  let jpeg_wide = await new (require('../lib/tnl').Tnl)(tnl_wide).toJpeg();
  fs.writeFileSync(`${__dirname}/4k_test_wide.jpg`, jpeg_wide);*/

})();