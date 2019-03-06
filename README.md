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
    
  /**
   * save manipulation
   */
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  // reorder our course folders to match actual ingame appearance
  await save.reorder();
  
  // recalculate crc checksum and write to 'save.dat'
  // this always has to be done when changing bytes, e.g. in a Hex Editor
  // internally done by reorder(), so unnecessary right here
  await save.writeCrc();
  
  // import all JPEG files and create TNL files in their respective course folder
  await save.importThumbnail();
  
  // extract all TNL files to JPEG in their respective course folder
  await save.exportThumbnail();
  
  
  
  /**
   * course manipulation
   */
  let courses = await save.loadCourses();
  let course = courses.course000;
  await course.setTitle("New Awesome Title");
  await course.setMaker("New Awesome Maker");
  await course.setThumbnail("path/to/image");
  // write to fs / save course
  course.writeToSave();
  
  // serialization
  let serialized = await course.serialize();
  // or gzip + serialize
  //let serialized = await course.serializeGzipped();
  // send serialized data to server
  await require("request-promise").post({
    url: "http://url.of.server",
    formData: {
      course: serialized
    }
  });
  
  // deserialization
  let response = await require("request-promise")("http://url.of.server/?query-string-to-receive-course-file");
  let deserialized = await smm.deserialize(response);
  // we could for example add the deserialized course to our save
  await save.addCourse(deserialized);
  
  
  
  /**
   * image manipulation
   */
  let tnl = smm.loadImage("path/to/your/tnl/file");
  let jpeg = await tnl.toJpeg();
  fs.writeFileSync("path/to/newly/created/jpeg", jpeg);
  
  // convert jpeg to tnl
  jpeg = smm.loadImage("path/to/your/jpeg/file");
  
  // default conversion
  tnl = await jpeg.toTnl();
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
    
  // to wide
  tnl = await jpeg.toTnl(true);
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
    
  // to 4:3
  tnl = await jpeg.toTnl(false);
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
  
})();
```

## Tutorials

[Installation](documentation/installation.md)

[Basic Usage](documentation/basic_usage.md)

[Save Manipulation](documentation/save_manipulation.md)

[Course Manipulation](documentation/course_manipulation.md)

[Thumbnail Manipulation](documentation/thumbnail_manipulation.md)

[Serialization](documentation/serialization.md)

## Documentation

[Course File Structure](documentation/course_file.md)

## License

MIT License
Copyright (c) 2017 Mario Reder

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
