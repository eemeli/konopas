import i18n from '../src/i18n-wrap';
import { hash_decode, hash_encode, new_elem } from '../src/util';

function cleanName(p, spanParts) {
	let fn = '', ln = '';
	switch (p.name.length) {
		case 0:
			break;
		case 1:
			ln = p.name[0];
			break;
		case 2:
			if (p.name[1]) {
				fn = p.name[0];
				ln = p.name[1];
			} else {
				ln = p.name[0];
			}
			break;
		case 3:
			fn = p.name[2] + ' ' + p.name[0];
			ln = p.name[1];
			break;
		case 4:
			fn = p.name[2] + ' ' + p.name[0];
			ln = p.name[1] + (p.name[3] ? ', ' + p.name[3] : '');
			break;
	}
	return spanParts
		? '<span class="fn">' + fn.trim() + '</span> <span class="ln">' + ln.trim() + '</span>'
		: (fn + ' ' + ln).trim();
}

function cleanLinks(p) {
	if (!p || !p.links) return null;
	const o = {};
	let ok = false;
	if (p.links.img || p.links.photo) {
		let img = (p.links.img || p.links.photo).trim();
		if (/^www/.test(img)) img = 'http://' + img;
		if (/:\/\//.test(img)) { o.img = { tgt: img }; ok = true; }
	}
	if (p.links.url) {
		let url = p.links.url.trim();
		if (!/:\/\//.test(url)) url = 'http://' + url;
		o.URL = { tgt: url, txt: url.replace(/^https?:\/\//, '') };
		ok = true;
	}
	if (p.links.fb) {
		let fb = p.links.fb.trim().replace(/^(https?:\/\/)?(www\.)?facebook.com(\/#!)?\//, '');
		o.Facebook = { txt: fb };
		if (/[^a-zA-Z0-9.]/.test(fb) && !/^pages\//.test(fb)) fb = 'search.php?q=' + encodeURI(fb).replace(/%20/g, '+');
		o.Facebook.tgt = 'https://www.facebook.com/' + fb;
		ok = true;
	}
	if (p.links.twitter) {
		let tw = p.links.twitter.trim().replace(/[@＠﹫]/g, '').replace(/^(https?:\/\/)?(www\.)?twitter.com(\/#!)?\//, '');
		o.Twitter = { txt: '@' + tw };
		if (/[^a-zA-Z0-9_]/.test(tw)) tw = 'search/users?q=' + encodeURI(tw).replace(/%20/g, '+');
		o.Twitter.tgt = 'https://www.twitter.com/' + tw;
		ok = true;
	}
	return ok ? o : null;
}

function showOneParticipant(konopas, participant) {
	const name = cleanName(participant, false);
	const pl = cleanLinks(participant);
	let links = '', img = '';
	if (pl) {
		links += '<dl class="linklist">';
		for (let type in pl) if (type != 'img') {
			const tgt = pl[type].tgt;
            const txt = pl[type].txt || tgt;
			links += `<dt>${i18n.txt(type)}:<dd><a href="${tgt}">${txt}</a>`;
		}
		links += '</dl>';
		if (pl.img && navigator.onLine) {
			img = `<a class="part_img" href="${pl.img.tgt}"><img src="${pl.img.tgt}" alt="${i18n.txt('Photo')}: ${name}"></a>`;
		}
	}
	document.getElementById('part_names').innerHTML = '';
	const bio = (participant.bio || img) ? ('<p>' + img + participant.bio) : '';
	document.getElementById('part_info').innerHTML = `<h2 id="part_title">${name}</h2>${bio}${links}`;
    const ls = konopas.program.list.filter(it => participant.prog.indexOf(it.id) >= 0);
	konopas.show_list(ls);
	document.getElementById('top').scrollIntoView();
}

function showParticipantList(konopas, nameRange) {
	const lp = !nameRange ? konopas.participants.list : konopas.participants.list.filter(p => {
		const n0 = p.sortname[0].toUpperCase();
		return konopas.participants.name_in_range(n0, nameRange);
	});
	document.getElementById('part_names').innerHTML = lp.map(p => '<li><a href="#part/' + hash_encode(p.id) + '">' + cleanName(p, true) + '</a></li>').join('');
	document.getElementById('part_info').innerHTML = '';
	document.getElementById('prog_ls').innerHTML = '';
}

function updatePartView(konopas, nameRange, participant) {
	const ll = document.querySelectorAll('.name-list > li');
	if (!nameRange) nameRange = konopas.participants.ranges && konopas.participants.ranges[0] || '';
	for (let i = 0; i < ll.length; ++i) {
		const cmd = (ll[i].getAttribute('data-range') == nameRange) ? 'add' : 'remove';
		ll[i].classList[cmd]('selected');
	}
    let partId;
    if (participant) {
        showOneParticipant(konopas, participant);
        partId = participant.id;
    } else {
		showParticipantList(konopas, nameRange);
        partId = '';
	}
	konopas.sessionStore.set('part', { nameRange, partId });
}


export function initPartView(konopas) {
	['part-sidebar', 'part-narrow'].forEach(id => {
		const ul = new_elem('ul', 'name-list');
		konopas.participants.ranges.forEach(n => {
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
			const nameRange = ev.target.getAttribute('data-range');
			if (nameRange) {
				konopas.sessionStore.set('part', { nameRange, partId: '' });
				window.location.hash = '#part';
				updatePartView(konopas, nameRange, null);
			}
		};
	});
    const has_ln = konopas.participants.has_last_names();
    const cls = konopas.participants.has_first_names()
              ? (has_ln ? '' : 'fn-only')
              : (has_ln ? 'ln-only' : 'error');
    if (cls) document.getElementById('part_names').classList.add(cls);
}

export function showPartView(konopas) {
	if (!konopas.participants.list.length) { window.location.hash = ''; return; }
    let nameRange, participant;
    const hash = window.location.hash.substr(6);
	if (hash) {
        participant = konopas.participants.get(hash_decode(hash));
        if (!participant) {
			window.location.hash = '#part';
			return;
		}
        nameRange = konopas.participants.find_name_range(participant.sortname);
	} else {
		const store = konopas.sessionStore.get('part') || {};
		if (!document.body.classList.contains('part') && store.partId) {
			window.location.hash = '#part/' + store.partId;
			return;
        }
        participant = null;
		nameRange = store.nameRange || '';
    }
	updatePartView(konopas, nameRange, participant);
}
