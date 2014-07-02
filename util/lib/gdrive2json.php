<?php

/*  Google Drive Spreadsheet -> JSON converter
 *  Copyright (c) 2013 by Eemeli Aro <eemeli@gmail.com>
 *
 *
 *  Fetches a non-private Google Drive/Docs spreadsheet as CSV and converts it
 *  to JSON. In field names, a "." indicates sub-objects; use zero-indexed
 *  entries to generate arrays rather than objects.
 *
 *  EXAMPLE USAGE:

      <?php
      $key = preg_replace('/\W/', '', @$_GET['key']);
      $gid = isset($_GET['gid']) ? preg_replace('/\D/', '', $_GET['gid']) : '0';

      require_once('gdrive2json.php');

      header("Content-type: application/json; charset=UTF-8;");
      echo gdrive2json($key, $gid);

 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  The software is provided "as is" and the author disclaims all warranties
 *  with regard to this software including all implied warranties of
 *  merchantability and fitness. In no event shall the author be liable for
 *  any special, direct, indirect, or consequential damages or any damages
 *  whatsoever resulting from loss of use, data or profits, whether in an
 *  action of contract, negligence or other tortious action, arising out of
 *  or in connection with the use or performance of this software.
 *
 */


require_once('url_fetch.php');
require_once('parsecsv.lib.php');

function gdrive2json($key, $gid = '0', $version = 'ccc') {
	if (!$key) exit("'key' parameter is required.");

	$url = ($version == 'ccc')
	     ? "https://docs.google.com/spreadsheet/ccc?output=csv&key=$key&gid=$gid"
	     : "https://docs.google.com/spreadsheets/d/$key/export?format=csv&gid=$gid";
	$rc = url_fetch($url, $csv_str);
	if ($rc) exit("URL fetch error: $rc");

	$csv = new parseCSV("$csv_str\n");
	$a = $csv->data;

	foreach ($a as &$i) {
		foreach ($i as $k => $v) {
			if (strpos($k, '.')) {
				if ($v && preg_match('/^([^.]+)\.([^.]+)(\.([^.]+))?$/', $k, $m)) {
					if (!isset($i[$m[1]])) $i[$m[1]] = array();
					$x =& $i[$m[1]];
					if ((count($m) >= 5) && $m[4]) {
						if (!isset($x[$m[2]])) $x[$m[2]] = array();
						$x[$m[2]][$m[4]] = $v;
					} else {
						$x[$m[2]] = $v;
					}
				}
				unset($i[$k]);
			} else if (!$v) {
				unset($i[$k]);
			}
		}
	}

	return json_encode($a);
}
