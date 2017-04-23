# cemu-smm

This is a module to simplify all kinds of tasks with Loadiine Super Mario Maker save files and respectively Cemu.

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
  // let us load our SMM save file to do cool stuff
  let save = await smm.loadSave("path/to/your/cemu/save");
  save.writeCrc(); // writes crc checksum to 'save.dat'

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
