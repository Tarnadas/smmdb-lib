#!/bin/bash

if [[ $CRATE_VERSION_EXISTS == 0 ]]; then
    exit 0
fi

# Set package.json version
search='("version":[[:space:]]*").+(")'
replace="\1${LIB_VERSION}\2"
sed -E "s/${search}/${replace}/g" package.json > package.tmp.json
mv package.tmp.json package.json

# Crates.io login
touch ~/.npmrc
echo "[registry]" >> ~/.cargo/credentials
echo "token = \"$CARGO_CREDENTIALS\"" >> ~/.cargo/credentials

# Crates.io publish
cargo publish
