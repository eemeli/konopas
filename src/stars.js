KonOpas.Stars = function(id, opt) {
	opt = opt || {};
	this.name = 'konopas.' + id + '.stars';
	try { this.store = localStorage || sessionStorage || (new KonOpas.VarStore()); }
	catch (e) { this.store = new KonOpas.VarStore(); }
	this.tag = opt.tag || 'has_star';
	this.server = false;
	this.data = this.read();
}

KonOpas.Stars.prototype.read = function() {
	return JSON.parse(this.store && this.store.getItem(this.name) || '{}');
}

KonOpas.Stars.prototype.write = function() {
	try {
		if (this.store) this.store.setItem(this.name, JSON.stringify(this.data));
	} catch (e) {
		if ((e.code != DOMException.QUOTA_EXCEEDED_ERR) || (this.store.length != 0)) { throw e; }
	}
}

KonOpas.Stars.prototype.list = function() {
	var list = [];
	if (this.data) for (var id in this.data) {
		if ((this.data[id].length == 2) && this.data[id][0]) list.push(id);
	}
	return list;
}

KonOpas.Stars.prototype.add = function(star_list, mtime) {
	mtime = mtime || Math.floor(Date.now()/1000);
	star_list.forEach(function(id) { this.data[id] = [1, mtime]; }, this);

	this.write();
	if (this.server) this.server.set_prog(this.list());
}

KonOpas.Stars.prototype.set = function(star_list) {
	var mtime = Math.floor(Date.now()/1000);
	if (this.data) for (var id in this.data) {
		this.data[id] = [0, mtime];
	}
	this.add(star_list, mtime);
}

KonOpas.Stars.prototype.toggle = function(el, id) {
	var add_star = !el.classList.contains(this.tag);
	var mtime = Math.floor(Date.now()/1000);

	this.data[id] = [add_star ? 1 : 0, mtime];
	this.write();
	if (this.server) this.server.add_prog(id, add_star);

	if (add_star) el.classList.add(this.tag);
	else          el.classList.remove(this.tag);
}

KonOpas.Stars.prototype.sync = function(new_data) {
	var local_mod = [], redraw = false;
	for (var id in new_data) {
		if (new_data[id].length != 2) {
			_log('Stars.sync: invalid input ' + id + ': ' + JSON.stringify(new_data[id]), 'warn');
			continue;
		}
		if (!(id in this.data) || (new_data[id][1] > this.data[id][1])) {
			local_mod.push(id);
			if (!(id in this.data) || (new_data[id][0] != this.data[id][0])) redraw = true;
			this.data[id] = new_data[id];
		}
	}
	if (local_mod.length) {
		_log('Stars.sync: local changes: ' + local_mod + (redraw ? ' -> redraw' : ''));
		this.write();
		if (redraw) konopas.set_view();
	}

	if (this.server) {
		var server_add = [], server_rm = [];
		for (var id in this.data) {
			if (!(id in new_data) || (new_data[id][1] < this.data[id][1])) {
				if (this.data[id][0]) server_add.push(id);
				else                  server_rm.push(id);
			}
		}
		if (server_add.length) {
			_log('Stars.sync: server add: ' + server_add);
			this.server.add_prog(server_add, true);
		}
		if (server_rm.length) {
			_log('Stars.sync: server rm: ' + server_rm);
			this.server.add_prog(server_rm, false);
		}

		if (!local_mod.length && !server_add.length && !server_rm.length) {
			_log('Stars.sync: no changes');
		}
	}
}

KonOpas.Stars.prototype.show = function() {
	var view = _el("star_data"),
		hash = window.location.hash.substr(6),
	    set_raw = (hash && (hash.substr(0,4) == 'set:')) ? hash.substr(4).split(',') : [],
	    set = konopas.program.list.filter(function(p) { return (set_raw.indexOf(p.id) >= 0); }).map(function(p) { return p.id; }),
	    set_len = set.length,
	    html = '',
	    star_list = this.list(),
	    stars_len = star_list.length;
	if (konopas.store.limit && (!this.server || !this.server.connected)) {
		html = '<p>' + i18n.txt('star_no_memory', {'WHY': konopas.store.limit, 'SERVER': !!this.server});
	}
	if (!stars_len && !set_len) {
		_el("prog_ls").innerHTML = '';
		view.innerHTML = html + '<p>' + i18n.txt('star_hint');
		return;
	}
	document.body.classList.remove("show_set");
	set.sort();
	star_list.sort();
	var set_link = '#star/set:' + star_list.join(',');
	if (set_len) {
		if (KonOpas.arrays_equal(set, star_list)) {
			html += '<p>' + i18n.txt('star_export_this', { 'THIS':set_link }) + '<p>' +
				i18n.txt('star_export_share', {
					'SHORT': KonOpas.link_to_short_url(location.href),
					'QR': KonOpas.link_to_qr_code(location.href)
				});
		} else {
			document.body.classList.add("show_set");
			var n_same = KonOpas.array_overlap(set, star_list);
			var n_new = set_len - n_same;
			var n_bad = set_raw.length - set_len;
			html += '<p>' + i18n.txt('star_import_this', {'THIS':location.href})
				+ '<p>' + i18n.txt('star_import_diff', { 'PREV':stars_len, 'NEW':n_new, 'SAME':n_same });
			if (n_bad) html += ' ' + i18n.txt('star_import_bad', {'BAD':n_bad});
			if (!stars_len || (n_same != stars_len)) {
				html += '<p>&raquo; <a href="#star" id="star_set_set">' + i18n.txt('star_set') + '</a>';
			}
			if (stars_len) {
				if (n_same != stars_len) {
					var d = [];
					if (n_new) d.push(i18n.txt('add_n', {'N':n_new}));
					d.push(i18n.txt('discard_n', {'N':stars_len - n_same}));
					html += ' (' + d.join(', ') + ')';
				}
				if (n_new) html += '<p>&raquo; <a href="#star" id="star_set_add">' + i18n.txt('star_add', {'N':n_new}) + '</a>';
			}
		}
	} else {
		html += '<p id="star_links">&raquo; ' + i18n.txt('star_export_link', { 'URL':set_link, 'N':stars_len });
	}
	view.innerHTML = html;
	var el_set = _el('star_set_set'); if (el_set) el_set.onclick = function() { konopas.stars.set(set); return true; };
	var el_add = _el('star_set_add'); if (el_add) el_add.onclick = function() { konopas.stars.add(set); return true; };
	if (this.server) this.server.show_ical_link(view);
	var ls = konopas.program.list.filter(function(it) { return (star_list.indexOf(it.id) >= 0) || (set.indexOf(it.id) >= 0); });
	KonOpas.Item.show_list(ls, {hide_ended:true});
	if (set_len) for (var i = 0; i < set_len; ++i) {
		var el = _el('s' + set[i]);
		if (el) el.classList.add("in_set");
	}
}
