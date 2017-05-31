# cemu-smm

This is a module to simplify all kinds of tasks with Loadiine Super Mario Maker save files and respectively Cemu.
It uses Promises and implements most (if not all) functions as synchronous version.

## Installation

With [npm](https://www.npmjs.org/package/cemu-smm):

```bash
$ npm install --save cemu-smm
```

## API

Please refer to the full [API Documentation](documentation/api.md)

## Code Example

```js
const smm = require("cemu-smm");
const fs  = require("fs");
  
(async () => {
  // let us load our SMM save file
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  // reorder our course folders to match actual ingame appearance
  save.reorder();
  
  // recalculate crc checksum and write to 'save.dat'
  // this always has to be done when changing bytes, e.g. in a Hex Editor
  // internally done by reorder(), so unnecessary right here
  await save.writeCrc();
  
  // import all jpg files and create tnl files in their respective course folder
  save.importJpeg();
  
  // extract all tnl files to jpeg in their respective course folder
  save.exportJpeg();
  
  // load course folders inside save folder and write result to file in readable format
  let courses = await save.loadCourses();
  fs.writeFileSync(`${__dirname}/courses.json`, JSON.stringify(courses, null, 2));
  
  // load course block data and write result to file in readable format
  //save.loadCourseElements(); // load whole save folder
  fs.writeFileSync(`${__dirname}/course001.json`, JSON.stringify(courses["course001"].getElements(), null, 2));
  
  // convert tnl to jpeg
  let tnl = smm.loadImage("path/to/your/tnl/file");
  let jpeg = await tnl.toJpeg();
  fs.writeFileSync("path/to/newly/created/jpeg", jpeg);
  
  // convert jpeg to tnl
  jpeg = smm.loadImage("path/to/your/jpeg/file");
  
  // default conversion
  tnl = await jpeg.fromJpeg();
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
    
  // to wide
  tnl = await jpeg.fromJpeg(true);
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
    
  // to 4:3
  tnl = await jpeg.fromJpeg(false);
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
  
})();
```

## Tutorials

[Installation](tutorial/installation.md)

[Basic Usage](tutorial/basic_usage.md)

[Save Manipulation](tutorial/save_manipulation.md)

[Course Manipulation](tutorial/course_manipulation.md)

[Thumbnail Manipulation](tutorial/thumbnail_manipulation.md)

## Documentation

[Course File Structure](documentation/course_file.md)

## License

MIT License
Copyright (c) 2017 Mario Reder

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
