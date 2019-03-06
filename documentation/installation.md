# Installation

## Node.js

Visit the [Node.js website](https://nodejs.org/) and download the proper installer for your OS. Make sure you at least installed Node 7.6.

If you are on Windows 64Bit click [here](https://nodejs.org/dist/latest-v7.x/node-v7.9.0-x64.msi) to grab the latest Node 7.x.

If you want a list of all available downloads click [here](https://nodejs.org/dist/)

Make sure that "Add to PATH" is enabled in the installer (It is enabled by default). If you don't use an installer, e.g. a zip-compressed folder, you have to add Node to your environment variables yourself.

## cemu-smm

Create a new folder which will contain everything you need. Name it whatever you want.

Go inside that folder and press Right Shift + Right Mouse. Select "open command prompt here".

### Option 1
Type ```npm install cemu-smm```. All required modules will be installed. If you are no developer, this is the way to go.

If there is an update available, just type it again.

### Option 2
Type ```npm init```. You will be prompted to insert a few strings or you can just press Enter to use the default values. A ```package.json``` file should now be in your folder. This file contains a few things about your own npm package. It also keeps track of your dependencies.

Type ```npm install --save cemu-smm```. All required modules will be installed and ```cemu-smm``` will be added as a dependency to your ```package.json```.

If there is an update available for any of your packages, you can now simply type ```npm update```.