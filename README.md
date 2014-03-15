KonOpas
=======

A mobile-friendly guide for conventions, with all sorts of spiffy features.


**KonOpas** is free, open-source software distributed under the terms of the ISC license:

	Copyright (c) 2013-2014 by Eemeli Aro <eemeli@gmail.com>

	Permission to use, copy, modify, and/or distribute this software for
	any purpose with or without fee is hereby granted, provided that the
	above copyright notice and this permission notice appear in all copies.

	The software is provided "as is" and the author disclaims all
	warranties with regard to this software including all implied
	warranties of merchantability and fitness. In no event shall the author
	be liable for any special, direct, indirect, or consequential damages
	or any damages whatsoever resulting from loss of use, data or profits,
	whether in an action of contract, negligence or other tortious action,
	arising out of or in connection with the use or performance of this
	software.


Description
-----------
[KonOpas][0] is a front end for the programme of a convention, conference or any other multi-track event. It's written in JavaScript, and it works in practically all modern browsers, including those on mobile phones. It can use HTML5 caching to make itself available even without a live net connection, and it remembers your item selections across sessions.

The hosting requirements for KonOpas are minimal, as all the processing is done by the browser; all the files are served statically. Some scripting may be required if you require live updates of the programme during the event, as you'll need to update the databases read by KonOpas, as well as the [cache manifest file][1] (all of which are text files).

The open-source KonOpas client can also talk with a dedicated KonOpas server. The server enables item sync across different browsers, devices and calendar apps; item-specific voting and commenting; and allows the event organisers to track which items were the most popular. To enable server access for your event, please get in touch with us at: info@konopas.org

[0]: http://konopas.org/
[1]: http://en.wikipedia.org/wiki/Cache_manifest_in_HTML5


Files
-----

Here are the main files needed to make KonOpas work:

> ``cache.manifest`` — Makes the HTML5 caching work, if referred to in the <html> tag in `index.html`. Not used by default to make testing and development less of a hassle. This needs to change when your programme database is updated, or browsers won't even look to update their contents.
> 
> ``data/people.js`` and `data/program.js` — Your programme database, in a format defined [here][2]. These can be served from elsewhere as well, even across domains as long as you don't use HTTPS and remember to update the cache manifest.
> 
> `index.html` — The single HTML page served to the browser, this defines what programme filters and other views to use, as well as any extra information to include under the "Info" view
> 
> ``konopas.min.js`` — The minified JavaScript source of KonOpas, generated from `src/*.js`
> 
> ``skin/skin.css`` — Styling for KonOpas, generated from `skin/*.less`. Should be modified to suit your site.

[2]: https://github.com/eemeli/konopas/wiki/JSON-data-schemes


Compilation
-----------

You're encouraged to go and poke at the internals of KonOpas, in particular to make its styling more in accordance with the rest of your site. The source style files are [LESS][3] files in ``skin/``, which allow for nifty things like the variables defined at the top of `skin/main.less` that make changing the colour scheme of KonOpas much easier than it would be in raw CSS.

So, to generate ``skin/skin.css`` from `skin/*.less`, install the LESS compiler (instructions [here][3]) and run:

```bash
lessc skin/main.less skin/skin.css
```

Similarly, the raw JavaScript files have been minified as follows:

```bash
cat src/{polyfill,server,stars,app}.js > konopas.js
curl -X POST -s --data-urlencode 'input@konopas.js' http://javascript-minifier.com/raw > konopas.min.js
rm konopas.js
```

[3]: http://lesscss.org/


Discussion
----------

We have a public [mailing list][4] that you're welcome to join, or just follow online.

[4]: https://groups.google.com/d/forum/konopas-dev
