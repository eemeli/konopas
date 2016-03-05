BIN = ./node_modules/.bin

DIST = dist/index.html dist/konopas.js dist/skin/konopas.css
STATIC = $(addprefix dist/, $(wildcard skin/*.png skin/*.ttf)) dist/favicon.ico

ifneq "$(wildcard build/LC)" ""
  LCprev := $(shell cat build/LC)
else
  LCprev := en
endif
ifdef LC
  ifneq "$(LC)" "$(LCprev)"
    $(shell rm -r build/)
  endif
else
  LC := $(LCprev)
endif

.PHONY: all clean precache watch

all: $(DIST) $(STATIC)

clean: ; rm -rf build/ dist/


node_modules: ; npm install && touch $@

build dist dist/skin: ; mkdir -p $@

build/LC: | build ; echo "$(LC)" > $@

build/messages.js: src/i18n/*.json build/LC | build node_modules
	$(eval LCsp := $(shell echo $(LC) | tr ',' ' '))
	$(BIN)/messageformat --locale $(LC) --namespace "export default" $(LCsp:%=src/i18n/%.json) > $@

dist/konopas.js: src/app.js build/messages.js src/*.js | dist
	$(BIN)/browserify $< --standalone KonOpas --debug --outfile $@ \
		--plugin [minifyify --map $(notdir $@.map) --output $@.map \
		--uglify [ --comments --compress --mangle ] ]

dist/index.html: index.html | dist
	sed 's/"dist\//"/g' $< > $@

dist/favicon.ico: skin/favicon.ico | dist
	cp $< $@

dist/skin/konopas.css: skin/*.less | dist/skin node_modules
	$(BIN)/lessc skin/main.less --clean-css \
		--source-map --source-map-less-inline $@

dist/skin/%: skin/% | dist/skin
	cp $< $@


precache: $(addsuffix .gz, $(DIST) $(wildcard dist/skin/*.ttf))
%.gz: % ; gzip -c $^ > $@


watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) ko-css 'skin/*.less' -- make dist/skin/konopas.css
	watchman -- trigger $(shell pwd) ko-lc 'src/i18n/*.json' -- make build/messages.js dist/konopas.js
	watchman -- trigger $(shell pwd) ko-js 'src/*.js' -- make dist/konopas.js


