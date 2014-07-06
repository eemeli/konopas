var ko = {
	// these are default values, use konopas_set to override
	'id': '',
	'lc': 'en',
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

var views = [ "star", "prog", "part", "info" ];
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

Item();

// init prog view
var prog = new Prog();

// init part view
var part = new Part(people, ko);

// init info view
init_last_updated();


var pl = document.getElementsByClassName('popup-link');
for (var i = 0; i < pl.length; ++i) pl[i].addEventListener('click', popup_open);



function init_view() {
	var opt = window.location.hash.substr(1);
	switch (opt.substr(0,4)) {
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
