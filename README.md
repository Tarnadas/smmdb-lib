# cemu-smm

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
  let save = await smm.loadSave("path/to/your/cemu/save");
  save.writeCrc(); // writes crc checksum to 'save.dat'

  let tnl = smm.tnl("path/to/your/tnl-or-jpeg-file");
  let jpeg = await tnl.toJpeg();
  fs.writeFileSync("path/to/newly/created/jpeg", jpeg);
})();
```

## Motivation

To be written

## License

MIT License
