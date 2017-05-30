# Serialization

Serialization complies to [smm-protobuf](https://github.com/Tarnadas/smm-protobuf)

```js
const smm = require("cemu-smm");
const fs  = require("fs");
  
(async () => {
    
  // let us load our SMM save file
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  let courses = await save.loadCourses();
  
  // serialization
  let serialized = courses.course000.serialize();
  // or get a gzipped serialized object
  //let serialized = courses.course000.serializeGzipped();
  
  // deserialization
  let deserialized = smm.deserialize(serialized);
  // courses.course000 === deserialized yields true
  
})();
```