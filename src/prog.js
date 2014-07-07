KonOpas.Prog = function() {
	var pf = EL('prog_filters'),
	    pl = pf.getElementsByClassName('popup-link'),
	    sf = EL('search');
	pf.onclick = KonOpas.Prog.filter_change;
	for (var i = 0; i < pl.length; ++i){
		pl[i].setAttribute('data-title', pl[i].textContent);
		pl[i].nextElementSibling.onclick = KonOpas.Prog.filter_change;
	}
	if (sf) {
		sf.onsubmit = EL('q').onblur = KonOpas.Prog.filter_change;
		sf.onreset = function() { KonOpas.Prog.set_filters({}); };
	}
}


// ------------------------------------------------------------------------------------------------ static

KonOpas.Prog.hash = function(f0, fx) {
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

KonOpas.Prog.get_filters = function(hash_only) {
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
		var store = ko.storage_get('prog');
		if (store) for (var k in store) {
			if (filters.hasOwnProperty(k)) filters[k] = store[k];
		}
	}
	return filters;
}

KonOpas.Prog.set_filters = function(f, silent) {
	if (silent && !(history && history.replaceState)) return false;
	ko.storage_set('prog', f);
	var h = KonOpas.Prog.hash(f),
	    h_cur = window.location.toString().split('#')[1] || '';
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

// read filters from url + ev -> set new hash
KonOpas.Prog.filter_change = function(ev) {
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
	var filters = KonOpas.Prog.get_filters();
	filters[key] = value;
	if (filters['id'] && (key != 'id')) filters['id'] = '';
	KonOpas.Prog.set_filters(filters);
}

KonOpas.Prog.now_list = function() {
	var ms_now = Date.now() - 60000 * (new Date()).getTimezoneOffset(), // - 168*24*60*60000,
		ms_max = ms_now + 2 * 60 * 60000,
	    now = [],
		ms_last = 0, ms_next = 0;
	for (var i = 0, l = program.length; i < l; ++i) {
		var it = program[i],
		    ms_start = Date.parse(it.date + 'T' + it.time + 'Z');
		if (ms_start < ms_now) {
			var ms_end = ms_start + 60000 * (it.mins || 0);
			if (ms_end > ms_now) now.push(it);
			else if (ms_end > ms_last) ms_last = ms_end;
		} else {
			if (!ms_next || (ms_start < ms_next)) ms_next = ms_start;
			if (ms_start < ms_max) now.push(it);
		}
	}
	if (now.length > 0) {
		EL("next_start_note").textContent = '';
	} else if (ms_next) {
		var m_next = Math.floor((ms_next - ms_now) / 60000),
		    h_next = Math.floor(m_next / 60),
			d_next = Math.floor(h_next / 24);
		if (h_next >= 1) m_next -= h_next * 60;
		if (d_next >= 1) h_next -= d_next * 24;
		EL("next_start_note").textContent = i18n.txt('next_start', { 'D':d_next, 'H':h_next, 'M':m_next });
	} else {
		var m_last = Math.floor((ms_now - ms_last) / 60000),
		    h_last = Math.floor(m_last / 60),
		    d_last = Math.floor(h_last / 24);
		if (h_last >= 1) m_last -= h_last * 60;
		if (d_last >= 1) h_last -= d_last * 24;
		EL("next_start_note").textContent = i18n.txt('last_ended', { 'D':d_last, 'H':h_last, 'M':m_last });
	}
	return now;
}



// ------------------------------------------------------------------------------------------------ instance

KonOpas.Prog.prototype.default_day = function() {
	var day_start = '', day_end = '',
	    el_dl = EL("day"),
	    dl = el_dl && el_dl.getElementsByTagName("li");
	if (!dl || !dl.length) {
		this.default_day = function(){ return ''; };
		return '';
	}
	for (var i = 0, l = dl.length; i < l; ++i) {
		var d = dl[i].id.substr(1);
		if (!d || !/^[\d-]+$/.test(d)) continue;
		if (!day_start || (d < day_start)) day_start = d;
		if (!day_end || (d > day_end)) day_end = d;
	}
	this.default_day = function() {
		var day_now = string_date();
		return (day_now > day_start) && (day_now <= day_end) ? day_now : day_start;
	}
	return this.default_day();
}


// hashchange -> read filters from url + store -> set filters in html + store -> list items
KonOpas.Prog.prototype.show = function() {
	function _show_filters(f) {
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
					qh.innerHTML = i18n.txt('search_hint');
					qh.removeAttribute('onmouseup');
					qh.style.cursor = 'auto';
				} else {
					qh.innerHTML = i18n.txt('search_hint') + ' ' + i18n.txt('search_example', {'X':f.query+'*'});
					qh.onmouseup = function() { EL('q').value = f.query + '*'; EL('q').focus(); EL('q').blur(); };
					qh.style.cursor = 'pointer';
				}
				qh.style.display = 'block';
			} else {
				qh.style.display = 'none';
			}
		}
		EL("next_start_note").textContent = '';
	}
	function _filter(it) {
		if (this.day && (this.day != 'now')) {
			if (it.date != this.day) return false;
		}
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
	function _show_list(f) {
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
		var ls = id_only
			? program.filter(function(it){ return it.id == f.id; })
			: ((f.day == 'now') ? KonOpas.Prog.now_list() : program).filter(_filter, f);
		if (f.id) {
			var id_ok = false;
			for (var i = 0, l = ls.length; i < l; ++i) if (ls[i].id == f.id) {
				id_ok = true;
				break;
			}
			if (!id_ok) {
				f.id = '';
				if (KonOpas.Prog.set_filters(f)) return;
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
			var _a = function(t, f0, fx) { return '<a href="' + KonOpas.Prog.hash(f0, fx) + '">' + t + '</a>'; }
			if (id_only) {
				fs.innerHTML = i18n.txt('filter_sum_id', { 'N':ls.length, 'TITLE':_a(ls[0].title, f0, {}), 'ID':_a(f.id, f0, {}) });
			} else {
				var d = { 'N':ls.length,
					'ALL': f.tag || f.day || f.area || f.query ? '' : _a(i18n.txt('all'), {}, 0),
					'TAG': f.tag ? _a(f.tag, f0, {'tag':''}) : '' };
				if (f.area) d['AREA'] = _a(f.area, f0, {'area':''});
				if (f.query) d['Q'] = _a(f.query, f0, {'query':''});
				if (f.day) {
					if (f.day == 'now') {
						d['NOW'] = _a(pretty_time(new Date(), ko), f0, {'day':'all_days'});
					} else {
						var day = parse_date(f.day);
						d['DAY'] = _a(i18n.txt('weekday_n', {'N': day ? day.getDay() : -1 }), f0, {'day':'all_days'});
					}
				}
				for (var k in d) if (k.substr(0,4) != 'GOT_') d['GOT_' + k] = true;
				fs.innerHTML = i18n.txt('filter_sum', d);
			}
		}
		KonOpas.Item.show_list(ls, f.id);
	}

	var f = KonOpas.Prog.get_filters();
	if (KonOpas.Prog.set_filters(f)) return;
	if (!f.day && !f.id && !ko.show_all_days_by_default) f.day = this.default_day();
	_show_filters(f);
	for (var k in f) {
		if (!k || !f[k] || (f[k] == 'all_' + k + 's')) { delete f[k]; continue; }
	}
	_show_list(f);
}
