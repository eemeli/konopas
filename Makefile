LESSC = lessc --yui-compress
LESS_SRC = skin/main.less
CSS = skin/skin.css

MSGFORMAT = messageformat
LC ?= en
I18N_JS = i18n/i18n.$(LC).js

JS_FILES = src/polyfill.js $(I18N_JS) src/server.js src/stars.js src/app.js
JS_DEV = konopas.js
JS_MIN = konopas.min.js

PRECACHE_FILES = $(JS_MIN) $(CSS) $(wildcard skin/*.ttf)


dev: $(CSS) $(JS_DEV)
	@sed -i 's/<script src="$(JS_MIN)">/<script src="$(JS_DEV)">/' index.html

prod: $(CSS) $(JS_MIN)
	@sed -i 's/<script src="$(JS_DEV)">/<script src="$(JS_MIN)">/' index.html

watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) ko-css 'skin/*.less' -- make $(CSS)
	watchman -- trigger $(shell pwd) ko-lc 'i18n/*.json' -- make $(I18N_JS)
	watchman -- trigger $(shell pwd) ko-js '$(JS_FILES)' -- make $(JS_DEV)


$(CSS): $(wildcard skin/*.less)
	$(LESSC) $(LESS_SRC) $@


$(I18N_JS): i18n/$(LC).json
	cd i18n/ && $(MSGFORMAT) --locale $(LC) --include $(LC).json


$(JS_DEV): $(JS_FILES)
	cat $^ > $@

$(JS_MIN): $(JS_DEV)
	curl -X POST -s --data-urlencode "input@$^" http://javascript-minifier.com/raw > $@
	sed -i 's/\([^\w "]\)\(function\( \w\+\)\?(\)/\1\n\2/g' $@


precache: $(addsuffix .gz, $(PRECACHE_FILES)) ;

%.gz: %
	gzip -c $^ > $@


clean:
	rm -f $(JS_DEV) $(JS_MIN) $(addsuffix .gz, $(PRECACHE_FILES))

realclean: clean
	rm -f $(I18N_JS) $(CSS)


.PHONY: dev prod watch precache clean realclean
