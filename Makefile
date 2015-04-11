BIN = ./node_modules/.bin

LC ?= en
comma := ,
LC_SEP = $(subst $(comma), ,$(LC))
LC_GLOB = $(if $(findstring $(comma),$(LC)),{$(LC)},$(LC))
I18N_JSON = $(addprefix i18n/,$(addsuffix .json,$(LC_SEP)))

JS_FILES = src/polyfill.js i18n/$(LC).js src/util.js src/server.js src/stars.js src/item.js src/prog.js src/part.js src/info.js src/app.js

PRECACHE_FILES = konopas.min.js skin/skin.css $(wildcard skin/*.ttf)
PRECACHE_FILES_GZ = $(addsuffix .gz, $(PRECACHE_FILES))


dev: skin/skin.css konopas.js
	@sed -i 's/<script src="konopas.min.js">/<script src="konopas.js">/' index.html

prod: skin/skin.css konopas.min.js
	@sed -i 's/<script src="konopas.js">/<script src="konopas.min.js">/' index.html


skin/skin.css: skin/*.less
	$(BIN)/lessc skin/main.less $@


i18n/$(LC).js: $(I18N_JSON)
	$(BIN)/messageformat --locale $(LC) --include '$(LC_GLOB).json' i18n/ $@


konopas.js: $(JS_FILES)
	cat src/preface.js $^ > $@

%.min.js: %.js src/preface.js
	$(BIN)/uglifyjs $< --compress --mangle \
	| sed 's/\([^,;:?+(){}\/]*[^\w ",;{}]\)\(function\( \w\+\)\?(\)/\n\1\2/g' \
	| cat src/preface.js - \
	> $@


precache: $(PRECACHE_FILES_GZ)
%.gz: % ; gzip -c $^ > $@


watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) ko-css 'skin/*.less' -- make skin/skin.css
	watchman -- trigger $(shell pwd) ko-lc 'i18n/*.json' -- make i18n/$(LC).js
	watchman -- trigger $(shell pwd) ko-js '$(JS_FILES)' -- make konopas.js


clean: ; rm -f konopas.js konopas.min.js $(PRECACHE_FILES_GZ)
realclean: clean ; rm -f i18n/*.js skin/skin.css


.PHONY: dev prod watch precache clean realclean
