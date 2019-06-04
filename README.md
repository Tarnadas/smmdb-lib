# cemu-smm

A utility library for Super Mario Maker and possibly Super Mario Maker 2 in the future to read and manipulate game files.

The library is written in Rust and compiles to WebAssembly for the web or can be used as a standard Rust Crate.

This library is used by my website [SMMDB](https://smmdb.ddns.net), which is the only platform, where you can share Super Mario Maker courses platform independently.
This is particularly useful for emulation and the 3DS, which is unable to download specific course files from the Nintendo servers.
Courses are serialized via Protocol Buffer.

## Installation

### Web

With [npm](https://www.npmjs.org/package/cemu-smm):

```bash
$ npm install cemu-smm
```

### Rust

With [cargo-edit](https://github.com/killercup/cargo-edit)

```bash
$ cargo add cemu-smm
```

or via `Cargo.toml`

```toml
[dependencies]
cemu-smm = "4"
```

## API

The library version 4 is still in beta and is going through a complete rewrite in Rust and therefor the API is subject to change.

The last version which is compatible with Node can be found [here](https://www.npmjs.com/package/cemu-smm/v/3.0.3).

## Documentation

[Course File Structure](documentation/course_file.md)

## License

MIT License
Copyright (c) 2017-2019 Mario Reder

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
