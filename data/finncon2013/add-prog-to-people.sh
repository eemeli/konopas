#!/bin/bash

# in: people-plain.csv prog.csv
# out: people.csv

while read line; do
	name=$(echo "$line" | cut -d, -f2-3 | tr ',' ' ' | tr -d '"')
	prog=$(grep "$name" "$2" | cut -d, -f1 | tr '\n' ',' | sed 's/,$//')
	echo "$line,$prog"
done < "${1:-/proc/${$}/fd/0}"
