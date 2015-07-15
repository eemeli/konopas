KonOpas.Part = function(list, opt) {
	this.list = list || [];
	this.list.forEach(function(p){
		p.sortname = ((p.name[1] || '') + '  ' + p.name[0]).toLowerCase().replace(/^ +/, '');
		if (!opt.non_ascii_people) p.sortname = p.sortname.make_ascii();
	});
	this.list.sort(opt.non_ascii_people
		? function(a, b) { return a.sortname.localeCompare(b.sortname, opt.lc); }
		: function(a, b) { return a.sortname < b.sortname ? -1 : a.sortname > b.sortname; });
	this.set_ranges(opt.people_per_screen || 0);
}

KonOpas.Part.prototype.set_ranges = function(bin_size) {
	var	self = this,
		_ranges = function(a, bin_size) {
			var	ends = [], start = ' ',
				n_bins = bin_size ? Math.round(a.length / bin_size) : 0,
				_prev_matches = function(a, i) { return (i > 0) && (a[i - 1] == a[i]); },
				_next_matches = function(a, i) { return (i < a.length - 1) && (a[i + 1] == a[i]); };
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
			ends.forEach(function(e, i){
				if (e > start) ends[i] = start + e;
				if (e >= start) start = String.fromCharCode(e.charCodeAt(0) + 1);
			});
			return ends;
		},
		_range_set = function(div, nr) {
			var ul = _new_elem('ul', 'name-list');
			nr.forEach(function(n){
				var startChar = n.charAt(0);
				if (startChar == ' ') startChar = 'A';
				var li = _new_elem('li', '', startChar);
				if (n.length > 1) li.textContent += ' - ' + n.charAt(1);
				li.setAttribute('data-range', n);
				ul.appendChild(li);
			});
			div.appendChild(ul);
			div.onclick = (function(ev) {
				var name_range = (ev || window.event).target.getAttribute('data-range');
				if (name_range) {
					konopas.store.set('part', { 'name_range': name_range, 'participant': '' });
					window.location.hash = '#part';
					this.update_view(name_range, '');
				}
			}).bind(self);
		};

	var fn = [], ln = [];
	this.list.forEach(function(p){
		if (p.name && p.name.length) {
			fn.push(p.name[0].trim().charAt(0).toUpperCase());
			if (p.name.length >= 2) ln.push(p.name[1].trim().charAt(0).toUpperCase());
		}
	});

	this.ranges = _ranges(ln.length ? ln : fn, bin_size);
	_range_set(_el('part-sidebar'), this.ranges);
	_range_set(_el('part-narrow'), this.ranges);

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
	var	p_id = participant.substr(1),
		ll = document.querySelectorAll('.name-list > li');
	if (!name_range) name_range = this.ranges && this.ranges[0] || '';
	for (var i = 0; i < ll.length; ++i) {
		var cmd = (ll[i].getAttribute('data-range') == name_range) ? 'add' : 'remove';
		ll[i].classList[cmd]('selected');
	}
	if (!p_id || !this.list.some(function(p,i){
		if (p.id == p_id) { this.show_one(i); return true; }
	}, this)) {
		participant = '';
		this.show_list(name_range);
	}
	konopas.store.set('part', { 'name_range': name_range, 'participant': participant });
}

KonOpas.Part.prototype.show = function(hash) {
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
			var n0 = pa[0].sortname[0].toUpperCase();
			if (!n0 || !this.ranges || !this.ranges.some(function(r){
				if (KonOpas.Part.name_in_range(n0, r)) { name_range = r; return true; }
			})) name_range = '';
		} else {
			window.location.hash = '#part';
			return;
		}
	} else if (participant) {
		window.location.hash = '#part/' + participant.substr(1);
		return;
	}
	this.update_view(name_range, participant);
}
