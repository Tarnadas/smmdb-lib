#!/bin/bash

# Set package.json version
search='("version":[[:space:]]*").+(")'
replace="\1${LIB_VERSION}\2"
sed -E "s/${search}/${replace}/g" package.json > package.tmp.json
mv package.tmp.json package.json

# NPM login
touch ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN"

# NPM build and publish
wasm-pack build -- --features wasm
wasm-pack pack
wasm-pack publish
