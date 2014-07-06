function Item() {
	EL('prog_ls').onclick = Item.list_click;
	if (EL('scroll_link')) {
		EL('scroll_link').onclick = function() { EL('top').scrollIntoView(); return false; };
		if (window.navigator && navigator.userAgent.match(/Android [12]/)) {
			EL('time').style.display = 'none';
			EL('scroll').style.display = 'none';
		} else {
			window.onscroll = Item.scroll_time;
		}
	}
}

Item.show_extra = function(item, id) {
	function _tags(it) {
		if (!it.tags || !it.tags.length) return '';
		var o = {};
		it.tags.forEach(function(t) {
			var cat = 'tags';
			var tgt = Prog.hash({'tag': t});
			var a = t.split(':');
			if (a.length > 1) { cat = a.shift(); t = a.join(':'); }
			var link = '<a href="' + tgt + '">' + t + '</a>'
			if (o[cat]) o[cat].push(link);
			else o[cat] = [link];
		});
		var a = []; for (var k in o) a.push(i18n.txt('item_tags', {'T':k}) + ': ' + o[k].join(', '));
		return '<div class="discreet">' + a.join('<br>') + '</div>\n';
	}
	function _people(it) {
		if (!it.people || !it.people.length) return '';
		var a = it.people.map((typeof people == 'undefined') || !people.length
			? function(p) { return p.name; }
			: function(p) { return "<a href=\"#part/" + hash_encode(p.id) + "\">" + p.name + "</a>"; }
		);
		return '<div class="item-people">' + a.join(', ') + '</div>\n';
	}

	if (EL("e" + id)) return;
	var html = "";
	var a = program.filter(function(el) { return el.id == id; });
	if (a.length < 1) html = i18n.txt('item_not_found', {'ID':id});
	else {
		html = _tags(a[0]) + _people(a[0]);
		if (a[0].desc) html += "<p>" + a[0].desc;
	}
	var extra = _new_elem('div', 'extra');
	extra.id = 'e' + id;
	extra.innerHTML = html;
	item.appendChild(extra);
	if (ko.server) ko.server.show_extras(id, item);
}

Item.new = function(it) {
	function _loc_str(it) {
		var s = '';
		if (it.loc && it.loc.length) {
			s = it.loc[0];
			if (it.loc.length > 1) s += ' (' + it.loc.slice(1).join(', ') + ')';
		}
		if (it.mins && (it.mins != ko.default_duration)) {
			if (s) s += ', ';
			s += pretty_time(it.time, ko) + ' - ' + pretty_time(time_sum(it.time, it.mins), ko);
		}
		return s;
	}
	var frame = _new_elem('div', 'item_frame'),
	    star  = frame.appendChild(_new_elem('div', 'item_star')),
	    item  = frame.appendChild(_new_elem('div', 'item')),
	    title = item.appendChild(_new_elem('div', 'title')),
	    loc   = item.appendChild(_new_elem('div', 'loc')),
	    votes = ko.use_server ? item.appendChild(_new_elem('div', 'votes')) : {'id':''};
	if (ko.use_server) {
		votes.textContent = i18n.txt('Votes') + ': ';
		votes.appendChild(_new_elem('a', 'v_pos', '+0')).title = 'good';
		votes.appendChild(document.createTextNode(' / '));
		votes.appendChild(_new_elem('a', 'v_neg', '-0')).title = 'not so good';
	}

	Item.new = function(it) {
		star.id = 's' + it.id;
		item.id = 'p' + it.id;
		title.textContent = it.title;
		loc.textContent = _loc_str(it);
		votes.id = 'v' + it.id;
		return frame.cloneNode(true);
	};
	return Item.new(it);
}

Item.show_list = function(ls, show_id) {
	function _sort(a, b) {
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

	var frag = document.createDocumentFragment();
	var prev_date = "", prev_time = "";
	if ((ls.length > (show_id ? 1 : 0)) && (ls.length < ko.expand_all_max_items)) {
		frag.appendChild(_new_elem('div', 'item_expander', '» '))
			.appendChild(_new_elem('a', 'js-link', i18n.txt('Expand all')))
			.id = 'item_expander_link';
	}
	for (var i = 0, l = ls.length; i < l; ++i) {
		if (ls[i].date != prev_date) {
			if (ls[i].date < prev_date) { Item.show_list(ls.sort(_sort), show_id); return; }
			prev_date = ls[i].date;
			prev_time = "";
			frag.appendChild(_new_elem('div', 'new_day', pretty_date(ls[i].date, ko)));
		}
		if (ls[i].time != prev_time) {
			if (ls[i].time < prev_time) { Item.show_list(ls.sort(_sort), show_id); return; }
			prev_time = ls[i].time;
			frag.appendChild(document.createElement('hr'));
			frag.appendChild(_new_elem('div', 'new_time', pretty_time(ls[i].time, ko)))
				.setAttribute('data-day', i18n.txt('weekday_short_n', { 'N': ls[i].date ? parse_date(ls[i].date).getDay() : -1 }));
		}
		frag.appendChild(Item.new(ls[i]));
	}

	var LS = EL('prog_ls');
	while (LS.firstChild) LS.removeChild(LS.firstChild);
	LS.appendChild(frag);

	if (ko.server) ko.server.decorate_list(LS);

	var expand_all = EL("item_expander_link");
	if (expand_all) expand_all.onclick = function() {
		var items = LS.getElementsByClassName("item");
		var exp_txt = i18n.txt('Expand all');
		if (expand_all.textContent == exp_txt) {
			for (var i = 0, l = items.length; i < l; ++i) {
				items[i].parentNode.classList.add("expanded");
				Item.show_extra(items[i], items[i].id.substr(1));
			}
			expand_all.textContent = i18n.txt('Collapse all');
		} else {
			for (var i = 0, l = items.length; i < l; ++i) {
				items[i].parentNode.classList.remove("expanded");
			}
			expand_all.textContent = exp_txt;
		}
	};

	var star_els = LS.getElementsByClassName("item_star");
	for (var i = 0, l = star_els.length; i < l; ++i) {
		star_els[i].onclick = function() { ko.stars.toggle(this, this.id.substr(1)); return false; };
	}

	var star_list = ko.stars.list();
	for (var i = 0, l = star_list.length; i < l; ++i) {
		var el = EL('s' + star_list[i]);
		if (el) el.classList.add("has_star");
	}

	if (show_id) {
		var it = document.getElementById('p' + show_id);
		if (it) {
			it.parentNode.classList.add("expanded");
			Item.show_extra(it, show_id);
			if (ls.length > 1) it.scrollIntoView();
		}
	}
}

Item.list_click = function(ev) {
	function _set_location_id(id) {
		var f = Prog.get_filters(true);
		if (id && !f['day']) f['day'] = ko.show_all_days_by_default ? 'all_days' : ko.prog.default_day();
		f['id'] = id;
		return Prog.set_filters(f, true);
	}

	var el = (ev || window.event).target,
	    is_link = false;
	while (!/\bitem(_|$)/.test(el.className)) {
		if (el.id == 'prog_ls') return;
		if ((el.tagName.toLowerCase() == 'a') && el.href) is_link = true;
		el = el.parentNode;
	}
	if (!el.id || el.id[0] != 'p') return;
	var it_id = el.id.substr(1),
	    in_prog_view = document.body.classList.contains('prog');
	if (is_link) {
		if (in_prog_view) _set_location_id(it_id);
	} else {
		var open = el.parentNode.classList.toggle("expanded");
		if (open) Item.show_extra(el, it_id);
		if (in_prog_view) _set_location_id(open ? it_id : '');
	}
}

Item.prev_scroll = { "i": 0, "top": 0 };
Item.scroll_time = function() {
	var st = window.pageYOffset;
	EL("scroll").style.display = (st > 0) ? 'block' : 'none';
	st += 20; // to have more time for change behind new_time
	var te = EL("time"); if (!te) return;
	var tl = document.getElementsByClassName("new_time"); if (!tl.length) return;
	if (st < tl[0].offsetTop) {
		Item.prev_scroll.i = 0;
		Item.prev_scroll.top = tl[0].offsetTop;
		te.style.display = "none";
	} else {
		var i = Item.prev_scroll.top ? Item.prev_scroll.i : 1;
		if (i >= tl.length) i = tl.length - 1;
		if (st > tl[i].offsetTop) {
			while ((i < tl.length) && (st > tl[i].offsetTop)) ++i;
			--i;
		} else {
			while ((i >= 0) && (st < tl[i].offsetTop)) --i;
		}
		if (i < 0) i = 0;
		Item.prev_scroll.i = i;
		Item.prev_scroll.top = tl[i].offsetTop;
		te.textContent = tl[i].getAttribute('data-day') + '\n' + tl[i].textContent;
		te.style.display = "block";
	}
}
