import messages from '../build/messages';

class I18n {
	constructor(attr) {
		this.attr = attr;
		this.locale = null;
		this.messages = messages;
	}

	setLocale(locale) {
		this.locale = locale;
		return this.translateHTML();
	}

	txt(key, data) {
		const fn = this.locale && this.messages[this.locale][key];
		return fn ? fn(data) : key;
	}

	translateHTML() {
		const map = this.messages[this.locale];
		const attr = this.attr;
		if (!map || !attr) return false;
		const list = document.querySelectorAll(`[${attr}]`);
		for (let i = 0, node; node = list[i]; ++i) {
			const key = node.getAttribute(attr) || node.textContent.trim();
			if (key in map) {
				const dataSrc = node.getAttribute(attr + '-var');
				const data = dataSrc && JSON.parse('{' + dataSrc.replace(/[^,:]+/g, '"$&"') + '}');
				const str = map[key](data);
				const attr = node.getAttribute(attr + '-attr');
				if (attr) node.setAttribute(attr, str);
				else node.innerHTML = str;
			}
		}
		return true;
	}
}

export default new I18n('data-txt');
