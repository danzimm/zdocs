<!---
title: Info
-->

zDocs is a documentation framework created by a naive developer who wanted a simple way to document all of his source files. By *all* he means all languages that he uses. Currently zDocs supports javascript and c-header files (this includes objective-c headers as well) only. However, in the future support for c++, python and many more will be added! There are really two main parts of the zDocs API:

- Rendering: One can create his own renderer for a given file type. His renderer would be responsible for parsing the files for the documentation and then creating the HTML to display it. Thankfully the zDocs API has a convenience function to parse comment blocks to get documentation information and a convenience class for creating the HTML to display! Currently there is no documentation for this, but one can easily get the gist of the APIs from the source code of `jsrenderer.js` or `chdrrenderer.js`.
- Middleware: zDocs exports a source of middleware for expressjs. All one has to do is supply the express app he wants to add the documentation center to, the path he wants the documentation center to rest at, the paths to the files he wants to document and a title for his documentation center.

This framework is still in development. However, at this point, `Fri Feb 14 15:48:14 CST 2014`, zDocs is officially in beta. Major changes to the API should no longer occur.
