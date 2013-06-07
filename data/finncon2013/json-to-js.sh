#!/bin/bash

# in: file.json
# out: file.js

n=$(echo "$1" | sed 's/\..*//')
echo -n "var $n = "
cat "$1"
echo ';'
