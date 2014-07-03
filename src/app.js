/*  KonOpas -- https://github.com/eemeli/konopas
 *  Copyright (c) 2013 by Eemeli Aro <eemeli@gmail.com>
 *
 *  A mobile-friendly guide for conventions, with all sorts of spiffy features.
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


"use strict";

var ko = {
	// these are default values, use konopas_set to override
	'id': '',
	'lc': 'en',
	'full_version': !navigator.userAgent.match(/Android [12]/),
	'tag_categories': false,
	'default_duration': 60,
	'time_show_am_pm': false,
	'abbrev_00_minutes': true, // only for am/pm time
	'always_show_participants': false,
	'expand_all_max_items': 100,
	'show_all_days_by_default': false,
	'non_ascii_people': false, // setting true enables correct but slower sort
	'use_server': false,
	'log_messages': true
};
if (typeof konopas_set == 'object') for (var i in konopas_set) ko[i] = konopas_set[i];

var i18n_txt = function(key){ return key; };
if ((typeof i18n != 'undefined') && i18n[ko.lc]) {
	i18n_txt = function(key, data){ return key in i18n[ko.lc] ? i18n[ko.lc][key](data) : key; };
	i18n_translate_html(i18n[ko.lc], 'data-txt');
}

if (!ko.id) alert(i18n_txt('no_ko_id'));
if (!Array.prototype.indexOf || !Array.prototype.filter || !Array.prototype.map || !Date.now || !('localStorage' in window)) alert(i18n_txt('old_browser'));
var stars = new Stars(ko.id);
var server = ko.use_server && window.Server && new Server(ko.id, stars);

// ------------------------------------------------------------------------------------------------ utilities
function link_to_short_url(url) {
	return 'http://is.gd/create.php?url=' + encodeURIComponent(url.replace(/^http:\/\//, ''));
}

function link_to_qr_code(url) {
	return 'http://chart.apis.google.com/chart?cht=qr&chs=350x350&chl=' + encodeURIComponent(url.replace(/^http:\/\//, ''));
}

function _log(msg, lvl) {
	if (ko.log_messages && window.console) switch (lvl) {
		case 'error': console.error(msg); break;
		case 'warn':  console.warn(msg); break;
		default:      console.log(msg);
	}
}

function EL(id) { return id && document.getElementById(id); }

function _new_elem(tag, cl, text, hide) {
	var e = document.createElement(tag);
	if (cl) e.className = cl;
	if (text) e.textContent = text;
	if (hide) e.style.display = 'none';
	return e;
}

function _set_class(el, cl, set) { el.classList[set ? 'add' : 'remove'](cl); }

function selected_id(parent_id) {
	var par = EL(parent_id); if (!par) return '';
	var sel = par.getElementsByClassName('selected');
	return sel.length ? sel[0].id : '';
}

function hash_encode(s) { return encodeURIComponent(s).replace(/%20/g, '+'); }

function hash_decode(s) { return decodeURIComponent(s.replace(/\+/g, '%20')); }


function i18n_translate_html(map, a) {
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


function popup_open(ev) {
	ev = ev || window.event;
	if (ev.which != 1) return;
	var src_el = ev.target;
	var pop_el = src_el.nextElementSibling;
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


function pre0(n) { return (n < 10 ? '0' : '') + n; }

function string_date(t) {
	if (!t) t = new Date();
	return t.getFullYear() + '-' + pre0(t.getMonth() + 1) + '-' + pre0(t.getDate());
}

function string_time(t) {
	if (!t) t = new Date();
	return pre0(t.getHours()) + ':' + pre0(t.getMinutes());
}

function _pretty_time(h, m) {
	if (ko.time_show_am_pm) {
		var h12 = h % 12; if (h12 == 0) h12 = 12;
		var m_str = ((m == 0) && ko.abbrev_00_minutes ) ? '' : ':' + pre0(m);
		return h12 + m_str + (h < 12 ? 'am' : 'pm');
	} else {
		return pre0(h) + ':' + pre0(m);
	}
}
function pretty_time(t) {
	if (t instanceof Date) {
		return _pretty_time(t.getHours(), t.getMinutes());
	} else if (typeof t == 'string' || t instanceof String) {
		if (ko.time_show_am_pm) {
			var a = t.split(':'); // hh:mm
			return _pretty_time(parseInt(a[0], 10), parseInt(a[1], 10));
		} else return t;
	} else {
		return '';
	}
}

function pretty_time_diff(t) {
	var d = (Date.now() - t) / 1e3,
	    a = Math.abs(d),
	    s = [1, 60, 60, 24, 7, 4.333, 12, 1e9];
	if (a < 20) return i18n_txt('just now');
	for (var i = 0, l = s.length; i < l; ++i) {
		if ((a /= s[i]) < 2) return i18n_txt('time_diff', {'T':~~(a *= s[i]), 'T_UNIT':i-1, 'T_PAST':d>0 });
	}
}

function parse_date(day_str) {
	var a = day_str.match(/(\d+)/g); if (a.length < 3) return false;
	var y = parseInt(a[0], 10), m = parseInt(a[1], 10), d = parseInt(a[2], 10);
	if (!y || !m || !d) return false;
	return new Date(y, m - 1, d);
}

function pretty_date(d) {
	var o = { weekday: "long", month: "long", day: "numeric" },
	    t = (d instanceof Date) ? d : parse_date(d);
	if (!t) return d;
	if (Math.abs(t - Date.now()) > 1000*3600*24*60) o.year = "numeric";
	var s = t.toLocaleDateString(ko.lc, o);
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function time_sum(t0_str, m_str) {
	var t1 = 60 * t0_str.substr(0,2) + 1 * t0_str.substr(3,2) + 1 * m_str;
	var h = (t1 / 60) >> 0;
	var m = t1 - 60 * h;
	return pre0(h % 24) + ':' + pre0(m);
}

function storage_get(name) {
	var v = sessionStorage.getItem('konopas.' + ko.id + '.' + name);
	return v ? JSON.parse(v) : v;
}

var private_browsing_noted = false;
function storage_set(name, value) {
	try {
		sessionStorage.setItem('konopas.' + ko.id + '.' + name, JSON.stringify(value));
	} catch (e) {
		if ((e.code === DOMException.QUOTA_EXCEEDED_ERR) && (sessionStorage.length === 0)) {
			if (!private_browsing_noted) {
				alert(i18n_txt('private_mode'));
				private_browsing_noted = true;
			}
		} else throw e;
	}
}

function GlobToRE(pat) {
	var re_re = new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\/-]', 'g');
	pat = pat.replace(re_re, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

	var terms = pat.match(/"[^"]*"|'[^']*'|\S+/g).map(function(el){
		var t = '\\b' + el.replace(/^(['"])(.*)\1$/, '$2') + '\\b';
		return t; //.replace('\\b.*', '').replace('.*\\b', '');
	});

	return new RegExp(terms.join('|'), 'i');
}

var views = [ "next", "star", "prog", "part", "info" ];
function set_view(new_view) {
	var cl = document.body.classList;
	for (var i = 0; i < views.length; ++i) {
		cl[new_view == views[i] ? 'add' : 'remove'](views[i]);
	}
}

function clean_name(p, span_parts) {
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

function clean_links(p) {
	var ok = false;
	var o = {};

	if ('links' in p) {
		if (('img' in p.links) && p.links.img) {
			var img = p.links.img.trim();
			if (/^www/.exec(img)) img = 'http://' + img;
			if (/:\/\//.exec(img)) { o['img'] = img; ok = true; }
		}

		if (('url' in p.links) && p.links.url) {
			var url = p.links.url.trim();
			if (!/:\/\//.exec(url)) url = 'http://' + url;
			o['url'] = url; ok = true;
		}

		if (('fb' in p.links) && p.links.fb) {
			var fb = p.links.fb.trim();
			fb = fb.replace(/^(https?:\/\/)?(www\.)?facebook.com(\/#!)?\//, '');
			if (/[^a-zA-Z0-9.]/.exec(fb) && !/^pages\//.exec(fb)) fb = 'search.php?q=' + encodeURI(fb).replace(/%20/g, '+');
			o['fb'] = fb; ok = true;
		}

		if (('twitter' in p.links) && p.links.twitter) {
			var tw = p.links.twitter.trim();
			tw = tw.replace(/[@＠﹫]/g, '').replace(/^(https?:\/\/)?(www\.)?twitter.com(\/#!)?\//, '');
			if (/[^a-zA-Z0-9_]/.exec(tw)) tw = 'search/users?q=' + encodeURI(tw).replace(/%20/g, '+');
			o['twitter'] = tw; ok = true;
		}
	}

	return ok ? o : false;
}

function arrays_equal(a, b) {
	if (!a || !b) return false;
	var a_len = a.length;
	if (a_len != b.length) return false;
	for (var i = 0; i < a_len; ++i) {
		if (a[i] != b[i]) return false;
	}
	return true;
}

function array_overlap(a, b) {
	if (!a || !b) return 0;
	var a_len = a.length, b_len = b.length;
	if (a_len > b_len) return array_overlap(b, a);

	var n = 0;
	for (var i = 0; i < a_len; ++i) {
		for (var j = 0; j < b_len; ++j) if (a[i] == b[j]) { ++n; break; }
	}
	return n;
}



// ------------------------------------------------------------------------------------------------ items

function _item_people(it) {
	if (!it.people || !it.people.length) return '';
	var a = it.people.map((typeof people == 'undefined') || !people.length
		? function(p) { return p.name; }
		: function(p) { return "<a href=\"#part/" + hash_encode(p.id) + "\">" + p.name + "</a>"; }
	);
	return '<div class="item-people">' + a.join(', ') + '</div>\n';
}

function _item_tags(it) {
	if (!it.tags || !it.tags.length) return '';
	var o = {};
	it.tags.forEach(function(t) {
		var cat = 'tags';
		var tgt = _prog_hash({'tag': t});
		var a = t.split(':');
		if (a.length > 1) { cat = a.shift(); t = a.join(':'); }
		var link = '<a href="' + tgt + '">' + t + '</a>'
		if (o[cat]) o[cat].push(link);
		else o[cat] = [link];
	});
	var a = []; for (var k in o) a.push(i18n_txt('item_tags', {'T':k}) + ': ' + o[k].join(', '));
	return '<div class="discreet">' + a.join('<br>') + '</div>\n';
}

function _item_loc_str(it) {
	var s = '';
	if (it.loc && it.loc.length) {
		s = it.loc[0];//.replace(/ \([\w\/]+\)$/, ''); // HACK for LSC extraneous info in loc[0]
		if (it.loc.length > 1) s += ' (' + it.loc.slice(1).join(', ') + ')';
	}
	if (it.mins && (it.mins != ko.default_duration)) {
		if (s) s += ', ';
		s += pretty_time(it.time) + ' - ' + pretty_time(time_sum(it.time, it.mins));
	}
	return s;
}

function _item_sort(a, b) {
	if (a.date < b.date) return -1;
	if (a.date > b.date) return  1;
	if (a.time < b.time) return -1;
	if (a.time > b.time) return  1;
	if (a.loc.length < b.loc.length) return -1;
	if (a.loc.length > b.loc.length) return  1;
	for (var i = a.loc.length - 1; i >= 0; --i) {
		if (a.loc[i] < b.loc[i]) return -1;
		if (a.loc[i] > b.loc[i]) return  1;
	}
	return 0;
}

function _item_show_extra(item, id) {
	if (EL("e" + id)) return;

	var html = "";
	var a = program.filter(function(el) { return el.id == id; });
	if (a.length < 1) html = i18n_txt('item_not_found', {'ID':id});
	else {
		html = _item_tags(a[0]) + _item_people(a[0]);
		if (a[0].desc) html += "<p>" + a[0].desc;
	}
	var extra = _new_elem('div', 'extra');
	extra.id = 'e' + id;
	extra.innerHTML = html;
	item.appendChild(extra);
	if (server) server.show_extras(id, item);
}

var _item_el = (function() {
	var frame = _new_elem('div', 'item_frame');
	var star = frame.appendChild(_new_elem('div', 'item_star'));
	var item = frame.appendChild(_new_elem('div', 'item'));
	var title = item.appendChild(_new_elem('div', 'title'));
	var loc   = item.appendChild(_new_elem('div', 'loc'));
	var votes = ko.use_server ? item.appendChild(_new_elem('div', 'votes')) : {'id':''};
	if (ko.use_server) {
		votes.textContent = i18n_txt('Votes') + ': ';
		votes.appendChild(_new_elem('a', 'v_pos', '+0')).title = 'good';
		votes.appendChild(document.createTextNode(' / '));
		votes.appendChild(_new_elem('a', 'v_neg', '-0')).title = 'not so good';
	}

	return function(it) {
		star.id = 's' + it.id;
		item.id = 'p' + it.id;
		title.textContent = it.title;
		loc.textContent = _item_loc_str(it);
		votes.id = 'v' + it.id;
		return frame.cloneNode(true);
	};
})();

function item_show_list(ls, show_id) {
	var frag = document.createDocumentFragment();
	var prev_date = "", prev_time = "";
	if ((ls.length > (show_id ? 1 : 0)) && (ls.length < ko.expand_all_max_items)) {
		frag.appendChild(_new_elem('div', 'item_expander', '» '))
			.appendChild(_new_elem('a', 'js-link', i18n_txt('Expand all')))
			.id = 'item_expander_link';
	}
	for (var i = 0, l = ls.length; i < l; ++i) {
		if (ls[i].date != prev_date) {
			if (ls[i].date < prev_date) { item_show_list(ls.sort(_item_sort), show_id); return; }
			prev_date = ls[i].date;
			prev_time = "";

			frag.appendChild(_new_elem('div', 'new_day', pretty_date(ls[i].date)));
		}

		if (ls[i].time != prev_time) {
			if (ls[i].time < prev_time) { item_show_list(ls.sort(_item_sort), show_id); return; }
			prev_time = ls[i].time;
			frag.appendChild(document.createElement('hr'));
			frag.appendChild(_new_elem('div', 'new_time', pretty_time(ls[i].time)))
				.setAttribute('data-day', i18n_txt('weekday_short_n', { 'N': parse_date(ls[i].date).getDay() }));
		}

		frag.appendChild(_item_el(ls[i]));
	}

	var LS = EL('prog_ls');
	while (LS.firstChild) LS.removeChild(LS.firstChild);
	LS.appendChild(frag);

	if (server) server.decorate_list(LS);

	var expand_all = EL("item_expander_link");
	if (expand_all) expand_all.onclick = function() {
		var items = LS.getElementsByClassName("item");
		var exp_txt = i18n_txt('Expand all');
		if (expand_all.textContent == exp_txt) {
			for (var i = 0, l = items.length; i < l; ++i) {
				items[i].parentNode.classList.add("expanded");
				_item_show_extra(items[i], items[i].id.substr(1));
			}
			expand_all.textContent = i18n_txt('Collapse all');
		} else {
			for (var i = 0, l = items.length; i < l; ++i) {
				items[i].parentNode.classList.remove("expanded");
			}
			expand_all.textContent = exp_txt;
		}
	};

	var star_els = LS.getElementsByClassName("item_star");
	for (var i = 0, l = star_els.length; i < l; ++i) {
		star_els[i].onclick = function() { stars.toggle(this, this.id.substr(1)); return false; };
	}

	var star_list = stars.list();
	for (var i = 0, l = star_list.length; i < l; ++i) {
		var el = EL('s' + star_list[i]);
		if (el) el.classList.add("has_star");
	}

	if (show_id) {
		var it = document.getElementById('p' + show_id);
		if (it) {
			it.parentNode.classList.add("expanded");
			_item_show_extra(it, show_id);
			if (ls.length > 1) it.scrollIntoView();
		}
	}
}

function item_list_click(ev) {
	var el = (ev || window.event).target;
	var is_link = false;
	while (!/\bitem(_|$)/.test(el.className)) {
		if (el.id == 'prog_ls') return;
		if ((el.tagName.toLowerCase() == 'a') && el.href) is_link = true;
		el = el.parentNode;
	}
	if (!el.id || el.id[0] != 'p') return;

	var it_id = el.id.substr(1);
	var in_prog_view = document.body.classList.contains('prog');
	if (is_link) {
		if (in_prog_view) _prog_set_location_id(it_id);
	} else {
		var open = el.parentNode.classList.toggle("expanded");
		if (open) _item_show_extra(el, it_id);
		if (in_prog_view) _prog_set_location_id(open ? it_id : '');
	}
}



// ------------------------------------------------------------------------------------------------ next view

function update_next_select(t_off) {
	var ts = EL("next_time_select");
	if (!ts) return;

	var t_step = 30;
	var t_range = [-12 * t_step, 12 * t_step];
	var t = new Date();
	t.setMinutes(Math.floor(t.getMinutes()/15) * 15 + t_range[0]);
	ts.options.length = 0;
	for (var m = t_range[0]; m <= t_range[1]; m += t_step) {
		var opt = document.createElement('option');
		opt.value = m;
		opt.text = i18n_txt('weekday_n', {'N':t.getDay()}) + ', ' + pretty_time(t);
		if (m == t_off) opt.selected = true;
		if (!m) opt.id = 'next_time_select_now';
		ts.add(opt);
		t.setMinutes(t.getMinutes() + t_step);
	}

	ts.onchange = function() { update_next_list(selected_id("next_type")); }
	var tb = EL("next_earlier");
	if (tb) tb.onclick = function() { ts.selectedIndex = Math.max(ts.selectedIndex - 1, 0); ts.onchange(); };
	var ta = EL("next_later");
	if (ta) ta.onclick = function() { ts.selectedIndex = Math.min(ts.selectedIndex + 1, ts.length - 1); ts.onchange(); };
}

function update_next_list(next_type) {
	var ls = EL("next_time_select");
	var t_off = (ls.selectedIndex >= 0) ? parseInt(ls[ls.selectedIndex].value) : 0;
	if (!t_off) t_off = 0;
	update_next_select(t_off);

	var t = new Date();
	t.setMinutes(Math.floor(t.getMinutes()/15) * 15 + t_off);
	var t_date = string_date(t);
	var t_time = string_time(t);

	t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); // to match Date.parse() time below

	var next = {};
	var ms_next = 0;
	var ms_max = t.valueOf() + 60 * 60 * 1000;
	var n = 0;
	for (var i = 0, l = program.length; i < l; ++i) {
		var it = program[i];
		if (it.date < t_date) continue;
		if ((it.date == t_date) && (it.time < t_time)) continue;

		var ms_it = Date.parse(it.date + 'T' + it.time);
		if ((!ms_next || (ms_it < ms_next)) && (ms_it > ms_max)) ms_next = ms_it;

		if (next_type == "next_by_room") {
			if (it.loc) {
				if (next[it.loc[0]]) {
					if (next[it.loc[0]].date < it.date) continue;
					if ((next[it.loc[0]].date == it.date) && (next[it.loc[0]].time < it.loc[0])) continue;
				}
				next[it.loc[0]] = it;
			}
		} else {
			if (ms_it <= ms_max) next['n' + (++n)] = it;
		}
	}

	var next_prog = [];
	for (var k in next) next_prog.push(next[k]);

	if (next_prog.length > 0) {
		EL("next_start_note").textContent = '';
	} else if (ms_next) {
		var t0 = new Date();
		t0.setMinutes(t0.getMinutes() + t_off - t0.getTimezoneOffset());
		var min_next = Math.floor((ms_next - t0) / 60000);
		var h_next = Math.floor(min_next / 60);
		if (h_next >= 1) min_next -= h_next * 60;
		EL("next_start_note").textContent = i18n_txt('next_start', { 'H':h_next, 'M':min_next });
	} else {
		EL("next_start_note").textContent = i18n_txt('next_ended');
	}

	item_show_list(next_prog);
}

function update_next_filters(next_type) {
	if (next_type != "next_by_room") next_type = "next_by_hour";
	var ul = EL("next_type").getElementsByTagName("li");
	for (var i = 0, l = ul.length; i < l; ++i) {
		_set_class(ul[i], 'selected', (ul[i].id == next_type));
	}

	storage_set('next', { 'next_type': next_type })
}


function show_next_view() {
	set_view("next");

	var next_type = "next_by_hour";

	var store = storage_get('next') || {};
	if ('next_type' in store) next_type = store.next_type;

	update_next_list(next_type);
	update_next_filters(next_type);
}


function next_filter_click(ev) {
	var el = (ev || window.event).target;
	if (el.parentNode.id == 'next_type') {
		update_next_list(el.id);
		update_next_filters(el.id);
	}
}



// ------------------------------------------------------------------------------------------------ "my con" view

function show_star_view(opt) {
	set_view("star");
	var view = EL("star_data");

	var set_raw = (opt && (opt.substr(1,4) == 'set:')) ? opt.substr(5).split(',') : [];
	var set = program.filter(function(p) { return (set_raw.indexOf(p.id) >= 0); }).map(function(p) { return p.id; });
	set.sort();
	var set_len = set.length;

	var html = stars.persistent() ? '' : '<p>' + i18n_txt('star_no_memory', {'SERVER': !!server});
	var star_list = stars.list();
	star_list.sort();
	var stars_len = star_list.length;
	if (stars_len || set_len) {
		var set_link = '#star/set:' + star_list.join(',');
		if (set_len) {
			if (arrays_equal(set, star_list)) {
				html += '<p>' + i18n_txt('star_export_this', {'THIS':set_link})
					+ '<p>' + i18n_txt('star_export_share', {
						'SHORT':link_to_short_url(location.href), 'QR':link_to_qr_code(location.href)
					});
				if (server) server.show_ical_link(view);
			} else {
				var n_same = array_overlap(set, star_list);
				var n_new = set_len - n_same;
				var n_bad = set_raw.length - set_len;
				html += '<p>' + i18n_txt('star_import_this', {'THIS':location.href})
					+ '<p>' + i18n_txt('star_import_diff', { 'PREV':stars_len, 'NEW':n_new, 'SAME':n_same });
				if (n_bad) html += ' ' + i18n_txt('star_import_bad', {'BAD':n_bad});
				if (!stars_len || (n_same != stars_len)) {
					html += '<p>&raquo; <a href="#star" id="star_set_set">' + i18n_txt('star_set') + '</a>';
				}
				if (stars_len) {
					if (n_same != stars_len) {
						var d = [];
						if (n_new) d.push(i18n_txt('add_n', {'N':n_new}));
						d.push(i18n_txt('discard_n', {'N':stars_len - n_same}));
						html += ' (' + d.join(', ') + ')';
					}
					if (n_new) html += '<p>&raquo; <a href="#star" id="star_set_add">' + i18n_txt('star_add', {'N':n_new}) + '</a>';
				}
				var el_set = EL('star_set_set'); if (el_set) el_set.onclick = function() { stars.set(set); return true; };
				var el_add = EL('star_set_add'); if (el_add) el_add.onclick = function() { stars.add(set); return true; };
			}
		} else {
			html += '<p id="star_links">&raquo; ' + i18n_txt('star_export_link', { 'URL':set_link, 'N':stars_len });
		}
		var ls = program.filter(function(it) { return (star_list.indexOf(it.id) >= 0) || (set.indexOf(it.id) >= 0); });
		item_show_list(ls);

		if (set_len) {
			document.body.classList.add("show_set");
			for (var i = 0; i < set_len; ++i) {
				var el = EL('s' + set[i]);
				if (el) el.classList.add("in_set");
			}
		}
	} else {
		html += '<p>' + i18n_txt('star_hint');
		EL("prog_ls").innerHTML = '';
	}
	view.innerHTML = html;
}




// ------------------------------------------------------------------------------------------------ program view

function _prog_default_day() {
	var day_start = '', day_end = '';
	var el_dl = EL("day"); if (!el_dl) return '';
	var dl = el_dl.getElementsByTagName("li"); if (!dl || !dl.length) return '';
	for (var i = 0, l = dl.length; i < l; ++i) {
		var d = dl[i].id.substr(1);
		if (!d || d == 'll_days') continue;
		if (!day_start || (d < day_start)) day_start = d;
		if (!day_end || (d > day_end)) day_end = d;
	}
	var day_now = string_date();
	var day = (day_now > day_start) && (day_now <= day_end) ? day_now : day_start;
	return day;
}


function _prog_get_filters(hash_only) {
	var filters = { 'day':'', 'area':'', 'tag':'', 'query':'', 'id':'' };
	var h = window.location.toString().split('#')[1] || '';
	var h_set = false;
	if (h.substr(0, 4) == 'prog') {
		var p = h.substr(5).split('/');
		for (var i = 0; i < p.length; ++i) {
			var s = p[i].split(':');
			if ((s.length == 2) && s[0] && s[1]) {
				if (ko.tag_categories) for (var j = 0; j < ko.tag_categories.length; ++j) {
					if (s[0] == ko.tag_categories[j]) {
						s[1] = s[0] + ':' + s[1];
						s[0] = 'tag';
						break;
					}
				}
				filters[s[0]] = hash_decode(s[1]);
				h_set = true;
			}
		}
	}
	if (!hash_only && !h_set && !document.body.classList.contains('prog')) {
		var store = storage_get('prog');
		if (store) for (var k in store) {
			if (filters.hasOwnProperty(k)) filters[k] = store[k];
		}
	}
	return filters;
}

function _prog_hash(f0, fx) {
	var f = {}; for (var k in f0) f[k] = f0[k];
	if (fx)     for (var k in fx) f[k] = fx[k];
	var p = ['#prog'];
	for (var k in f) if (k && f[k]) {
		if ((k == 'area') && (f[k] == 'all_areas')) continue;
		if (k == 'tag') {
			if (f[k] == 'all_tags') continue;
			if (ko.tag_categories && (f[k].indexOf(':') !== -1)) {
				var s = f[k].split(':');
				for (var j = 0; j < ko.tag_categories.length; ++j) {
					if (s[0] == ko.tag_categories[j]) {
						k = s[0];
						f[k] = s[1];
						break;
					}
				}
			}
		}

		p.push(k + ':' + hash_encode(f[k]));
	}
	return p.length > 1 ? p.join('/') : '#';
}

function _prog_set_filters(f, silent) {
	if (silent && !(history && history.replaceState)) return false;
	storage_set('prog', f);

	var h = _prog_hash(f);
	var h_cur = window.location.toString().split('#')[1] || '';
	if (h_cur != h.substr(1)) {
		if (silent) {
			var loc = window.location.toString().split('#')[0] + h;
			history.replaceState({}, document.title, loc);
		} else {
			window.location.hash = h;
		}
		return true;
	}

	return false;
}

function _prog_set_location_id(id) {
	var f = _prog_get_filters(true);
	if (id && !f['day']) f['day'] = ko.show_all_days_by_default ? 'all_days' : _prog_default_day();
	f['id'] = id;
	return _prog_set_filters(f, true);
}


function _prog_filter(it) {
	if (this.day && it.date != this.day) return false;

	if (this.area) {
		if (this.area instanceof RegExp) {
			if (!this.area.test(it.loc.join(';'))) return false;
		} else {
			if (!it.loc || (it.loc.indexOf(this.area) < 0)) return false;
		}
	}

	if (this.tag) {
		if (this.tag instanceof RegExp) {
			if (!this.tag.test(it.title)) return false;
		} else {
			if (!it.tags || (it.tags.indexOf(this.tag) < 0)) return false;
		}
	}

	if (this.query) {
		var found = this.query.test(it.title) || this.query.test(it.desc) || (it.loc && this.query.test(it.loc[0]));
		if (!found && it.people) {
			for (var i = 0; i < it.people.length; ++i) {
				if (this.query.test(it.people[i].name)) { found = true; break; }
			}
		}
		if (!found) return false;
	}

	return true;
}

function _prog_show_list(f) {
	var area_str = f.area || '';
	if (f.area && EL(f.area)) {
		var t = EL(f.area).getAttribute("data-regexp");
		if (t) f.area = new RegExp(t);
	}

	var tag_str = f.tag || '';
	if (f.tag && EL(f.tag)) {
		var t = EL(f.tag).getAttribute("data-regexp");
		if (t) f.tag = new RegExp(t);
	}

	var query_str = f.query || '';
	if (f.query) f.query = GlobToRE(f.query);

	var id_only = !!f.id;
	if (id_only) for (var i in f) if ((i != 'id') && f[i]) {
		id_only = false;
		break;
	}
	var ls = program.filter(id_only ? function(it){ return it.id == f.id; } : _prog_filter, f);

	if (f.id) {
		var id_ok = false;
		for (var i = 0, l = ls.length; i < l; ++i) if (ls[i].id == f.id) {
			id_ok = true;
			break;
		}
		if (!id_ok) {
			f.id = '';
			if (_prog_set_filters(f)) return;
		}
	}

	if (f.area) f.area = area_str;
	if (f.tag) f.tag = tag_str;
	if (f.query) f.query = query_str;

	var fs = EL('filter_sum');
	if (fs) {
		var f0 = {};
		for (var k in f) f0[k] = f[k];
		f0['id'] = '';
		if (!f0['day']) f0['day'] = 'all_days';

		var _a = function(t, f0, fx) { return '<a href="' + _prog_hash(f0, fx) + '">' + t + '</a>'; }
		if (id_only) {
			fs.innerHTML = i18n_txt('filter_sum_id', { 'N':ls.length, 'TITLE':_a(ls[0].title, f0, {}), 'ID':_a(f.id, f0, {}) });
		} else {
			var d = { 'N':ls.length,
				'ALL': f.tag || f.day || f.area || f.query ? '' : _a(i18n_txt('all'), {}, 0),
				'TAG': f.tag ? _a(f.tag, f0, {'tag':''}) : '' };
			if (f.area) { d['GOT_AREA'] = true; d['AREA'] = _a(f.area, f0, {'area':''}); }
			if (f.query) {   d['GOT_Q'] = true;    d['Q'] = _a(f.query, f0, {'query':''}); }
			if (f.day) {   d['GOT_DAY'] = true;  d['DAY'] = _a(i18n_txt('weekday_n', {'N':parse_date(f.day).getDay()}), f0, {'day':'all_days'}); }
			fs.innerHTML = i18n_txt('filter_sum', d);
		}
	}

	item_show_list(ls, f.id);
}


function _prog_show_filters(f) {
	var prev = EL('prog_filters').getElementsByClassName('selected');
	if (prev) for (var i = prev.length - 1; i >= 0; --i) {
		var cl = prev[i].classList;
		if (cl.contains('popup-link')) prev[i].textContent = prev[i].getAttribute('data-title') || 'More...';
		cl.remove('selected');
	}

	for (var k in f) {
		if (k == 'query') {
			var q = EL("q");
			if (q) {
				q.value = f.query;
				if (f.query) q.classList.add('selected');
			}
		} else {
			var id = f[k];
			if (!id) id = 'all_' + k + 's';
			else if (id.match(/^[^a-zA-Z]/)) id = k[0] + id;
			var el = EL(id);
			if (el) {
				el.classList.add('selected');
				if (el.parentNode.id.match(/\d+$/)) {
					var p = el.parentNode.parentNode.firstChild;
					p.classList.add('selected');
					p.textContent = el.textContent;
				}
			}
		}
	}

	var qh = EL('q_hint');
	if (qh) {
		if (f.query) {
			if (/[?*"]/.test(f.query)) {
				qh.innerHTML = i18n_txt('search_hint');
				qh.removeAttribute('onmouseup');
				qh.style.cursor = 'auto';
			} else {
				qh.innerHTML = i18n_txt('search_hint') + ' ' + i18n_txt('search_example', {'X':f.query+'*'});
				qh.onmouseup = function() { EL('q').value = f.query + '*'; EL('q').focus(); EL('q').blur(); };
				qh.style.cursor = 'pointer';
			}
			qh.style.display = 'block';
		} else {
			qh.style.display = 'none';
		}
	}
}




// hashchange -> read filters from url + store -> set filters in html + store -> list items
function show_prog_view() {
	var f = _prog_get_filters();
	set_view("prog");
	if (_prog_set_filters(f)) return;

	if (!f.day && !f.id && !ko.show_all_days_by_default) f.day = _prog_default_day();

	_prog_show_filters(f);

	for (var k in f) {
		if (!k || !f[k] || (f[k] == 'all_' + k + 's')) { delete f[k]; continue; }
	}

	_prog_show_list(f);
}




// read filters from url + ev -> set new hash
function prog_filter_change(ev) {
	ev = ev || window.event;

	var key, value;
	switch (ev.type) {
		case 'click':
			if (ev.target.tagName.toLowerCase() != 'li') return;
			var popups = ev.target.getElementsByClassName('popup');
			if (popups && popups.length) return;
			key = ev.target.parentNode.id.replace(/\d+$/, '');
			value = ev.target.id;
			switch (key) {
				case 'day':  value = value.replace(/^d/, ''); break;
				case 'area': value = value.replace(/^a([^a-zA-Z])/, '$1'); break;
			}
			break;

		case 'submit':
			ev.preventDefault();
			// fallthrough
		case 'blur':
			key = 'query';
			value = EL("q").value;
			break;

		default: return;
	}

	var filters = _prog_get_filters();
	filters[key] = value;
	if (filters['id'] && (key != 'id')) filters['id'] = '';
	_prog_set_filters(filters);
}



// ------------------------------------------------------------------------------------------------ participant view

function show_participant(p) {
	var p_name = clean_name(p, false);
	var links = '';
	var img = '';
	var pl = clean_links(p);
	if (pl) {
		links += '<dl class="linklist">';
		for (var type in pl) {
			var tgt = pl[type];
			switch (type) {
				case 'url': links += '<dt>URL:<dd>'
					+ '<a href="' + tgt + '">' + tgt + '</a>';
					break;
				case 'twitter': links += '<dt>Twitter:<dd>'
					+ '<a href="https://www.twitter.com/' + tgt + '">@' + tgt + '</a>';
					break;
				case 'fb': links += '<dt>Facebook:<dd>'
					+ '<a href="https://www.facebook.com/' + tgt + '">/' + tgt + '</a>';
					break;
				case 'img':
					/*if (navigator.onLine) {
						img = '<a class="part_img" href="' + tgt + '"><img src="' + tgt + '" alt="' + i18n_txt('Photo') + ':' + p_name + '"></a>';
					} else*/ {
						links += '<dt>' + i18n_txt('Photo') + ':<dd>' + '<a href="' + tgt + '">' + tgt + '</a>';
					}
					break;
				default: links += '<dt>' + type + ':<dd>' + tgt;
			}
		}
		links += '</dl>';
	}
	EL("part_names").innerHTML = '';
	EL("part_info").innerHTML = 
		  '<h2 id="part_title">' + p_name + '</h2>'
		+ ((p.bio || img) ? ('<p>' + img + p.bio) : '')
		+ links;
	item_show_list(program.filter(function(it) { return p.prog.indexOf(it.id) >= 0; }));

	EL("top").scrollIntoView();
}

function _name_in_range(n0, range) {
	switch (range.length) {
		case 1:  return (n0 == range[0]);
		case 2:  return ko.non_ascii_people
			? (n0.localeCompare(range[0], ko.lc) >= 0) && (n0.localeCompare(range[1], ko.lc) <= 0)
			: ((n0 >= range[0]) && (n0 <= range[1]));
		default: return (range.indexOf(n0) >= 0);
	}
}

function show_participant_list(name_range) {
	var lp = !name_range ? people : people.filter(function(p) {
		var n0 = p.sortname[0].toUpperCase();
		return _name_in_range(n0, name_range);
	});

	EL('part_names').innerHTML = lp.map(function(p) {
		return '<li><a href="#part/' + hash_encode(p.id) + '">' + clean_name(p, true) + '</a></li>';
	}).join('');

	EL('part_info').innerHTML = '';
	EL('prog_ls').innerHTML = '';
}

function update_part_view(name_range, participant) {
	var el_nr = EL('name_range');
	if (el_nr) {
		var ll = el_nr.getElementsByTagName('li');
		for (var i = 0, l = ll.length; i < l; ++i) {
			_set_class(ll[i], 'selected', (ll[i].getAttribute('data-range') == name_range));
		}
	}

	var p_id = participant.substr(1);
	var i;
	for (i = 0, l = people.length; i < l; ++i) {
		if (people[i].id == p_id) { show_participant(people[i]); break; }
	}
	if (i == people.length) {
		participant = '';
		show_participant_list(name_range);
	}

	storage_set('part', { 'name_range': name_range, 'participant': participant });
}

function find_name_range(name) {
	var n0 = name[0].toUpperCase(); if (!n0) return '';
	var par = EL('name_range'); if (!par) return '';
	var ll = par.getElementsByTagName('li');
	for (var i = 0, l = ll.length; i < l; ++i) {
		var range = ll[i].getAttribute('data-range');
		if (range && _name_in_range(n0, range)) return range;
	}
	return '';
}

function show_part_view(opt) {
	if ((typeof people == 'undefined') || !people.length) window.location.hash = '';

	var store = storage_get('part') || {};
	var name_range = store.name_range || '';
	var participant = !document.body.classList.contains('part') && store.participant || '';

	set_view('part');

	if (opt) {
		var p_id = hash_decode(opt.substr(1));
		var pa = people.filter(function(p) { return p.id == p_id; });
		if (pa.length) {
			participant = 'p' + pa[0].id;
			name_range = find_name_range(pa[0].sortname);
		} else {
			window.location.hash = '#part';
			return;
		}
	} else if (participant) {
		window.location.hash = '#part/' + participant.substr(1);
		return;
	}

	if (!name_range) {
		var el_nr = EL('name_range');
		if (el_nr) name_range = el_nr.getElementsByTagName('li')[0].getAttribute('data-range');
	}

	update_part_view(name_range, participant);
}


function part_filter_click(ev) {
	var el = (ev || window.event).target;
	if (el.parentNode.id == 'name_range') {
		var name_range = el.getAttribute("data-range") || '';
		storage_set('part', { 'name_range': name_range, 'participant': '' });
		window.location.hash = '#part';
		update_part_view(name_range, '');
	}
}

function part_init() {
	if (typeof people == 'undefined') return;
	for (var i = 0, p; p = people[i]; ++i) {
		p.sortname = ((p.name[1] || '') + '  ' + p.name[0]).toLowerCase().replace(/^ +/, '');
		if (!ko.non_ascii_people) p.sortname = p.sortname.make_ascii();
	}
	people.sort(ko.non_ascii_people
		? function(a, b) { return a.sortname.localeCompare(b.sortname, ko.lc); }
		: function(a, b) { return a.sortname < b.sortname ? -1 : a.sortname > b.sortname; });
	EL("part_filters").onclick = part_filter_click;
}



// ------------------------------------------------------------------------------------------------ info view

var lu = EL('last-updated'), lu_time = 0;

function init_last_updated() {
	var cache_manifest = document.body.parentNode.getAttribute('manifest');
	if (lu && cache_manifest && (location.protocol == 'http:')) {
		var x = new XMLHttpRequest();
		x.onload = function() {
			lu_time = new Date(this.getResponseHeader("Last-Modified"));
			show_last_updated();
		};
		x.open('GET', cache_manifest, true);
		x.send();
	}
}

function show_last_updated() {
	if (!lu || !lu_time) return;
	var span = lu.getElementsByTagName('span')[0];
	span.textContent = pretty_time_diff(lu_time);
	span.title = lu_time.toLocaleString();
	span.onclick = function(ev) {
		var self = (ev || window.event).target;
		var tmp = self.title;
		self.title = self.textContent;
		self.textContent = tmp;
	};
	lu.style.display = 'inline';
}

function show_info_view() {
	set_view("info");
	show_last_updated();
	EL("prog_ls").innerHTML = "";
}



// ------------------------------------------------------------------------------------------------ init


EL('prog_ls').onclick = item_list_click;

EL('next_filters').onclick = next_filter_click;


// init prog view
var pf = EL('prog_filters');
pf.onclick = prog_filter_change;

var pl = pf.getElementsByClassName('popup-link');
for (var i = 0; i < pl.length; ++i){
	pl[i].setAttribute('data-title', pl[i].textContent);
	pl[i].nextElementSibling.onclick = prog_filter_change;
}

var sf = EL('search');
if (sf) {
	sf.onsubmit = EL('q').onblur = prog_filter_change;
	sf.onreset = function() { _prog_set_filters({}); };
}


// init part view
part_init();


// set up fixed time display
if (EL("scroll_link")) {
	EL("scroll_link").onclick = function() { EL("top").scrollIntoView(); return false; };
	var prev_scroll = { "i": 0, "top": 0 };
	var n = 0;
	if (ko.full_version) { window.onscroll = function() {
		var st = window.pageYOffset;

		EL("scroll").style.display = (st > 0) ? 'block' : 'none';

		st += 20; // to have more time for change behind new_time
		var te = EL("time"); if (!te) return;
		var tl = document.getElementsByClassName("new_time"); if (!tl.length) return;
		if (st < tl[0].offsetTop) {
			prev_scroll.i = 0;
			prev_scroll.top = tl[0].offsetTop;
			te.style.display = "none";
		} else {
			var i = prev_scroll.top ? prev_scroll.i : 1;
			if (i >= tl.length) i = tl.length - 1;
			if (st > tl[i].offsetTop) {
				while ((i < tl.length) && (st > tl[i].offsetTop)) ++i;
				--i;
			} else {
				while ((i >= 0) && (st < tl[i].offsetTop)) --i;
			}
			if (i < 0) i = 0;

			prev_scroll.i = i;
			prev_scroll.top = tl[i].offsetTop;
			te.textContent = tl[i].getAttribute('data-day') + '\n' + tl[i].textContent;
			te.style.display = "block";
		}
	};} else {
		EL("time").style.display = "none";
		EL("scroll").style.display = "none";
	}
}


// init info view
init_last_updated();


var pl = document.getElementsByClassName('popup-link');
for (var i = 0; i < pl.length; ++i) pl[i].addEventListener('click', popup_open);



function init_view() {
	var opt = window.location.hash.substr(1);
	switch (opt.substr(0,4)) {
		case 'next': show_next_view(); break;
		case 'star': show_star_view(opt.substr(4)); break;
		case 'part': show_part_view(opt.substr(4)); break;
		case 'info': show_info_view(); break;
		default:     show_prog_view(); break;
	}

	if (EL("load_disable")) EL("load_disable").style.display = "none";
}

init_view();
window.onhashchange = init_view;


if (EL('refresh')) window.addEventListener('load', function() {
	var cache = window.applicationCache;
	cache.addEventListener('updateready', function() {
		if (cache.status == cache.UPDATEREADY) {
			EL('refresh').classList.add('enabled');
			EL('refresh').onclick = function() { window.location.reload(); };
		}
	}, false);
	if (cache.status != cache.UNCACHED) {
		window.setInterval(function() { cache.update(); }, 3600000);
	}
}, false);
