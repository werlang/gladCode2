#!/bin/bash

set -e

version=$1
link=$2

public_path="/home/gladcode/public_html"
repo_path="/home/gccdn"

export HOME=$repo_path

\cp -f $public_path/script/*.js $repo_path/js/
\cp -f $public_path/css/*.css $repo_path/css/

cd $repo_path

git add -A 
git commit -a -m "version $version"
git tag -a v$version -m "Patch notes: $link"
git push https://werlang:s0r3tmhr@github.com/werlang/gladcode-cdn.git v$version

# git rev-parse --short HEAD


