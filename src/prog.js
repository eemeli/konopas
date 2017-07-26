KonOpas.Prog = function(list, opt) {
	function _sort(a, b) {
		if (!a.date != !b.date) return a.date ? -1 : 1;
		if (a.date < b.date) return -1;
		if (a.date > b.date) return  1;
		if (!a.time != !b.time) return a.time ? 1 : -1;
		if (a.time < b.time) return -1;
		if (a.time > b.time) return  1;
		if (a.loc && b.loc) {
			if (a.loc.length < b.loc.length) return -1;
			if (a.loc.length > b.loc.length) return  1;
			for (var i = a.loc.length - 1; i >= 0; --i) {
				if (a.loc[i] < b.loc[i]) return -1;
				if (a.loc[i] > b.loc[i]) return  1;
			}
		}
		return 0;
	}
	this.list = (list || []).sort(_sort);
	this.list.forEach(function(p) {
		if (p && p.date) {
			var d = p.date.split(/\D+/),
			    t = p.time && p.time.split(/\D+/) || [0,0],
				m = p.time && Number(p.mins || KonOpas.default_duration) || (!p.time && 24*60-1) || 0;
			p.t0 = new Date(d[0], d[1] - 1, d[2], t[0], t[1]);
			if (isNaN(p.t0)) delete p.t0;
			else p.t1 = new Date(p.t0.valueOf() + 60000 * m);
		}
	});
	var pf = _el('prog_filters');
	pf.onclick = KonOpas.Prog.filter_change;
	var pl = pf.getElementsByClassName('popup-link');
	for (var i = 0; i < pl.length; ++i) {
		pl[i].setAttribute('data-title', pl[i].textContent);
		pl[i].nextElementSibling.onclick = KonOpas.Prog.filter_change;
	}
	var sf = _el('search');
	if (sf) {
		sf.onsubmit = _el('q').oninput = KonOpas.Prog.filter_change;
		sf.onreset = function() { KonOpas.Prog.set_filters({}); };
	}
	this.init_filters(opt);
	var pt = _el('tab_prog'),
	    pa = pt && pt.getElementsByTagName('a');
	if (pa && pa.length) pa[0].onclick = function(ev) {
		if (window.pageYOffset && document.body.classList.contains('prog')) {
			window.scrollTo(0, 0);
			(ev || window.event).preventDefault();
		}
	};
}


// ------------------------------------------------------------------------------------------------ static

KonOpas.Prog.hash = function(f, excl) {
	var p = ['#prog'];
	if (f) ['id', 'area', 'tag', 'query'].forEach(function(k){
		var v = f[k + '_str'] || f[k];
		if (excl && excl[k] || !v || (v == 'all_' + k + 's')) return;
		if ((k == 'tag') && konopas.tag_categories) {
			var m = v.match(new RegExp('^(' + konopas.tag_categories.join('|') + '):(.*)'));
			if (m) { k = m[1]; v = m[2]; }
		}
		p.push(k + ':' + KonOpas.hash_encode(v));
	});
	return p.length > 1 ? p.join('/') : '#';
}

KonOpas.Prog.get_filters = function(hash_only) {
	var	filters = { 'area':'', 'tag':'', 'query':'', 'id':'' },
		h = window.location.toString().split('#')[1] || '',
		h_set = false,
		tag_re = konopas.tag_categories && konopas.tag_categories.length && new RegExp('^' + konopas.tag_categories.join('|') + '$');
	if (h.substr(0, 5) == 'prog/') {
		h.substr(5).split('/').forEach(function(p){
			var s = p.split(':');
			if ((s.length == 2) && s[0] && s[1]) {
				if (tag_re && tag_re.test(s[0])) {
					s[1] = p;
					s[0] = 'tag';
				}
				filters[s[0]] = KonOpas.hash_decode(s[1]);
				h_set = true;
			}
		});
	}
	if (!hash_only && !h_set && !document.body.classList.contains('prog')) {
		var store = konopas.store.get('prog');
		if (store) for (var k in store) {
			if (filters.hasOwnProperty(k)) filters[k] = store[k];
		}
	}
	return filters;
}

KonOpas.Prog.set_filters = function(f, silent) {
	if (silent && !(history && history.replaceState)) return false;
	if (f.id) f = { 'id': f.id };
	konopas.store.set('prog', f);
	var h = KonOpas.Prog.hash(f),
	    h_cur = window.location.toString().split('#')[1] || '';
	if (h_cur != h.substr(1)) {
		if (silent) {
			var loc = window.location.toString().split('#')[0] + h;
			history.replaceState({}, document.title, loc);
			window.onhashchange()
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
	var silent = false;
	switch (ev.type) {
		case 'click':
			if (ev.target.tagName.toLowerCase() != 'li') return;
			var popups = ev.target.getElementsByClassName('popup');
			if (popups && popups.length) return;
			key = ev.target.parentNode.id.replace(/\d+$/, '');
			value = ev.target.id;
			switch (key) {
				case 'area': value = value.replace(/^a([^a-zA-Z])/, '$1'); break;
				case 'tag':  value = value.replace(/^t([^a-zA-Z])/, '$1'); break;
			}
			break;
		case 'submit':
			ev.preventDefault();
			// fallthrough
		case 'input':
			key = 'query';
			value = _el("q").value;
			silent = value.length > 1;
			break;
		default: return;
	}
	var filters = KonOpas.Prog.get_filters();
	filters[key] = value;
	if (filters['id'] && (key != 'id')) filters['id'] = '';
	KonOpas.Prog.set_filters(filters, silent);
}

KonOpas.Prog.focus_day = function(d) {
	for (var n in {'day-sidebar':1, 'day-narrow':1}) {
		var e = _el(n),
			s = e && e.getElementsByTagName('li');
		if (s) for (var i = 0; i < s.length; ++i) {
			var _d = s[i].getAttribute('data-day');
			s[i].classList[(_d == d) ? 'add' : 'remove']('selected');
		}
	}
}



// ------------------------------------------------------------------------------------------------ instance

KonOpas.Prog.prototype.init_filters = function(opt) {
	var filter_el = _el('prog_lists'), labels = {}, regexp = {};
	function _txt(s) {
		return i18n.txt(s.charAt(0).toUpperCase() + s.slice(1).replace('_',' '));
	}
	function _ul(id) {
		var e = document.createElement('ul');
		e.id = id;
		return e;
	}
	function _li(par, id, txt) {
		var e = document.createElement('li');
		e.id = /^[^a-zA-Z]/.test(id) ? par.id[0] + id : id
		if (!txt) txt = labels[id] || _txt(id);
		if (/^\s*$/.test(txt)) return;
		e.textContent = /^[\\^$]/.test(txt) ? txt.substr(1) : txt;
		if (regexp[id]) e.setAttribute('data-regexp', regexp[id]);
		par.appendChild(e);
	}
	function _compare(a, b) {
		var sf = function(s) { return (labels[s] || s.replace(/^[^:]+:/, '')).toLowerCase().replace(/^the /, ''); },
			af = function(s) { return s.match(/\d+|\D+/g).map(function(v) { return Number(v) || v; }); },
			_a = sf(a), _b = sf(b);
		if ((_a[0] == '$') != (_b[0] == '$')) return (_a < _b) ? 1 : -1; // $ == 0x24
		if (/\d/.test(_a) && /\d/.test(_b)) {
			var aa = af(_a), bb = af(_b);
			for (var i = 0; i < aa.length && i < bb.length; ++i) {
				if (aa[i] < bb[i]) return -1;
				if (aa[i] > bb[i]) return  1;
			}
			if (aa.length != bb.length) return aa.length < bb.length ? -1 : 1;
		} else {
			if (_a < _b) return -1;
			if (_a > _b) return  1;
		}
		return 0;
	}
	function _ul2(par, id, name, prefix, list) {
		var title = labels[name] || _txt(name),
		    root = document.createElement('li'),
		    link = _new_elem('div', 'popup-link', title + '…'),
		    ul = _new_elem('ul', 'popup');
		link.setAttribute('data-title', link.textContent);
		link.addEventListener('click', KonOpas.popup_open);
		ul.id = id;
		ul.setAttribute('data-title', title);
		ul.addEventListener('click', KonOpas.Prog.filter_change);
		for (var i = 0; i < list.length; ++i) {
			var txt = labels[list[i]] || list[i].replace(prefix, '');
			_li(ul, list[i], txt);
		}
		root.appendChild(link);
		root.appendChild(ul);
		par.appendChild(root);
	}
	function _fill(id, items) {
		var i = 0, o = opt[id], ul = _ul(id);
		labels = o.labels || {};
		regexp = o.regexp || {};
		for (var r in regexp) items[r] = 1;
		_li(ul, 'all_' + id + 's');
		if (o.promote) for (i = 0; i < o.promote.length; ++i) {
			_li(ul, o.promote[i]);
			delete items[o.promote[i]];
		}
		if (o.exclude) {
			var re = new RegExp(o.exclude.join('|'));
			for (var t in items) if (re.test(t)) delete items[t];
		}
		if (o.min_count) {
			for (var t in items) if (items[t] < o.min_count) delete items[t];
		}
		var list = Object.keys(items).sort(_compare);
		if (o.categories) for (i = 0; i < o.categories.length; ++i) {
			var prefix = o.categories[i] + ':',
			    list_in = [], list_out = [];
			for (var j = 0; j < list.length; ++j) {
				if (list[j].substr(0, prefix.length) == prefix) {
					list_in.push(list[j]);
				} else {
					list_out.push(list[j]);
				}
			}
			switch (list_in.length) {
				case 0:   break;
				case 1:   _li(ul, prefix + list_in[0]);  break;
				default:  _ul2(ul, id + i, o.categories[i], prefix, list_in);
			}
			list = list_out;
		}
		if (list.length < 4) for (i = 0; i < list.length; ++i) _li(ul, list[i]);
		else _ul2(ul, id + i, id, '', list);
		filter_el.appendChild(ul);
	}
	if (!opt || !filter_el) return;
	while (filter_el.firstChild) filter_el.removeChild(filter_el.firstChild);
	var days = {}, areas = {}, tags = {},
	    lvl = (opt.area && opt.area.loc_level) || 0;
	for (var i = 0, l = this.list.length; i < l; ++i) {
		var p = this.list[i];
		if (p.date) days[p.date] = 1;
		if (opt.area && (typeof p.loc == 'object') && p.loc && p.loc[lvl]) areas[p.loc[lvl]] = (areas[p.loc[lvl]] || 0) + 1;
		if (opt.tag && (typeof p.tags == 'object') && p.tags) for (var j = 0; j < p.tags.length; ++j) {
			var t_s = opt.tag.set_category && opt.tag.set_category[p.tags[j]];
			if (t_s) p.tags[j] = t_s + ':' + p.tags[j];
			tags[p.tags[j]] = (tags[p.tags[j]] || 0) + 1;
		}
	}
	if (opt.day && opt.day.exclude) {
		var d_re = new RegExp(opt.day.exclude.join('|'));
		for (var d in days) if (d_re.test(d)) delete days[d];
	}
	this.days = {};
	for (var d in days) {
		var d_d = KonOpas.parse_date(d), d_n = {'N': d_d ? d_d.getDay() : -1 };
		this.days[d] = {
			'short': i18n.txt('weekday_short_n', d_n),
			'long': i18n.txt('weekday_n', d_n)
		};
	}
	if (opt.area) _fill('area', areas);
	if (opt.tag) _fill('tag', tags);
}


KonOpas.Prog.prototype.show_filter_sum = function(ls, f) {
	var fs = _el('filter_sum'); if (!fs) return;
	var cb = _el('q_clear');
	var _a = function(txt, unset) {
		var excl = {id:1}; if (unset) excl[unset] = 1;
		return '<a href="' + KonOpas.Prog.hash(f, excl) + '">' + txt + '</a>';
	}
	if (f.id_only) {
		fs.innerHTML = i18n.txt('filter_sum_id', { 'N':ls.length, 'TITLE':_a(ls[0].title), 'ID':_a(f.id) });
		if (cb) cb.disabled = false;
	} else {
		var d = { 'N': f.n_listed,
			'ALL': !f.show_all || f.tag_str || f.area_str || f.query_str ? '' : _a(i18n.txt('all'), {}, 0),
			'TAG': f.tag_str ? _a(f.tag_str, 'tag') : '' };
		if (f.day && !f.show_all) {
			d['DAY'] = i18n.txt('weekday_n', {'N': KonOpas.parse_date(f.day).getDay() });
			if (f.n_hidden) d['TIME'] = KonOpas.pretty_time(f.now, konopas);
		} else {
			if (f.n_hidden) d['LIVE'] = true;
		}
		if (f.area_str) d['AREA'] = _a(f.area_str, 'area');
		if (f.query_str) d['Q'] = _a(f.query_str, 'query');
		fs.innerHTML = i18n.txt('filter_sum', d);
		if (cb) cb.disabled = !f.area_str && !f.tag_str && !f.query_str;
	}
}

// hashchange -> read filters from url + store -> set filters in html + store -> list items
KonOpas.Prog.prototype.show = function() {
	function _show_filters(f) {
		var prev = _el('prog_filters').getElementsByClassName('selected');
		if (prev) for (var i = prev.length - 1; i >= 0; --i) {
			var cl = prev[i].classList;
			if (cl.contains('popup-link')) prev[i].textContent = prev[i].getAttribute('data-title') || i18n.txt('More') + '…';
			cl.remove('selected');
		}
		for (var k in f) {
			if (k == 'query') {
				var q = _el("q");
				if (q) {
					q.value = f.query;
					if (f.query) q.classList.add('selected');
				}
			} else {
				var id = f[k];
				if (!id) id = 'all_' + k + 's';
				else if (id.match(/^[^a-zA-Z]/)) id = k[0] + id;
				var el = _el(id);
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
	}
	function _filter(it) {
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
			var found = this.query.test(it.title)
				|| this.query.test(it.desc)
				|| (it.loc && this.query.test(it.loc.join('\t')))
				|| (it.tags && this.query.test(it.tags.join('\t')))
				|| (it.people && it.people.some(function(p){ return this.query.test(p.name); }, this));
			if (!found) return false;
		}
		return true;
	}
	function _show_list(f, self) {
		f.area_str = f.area || '';
		if (f.area && _el(f.area)) {
			var t = _el(f.area).getAttribute("data-regexp");
			if (t) f.area = new RegExp(t);
		}
		f.tag_str = f.tag || '';
		if (f.tag && _el(f.tag)) {
			var t = _el(f.tag).getAttribute("data-regexp");
			if (t) f.tag = new RegExp(t);
		}
		f.query_str = f.query || '';
		if (f.query) f.query = KonOpas.glob_to_re(f.query);
		f.id_only = !!f.id;
		if (f.id_only) for (var i in f) if ((i != 'id') && (i != 'id_only') && f[i]) {
			f.id_only = false;
			break;
		}
		var ls = self.list.filter(f.id_only ? function(it){ return it.id == f.id; } : _filter, f);
		if (f.id && ls.every(function(p) { return p.id != f.id; })) {
			f.id = '';
			if (KonOpas.Prog.set_filters(f)) return;
		}
		f.hide_ended = true;
		f.prog_view = true;
		KonOpas.Item.show_list(ls, f);
	}

	var f = KonOpas.Prog.get_filters();
	if (KonOpas.Prog.set_filters(f)) return;
	_show_filters(f);
	for (var k in f) {
		if (!k || !f[k] || (f[k] == 'all_' + k + 's')) { delete f[k]; continue; }
	}
	_show_list(f, this);
}
