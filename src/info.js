// import { toggle_collapse, pretty_time_diff } from '../src/util';

export default class {
	constructor() {
		this.lu = document.getElementById('last-updated');
		this.lu_time = 0;
		var self = this, cache_manifest = document.body.parentNode.getAttribute('manifest');
		if (this.lu && cache_manifest && ((location.protocol == 'http:') || (location.protocol == 'https:'))) {
			var x = new XMLHttpRequest();
			x.onload = function() {
				self.lu_time = new Date(this.getResponseHeader('Last-Modified'));
				self.show_updated();
			};
			x.open('GET', cache_manifest, true);
			x.send();
		}
		var cl = document.getElementById('info_view').getElementsByClassName('collapse');
		for (var i = 0; i < cl.length; ++i) {
			cl[i].onclick = KonOpas.toggle_collapse;
		}
	}

	show_updated() {
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

	show() {
		document.getElementById('prog_ls').innerHTML = '';
		this.show_updated();
	}
}
