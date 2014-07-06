var ko = {
	// these are default values, use konopas_set to override
	'id': '',
	'lc': 'en',
	'full_version': !navigator.userAgent.match(/Android [12]/),
	'tag_categories': false,
	'default_duration': 60,
	'time_show_am_pm': false,
	'abbrev_00_minutes': true, // only for am/pm time
	'always_show_participants': false,
	'expand_all_max_items': 100,
	'show_all_days_by_default': false,
	'non_ascii_people': false, // setting true enables correct but slower sort
	'use_server': false,
	'log_messages': true
};
if (typeof konopas_set == 'object') for (var i in konopas_set) ko[i] = konopas_set[i];

var i18n_txt = function(key){ return key; };
if ((typeof i18n != 'undefined') && i18n[ko.lc]) {
	i18n_txt = function(key, data){ return key in i18n[ko.lc] ? i18n[ko.lc][key](data) : key; };
	i18n_translate_html(i18n[ko.lc], 'data-txt');
}

if (!ko.id) alert(i18n_txt('no_ko_id'));
if (!Array.prototype.indexOf || !Array.prototype.filter || !Array.prototype.map || !Date.now || !('localStorage' in window)) alert(i18n_txt('old_browser'));
var stars = new Stars(ko.id);
var server = ko.use_server && window.Server && new Server(ko.id, stars);

var views = [ "next", "star", "prog", "part", "info" ];
function set_view(new_view) {
	var cl = document.body.classList;
	for (var i = 0; i < views.length; ++i) {
		cl[new_view == views[i] ? 'add' : 'remove'](views[i]);
	}
}

if (!ko.log_messages) _log = function(){};

function storage_get(name) {
	var v = sessionStorage.getItem('konopas.' + ko.id + '.' + name);
	return v ? JSON.parse(v) : v;
}

function storage_set(name, value) {
	try {
		sessionStorage.setItem('konopas.' + ko.id + '.' + name, JSON.stringify(value));
	} catch (e) {
		if ((e.code === DOMException.QUOTA_EXCEEDED_ERR) && (sessionStorage.length === 0)) {
			storage_set = function(){};
			alert(i18n_txt('private_mode'));
		} else throw e;
	}
}


// ------------------------------------------------------------------------------------------------ next view

function update_next_select(t_off) {
	var ts = EL("next_time_select");
	if (!ts) return;

	var t_step = 30;
	var t_range = [-12 * t_step, 12 * t_step];
	var t = new Date();
	t.setMinutes(Math.floor(t.getMinutes()/15) * 15 + t_range[0]);
	ts.options.length = 0;
	for (var m = t_range[0]; m <= t_range[1]; m += t_step) {
		var opt = document.createElement('option');
		opt.value = m;
		opt.text = i18n_txt('weekday_n', {'N':t.getDay()}) + ', ' + pretty_time(t, ko);
		if (m == t_off) opt.selected = true;
		if (!m) opt.id = 'next_time_select_now';
		ts.add(opt);
		t.setMinutes(t.getMinutes() + t_step);
	}

	ts.onchange = function() { update_next_list(selected_id("next_type")); }
	var tb = EL("next_earlier");
	if (tb) tb.onclick = function() { ts.selectedIndex = Math.max(ts.selectedIndex - 1, 0); ts.onchange(); };
	var ta = EL("next_later");
	if (ta) ta.onclick = function() { ts.selectedIndex = Math.min(ts.selectedIndex + 1, ts.length - 1); ts.onchange(); };
}

function update_next_list(next_type) {
	var ls = EL("next_time_select");
	var t_off = (ls.selectedIndex >= 0) ? parseInt(ls[ls.selectedIndex].value) : 0;
	if (!t_off) t_off = 0;
	update_next_select(t_off);

	var t = new Date();
	t.setMinutes(Math.floor(t.getMinutes()/15) * 15 + t_off);
	var t_date = string_date(t);
	var t_time = string_time(t);

	t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); // to match Date.parse() time below

	var next = {};
	var ms_next = 0;
	var ms_max = t.valueOf() + 60 * 60 * 1000;
	var n = 0;
	for (var i = 0, l = program.length; i < l; ++i) {
		var it = program[i];
		if (it.date < t_date) continue;
		if ((it.date == t_date) && (it.time < t_time)) continue;

		var ms_it = Date.parse(it.date + 'T' + it.time);
		if ((!ms_next || (ms_it < ms_next)) && (ms_it > ms_max)) ms_next = ms_it;

		if (next_type == "next_by_room") {
			if (it.loc) {
				if (next[it.loc[0]]) {
					if (next[it.loc[0]].date < it.date) continue;
					if ((next[it.loc[0]].date == it.date) && (next[it.loc[0]].time < it.loc[0])) continue;
				}
				next[it.loc[0]] = it;
			}
		} else {
			if (ms_it <= ms_max) next['n' + (++n)] = it;
		}
	}

	var next_prog = [];
	for (var k in next) next_prog.push(next[k]);

	if (next_prog.length > 0) {
		EL("next_start_note").textContent = '';
	} else if (ms_next) {
		var t0 = new Date();
		t0.setMinutes(t0.getMinutes() + t_off - t0.getTimezoneOffset());
		var min_next = Math.floor((ms_next - t0) / 60000);
		var h_next = Math.floor(min_next / 60);
		if (h_next >= 1) min_next -= h_next * 60;
		EL("next_start_note").textContent = i18n_txt('next_start', { 'H':h_next, 'M':min_next });
	} else {
		EL("next_start_note").textContent = i18n_txt('next_ended');
	}

	Item.show_list(next_prog);
}

function update_next_filters(next_type) {
	if (next_type != "next_by_room") next_type = "next_by_hour";
	var ul = EL("next_type").getElementsByTagName("li");
	for (var i = 0, l = ul.length; i < l; ++i) {
		_set_class(ul[i], 'selected', (ul[i].id == next_type));
	}

	storage_set('next', { 'next_type': next_type })
}


function show_next_view() {
	set_view("next");

	var next_type = "next_by_hour";

	var store = storage_get('next') || {};
	if ('next_type' in store) next_type = store.next_type;

	update_next_list(next_type);
	update_next_filters(next_type);
}


function next_filter_click(ev) {
	var el = (ev || window.event).target;
	if (el.parentNode.id == 'next_type') {
		update_next_list(el.id);
		update_next_filters(el.id);
	}
}



// ------------------------------------------------------------------------------------------------ "my con" view




// ------------------------------------------------------------------------------------------------ program view


// ------------------------------------------------------------------------------------------------ participant view


// ------------------------------------------------------------------------------------------------ info view

var lu = EL('last-updated'), lu_time = 0;

function init_last_updated() {
	var cache_manifest = document.body.parentNode.getAttribute('manifest');
	if (lu && cache_manifest && (location.protocol == 'http:')) {
		var x = new XMLHttpRequest();
		x.onload = function() {
			lu_time = new Date(this.getResponseHeader("Last-Modified"));
			show_last_updated();
		};
		x.open('GET', cache_manifest, true);
		x.send();
	}
}

function show_last_updated() {
	if (!lu || !lu_time) return;
	var span = lu.getElementsByTagName('span')[0];
	span.textContent = pretty_time_diff(lu_time, i18n_txt);
	span.title = lu_time.toLocaleString();
	span.onclick = function(ev) {
		var self = (ev || window.event).target;
		var tmp = self.title;
		self.title = self.textContent;
		self.textContent = tmp;
	};
	lu.style.display = 'inline';
}

function show_info_view() {
	set_view("info");
	show_last_updated();
	EL("prog_ls").innerHTML = "";
}



// ------------------------------------------------------------------------------------------------ init


EL('prog_ls').onclick = Item.list_click;

EL('next_filters').onclick = next_filter_click;


// init prog view
var prog = new Prog();

// init part view
var part = new Part(people, ko);


// set up fixed time display
if (EL("scroll_link")) {
	EL("scroll_link").onclick = function() { EL("top").scrollIntoView(); return false; };
	var prev_scroll = { "i": 0, "top": 0 };
	var n = 0;
	if (ko.full_version) { window.onscroll = function() {
		var st = window.pageYOffset;

		EL("scroll").style.display = (st > 0) ? 'block' : 'none';

		st += 20; // to have more time for change behind new_time
		var te = EL("time"); if (!te) return;
		var tl = document.getElementsByClassName("new_time"); if (!tl.length) return;
		if (st < tl[0].offsetTop) {
			prev_scroll.i = 0;
			prev_scroll.top = tl[0].offsetTop;
			te.style.display = "none";
		} else {
			var i = prev_scroll.top ? prev_scroll.i : 1;
			if (i >= tl.length) i = tl.length - 1;
			if (st > tl[i].offsetTop) {
				while ((i < tl.length) && (st > tl[i].offsetTop)) ++i;
				--i;
			} else {
				while ((i >= 0) && (st < tl[i].offsetTop)) --i;
			}
			if (i < 0) i = 0;

			prev_scroll.i = i;
			prev_scroll.top = tl[i].offsetTop;
			te.textContent = tl[i].getAttribute('data-day') + '\n' + tl[i].textContent;
			te.style.display = "block";
		}
	};} else {
		EL("time").style.display = "none";
		EL("scroll").style.display = "none";
	}
}


// init info view
init_last_updated();


var pl = document.getElementsByClassName('popup-link');
for (var i = 0; i < pl.length; ++i) pl[i].addEventListener('click', popup_open);



function init_view() {
	var opt = window.location.hash.substr(1);
	switch (opt.substr(0,4)) {
		case 'next': show_next_view(); break;
		case 'star': stars.show(opt.substr(4)); break;
		case 'part': part.show(opt.substr(4)); break;
		case 'info': show_info_view(); break;
		default:     prog.show(); break;
	}

	if (EL("load_disable")) EL("load_disable").style.display = "none";
}

init_view();
window.onhashchange = init_view;


if (EL('refresh')) window.addEventListener('load', function() {
	var cache = window.applicationCache;
	cache.addEventListener('updateready', function() {
		if (cache.status == cache.UPDATEREADY) {
			EL('refresh').classList.add('enabled');
			EL('refresh').onclick = function() { window.location.reload(); };
		}
	}, false);
	if (cache.status != cache.UNCACHED) {
		window.setInterval(function() { cache.update(); }, 3600000);
	}
}, false);
