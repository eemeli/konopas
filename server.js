function Server(id, stars, opt) {
	this.id = id;
	this.stars = stars;

	opt = opt || {};
	this.host = opt.host ||  'https://konopas-server.appspot.com';
	this.el_id = opt.el_id || 'server_connect';
	this.err_el_id = opt.err_el_id || 'server_error';

	this.connected = false;
	this.prog_data = {};
	this.prog_server_mtime = 0;
	this.my_votes_data = {};
	this.my_votes_mtime = 0;
	this.pub_votes_data = null;
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
	var el = document.getElementById('v' + id);
	if (!el) return;
	var items = el.getElementsByTagName('a');
	for (var i = 0, l = items.length; i < l; ++i) {
		if (items[i].classList.contains('a' + v)) {
			items[i].classList.add("voted");
		} else {
			items[i].classList.remove("voted");
		}
	}
}

Server.prototype.vote = function(id, v, self) {
	self = self || this;
	if (self.my_votes_data[id] == v) v = 0;
	console.log('server vote ' + id + ' ' + v);

	self.my_votes_data[id] = v;
	self.show_my_vote(id, v);
	self.exec('vote?v=' + v + '&id=' + id + '&t=' + self.my_votes_mtime);
}

Server.prototype.vote_click = function(ev, self) {
	ev = ev || window.event;
	ev.preventDefault();
	ev.cancelBubble = true;
	ev.stopPropagation();

	var v = 0;
	switch (ev.target.classList[0]) {
		case 'a2':  v =  2; break;
		case 'a1':  v =  1; break;
		case 'a-1': v = -1; break;
	}
	if (v) self.vote(ev.target.parentNode.id.substr(1), v, self);

	return false;
}

Server.prototype.show_votes = function(el, id) {
	if (!this.connected) return;
	el.innerHTML += '<div class="vote" id="v' + id + '">'
		+ '<a class="a2" title="doubleplusgood">&laquo;</a>'
		+ '<a class="a1" title="good">&lsaquo;</a>'
		+ '<a class="a-1" title="not so good">&rsaquo;</a>'
		+ '</div>';
	var self = this;
	document.getElementById('v' + id).onclick = function(ev) { self.vote_click(ev, self); };
	if (id in this.my_votes_data) this.show_my_vote(id, this.my_votes_data[id]);
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
	if (v.links) html += '<ul id="server_links">' + "\n<li>" + v.links.join("\n<li>") + "\n</ul>";
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
Server.prototype.cb_my_prog = function(prog) {
	console.log("server my_prog: " + JSON.stringify(prog));
	this.prog_data = prog;
	if (this.stars) this.stars.sync(prog);
	else console.warn("Server.stars required for prog sync");
}

// callback for setting user's own votes
Server.prototype.cb_my_votes = function(v) {
	console.log("server my_votes: " + JSON.stringify(v));
	this.my_votes_data = v.votes;
	this.my_votes_mtime = v.mtime;
	for (var id in v.votes) this.show_my_vote(id, v.votes[id]);
}

// callback for public vote data
Server.prototype.cb_pub_votes = function(v) {
	console.log("server pub_votes: " + JSON.stringify(v));
	this.pub_votes_data = v;
}
