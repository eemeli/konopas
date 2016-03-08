/**
 * KonOpas -- http://konopas.org/ & https://github.com/eemeli/konopas
 * Copyright (c) 2013-2016 by Eemeli Aro <eemeli@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * The software is provided "as is" and the author disclaims all warranties
 * with regard to this software including all implied warranties of
 * merchantability and fitness. In no event shall the author be liable for
 * any special, direct, indirect, or consequential damages or any damages
 * whatsoever resulting from loss of use, data or profits, whether in an
 * action of contract, negligence or other tortious action, arising out of
 * or in connection with the use or performance of this software.
 * @license
 */

"use strict";

require('classlist.js');  // polyfill

import i18n from '../src/i18n-wrap';
import Info from '../src/info';
import Item from '../src/item';
import PartData from '../src/partdata';
import { initPartView, showPartView } from '../src/partview';
import Program from '../src/prog';
import Server from '../src/server';
import StarData from '../src/stardata';
import showStarView from '../src/starview';
import { popup_open, Store } from '../src/util';

export default class KonOpas {
    constructor(set) {
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
	    this.views = [ 'star', 'prog', 'part', 'info' ];
	    if (typeof set == 'object') for (let i in set) this[i] = set[i];

	    if (!i18n.setLocale(this.lc)) alert('Locale ' + JSON.stringify(this.lc) + ' not found.');
	    if (!this.id) alert(i18n.txt('no_ko_id'));
	    if (!Array.prototype.indexOf || !Array.prototype.filter || !Array.prototype.map
		    || !Date.now || !('localStorage' in window)) alert(i18n.txt('old_browser'));

	    this.localStore = new Store('local', this.id);
	    this.sessionStore = new Store('session', this.id);
	    this.item = new Item(this);
	    this.show_list = (ls, opt) => this.item.show_list(ls, opt);
        this.stars = new StarData(this.localStore);
	    this.server = this.use_server && new Server(this);
	    this.info = new Info();
	    window.onhashchange = () => this.set_view();
	    const pl = document.getElementsByClassName('popup-link');
	    for (let i = 0; i < pl.length; ++i) pl[i].addEventListener('click', popup_open);
	    if (document.getElementById('refresh')) window.addEventListener('load', () => this.refresh_cache(), false);
    }

    set_program(list, opt) {
        this.program = new Program(this, list, opt);
    }

    set_people(list) {
        this.participants = new PartData(list, this);
        initPartView(this);
    }

    set_view() {
	    var view = window.location.hash.substr(1, 4), tabs = document.getElementById('tabs');
	    if (!this.program || !this.program.list.length) {
		    view = 'info';
		    tabs.style.display = 'none';
		    this.info.show();
		    if (this.server) this.server.error('Programme loading failed!');
	    } else {
		    tabs.style.display = 'block';
		    if (!this.participants || !this.participants.list.length) {
			    tabs.classList.add('no-people');
			    if (view == 'part') view = '';
		    } else {
			    tabs.classList.remove('no-people');
		    }
		    switch (view) {
			    case 'part': showPartView(this);  break;
			    case 'star': showStarView(this);  break;
			    case 'info': this.info.show();    break;
			    default:     this.program.show(); view = 'prog';
		    }
	    }
	    for (let i = 0; i < this.views.length; ++i) {
		    document.body.classList[view == this.views[i] ? 'add' : 'remove'](this.views[i]);
	    }
        const ld = document.getElementById('load_disable');
	    if (ld) ld.style.display = 'none';
    }

    refresh_cache() {
	    const t_interval = this.cache_refresh_interval_mins * 60000;
	    const cache = window.applicationCache;
	    if (!t_interval || (t_interval < 0)) return;
	    cache.addEventListener('updateready', () => {
		    if (cache.status == cache.UPDATEREADY) {
                const refresh = document.getElementById('refresh');
			    refresh.classList.add('enabled');
			    refresh.onclick = () => window.location.reload();
		    }
	    }, false);
	    if (cache.status != cache.UNCACHED) {
		    window.setInterval(() => cache.update(), t_interval);
	    }
    }
}
