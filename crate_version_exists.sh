#!/bin/bash

{
    args=("$@")
    LIB_VERSION=${args[0]}

    VERSIONS=$(cargo whatfeatures -l smmdb)

    VERION_EXISTS=false

    while IFS='\n' read -ra VERSION; do
        for V in "${VERSION[@]}"; do
            if [ "$(echo smmdb = ${LIB_VERSION})" = "$V" ]; then
                VERION_EXISTS=true
                break
            fi
        done
    done <<< "$VERSIONS"
} >/dev/null 2>&1

echo $VERION_EXISTS
