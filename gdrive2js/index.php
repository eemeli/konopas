<?php

/*  Google Drive Spreadsheet -> KonOpas Javascript converter
 *  Copyright (c) 2013 by Eemeli Aro <eemeli@gmail.com>
 *
 *
 *  A tool for using a Google Drive/Docs spreadsheet as a data source for
 *  KonOpas. To use, you'll need non-private spreadsheets for programme and
 *  people data, each with appropriate labels on the first row. See here for
 *  an example, from Finncon 2013:
 *
 *  https://docs.google.com/spreadsheet/ccc?key=0Auqwt8Hmhr0pdFRiR0hWWWRqRXVUSDVUY2RFYmRzZ0E
 *
 *  To use, modify the $data array below to point to your data, and, if using,
 *  set $cache_manifest accordingly (set to FALSE or '' if not using)
 *
 *
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


$data = array(
	'program' => array(
		'key' => '0Auqwt8Hmhr0pdFRiR0hWWWRqRXVUSDVUY2RFYmRzZ0E',
		'gid' => '0',
		'tgt' => '../data-fc/program.js'
	),
	'people' => array(
		'key' => '0Auqwt8Hmhr0pdFRiR0hWWWRqRXVUSDVUY2RFYmRzZ0E',
		'gid' => '1',
		'tgt' => '../data-fc/people.js'
	)
);

$cache_manifest = '../data-fc/cache.manifest';


// You should not need to change anything below this line.


require_once('gdrive2json.php');

function gdrive2konopas($name, $set) {
	$json = gdrive2json($set['key'], $set['gid']);
	if (strlen($json) == 0) exit("JSON length 0! Error!");
	$js = "var $name = $json;";

	$dir = dirname($set['tgt']);
	if (!file_exists($dir)) mkdir($dir, 0777, true);
	$write_len = file_put_contents($set['tgt'], $js);
	if ($write_len != strlen($js)) exit("Write error! $write_len != " . strlen($js));
}


header("Content-type: text/plain; charset=UTF-8;");

echo "Google Drive -> KonOpas\n=======================\n";

foreach ($data as $k => $v) {
	echo "\nUpdating $k data... "; flush();
	gdrive2konopas($k, $v);
	echo "ok.\n"; flush();
}

if (isset($cache_manifest) && $cache_manifest) {
	echo "\nUpdating cache manifest timestamp... "; flush();
	$cm = file_get_contents($cache_manifest);

	$cm = preg_replace("/[\n\r]+#.*/", "\n# " . date("Y-m-d H:i:s"), $cm, 1, $count);
	if ($count == 0) exit("No comment line found! Error!");
	$write_len = file_put_contents($cache_manifest, $cm);
	if ($write_len != strlen($cm)) exit("Write error! $write_len != " . strlen($cm));
	echo "ok.\n"; flush();
} else echo "\nSkipping cache manifest update.\n";

echo "\nAll done.\n";
