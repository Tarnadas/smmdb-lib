# Serialization

Serialization complies to [smm-protobuf](https://github.com/Tarnadas/smm-protobuf)

```js
const smm = require("cemu-smm");
const rp  = require("request-promise");
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
  let response = await rp("http://some-server-that-sends-serialized-courses.com");
  let deserializedCourse = await smm.deserialize(response);
  // we could for example add the deserialized course to our save
  await save.addCourse(deserializedCourse);
  
})();
```