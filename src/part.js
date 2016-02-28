import i18n from '../src/i18n-wrap';
import { clean_links, clean_name, hash_decode, hash_encode, new_elem } from '../src/util';


function bin_ranges(array, bin_size) {
	const prev_matches = (a, i) => (i > 0) && (a[i - 1] == a[i]);
	const next_matches = (a, i) => (i < a.length - 1) && (a[i + 1] == a[i]);
	const n_bins = bin_size ? Math.round(array.length / bin_size) : 0;
	const ends = [];
	for (var i = 1; i <= n_bins; ++i) {
		var e = Math.round(i * array.length / n_bins), n_up = 0, n_down = 0;
		if (e < 0) e = 0;
		if (e >= array.length) e = array.length - 1;
		while (next_matches(array, e + n_up)) ++n_up;
		if (n_up) while (prev_matches(array, e - n_down)) ++n_down;
		if (n_up <= n_down) e += n_up;
		else if (e > n_down) e -= n_down + 1;
		if (!ends.length || (ends[ends.length - 1] != array[e])) ends.push(array[e]);
	}
	let start = ' ';
	ends.forEach((e, i) => {
		if (e > start) ends[i] = start + e;
		if (e >= start) start = String.fromCharCode(e.charCodeAt(0) + 1);
	});
	return ends;
}


export default class Part {
	constructor(konopas, Item, list = []) {
		this.konopas = konopas;
		this.Item = Item;
		this.list = list;
		this.list.forEach(p => {
			p.sortname = ((p.name[1] || '') + '  ' + p.name[0]).toLowerCase().replace(/^ +/, '');
			if (!konopas.non_ascii_people) p.sortname = p.sortname.make_ascii();
		});
		this.list.sort(konopas.non_ascii_people
			? (a, b) => a.sortname.localeCompare(b.sortname, konopas.lc)
			: (a, b) => a.sortname < b.sortname ? -1 : a.sortname > b.sortname);
		this.set_ranges(konopas.people_per_screen || 0);
	}

	set_ranges(bin_size) {
		const fn = [], ln = [];
		this.list.forEach(p => {
			if (p.name && p.name.length) {
				fn.push(p.name[0].trim().charAt(0).toUpperCase());
				if (p.name.length >= 2) ln.push(p.name[1].trim().charAt(0).toUpperCase());
			}
		});

		this.ranges = bin_ranges(ln.length ? ln : fn, bin_size);
		['part-sidebar', 'part-narrow'].forEach(id => {
			const ul = new_elem('ul', 'name-list');
			this.ranges.forEach(n => {
				let startChar = n.charAt(0);
				if (startChar == ' ') startChar = 'A';
				const li = new_elem('li', '', startChar);
				if (n.length > 1) li.textContent += ' - ' + n.charAt(1);
				li.setAttribute('data-range', n);
				ul.appendChild(li);
			});
			const div = document.getElementById(id);
			div.appendChild(ul);
			div.onclick = ev => {
				const name_range = (ev || window.event).target.getAttribute('data-range');
				if (name_range) {
					this.konopas.store.set('part', { name_range: name_range, participant: '' });
					window.location.hash = '#part';
					this.update_view(name_range, '');
				}
			};
		});

		if (!fn.length || !ln.length) {
			const idx = (fn.length ? 1 : 0) + (ln.length ? 2 : 0);
			const cls = ['error', 'fn-only', 'ln-only'][idx];
			document.getElementById('part_names').classList.add(cls);
		}
	}

	name_in_range(n0, range) {
		switch (range.length) {
			case 1:  return (n0 == range[0]);
			case 2:  return this.konopas.non_ascii_people
				? (n0.localeCompare(range[0], this.konopas.lc) >= 0) && (n0.localeCompare(range[1], this.konopas.lc) <= 0)
				: ((n0 >= range[0]) && (n0 <= range[1]));
			default: return (range.indexOf(n0) >= 0);
		}
	}

	show_one(i) {
		const p = this.list[i];
		const name = clean_name(p, false);
		const pl = clean_links(p);
		let links = '', img = '';
		if (pl) {
			links += '<dl class="linklist">';
			for (let type in pl) if (type != 'img') {
				const tgt = pl[type].tgt, txt = pl[type].txt || tgt;
				links += `<dt>${type}:<dd><a href="${tgt}">${txt}</a>`;
			}
			links += '</dl>';
			if (pl.img && navigator.onLine) {
				img = `<a class="part_img" href="${pl.img.tgt}"><img src="${pl.img.tgt}" alt="${i18n.txt('Photo')}: ${name}"></a>`;
			}
		}
		document.getElementById('part_names').innerHTML = '';
		const bio = (p.bio || img) ? ('<p>' + img + p.bio) : '';
		document.getElementById('part_info').innerHTML = `<h2 id="part_title">${name}</h2>${bio}${links}`;
		this.Item.show_list(this.konopas.program.list.filter(it => p.prog.indexOf(it.id) >= 0));
		document.getElementById('top').scrollIntoView();
	}

	show_list(name_range) {
		const lp = !name_range ? this.list : this.list.filter(p => {
			const n0 = p.sortname[0].toUpperCase();
			return this.name_in_range(n0, name_range);
		});
		document.getElementById('part_names').innerHTML = lp.map(p => '<li><a href="#part/' + hash_encode(p.id) + '">' + clean_name(p, true) + '</a></li>').join('');
		document.getElementById('part_info').innerHTML = '';
		document.getElementById('prog_ls').innerHTML = '';
	}

	update_view(name_range, participant) {
		const p_id = participant.substr(1);
		const ll = document.querySelectorAll('.name-list > li');
		if (!name_range) name_range = this.ranges && this.ranges[0] || '';
		for (let i = 0; i < ll.length; ++i) {
			const cmd = (ll[i].getAttribute('data-range') == name_range) ? 'add' : 'remove';
			ll[i].classList[cmd]('selected');
		}
		if (!p_id || !this.list.some((p, i) => {
			if (p.id == p_id) { this.show_one(i); return true; }
		})) {
			participant = '';
			this.show_list(name_range);
		}
		this.konopas.store.set('part', { name_range, participant });
	}

	show(hash) {
		if (!this.list.length) { window.location.hash = ''; return; }
		var store = this.konopas.store.get('part') || {},
			name_range = store.name_range || '',
			participant = !document.body.classList.contains('part') && store.participant || '',
			hash = window.location.hash.substr(6);
		if (hash) {
			const p_id = hash_decode(hash);
			const pa = this.list.filter(p => p.id == p_id);
			if (pa.length) {
				participant = 'p' + pa[0].id;
				const n0 = pa[0].sortname[0].toUpperCase();
				if (!n0 || !this.ranges || !this.ranges.some(r => {
					if (this.name_in_range(n0, r)) { name_range = r; return true; }
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
}
