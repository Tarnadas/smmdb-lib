# cemu-smm

This is a module to simplify all kinds of tasks with Loadiine Super Mario Maker save files and respectively Cemu.
It uses Javascript's async/await keywords that are available from Node >= 7.6.

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
  
  // extract all tnl files to jpeg in their respective course folder
  save.exportJpeg();
  
  // convert tnl to jpeg
  let tnl = smm.loadImage("path/to/your/tnl/file");
  let jpeg = await tnl.toJpeg();
  fs.writeFileSync("path/to/newly/created/jpeg", jpeg);

  // convert jpeg to tnl
  jpeg = smm.loadImage("path/to/your/jpeg/file");
  tnl = await jpeg.fromJpeg();
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
})();
```

## License

MIT License
