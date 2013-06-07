#!/bin/bash

# in: prog.csv
# out: prog.csv

while read line; do
	echo "$line" | sed 's!2013/07/\(..,..:..\):00!2013-07-\1!'
done < "${1:-/proc/${$}/fd/0}"
