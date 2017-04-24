let smm = require("./index");
let fs  = require("fs");

(async () => {

    let save = await smm.loadSave("C:/Users/Public/Games/Cemu/cemu_1.6.4/mlc01/emulatorSave/1358e99f");

    save.reorder();

    // internally done by reorder()
    //save.writeCrc(); // writes crc checksum to 'save.dat'

})();