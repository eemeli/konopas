import i18n from '../src/i18n-wrap';
import { arrays_equal, array_overlap, link_to_qr_code, link_to_short_url } from '../src/util';

export default function showStarView(konopas) {
	var view = document.getElementById('star_data'),
		hash = window.location.hash.substr(6),
		set_raw = (hash && (hash.substr(0,4) == 'set:')) ? hash.substr(4).split(',') : [],
		set = konopas.program.list.filter(p => set_raw.indexOf(p.id) >= 0).map(p => p.id),
		set_len = set.length,
		html = '',
		star_list = konopas.stars.list(),
		stars_len = star_list.length;
	if (konopas.sessionStore.limit && (!konopas.server || !konopas.server.connected)) {
		html = '<p>' + i18n.txt('star_no_memory', { WHY: konopas.sessionStore.limit, SERVER: !!konopas.server });
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
	(document.getElementById('star_set_set') || {}).onclick = () => { konopas.stars.set(set); };
	(document.getElementById('star_set_add') || {}).onclick = () => { konopas.stars.add(set); };
	if (konopas.server) konopas.server.show_ical_link(view);
	const ls = konopas.program.list.filter(it => (star_list.indexOf(it.id) >= 0) || (set.indexOf(it.id) >= 0));
	konopas.show_list(ls, { hide_ended: true });
	if (set_len) for (let i = 0; i < set_len; ++i) {
		const el = document.getElementById('s' + set[i]);
		if (el) el.classList.add('in_set');
	}
}
