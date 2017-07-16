if (typeof i18n == 'undefined') i18n = {};
i18n.txt = function(key){ return key; };
i18n.translate_html = function(map, a) {
	var list = document.querySelectorAll('['+a+']');
	for (var i = 0, node; node = list[i]; ++i) {
		var key = node.getAttribute(a) || node.textContent.trim();
		if (key in map) {
			var data = node.getAttribute(a + '-var');
			var attr = node.getAttribute(a + '-attr');
			var str = map[key](data && JSON.parse('{' + data.replace(/[^,:]+/g, '"$&"') + '}'));
			if (attr) node.setAttribute(attr, str);
			else node.innerHTML = str;
		}
	}
}

function _log(msg, lvl) {
	if (window.console) switch (lvl) {
		case 'error': console.error(msg); break;
		case 'warn':  console.warn(msg); break;
		default:      console.log(msg);
	}
}

function _el(id) { return id && document.getElementById(id); }

function _new_elem(tag, cl, text, hide) {
	var e = document.createElement(tag);
	if (cl) e.className = cl;
	if (text) e.textContent = text;
	if (hide) e.style.display = 'none';
	return e;
}

KonOpas.link_to_short_url = function(url) {
	var u = encodeURIComponent(url.replace(/^http:\/\//, ''));
	return 'http://is.gd/create.php?url=' + u;
}
KonOpas.link_to_qr_code = function(url) {
	var u = encodeURIComponent(url.replace(/^http:\/\//, ''));
	return 'http://chart.apis.google.com/chart?cht=qr&chs=350x350&chl=' + u;
}

KonOpas.hash_encode = function(s) { return encodeURIComponent(s).replace(/%20/g, '+'); }
KonOpas.hash_decode = function(s) { return decodeURIComponent(s.replace(/\+/g, '%20')); }

KonOpas.glob_to_re = function(pat) {
	var re_re = new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\/-]', 'g');
	pat = pat.replace(re_re, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
	var terms = pat.match(/"[^"]*"|'[^']*'|\S+/g).map(function(el){
		return '\\b' + el.replace(/^(['"])(.*)\1$/, '$2\\b');
	});
	return new RegExp(terms.join('|'), 'i');
}


// ------------------------------------------------------------------------------------------------ storage

KonOpas.Store = function(id) {
	try {
		sessionStorage.setItem('konopas.test_var', '1');
		sessionStorage.removeItem('konopas.test_var', '1');
		this.get = function(k) {
			var v = sessionStorage.getItem('konopas.' + id + '.' + k);
			return v ? JSON.parse(v) : v;
		}
		this.set = function(k, v) {
			sessionStorage.setItem('konopas.' + id + '.' + k, JSON.stringify(v));
		}
		this.limit = '';
	} catch (e) {
		var data = {};
		this.get = function(k) { return data[k]; };
		this.set = function(k, v) { data[k] = v; };
		this.limit = (e.name == 'SecurityError') ? 'FFcookies'
				   : ((e.code === DOMException.QUOTA_EXCEEDED_ERR) && (sessionStorage.length === 0)) ? 'IOSprivate'
				   : '?';
	}
}

KonOpas.VarStore = function() {
	var data = {};
	this.getItem = function(k) { return data[k]; };
	this.setItem = function(k, v) { data[k] = v; };
}


// ------------------------------------------------------------------------------------------------ string generation

KonOpas.clean_name = function(p, span_parts) {
	var fn = '', ln = '';
	switch (p.name.length) {
		case 1:
			ln = p.name[0];
			break;
		case 2:
			if (p.name[1]) {
				fn = p.name[0];
				ln = p.name[1];
			} else {
				ln = p.name[0];
			}
			break;
		case 3:
			fn = p.name[2] + ' ' + p.name[0];
			ln = p.name[1];
			break;
		case 4:
			fn = p.name[2] + ' ' + p.name[0];
			ln = p.name[1] + (p.name[3] ? ', ' + p.name[3] : '');
			break;
	}
	return span_parts
		? '<span class="fn">' + fn.trim() + '</span> <span class="ln">' + ln.trim() + '</span>'
		: (fn + ' ' + ln).trim();
}

KonOpas.clean_links = function(p) {
	var ok = false, o = {};
	if (p && ('links' in p)) {
		if (p.links.img || p.links.photo) {
			var img = (p.links.img || p.links.photo).trim();
			if (/^www/.test(img)) img = 'http://' + img;
			if (/:\/\//.test(img)) { o['img'] = { 'tgt': img }; ok = true; }
		}
		if (p.links.url) {
			var url = p.links.url.trim();
			if (!/:\/\//.test(url)) url = 'http://' + url;
			o['URL'] = { 'tgt': url, 'txt': url.replace(/^https?:\/\//, '') };
			ok = true;
		}
		if (p.links.fb) {
			var fb = p.links.fb.trim().replace(/^(https?:\/\/)?(www\.)?facebook.com(\/#!)?\//, '');
			o['Facebook'] = { 'txt': fb };
			if (/[^a-zA-Z0-9.]/.test(fb) && !/^pages\//.test(fb)) fb = 'search.php?q=' + encodeURI(fb).replace(/%20/g, '+');
			o['Facebook']['tgt'] = 'https://www.facebook.com/' + fb;
			ok = true;
		}
		if (p.links.twitter) {
			var tw = p.links.twitter.trim().replace(/[@＠﹫]/g, '').replace(/^(https?:\/\/)?(www\.)?twitter.com(\/#!)?\//, '');
			o['Twitter'] = { 'txt': '@' + tw };
			if (/[^a-zA-Z0-9_]/.test(tw)) tw = 'search/users?q=' + encodeURI(tw).replace(/%20/g, '+');
			o['Twitter']['tgt'] = 'https://www.twitter.com/' + tw;
			ok = true;
		}
	}
	return ok ? o : false;
}


// ------------------------------------------------------------------------------------------------ array comparison

KonOpas.arrays_equal = function(a, b) {
	if (!a || !b) return false;
	if (a.length != b.length) return false;
	for (var i = 0; i < a.length; ++i) {
		if (a[i] != b[i]) return false;
	}
	return true;
}

KonOpas.array_overlap = function(a, b) {
	if (!a || !b) return 0;
	if (a.length > b.length) return KonOpas.array_overlap(b, a);
	var n = 0, i, j;
	for (i = 0; i < a.length; ++i) {
		for (j = 0; j < b.length; ++j) if (a[i] == b[j]) { ++n; break; }
	}
	return n;
}


// ------------------------------------------------------------------------------------------------ DOM manipulation

KonOpas.popup_open = function(ev) {
	ev = ev || window.event;
	if (ev.which != 1) return;
	var src_el = ev.target, pop_el = src_el.nextElementSibling;
	if (!pop_el || !pop_el.classList.contains('popup')) {
		if (src_el.href && /\.(gif|jpe?g|png)$/i.test(src_el.href)) {
			pop_el = _new_elem('img', 'popup');
			pop_el.src = src_el.href;
			src_el.parentNode.insertBefore(pop_el, src_el.nextSibling);
		} else return;
	}
	var wrap_el = _new_elem('div', 'popup-wrap');
	wrap_el.onclick = function() {
		pop_el.parentNode.removeChild(pop_el);
		wrap_el.parentNode.removeChild(wrap_el);
		src_el.parentNode.insertBefore(pop_el, src_el.nextSibling);
	};
	var pop_title = pop_el.getAttribute('data-title') || '';
	if (pop_title) wrap_el.appendChild(_new_elem('div', 'popup-title', pop_title));
	pop_el.parentNode.removeChild(pop_el);
	wrap_el.appendChild(pop_el);
	document.body.appendChild(wrap_el);
	if (src_el.href) ev.preventDefault();
}

KonOpas.toggle_collapse = function(ev) {
	ev = ev || window.event;
	var title = ev.target, body = title && title.nextElementSibling;
	if (!body) return;
	if (window.getComputedStyle(body).getPropertyValue('display') == 'none') {
		title.classList.remove('collapse');
		title.classList.add('collapse-open');
	} else {
		title.classList.add('collapse');
		title.classList.remove('collapse-open');
	}
}


// ------------------------------------------------------------------------------------------------ time & date

KonOpas.pretty_time = function(t, opt) {
	function pre0(n) { return (n < 10 ? '0' : '') + n; }
	function _pretty_time(h, m) {
		if (opt.time_show_am_pm) {
			var h12 = h % 12; if (h12 == 0) h12 = 12;
			var m_str = ((m == 0) && opt.abbrev_00_minutes ) ? '' : ':' + pre0(m);
			return h12 + m_str + (h < 12 ? 'am' : 'pm');
		} else {
			return pre0(h) + ':' + pre0(m);
		}
	}
	opt = opt || {};
	if (t instanceof Date) {
		return _pretty_time(t.getHours(), t.getMinutes());
	} else if (typeof t == 'string' || t instanceof String) {
		if (opt.time_show_am_pm) {
			var a = t.split(':'); // hh:mm
			return _pretty_time(parseInt(a[0], 10), parseInt(a[1], 10));
		} else return t;
	} else return '';
}

KonOpas.pretty_time_diff = function(t) {
	var d = (Date.now() - t) / 1e3,
	    a = Math.abs(d),
	    s = [1, 60, 60, 24, 7, 4.333, 12, 1e9];
	if (a < 20) return i18n.txt('just now');
	for (var i = 0, l = s.length; i < l; ++i) {
		if ((a /= s[i]) < 2) return i18n.txt('time_diff', { 'T':~~(a *= s[i]), 'T_UNIT':i-1, 'T_PAST':d>0 });
	}
}

KonOpas.parse_date = function(day_str) {
	if (!day_str) return false;
	var a = day_str.match(/(\d+)/g); if (!a || (a.length < 3)) return false;
	var y = parseInt(a[0], 10), m = parseInt(a[1], 10), d = parseInt(a[2], 10);
	if (!y || !m || !d) return false;
	return new Date(y, m - 1, d, 12);
}

KonOpas.data_date = function(d) {
	function pre0(n) { return (n < 10 ? '0' : '') + n; }
	var t = (d instanceof Date) ? d : KonOpas.parse_date(d);
	return t.getFullYear() + '-' + pre0(t.getMonth() + 1) + '-' + pre0(t.getDate());
}

KonOpas.pretty_date = function(d, opt) {
	opt = opt || {};
	var o = { weekday: "long", month: "long", day: "numeric" },
	    t = (d instanceof Date) ? d : KonOpas.parse_date(d);
	if (!t) return d;
	if (Math.abs(t - Date.now()) > 1000*3600*24*60) o.year = "numeric";
	var s = t.toLocaleDateString(opt.lc, o);
	return s.charAt(0).toUpperCase() + s.slice(1);
}

KonOpas.time_sum = function(t0_str, m_str) {
	var t = 60 * t0_str.substr(0,2) + 1 * t0_str.substr(3,2) + 1 * m_str,
	    h = (t / 60) >> 0,
	    m = t - 60 * h;
	return '' + (h % 24) + ':' + (m<10?'0':'') + m;
}
