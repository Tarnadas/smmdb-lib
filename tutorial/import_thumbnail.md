# Importing thumbnails

There are two ways of importing thumbnail. You can either convert any jpeg file to tnl file one by one or you take your SMM save and import all jpeg files which are inside course folders.

Please refer to [Basic Usage](https://github.com/Tarnadas/cemu-smm/blob/master/tutorial/basic_usage.md), if you have any problems executing your script.

## 1. Convert a single jpeg file to tnl file


```js
let smm = require("cemu-smm");
let fs  = require("fs");
  
(async () => {
  
  // load an image
  let jpeg = smm.loadImage("path/to/your/jpeg/file");
  
  // default conversion
  let tnl = await jpeg.fromJpeg();
  
  // store as new file
  fs.writeFileSync("path/to/newly/created/tnl", tnl);
  
})();
```

The function call has several parameters:
```js
await jpeg.fromJpeg([isWide, [doCrop = false]]);
```
If ```isWide === true```, thumbnail0 will be created, otherwise thumbnail1.

If ```isWide === null```, the algorithm tries to guess the correct aspect ratio.

If ```doCrop === false```, parts of the image may be letter boxed.

If ```doCrop === false```, parts of the image may be cropped.

Images will automatically be resized to fit Super Mario Maker standards. You can even convert 4k images. If the file is still too big after rescaling, the quality of the JPEG will be shrinked.

## 2. Convert all jpegs inside course folders

Go inside your SMM save folder and find the course folder where you want to add a custom thumbnail.

Inside that folder insert your jpeg file and name it either ```thumbnail0.jpg``` to convert to wide screen (the one at the bottom when previewing a course) or ```thumbnail1.jpg``` to convert to 4:3 thumbnail (the one at the left when previewing a course).

Your course folder should look like this:
![Alt text](https://raw.githubusercontent.com/Tarnadas/cemu-smm/master/tutorial/course_folder.jpg)

Repeat the above steps with any course you wish.

Inside your script type this:


```js
let smm = require("cemu-smm");
  
(async () => {
    
  // let us load our SMM save file
  let save = await smm.loadSave("path/to/your/cemu/save/mlc01/emulatorSave/updateID");
  
  // reorder our course folders to match actual ingame appearance
  // this is optional
  //save.reorder();
  
  // import all jpg files and create tnl files in their respective course folder
  save.importJpeg();
  
})();
```