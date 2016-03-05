import i18n from '../src/i18n-wrap';
import PartData from '../src/partdata';
import { clean_links, clean_name, hash_decode, hash_encode, new_elem } from '../src/util';


export default class Part {
	constructor(konopas, list = []) {
		this.konopas = konopas;
        this.data = new PartData(list, konopas);
        this.show_ranges();
	}

	show_ranges() {
		['part-sidebar', 'part-narrow'].forEach(id => {
			const ul = new_elem('ul', 'name-list');
			this.data.ranges.forEach(n => {
				let startChar = n.charAt(0);
				if (startChar == ' ') startChar = 'A';
				const li = new_elem('li', '', startChar);
				if (n.length > 1) li.textContent += ' - ' + n.charAt(1);
				li.setAttribute('data-range', n);
				ul.appendChild(li);
			});
			const div = document.getElementById(id);
			div.appendChild(ul);
			div.onclick = (ev = window.event) => {
				const name_range = ev.target.getAttribute('data-range');
				if (name_range) {
					this.konopas.store.set('part', { name_range: name_range, participant: '' });
					window.location.hash = '#part';
					this.update_view(name_range, '');
				}
			};
		});
        const has_ln = this.data.has_last_names();
        const cls = this.data.has_first_names()
                  ? (has_ln ? '' : 'fn-only')
                  : (has_ln ? 'ln-only' : 'error');
        if (cls) document.getElementById('part_names').classList.add(cls);
	}

	show_one(i) {
		const p = this.data.list[i];
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
        const ls = this.konopas.program.list.filter(it => p.prog.indexOf(it.id) >= 0);
		this.konopas.show_list(ls);
		document.getElementById('top').scrollIntoView();
	}

	show_list(name_range) {
		const lp = !name_range ? this.data.list : this.data.list.filter(p => {
			const n0 = p.sortname[0].toUpperCase();
			return this.data.name_in_range(n0, name_range);
		});
		document.getElementById('part_names').innerHTML = lp.map(p => '<li><a href="#part/' + hash_encode(p.id) + '">' + clean_name(p, true) + '</a></li>').join('');
		document.getElementById('part_info').innerHTML = '';
		document.getElementById('prog_ls').innerHTML = '';
	}

	update_view(name_range, participant) {
		const p_id = participant.substr(1);
		const ll = document.querySelectorAll('.name-list > li');
		if (!name_range) name_range = this.data.ranges && this.data.ranges[0] || '';
		for (let i = 0; i < ll.length; ++i) {
			const cmd = (ll[i].getAttribute('data-range') == name_range) ? 'add' : 'remove';
			ll[i].classList[cmd]('selected');
		}
		if (!p_id || !this.data.list.some((p, i) => {
			if (p.id == p_id) { this.show_one(i); return true; }
		})) {
			participant = '';
			this.show_list(name_range);
		}
		this.konopas.store.set('part', { name_range, participant });
	}

	show() {
		if (!this.data.list.length) { window.location.hash = ''; return; }
        let name_range, participant;
        const hash = window.location.hash.substr(6);
		if (hash) {
            const p = this.data.get(hash_decode(hash));
            if (p) {
                name_range = this.data.find_name_range(p.sortname);
				participant = 'p' + p.id;
			} else {
				window.location.hash = '#part';
				return;
			}
		} else {
		    const store = this.konopas.store.get('part') || {};
		    if (!document.body.classList.contains('part') && store.participant) {
			    window.location.hash = '#part/' + store.participant.substr(1);
			    return;
            }
			name_range = store.name_range || '';
			participant = '';
        }
		this.update_view(name_range, participant);
	}
}
