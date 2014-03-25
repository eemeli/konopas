# 0.6.1

2014-03-25

  * really minor update, mainly to get konopas.org/util/i18n to match latest release
  * improved & updated README
  * switched to Makefile from build.sh
  * mv src/i18n.js i18n/i18n.js
  * added linebreaks to konopas.min.js & switched lessc to use yui-compress


# 0.6.0

2014-03-15

  * added internationalization support, with English & Swedish translations (thanks to Karl-Johan Norén)
  * added build script, see `./build.sh -h` for options
  * added optional ko.non_ascii_people for correct sorting
  * added ko.tag_categories; set to eg. ['type','track'] to use tags like 'type:Lecture' cleanly
  * added mobile homescreen app install instructions
  * added regexp option to area, acting on loc[].join(';')
  * programme filter summary terms are links to remove themselves
  * updated popup menu for 2nd-level area, tags, maps, etc.
  * switched sample data to that of Arisia 2014
  * added util/update-cache-manifest.php
  * a whole big pile of bugfixes

# 0.5.0

2013-12-21

  * added server access in server.js, featuring:
    - login using OAuth2/OpenID authenticated e-mail addresses
    - sync between browsers & devices
    - iCal (.ics) URL export for external calendars
    - commenting & voting on individual programme items
    - new ko.use_server flag, defaulting to "false"
  * moved raw js files to src/; using minified output
  * less strict input processing:
    - allowing for items missing tags, loc, people
    - program now sorted by date, time, location if necesary
  * less non-code data in javascript files
  * added hourly app cache update check
  * added ko.show_all_days_by_default, default false: shows
    current or first day if unspecified
  * javascript speed & legibility improvements
  * split skin/skin.less into multiple files
  * added "Expand all" link whenever fewer than
    ko.expand_all_max_items items are listed
  * next view: clearer text, smarter time picker
  * added QR code link, using chart.apis.google.com
  * refactored star functions into Stars class & separated it
    into stars.js
  * added util/config.html, a basic tool for parsing program.js
    for index.html
  * consolidated logging to go through _log(), which also checks
    new ko.log_messages (default true) & console existence
  * a pile of CSS & JS bugfixes & cleanup

# 0.4.1

2013-10-10

  * CSS now generated from LESS, allowing for easier modification
  * moved global options to new `ko` object
  * added option `ko.always_show_participants` (default false)
  * moved gdrive2js & android-wrapper to util/ and added READMEs
  * removed unused iCal code
  * various CSS & JS bugfixes

# 0.4.0

2013-10-09

  * added export/import of starred selections
  * setting `time_show_am_pm` now actually does what you think
  * added `abbrev_00_minutes` option for am/pm time
  * added gdrive2js, a PHP conversion tool from data in Google
    Docs spreadsheets to KonOpas format
  * skin bug fixes: time scroller doesn't show at top, long links
    don't overflow in profile view
  * show alert() dialog for browsers without required features
  * show alert() dialog for iOS/Safari in private browsing mode
  * lots of bugfixes

# 0.3 (LoneStarCon3)

2013-09-06

  * using URL hash fragments for everything
  * automatic last-updated field in info view
  * added filter summary box & cleaner 2nd level tag list
  * directory cleanup
  * added `clean_name` and `clean_links` for parsing bad data
  * combined "What" and "Maps" views as "Info"
  * lots of bugfixes, code maintenance & CSS improvements

# 0.2 (Finncon2013/Readercon24)

2013-07-22

  * CSS fixes, including menu on left for wide screens
  * removed buggy iCal code
  * added tags
  * changed default view to "Program"

# 0.1.1 (Westercon66)

2013-07-04

  * lots of rewriting
  * separated starred selection to its own tab
  * added android-wrapper
  * removed references to Chicon
  * added iCal export using FileSaver
  * added reload check for updated data

# 0.1.0 (Chicon7)

2012-08-30

  * First release
