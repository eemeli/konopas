BIN = ./node_modules/.bin

DEV = dist/dev.html dist/konopas.js dist/skin/konopas.css
PROD = dist/index.html dist/konopas.min.js dist/skin/konopas.min.css
SKIN = $(addprefix dist/, $(wildcard skin/*.png skin/*.ttf))
STATIC = $(SKIN) dist/favicon.ico

MAKEFLAGS += -r
.SUFFIXES:
.PHONY: all dev LC clean precache watch

all: LC $(DEV) $(PROD) $(STATIC)
dev: LC $(DEV) $(STATIC)

clean: ; rm -rf tmp/ dist/


tmp dist dist/skin: ; mkdir -p $@

tmp/LC: | tmp ; echo 'en' > $@
LC: | tmp/LC
	$(eval LCprev := $(shell cat tmp/LC))
	$(eval LC ?= $(LCprev))
	@if [ "$(LC)" != "$(LCprev)" ]; then rm -f tmp/i18n.js; echo "$(LC)" > tmp/LC; fi

tmp/i18n.js: src/i18n/*.json | tmp
	$(eval LCglob := @($(shell echo $(LC) | tr ',' '|')).json)
	$(BIN)/messageformat --locale $(LC) --include '$(LCglob)' src/i18n/ $@

tmp/preface.js: LICENSE | tmp
	echo '/**' > $@
	sed 's/^/ * /' $< >> $@
	echo ' */' >> $@
	echo '"use strict";' >> $@

tmp/konopas.js: tmp/i18n.js src/*.js | tmp
	cat $^ > $@

dist/konopas.js: tmp/preface.js tmp/konopas.js | dist
	cat $^ > $@

dist/konopas.min.js: tmp/preface.js tmp/konopas.js | dist
	$(BIN)/uglifyjs $(word 2, $^) --compress --mangle \
	| sed 's/\([^,;:?+(){}\/]*[^\w ",;{}]\)\(function\( \w\+\)\?(\)/\n\1\2/g' \
	| cat $< - \
	> $@

dist/dev.html: index.html | dist
	cp $< $@

dist/index.html: index.html | dist
	sed 's/"konopas.js"/"konopas.min.js"/;s/"skin\/konopas.css"/"skin\/konopas.min.css"/' $< > $@

dist/favicon.ico: skin/favicon.ico | dist
	cp $< $@

dist/skin/konopas.css: skin/*.less | dist/skin
	$(BIN)/lessc skin/main.less $@

dist/skin/konopas.min.css: skin/*.less | dist/skin
	$(BIN)/lessc skin/main.less --clean-css="--s0 --advanced --compatibility=ie8" $@

dist/skin/%: skin/% | dist/skin
	cp $< $@


precache: $(addsuffix .gz, $(PROD) $(wildcard dist/skin/*.ttf))
%.gz: % ; gzip -c $^ > $@


watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) ko-css 'skin/*.less' -- make dist/skin/konopas.css
	watchman -- trigger $(shell pwd) ko-lc 'src/i18n/*.json' -- LC=$(LC) make tmp/i18n.js dist/konopas.js
	watchman -- trigger $(shell pwd) ko-js 'src/*.js' -- make dist/konopas.js


