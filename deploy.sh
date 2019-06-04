#!/bin/bash

yarn pack
yarn publish
npm dist-tag add cemu-smm@$(npx -c 'echo "$npm_package_version"') next
