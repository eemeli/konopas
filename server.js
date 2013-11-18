function Server(id, stars, opt) {
	this.id = id;
	this.stars = stars;

	opt = opt || {};
	this.host = opt.host ||  'https://konopas-server.appspot.com';
	this.el_id = opt.el_id || 'server_connect';
	this.err_el_id = opt.err_el_id || 'server_error';

	this.connected = false;
	this.ical = localStorage.getItem('konopas.'+this.id+'.ical_link') || false;
	this.prog_data = {};
	this.prog_server_mtime = 0;
	this.my_votes_data = {};
	this.my_votes_mtime = 0;
	this.pub_votes_data = {};
	this.el = document.getElementById(this.el_id);
	this.err_el = false;

	this.disconnect();
	if (this.stars) this.stars.server = this;
	if (this.el && this.id) this.exec('info');
	else console.warn("server init failed");

	var m = /#server_error=(.+)/.exec(window.location.hash);
	if (m) this.error(decodeURIComponent(m[1].replace(/\+/g, ' ')), window.location.href, this);
}

Server.prototype.disconnect = function() {
	this.connected = false;
	if (this.el) this.el.innerHTML = '<div id="server_info">Not connected</div>';
}

Server.prototype.logout = function(ev) {
	ev = ev || window.event;
	console.log("server logout");
	server.exec('/logout');
	ev.preventDefault();
	return false;
}

Server.prototype.error = function(msg, url, server_ptr) {
	console.error('server error ' + msg + ', url: ' + url);
	server_ptr = server_ptr || this;
	if (msg =='') {
		var cmd = url.replace(server_ptr.host, '').replace('/' + server_ptr.id + '/', '');
		msg = 'The command "<code>' + cmd + '</code>" failed.';
	}
	if (!server_ptr.err_el) {
		var el = document.createElement('div');
		el.id = server_ptr.err_el_id;
		el.title = 'Click to close';
		el.onclick = function(ev) { server_ptr.err_el.style.display = 'none'; };
		document.body.appendChild(el);
		server_ptr.err_el = el;
	}
	server_ptr.err_el.innerHTML = '<div>Server error: <b>' + msg + '</b></div>';
	server_ptr.err_el.style.display = 'block';
	return true;
}

Server.prototype.prog_mtime = function() {
	var mtime = this.prog_server_mtime;
	for (var id in this.prog_data) {
		if (this.prog_data[id][1] > mtime) mtime = this.prog_data[id][1];
	}
	return mtime;
}

Server.prototype.add_prog = function(id, add_star) {
	if (id instanceof Array) id = id.join(',');
	console.log('server add_prog "' + id + '" ' + (add_star ? '1' : '0'));
	this.exec('prog'
		+ (add_star ? '?add=' : '?rm=') + id
		+ '&t=' + this.prog_mtime());
}

Server.prototype.set_prog = function(star_list) {
	console.log('server set_prog "' + star_list);
	this.exec('prog'
		+ '?set=' + star_list.join(',')
		+ '&t=' + this.prog_mtime());
}

Server.prototype.show_my_vote = function(id, v) {
	var mv_el = document.getElementById('v' + id);
	if (mv_el) {
		var items = mv_el.getElementsByTagName('a');
		for (var i = 0, l = items.length; i < l; ++i) {
			var cl = items[i].classList;
			if (cl.contains('a' + v)) cl.add("voted");
			else cl.remove("voted");
		}
	}
	var p_el = document.getElementById('p' + id);
	if (p_el) {
		var spans = p_el.getElementsByTagName('span');
		for (var i = 0, l = spans.length; i < l; ++i) {
			var cl = spans[i].classList;
			if (cl.contains('pv_pos')) {
				if (v > 0) cl.add('voted');
				else cl.remove('voted');
			} else if (cl.contains('pv_neg')) {
				if (v < 0) cl.add('voted');
				else cl.remove('voted');
			}
		}
	}
}

Server.prototype.vote = function(id, v, self) {
	self = self || this;
	if (self.pub_votes_data) {
		var v0 = self.my_votes_data[id];
		if (v0) --self.pub_votes_data[id][(v0 < 0) ? 0 : v0];
	}
	if (self.my_votes_data[id] == v) v = 0;
	console.log('server vote ' + id + ' ' + v);

	self.my_votes_data[id] = v;
	if (v && self.pub_votes_data) {
		if (!(id in self.pub_votes_data)) self.pub_votes_data[id] = [0, 0, 0];
		++self.pub_votes_data[id][(v < 0) ? 0 : v];
	}
	self.show_pub_votes(id);
	self.show_my_vote(id, v);
	self.exec('vote?v=' + v + '&id=' + id + '&t=' + self.my_votes_mtime);
}

Server.prototype.vote_click = function(ev, self) {
	ev = ev || window.event;

	var bubble = false;
	var v = 0;
	switch (ev.target.classList[0]) {
		case 'a2':  v =  2; break;
		case 'a1':  v =  1; break;
		case 'a-1': v = -1; break;
	}
	if (v) {
		var p = ev.target.parentNode;
		if (p.parentNode.parentNode.classList.contains('expanded')) {
			self.vote(p.id.substr(1), v, self);
		} else {
			bubble = true;
		}
	}

	if (bubble) return true;
	else {
		ev.preventDefault();
		ev.cancelBubble = true;
		ev.stopPropagation();
		return false;
	}
}

Server.prototype.show_votes = function(id, el) {
	if (!this.connected) return;
	var v_id = 'v' + id;
	if (!document.getElementById(v_id)) {
		el = el || document.getElementById('p' + id);
		if (el) el.innerHTML += '<div class="vote" id="' + v_id + '">'
			+ '<a class="a2" title="doubleplusgood">&laquo;</a>'
			+ '<a class="a1" title="good">&lsaquo;</a>'
			+ '<a class="a-1" title="not so good">&rsaquo;</a>'
			+ '</div>';
	}
	var v_el = document.getElementById(v_id);
	if (v_el) {
		var self = this;
		v_el.onclick = function(ev) { self.vote_click(ev, self); };
	}
	this.show_my_vote(id, this.my_votes_data[id]);
}

Server.prototype.show_pub_votes = function(id) {
	var v = this.pub_votes_data[id];
	var p_el = v && document.getElementById('p' + id);
	var pa = p_el && p_el.getElementsByClassName('pub_votes');
	if (pa && pa.length) pa[0].innerHTML = (v[0] || v[1] || v[2])
		? '<span class="pv_pos">+' + (v[1] + 2 * v[2]) + '</span> / <span class="pv_neg">-' + v[0] + '</span>'
		: '';
}

Server.prototype.show_ical_link = function(p_el) {
	var html = '';
	if (!this.connected) {
		html = 'For other export options, please login.'
	} else if (this.ical) {
		if (typeof this.ical == 'string') {
			html = 'Your selection is available as an iCal (.ics) calendar at:<br><a href="' + this.ical + '">' + this.ical + '</a><br>'
				+ '<span class="hint">Note that changes you make in this guide may take some time to show in your external calendar software.</span>';
		} else {
			html = 'To make your selection viewable in your calendar app, you may also <a id="ical_link" class="js-link">make it available</a> in iCal (.ics) calendar format';
		}
	}
	if (p_el) p_el.innerHTML += '<p id="ical_text">' + html;
	else {
		var i_el = document.getElementById('ical_text');
		if (i_el) i_el.innerHTML = html;
	}
	var a = document.getElementById('ical_link');
	if (a) {
		var self = this;
		a.onclick = function() { self.exec('ical_link'); };
	}
}

Server.prototype.url = function(cmd) {
	return this.host + (cmd[0] == '/' ? '' : '/' + this.id + '/') + cmd;
}

// based on https://github.com/IntoMethod/Lightweight-JSONP/blob/master/jsonp.js
Server.prototype.exec = function(cmd) {
	if (/^(prog|vote)/.test(cmd) && !this.connected) {
		console.warn('server not connected: ' + cmd);
		return;
	}

	var script = document.createElement('script'),
		done = false,
		url = this.url(cmd),
		server_ptr = this;
	script.src = url;
	script.async = true;
	script.onerror = function(ev) { server_ptr.error('', ev.target.src || window.event.target.src, server_ptr); };

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

// callback for successful logout, prog, vote
Server.prototype.cb_ok = function(v) {
	var m = /^(?:https?:\/\/[^\/]+)?\/?([^?\/]*)(?:\/([^?]*))(?:\?([^?]*))?/.exec(v);
	switch (m[2]) {
		case 'logout':
			this.disconnect();
			this.prog_data = {};
			this.prog_server_mtime = 0;
			if (this.stars) {
				this.stars.data = {};
				this.stars.write();
				init_view();
			}
			this.exec('info');
			console.log("server ok (logout): " + JSON.stringify(v));
			break;

		case 'prog':
			var t = /&server_mtime=(\d+)/.exec(m[3]);
			if (t) this.prog_server_mtime = parseInt(t[1], 10);
			console.log("server ok (prog): " + JSON.stringify(v));
			break;

		case 'vote':
			var t = /&server_mtime=(\d+)/.exec(m[3]);
			if (t) this.my_votes_mtime = parseInt(t[1], 10);
			console.log("server ok (vote): " + JSON.stringify(v));
			break;

		default:
			console.warn("server ok (???): " + JSON.stringify(v));
	}
}

// callback for reporting server errors
Server.prototype.cb_fail = function(v) {
	this.error(v.msg, v.url, this);
}

// callback for setting logged-in info
Server.prototype.cb_info = function(v) {
	console.log("server info: " + JSON.stringify(v));
	this.connected = true;
	var n = (v.name == v.email) ? v.email : v.name + ' &lt;' + v.email + '&gt;';
	var html = '<div id="server_info"><span id="server_user">' + n + '</span>';
	if (v.ical) {
		this.ical = this.ical || true;
		this.show_ical_link(false);
	}
	html += '<a id="server_logout" href="' + this.url(v.logout) + '">Logout</a>';
	this.el.innerHTML = html;
	document.getElementById('server_logout').onclick = this.logout;
}

// callback for showing login options
Server.prototype.cb_login = function(v) {
	console.log("server login: " + JSON.stringify(v));
	var links = [];
	for (var cmd in v) {
		links.push('<a href="' + this.url(cmd) + '">' + v[cmd] + '</a>');
	}
	this.el.innerHTML = '<div id="login-links">'
		+ "\n&raquo; <span>Login to sync your data</span>\n"
		+ '<div id="login-disable-bg"></div>'
		+ '<div class="popup">Once you\'ve verified your e-mail address, you\'ll be able to sync your data between different browsers and devices.'
		+ "\n<ul>\n<li>" + links.join("\n<li>")
		+ "\n</ul></div></div>";
	make_popup_menu("login-links", "login-disable-bg");
}

// callback for setting starred items
Server.prototype.cb_my_prog = function(v) {
	console.log("server my_prog: " + JSON.stringify(v));
	this.prog_data = v.prog;
	if (v.t0) for (var id in this.prog_data) { this.prog_data[id][1] += v.t0; }
	if (this.stars) this.stars.sync(this.prog_data);
	else console.warn("Server.stars required for prog sync");
}

// callback for setting user's own votes
Server.prototype.cb_my_votes = function(v) {
	console.log("server my_votes: " + JSON.stringify(v));
	this.my_votes_data = v.votes;
	this.my_votes_mtime = v.mtime;
	for (var id in v.votes) this.show_votes(id);
}

// callback for public vote data
Server.prototype.cb_pub_votes = function(v) {
	console.log("server pub_votes: " + JSON.stringify(v));
	this.pub_votes_data = v;
	for (var id in v) this.show_pub_votes(id);
}

Server.prototype.cb_ical_link = function(url) {
	this.ical = url;
	localStorage.setItem('konopas.'+this.id+'.ical_link', url);
	this.show_ical_link(false);
}
