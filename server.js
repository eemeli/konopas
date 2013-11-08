function Server(id, stars, opt) {
	this.id = id;
	this.stars = stars;

	opt = opt || {};
	this.host = opt.host ||  'https://konopas-server.appspot.com';
	this.el_id = opt.el_id || 'server_connect';

	this.connected = false;
	this.prog_data = {};
	this.prog_server_mtime = 0;
	this.my_votes_data = null;
	this.pub_votes_data = null;
	this.el = document.getElementById(this.el_id);

	if (this.stars) this.stars.server = this;
	if (this.el && this.id) {
		this.exec('info');
		console.log("server init ok");
	} else console.warn("server init failed");
}

Server.prototype.logout = function(ev) {
	console.log("server logout");
	server.exec('/logout');
	ev.preventDefault();
	return false;
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
		url = this.url(cmd);
	script.src = url;
	script.async = true;
	script.onerror = function(ex){ this.exec_error({url: url, event: ex}); };

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
Server.prototype.exec_error = function(v) {
	console.log("server exec_error, url: " + v.url);
}

// callback for successful logout, prog, vote
Server.prototype.ok = function(v) {
	var m = /^\/?([^?\/]*)(?:\/([^?]*))(?:\?([^?]*))?/.exec(v);
	switch (m[2]) {
		case 'logout':
			this.connected = false;
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
			console.log("server ok (vote): " + JSON.stringify(v));
			break;

		default:
			console.log("\tcon '" + m[1] + "', cmd '" + m[2] + "', param '" + m[3] + "'");
	}
}

// callback for reporting server errors
Server.prototype.fail = function(v) {
	console.log("server fail: " + JSON.stringify(v));
}

// callback for setting logged-in info
Server.prototype.info = function(v) {
	this.connected = true;
	console.log("server info: " + JSON.stringify(v));
	var n = (v.name == v.email) ? v.email : v.name + ' &lt;' + v.email + '&gt;';
	var html = '<div id="server_info"><span id="server_user">' + n + '</span>';
	if (v.links) html += '<ul id="server_links">' + "\n<li>" + v.links.join("\n<li>") + "\n</ul>";
	html += '<a id="server_logout" href="' + this.url(v.logout) + '">Logout</a>';
	this.el.innerHTML = html;
	document.getElementById('server_logout').onclick = this.logout;
}

// callback for showing login options
Server.prototype.login = function(v) {
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
Server.prototype.my_prog = function(prog) {
	console.log("server my_prog: " + JSON.stringify(prog));
	this.prog_data = prog;
	if (this.stars) this.stars.sync(prog);
	else console.warn("Server.stars required for prog sync");
}

// callback for setting user's own votes
Server.prototype.my_votes = function(v) {
	console.log("server my_votes: " + JSON.stringify(v));
	var mtime = new Date(v.t);
	console.log("mtime "+mtime);
	this.my_votes_data = v;
}

// callback for public vote data
Server.prototype.pub_votes = function(v) {
	console.log("server pub_votes: " + JSON.stringify(v));
	this.pub_votes_data = v;
}
