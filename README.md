KonOpas
=======

A mobile-friendly guide for conventions, with all sorts of spiffy features.


**[KonOpas]** is free, open-source software distributed under the terms of the
ISC license:

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


## Description

[KonOpas] is a front end for the programme of a convention, conference or any
other single- or multi-track event. It's written in JavaScript, and it works in
practically all modern browsers, including those on mobile phones. It can use
HTML5 caching to make itself available even without a live net connection, and
it remembers your item selections across sessions.

The hosting requirements for KonOpas are minimal, as all the processing is done
by the browser; all the files are served statically. Some back-end scripting may
be required if you require live updates of the programme during the event.

Built and tested for a growing number of large and small conventions and
conferences, KonOpas is about as easy to use as possible. With automatic filter
rule generation from your data, KonOpas can be set up for your event by just
adding your name and logo to an HTML file, along with pointers to your
programme and participant data.

The open-source KonOpas client can also talk with a dedicated KonOpas server.
The server enables item sync across different browsers, devices and calendar
apps; item-specific voting and commenting; and allows the event organisers to
track which items were the most popular. To enable server access for your event,
please get in touch with us at: info@konopas.org

For links to example instances of KonOpas, take a look at the links from our
[website][KonOpas].

[KonOpas]: http://konopas.org/


## Getting Started

As KonOpas is a front end for your event's programme, you'll need to actually
manage your programme with a different tool. So far we've got built-in
integration with at least [Conference Planner]/[Grenadine] and [Zambia], with
more to come. For smaller events, a simple [PHP script] is available for
fetching data from a publicly readable Google Drive Spreadsheet and converting
it to the [KonOpas format][KO-fmt].

[Conference Planner]: http://sourceforge.net/projects/conferenceplan/
[Grenadine]: http://events.grenadine.co/
[Zambia]: http://sourceforge.net/projects/zambia/
[PHP script]: https://github.com/eemeli/konopas/tree/master/util/gdrive2js
[KO-fmt]: http://konopas.org/data-fmt


To get started, you should download the [latest release of KonOpas][KO-latest],
which includes the compiled & minified Javascript and CSS files. Alternatively,
if you clone the [repository][KO-repo], you'll have a much easier time of
making changes to the skin or hacking the Javascript source, but you'll need to
compile the code yourself---instructions for that are in the following section.

[KO-latest]: https://github.com/eemeli/konopas/releases/latest
[KO-repo]: https://github.com/eemeli/konopas


Once you've got your programme data in the [proper format][KO-fmt], you should
just change the `<script>` tags at the bottom of `index.html` to point to your
data, and open the page in a web browser. If all goes well, you should see your
programme nearly ready to use! If there are problems, the first place to look
for more information is your browser's developer console.

To start customizing KonOpas for your event, edit the HTML file by replacing
stand-in phrases like `KonOpas Sample Guide` and `CONVENTION` as appropriate.
The `title` and `title-small` images are the logo that's displayed at the top of
the page; there are two as you may wish to use a different graphic for the wide
and narrow-aspect layouts. Near the bottom of the file you'll find the
definition of a Javascript object `konopas_set` that's used to [configure the
guide][KO-cfg].

For more in-depth changes such as changes to the color scheme or fonts, you'll
need to edit the `skin/*.less` files and recompile them into CSS. For
internationalization and other needs, we have a few other [utilities][KO-util]
available.

The HTML5 [cache manifest] is by default not enabled, as it makes testing and
development a bit of a hassle. To enable, you should update the contents of
`konopas.appcache` to match your deployment and add a reference to it in the
`<html>` tag. Do check that your server is properly serving it with the
`text/cache-manifest` MIME type, and that the manifest doesn't include itself,
as debugging a bad manifest can be tricky.

[KO-cfg]: http://konopas.org/config
[KO-util]: http://konopas.org/util/
[cache manifest]: http://en.wikipedia.org/wiki/Cache_manifest_in_HTML5


## Compilation & Dependencies

For most use cases, KonOpas should be usable directly. However, if you'd like to
change things such as the interface language, or if you'd like to just poke
under the hood in general, you have two options based on different **build
environments**, [make](#user-content-make) and [gulp](#user-content-gulp).

For **styling**, KonOpas uses [LESS], which requires compilation into CSS if
modified. This should make it easier for you to tune the default skin to match
your needs.

For **internationalization**, we use Alex Sexton's [messageformat.js]. If you'd
like to implement your own localization, the easiest way is probably to use our
[online i18n js generator][KO-i18n] and to save the output as `i18n/$LC.js`. So
far localizations include English, Finnish, and Swedish. Support for multi-
lingual instances requires messageformat.js 0.2.0 or later.

[LESS]: http://lesscss.org/
[messageformat.js]: https://github.com/SlexAxton/messageformat.js
[KO-i18n]: http://konopas.org/util/i18n/


### make

Using make will require separately installing the [LESS] and [messageformat.js]
dependencies, but only if you intend to change the styling or localization
source files.

A `Makefile` is included, with a default target `dev` for a development version
and `prod`, which minifies the previous using the [javascript-minifier.com]
service's HTTP API. These targets will also modify the appropriate `<script>`
tag in `index.html` to reflect the version in use.

If you've [Watchman] installed, `make watch` will start it with triggers for
automatically updating the JS & CSS files during development.

[javascript-minifier.com]: http://javascript-minifier.com/
[Watchman]: https://github.com/facebook/watchman


### gulp

To automatically install the dependencies required by [gulp.js], run
`npm install` in the directory in which you've installed KonOpas. Then try
running `gulp --locale en` to get a list of the available targets.

The gulp.js build system was implemented for KonOpas by [Aarni Koskela][akx].

[gulp.js]: http://gulpjs.com/
[akx]: https://github.com/akx/


## Discussion

We have a public [mailing list][KO-list] that you're welcome to join, or just
follow online.

[KO-list]: https://groups.google.com/d/forum/konopas-dev

