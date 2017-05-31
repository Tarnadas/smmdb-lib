# Course manipulation

It is possible to modify any bytes from your course files. Inside the first 16 bytes of any file is a CRC checksum from the rest of the file.

After changing any bytes, the CRC checksum must be recalculated or Cemu will crash, when it tries to load it.

```js
const smm = require("cemu-smm");
  
(async () => {
    
  // let us load our SMM save file and courses
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  let courses = await save.loadCourses();
  
  // this will recalculate the CRC checksum of a course file
  let course = courses.course000;
  await course.writeCrc();
  
})();
```

## Set title and maker

You can change course title and maker name of any course.

```js
const smm = require("cemu-smm");
  
(async () => {
    
  // let us load our SMM save file and courses
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  let courses = await save.loadCourses();
  
  // set a new title and maker
  let course = courses.course000;
  await course.setTitle('New Awesome Title');
  await course.setMaker('New Awesome Maker');
  
  // write to fs
  course.writeToSave();
  
})();