# Thumbnail manipulation

## TNL to JPEG

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

## JPEG to TNL

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

## JPEG mass export

To convert all tnl files inside your save to jpeg, call
```js
save.exportJpeg();
```
Navigate to your save folder and find jpeg files inside course folders.

## JPEG mass import

To convert all jpeg files inside your save to tnl, call
```js
save.importJpeg();
```
Files inside course folders must be named ```thumbnail0.jpg``` or ```thumbnail1.jpg```.