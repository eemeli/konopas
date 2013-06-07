#!/bin/bash

# in: people.csv prog-plain.csv
# out: prog.csv

out=$(mktemp)
cp "$2" "$out"

while read line; do
	id=$(echo "$line" | cut -d, -f1)
	name=$(echo "$line" | cut -d, -f2-3 | tr ',' ' ' | tr -d '"')
	sed -i "s/,,\"$name/,$id,\"$name/" "$out"
done < "${1:-/proc/${$}/fd/0}"

cat "$out"
rm "$out"
