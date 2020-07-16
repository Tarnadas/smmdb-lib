#!/bin/bash

{
    args=("$@")
    LIB_VERSION=${args[0]}

    VERSIONS=$(npm view smmdb versions)

    VERION_EXISTS=0

    while IFS=',' read -ra VERSION; do
        for V in "${VERSION[@]}"; do
            if [ "$(echo \'${LIB_VERSION}\')" == $V ]; then
                VERION_EXISTS=1
                break
            fi
        done
    done <<< "$VERSIONS"
} >/dev/null 2>&1

echo $VERION_EXISTS

