import i18n from '../src/i18n-wrap';
import { glob_to_re, hash_decode, hash_encode, new_elem, parse_date, popup_open, pretty_time, prog_hash } from '../src/util';


function sort_prog_items(a, b) {
	if (!a.date != !b.date) return a.date ? -1 : 1;
	if (a.date < b.date) return -1;
	if (a.date > b.date) return  1;
	if (!a.time != !b.time) return a.time ? 1 : -1;
	if (a.time < b.time) return -1;
	if (a.time > b.time) return  1;
	if (a.loc && b.loc) {
		if (a.loc.length < b.loc.length) return -1;
		if (a.loc.length > b.loc.length) return  1;
		for (let i = a.loc.length - 1; i >= 0; --i) {
			if (a.loc[i] < b.loc[i]) return -1;
			if (a.loc[i] > b.loc[i]) return  1;
		}
	}
	return 0;
}

// read filters from url + ev -> set new hash
// To use, bind() to konopas
function filter_change(ev = window.event) {
	let key, value;
	switch (ev.type) {
		case 'click':
			if (ev.target.tagName.toLowerCase() != 'li') return;
			const popups = ev.target.getElementsByClassName('popup');
			if (popups && popups.length) return;
			key = ev.target.parentNode.id.replace(/\d+$/, '');
			value = ev.target.id;
			switch (key) {
				case 'area': value = value.replace(/^a([^a-zA-Z])/, '$1'); break;
				case 'tag':  value = value.replace(/^t([^a-zA-Z])/, '$1'); break;
			}
			break;
		case 'submit':
			ev.preventDefault();
			// fallthrough
		case 'blur':
			key = 'query';
			value = document.getElementById('q').value;
			break;
		default: return;
	}
	const filters = get_filters(this);
	filters[key] = value;
	if (filters.id && (key != 'id')) filters.id = '';
	set_filters(this, filters);
}

function get_filters(konopas) {
	const filters = { area:'', tag:'', query:'', id:'' };
	const h = window.location.toString().split('#')[1] || '';
    const tc = konopas && konopas.tag_categories;
	const tag_re = tc && tc.length && new RegExp('^' + tc.join('|') + '$');
	let	hash_set = false;
	if (h.substr(0, 5) == 'prog/') {
		h.substr(5).split('/').forEach(p => {
			const s = p.split(':');
			if ((s.length == 2) && s[0] && s[1]) {
				if (tag_re && tag_re.test(s[0])) {
					s[1] = p;
					s[0] = 'tag';
				}
				filters[s[0]] = hash_decode(s[1]);
				hash_set = true;
			}
		});
	}
	if (!hash_set && !document.body.classList.contains('prog')) {
		const store = konopas.store.get('prog');
		if (store) for (let k in store) {
			if (filters.hasOwnProperty(k)) filters[k] = store[k];
		}
	}
	return filters;
}

function set_filters(konopas, filters) {
	if (filters.id) filters = { id: filters.id };
	konopas.store.set('prog', filters);
	const prev_hash = window.location.toString().split('#')[1] || '';
	const hash = prog_hash(konopas.tag_categories, filters);
	if (prev_hash !== hash.substr(1)) {
		window.location.hash = hash;
		return true;
	}
	return false;
}


export default class Program {
    constructor(konopas, Item, list = [], opt = {}) {
        this.konopas = konopas;
        this.Item = Item;
	    this.list = list.sort(sort_prog_items);
	    this.list.forEach(p => {
		    if (p && p.date) {
			    const date = p.date.split(/\D+/);
			    const time = p.time && p.time.split(/\D+/) || [0,0];
                const t0 = new Date(date[0], date[1] - 1, date[2], time[0], time[1]);
			    if (!isNaN(t0)) {
                    p.t0 = t0;
				    const duration = p.time && Number(p.mins || konopas.default_duration) || (!p.time && 24*60-1) || 0;
			        p.t1 = new Date(t0.valueOf() + 60000 * duration);
                }
		    }
	    });
        const onchange = filter_change.bind(konopas);
	    const pf = document.getElementById('prog_filters');
	    pf.onclick = onchange;
	    const pl = pf.getElementsByClassName('popup-link');
	    for (let i = 0; i < pl.length; ++i) {
		    pl[i].setAttribute('data-title', pl[i].textContent);
		    pl[i].nextElementSibling.onclick = onchange;
	    }
	    const sf = document.getElementById('search');
	    if (sf) {
		    sf.onsubmit = document.getElementById('q').onblur = onchange;
		    sf.onreset = () => { set_filters(konopas, {}); };
	    }
	    this.init_filters(opt);
	    const pt = document.getElementById('tab_prog');
	    const pa = pt && pt.getElementsByTagName('a');
	    if (pa && pa.length) pa[0].onclick = (ev = window.event) => {
		    if (window.pageYOffset && document.body.classList.contains('prog')) {
			    window.scrollTo(0, 0);
			    ev.preventDefault();
		    }
	    };
    }

    init_filters(opt) {
	    var filter_el = document.getElementById('prog_lists');
        var labels = {};
        var regexp = {};
        var konopas = this.konopas;
	    function _txt(s) {
		    return i18n.txt(s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '));
	    }
	    function _ul(id) {
		    const el = document.createElement('ul');
		    el.id = id;
		    return el;
	    }
	    function add_li(par, id, txt) {
		    const el = document.createElement('li');
		    el.id = /^[^a-zA-Z]/.test(id) ? par.id[0] + id : id;
		    if (!txt) txt = labels[id] || _txt(id);
		    if (/^\s*$/.test(txt)) return;
		    el.textContent = /^[\\^$]/.test(txt) ? txt.substr(1) : txt;
		    if (regexp[id]) el.setAttribute('data-regexp', regexp[id]);
		    par.appendChild(el);
	    }
	    function _compare(a, b) {
		    function simplify(s) { return (labels[s] || s.replace(/^[^:]+:/, '')).toLowerCase().replace(/^the /, ''); }
			function separate(s) { return s.match(/\d+|\D+/g).map(v => Number(v) || v); }
			const _a = simplify(a);
            const _b = simplify(b);
		    if ((_a[0] == '$') != (_b[0] == '$')) return (_a < _b) ? 1 : -1; // $ == 0x24
		    if (/\d/.test(_a) && /\d/.test(_b)) {
			    const aa = separate(_a);
                const bb = separate(_b);
			    for (let i = 0; i < aa.length && i < bb.length; ++i) {
				    if (aa[i] < bb[i]) return -1;
				    if (aa[i] > bb[i]) return  1;
			    }
			    if (aa.length != bb.length) return aa.length < bb.length ? -1 : 1;
		    } else {
			    if (_a < _b) return -1;
			    if (_a > _b) return  1;
		    }
		    return 0;
	    }
	    function _ul2(par, id, name, prefix, list) {
		    const title = labels[name] || _txt(name);
		    const link = new_elem('div', 'popup-link', title + '…');
		    link.setAttribute('data-title', link.textContent);
		    link.addEventListener('click', popup_open);
		    const ul = new_elem('ul', 'popup');
		    ul.id = id;
		    ul.setAttribute('data-title', title);
		    ul.addEventListener('click', filter_change.bind(konopas));
		    for (let i = 0; i < list.length; ++i) {
			    const txt = labels[list[i]] || list[i].replace(prefix, '');
			    add_li(ul, list[i], txt);
		    }
		    const root = document.createElement('li');
		    root.appendChild(link);
		    root.appendChild(ul);
		    par.appendChild(root);
	    }
	    function _fill(id, items) {
            const o = opt[id];
		    labels = o.labels || {};
		    regexp = o.regexp || {};
		    for (let r in regexp) items[r] = 1;
            const ul = document.createElement('ul');
		    ul.id = id;
		    add_li(ul, `all_${id}s`);
		    let i = 0;
		    if (o.promote) for (i = 0; i < o.promote.length; ++i) {
			    add_li(ul, o.promote[i]);
			    delete items[o.promote[i]];
		    }
		    if (o.exclude) {
			    const re = new RegExp(o.exclude.join('|'));
			    for (let t in items) if (re.test(t)) delete items[t];
		    }
		    if (o.min_count) {
			    for (let t in items) if (items[t] < o.min_count) delete items[t];
		    }
		    let list = Object.keys(items).sort(_compare);
		    if (o.categories) for (i = 0; i < o.categories.length; ++i) {
			    const prefix = o.categories[i] + ':';
			    const list_in = [];
                const list_out = [];
			    for (let j = 0; j < list.length; ++j) {
				    if (list[j].substr(0, prefix.length) == prefix) {
					    list_in.push(list[j]);
				    } else {
					    list_out.push(list[j]);
				    }
			    }
			    switch (list_in.length) {
				    case 0:   break;
				    case 1:   add_li(ul, prefix + list_in[0]);  break;
				    default:  _ul2(ul, id + i, o.categories[i], prefix, list_in);
			    }
			    list = list_out;
		    }
		    if (list.length < 4) for (i = 0; i < list.length; ++i) add_li(ul, list[i]);
		    else _ul2(ul, id + i, id, '', list);
		    filter_el.appendChild(ul);
	    }

	    if (!opt || !filter_el) return;
	    while (filter_el.firstChild) filter_el.removeChild(filter_el.firstChild);
	    const days = {};
        const areas = {};
        const tags = {};
        const lvl = (opt.area && opt.area.loc_level) || 0;
	    for (let i = 0, l = this.list.length; i < l; ++i) {
		    const p = this.list[i];
		    if (p.date) days[p.date] = 1;
		    if (opt.area && p.loc && Array.isArray(p.loc)) {
                const loc = p.loc[lvl];
                if (loc) areas[loc] = (areas[loc] || 0) + 1;
            }
		    if (opt.tag && p.tags && Array.isArray(p.tags)) p.tags.forEach((tag, j) => {
			    const cat = opt.tag.set_category && opt.tag.set_category[tag];
			    if (cat) p.tags[j] = tag = cat + ':' + tag;
			    tags[tag] = (tags[tag] || 0) + 1;
		    });
	    }
	    if (opt.day && opt.day.exclude) {
		    const re = new RegExp(opt.day.exclude.join('|'));
		    for (let d in days) if (re.test(d)) delete days[d];
	    }
	    this.days = {};
	    for (let d in days) {
		    const date = parse_date(d);
            const d_n = { N: date ? date.getDay() : -1 };
		    this.days[d] = {
			    'short': i18n.txt('weekday_short_n', d_n),
			    'long': i18n.txt('weekday_n', d_n)
		    };
	    }
	    if (opt.area) _fill('area', areas);
	    if (opt.tag) _fill('tag', tags);
    }

    show_filter_sum(ls, filters) {
	    const fs = document.getElementById('filter_sum'); if (!fs) return;
	    const a_html = (txt, unset) => {
		    const excl = { id: 1 };
            if (unset) excl[unset] = 1;
            const hash = prog_hash(this.konopas.tag_categories, filters, excl);
		    return `<a href="${hash}">${txt}</a>`;
	    }
	    if (filters.id_only) {
            const d = { N: ls.length, TITLE: a_html(ls[0].title), ID: a_html(filters.id) };
		    fs.innerHTML = i18n.txt('filter_sum_id', d);
	    } else {
            const any_filters = !filters.show_all || filters.tag_str || filters.area_str || filters.query_str;
		    const d = { N: filters.n_listed,
			    ALL: any_filters ? '' : a_html(i18n.txt('all'), {}, 0),
			    TAG: filters.tag_str ? a_html(filters.tag_str, 'tag') : '' };
		    if (filters.day && !filters.show_all) {
			    d.DAY = i18n.txt('weekday_n', { N: parse_date(filters.day).getDay() });
			    if (filters.n_hidden) d.TIME = pretty_time(filters.now, this.konopas);
		    } else {
			    if (filters.n_hidden) d.LIVE = true;
		    }
		    if (filters.area_str) d.AREA = a_html(filters.area_str, 'area');
		    if (filters.query_str) d.Q = a_html(filters.query_str, 'query');
		    fs.innerHTML = i18n.txt('filter_sum', d);
	    }
    }

    // hashchange -> read filters from url + store -> set filters in html + store -> list items
    show() {
	    function _show_filters(filters) {
		    const prev = document.getElementById('prog_filters').getElementsByClassName('selected');
		    if (prev) for (let i = prev.length - 1; i >= 0; --i) {
			    const cl = prev[i].classList;
			    if (cl.contains('popup-link')) prev[i].textContent = prev[i].getAttribute('data-title') || i18n.txt('More') + '…';
			    cl.remove('selected');
		    }
		    for (let k in filters) {
			    if (k == 'query') {
				    const q = document.getElementById('q');
				    if (q) {
					    q.value = filters.query;
					    if (filters.query) q.classList.add('selected');
				    }
			    } else {
				    let id = filters[k];
				    if (!id) id = `all_${k}s`;
				    else if (id.match(/^[^a-zA-Z]/)) id = k[0] + id;
				    const el = document.getElementById(id);
				    if (el) {
					    el.classList.add('selected');
					    if (el.parentNode.id.match(/\d+$/)) {
						    const p = el.parentNode.parentNode.firstChild;
						    p.classList.add('selected');
						    p.textContent = el.textContent;
					    }
				    }
			    }
		    }
		    const qh = document.getElementById('q_hint');
		    if (qh) {
			    if (filters.query) {
				    if (/[?*"]/.test(filters.query)) {
					    qh.innerHTML = i18n.txt('search_hint');
					    qh.removeAttribute('onmouseup');
					    qh.style.cursor = 'auto';
				    } else {
					    qh.innerHTML = i18n.txt('search_hint') + ' ' + i18n.txt('search_example', {'X':filters.query+'*'});
					    qh.onmouseup = () => {
                            const q = document.getElementById('q');
                            q.value = filters.query + '*';
                            q.focus();
                            q.blur();
                        };
					    qh.style.cursor = 'pointer';
				    }
				    qh.style.display = 'block';
			    } else {
				    qh.style.display = 'none';
			    }
		    }
	    }
	    function _filter(it) {
		    if (this.area) {
			    if (this.area instanceof RegExp) {
				    if (!this.area.test(it.loc.join(';'))) return false;
			    } else {
				    if (!it.loc || (it.loc.indexOf(this.area) < 0)) return false;
			    }
		    }
		    if (this.tag) {
			    if (this.tag instanceof RegExp) {
				    if (!this.tag.test(it.title)) return false;
			    } else {
				    if (!it.tags || (it.tags.indexOf(this.tag) < 0)) return false;
			    }
		    }
		    if (this.query) {
			    const found = this.query.test(it.title)
				           || this.query.test(it.desc)
				           || (it.loc && this.query.test(it.loc.join('\t')))
				           || (it.tags && this.query.test(it.tags.join('\t')))
				           || (it.people && it.people.some(p => this.query.test(p.name)));
			    if (!found) return false;
		    }
		    return true;
	    }
	    function _show_list(filters, self) {
		    filters.area_str = filters.area || '';
		    if (filters.area && document.getElementById(filters.area)) {
			    const t = document.getElementById(filters.area).getAttribute('data-regexp');
			    if (t) filters.area = new RegExp(t);
		    }
		    filters.tag_str = filters.tag || '';
		    if (filters.tag && document.getElementById(filters.tag)) {
			    const t = document.getElementById(filters.tag).getAttribute('data-regexp');
			    if (t) filters.tag = new RegExp(t);
		    }
		    filters.query_str = filters.query || '';
		    if (filters.query) filters.query = glob_to_re(filters.query);
		    filters.id_only = !!filters.id;
		    if (filters.id_only) for (let i in filters) if ((i !== 'id') && (i !== 'id_only') && filters[i]) {
			    filters.id_only = false;
			    break;
		    }
		    const ls = self.list.filter(filters.id_only ? (it => it.id === filters.id) : _filter, filters);
		    if (filters.id && ls.every(p => p.id != filters.id)) {
			    filters.id = '';
			    if (set_filters(self.konopas, filters)) return;
		    }
		    filters.hide_ended = true;
		    filters.prog_view = true;
		    self.Item.show_list(ls, filters);
	    }

	    const filters = get_filters(this.konopas);
	    if (set_filters(this.konopas, filters)) return;
	    _show_filters(filters);
	    for (let k in filters) {
		    if (!k || !filters[k] || (filters[k] == `all_${k}s`)) delete filters[k];
	    }
	    _show_list(filters, this);
    }
}
