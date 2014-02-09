#!/bin/sh

lessc_cmd="lessc"
lessc_opt="--yui-compress"
lessc_src="skin/main.less"
lessc_tgt="skin/skin.css"

i18n_cmd="messageformat"
i18n_dir="i18n"
i18n_tgt="src/i18n.js"

js_src_files="src/polyfill.js src/i18n.js src/server.js src/stars.js src/app.js"
js_tgt="konopas.min.js"

precache_files="$js_tgt $lessc_tgt skin/*.ttf"


do_lessc=false
do_i18n=false
do_js_min=false
do_precache=false

usage="usage: $0 [options]
  -c     use lessc to compile $lessc_src to $lessc_tgt
  -l XX  generate $i18n_tgt from language file $i18n/XX.json
  -j     minify JavaScript from src/ to $js_tgt
  -p     generate precache files: $precache_files
  -h     display this helpful text and exit"

while getopts "hcl:jp" OPT; do case $OPT in
	c) do_lessc=true;;
	l) do_i18n=true; i18n_lc=$OPTARG;;
	j) do_js_min=true;;
	p) do_precache=true;;
	h) echo "$usage"; exit 0;;
	*) echo "$usage"; exit 1;;
esac; done

done=false

if $do_lessc; then
	echo -n "Compiling $lessc_src to $lessc_tgt... "
	$lessc_cmd $lessc_opt "$lessc_src" "$lessc_tgt"
	if [ $? -ne 0 ]; then echo "lessc error!"; exit 1; fi
	echo "ok."; done=true
fi

if $do_i18n; then
	i18n_src="$i18n_dir/$i18n_lc".json
	echo -n "Compiling "$i18n_dir/$i18n_lc".json to $i18n_tgt... "
	$i18n_cmd --locale $i18n_lc --include "$i18n_lc".json "$i18n_dir" "$i18n_tgt"
	if [ $? -ne 0 ]; then echo "$i18n_cmd error!"; exit 1; fi
	echo "ok."; done=true
fi

if $do_js_min; then
	echo -n "Minifying JS from src/ to $js_tgt... "
	tmp=$(tempfile -p 'ko-')
	if [ $? -ne 0 ]; then echo "tempfile error!"; exit 1; fi
	cat $js_src_files > "$tmp"
	if [ $? -ne 0 ]; then echo "cat error!"; exit 1; fi
	curl -X POST -s --data-urlencode "input@$tmp" http://javascript-minifier.com/raw > "$js_tgt"
	if [ $? -ne 0 ]; then echo "cURL error!"; rm "$tmp"; exit 1; fi
	rm "$tmp"
	echo "ok."; done=true
fi

if $do_precache; then
	echo "Pre-caching files:"
	for f in $precache_files; do
		echo "  $f..."
		gzip -c "$f" > "$f.gz"
		if [ $? -ne 0 ]; then echo "gzip error!"; exit 1; fi
	done
	echo "  ok."; done=true
fi

if $done; then echo "All done."
else echo "$usage"; fi

exit 0
