<!---
title: Info
-->

zDocs is a documentation framework created by a naive developer who wanted a simple way to document all of his source files. By *all* he means all languages that he uses. Currently zDocs supports javascript only; however, in the future support for objective-c, python and many more will be added! There are really two main parts of the zDocs API:

- Rendering: One can create his own renderer for a given file type. His renderer would be responsible for parsing the files for the documentation and then creating the HTML to display it. Thankfully the zDocs API has a convenience function to parse comment blocks to get documentation information and a convenience class for creating the HTML to display!
- Middleware: zDocs exports a source of middleware for expressjs. All one has to do is supply the path to the files he wants to document, a title for his documentation center and a path to a stylesheet that styles the entire center.

This framework is still in development. At this point, `Mon Jan 20 01:44:34 CST 2014`, zDocs is essentially in alpha. Major changes might occur so don't expect anything!
