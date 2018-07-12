# 0.9.0 (2018-07-12)

  * Interface:
    - Drop support for comments
    - Fix search, make it auto-refresh
  * Code:
    - Simplify build setup
    - Reorganise repo file structure
    - Bugfixes
  * Util:
    - Add `apache-enable-gzip.conf`

# 0.8.0 (2014-10-05)

  * Interface:
    - moved day & name range selections to sub-menus
    - replaced "Now" with default during-event hiding of past items
  * Code:
    - better item sort, better filter label sort
    - general code cleanup
    - `mv cache.manifest konopas.appcache`
    - `mv data/sample/ demo/`
    - bugfix: `parse_date` workaround for buggy DST implementations
  * Localization: normalized English to British spelling


# 0.7.1 (2014-08-06)

  * Code:
    - added `konopas_set.set_category` as alt. for tags "type:..."
    - added optional `min_count` for tag & area filters
    - added `toggle_collapse` for info view
    - Makefile: easier-to-parse minified output
    - reverted item id setting on click -- was too slow & too unclear
    - bugfix: search includes tags
    - bugfix: Firefox w/ no-cookies threw error on localStorage access
    - bugfix: numeric tags now work
  * Interface:
    - added item permalinks, including new icon
    - more informative text in "My con" view
    - import selection borders aren't as sticky
  * Skin:
    - info view skin fixes
    - added @media print rules
    - Prettified participant links & added images to default on


# 0.7.0 (2014-07-09)

  * New Features:
    - Added automatic programme filter generation, set by `konopas_set.filters`
    - Added automatic people paging, set by `konopas_set.people_per_screen`
    - Removed Next view, added "Now" to Program view
  * Code:
    - Split `src/app.js` into multiple files
    - Cleaned up almost all functions & data into a `KonOpas` namespace, with an
      instance `konopas`
    - Moved program sorting from `KonOpas.Item.show_list` to `KonOpas.Prog`
    - Added polyfills for `function.bind()` & `string.normalize()`
    - Removed from git tracking: `konopas*.js`
  * Localization:
    - Support for simultaneous multi-lingual use, req. supporting
      messageformat.js (0.2.0)
    - better localized date & weekday handling, with custom polyfill for
      `date.toLocaleDateString()`
    - Removed from git tracking: `i18n/*.js`
  * Skin:
    - Added -ms-high-contrast rule for item select boxes in IE10 & later
    - Switched CSS compressor to clean-css (was yui-compress)
    - Split `fonts.less` from `main.less`; cleaned up `fonts.css`
    - Removed from git tracking: `skin/skin.css`, `skin/PTSansNarrow700.ttf` and
      `skin/RobotoCondensed400.ttf`
  * Util:
    - `lib/gdrive2json.php`: added Google's new URL scheme (check your path for
      either `/d/` or `/ccc?`)
    - Reorganised everything
    - Removed android-wrapper & `config.html`
  * Updated the sample artwork
  * Lots and lots of bugfixes, in particular increasing robustness to bad data


# 0.6.2 (2014-06-04)

  * Added Gulp.js based build system (thanks to [akx](https://github.com/akx/))
  * Localization improvements:
    - Added Finnish (again, thanks to akx)
    - added `i18n/README.md` for translators
    - added separate `i18n/{en,fi,sv}.js` files
    - relaxed MessageFormat version dependence
  * allow people array to be missing or empty


# 0.6.1 (2014-03-25)

  * really minor update, mainly to get `konopas.org/util/i18n` to match latest
    release
  * improved & updated README
  * switched to Makefile from `build.sh`
  * `mv src/i18n.js i18n/i18n.js`
  * added linebreaks to konopas.min.js & switched lessc to use yui-compress


# 0.6.0 (2014-03-15)

  * added internationalization support, with English & Swedish translations
    (thanks to Karl-Johan Norén)
  * added build script, see `./build.sh -h` for options
  * added optional `ko.non_ascii_people` for correct sorting
  * added `ko.tag_categories`; set to eg. `['type','track']` to use tags like
    `type:Lecture` cleanly
  * added mobile homescreen app install instructions
  * added regexp option to area, acting on `loc[].join(';')`
  * programme filter summary terms are links to remove themselves
  * updated popup menu for 2nd-level area, tags, maps, etc.
  * switched sample data to that of Arisia 2014
  * added util/update-cache-manifest.php
  * a whole big pile of bugfixes


# 0.5.0 (2013-12-21)

  * added server access in `server.js`, featuring:
    - login using OAuth2/OpenID authenticated e-mail addresses
    - sync between browsers & devices
    - iCal (.ics) URL export for external calendars
    - commenting & voting on individual programme items
    - new `ko.use_server` flag, defaulting to `false`
  * moved raw js files to `src/`; using minified output
  * less strict input processing:
    - allowing for items missing tags, loc, people
    - program now sorted by date, time, location if necesary
  * less non-code data in javascript files
  * added hourly app cache update check
  * added `ko.show_all_days_by_default`, default `false`: shows current or
    first day if unspecified
  * javascript speed & legibility improvements
  * split `skin/skin.less` into multiple files
  * added "Expand all" link whenever fewer than `ko.expand_all_max_items` items
    are listed
  * next view: clearer text, smarter time picker
  * added QR code link, using chart.apis.google.com
  * refactored star functions into Stars class & separated it into `stars.js`
  * added `util/config.html`, a basic tool for parsing program.js for
    `index.html`
  * consolidated logging to go through `_log()`, which also checks new
    `ko.log_messages` (default true) & console existence
  * a pile of CSS & JS bugfixes & cleanup


# 0.4.1 (2013-10-10)

  * CSS now generated from LESS, allowing for easier modification
  * moved global options to new `ko` object
  * added option `ko.always_show_participants` (default false)
  * moved gdrive2js & android-wrapper to util/ and added READMEs
  * removed unused iCal code
  * various CSS & JS bugfixes


# 0.4.0 (2013-10-09)

  * added export/import of starred selections
  * setting `time_show_am_pm` now actually does what you think
  * added `abbrev_00_minutes` option for am/pm time
  * added `gdrive2js`, a PHP conversion tool from data in Google Docs
    spreadsheets to KonOpas format
  * skin bug fixes: time scroller doesn't show at top, long links don't
    overflow in profile view
  * show `alert()` dialog for browsers without required features
  * show `alert()` dialog for iOS/Safari in private browsing mode
  * lots of bugfixes


# 0.3 (2013-09-06, LoneStarCon3)

  * using URL hash fragments for everything
  * automatic last-updated field in info view
  * added filter summary box & cleaner 2nd level tag list
  * directory cleanup
  * added `clean_name` and `clean_links` for parsing bad data
  * combined "What" and "Maps" views as "Info"
  * lots of bugfixes, code maintenance & CSS improvements


# 0.2 (2013-07-22, Finncon2013/Readercon24)

  * CSS fixes, including menu on left for wide screens
  * removed buggy iCal code
  * added tags
  * changed default view to "Program"


# 0.1.1 (2013-07-04, Westercon66)

  * lots of rewriting
  * separated starred selection to its own tab
  * added android-wrapper
  * removed references to Chicon
  * added iCal export using FileSaver
  * added reload check for updated data


# 0.1.0 (2012-08-30, Chicon7)

  * First release
