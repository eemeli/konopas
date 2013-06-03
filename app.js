function show_info(item, id) {
	if (document.getElementById("e" + id)) return;

	var html = "";
	var a = prog.filter(function(el) { return el.id == id; });
	if (a.length < 1) html = "Program id <b>" + id + "</b> not found!";
	else {
		var ap = a[0].people.map(function(p) { return "<a href=\"#part" + p.id + "\">" + p.name + "</a>"; });
		if (ap.length > 0) html += "Participants: " + ap.join(", ") + "\n";
		html += "<p>" + a[0].precis + "</p>";
	}
	item.innerHTML += "<div class=\"extra\" id=\"e" + id + "\">" + html + "</div>";
}

function update_list(day, floor, type, freetext) {
	var html = [];
	for (var i = 0; i < prog.length; ++i) {
		if (day && prog[i].day != day) continue;
		if (floor) switch (floor) {
			case "all floors": break;
			case "other floors": if (prog[i].floor) continue; else break;
			default: if (prog[i].floor != floor) continue;
		}
		if (type) {
			var re_t;
			switch (type) {
				case "ChiKidz":     re_t = /^ChiKidz/; break;
				case "Reading":     re_t = /Reading/; break;
				case "Autograph":   re_t = /^Autograph/; break;
				case "kk":          re_t = /^(Kaffeeklatsch|Literary Beer)/; break;
				case "filk":        re_t = /\bFilk\b/; break;
				case "other_types": re_t = /^(?!ChiKidz|Reading|Autograph|Kaffeeklatsch|Literary Beer|Themed Filk|Open Filk)./; break;
			}
			if (re_t && !re_t.test(prog[i].title)) continue;
		}
		if (freetext) {
			var re_q = new RegExp(freetext, "i");
			if (!prog[i].title.match(re_q) && !prog[i].precis.match(re_q)) {
				var pl = prog[i].people.map(function(p) { return p.name; }).join("\t");
				if (!pl.match(re_q)) continue;
			}
			//var sa = [ prog[i].title, prog[i].precis ];
			//for (var j = 0; j < prog[i].people.length; ++j) sa[sa.length] = prog[i].people[j].name;
			//console.log(sa.join("\t"));
			//if (!sa.join("\t").match(re_q)) continue;
		}

		//var it = [ "", prog[i].time, prog[i].floor, prog[i].room, "<b>" + prog[i].title + "</b>" ];
		var it = [
			{"c": "day", "v": ""},
			{"c": "time", "v": prog[i].time},
			{"c": "floor", "v": prog[i].floor},
			{"c": "room", "v": prog[i].room},
			{"c": "title", "v": prog[i].title}
		];
		switch (prog[i].day) {
			case "2012-08-30": it[0].v = "Thu"; break;
			case "2012-08-31": it[0].v = "Fri"; break;
			case "2012-09-01": it[0].v = "Sat"; break;
			case "2012-09-02": it[0].v = "Sun"; break;
			case "2012-09-03": it[0].v = "Mon"; break;
		}
		//html[html.length] = "<tr id=\"p" + prog[i].id + "\"><td>" + it.join("</td><td>") + "</td></tr>";
		//html[html.length] = "<div class=\"item\" id=\"p" + prog[i].id + "\"><div>" + it.join("</div><div>") + "</div></div>";
		html[html.length] = "<div class=\"item\" id=\"p" + prog[i].id + "\">"
			+ it.map(function(el){ return "<div class=\"" + el.c + "\">" + el.v + "</div>"; }).join('')
			+ "</div>";
	}
	//document.getElementById("ls").innerHTML = "<table>" + html.join("\n") + "</table>";
	document.getElementById("ls").innerHTML = html.join('');
	var items = document.getElementById("ls").getElementsByClassName("item");
	for (var i = 0; i < items.length; ++i) {
		items[i].onclick = function() {
			if (this.classList.contains("expanded")) {
				this.classList.remove("expanded");
			} else {
				this.classList.add("expanded");
				show_info(this, this.id.substr(1));
			}
			return true;
		};
		items[i].style.cursor = "pointer";
	}
}

function update_filters(day, floor, type) {
	var dd = document.getElementById("day");
	if (dd) {
		var dt = "d" + day;
		var dc = dd.getElementsByTagName("li");
		for (var i = 0; i < dc.length; ++i) {
			dc[i].classList.remove("selected");
			if (dc[i].id == dt) dc[i].classList.add("selected");
		}
	}

	var fd = document.getElementById("floor");
	if (fd) {
		var ft = floor ? floor.replace(/ /, "_") : "all_floors";

		var fc = fd.getElementsByTagName("li");
		for (var i = 0; i < fc.length; ++i) {
			fc[i].classList.remove("selected");
			if (fc[i].id == ft) fc[i].classList.add("selected");
		}
	}

	var td = document.getElementById("type");
	if (td) {
		var tt = type;
		if (!tt) tt = "all_types";

		var tc = td.getElementsByTagName("li");
		for (var i = 0; i < tc.length; ++i) {
			tc[i].classList.remove("selected");
			if (tc[i].id == tt) tc[i].classList.add("selected");
		}
	}
}

function filter(list, item) {
	var day, floor, type, freetext;

	var dd = document.getElementById("day");
	if (dd) {
		var ds = dd.getElementsByClassName("selected");
		if (ds) day = ds[0].id;
	}

	var fd = document.getElementById("floor");
	if (fd) {
		var fs = fd.getElementsByClassName("selected");
		if (fs) floor = fs[0].id;
	}

	var td = document.getElementById("type");
	if (td) {
		var ts = td.getElementsByClassName("selected");
		if (ts) type = ts[0].id;
	}

	var sc = document.getElementById("q");
	if (sc) freetext = sc.value;

	switch (list) {
		case "day":   day = item; break;
		case "floor": floor = item; break;
		case "type":  type = item; break;
	}

	day = day.substr(1);
	floor = floor.replace(/_/, " ");

	update_list(day, floor, type, freetext);
	update_filters(day, floor, type);
}


var dc = document.getElementById("filters").getElementsByTagName("li");
for (var i = 0; i < dc.length; ++i) {
	dc[i].onclick = function() { filter(this.parentNode.id, this.id); return true; };
	dc[i].style.cursor = "pointer";
}
var sf = document.getElementById("search");
if (sf) {
	sf.onsubmit = function() { filter(); return false; };
	sf.onreset = function() { document.getElementById("q").value = ""; filter(); return true; };
}

var sq = document.getElementById("q");
if (sq) sq.onblur = function() { filter(); return true; };

filter();
