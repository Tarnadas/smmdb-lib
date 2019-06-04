#!/bin/bash

yarn pack
wasm-pack publish
npm dist-tag add cemu-smm@$(npx -c 'echo "$npm_package_version"') next
