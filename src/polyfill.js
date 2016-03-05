if ((function(){
	try { new Date().toLocaleDateString("i"); }
	catch (e) { return e.name !== "RangeError"; }
	return true;
})()) {
	Date.prototype._orig_toLocaleDateString = Date.prototype.toLocaleDateString;
	Date.prototype.toLocaleDateString = function(locale, options) {
		if (!arguments.length || (typeof i18n == 'undefined')) return this._orig_toLocaleDateString();
		var i = function(key, data){ return key in i18n[locale] ? i18n[locale][key](data) : key; },
		    w = i('weekday_n', { 'N': this.getDay() }),
		    d = this.getDate(),
		    m = i('month_n', { 'N': this.getMonth() }),
		    s = w + ', ' + d + ' ' + m;
		if (options && options.year) s += ' ' + this.getFullYear();
		return s;
	};
}
