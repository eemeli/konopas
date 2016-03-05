function get_ranges(letters, bin_size) {
	const next_matches = (a, i) => (i < a.length - 1) && (a[i + 1] == a[i]);
	const prev_matches = (a, i) => (i > 0) && (a[i - 1] == a[i]);
	const n_bins = bin_size ? Math.round(letters.length / bin_size) : 0;
	const ends = [];
	for (let i = 1; i <= n_bins; ++i) {
		let e = Math.round(i * letters.length / n_bins);
        let n_up = 0;
        let n_down = 0;
		if (e < 0) e = 0;
		if (e >= letters.length) e = letters.length - 1;
		while (next_matches(letters, e + n_up)) ++n_up;
		if (n_up) while (prev_matches(letters, e - n_down)) ++n_down;
		if (n_up <= n_down) e += n_up;
		else if (e > n_down) e -= n_down + 1;
		if (!ends.length || (ends[ends.length - 1] != letters[e])) ends.push(letters[e]);
	}
	let start = ' ';
	ends.forEach((e, i) => {
		if (e > start) ends[i] = start + e;
		if (e >= start) start = String.fromCharCode(e.charCodeAt(0) + 1);
	});
	return ends;
}

export default class PartData {
	constructor(list, { lc, non_ascii_people = false, people_per_screen = 0 }) {
        const sortname = a => ((a[1] || '') + '  ' + a[0]).toUpperCase().replace(/^ +/, '');
		this.list = list;
        if (non_ascii_people) {
		    this.list.forEach(p => { p.sortname = sortname(p.name); });
		    this.list.sort((a, b) => a.sortname.localeCompare(b.sortname, lc));
	        this._name_in_range = (n0, range) => (n0.localeCompare(range[0], lc) >= 0) && (n0.localeCompare(range[1], lc) <= 0);
        } else {
            const sortname2 = String.prototype.normalize  // Not in Safari or IE <11
                            ? str => sortname(str).normalize('NFKD').replace(/[^\x00-\x7F]/g, '')
                            : str => require('diacritics').remove(sortname(str));
		    this.list.forEach(p => { p.sortname = sortname2(p.name); });
		    this.list.sort((a, b) => a.sortname < b.sortname ? -1 : a.sortname > b.sortname);
	        this._name_in_range = (n0, range) => (n0 >= range[0]) && (n0 <= range[1]);
        }
        const name_idx = this.has_last_names() ? 1 : 0;
        const letters = this.list
            .filter(p => p.name && p.name.length > name_idx)
            .map(p => p.name[name_idx].trim().charAt(0).toUpperCase());
		this.ranges = get_ranges(letters, people_per_screen);
	}

    find_name_range(sortname) {
		const n0 = sortname[0];
		if (n0 && this.ranges) {
            const len = this.ranges.length;
            for (let i = 0; i < len; ++i) {
                const r = this.ranges[i];
                if (this.name_in_range(n0, r)) return r;
            }
        }
        return '';
    }

    get(id) {
        const len = this.list.length;
        for (let i = 0; i < len; ++i) {
            const p = this.list[i];
            if (p.id == id) return p;
        }
        return null;
    }

    has_first_names() {
        return this.list.some(p => p.name && p.name[0]);
    }

    has_last_names() {
        return this.list.some(p => p.name && p.name[1]);
    }

	name_in_range(n0, range) {
		switch (range.length) {
			case 1:  return (n0 == range[0]);
			case 2:  return this._name_in_range(n0, range);
			default: return (range.indexOf(n0) >= 0);
		}
	}
}
