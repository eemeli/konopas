if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}


// from https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
		'use strict';
		if (this == null) { throw new TypeError(); }

		var n, k, t = Object(this), len = t.length >>> 0;

		if (len === 0) {
			return -1;
		}
		n = 0;
		if (arguments.length > 1) {
			n = Number(arguments[1]);
			if (n != n) { // shortcut for verifying if it's NaN
				n = 0;
			} else if (n != 0 && n != Infinity && n != -Infinity) {
				n = (n > 0 || -1) * Math.floor(Math.abs(n));
			}
		}
		if (n >= len) {
			return -1;
		}
		for (k = n >= 0 ? n : Math.max(len - Math.abs(n), 0); k < len; k++) {
			if (k in t && t[k] === searchElement) {
				return k;
			}
		}
		return -1;
	};
}


// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
if (!Array.prototype.filter) {
	Array.prototype.filter = function(fun /*, thisp*/) {
		'use strict';
		if (!this) { throw new TypeError(); }
		if (typeof fun !== 'function') { throw new TypeError(); }

		var O = Object(this), len = O.length >>> 0, A = [], thisp = arguments[1];

		for (var i in O) {
			if (O.hasOwnProperty(i) && fun.call(thisp, O[i], i, O)) {
				A.push(O[i]);
			}
		}

		return A;
	};
}


// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
if (!Array.prototype.map) {
	Array.prototype.map = function(callback, thisArg) {
		if (!this) { throw new TypeError(); }
		if (typeof callback !== 'function') { throw new TypeError(); }

		var T, O = Object(this), len = O.length >>> 0, A = new Array(len), k = 0;
		if (thisArg) { T = thisArg; }

		while(k < len) {
			if (k in O) { A[k] = callback.call(T, O[k], k, O); }
			++k;
		}
		return A;
	};
}


/*
 * classList.js: Cross-browser full element.classList implementation.
 * 2011-06-15
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */
 
/*global self, document, DOMException */
 
/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/
 
if (typeof document !== "undefined" && !("classList" in document.createElement("a"))) {
 
(function (view) {
 
"use strict";
 
var
	  classListProp = "classList"
	, protoProp = "prototype"
	, elemCtrProto = (view.HTMLElement || view.Element)[protoProp]
	, objCtr = Object
	, strTrim = String[protoProp].trim || function () {
		return this.replace(/^\s+|\s+$/g, "");
	}
	, arrIndexOf = Array[protoProp].indexOf || function (item) {
		var
			  i = 0
			, len = this.length
		;
		for (; i < len; i++) {
			if (i in this && this[i] === item) {
				return i;
			}
		}
		return -1;
	}
	// Vendors: please allow content code to instantiate DOMExceptions
	, DOMEx = function (type, message) {
		this.name = type;
		this.code = DOMException[type];
		this.message = message;
	}
	, checkTokenAndGetIndex = function (classList, token) {
		if (token === "") {
			throw new DOMEx(
				  "SYNTAX_ERR"
				, "An invalid or illegal string was specified"
			);
		}
		if (/\s/.test(token)) {
			throw new DOMEx(
				  "INVALID_CHARACTER_ERR"
				, "String contains an invalid character"
			);
		}
		return arrIndexOf.call(classList, token);
	}
	, ClassList = function (elem) {
		var
			  trimmedClasses = strTrim.call(elem.className)
			, classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
			, i = 0
			, len = classes.length
		;
		for (; i < len; i++) {
			this.push(classes[i]);
		}
		this._updateClassName = function () {
			elem.className = this.toString();
		};
	}
	, classListProto = ClassList[protoProp] = []
	, classListGetter = function () {
		return new ClassList(this);
	}
;
// Most DOMException implementations don't allow calling DOMException's toString()
// on non-DOMExceptions. Error's toString() is sufficient here.
DOMEx[protoProp] = Error[protoProp];
classListProto.item = function (i) {
	return this[i] || null;
};
classListProto.contains = function (token) {
	token += "";
	return checkTokenAndGetIndex(this, token) !== -1;
};
classListProto.add = function (token) {
	token += "";
	if (checkTokenAndGetIndex(this, token) === -1) {
		this.push(token);
		this._updateClassName();
	}
};
classListProto.remove = function (token) {
	token += "";
	var index = checkTokenAndGetIndex(this, token);
	if (index !== -1) {
		this.splice(index, 1);
		this._updateClassName();
	}
};
classListProto.toggle = function (token) {
	token += "";
	if (checkTokenAndGetIndex(this, token) === -1) {
		this.add(token);
	} else {
		this.remove(token);
	}
};
classListProto.toString = function () {
	return this.join(" ");
};
 
if (objCtr.defineProperty) {
	var classListPropDesc = {
		  get: classListGetter
		, enumerable: true
		, configurable: true
	};
	try {
		objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
	} catch (ex) { // IE 8 doesn't support enumerable:true
		if (ex.number === -0x7FF5EC54) {
			classListPropDesc.enumerable = false;
			objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
		}
	}
} else if (objCtr[protoProp].__defineGetter__) {
	elemCtrProto.__defineGetter__(classListProp, classListGetter);
}
 
}(self));
 
}
