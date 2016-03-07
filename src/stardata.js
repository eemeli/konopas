// StarData#data is a map of program id to a two-element array of "stars":
//   star[0]: selected (1) or not (0)
//   star[1]: last-modified timestamp

function now() {
    return Math.floor(Date.now() / 1000);
}

function update(base, update, apply) {
	const diff = [];
	for (let id in update) {
        const prev = base[id] || [null, 0];
        const next = update[id];
		if (!next || next.length != 2) continue;
		if (next[1] > prev[1]) {
			if (apply) base[id] = next;
            if (!apply || (next[0] != prev[0])) diff.push({ id, mod: next });
		}
	}
    return diff;
}

export default class StarData {
	constructor(store) {
        this.store = store; //new Store('local', id);
		this.data = null;
		this.setListeners = [];  // called on set() and add()
		this.toggleListeners = [];  // called on toggle()
	}

	readData() {
		this.data = this.store.get('stars') || {};
	}

	writeData() {
		if (this.data) this.store.set('stars', this.data);
	}

	list() {
        if (!this.data) this.readData();
		const list = [];
		for (let id in this.data) {
            const star = this.data[id];
			if (star.length == 2 && star[0]) list.push(id);
		}
		return list;
	}

	add(stars, mtime = now()) {
        if (!this.data) this.readData();
		stars.forEach(id => { this.data[id] = [1, mtime]; });
		this.writeData();
        const ls = this.list();
        this.setListeners.forEach(cb => cb(ls));
	}

	set(stars, mtime = now()) {
        if (!this.data) this.readData();
		for (let id in this.data) this.data[id] = [0, mtime];
		this.add(stars, mtime);
	}

	toggle(id, mtime = now()) {
        if (!this.data) this.readData();
        const prev = this.data[id];
        const set = !(prev && prev[0]);
        this.data[id] = [+set, mtime];
		this.writeData();
        this.toggleListeners.forEach(cb => cb(id, set));
        return set;
	}

	sync(remoteData) {
        if (!this.data) this.readData();
        const local = update(this.data, remoteData, true);
        const remote = update(remoteData, this.data, false);
		this.writeData();
        return { local, remote };
    }
}
