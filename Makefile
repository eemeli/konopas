BIN = ./node_modules/.bin

DIST = dist/index.html dist/konopas.min.js dist/skin/konopas.css
SKIN = $(addprefix dist/, $(wildcard skin/*.png skin/*.ttf))
STATIC = $(SKIN) dist/favicon.ico

ES5_SRC = src/item.js src/part.js src/polyfill.js src/prog.js src/server.js src/stars.js src/util.js

MAKEFLAGS += -r
.SUFFIXES:
.PHONY: all dev LC clean precache watch

all: LC $(DIST) $(STATIC)

clean: ; rm -rf build/ dist/


node_modules: ; npm install && touch $@

build dist dist/skin: ; mkdir -p $@

build/LC: | build ; echo 'en' > $@
LC: | build/LC
	$(eval LCprev := $(shell cat build/LC))
	$(eval LC ?= $(LCprev))
	@if [ "$(LC)" != "$(LCprev)" ]; then rm -f build/i18n.js; echo "$(LC)" > build/LC; fi

build/i18n.js: src/i18n/*.json LC | build node_modules
	$(eval LCsp := $(shell echo $(LC) | tr ',' ' '))
	$(BIN)/messageformat --locale $(LC) --namespace "export default" $(LCsp:%=src/i18n/%.json) > $@

build/preface.js: LICENSE | build
	echo '/**' > $@
	sed 's/^/ * /' $< >> $@
	echo ' * @license' >> $@
	echo ' */' >> $@
	echo '"use strict";' >> $@

build/app.js: build/preface.js src/app.js $(ES5_SRC) | build
	cat $^ > $@

dist/konopas.js: build/app.js build/i18n.js | dist
	$(BIN)/browserify $< --standalone KonOpas --outfile $@

dist/konopas.min.js: dist/konopas.js | node_modules
	$(BIN)/uglifyjs $< --comments --compress --mangle --output $@ \
		--source-map $@.map --source-map-include-sources --source-map-url $(notdir $@.map)

dist/dev.html: index.html | dist
	cp $< $@

dist/index.html: index.html | dist
	sed 's/"konopas.js"/"konopas.min.js"/' $< > $@

dist/favicon.ico: skin/favicon.ico | dist
	cp $< $@

dist/skin/konopas.css: skin/*.less | dist/skin node_modules
	$(BIN)/lessc skin/main.less --clean-css="--s0 --advanced --compatibility=ie8" \
		--source-map --source-map-less-inline $@

dist/skin/%: skin/% | dist/skin
	cp $< $@


precache: $(addsuffix .gz, $(DIST) $(wildcard dist/skin/*.ttf))
%.gz: % ; gzip -c $^ > $@


watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) ko-css 'skin/*.less' -- make dist/skin/konopas.css
	watchman -- trigger $(shell pwd) ko-lc 'src/i18n/*.json' -- LC=$(LC) make build/i18n.js dist/konopas.js
	watchman -- trigger $(shell pwd) ko-js 'src/*.js' -- make dist/konopas.js


