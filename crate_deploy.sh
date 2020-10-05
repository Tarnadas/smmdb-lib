#!/bin/bash

if [[ $CRATE_VERSION_EXISTS == 1 ]]; then
    exit 0
fi

# Set package.json version
search='("version":[[:space:]]*").+(")'
replace="\1${LIB_VERSION}\2"
sed -E "s/${search}/${replace}/g" package.json > package.tmp.json
mv package.tmp.json package.json

# Crates.io login
echo "[registry]" >> ~/.cargo/credentials
echo "token = \"$CARGO_CREDENTIALS\"" >> ~/.cargo/credentials

# Crates.io publish
cargo publish --no-verify
