#!/bin/bash

touch ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN"
wasm-pack build
wasm-pack pack
wasm-pack publish
npm unpublish cemu-smm@$(npx -c 'echo "$npm_package_version"')
npm dist-tag add cemu-smm@$(npx -c 'echo "$npm_package_version"') next
