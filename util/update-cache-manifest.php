<?php

/*  KonOpas cache.manifest updater
 *  Copyright (c) 2014 by Eemeli Aro <eemeli@gmail.com>
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

if (!isset($cache_manifest)) $cache_manifest = '../konopas.appcache';

if (!function_exists('file_put_contents')) {
    function file_put_contents($filename, $data) {
        $f = @fopen($filename, 'w');
        if (!$f) {
            return false;
        } else {
            $bytes = fwrite($f, $data);
            fclose($f);
            return $bytes;
        }
    }
}

function update_cache_manifest($cache_manifest) {
	if (!$cache_manifest) { return "Skipping cache manifest update.\n"; }
	$t_str = date("Y-m-d H:i:s");
	$intro_str = "Updating cache manifest timestamp to $t_str... ";
	$cm0 = file_get_contents($cache_manifest);
	$cm = preg_replace("/[\n\r]+#.*/", "\n# " . $t_str, $cm0, 1);
	if (strpos($cm, $t_str) === FALSE) {
		return $intro_str . "No comment line found! Error!\n";
	} else {
		$write_len = file_put_contents($cache_manifest, $cm);
		$cm_len = strlen($cm);
		return $intro_str . ($write_len == $cm_len ? "ok.\n" : "Write error! $write_len != $cm_len\n");
	}
}

if (count(get_included_files()) == 1) {
	header("Content-type: text/plain; charset=UTF-8;");
	echo update_cache_manifest($cache_manifest);
}
