For Translators:
================

KonOpas uses Alex Sexton's [messageformat.js]. If you'd like to implement your
own localization, the easiest way is probably to use our [online i18n.js
generator][KO-i18n] and to save the output as `i18n/i18n.js`.

[messageformat.js]: https://github.com/SlexAxton/messageformat.js
[KO-i18n]: http://konopas.org/util/i18n/

Please note that non-English localizations need a few more terms defined than is
included in `i18n/en.json` here. Therefore, you should base your work on this
version instead:

http://www.konopas.org/util/i18n/en.json

You are most welcome to contribute your localizations to the project, either by
adding a GitHub pull request for the .json file or by e-mailing it to:
info@konopas.org

Two sed scripts, `json2po` and `po2json`, are included to help reformat the
source translation files to and from GetText .po files, which may be easier to
handle with conventional translation tools.
