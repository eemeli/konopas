KonOpas.Part = function(list, opt) {
	this.list = list || [];
	for (var i = 0, p; p = this.list[i]; ++i) {
		p.sortname = ((p.name[1] || '') + '  ' + p.name[0]).toLowerCase().replace(/^ +/, '');
		if (!opt.non_ascii_people) p.sortname = p.sortname.make_ascii();
	}
	this.list.sort(opt.non_ascii_people
		? function(a, b) { return a.sortname.localeCompare(b.sortname, opt.lc); }
		: function(a, b) { return a.sortname < b.sortname ? -1 : a.sortname > b.sortname; });
	_el("part_filters").onclick = this.filter_click.bind(this);
	this.set_ranges(opt.people_per_screen || 0);
}

KonOpas.Part.prototype.set_ranges = function(bin_size) {
	function _prev_matches(a, i) { return (i > 0) && (a[i - 1] == a[i]); }
	function _next_matches(a, i) { return (i < a.length - 1) && (a[i + 1] == a[i]); }
	function _ranges(a, bin_size) {
		if (bin_size <= 0) return [];
		var ends = [], n_bins = Math.round(a.length / bin_size);
		if (n_bins > 1) {
			for (var i = 1; i <= n_bins; ++i) {
				var e = Math.round(i * a.length / n_bins), n_up = 0, n_down = 0;
				if (e < 0) e = 0;
				if (e >= a.length) e = a.length - 1;
				while (_next_matches(a, e + n_up)) ++n_up;
				if (n_up) while (_prev_matches(a, e - n_down)) ++n_down;
				if (n_up <= n_down) e += n_up;
				else if (e > n_down) e -= n_down + 1;
				if (!ends.length || (ends[ends.length - 1] != a[e])) ends.push(a[e]);
			}
			var start = 'A';
			for (var i = 0; i < ends.length; ++i) {
				if (ends[i] < start) continue;
				var c = ends[i].charCodeAt(0);
				if (ends[i] > start) ends[i] = start + ends[i];
				start = String.fromCharCode(c + 1);
			}
		}
		return ends;
	}

	var fn = [], ln = [];
	for (var i = 0; i < this.list.length; ++i) {
		var n = this.list[i].name;
		if (!n || !n.length) continue;
		fn.push(n[0].trim().charAt(0).toUpperCase());
		if (n.length >= 2) ln.push(n[1].trim().charAt(0).toUpperCase());
	}
	var nr = _ranges(ln.length ? ln : fn, bin_size),
	    filters = _el('part_filters');
	if (nr.length > 1) {
		filters.textContent = '» ' + i18n.txt('part_filter', {'T': ln.length ? 'last' : 'first'}) + ':';
		var ul = document.createElement('ul'); ul.id = 'name_range';
		for (var i = 0; i < nr.length; ++i) {
			var li = document.createElement('li');
			li.setAttribute('data-range', nr[i]);
			li.textContent = nr[i].charAt(0);
			if (nr[i].length > 1) li.textContent += ' - ' + nr[i].charAt(1);
			ul.appendChild(li);
		}
		filters.appendChild(ul);
	} else {
		filters.innerHTML = '<span>» <a href="#part">' + i18n.txt('part_filter', {'T':'all'}) + '</a></span>';
	}
	var nl_type =  fn.length &&  ln.length ? ''
	            :  fn.length && !ln.length ? 'fn-only'
	            : !fn.length &&  ln.length ? 'ln-only'
	            : 'error';
	if (nl_type) _el('part_names').classList.add(nl_type);
}

KonOpas.Part.name_in_range = function(n0, range) {
	switch (range.length) {
		case 1:  return (n0 == range[0]);
		case 2:  return konopas.non_ascii_people
			? (n0.localeCompare(range[0], konopas.lc) >= 0) && (n0.localeCompare(range[1], konopas.lc) <= 0)
			: ((n0 >= range[0]) && (n0 <= range[1]));
		default: return (range.indexOf(n0) >= 0);
	}
}

KonOpas.Part.prototype.show_one = function(i) {
	var p = this.list[i],
	    p_name = KonOpas.clean_name(p, false),
	    links = '',
	    img = '',
	    pl = KonOpas.clean_links(p);
	if (pl) {
		links += '<dl class="linklist">';
		for (var type in pl) if (type != 'img') {
			var tgt = pl[type].tgt, txt = pl[type].txt || tgt;
			links += '<dt>' + type + ':<dd>' + '<a href="' + tgt + '">' + txt + '</a>';
		}
		links += '</dl>';
		if (pl.img && navigator.onLine) {
			img = '<a class="part_img" href="' + pl.img.tgt + '"><img src="' + pl.img.tgt + '" alt="' + i18n.txt('Photo') + ': ' + p_name + '"></a>';
		}
	}
	_el("part_names").innerHTML = '';
	_el("part_info").innerHTML =
		  '<h2 id="part_title">' + p_name + '</h2>'
		+ ((p.bio || img) ? ('<p>' + img + p.bio) : '')
		+ links;
	KonOpas.Item.show_list(konopas.program.list.filter(function(it) { return p.prog.indexOf(it.id) >= 0; }));
	_el("top").scrollIntoView();
}

KonOpas.Part.prototype.show_list = function(name_range) {
	var lp = !name_range ? this.list : this.list.filter(function(p) {
		var n0 = p.sortname[0].toUpperCase();
		return KonOpas.Part.name_in_range(n0, name_range);
	});
	_el('part_names').innerHTML = lp.map(function(p) {
		return '<li><a href="#part/' + KonOpas.hash_encode(p.id) + '">' + KonOpas.clean_name(p, true) + '</a></li>';
	}).join('');
	_el('part_info').innerHTML = '';
	_el('prog_ls').innerHTML = '';
}

KonOpas.Part.prototype.update_view = function(name_range, participant) {
	var el_nr = _el('name_range'),
	    p_id = participant.substr(1),
	    i, l, ll, cmd;
	if (el_nr) {
		ll = el_nr.getElementsByTagName('li');
		for (i = 0, l = ll.length; i < l; ++i) {
			cmd = (ll[i].getAttribute('data-range') == name_range)? 'add' : 'remove';
			ll[i].classList[cmd]('selected');
		}
	}
	if (p_id) for (i = 0, l = this.list.length; i < l; ++i) {
		if (this.list[i].id == p_id) { this.show_one(i); break; }
	}
	if (!p_id || (i == this.list.length)) {
		participant = '';
		this.show_list(name_range);
	}
	konopas.store.set('part', { 'name_range': name_range, 'participant': participant });
}

KonOpas.Part.prototype.show = function(hash) {
	function _name_range(name) {
		var n0 = name[0].toUpperCase(); if (!n0) return '';
		var par = _el('name_range'); if (!par) return '';
		var ll = par.getElementsByTagName('li');
		for (var i = 0, l = ll.length; i < l; ++i) {
			var range = ll[i].getAttribute('data-range');
			if (range && KonOpas.Part.name_in_range(n0, range)) return range;
		}
		return '';
	}

	if (!this.list.length) { window.location.hash = ''; return; }
	var store = konopas.store.get('part') || {},
	    name_range = store.name_range || '',
	    participant = !document.body.classList.contains('part') && store.participant || '',
		hash = window.location.hash.substr(6);
	if (hash) {
		var p_id = KonOpas.hash_decode(hash);
		var pa = this.list.filter(function(p) { return p.id == p_id; });
		if (pa.length) {
			participant = 'p' + pa[0].id;
			name_range = _name_range(pa[0].sortname);
		} else {
			window.location.hash = '#part';
			return;
		}
	} else if (participant) {
		window.location.hash = '#part/' + participant.substr(1);
		return;
	}
	if (!name_range) {
		var el_nr = _el('name_range');
		if (el_nr) name_range = el_nr.getElementsByTagName('li')[0].getAttribute('data-range');
	}
	this.update_view(name_range, participant);
}


KonOpas.Part.prototype.filter_click = function(ev) {
	var el = (ev || window.event).target;
	if (el.parentNode.id == 'name_range') {
		var name_range = el.getAttribute("data-range") || '';
		konopas.store.set('part', { 'name_range': name_range, 'participant': '' });
		window.location.hash = '#part';
		this.update_view(name_range, '');
	}
}
