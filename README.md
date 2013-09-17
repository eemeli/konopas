KonOpas
=======

A mobile-friendly guide for conventions, with all sorts of spiffy features.


**KonOpas** is free, open-source software distributed under the terms of the ISC license:

	Copyright (c) 2013 by Eemeli Aro <eemeli@gmail.com>

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
KonOpas is a front end for the programme of a convention or any other multi-track event. It's written in JavaScript, and it works in practically all modern browsers, including those on mobile phones. It can use HTML5 caching to make itself available even without a live net connection, and it remembers your item selections across sessions.

Its server requirements can be minimal, as all the processing is done by the browser; all the files are served statically. Some scripting may be required if you require live updates of the programme during the event, as you'll need to update the databases read by KonOpas, as well as the [cache manifest file][1] (all of which are text files).

[1]: http://en.wikipedia.org/wiki/Cache_manifest_in_HTML5

Files
-----

Here are the main files needed to make KonOpas work:

> `app.s` — The full JavaScript source of KonOpas.
> 
> `cache.manifest` — Required to make the HTML5 caching work, it's by default not referred to by the <html> tag in index.html to make testing and development less of a hassle. This needs to change when your programme database is updated, or browsers won't even look to update their contents.
> 
> ``data/people.js`` and `data/program.js` — The programme database, in a format defined [here][2]. These can be served from elsewhere as well, even across domains as long as you don't use HTTPS and remember to update the cache manifest.
> 
> `classList.js` — For backwards compatibility to enable use of element.classList in all browsers
> 
> `FileSaver.min.js` — iCal calendar export is a work-in-progress, and requires this. Not actually used at the moment.
> 
> `index.html` — The single HTML page served to the browser, this defines what programme filters and other views to use, as well as any extra information to include under the "Info" view
> 
> `skin/skin.css` — Styling for KonOpas. Should be modified to suit your site.

[2]: https://github.com/eemeli/konopas/wiki/JSON-data-schemes
