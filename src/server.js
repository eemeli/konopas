KonOpas.Server = function(id, stars, opt) {
	this.id = id;
	this.stars = stars;

	opt = opt || {};
	this.host = opt.host ||  'https://konopas-server.appspot.com';
	this.el_id = opt.el_id || 'server_connect';
	this.err_el_id = opt.err_el_id || 'server_error';
	try { this.store = localStorage; } catch (e) { this.store = new KonOpas.VarStore(); }

	this.connected = false;
	this.token = this.store.getItem('konopas.token') || false;
	this.ical = this.store.getItem('konopas.'+this.id+'.ical_link') || false;
	this.prog_data = {};
	this.prog_server_mtime = 0;
	this.el = document.getElementById(this.el_id);
	this.err_el = false;

	this.disconnect();
	if (this.stars) this.stars.server = this;
	if (this.el && this.id) this.exec('info');
	else _log("server init failed", 'warn');

	var m = /#server_error=(.+)/.exec(window.location.hash);
	if (m) this.error(decodeURIComponent(m[1].replace(/\+/g, ' ')), window.location.href);
}

KonOpas.Server.prototype.disconnect = function() {
	this.connected = false;
	if (this.el) this.el.innerHTML = '<div id="server_info">' + i18n.txt('Not connected') + '</div>';
	document.body.classList.remove('logged-in');
}

KonOpas.Server.prototype.logout = function(ev) {
	_log('server logout');
	this.exec('/logout');
	(ev || window.event).preventDefault();
}

KonOpas.Server.prototype.error = function(msg, url) {
	_log('server error ' + msg + ', url: ' + url, 'error');
	if (msg =='') {
		var cmd = url.replace(this.host, '').replace('/' + this.id + '/', '');
		msg = i18n.txt('server_cmd_fail', {'CMD':'<code>'+cmd+'</code>'});
	}
	if (!this.err_el) {
		var el = document.createElement('div');
		el.id = this.err_el_id;
		el.title = i18n.txt('Click to close');
		el.onclick = function(ev) { this.err_el.style.display = 'none'; }.bind(this);
		document.body.appendChild(el);
		this.err_el = el;
	}
	this.err_el.innerHTML = '<div>' + i18n.txt('Server error') + ': <b>' + msg + '</b></div>';
	this.err_el.style.display = 'block';
	return true;
}

KonOpas.Server.prototype.onmessage = function(ev) {
	ev = ev || window.event;
	if (ev.origin != this.host) {
		_log('Got an unexpected message from ' + ev.origin, 'error');
		_log(ev);
		return;
	}
	var self = this;
	JSON.parse(ev.data, function(k, v) {
		switch (k) {
			case 'ok':    self.cb_ok(v);      break;
			case 'fail':  self.error('', v);  break;
		}
	});
}



// ------------------------------------------------------------------------------------------------ prog

KonOpas.Server.prototype.prog_mtime = function() {
	var mtime = this.prog_server_mtime;
	for (var id in this.prog_data) {
		if (this.prog_data[id][1] > mtime) mtime = this.prog_data[id][1];
	}
	return mtime;
}

KonOpas.Server.prototype.add_prog = function(id, add_star) {
	if (id instanceof Array) id = id.join(',');
	_log('server add_prog "' + id + '" ' + (add_star ? '1' : '0'));
	var t = this.prog_mtime();
	this.exec('prog'
		+ (add_star ? '?add=' : '?rm=') + id
		+ (t ? '&t=' + t : ''));
}

KonOpas.Server.prototype.set_prog = function(star_list) {
	_log('server set_prog "' + star_list);
	var t = this.prog_mtime();
	this.exec('prog'
		+ '?set=' + star_list.join(',')
		+ (t ? '&t=' + t : ''));
}



// ------------------------------------------------------------------------------------------------ ical

KonOpas.Server.prototype.show_ical_link = function(p_el) {
	var html = '';
	if (!this.connected) {
		html = i18n.txt('ical_login');
	} else if (this.ical) {
		if (typeof this.ical == 'string') {
			html = i18n.txt('ical_link') + '<br><a href="' + this.ical + '">' + this.ical + '</a>'
				+ '<br><span class="hint">' + i18n.txt('ical_hint') + '</span>';
		} else {
			html = i18n.txt('ical_make', {'A_TAG':'<a id="ical_link" class="js-link">'});
		}
	}
	if (p_el) p_el.innerHTML += '<p id="ical_text">' + html;
	else {
		var i_el = document.getElementById('ical_text');
		if (i_el) i_el.innerHTML = html;
	}
	var a = document.getElementById('ical_link');
	if (a) {
		a.onclick = function() { this.exec('ical_link'); }.bind(this);
	}
}



// ------------------------------------------------------------------------------------------------ exec

KonOpas.Server.prototype.url = function(cmd) {
	if (this.token) cmd += (cmd.indexOf('?') != -1 ? '&' : '?') + 'k=' + encodeURIComponent(this.token);
	return this.host + (cmd[0] == '/' ? '' : '/' + this.id + '/') + cmd;
}

// based on https://github.com/IntoMethod/Lightweight-JSONP/blob/master/jsonp.js
KonOpas.Server.prototype.exec = function(cmd) {
	var script = document.createElement('script'),
		done = false,
		url = this.url(cmd);
	script.src = url;
	script.async = true;
	script.onerror = function(ev) { this.error('', (ev || window.event).target.src); }.bind(this);

	script.onload = script.onreadystatechange = function() {
		if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
			done = true;
			script.onload = script.onreadystatechange = null;
			if (script && script.parentNode) {
				script.parentNode.removeChild(script);
			}
		}
	};
	document.getElementsByTagName('head')[0].appendChild(script);
}



// ------------------------------------------------------------------------------------------------ cb ok/fail

// callback for successful logout, prog
KonOpas.Server.prototype.cb_ok = function(v) {
	var m = /^(?:https?:\/\/[^\/]+)?\/?([^?\/]*)(?:\/([^?]*))(?:\?(.*))?/.exec(v);
	var cmd = m[2] || '';
	var query = m[3] || '';
	switch (cmd) {
		case 'logout':
			this.disconnect();
			this.token = false;
			this.store.setItem('konopas.token', '');
			this.prog_data = {};
			this.prog_server_mtime = 0;
			if (this.stars) {
				this.stars.data = {};
				this.stars.write();
				konopas.set_view();
			}
			this.exec('info');
			_log("server ok (logout): " + JSON.stringify(v));
			break;

		case 'prog':
			var t = /&server_mtime=(\d+)/.exec(query);
			if (t) this.prog_server_mtime = parseInt(t[1], 10);
			_log("server ok (prog): " + JSON.stringify(v));
			break;

		default:
			_log("server ok (???): " + JSON.stringify(v), 'warn');
	}
}

// callback for reporting server errors
KonOpas.Server.prototype.cb_fail = function(v) {
	this.error(v.msg, v.url);
}



// ------------------------------------------------------------------------------------------------ callback

KonOpas.Server.prototype.cb_info = function(v) {
	_log("server info: " + JSON.stringify(v));
	this.connected = [v.name, v.email];
	this.el.innerHTML = '<div id="server_info">'
	                  + '<a id="server_logout" href="' + this.url(v.logout) + '">' + i18n.txt('Logout') + '</a> '
	                  + '<span id="server_user" title="' + ((v.name != v.email) ? v.email : '') + '">' + v.name.replace(/@.*/, '')
	                  + '</span></div>';
	if (v.ical) {
		this.ical = this.ical || true;
		this.show_ical_link(false);
	}
	document.getElementById('server_logout').onclick = this.logout.bind(this);
	document.body.classList.add('logged-in');
	if (typeof jsErrLog == 'object') jsErrLog.info = v.name.replace(/[ @].*/, '');
}

KonOpas.Server.prototype.cb_token = function(token) {
	_log("server token: " + token);
	this.token = token;
	this.store.setItem('konopas.token', token);
}

KonOpas.Server.prototype.cb_login = function(v) {
	_log("server login: " + JSON.stringify(v));
	var links = [];
	for (var cmd in v) {
		links.push('<a href="' + this.url(cmd) + '">' + v[cmd] + '</a>');
	}
	this.el.innerHTML = '<div id="login-links">'
		+ '\n&raquo; <span class="popup-link" id="login-popup-link">' + i18n.txt('Login to sync your data') + '</span>\n'
		+ '<div class="popup" id="login-popup">' + i18n.txt('login_why')
		+ "\n<ul>\n<li>" + links.join("\n<li>")
		+ "\n</ul></div></div>";
	_el('login-popup-link').onclick = KonOpas.popup_open;
}

KonOpas.Server.prototype.cb_my_prog = function(v) {
	_log("server my_prog: " + JSON.stringify(v));
	this.prog_data = v.prog;
	if (v.t0) for (var id in this.prog_data) { this.prog_data[id][1] += v.t0; }
	if (this.stars) this.stars.sync(this.prog_data);
	else _log("Server.stars required for prog sync", 'warn');
}

KonOpas.Server.prototype.cb_my_votes = function(v) { /* obsolete */ }
KonOpas.Server.prototype.cb_pub_data = function(p) { /* obsolete */ }
KonOpas.Server.prototype.cb_show_comments = function(id, c) { /* obsolete */ }

KonOpas.Server.prototype.cb_ical_link = function(url) {
	this.ical = url;
	this.store.setItem('konopas.'+this.id+'.ical_link', url);
	this.show_ical_link(false);
}
