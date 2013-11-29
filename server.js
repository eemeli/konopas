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
	this.vote_timers = {};
	this.pub_data = {};
	this.pub_comments = {};
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
	console.log("server logout");
	server.exec('/logout');
	(ev || window.event).preventDefault();
}

Server.prototype.error = function(msg, url, self) {
	console.error('server error ' + msg + ', url: ' + url);
	self = self || this;
	if (msg =='') {
		var cmd = url.replace(self.host, '').replace('/' + self.id + '/', '');
		msg = 'The command "<code>' + cmd + '</code>" failed.';
	}
	if (!self.err_el) {
		var el = _new_elem('div', self.err_el_id);
		el.title = 'Click to close';
		el.onclick = function(ev) { self.err_el.style.display = 'none'; };
		document.body.appendChild(el);
		self.err_el = el;
	}
	self.err_el.innerHTML = '<div>Server error: <b>' + msg + '</b></div>';
	self.err_el.style.display = 'block';
	return true;
}

Server.prototype.onmessage = function(ev, self) {
	ev = ev || window.event;
	if (ev.origin != self.host) {
		console.error('Got an unexpected message from ' + ev.origin);
		console.log(ev);
		return;
	}
	JSON.parse(ev.data, function(k, v) {
		switch (k) {
			case 'ok':    self.cb_ok(v, self);      break;
			case 'fail':  self.error('', v, self);  break;
		}
	});
}



// ------------------------------------------------------------------------------------------------ prog

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



// ------------------------------------------------------------------------------------------------ vote

Server.prototype.show_my_vote = function(id, v) {
	var v_el = document.getElementById('v' + id);
	if (!v_el) return;

	var a = v_el.getElementsByTagName('a');
	for (var i = 0, l = a.length; i < l; ++i) {
		var cl = a[i].classList;
		if (cl.contains('v_pos')) {
			switch (v) {
				case  2:  cl.add('voted');     cl.add('v2');     a[i].title = "doubleplusgood";  break;
				case  1:  cl.add('voted');     cl.remove('v2');  a[i].title = "good";            break;
				default:  cl.remove('voted');  cl.remove('v2');  a[i].title = "good";
			}
		} else if (cl.contains('v_neg')) {
			if (v < 0)  cl.add('voted');
			else        cl.remove('voted');
		}
	}
}

Server.prototype.vote = function(id, v, self) {
	self = self || this;
	if (self.pub_data) {
		var v0 = self.my_votes_data[id];
		if (v0) --self.pub_data[id][(v0 < 0) ? 0 : v0];
	}
	switch (self.my_votes_data[id]) {
		case -1: if (v < 0) v = 0; break;
		case  1: if (v > 0) v = 2; break;
		case  2: if (v > 0) v = 0; break;
	}
	console.log('server vote ' + id + ' ' + v);

	self.my_votes_data[id] = v;
	if (v && self.pub_data) {
		if (!(id in self.pub_data)) self.pub_data[id] = [0, 0, 0, 0];
		++self.pub_data[id][(v < 0) ? 0 : v];
	}
	self.show_pub_votes(id);
	self.show_my_vote(id, v);
	if (self.vote_timers[id]) window.clearTimeout(self.vote_timers[id]);
	self.vote_timers[id] = window.setTimeout(function() {
		self.exec('vote?v=' + v + '&id=' + id + '&t=' + self.my_votes_mtime);
	}, 1000);
}

Server.prototype.vote_click = function(ev, self) {
	ev = ev || window.event;

	var bubble = false;
	var v = 0;
	switch (ev.target.classList[0]) {
		case 'v_pos': v =  1; break;
		case 'v_neg': v = -1; break;
	}
	if (v) {
		var p = ev.target.parentNode;
		if (p.parentNode.parentNode.classList.contains('expanded')) {
			self.vote(p.id.substr(1), v, self);
		} else {
			bubble = true;
		}
	}

	if (!bubble) {
		ev.cancelBubble = true;
		ev.preventDefault();
		ev.stopPropagation();
	}
}

Server.prototype.show_pub_votes = function(id) {
	var v_el = document.getElementById('v' + id);
	if (!v_el) return;

	var v = this.pub_data[id];
	if (v && (v[0] || v[1] || v[2])) {
		v_el.classList.add("has_votes");
	} else {
		v_el.classList.remove("has_votes");
		if (!v) v = [0, 0, 0];
	}
	v_el.innerHTML = '<a class="v_pos" title="good">' + '+' + (v[1] + 2 * v[2]) + '</a>'
				   + ' / '
				   + '<a class="v_neg" title="not so good">' + '-' + v[0] + '</a>';
}



// ------------------------------------------------------------------------------------------------ comment

Server.prototype.onclick_show_comments = function(ev, id, c_el, af, f_el, self) {
	ev = ev || window.event;
	ev.cancelBubble = true;
	ev.preventDefault();
	ev.stopPropagation();

	var ac = ev.target;
	switch (ac.textContent.substr(0, 4)) {
		case 'Show':
			c_el.style.display = 'block';
			if (f_el.style.display == 'none') af.style.display = 'block';
			self.show_comments(id, self);
			break;

		case 'Hide':
			var p = self.pub_data[id];
			var n_comments = (p && (p[3] > 0)) ? p[3] : 0;
			ac.textContent = 'Show ' + n_comments + ' comment' + ((n_comments == 1) ? '' : 's');
			ac.style.display = n_comments ? 'block' : 'none';
			c_el.style.display = 'none';
			af.style.display = n_comments ? 'none' : 'block';
			f_el.style.display = 'none';
			break;
	}
}


Server.prototype.onclick_show_comment_form = function(ev, id, f_el, self) {
	ev = ev || window.event;
	ev.cancelBubble = true;
	ev.preventDefault();
	ev.stopPropagation();

	var af = ev.target;
	af.style.display = 'none';
	self.show_comment_form(id, af, f_el, self);
}


Server.prototype.make_comment_div = function(c) {
	var d = _new_elem('div', '', 'comment');

	var n = _new_elem('span', '', 'comment-author', c.name);
	d.appendChild(n);

	var t = _new_elem('span', '', 'comment-time', c.ctime);
	//t.textContent = c.ctime;
	d.appendChild(t);

	var m = _new_elem('div');
	m.innerHTML = c.text;
	d.appendChild(m);

	return d;
}

Server.prototype.show_comments = function(id, self) {
	self = self || this;
	var c_el = document.getElementById('c' + id);
	if (!c_el) return;

	var ac = c_el.previousSibling;
	if (ac && (ac.tagName.toLowerCase() != 'a')) ac = false;

	while (c_el.firstChild) c_el.removeChild(c_el.firstChild);

	var c = self.pub_comments[id];

	if (typeof c == 'undefined') {
		if (ac) {
			ac.classList.remove('js-link');
			ac.textContent = 'Loading...';
		}
		self.exec('comments?id=' + id);
		return;
	}

	var n_comments = 0;
	if (c) for (var i in c) {
		++n_comments;
		c_el.appendChild(self.make_comment_div(c[i]));
	}

	if (self.pub_data) {
		if (self.pub_data[id]) self.pub_data[id][3] = n_comments;
		else self.pub_data[id] = [0, 0, 0, n_comments];
	}

	if (ac) {
		ac.textContent = 'Hide comments';
		ac.classList.add('js-link');
		ac.style.display = n_comments ? 'block' : 'none';
	}

	if (!n_comments) {
		var f_el = document.getElementById('f' + id);
		if (f_el && (f_el.style.display == 'none')) {
			var af = f_el.previousSibling;
			if (af && (af.tagName.toLowerCase() == 'a')) af.style.display = 'block';
		}
	}
}


Server.prototype.show_comment_form = function(id, af, f_el, self) {
	if (f_el.classList.contains('empty')) {
		if (!document.getElementById('post_comment_iframe')) {
			var fi = document.createElement('iframe');
			fi.id = fi.name = 'post_comment_iframe';
			fi.src = 'javascript:false';
			fi.style.display = 'none';
			document.body.appendChild(fi);
			window.onmessage = function(ev) { self.onmessage(ev, self); };
		}
		f_el.method = 'post';
		f_el.action = self.url('add_comment?id=' + encodeURIComponent(id));
		f_el.target = 'post_comment_iframe';
		f_el.innerHTML =
			  '<textarea name="text" rows="4" placeholder="' + self.connected[0] + ' posted..."></textarea>'
			+ '<input type="submit" name="submit">'
			+ '<input type="reset" value="Cancel">'
			+ '<label><input type="checkbox" name="anon"> Post anonymously</label>'
			+ '<label><input type="checkbox" name="hide"> Hide from public</label>';
		f_el.onclick = function(ev) {
			ev = ev || window.event;
			ev.cancelBubble = true;
			ev.stopPropagation();
		};
		f_el.onsubmit = function(ev) {
			f_el.submit.value = 'Posting...';
			f_el.submit.disabled = true;
			if (f_el.anon.checked) { f_el.action += '&anon=1'; f_el.anon.disabled = true; }
			if (f_el.hide.checked) { f_el.action += '&hide=1'; f_el.hide.disabled = true; }
		};
		f_el.onreset = function(ev) {
			af.style.display = 'block';
			f_el.style.display = 'none';
		};
		f_el.classList.remove('empty');
	} else {
		f_el.submit.disabled = false;
		f_el.anon.disabled = false;
		f_el.hide.disabled = false;
	}
	f_el.submit.value = 'Post comment';
	f_el.style.display = 'block';
}


Server.prototype.make_comments_wrap = function(id) {
	var ac = _new_elem('a', '', 'js-link discreet');
	var c_el = _new_elem('div', 'c' + id, 'comments');
	var af = _new_elem('a', '', 'js-link discreet', 'Add a comment');
	var f_el = _new_elem('form', 'f' + id, 'empty');

	var self = this;
	ac.onclick = function(ev) { self.onclick_show_comments(ev, id, c_el, af, f_el, self); };
	af.onclick = function(ev) { self.onclick_show_comment_form(ev, id, f_el, self); };

	f_el.style.display = 'none';
	ac.textContent = 'Hide';
	ac.click();

	var d = _new_elem('div', '', 'comments-wrap');
	d.appendChild(ac);
	d.appendChild(c_el);
	d.appendChild(af);
	d.appendChild(f_el);

	return d;
}


// ------------------------------------------------------------------------------------------------ item extras

Server.prototype.show_extras = function(id, p_el) {
	if (!this.connected) return;

	var self = this;

	if (!document.getElementById('c' + id)) {
		p_el.appendChild(self.make_comments_wrap(id));
	}

	var v_id = 'v' + id;
	var v = document.getElementById(v_id);
	if (v) v.onclick = function(ev) { self.vote_click(ev, self); };
	this.show_my_vote(id, this.my_votes_data[id]);
}



// ------------------------------------------------------------------------------------------------ ical

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



// ------------------------------------------------------------------------------------------------ exec

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
		self = this;
	script.src = url;
	script.async = true;
	script.onerror = function(ev) { self.error('', (ev || window.event).target.src, self); };

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

// callback for successful logout, prog, vote
Server.prototype.cb_ok = function(v, self) {
	self = self || this;
	var m = /^(?:https?:\/\/[^\/]+)?\/?([^?\/]*)(?:\/([^?]*))(?:\?(.*))?/.exec(v);
	var cmd = m[2] || '';
	var query = m[3] || '';
	switch (cmd) {
		case 'logout':
			self.disconnect();
			self.prog_data = {};
			self.prog_server_mtime = 0;
			self.my_votes_data = {};
			self.my_votes_mtime = 0;
			if (self.stars) {
				self.stars.data = {};
				self.stars.write();
				init_view();
			}
			self.exec('info');
			console.log("server ok (logout): " + JSON.stringify(v));
			break;

		case 'prog':
			var t = /&server_mtime=(\d+)/.exec(query);
			if (t) self.prog_server_mtime = parseInt(t[1], 10);
			console.log("server ok (prog): " + JSON.stringify(v));
			break;

		case 'vote':
			var t = /&server_mtime=(\d+)/.exec(query);
			if (t) self.my_votes_mtime = parseInt(t[1], 10);
			console.log("server ok (vote): " + JSON.stringify(v));
			break;

		case 'add_comment':
			var id = /\bid=([^&]+)/.exec(query);
			if (id) {
				self.exec('comments?id=' + id[1]);
				var f_el = document.getElementById('f' + id[1]);
				if (f_el) f_el.reset();
			}
			console.log("server ok (add_comment): " + JSON.stringify(v));
			break;

		default:
			console.warn("server ok (???): " + JSON.stringify(v));
	}
}

// callback for reporting server errors
Server.prototype.cb_fail = function(v) {
	this.error(v.msg, v.url, this);
}



// ------------------------------------------------------------------------------------------------ callback

// callback for setting logged-in info
Server.prototype.cb_info = function(v) {
	console.log("server info: " + JSON.stringify(v));
	this.connected = [v.name, v.email];
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
	this.el.innerHTML = '<div id="login-links" class="popup-wrap">'
		+ "\n&raquo; <span>Login to sync your data</span>\n"
		+ '<div id="login-disable-bg" class="popup-bg"></div>'
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
	for (var id in v.votes) this.show_my_vote(id, v.votes[id]);
}

// callback for public vote data
Server.prototype.cb_pub_data = function(p) {
	console.log("server pub_data: " + JSON.stringify(p));
	this.pub_data = p;
	for (var id in p) this.show_pub_votes(id);
}

// callback for public vote data
Server.prototype.cb_show_comments = function(id, c) {
	console.log("server show_comments (" + id + "): " + JSON.stringify(c));
	this.pub_comments[id] = c;
	this.show_comments(id, this);
}

Server.prototype.cb_ical_link = function(url) {
	this.ical = url;
	localStorage.setItem('konopas.'+this.id+'.ical_link', url);
	this.show_ical_link(false);
}



// ------------------------------------------------------------------------------------------------ util

function _new_elem(tag, id, cl, text, hide) {
	var e = document.createElement(tag);
	if (id) e.id = id;
	if (cl) e.className = cl;
	if (text) e.textContent = text;
	if (hide) e.style.display = 'none';
	return e;
}

