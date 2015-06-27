KonOpas.Info = function() {
	this.lu = _el('last-updated');
	this.lu_time = 0;
	var self = this, cache_manifest = document.body.parentNode.getAttribute('manifest');
	if (this.lu && cache_manifest && ((location.protocol == 'http:') || (location.protocol == 'https:'))) {
		var x = new XMLHttpRequest();
		x.onload = function() {
			self.lu_time = new Date(this.getResponseHeader("Last-Modified"));
			self.show_updated();
		};
		x.open('GET', cache_manifest, true);
		x.send();
	}
	var cl = _el('info_view').getElementsByClassName('collapse');
	for (var i = 0; i < cl.length; ++i) {
		cl[i].onclick = KonOpas.toggle_collapse;
	}
}

KonOpas.Info.prototype.show_updated = function() {
	if (!this.lu || !this.lu_time) return;
	var span = this.lu.getElementsByTagName('span')[0];
	span.textContent = KonOpas.pretty_time_diff(this.lu_time);
	span.title = this.lu_time.toLocaleString();
	span.onclick = function(ev) {
		var self = (ev || window.event).target;
		var tmp = self.title;
		self.title = self.textContent;
		self.textContent = tmp;
	};
	this.lu.style.display = 'inline';
}

KonOpas.Info.prototype.show = function() {
	_el("prog_ls").innerHTML = "";
	this.show_updated();
}

