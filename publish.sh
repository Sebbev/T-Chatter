#!/bin/sh

if [ -z "$GH_TOKEN" ]; then
    echo "You must set the GH_TOKEN environment variable."
    read
    exit 1
fi

# This will build, package and upload the app to GitHub.
./build.sh
cd ./main
npm run publish