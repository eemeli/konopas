LESSC = lessc --clean-css
LESS_SRC = skin/main.less
CSS = skin/skin.css

MSGFORMAT = messageformat
LC ?= en
comma := ,
LC_SEP = $(subst $(comma), ,$(LC))
LC_GLOB = $(if $(findstring $(comma),$(LC)),{$(LC)},$(LC))
I18N_JS = i18n/$(LC).js
I18N_JSON = $(addprefix i18n/,$(addsuffix .json,$(LC_SEP)))

JS_FILES = src/polyfill.js $(I18N_JS) src/util.js src/server.js src/stars.js src/item.js src/prog.js src/part.js src/info.js src/app.js
JS_PREFACE = src/preface.js
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


$(I18N_JS): $(I18N_JSON)
	$(MSGFORMAT) --locale $(LC) --include '$(LC_GLOB).json' i18n/ $@


$(JS_DEV): $(JS_FILES)
	echo '\n"use strict";\n' | cat $(JS_PREFACE) - $^ > $@

$(JS_MIN): $(JS_DEV)
	curl -X POST -s --data-urlencode "input@$^" http://javascript-minifier.com/raw \
	| sed 's/\([^,;:?+(){}\/]*[^\w ",;{}]\)\(function\( \w\+\)\?(\)/\n\1\2/g' \
	| cat $(JS_PREFACE) - \
	> $@

precache: $(addsuffix .gz, $(PRECACHE_FILES)) ;

%.gz: %
	gzip -c $^ > $@


clean:
	rm -f $(JS_DEV) $(JS_MIN) $(addsuffix .gz, $(PRECACHE_FILES))

realclean: clean
	rm -f i18n/*.js $(CSS)


.PHONY: dev prod watch precache clean realclean
