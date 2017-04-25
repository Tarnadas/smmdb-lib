#Save manipulation

It is possible to modify any bytes from your save file. Inside the first 16 bytes of any file is a CRC checksum from the rest of the file.

After changing any bytes, the CRC checksum must be recalculated or CEMU will crash, when it tries to load it.

```js
let smm = require("cemu-smm");
  
(async () => {
    
  // let us load our SMM save file
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  // this will recalculate the CRC checksum of our save file
  save.writeCrc()
  
})();
```

## Reordering course folders

If you have ever wondered why course000 folder does not correspond to the very first course in game, this is because how the game handles drag and dropping files in your course bot.

To reorder all your course folders for making imports of custom courses that you have downloaded easier, you simply have to call ```save.reorder()```

## Exporting course info from save file

Reading and potentially manipulating course save files is just at the beginning, but it is already possible to read various data.


```js
let smm = require("cemu-smm");
let fs  = require("fs");
  
(async () => {
    
  // let us load our SMM save file
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  let courses = await save.loadCourses();
  
  // either print data in console
  //console.log(JSON.stringify(courses, null, 2));
  // or write to file
  fs.writeFileSync(`${__dirname}/courses.json`, JSON.stringify(courses, null, 2));
  
})();
```