# Basic Usage

Go inside your folder where you just installed ```cemu-smm``` and create a new file. Name it ```something.js```. Open it with a text editor of your choice.

Paste this inside your file:

```js
let smm = require("cemu-smm");
  
(async () => {
    
    // here goes your script
    
})();
```

You are now ready to use ```cemu-smm```. Just type your script near the commented line.

To run your script, open a command prompt in your folder by Right Shift + Right Click and selecting "open command prompt here" and type ```node something.js```.

If you jave to write a path to any file, never use single backslash (Windows-like). Always use normal slash or double backslash.

### (Optional) Explanation

#### What is the meaning of that async line?

```cemu-smm``` uses a lot of asynchronous tasks that cannot be run in global namespace.
This line represents a self-executing asynchronous function, which lets you use ```await``` keyword inside.