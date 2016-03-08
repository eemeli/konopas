import i18n from '../src/i18n-wrap';
import { data_date, hash_encode, new_elem, parse_date, pretty_date, pretty_time, prog_hash, time_sum } from '../src/util';

function focus_day(day) {
    ['day-sidebar', 'day-narrow'].forEach(n => {
		const el = document.getElementById(n);
		const items = el && el.getElementsByTagName('li');
		if (items) for (let i = 0; i < items.length; ++i) {
			const dday = items[i].getAttribute('data-day');
			items[i].classList[(day == dday) ? 'add' : 'remove']('selected');
		}
    });
}

export default class Item {
    constructor(konopas) {
        this.konopas = konopas;
	    document.getElementById('prog_ls').onclick = ev => { this.list_click(ev); };
        const sl = document.getElementById('scroll_link');
	    if (sl) {
		    sl.onclick = (ev = window.event) => { window.scrollTo(0, 0); ev.preventDefault(); };
		    if (typeof navigator != 'undefined' && navigator.userAgent.match(/Android [12]/)) {
			    document.getElementById('time').style.display = 'none';
			    document.getElementById('scroll').style.display = 'none';
		    } else {
			    this.scroll = {
				    i: 0, top: 0,
				    day: '', day_txt: '',
				    time_el: document.getElementById('time'),
                    scroll_el: document.getElementById('scroll'),
				    times: document.getElementsByClassName('new_time')
			    };
			    window.onscroll = () => { this.scroll_time(window.pageYOffset); }
		    }
	    }
    }

    show_extra(item, id) {
        const tags_html = it => {
		    if (!it.tags || !it.tags.length) return '';
		    const o = {};
		    it.tags.forEach(tag => {
			    let cat = 'tags';
			    const tgt = prog_hash(this.konopas.tag_categories, { tag });
			    const a = tag.split(':');
			    if (a.length > 1) { cat = a.shift(); tag = a.join(':'); }
			    const link = `<a href="${tgt}">${tag}</a>`;
			    if (o[cat]) o[cat].push(link);
			    else o[cat] = [link];
		    });
		    const a = []; for (let k in o) a.push(i18n.txt('item_tags', { T: k }) + ': ' + o[k].join(', '));
		    return '<div class="discreet">' + a.join('<br>') + '</div>\n';
	    };
        const people_html = it => {
		    if (!it.people || !it.people.length) return '';
		    const a = it.people.map(!this.konopas.participants || !this.konopas.participants.list.length
			        ? p => p.name
			        : p => `<a href="#part/${hash_encode(p.id)}">${p.name}</a>`);
		    return '<div class="item-people">' + a.join(', ') + '</div>\n';
	    };

	    if (document.getElementById('e' + id)) return;
	    let html = '';
	    const a = this.konopas.program.list.filter(el => el.id == id);
	    if (a.length < 1) html = i18n.txt('item_not_found', { ID: id });
	    else {
            const it = a[0];
		    html = tags_html(it) + people_html(it);
		    if (it.desc) html += '<p>' + it.desc;
		    html += `<a href="#prog/id:${it.id}" class="permalink" title="${i18n.txt('Permalink')}"></a>`;
	    }
	    const extra = new_elem('div', 'extra');
	    extra.id = 'e' + id;
	    extra.innerHTML = html;
	    item.appendChild(extra);
	    if (this.konopas.server) this.konopas.server.show_extras(id, item);
    }

    create_item_el(it) {
        const loc_str = it => {
		    let s = '';
		    if (it.loc && it.loc.length) {
			    s = it.loc[0];
			    if (it.loc.length > 1) s += ' (' + it.loc.slice(1).join(', ') + ')';
		    }
		    if (it.mins && (it.mins != this.konopas.default_duration)) {
			    if (s) s += ', ';
			    s += pretty_time(it.time, this.konopas) + ' - ' + pretty_time(time_sum(it.time, it.mins), this.konopas);
		    }
		    return s;
	    };
	    const frame = new_elem('div', 'item_frame');
	    const star  = frame.appendChild(new_elem('div', 'item_star'));
	    const item  = frame.appendChild(new_elem('div', 'item'));
	    const title = item.appendChild(new_elem('div', 'title'));
	    const loc   = item.appendChild(new_elem('div', 'loc'));

	    this.create_item_el = function(it) {
		    star.id = 's' + it.id;
		    item.id = 'p' + it.id;
		    title.textContent = it.title;
		    loc.textContent = loc_str(it);
		    return frame.cloneNode(true);
	    };
	    return this.create_item_el(it);
    }

    show_day_links(ls, opt, day_lengths) {
		const days_click = (ev = window.event) => {
			const dday = ev.target.getAttribute('data-day');
			if (!dday) return;
			opt.day = dday;
			if (opt.show_all) {
				const dt = document.getElementById('dt_' + dday);
				if (dt) {
					dt.scrollIntoView();
					focus_day(dday);
				} else if (dday < data_date(opt.now)) {
					opt.hide_ended = false;
					this.show_list(ls, opt);
				}
			} else {
				opt.hide_ended = true;
				this.show_list(ls, opt);
			}
		};
		const days_set = (id, len) => {
		    const div = document.getElementById(id);
            if (!div) return;
			const ul = new_elem('ul', 'day-list');
			for (let day in this.konopas.program.days) {
                const txt = this.konopas.program.days[day][len] + ' (' + (day_lengths[day] || 0) + ')';
				const li = new_elem('li', (day == opt.day) && 'selected', txt);
				li.setAttribute('data-day', day);
				ul.appendChild(li);
			}
			ul.onclick = days_click;
			div.innerHTML = '';
			div.appendChild(ul);
		};
		days_set('day-sidebar', 'long');
		days_set('day-narrow', 'short');
    }

    show_list(ls, opt = {}) {
		let day_lengths = {};
		let prev_date = '';
        let prev_time = '';
		const add_list_item = (list, it) => {
			if (opt.day && it.date) {
				day_lengths[it.date] = (day_lengths[it.date] || 0) + 1;
			}
			if (opt.show_all || !opt.day || !it.date || (it.date == opt.day)) {
				if (opt.hide_ended && it.t1 && (it.t1 < opt.now)) { ++opt.n_hidden; return list; }
				if (it.date != prev_date) {
					prev_date = it.date;
					prev_time = '';
					list.appendChild(new_elem('div', 'new_day', pretty_date(it.t0 || it.date))).id = 'dt_' + it.date;
				}
				if (it.time != prev_time) {
					prev_time = it.time;
					list.appendChild(document.createElement('hr'));
					list.appendChild(new_elem('div', 'new_time', pretty_time(it.t0 || it.time, this.konopas)))
						.setAttribute('data-day', it.date);
				}
				list.appendChild(this.create_item_el(it));
				++opt.n_listed;
			}
            return list;
		};

        const day_links = {};
        const day_link_el = t => {
		    const d = day_links[t];
		    const txt = i18n.txt('day_link', {
				N: day_lengths[d],
				D: parse_date(d).getDay()
			});
		    const link = new_elem('a', 'day-link js-link', txt);
		    link.id = t + '_day_link';
		    link.onclick = () => {
			    if (t == 'next') window.scrollTo(0, 0);
			    opt.day = d;
			    this.show_list(ls, opt);
		    };
		    return link;
	    };
        const hidden_link_el = () => {
		    const txt = i18n.txt('hidden_link', {
				N: opt.n_hidden,
				T: pretty_time(opt.now, this.konopas),
				D: opt.now.getDay()
			});
		    const link = new_elem('a', 'day-link js-link', txt);
		    link.id = 'hidden_day_link';
		    link.onclick = () => {
			    opt.hide_ended = false;
			    opt.day = data_date(opt.now);
			    this.show_list(ls, opt);
		    };
		    return link;
	    }

        console.log(this);
	    opt.show_all = (ls.length <= this.konopas.max_items_per_page);
	    opt.n_hidden = 0; opt.n_listed = 0;
	    const _now = Date.now();
	    opt.now = new Date(_now + 10*60000 - _now % (10*60000));
	    if (!opt.day || !this.konopas.program.days[opt.day]) {
		    const day_now = data_date(opt.now);
		    if (this.konopas.program.days[day_now]) opt.day = day_now;
		    else { opt.day = ''; for (opt.day in this.konopas.program.days) break; }
	    }

		let frag = document.createDocumentFragment();
	    if (ls.length > (opt.id ? 1 : 0)) {
		    frag.appendChild(new_elem('div', 'item_expander', '» '))
			    .appendChild(new_elem('a', 'js-link', i18n.txt('Expand all')))
			    .id = 'item_expander_link';
	    }
	    frag = ls.reduce(add_list_item, frag);
	    if (!opt.n_listed && opt.n_hidden) {
		    day_lengths = {};
            opt.hide_ended = false;
		    opt.n_hidden = 0;
            opt.n_listed = 0;
		    prev_date = '';
            prev_time = '';
	        frag = ls.reduce(add_list_item, frag);
	    }

	    if (opt.day && !opt.show_all) for (let d in day_lengths) if (d in this.konopas.program.days) {
		    if (d < opt.day) day_links.prev = d;
		    else if ((d > opt.day) && !day_links.next) day_links.next = d;
	    }
	    if (day_links.prev && !opt.n_hidden) frag.insertBefore(day_link_el('prev'), frag.firstChild);
	    if (day_links.next) frag.appendChild(day_link_el('next'));
	    if (opt.n_hidden) frag.insertBefore(hidden_link_el(), frag.firstChild);

	    const LS = document.getElementById('prog_ls');
	    while (LS.firstChild) LS.removeChild(LS.firstChild);
	    LS.appendChild(frag);

	    const expand_all = document.getElementById('item_expander_link');
	    if (expand_all) expand_all.onclick = () => {
		    const items = LS.getElementsByClassName('item');
		    const exp_txt = i18n.txt('Expand all');
		    if (expand_all.textContent == exp_txt) {
			    for (let i = 0, l = items.length; i < l; ++i) {
                    const el = items[i];
				    el.parentNode.classList.add('expanded');
				    this.show_extra(el, el.id.substr(1));
			    }
			    expand_all.textContent = i18n.txt('Collapse all');
		    } else {
			    for (let i = 0, l = items.length; i < l; ++i) {
				    items[i].parentNode.classList.remove('expanded');
			    }
			    expand_all.textContent = exp_txt;
		    }
	    };

	    const star_els = LS.getElementsByClassName('item_star');
	    for (let i = 0, l = star_els.length; i < l; ++i) {
            const el = star_els[i];
		    el.onclick = (ev = window.event) => {
                const set = this.konopas.stars.toggle(el.id.substr(1));
                el.classList[set ? 'add' : 'remove']('has_star')
                ev.preventDefault();
            };
	    }
	    this.konopas.stars.list().forEach(s => {
		    const el = document.getElementById('s' + s);
		    if (el) el.classList.add('has_star');
	    });

		const it = opt.id && document.getElementById('p' + opt.id);
		if (it) {
			it.parentNode.classList.add('expanded');
			this.show_extra(it, opt.id);
			if (ls.length > 1) it.scrollIntoView();
		}

	    if (opt.prog_view) {
            this.show_day_links(ls, opt, day_lengths);
		    this.konopas.program.show_filter_sum(ls, opt);
	    }

	    this.scroll.i = 0;
	    window.onscroll && window.onscroll();
    }

    list_click(ev = window.event) {
	    for (let el = ev.target; !!el; el = el.parentNode) {
		    if (el.id == 'prog_ls') return;
		    if ((el.tagName.toLowerCase() == 'a') && el.href) return;
            if (/\bitem(_|$)/.test(el.className)) {
	            if (el.id && (el.id[0] == 'p')) {
		            if (el.parentNode.classList.toggle('expanded')) {
			            this.show_extra(el, el.id.substr(1));
		            }
	            }
                return;
            }
	    }
    }

    scroll_time(pos) {
        const offset = 20;  // to have more time for change behind new_time
	    const S = this.scroll;
		const st_len = S.times.length;
	    if (!S.time_el || !st_len) return;
	    if (pos + offset < S.times[0].offsetTop) {
		    S.i = 0;
		    S.top = S.times[0].offsetTop;
		    S.time_el.style.display = 'none';
		    const day0 = S.times[0].getAttribute('data-day');
		    if (day0 != S.day) {
			    focus_day(day0);
			    S.day = day0;
		    }
	    } else {
		    let i = S.top ? S.i : 1;
		    if (i >= st_len) i = st_len - 1;
		    if (pos + offset > S.times[i].offsetTop) {
			    while ((i < st_len) && (pos + offset > S.times[i].offsetTop)) ++i;
			    --i;
		    } else {
			    while ((i >= 0) && (pos + offset < S.times[i].offsetTop)) --i;
		    }
		    if (i < 0) i = 0;
		    if ((i == 0) || (i != S.i)) {
			    S.i = i;
			    S.top = S.times[i].offsetTop;
			    const day0 = S.times[i].getAttribute('data-day');
			    const day1 = ((i + 1 < st_len) && S.times[i+1].getAttribute('data-day')) || day0;
			    S.time_el.textContent = this.konopas.program.days[day0]['short'] + '\n' + S.times[i].textContent;
			    S.time_el.style.display = 'block';
			    if (day1 != S.day) {
				    focus_day(day1);
				    S.day = day1;
			    }
		    }
	    }
	    if (S.scroll_el) S.scroll_el.style.display = S.time_el.style.display;
    }
}
