import i18n from '../src/i18n-wrap';

export function log(msg, lvl) {
	if (window.console) switch (lvl) {
		case 'error': console.error(msg); break;
		case 'warn':  console.warn(msg); break;
		default:      console.log(msg);
	}
}

export function new_elem(tag, cl, text, hide) {
	const e = document.createElement(tag);
	if (cl) e.className = cl;
	if (text) e.textContent = text;
	if (hide) e.style.display = 'none';
	return e;
}

export function link_to_short_url(url) {
	const u = encodeURIComponent(url.replace(/^http:\/\//, ''));
	return 'http://is.gd/create.php?url=' + u;
}

export function link_to_qr_code(url) {
	const u = encodeURIComponent(url.replace(/^http:\/\//, ''));
	return 'http://chart.apis.google.com/chart?cht=qr&chs=350x350&chl=' + u;
}

export function hash_encode(s) { return encodeURIComponent(s).replace(/%20/g, '+'); }
export function hash_decode(s) { return decodeURIComponent(s.replace(/\+/g, '%20')); }

export function glob_to_re(pat) {
	const re_re = new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\/-]', 'g');
	pat = pat.replace(re_re, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
	const terms = pat.match(/"[^"]*"|'[^']*'|\S+/g).map(el => '\\b' + el.replace(/^(['"])(.*)\1$/, '$2') + '\\b');
	return new RegExp(terms.join('|'), 'i');
}

export function prog_hash(tag_categories, filters, excl) {
	const p = [];
	if (filters) ['id', 'area', 'tag', 'query'].forEach((k) => {
		let v = filters[k + '_str'] || filters[k];
		if (excl && excl[k] || !v || (v === `all_${k}s`)) return;
		if ((k == 'tag') && tag_categories && tag_categories.length) {
            const tag_re = new RegExp('^(' + tag_categories.join('|') + '):(.*)');
			const m = v.match(tag_re);
			if (m) { k = m[1]; v = m[2]; }
		}
		p.push(k + ':' + hash_encode(v));
	});
	return p.length ? '#prog/' + p.join('/') : '#';
}


// ------------------------------------------------------------------------------------------------ storage

export class Store {
    constructor(id) {
        const err = Store.test();
        if (err) {
		    const data = {};
		    this.get = k => data[k];
		    this.set = (k, v) => { data[k] = v; };
		    this.limit = (e.name == 'SecurityError') ? 'FFcookies'
				       : ((e.code === DOMException.QUOTA_EXCEEDED_ERR) && (typeof sessionStorage != 'undefined') && (sessionStorage.length === 0)) ? 'IOSprivate'
				       : '?';
        } else {
            this.id = id;
            this.limit = '';
        }
    }

    static test() {
	    try {
		    sessionStorage.setItem('konopas.test_var', '1');
		    sessionStorage.removeItem('konopas.test_var', '1');
            return null;
	    } catch (e) {
            return e;
	    }
    }

    key(k) {
        return `konopas.${this.id}.${k}`;
    }

	get(k) {
		const v = sessionStorage.getItem(this.key(k));
		return v ? JSON.parse(v) : v;
	}

	set(k, v) {
		sessionStorage.setItem(this.key(k), JSON.stringify(v));
	}
}

export class VarStore {
	constructor() { this.data = {}; }
	getItem(k) { return this.data[k]; };
	setItem(k, v) { this.data[k] = v; };
}


// ------------------------------------------------------------------------------------------------ string generation

export function clean_name(p, span_parts) {
	let fn = '', ln = '';
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

export function clean_links(p) {
	if (!p || !p.links) return null;
	const o = {};
	let ok = false;
	if (p.links.img || p.links.photo) {
		let img = (p.links.img || p.links.photo).trim();
		if (/^www/.test(img)) img = 'http://' + img;
		if (/:\/\//.test(img)) { o.img = { tgt: img }; ok = true; }
	}
	if (p.links.url) {
		let url = p.links.url.trim();
		if (!/:\/\//.test(url)) url = 'http://' + url;
		o.URL = { tgt: url, txt: url.replace(/^https?:\/\//, '') };
		ok = true;
	}
	if (p.links.fb) {
		let fb = p.links.fb.trim().replace(/^(https?:\/\/)?(www\.)?facebook.com(\/#!)?\//, '');
		o.Facebook = { txt: fb };
		if (/[^a-zA-Z0-9.]/.test(fb) && !/^pages\//.test(fb)) fb = 'search.php?q=' + encodeURI(fb).replace(/%20/g, '+');
		o.Facebook.tgt = 'https://www.facebook.com/' + fb;
		ok = true;
	}
	if (p.links.twitter) {
		let tw = p.links.twitter.trim().replace(/[@＠﹫]/g, '').replace(/^(https?:\/\/)?(www\.)?twitter.com(\/#!)?\//, '');
		o.Twitter = { txt: '@' + tw };
		if (/[^a-zA-Z0-9_]/.test(tw)) tw = 'search/users?q=' + encodeURI(tw).replace(/%20/g, '+');
		o.Twitter.tgt = 'https://www.twitter.com/' + tw;
		ok = true;
	}
	return ok ? o : null;
}


// ------------------------------------------------------------------------------------------------ array comparison

export function arrays_equal(a, b) {
	if (!a || !b) return false;
	if (a.length != b.length) return false;
	for (let i = 0; i < a.length; ++i) {
		if (a[i] != b[i]) return false;
	}
	return true;
}

export function array_overlap(a, b) {
	if (!a || !b) return 0;
	if (a.length > b.length) return array_overlap(b, a);
	let n = 0, i, j;
	for (i = 0; i < a.length; ++i) {
		for (j = 0; j < b.length; ++j) if (a[i] == b[j]) { ++n; break; }
	}
	return n;
}


// ------------------------------------------------------------------------------------------------ DOM manipulation

export function popup_open(ev = window.event) {
	if (ev.which != 1) return;
	const src_el = ev.target, pop_el = src_el.nextElementSibling;
	if (!pop_el || !pop_el.classList.contains('popup')) {
		if (src_el.href && /\.(gif|jpe?g|png)$/i.test(src_el.href)) {
			const new_pop_el = new_elem('img', 'popup');
			new_pop_el.src = src_el.href;
			src_el.parentNode.insertBefore(new_pop_el, src_el.nextSibling);
		} else return;
	}
	const wrap_el = new_elem('div', 'popup-wrap');
	wrap_el.onclick = () => {
		pop_el.parentNode.removeChild(pop_el);
		wrap_el.parentNode.removeChild(wrap_el);
		src_el.parentNode.insertBefore(pop_el, src_el.nextSibling);
	};
	const pop_title = pop_el.getAttribute('data-title');
	if (pop_title) wrap_el.appendChild(new_elem('div', 'popup-title', pop_title));
	pop_el.parentNode.removeChild(pop_el);
	wrap_el.appendChild(pop_el);
	document.body.appendChild(wrap_el);
	if (src_el.href) ev.preventDefault();
}

export function toggle_collapse(ev = window.event) {
	const title = ev.target, body = title && title.nextElementSibling;
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

export function pretty_time(t, { time_show_am_pm, abbrev_00_minutes } = {}) {
	function pre0(n) { return (n < 10 ? '0' : '') + n; }
    let h, m;
	if (t instanceof Date) {
        h = t.getHours();
        m = t.getMinutes();
	    if (!time_show_am_pm) return pre0(h) + ':' + pre0(m);
	} else if (typeof t == 'string' || t instanceof String) {
        // hh:mm
	    if (!time_show_am_pm) return t;
		const a = t.split(':');
        h = parseInt(a[0], 10);
        m = parseInt(a[1], 10);
	} else return '';

	let h12 = h % 12; if (h12 == 0) h12 = 12;
	const m_str = ((m == 0) && abbrev_00_minutes ) ? '' : ':' + pre0(m);
	return h12 + m_str + (h < 12 ? 'am' : 'pm');
}

export function pretty_time_diff(t) {
	const d = (Date.now() - t) / 1e3;
	const s = [1, 60, 60, 24, 7, 4.333, 12, 1e9];
	let a = Math.abs(d);
	if (a < 20) return i18n.txt('just now');
	for (let i = 0, l = s.length; i < l; ++i) {
		if ((a /= s[i]) < 2) return i18n.txt('time_diff', { T: ~~(a *= s[i]), T_UNIT: i-1, T_PAST: d>0 });
	}
}

export function parse_date(day_str) {
    // yyyy-mm-dd
	if (!day_str) return null;
	const a = day_str.match(/\d+/g) || [];
    const [y, m, d] = a.map(s => parseInt(s, 10));
    return (y && m && d) ? new Date(y, m - 1, d, 12) : null;
}

export function data_date(d) {
	function pre0(n) { return (n < 10 ? '0' : '') + n; }
	const t = (d instanceof Date) ? d : parse_date(d);
	return t.getFullYear() + '-' + pre0(t.getMonth() + 1) + '-' + pre0(t.getDate());
}

let toLocaleDateString = (date, options) => date.toLocaleDateString(i18n.locale, options);
if (function(){
	try { new Date().toLocaleDateString('i'); }
	catch (e) { return e.name !== 'RangeError'; }
	return true;
}()) {
	toLocaleDateString = (date, options) => {
		if (!options) return date.toLocaleDateString();
		const w = i18n.txt('weekday_n', { N: date.getDay() });
		const d = date.getDate();
		const m = i18n.txt('month_n', { N: date.getMonth() });
		let s = w + ', ' + d + ' ' + m;
		if (options && options.year) s += ' ' + date.getFullYear();
		return s;
	};
}

export function pretty_date(d) {
	const options = { weekday: 'long', month: 'long', day: 'numeric' };
	const date = (d instanceof Date) ? d : parse_date(d);
	if (!date) return d;
	if (Math.abs(date - Date.now()) > 1000*3600*24*60) options.year = 'numeric';
	const s = toLocaleDateString(date, options);
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function time_sum(t0_str, m_str) {
	const t = 60 * t0_str.substr(0,2) + 1 * t0_str.substr(3,2) + 1 * m_str;
	const h = (t / 60) >> 0;
	const m = t - 60 * h;
	return '' + (h % 24) + ':' + (m<10?'0':'') + m;
}
