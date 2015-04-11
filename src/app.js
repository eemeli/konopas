function KonOpas(set) {
	this.id = '';
	this.lc = 'en';
	this.tag_categories = false;
	this.default_duration = 60;
	this.time_show_am_pm = false;
	this.abbrev_00_minutes = true; // only for am/pm time
	this.always_show_participants = false;
	this.max_items_per_page = 200;
	this.non_ascii_people = false; // setting true enables correct but slower sort
	this.people_per_screen = 100;
	this.use_server = false;
	this.log_messages = true;
	this.cache_refresh_interval_mins = 60;
	this.views = [ "star", "prog", "part", "info" ];
	if (typeof set == 'object') for (var i in set) this[i] = set[i];

	if (!this.log_messages) _log = function(){};
	if (i18n[this.lc]) {
		i18n.txt = function(key, data){ return key in i18n[this.lc] ? i18n[this.lc][key](data) : key; }.bind(this);
		i18n.translate_html(i18n[this.lc], 'data-txt');
	} else alert('Locale "' + this.lc + '" not found.');
	if (!this.id) alert(i18n.txt('no_ko_id'));
	if (!Array.prototype.indexOf || !Array.prototype.filter || !Array.prototype.map
		|| !Date.now || !('localStorage' in window)) alert(i18n.txt('old_browser'));

	this.store = new KonOpas.Store(this.id);
	this.stars = new KonOpas.Stars(this.id);
	this.server = this.use_server && KonOpas.Server && new KonOpas.Server(this.id, this.stars);
	this.item = new KonOpas.Item();
	this.info = new KonOpas.Info();
	window.onhashchange = this.set_view.bind(this);
	var pl = document.getElementsByClassName('popup-link');
	for (var i = 0; i < pl.length; ++i) pl[i].addEventListener('click', KonOpas.popup_open);
	if (_el('refresh')) window.addEventListener('load', this.refresh_cache.bind(this), false);
}

KonOpas.prototype.set_program = function(list, opt) { this.program = new KonOpas.Prog(list, opt); }
KonOpas.prototype.set_people = function(list) { this.people = new KonOpas.Part(list, this); }

KonOpas.prototype.set_view = function() {
	var view = window.location.hash.substr(1, 4), tabs = _el('tabs');
	if (!this.program || !this.program.list.length) {
		view = 'info';
		tabs.style.display = 'none';
		this.info.show();
		if (this.server) this.server.error('Programme loading failed!');
	} else {
		tabs.style.display = 'block';
		if (!this.people || !this.people.list.length) {
			tabs.classList.add('no-people');
			if (view == 'part') view = '';
		} else {
			tabs.classList.remove('no-people');
		}
		switch (view) {
			case 'part': this.people.show();  break;
			case 'star': this.stars.show();   break;
			case 'info': this.info.show();    break;
			default:     this.program.show(); view = 'prog';
		}
	}
	for (var i = 0; i < this.views.length; ++i) {
		document.body.classList[view == this.views[i] ? 'add' : 'remove'](this.views[i]);
	}
	if (_el('load_disable')) _el('load_disable').style.display = 'none';
}

KonOpas.prototype.refresh_cache = function() {
	var t_interval = this.cache_refresh_interval_mins * 60000,
	    cache = window.applicationCache;
	if (!t_interval || (t_interval < 0)) return;
	cache.addEventListener('updateready', function() {
		if (cache.status == cache.UPDATEREADY) {
			_el('refresh').classList.add('enabled');
			_el('refresh').onclick = function() { window.location.reload(); };
		}
	}, false);
	if (cache.status != cache.UNCACHED) {
		window.setInterval(function() { cache.update(); }, t_interval);
	}
}
