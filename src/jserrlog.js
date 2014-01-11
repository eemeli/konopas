///////////////////////////////////////////////////////////////////////////////
//
//  jsErrLog.js         version 1.3
//
//  Trap javascript errors on a webpage and re-direct them to a remote logging service
//  which can then be used to identify and resolve issues without impacting user experience
//
//  v1.3: add support for jsErrLog.qsignore parameter
//  v1.2: add support for jsErrLog.url parameter
//  v1.1: add support for jsErrLog.info parameter
//  v1.0: Original
///////////////////////////////////////////////////////////////////////////////

window.jsErrLog = { // default values
	"err_i": 0,
	"info": "",
	"url": "http://jserrlog.appspot.com/logger.js"
};


jsErrLog.ErrorHandler = function(source, error) {
	alert("jsErrLog encountered an unexpected error.\n\nSource: " + source + "\nDescription: " + error.description); 
};

jsErrLog.appendScript = function(index, src) {
	try {
		var script = document.createElement("script");
		script.id = "script" + index;
		script.src = src;
		script.type = "text/javascript";

		var head = document.getElementsByTagName("head")[0];
		head.appendChild(script);
	}
	catch (e) {
		jsErrLog.ErrorHandler("appendScript", e);
	}
};

jsErrLog.removeScript = function(index) {
	try {
		var script = document.getElementById("script" + index);
		var head = document.getElementsByTagName("head")[0];
		head.removeChild(script);
	}
	catch (e) {
		jsErrLog.ErrorHandler("removeScript", e);
	}
};

jsErrLog.guid = function() { // http://www.ietf.org/rfc/rfc4122.txt section 4.4
	return 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa'.replace(/[ab]/g, function(ch) { 
		var digit = Math.random()*16|0, newch = ch == 'a' ? digit : (digit&0x3|0x8); 
		return newch.toString(16); 
		}).toUpperCase();
}


// Respond to an error being raised in the javascript
window.onerror = function(msg, file_loc, line_no, col_no) {
	var src = jsErrLog.url
	        + "?i=" + (++jsErrLog.err_i)
	        + "&sn=" + escape(document.URL)
	        + "&fl=" + file_loc
	        + "&ln=" + line_no
	        + "&err=" + (col_no ? '[Col:' + col_no + '] ' + msg : msg ).substr(0, 1024)
	        + "&ui=" + jsErrLog.guid();
	if (jsErrLog.info) src += "&info=" + escape(jsErrLog.info.substr(0, 512));
	jsErrLog.appendScript(jsErrLog.err_i, src);
	return false;
}
