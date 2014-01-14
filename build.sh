#!/bin/bash

opt_lessc="--yui-compress"

precache_files="konopas.min.js skin/skin.css skin/*.ttf"


do_lessc=true
do_js_min=true
do_precache=false

usage="usage: $0 [options]
  -c  DON'T use lessc to compile CSS
  -j  DON'T minify JavaScript
  -p  DO generate precache files: $precache_files"

while getopts "hcjp" OPT; do case $OPT in
	c) do_lessc=false;;
	j) do_js_min=false;;
	p) do_precache=true;;
	h) echo "$usage"; exit 0;;
	*) echo "$usage"; exit 1;;
esac; done

if $do_lessc; then
	echo -n "Compiling skin/*.less to skin/skin.css... "
	lessc $opt_lessc skin/main.less skin/skin.css
	if [ $? -ne 0 ]; then echo "lessc error!"; exit 1; fi
	echo "done."
fi

if $do_js_min; then
	echo -n "Minifying JS from src/ to konopas.min.js... "
	tmp=$(tempfile -p 'ko-')
	if [ $? -ne 0 ]; then echo "tempfile error!"; exit 1; fi
	cat src/{polyfill,server,stars,app}.js > "$tmp"
	curl -X POST -s --data-urlencode "input@$tmp" http://javascript-minifier.com/raw > konopas.min.js
	if [ $? -ne 0 ]; then echo "cURL error!"; rm "$tmp"; exit 1; fi
	rm "$tmp"
	echo "done."
fi

if $do_precache; then
	echo -n "Pre-caching files: "
	for f in $precache_files; do
		echo -n "$f... "
		gzip -c "$f" > "$f.gz"
		if [ $? -ne 0 ]; then echo "gzip error!"; exit 1; fi
	done
	echo "done."
fi

echo "All done."
exit 0
