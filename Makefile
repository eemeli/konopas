BIN = ./node_modules/.bin

DIST = dist/index.html dist/konopas.min.js dist/skin/konopas.css
SKIN = $(addprefix dist/, $(wildcard skin/*.png skin/*.svg skin/*.ttf))
STATIC = $(SKIN) dist/favicon.ico

MAKEFLAGS += -r
.SUFFIXES:
.PHONY: all dev LC clean precache watch

all: LC $(DIST) $(STATIC)

clean: ; rm -rf tmp/ dist/


node_modules: ; npm install && touch $@

tmp dist dist/skin: ; mkdir -p $@

tmp/LC: | tmp ; echo 'en' > $@
LC: | tmp/LC
	$(eval LCprev := $(shell cat tmp/LC))
	$(eval LC ?= $(LCprev))
	@if [ "$(LC)" != "$(LCprev)" ]; then rm -f tmp/i18n.js; echo "$(LC)" > tmp/LC; fi

tmp/i18n.js: src/i18n/*.json | tmp node_modules
	$(eval LCglob := @($(shell echo $(LC) | tr ',' '|')).json)
	$(BIN)/messageformat --locale $(LC) --include '$(LCglob)' src/i18n/ $@

tmp/preface.js: LICENSE | tmp
	echo '/**' > $@
	sed 's/^/ * /' $< >> $@
	echo ' * @license' >> $@
	echo ' */' >> $@
	echo '"use strict";' >> $@

dist/konopas.js: tmp/preface.js tmp/i18n.js src/*.js | dist
	cat $^ > $@

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
	$(BIN)/lessc skin/main.less --clean-css="--s0 --advanced --compatibility=ie8" $@

dist/skin/%: skin/% | dist/skin
	cp $< $@


precache: $(addsuffix .gz, $(DIST) $(wildcard dist/skin/*.ttf))
%.gz: % ; gzip -c $^ > $@


watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) ko-css 'skin/*.less' -- make dist/skin/konopas.css
	watchman -- trigger $(shell pwd) ko-lc 'src/i18n/*.json' -- LC=$(LC) make tmp/i18n.js dist/konopas.js
	watchman -- trigger $(shell pwd) ko-js 'src/*.js' -- make dist/konopas.js
