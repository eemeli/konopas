#!/bin/bash

while read line; do
	d="2013-07"
	case ${line:0:2} in
		PE) d="$d-05" ;;
		LA) d="$d-06" ;;
		SU) d="$d-07" ;;
	esac

	let n=${line:3}
	let m=-60*n

	echo "$d	${line:3:2}:00	$m"
done < "${1:-/proc/${$}/fd/0}"
