function Part(list, opt) {
	this.list = list || [];
	this.opt = opt || {};
	for (var i = 0, p; p = this.list[i]; ++i) {
		p.sortname = ((p.name[1] || '') + '  ' + p.name[0]).toLowerCase().replace(/^ +/, '');
		if (!this.opt.non_ascii_people) p.sortname = p.sortname.make_ascii();
	}
	this.list.sort(this.opt.non_ascii_people
		? function(a, b) { return a.sortname.localeCompare(b.sortname, this.opt.lc); }
		: function(a, b) { return a.sortname < b.sortname ? -1 : a.sortname > b.sortname; });
	var self = this;
	EL("part_filters").onclick = function(ev) { Part.filter_click(ev, self); };
}

Part.prototype.name_in_range = function(n0, range) {
	switch (range.length) {
		case 1:  return (n0 == range[0]);
		case 2:  return this.opt.non_ascii_people
			? (n0.localeCompare(range[0], this.opt.lc) >= 0) && (n0.localeCompare(range[1], this.opt.lc) <= 0)
			: ((n0 >= range[0]) && (n0 <= range[1]));
		default: return (range.indexOf(n0) >= 0);
	}
}

Part.prototype.show_one = function(i) {
	var p = this.list[i],
	    p_name = clean_name(p, false),
	    links = '',
	    img = '',
	    pl = clean_links(p);
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
						img = '<a class="part_img" href="' + tgt + '"><img src="' + tgt + '" alt="' + i18n.txt('Photo') + ':' + p_name + '"></a>';
					} else*/ {
						links += '<dt>' + i18n.txt('Photo') + ':<dd>' + '<a href="' + tgt + '">' + tgt + '</a>';
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
	Item.show_list(program.filter(function(it) { return p.prog.indexOf(it.id) >= 0; }));
	EL("top").scrollIntoView();
}

Part.prototype.show_list = function(name_range) {
	var self = this, lp = !name_range ? this.list : this.list.filter(function(p) {
		var n0 = p.sortname[0].toUpperCase();
		return self.name_in_range(n0, name_range);
	});
	EL('part_names').innerHTML = lp.map(function(p) {
		return '<li><a href="#part/' + hash_encode(p.id) + '">' + clean_name(p, true) + '</a></li>';
	}).join('');
	EL('part_info').innerHTML = '';
	EL('prog_ls').innerHTML = '';
}

Part.prototype.update_view = function(name_range, participant) {
	var el_nr = EL('name_range'),
	    p_id = participant.substr(1),
	    i, l, ll;
	if (el_nr) {
		ll = el_nr.getElementsByTagName('li');
		for (i = 0, l = ll.length; i < l; ++i) {
			_set_class(ll[i], 'selected', (ll[i].getAttribute('data-range') == name_range));
		}
	}
	if (p_id) for (i = 0, l = this.list.length; i < l; ++i) {
		if (this.list[i].id == p_id) { this.show_one(i); break; }
	}
	if (!p_id || (i == this.list.length)) {
		participant = '';
		this.show_list(name_range);
	}
	ko.storage_set('part', { 'name_range': name_range, 'participant': participant });
}

Part.prototype.show = function(hash) {
	var self = this;
	function _name_range(name) {
		var n0 = name[0].toUpperCase(); if (!n0) return '';
		var par = EL('name_range'); if (!par) return '';
		var ll = par.getElementsByTagName('li');
		for (var i = 0, l = ll.length; i < l; ++i) {
			var range = ll[i].getAttribute('data-range');
			if (range && self.name_in_range(n0, range)) return range;
		}
		return '';
	}

	if (!this.list.length) { window.location.hash = ''; return; }
	var store = ko.storage_get('part') || {},
	    name_range = store.name_range || '',
	    participant = !document.body.classList.contains('part') && store.participant || '';
	ko.set_view('part');
	if (hash) {
		var p_id = hash_decode(hash.substr(1));
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
		var el_nr = EL('name_range');
		if (el_nr) name_range = el_nr.getElementsByTagName('li')[0].getAttribute('data-range');
	}
	this.update_view(name_range, participant);
}


Part.filter_click = function(ev, self) {
	var el = (ev || window.event).target;
	if (el.parentNode.id == 'name_range') {
		var name_range = el.getAttribute("data-range") || '';
		ko.storage_set('part', { 'name_range': name_range, 'participant': '' });
		window.location.hash = '#part';
		self.update_view(name_range, '');
	}
}
