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
}

KonOpas.Part.name_in_range = function(n0, range) {
	switch (range.length) {
		case 1:  return (n0 == range[0]);
		case 2:  return ko.non_ascii_people
			? (n0.localeCompare(range[0], ko.lc) >= 0) && (n0.localeCompare(range[1], ko.lc) <= 0)
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
	_el("part_names").innerHTML = '';
	_el("part_info").innerHTML =
		  '<h2 id="part_title">' + p_name + '</h2>'
		+ ((p.bio || img) ? ('<p>' + img + p.bio) : '')
		+ links;
	KonOpas.Item.show_list(ko.program.list.filter(function(it) { return p.prog.indexOf(it.id) >= 0; }));
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
	ko.storage_set('part', { 'name_range': name_range, 'participant': participant });
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
	var store = ko.storage_get('part') || {},
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
		ko.storage_set('part', { 'name_range': name_range, 'participant': '' });
		window.location.hash = '#part';
		this.update_view(name_range, '');
	}
}
