#!/bin/bash

command -v wasm-pack >/dev/null 2>&1 || {
    git clone https://github.com/Tarnadas/wasm-pack.git
    cd wasm-pack
    cargo install --path .
}
