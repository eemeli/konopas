import i18n from '../src/i18n-wrap';
import { arrays_equal, array_overlap, link_to_qr_code, link_to_short_url, log, VarStore } from '../src/util';

export default class {
	constructor(konopas, opt = {}) {
        this.konopas = konopas;
		this.name = 'konopas.' + konopas.id + '.stars';
		try { this.store = localStorage || sessionStorage || (new VarStore()); }
		catch (e) { this.store = new VarStore(); }
		this.tag = opt.tag || 'has_star';
		this.server = false;
		this.data = this.read();
	}

	read() {
		return JSON.parse(this.store.getItem(this.name) || '{}');
	}

	write() {
		try {
			this.store.setItem(this.name, JSON.stringify(this.data));
		} catch (e) {
			if ((e.code != DOMException.QUOTA_EXCEEDED_ERR) || (this.store.length != 0)) { throw e; }
		}
	}

	list() {
		const list = [];
		if (this.data) for (let id in this.data) {
			if ((this.data[id].length == 2) && this.data[id][0]) list.push(id);
		}
		return list;
	}

	add(star_list, mtime = Math.floor(Date.now() / 1000)) {
		star_list.forEach(id => { this.data[id] = [1, mtime]; });
		this.write();
		if (this.server) this.server.set_prog(this.list());
	}

	set(star_list) {
		const mtime = Math.floor(Date.now() / 1000);
		if (this.data) for (let id in this.data) {
			this.data[id] = [0, mtime];
		}
		this.add(star_list, mtime);
	}

	toggle(el, id) {
		const add_star = !el.classList.contains(this.tag);
		const mtime = Math.floor(Date.now() / 1000);
		this.data[id] = [add_star ? 1 : 0, mtime];
		this.write();
		if (this.server) this.server.add_prog(id, add_star);
		if (add_star) el.classList.add(this.tag);
		else		  el.classList.remove(this.tag);
	}

	sync(new_data) {
		const local_mod = [];
        let redraw = false;
		for (let id in new_data) {
			if (new_data[id].length != 2) {
				log('Stars.sync: invalid input ' + id + ': ' + JSON.stringify(new_data[id]), 'warn');
				continue;
			}
			if (!(id in this.data) || (new_data[id][1] > this.data[id][1])) {
				local_mod.push(id);
				if (!(id in this.data) || (new_data[id][0] != this.data[id][0])) redraw = true;
				this.data[id] = new_data[id];
			}
		}
		if (local_mod.length) {
			log('Stars.sync: local changes: ' + local_mod + (redraw ? ' -> redraw' : ''));
			this.write();
			if (redraw) this.konopas.set_view();
		}
        this.sync_server(new_data);
	}

	sync_server(new_data) {
		if (!this.server) return;
		var server_add = [], server_rm = [];
		for (let id in this.data) {
			if (!(id in new_data) || (new_data[id][1] < this.data[id][1])) {
				if (this.data[id][0]) server_add.push(id);
				else				  server_rm.push(id);
			}
		}
		if (server_add.length) {
			log('Stars.sync: server add: ' + server_add);
			this.server.add_prog(server_add, true);
		}
		if (server_rm.length) {
			log('Stars.sync: server rm: ' + server_rm);
			this.server.add_prog(server_rm, false);
		}
    }

	show() {
		var view = document.getElementById('star_data'),
			hash = window.location.hash.substr(6),
			set_raw = (hash && (hash.substr(0,4) == 'set:')) ? hash.substr(4).split(',') : [],
			set = this.konopas.program.list.filter(p => set_raw.indexOf(p.id) >= 0).map(p => p.id),
			set_len = set.length,
			html = '',
			star_list = this.list(),
			stars_len = star_list.length;
		if (this.konopas.store.limit && (!this.server || !this.server.connected)) {
			html = '<p>' + i18n.txt('star_no_memory', { WHY: this.konopas.store.limit, SERVER: !!this.server });
		}
		if (!stars_len && !set_len) {
			document.getElementById('prog_ls').innerHTML = '';
			view.innerHTML = html + '<p>' + i18n.txt('star_hint');
			return;
		}
		document.body.classList.remove('show_set');
		set.sort();
		star_list.sort();
		const set_link = '#star/set:' + star_list.join(',');
		if (set_len) {
			if (arrays_equal(set, star_list)) {
				html += '<p>' + i18n.txt('star_export_this', { THIS: set_link }) + '<p>' +
					i18n.txt('star_export_share', {
						SHORT: link_to_short_url(location.href),
						QR: link_to_qr_code(location.href)
					});
			} else {
				document.body.classList.add('show_set');
				const n_same = array_overlap(set, star_list);
				const n_new = set_len - n_same;
				const n_bad = set_raw.length - set_len;
				html += '<p>' + i18n.txt('star_import_this', { THIS: location.href })
				      + '<p>' + i18n.txt('star_import_diff', { PREV: stars_len, NEW: n_new, SAME: n_same });
				if (n_bad) html += ' ' + i18n.txt('star_import_bad', { BAD: n_bad });
				if (!stars_len || (n_same != stars_len)) {
					html += '<p>&raquo; <a href="#star" id="star_set_set">' + i18n.txt('star_set') + '</a>';
				}
				if (stars_len) {
					if (n_same != stars_len) {
						const d = [];
						if (n_new) d.push(i18n.txt('add_n', { N: n_new }));
						d.push(i18n.txt('discard_n', { N: stars_len - n_same }));
						html += ' (' + d.join(', ') + ')';
					}
					if (n_new) html += '<p>&raquo; <a href="#star" id="star_set_add">' + i18n.txt('star_add', { N: n_new }) + '</a>';
				}
			}
		} else {
			html += '<p id="star_links">&raquo; ' + i18n.txt('star_export_link', { URL: set_link, N: stars_len });
		}
		view.innerHTML = html;
		(document.getElementById('star_set_set') || {}).onclick = () => { this.set(set); };
		(document.getElementById('star_set_add') || {}).onclick = () => { this.add(set); };
		if (this.server) this.server.show_ical_link(view);
		const ls = this.konopas.program.list.filter(it => (star_list.indexOf(it.id) >= 0) || (set.indexOf(it.id) >= 0));
		this.konopas.show_list(ls, { hide_ended: true });
		if (set_len) for (let i = 0; i < set_len; ++i) {
			const el = document.getElementById('s' + set[i]);
			if (el) el.classList.add('in_set');
		}
	}
}
