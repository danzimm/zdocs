[![Build Status](https://travis-ci.org/danzimm/zdocs.png?branch=master)](https://travis-ci.org/danzimm/zdocs)
#zDocs
A node framework for creating a documentation server.
##Why?
I, DanZimm, am aware that there are other doucmentation-webpage-creators but didn't like any of them so I decided to make my own. My goal is to support as many languages as possible while maintaining wase of use. I want the documentation server to be completely themable and flexible.
##How?
The documentation server really has two sides:

- Documenting Files
- Creating the server to display the documentation server

###Documenting Files
In order to document your files so that zdocs can properly render them one needs to add a comment above the function/object/variable that you want documented. This comment needs to have the following format:
    @key value
    @key value
    ...
The key can have any character in `[\w\d\\]` or be simply an `@`. The `@` ket is a special key to signify no title for the following value. The `_` in a key signifies a space, so `Some_key` would result in `Some key` as the actual key. However if one wants an underscore in the key he can escape it: `Some\_key` -> `Some_key`. Ok now that we're done talking about `_` let's talk about the `value`. The `value` can be markdown data that will be automatically converted into HTML. It should probably be mentioned that one can have a special key of the format
    @#somefile.md
which will load in a markdown file, parse it for a `<!-- title: sometitle --->` sequence and automatically add key-value pair where the title it parsed is the key and the value in the markdown data automatically converted to HTML. This allows a sort of 'importing' of data.

Now we shall discuss example comments.

While each renderer might define its own keys, I will outline the general keys that are implemented in the `js`, `h` renderers. 

To begin each file can have a description signified by the following key-value pair:
    @zdocs filedescription
The rest of the key-value pairs will be added directly to the header of the documentation page. For example th following comment:
    @zdocs filedescription
    @@ Description shall be entered here!
    @More_Info Look at *this* uber cool markdown info!
would result in the header having an untitled block with `Description shall be entered here!` in it, and a titled block (titled `More Info`) with `Look at <em>this</em> uber cool markdown info!`.

This filedescription can be added multiple times anywhere throughout a file, however it cannot rest directly above a function/object otherwise zdocs will think the comment is attempting to describe that function/object! Now to comment that describe functions and objects...

To describe a function one has the optional key-value pair of
    @zdocs function
followed by more optional key value pairs:
    @parameter arg1 = {Type} Desc
    @parameter arg2 = {Type2} Desc2
    @description Some short description
    @discussion Longer description yada yada
    @availability Since when can I use this again?
    @retval {Type3} Desc3
The string between `{}` denotes the type of the parameter/retval. The `arg1/arg2` specifies the name of the argument you are describing. The rest seems self explanatory. Note that any of these parts are optional except for the parameter name. So you can describe a parameter without saying its type (this is cool when you're documenting a strongly typed language, for then the parser automatically extracts the type of the arguement).

###Creating the Server
Few still with me? Let's talk about starting up the server. Here is an example script:
    var app = require('express')(),
        zdocs = require('zdocs');

    zdocs.stackDoc(app, '/', {
        name : "Doc Center",
        paths : ["./", "/home/somedir/bloop"],
        scripts : ["/some/custom/script.js"],
        stylesheets : ["/some/custom/style.css"]
    });

    app.listen(3001);
Now lets disect this. The main function one should call is `zdocs.stackDoc`. The first arguement specifies the express server you want to add this documentation center to. The second specifies the path you want the documentation center located at. The third parameter specifies an object. This object allows you to specify the name of the server, the paths you want the server to look for files to document, an array of custom scripts you want to be loaded into the rendered documentation pages (these are URLS, so they can be external files, or files on the current domain), and an array of custom stylesheets (similar to the scripts array).

###Now what?
Now you can create your very own documentation server ever so easily! If you have suggestions or comments let me know. Pull requests are welcome, as long as they encourage the growth of zdocs!

###License: MIT
