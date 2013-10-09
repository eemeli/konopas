<?php

/*  Caching wrapper for cURL, with fallback to file_get_contents
 *  Copyright (c) 2013 by Eemeli Aro <eemeli@gmail.com>
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


$url_fetch_defaults = array(
	'cachefile_prefix' => 'url_fetch_cache_',
	'min_time_before_refetch' => 30,
	'max_time_cache_valid' => 5 * 60
);
foreach ($url_fetch_defaults as $k => $v) if (!isset($url_fetch[$k])) $url_fetch[$k] = $v;


function url_fetch($url, &$data, $headers=FALSE, $cookiefile=FALSE) {
	if (!preg_match('#^https?://#', $url)) return "Bad URL $url";

	$data = '';
	$err = '';
	if (function_exists('curl_init')) {
		$curl_handle = curl_init($url);
		curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, 10);
		curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, TRUE);
		curl_setopt($curl_handle, CURLOPT_FOLLOWLOCATION, TRUE);
		curl_setopt($curl_handle, CURLOPT_MAXREDIRS, 8);
		if ($headers && is_array($headers)) curl_setopt($curl_handle, CURLOPT_HTTPHEADER, $headers);
		if ($cookiefile && file_exists($cookiefile)) {
			curl_setopt($curl_handle, CURLOPT_COOKIEFILE, $cookiefile);
			curl_setopt($curl_handle, CURLOPT_COOKIEJAR, $cookiefile);
		} else {
			curl_setopt($curl_handle, CURLOPT_COOKIEFILE, '');
		}
		$data = curl_exec($curl_handle);
		if (empty($data)) $err = curl_error($curl_handle);
		curl_close($curl_handle);
	} else {
		$data = file_get_contents($url);
		if (empty($data)) $err = 'file_get error';
	}

	return $err;
}

function url_fetch_cached($url, &$data, &$time, $headers=FALSE, $cookiefile=FALSE, $cf_preset=FALSE) {
	global $url_fetch;

	$cachefile = $url_fetch['cachefile_prefix'] . ($cf_preset ? $cf_preset : md5($url));
	if (!file_exists(dirname($cachefile))) mkdir(dirname($cachefile), 0777, true);

	$data = '';
	if (!preg_match('#^https?://...#', $url)) return "Bad URL $url";

	if (file_exists($cachefile) && (time() - filectime($cachefile) < $url_fetch['min_time_before_refetch'])) {
		$data = file_get_contents($cachefile);
		$time = filectime($cachefile);
		return '';
	}

	$err = url_fetch($url, $data, $headers, $cookiefile);
	if (empty($err)) {
		$time = time();
		return file_put_contents($cachefile, $data) ? '' : "Cache write error to file $cachefile";
	} else {
		if (file_exists($cachefile) && (time() - filectime($cachefile) <= $url_fetch['max_time_cache_valid'])) {
			$data = file_get_contents($cachefile);
			$time = filectime($cachefile);
		}
		return "HTTP error: $err";
	}
}
