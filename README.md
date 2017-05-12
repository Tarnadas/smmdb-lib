# cemu-smm

This is a module to simplify all kinds of tasks with Loadiine Super Mario Maker save files and respectively Cemu.
It uses Promises and implements most (if not all) functions as synchronous version.

## Installation

With [npm](https://www.npmjs.org/package/cemu-smm):

```bash
$ npm install --save cemu-smm
```

## Code Example

```js
let smm = require("cemu-smm");
let fs  = require("fs");
  
(async () => {
  // let us load our SMM save file
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  // reorder our course folders to match actual ingame appearance
  save.reorder();
  
  // recalculate crc checksum and write to 'save.dat'
  // this always has to be done when changing bytes, e.g. in a Hex Editor
  // internally done by reorder(), so unnecessary right here
  save.writeCrc();
  
  // import all jpg files and create tnl files in their respective course folder
  save.importJpeg();
  
  // extract all tnl files to jpeg in their respective course folder
  save.exportJpeg();
  
  // load course folders inside save folder and write result to file in readable format
  let courses = await save.loadCourses();
  fs.writeFileSync(`${__dirname}/courses.json`, JSON.stringify(courses, null, 2));
  
  // load course block data and write result to file in readable format
  //save.loadCourseElements(); // load whole save folder
  courses["course001"].loadElements(); // or load single course
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

## API

### Reorder

Load your save
```js
let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
```

When calling
```js
save.reorder();
```

![Alt text](https://raw.githubusercontent.com/Tarnadas/cemu-smm/master/test/reorder_before.jpg)

becomes

![Alt text](https://raw.githubusercontent.com/Tarnadas/cemu-smm/master/test/reorder_after.jpg)

### TNL to JPEG

Load an image with
```js
let tnl = smm.loadImage("path/to/your/tnl/file");
```
Do the conversion with
```js
let jpeg = await tnl.toJpeg();
```
Save your file
```js
fs.writeFileSync("path/to/newly/created/jpeg", jpeg);
```

### JPEG to TNL

Load an image with
```js
let jpeg = smm.loadImage("path/to/your/jpeg/file");
```
Do the conversion with
```js
let tnl = await jpeg.fromJpeg([isWide, [doCrop = false]]);
```
If ```isWide === true```, thumbnail0 will be created, otherwise thumbnail1.

If ```isWide === null```, the algorithm tries to guess the correct aspect ratio.

If ```doCrop === false```, parts of the image may be letter boxed.

If ```doCrop === false```, parts of the image may be cropped.

Images will automatically be resized to fit Super Mario Maker standards. You can even convert 4k images. If the file is still too big after rescaling, the quality of the JPEG will be shrinked.

Save your file
```js
fs.writeFileSync("path/to/newly/created/jpeg", tnl);
```

### JPEG mass export

To convert all tnl files inside your save to jpeg, call
```js
save.exportJpeg();
```
Navigate to your save folder and find jpeg files inside course folders.

### JPEG mass import

To convert all jpeg files inside your save to tnl, call
```js
save.importJpeg();
```
Files inside course folders must be named ```thumbnail0.jpg``` or ```thumbnail1.jpg````.

Refer to [this](https://github.com/Tarnadas/cemu-smm/blob/master//tutorial/import_thumbnail.md) tutorial.

## License

MIT License
Copyright (c) 2017 Mario Reder

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
