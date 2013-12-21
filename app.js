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


var ko = {
	// these are default values, use konopas_set to override
	'id': '',
	'full_version': !navigator.userAgent.match(/Android [12]/),
	'default_duration': 60,
	'time_show_am_pm': false,
	'abbrev_00_minutes': true, // only for am/pm time
	'always_show_participants': false,
	'expand_all_max_items': 100,
	'show_all_days_by_default': false
};
if (typeof konopas_set == 'object') for (var i in konopas_set) ko[i] = konopas_set[i];
if (!ko.id) alert("No ID set! Please assign konopas_set.id a unique identifier.");


if (!Array.prototype.indexOf || !Array.prototype.filter || !Array.prototype.map || !Date.now || !('localStorage' in window))
	alert("Unfortunately, your browser doesn't support some of the Javascript features required by KonOpas. To use, please try a different browser.");


var stars = new Stars(ko.id);
var server = new Server(ko.id, stars);

// ------------------------------------------------------------------------------------------------ utilities
function link_to_short_url(url) {
	return 'http://is.gd/create.php?url=' + encodeURIComponent(url.replace(/^http:\/\//, ''));
}

function link_to_qr_code(url) {
	return 'http://chart.apis.google.com/chart?cht=qr&chs=350x350&chl=' + encodeURIComponent(url.replace(/^http:\/\//, ''));
}

function EL(id) { return document.getElementById(id); }

function _new_elem(tag, cl, text, hide) {
	var e = document.createElement(tag);
	if (cl) e.className = cl;
	if (text) e.textContent = text;
	if (hide) e.style.display = 'none';
	return e;
}

function _set_class(el, cl, set) { el.classList[set ? 'add' : 'remove'](cl); }

function selected_id(parent_id) {
	var par = EL(parent_id); if (!par) return "";
	var sel = par.getElementsByClassName("selected"); if (!sel.length) return "";
	return sel[0].id;
}

function make_popup_menu(root_id, disable_id) {
	var el = EL(root_id);
	if (!el) return;

	el.onclick = function(ev) {
		if (el.classList.contains("show_box")) {
			EL(disable_id).style.display = "none";
			el.classList.remove("show_box");
		} else {
			EL(disable_id).style.display = "block";
			el.classList.add("show_box");
		}
	};
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

function weekday(t, utc) {
	return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][utc ? t.getUTCDay() : t.getDay()];
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
function pretty_time(t, utc) {
	if (t instanceof Date) {
		return utc ? _pretty_time(t.getUTCHours(), t.getUTCMinutes()) : _pretty_time(t.getHours(), t.getMinutes());
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
	var diff = (Date.now() - t) / 1e3,
	       u = ["seconds", "minutes", "hours", "days", "weeks", "months", "years"],
	       s = [1, 60, 60, 24, 7, 4.333, 12, 1e9],
	   tense = (diff < 0 ? " from now" : " ago");
	diff = Math.abs(diff);
	if (diff < 20) return "just now";
	for (var i = 0, l = s.length; i < l; ++i) {
		if ((diff /= s[i]) < 2) return ~~(diff *= s[i]) + " " + u[i-1] + tense;
	}
}

function pretty_date(t) {
	var s = weekday(t, true);
	var td = t - Date.now();
	if ((td < 0) || (td > 1000*3600*24*6)) {
		s += ', ' + t.getUTCDate() + ' ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][t.getUTCMonth()];
		if (Math.abs(td) > 1000*3600*24*60) s += ' ' + t.getUTCFullYear();
	}

	return s;
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
				alert("It looks like you're using an iOS or Safari browser in private mode, which disables localStorage. This will result in a suboptimal KonOpas experience.");
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
	document.body.className = new_view;
	storage_set('view', new_view);
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
			ln = p.name[1] + ', ' + p.name[3];
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
	var a = it.people.map(function(p) {
		return "<a href=\"#part/" + encodeURIComponent(p.id) + "\">" + p.name + "</a>";
	});
	return '<div class="item-people">' + a.join(', ') + '</div>\n';
}

function _item_tags(it) {
	if (!it.tags || !it.tags.length) return '';
	var a = it.tags.map(function(t) {
		return '<a href="#prog/tag:' + encodeURIComponent(t) + '">' + t + '</a>';
	});
	return '<div class="discreet">Tags: ' + a.join(', ') + '</div>\n';
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
	if (a.length < 1) html = "Program id <b>" + id + "</b> not found!";
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

(function() {
	var frame = _new_elem('div', 'item_frame');
	var star = frame.appendChild(_new_elem('div', 'item_star'));
	var item = frame.appendChild(_new_elem('div', 'item'));
	var title = item.appendChild(_new_elem('div', 'title'));
	var loc   = item.appendChild(_new_elem('div', 'loc'));
	var votes = item.appendChild(_new_elem('div', 'votes'));
	votes.appendChild(_new_elem('a', 'v_pos', '+0')).title = 'good';
	votes.appendChild(document.createTextNode(' / '));
	votes.appendChild(_new_elem('a', 'v_neg', '-0')).title = 'not so good';

	this._item_el = function(it) {
		star.id = 's' + it.id;
		item.id = 'p' + it.id;
		title.textContent = it.title;
		loc.textContent = _item_loc_str(it);
		votes.id = 'v' + it.id;
		return frame.cloneNode(true);
	};
})();

function item_show_list(ls) {
	var frag = document.createDocumentFragment();
	var prev_date = "", day_str = "", prev_time = "";
	if ((ls.length > 0) && (ls.length < ko.expand_all_max_items)) {
		frag.appendChild(_new_elem('div', 'item_expander', '» '))
			.appendChild(_new_elem('a', 'js-link', 'Expand all items'))
			.id = 'item_expander_link';
	}
	for (var i = 0, l = ls.length; i < l; ++i) {
		if (ls[i].date != prev_date) {
			if (ls[i].date < prev_date) { item_show_list(ls.sort(_item_sort)); return; }
			prev_date = ls[i].date;
			prev_time = "";

			var t = new Date(ls[i].date);
			day_str = pretty_date(t);
			frag.appendChild(_new_elem('div', 'new_day', day_str));
		}

		if (ls[i].time != prev_time) {
			if (ls[i].time < prev_time) { item_show_list(ls.sort(_item_sort)); return; }
			prev_time = ls[i].time;
			frag.appendChild(document.createElement('hr'));
			frag.appendChild(_new_elem('div', 'new_time', pretty_time(ls[i].time)))
				.setAttribute('data-day', day_str.substr(0,3));
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
		var exp = expand_all.textContent == 'Expand all items';
		if (expand_all.textContent == 'Expand all items') {
			for (var i = 0, l = items.length; i < l; ++i) {
				items[i].parentNode.classList.add("expanded");
				_item_show_extra(items[i], items[i].id.substr(1));
			}
			expand_all.textContent = 'Collapse all items';
		} else {
			for (var i = 0, l = items.length; i < l; ++i) {
				items[i].parentNode.classList.remove("expanded");
			}
			expand_all.textContent = 'Expand all items';
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
}

function item_list_click(ev) {
	ev = ev || window.event;

	var el = ev.target;
	while (!/\bitem(_|$)/.test(el.className)) {
		if (el.id == 'prog_ls') return;
		if ((el.tagName.toLowerCase() == 'a') && el.href) return;
		el = el.parentNode;
	}
	if (!el.id || el.id[0] != 'p') return;

	if (el.parentNode.classList.toggle("expanded")) {
		_item_show_extra(el, el.id.substr(1));
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
		opt.text = weekday(t, false) + ', ' + pretty_time(t, false);
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
		var start_str = '';
		var t0 = new Date();
		t0.setMinutes(t0.getMinutes() + t_off - t0.getTimezoneOffset());
		var min_next = Math.floor((ms_next - t0) / 60000);
		var h_next = Math.floor(min_next / 60);
		if (h_next >= 1) {
			min_next -= h_next * 60;
			start_str += h_next + ' hour' + ((h_next == 1) ? '' : 's') + ' and ';
		}
		start_str += min_next + ' minute' + ((min_next == 1) ? '' : 's');
		EL("next_start_note").textContent = 'The next program item starts in ' + start_str + ' after the set time.';
	} else {
		EL("next_start_note").textContent = 'There are no more program items scheduled.';
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

function next_filter(ctrl, item) {
	var next_type = selected_id("next_type");

	switch (ctrl) {
		case "next_type": next_type = item; break;
	}

	update_next_list(next_type);
	update_next_filters(next_type);
}


function show_next_view() {
	set_view("next");

	var next_type = "next_by_hour";

	var store = storage_get('next') || {};
	if ('next_type' in store) next_type = store.next_type;

	update_next_list(next_type);
	update_next_filters(next_type);
}


// ------------------------------------------------------------------------------------------------ "my con" view

function show_star_view(opt) {
	set_view("star");
	var view = EL("star_data");

	var set_raw = (opt && (opt.substr(1,4) == 'set:')) ? opt.substr(5).split(',') : [];
	var set = program.filter(function(p) { return (set_raw.indexOf(p.id) >= 0); }).map(function(p) { return p.id; });
	set.sort();
	var set_len = set.length;

	var star_list = stars.list();
	star_list.sort();
	var stars_len = star_list.length;
	if (stars_len || set_len) {
		var set_link = '<a href="#star/set:' + star_list.join(',') + '">';
		if (set_len) {
			if (arrays_equal(set, star_list)) {
				view.innerHTML = '<p>Your current selection is encoded in ' + set_link + 'this page\'s URL</a>, which you may open elsewhere to share your selection.<p>For easier sharing, you can also generate a <a href="' + link_to_short_url(location.href) + '">shorter link</a> or a <a href="' + link_to_qr_code(location.href) + '">QR code</a>.';
				if (server) server.show_ical_link(view);
			} else {
				var n_same = array_overlap(set, star_list);
				var n_new = set_len - n_same;
				var html = '<p>Your previously selected items are shown with a highlighted interior, while those imported via <a href="' + location.href + '">this link</a> have a highlighted border.';
				html += '\n<p>Your previous selection ';
				switch (stars_len) {
					case 0:  html += 'was empty'; break;
					case 1:  html += 'had 1 item'; break;
					default: html += 'had ' + stars_len + ' items';
				}
				html += ', and the imported selection has ';
				switch (n_new) {
					case 0:  html += 'no new items'; break;
					case 1:  html += '1 new item'; break;
					default: html += n_new + ' new items';
				};
				switch (n_same) {
					case 0:         html += '.'; break;
					case stars_len: html += '.'; break;
					case 1:         html += ' and 1 which was already selected.'; break;
					default:        html += ' and ' + n_same + ' which were already selected.';
				}
				if (set_len != set_raw.length) {
					var n_bad = set_raw.length - set_len;
					html += ' ' + n_bad + ' of the imported items had ' + (n_bad > 1 ? 'invalid IDs.' : 'an invalid ID.');
				}
				if (!stars_len || (n_same != stars_len)) {
					html += '<p>&raquo; <a href="#star" id="star_set_set">Set my selection to the imported selection</a>';
				}
				if (stars_len) {
					if (n_same != stars_len) {
						var d = [];
						if (n_new) d.push('add ' + n_new);
						d.push('discard ' + (stars_len - n_same));
						html += ' (' + d.join(', ') + ')';
					}
					if (n_new) html += '<p>&raquo; <a href="#star" id="star_set_add">Add the ' + (n_new > 1 ? n_new + ' new items' : 'new item') + ' to my selection</a>';
				}
				view.innerHTML = html;

				var el_set = EL('star_set_set'); if (el_set) el_set.onclick = function() { stars.set(set); return true; };
				var el_add = EL('star_set_add'); if (el_add) el_add.onclick = function() { stars.add(set); return true; };
			}
		} else {
			var html = '<p>&raquo; ' + set_link + 'Export selection</a>';
			switch (stars_len) {
				case 1:  html += ' (1 item)'; break;
				default: html += ' (' + stars_len + ' items)';
			}
			view.innerHTML = html;
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
		view.innerHTML = "<p>To \"star\" a program item, click on the gray square next to it. Your selections will be remembered, and shown in this view. You currently don't have any program items selected, so this list is empty."
		EL("prog_ls").innerHTML = '';
	}
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


function _prog_get_filters() {
	var filters = { 'day':'', 'area':'', 'tag':'', 'query':'' };
	var h = window.location.hash;
	var h_set = false;
	if (h.substr(0, 5) == '#prog') {
		var p = h.substr(6).split('/');
		for (var i = 0; i < p.length; ++i) {
			var s = p[i].split(':');
			if ((s.length == 2) && s[0] && s[1]) {
				filters[s[0]] = decodeURIComponent(s[1]);
				h_set = true;
			}
		}
	}
	if (!h_set) {
		var store = storage_get('prog');
		if (store) for (var k in store) {
			if (filters.hasOwnProperty(k)) filters[k] = store[k];
		}
	}
	return filters;
}

function _prog_set_filters(f) {
	storage_set('prog', f);

	var p = ['#prog'];
	for (var k in f) if (k && f[k]) {
		if ((k == 'area') && (f[k] == 'all_areas')) continue;
		if ((k == 'tag')  && (f[k] == 'all_tags'))  continue;
		p.push(k + ':' + encodeURIComponent(f[k]));
	}
	var h = p.join('/');
	if (window.location.hash != h) {
		window.location.hash = h;
		return true;
	}

	return false;
}


function _prog_filter(it) {
	if (this.day && it.date != this.day) return false;

	if (this.area && (!it.loc || it.loc.indexOf(this.area) < 0)) return false;

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
				if (this.query.test(it.people[i])) { found = true; break; }
			}
		}
		if (!found) return false;
	}

	return true;
}

function _prog_show_list(f) {
	var tag_str = f.tag || '';
	if (f.tag && EL(f.tag)) {
		var t = EL(f.tag).getAttribute("data-regexp");
		if (t) f.tag = new RegExp(t);
	}

	var query_str = f.query || '';
	if (f.query) f.query = GlobToRE(f.query);

	var ls = program.filter(_prog_filter, f);

	if (f.tag) f.tag = tag_str;
	if (f.query) f.query = query_str;

	var fs = EL('filter_sum');
	if (fs) {
		var ls_all = true;
		var ft = 'item'; if (ls.length != 1) ft += 's';
		if (f.tag) { ft = '<b>' + f.tag + '</b> ' + ft; ls_all = false; }
		if (f.day) {
			var dt = new Date(f.day);
			ft += ' on <b>' + weekday(dt, true) + '</b>';
			ls_all = false;
		}
		if (f.area) { ft += ' in <b>' + f.area + '</b>'; ls_all = false; }
		if (f.query) { ft += ' matching the query <b>' + f.query + '</b>'; ls_all = false; }

		fs.innerHTML = 'Listing ' + (ls_all ? '<b>all</b> ' : '') + ls.length + ' ' + ft;
	}

	item_show_list(ls);
}


function _prog_show_filters(f) {
	var prev = EL('prog_filters').getElementsByClassName('selected');
	if (prev) for (var i = prev.length - 1; i >= 0; --i) {
		var cl = prev[i].classList;
		if (cl.contains('popup-title')) prev[i].textContent = 'More...';
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
			var ex = EL('q_hint_example');
			if (ex) {
				var glob_hint = f.query.match(/[?*"]/) ? '' : f.query + '*';
				if (glob_hint) {
					ex.textContent = glob_hint;
					ex.parentNode.onmouseup = function() { EL('q').value = glob_hint; EL('q').focus(); EL('q').blur(); };
					ex.parentNode.style.display = 'inline';
					ex.parentNode.style.cursor = 'pointer';
				} else {
					ex.parentNode.style.display = 'none';
				}
			}
		}
		qh.style.display = f.query ? 'block' : 'none';
	}
}




// hashchange -> read filters from url + store -> set filters in html + store -> list items
function show_prog_view() {
	set_view("prog");
	var f = _prog_get_filters();
	if (_prog_set_filters(f)) return;

	if (!f.day && !ko.show_all_days_by_default) f.day = _prog_default_day();

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
			key = ev.target.parentNode.id.replace(/\d+$/, '');
			value = ev.target.id;
			if (key == 'day') value = value.replace(/^d/, '');
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
	if (_prog_set_filters(filters)) ev.stopPropagation();
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
						img = '<a class="part_img" href="' + tgt + '"><img src="' + tgt + '" alt="Photo of ' + p_name + '"></a>';
					} else*/ {
						links += '<dt>Photo:<dd>' + '<a href="' + tgt + '">' + tgt + '</a>';
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
}

function _name_in_range(n0, range) {
	switch (range.length) {
		case 1:  return (n0 == range[0]);
		case 2:  return ((n0 >= range[0]) && (n0 <= range[1]));
		default: return (range.indexOf(n0) >= 0);
	}
}

function show_participant_list(name_range) {
	var lp = !name_range ? people : people.filter(function(p) {
		var n0 = p.sortname[0].toUpperCase();
		return _name_in_range(n0, name_range);
	});

	EL('part_names').innerHTML = lp.map(function(p) {
		return '<li><a href="#part/' + encodeURIComponent(p.id) + '">' + clean_name(p, true) + '</a></li>';
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

function part_filter(ctrl, el) {
	var name_range = (ctrl == 'name_range') ? el.getAttribute("data-range") : '';
	update_part_view(name_range, '');
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
	var name_range ='', participant = '';

	var store = storage_get('part') || {};
	if ('name_range' in store) name_range = store.name_range;

	if (!document.body.classList.contains("part")) {
		set_view("part");

		if ('participant' in store) participant = store.participant;
	}

	if (opt) {
		var p_id = decodeURIComponent(opt.substr(1));
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



// ------------------------------------------------------------------------------------------------ info view

function show_info_view() {
	set_view("info");

	EL("prog_ls").innerHTML = "";
}



// ------------------------------------------------------------------------------------------------ init


// init item expansion
EL('prog_ls').onclick = item_list_click;


// init next view
if (EL("next_filters")) {
	var ul = EL("next_filters").getElementsByTagName("li");
	for (var i = 0, l = ul.length; i < l; ++i) {
		ul[i].onclick = function() { next_filter(this.parentNode.id, this.id); return true; };
	}
}


// init star view


// init prog view
EL('prog_filters').onclick = prog_filter_change;
var sf = EL('search');
if (sf) {
	sf.onsubmit = prog_filter_change;
	EL('q').onblur = prog_filter_change;
	sf.onreset = function() { _prog_set_filters({}); };
}

make_popup_menu('tag2-list', 'tag2-disable-bg');


// init part view
if (typeof people != 'undefined') {
	for (var i = 0, l = people.length; i < l; ++i) {
		people[i].sortname = ((people[i].name[1] || '') + '  ' + people[i].name[0]).toLowerCase().replace(/^ +/, '');
	}
	people.sort(function(a, b) {
			 if (a.sortname < b.sortname) return -1;
		else if (a.sortname > b.sortname) return 1;
		else                              return 0;
	});

	var pc = EL("part_filters").getElementsByTagName("li");
	for (var i = 0, l = pc.length; i < l; ++i) {
		pc[i].onclick = function() { part_filter(this.parentNode.id, this); return true; };
	}
}


// set up fixed time display
if (EL("scroll_link")) {
	EL("scroll_link").onclick = function() { EL("top").scrollIntoView(); return false; };
	var prev_scroll = { "i": 0, "top": 0 };
	var n = 0;
	if (ko.full_version) { window.onscroll = function() {
		var st = document.documentElement.scrollTop;

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
var lu = EL('last-updated');
var cache_manifest = document.body.parentNode.getAttribute('manifest');
if (lu && cache_manifest && (location.protocol == 'http:')) {
	var x = new XMLHttpRequest();
	x.onload = function() {
		var t = new Date(this.getResponseHeader("Last-Modified"));
		var span = lu.getElementsByTagName('span')[0];
		span.textContent = pretty_time_diff(t);
		span.title = t.toLocaleString();
		span.onclick = function(ev) {
			var self = (ev || window.event).target;
			var tmp = self.title;
			self.title = self.textContent;
			self.textContent = tmp;
		};
		lu.style.display = 'block';
	};
	x.open('GET', cache_manifest, true);
	x.send();
}




function init_view() {
	var opt = window.location.hash.substr(1);
	if (opt.length < 4) opt = storage_get('view');
	if (!opt) opt = 'prog';
	switch (opt.substr(0,4)) {
		case 'next': show_next_view(); break;
		case 'star': show_star_view(opt.substr(4)); break;
		case 'part': show_part_view(opt.substr(4)); break;
		case 'info': show_info_view(); break;
		case 'prog': show_prog_view(); break;
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
		window.setInterval(function() { cache.update(); }, 360000);
	}
}, false);
