KonOpas Utilities
=================

All KonOpas utilities are distributed under the same ISC license as KonOpas itself.

For more online tools to help with KonOpas, see:  http://konopas.org/util/


KonOpas cache manifest updater
------------------------------

`update-cache-manifest.php` updates the timestamp on the `konopas.appcache` file in KonOpas root. That file is used by the HTML5 cache KonOpas uses to indicate changes in data. So if your programme gets updated, you'll want to either run `update_cache_manifest(...)` directly (as `read-from-gdrive.php` does), or do an HTTP GET request for this file.


Google Drive Spreadsheet -> KonOpas Javascript converter
--------------------------------------------------------

`read-from-gdrive.php` is a tool for using a Google Drive/Docs spreadsheet as a data source for KonOpas. To use, you'll need non-private spreadsheets for programme and people data, each with appropriate labels on the first row. See here for an example, from Finncon 2013:

https://docs.google.com/spreadsheet/ccc?key=0Auqwt8Hmhr0pdFRiR0hWWWRqRXVUSDVUY2RFYmRzZ0E

To use, modify the `$data` array in the PHP file to point to your spreadsheet's `key` and `gid`, and set `tgt` to point to the right path for the formatted data. In the source spreadsheet, field names are defined by the first row: a "." indicates sub-objects; use zero-indexed entries to generate arrays rather than objects. The number of sub-objects and array entries are not limited. Don't leave empty rows at the end of the sheets, and in arrays don't leave empty values in the middle.
