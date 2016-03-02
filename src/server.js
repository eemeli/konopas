import i18n from '../src/i18n-wrap';
import { log, new_elem, popup_open, pretty_date, pretty_time, VarStore } from '../src/util';


export default class Server {
	constructor(konopas, opt = {}) {
	    this.konopas = konopas;
	    this.id = konopas.id;
	    this.stars = konopas.stars;

	    this.host = opt.host ||  'https://konopas-server.appspot.com';
	    this.el_id = opt.el_id || 'server_connect';
	    this.err_el_id = opt.err_el_id || 'server_error';
	    try { this.store = localStorage; } catch (e) { this.store = new VarStore(); }

	    this.connected = false;
	    this.token = this.store.getItem('konopas.token') || false;
	    this.ical = this.store.getItem(`konopas.${this.id}.ical_link`) || false;
	    this.prog_data = {};
	    this.prog_server_mtime = 0;
	    this.pub_data = false;
	    this.pub_comments = {};
	    this.el = document.getElementById(this.el_id);
	    this.err_el = false;

	    this.disconnect();
	    if (this.stars) this.stars.server = this;
	    if (this.el && this.id) this.exec('info');
	    else log('server init failed', 'warn');

	    const m = /#server_error=(.+)/.exec(window.location.hash);
	    if (m) this.error(decodeURIComponent(m[1].replace(/\+/g, ' ')), window.location.href);
    }

    disconnect() {
	    this.connected = false;
	    if (this.el) this.el.innerHTML = '<div id="server_info">' + i18n.txt('Not connected') + '</div>';
	    document.body.classList.remove('logged-in');
    }

    logout(ev = window.event) {
	    log('server logout');
	    this.exec('/logout');
	    ev.preventDefault();
    }

    error(msg, url) {
	    log('server error ' + msg + ', url: ' + url, 'error');
	    if (!msg) {
		    const cmd = url.replace(this.host, '').replace('/' + this.id + '/', '');
		    msg = i18n.txt('server_cmd_fail', { CMD:'<code>'+cmd+'</code>' });
	    }
	    if (!this.err_el) {
		    const el = document.createElement('div');
		    el.id = this.err_el_id;
		    el.title = i18n.txt('Click to close');
		    el.onclick = () => { this.err_el.style.display = 'none'; };
		    document.body.appendChild(el);
		    this.err_el = el;
	    }
	    this.err_el.innerHTML = `<div>${i18n.txt('Server error')}: <b>${msg}</b></div>`;
	    this.err_el.style.display = 'block';
	    return true;
    }

    onmessage(ev = window.event) {
	    if (ev.origin != this.host) {
		    log('Got an unexpected message from ' + ev.origin, 'error');
		    log(ev);
	    } else {
	        JSON.parse(ev.data, (k, v) => {
		        switch (k) {
			        case 'ok':    this.cb_ok(v);      break;
			        case 'fail':  this.error('', v);  break;
		        }
	        });
        }
    }



    // ------------------------------------------------------------------------------------------------ prog

    prog_mtime() {
	    let mtime = this.prog_server_mtime;
	    for (let id in this.prog_data) {
            const t = this.prog_data[id][1];
		    if (t > mtime) mtime = t;
	    }
	    return mtime;
    }

    add_prog(id, add_star) {
	    if (id instanceof Array) id = id.join(',');
	    log('server add_prog ' + JSON.stringify(id) + ' ' + (add_star ? '1' : '0'));
	    const t = this.prog_mtime();
	    this.exec('prog'
		    + (add_star ? '?add=' : '?rm=') + id
		    + (t ? '&t=' + t : ''));
    }

    set_prog(star_list) {
	    log('server set_prog ' + JSON.stringify(star_list));
	    const t = this.prog_mtime();
	    this.exec('prog'
		    + '?set=' + star_list.join(',')
		    + (t ? '&t=' + t : ''));
    }



    // ------------------------------------------------------------------------------------------------ comment

    onclick_show_comments(ev, id, comments, af, form) {
	    ev = ev || window.event;
	    ev.cancelBubble = true;
	    ev.preventDefault();
	    ev.stopPropagation();
	    const ac = ev.target;
	    if (ac.textContent.substr(0, 4) == i18n.txt('Hide comments').substr(0, 4)) {
		    const p = this.pub_data && this.pub_data[id];
		    const n_comments = (p && (p[3] > 0)) ? p[3] : 0;
		    ac.textContent = i18n.txt('show_comments', { N: n_comments });
		    ac.style.display = n_comments ? 'block' : 'none';
		    comments.style.display = 'none';
		    af.style.display = n_comments ? 'none' : 'block';
		    form.style.display = 'none';
	    } else {
		    comments.style.display = 'block';
		    if ((form.style.display == 'none') && this.connected) af.style.display = 'block';
		    this.show_comments(id);
	    }
    }


    onclick_show_comment_form(ev, id, form) {
	    ev = ev || window.event;
	    ev.cancelBubble = true;
	    ev.preventDefault();
	    ev.stopPropagation();
	    const af = ev.target;
	    af.style.display = 'none';
	    this.show_comment_form(id, af, form);
    }


    make_comment_div(c) {
	    const d = new_elem('div', 'comment');
	    const n = new_elem('span', 'comment-author', c.name);
	    d.appendChild(n);
	    const dt = new Date(1000 * c.ctime);
	    const t = new_elem('span', 'comment-time', pretty_date(dt, this.konopas) + ' at ' + pretty_time(dt, this.konopas));
	    t.title = dt.toString();
	    d.appendChild(t);
	    const m = new_elem('div', '', c.text);
	    d.appendChild(m);
	    return d;
    }

    show_comments(id) {
	    const comments = document.getElementById('c' + id); if (!comments) return;
	    while (comments.firstChild) comments.removeChild(comments.firstChild);
	    let ac = comments.previousSibling;
	    const c = this.pub_comments[id];
	    if (ac && (ac.tagName.toLowerCase() !== 'a')) ac = null;
	    if (typeof c == 'undefined') {
		    if (ac) {
			    ac.classList.remove('js-link');
			    ac.textContent = i18n.txt('Loading comments…');
		    }
		    this.exec('comments?id=' + id);
		    return;
	    }

	    let n_comments = 0;
	    if (c) for (let i in c) {
		    ++n_comments;
		    comments.appendChild(this.make_comment_div(c[i]));
	    }

	    if (this.pub_data) {
		    if (this.pub_data[id]) this.pub_data[id][3] = n_comments;
		    else this.pub_data[id] = [0, 0, 0, n_comments];
	    }

	    if (ac) {
		    ac.textContent = i18n.txt('Hide comments');
		    ac.classList.add('js-link');
		    ac.style.display = n_comments ? 'block' : 'none';
	    }

	    if (!n_comments) {
		    const form = document.getElementById('f' + id);
		    if (form && (form.style.display == 'none')) {
			    const af = form.previousSibling;
			    if (af && (af.tagName.toLowerCase() == 'a')) af.style.display = 'block';
		    }
	    }
    }


    show_comment_form(id, af, form) {
	    if (!this.connected) return;
	    if (form.classList.contains('empty')) {
		    if (!document.getElementById('post_comment_iframe')) {
			    const fi = document.createElement('iframe');
			    fi.id = fi.name = 'post_comment_iframe';
			    fi.src = 'javascript:false';
			    fi.style.display = 'none';
			    document.body.appendChild(fi);
			    window.onmessage = this.onmessage.bind(this);
		    }
		    form.method = 'post';
		    form.action = this.url('add_comment?id=' + encodeURIComponent(id));
		    form.target = 'post_comment_iframe';
		    form.innerHTML =
			      '<textarea name="text" rows="4" placeholder="' + i18n.txt('post_author', { N: this.connected[0] }) + '"></textarea>'
			    + '<input type="submit" name="submit">'
			    + '<input type="reset" value="' + i18n.txt('Cancel') + '">'
			    + '<label><input type="checkbox" name="anon"> ' + i18n.txt('Post anonymously') + '</label>'
			    + '<label><input type="checkbox" name="hide"> ' + i18n.txt('Hide from public') + '</label>';
		    form.onclick = (ev = window.event) => {
			    ev.cancelBubble = true;
			    ev.stopPropagation();
		    };
		    form.onsubmit = () => {
			    form.submit.value = i18n.txt('Posting…');
			    form.submit.disabled = true;
			    if (form.anon.checked) { form.action += '&anon=1'; form.anon.disabled = true; }
			    if (form.hide.checked) { form.action += '&hide=1'; form.hide.disabled = true; }
		    };
		    form.onreset = () => {
			    af.style.display = 'block';
			    form.style.display = 'none';
		    };
		    form.classList.remove('empty');
	    } else {
		    form.submit.disabled = false;
		    form.anon.disabled = false;
		    form.hide.disabled = false;
	    }
	    form.submit.value = i18n.txt('Post comment');
	    form.style.display = 'block';
    }


    make_comments_wrap(id) {
	    const p = this.pub_data && this.pub_data[id];
	    const n_comments = (p && (p[3] > 0)) ? p[3] : 0;
	    const d = new_elem('div', 'comments-wrap');

	    const ac = new_elem('a', 'js-link discreet');
	    ac.textContent = i18n.txt('show_comments', { N: n_comments });
	    ac.style.display = n_comments ? 'block' : 'none';
	    d.appendChild(ac);

	    const comments = new_elem('div', 'comments');
	    comments.id = 'c' + id;
	    comments.style.display = 'none';
	    d.appendChild(comments);

	    const af = new_elem('a', 'js-link discreet', i18n.txt('Add a comment'));
	    af.style.display = n_comments || !this.connected ? 'none' : 'block';
	    d.appendChild(af);

	    const form = new_elem('form', 'empty');
	    form.id = 'f' + id;
	    form.style.display = 'none';
	    d.appendChild(form);

	    ac.onclick = (ev) => { this.onclick_show_comments(ev, id, comments, af, form); };
	    af.onclick = (ev) => { this.onclick_show_comment_form(ev, id, form); };
	    return d;
    }


    // ------------------------------------------------------------------------------------------------ item extras

    show_extras(id, p_el) {
	    if (!this.pub_data) return;
	    if (!document.getElementById('c' + id)) {
		    p_el.appendChild(this.make_comments_wrap(id));
	    }
    }



    // ------------------------------------------------------------------------------------------------ ical

    show_ical_link(p_el) {
	    let html = '';
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
		    const i_el = document.getElementById('ical_text');
		    if (i_el) i_el.innerHTML = html;
	    }
	    const a = document.getElementById('ical_link');
	    if (a) a.onclick = () => { this.exec('ical_link'); };
    }



    // ------------------------------------------------------------------------------------------------ exec

    url(cmd) {
	    if (this.token) cmd += (cmd.indexOf('?') != -1 ? '&' : '?') + 'k=' + encodeURIComponent(this.token);
	    return this.host + (cmd[0] == '/' ? '' : '/' + this.id + '/') + cmd;
    }

    // based on https://github.com/IntoMethod/Lightweight-JSONP/blob/master/jsonp.js
    exec(cmd) {
	    const script = document.createElement('script');
	    script.src = this.url(cmd);
	    script.async = true;
	    script.onerror = (ev = window.event) => { this.error('', ev.target.src); };
		let done = false;
	    script.onload = script.onreadystatechange = function() {
		    if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
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
    cb_ok(v) {
	    const m = /^(?:https?:\/\/[^\/]+)?\/?([^?\/]*)(?:\/([^?]*))(?:\?(.*))?/.exec(v);
        const [, , cmd = '', query = ''] = m;
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
				    this.konopas.set_view();
			    }
			    this.exec('info');
			    log('server ok (logout): ' + JSON.stringify(v));
			    break;

		    case 'prog':
			    const t = /&server_mtime=(\d+)/.exec(query);
			    if (t) this.prog_server_mtime = parseInt(t[1], 10);
			    log('server ok (prog): ' + JSON.stringify(v));
			    break;

		    case 'add_comment':
			    const id = /\bid=([^&]+)/.exec(query);
			    if (id) {
				    this.exec('comments?id=' + id[1]);
				    const form = document.getElementById('f' + id[1]);
				    if (form) form.reset();
			    }
			    log('server ok (add_comment): ' + JSON.stringify(v));
			    break;

		    default:
			    log('server ok (???): ' + JSON.stringify(v), 'warn');
	    }
    }

    // callback for reporting server errors
    cb_fail(v) {
	    this.error(v.msg, v.url);
    }



    // ------------------------------------------------------------------------------------------------ callback

    cb_info(v) {
	    log('server info: ' + JSON.stringify(v));
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

    cb_token(token) {
	    log('server token: ' + token);
	    this.token = token;
	    this.store.setItem('konopas.token', token);
    }

    cb_login(v) {
	    log('server login: ' + JSON.stringify(v));
	    const links = [];
	    for (let cmd in v) {
		    links.push(`<a href="${this.url(cmd)}">${v[cmd]}</a>`);
	    }
	    this.el.innerHTML = '<div id="login-links">'
		    + '\n&raquo; <span class="popup-link" id="login-popup-link">' + i18n.txt('Login to sync your data') + '</span>\n'
		    + '<div class="popup" id="login-popup">' + i18n.txt('login_why')
		    + '\n<ul>\n<li>' + links.join('\n<li>')
		    + '\n</ul></div></div>';
	    document.getElementById('login-popup-link').onclick = popup_open;
    }

    cb_my_prog(v) {
	    log('server my_prog: ' + JSON.stringify(v));
	    this.prog_data = v.prog;
	    if (v.t0) for (let id in this.prog_data) { this.prog_data[id][1] += v.t0; }
	    if (this.stars) this.stars.sync(this.prog_data);
	    else log('Server.stars required for prog sync', 'warn');
    }

    cb_my_votes(v) { /* obsolete */ }

    cb_pub_data(p) {
	    log('server pub_data: ' + JSON.stringify(p));
	    this.pub_data = p;
	    const open_items = document.getElementsByClassName('expanded');
	    for (let i = 0; i < open_items.length; ++i) {
		    const it = open_items[i].getElementsByClassName('item');
		    if (it) this.show_extras(it[0].id.substr(1), it[0]);
	    }
    }

    cb_show_comments(id, c) {
	    log('server show_comments (' + id + '): ' + JSON.stringify(c));
	    c.sort((a, b) => a.ctime - b.ctime);
	    this.pub_comments[id] = c;
	    this.show_comments(id);
    }

    cb_ical_link(url) {
	    this.ical = url;
	    this.store.setItem('konopas.'+this.id+'.ical_link', url);
	    this.show_ical_link(false);
    }
}
