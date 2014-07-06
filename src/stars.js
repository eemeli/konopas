function Stars(id, opt) {
	opt = opt || {};
	this.name = 'konopas.' + id + '.stars';
	this.store = opt.store || localStorage || sessionStorage || (new (function() {
		var data = {};
		this.getItem = function(k) { return data[k]; };
		this.setItem = function(k, v) { data[k] = v; };
	})());
	this.tag = opt.tag || 'has_star';
	this.server = false;
	this.data = this.read();
}

Stars.prototype.read = function() {
	return JSON.parse(this.store && this.store.getItem(this.name) || '{}');
}

Stars.prototype.write = function() {
	try {
		if (this.store) this.store.setItem(this.name, JSON.stringify(this.data));
	} catch (e) {
		if ((e.code != DOMException.QUOTA_EXCEEDED_ERR) || (this.store.length != 0)) { throw e; }
	}
}

Stars.prototype.persistent = function() {
	return this.store && ((this.store == localStorage) || this.server && this.server.connected);
}

Stars.prototype.list = function() {
	var list = [];
	if (this.data) for (var id in this.data) {
		if ((this.data[id].length == 2) && this.data[id][0]) list.push(id);
	}
	return list;
}

Stars.prototype.add = function(star_list, mtime) {
	mtime = mtime || Math.floor(Date.now()/1000);
	star_list.forEach(function(id) { this.data[id] = [1, mtime]; }, this);

	this.write();
	if (this.server) this.server.set_prog(this.list());
}

Stars.prototype.set = function(star_list) {
	var mtime = Math.floor(Date.now()/1000);
	if (this.data) for (var id in this.data) {
		this.data[id] = [0, mtime];
	}
	this.add(star_list, mtime);
}

Stars.prototype.toggle = function(el, id) {
	var add_star = !el.classList.contains(this.tag);
	var mtime = Math.floor(Date.now()/1000);

	this.data[id] = [add_star ? 1 : 0, mtime];
	this.write();
	if (this.server) this.server.add_prog(id, add_star);

	if (add_star) el.classList.add(this.tag);
	else          el.classList.remove(this.tag);
}

Stars.prototype.sync = function(new_data) {
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
		if (redraw) init_view();
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
