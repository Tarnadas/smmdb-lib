#!/bin/bash

touch ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN"
wasm-pack build -- --features wasm
wasm-pack pack
wasm-pack publish
