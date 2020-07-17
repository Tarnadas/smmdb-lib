#!/bin/bash

if [[ $NPM_VERSION_EXISTS == 0 ]]; then
    exit 0
fi

# Set package.json version
search='("version":[[:space:]]*").+(")'
replace="\1${LIB_VERSION}\2"
sed -E "s/${search}/${replace}/g" package.json > package.tmp.json
mv package.tmp.json package.json

# NPM login
touch ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc

# NPM build and publish
wasm-pack build -- --features wasm
wasm-pack pack
wasm-pack publish
