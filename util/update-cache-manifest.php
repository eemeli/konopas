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


$cache_manifest = '../cache.manifest';


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

header("Content-type: text/plain; charset=UTF-8;");

$t_str = date("Y-m-d H:i:s");
echo "\nUpdating cache manifest timestamp to " . $t_str . "... "; flush();
$cm = file_get_contents($cache_manifest);
$cm = preg_replace("/[\n\r]+#.*/", "\n# " . $t_str, $cm, 1);
if (strpos($cm, $t_str) === FALSE) exit("No comment line found! Error!");
$write_len = file_put_contents($cache_manifest, $cm);
if ($write_len != strlen($cm)) exit("Write error! $write_len != " . strlen($cm));
echo "ok.\n"; flush();
