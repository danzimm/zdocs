/*
	@zdocs filedescription
	@@ ``jsrenderer.js`` is the javascript documentation renderer for zdocs. It uses zdocs' module api and is automatically (internal to zdocs) added as the js renderer. At the moment there is no way to override this renderer, but in the future there will be.
	@Styling You can style this page with the stylesheet you gave when creating the corresponding documentation center.
*/

var fs 			        = require('fs'),
	zutils		        = require('./zutils.js'),
    dominie             = zutils.dominie,
    commentParser       = zutils.commentParser,
    artist              = zutils.artist,
    sortedDictionary    = zutils.sortedDictionary,
	jade		        = require('jade'),
	markdown	        = require('markdown').markdown,
    util                = require('util'),
    fpath               = require('path');

/*
	@zdocs function
	@name module.exports
	@parameter path={String} The file path to the file that you want documented.
    @parameter options={Object} An object with the optional keys of: 'stylesheet' to specify the relative path to the stylesheet to use (with regards to the website's root), doccenter to specify the name of the documentation center
	@retval {String} A 'String' with html documentation of the given 'file'
	@description Parses a javascript file and returns an HTML string of documentation for that file.
	@discussion This assumes the file you are passing to it in 'path' is a javascript file. Ensure that 'path'. It also expects 'path' to be a relative path to the current directory, or a full path.
	@availability Available in zdocs 0.1 and later
*/

module.exports = function(path, options) {
    // helper funcs
    // {{{
	var logger = function(str) {
		util.log("[CSSRenderer] " + str + "\n");
	};
    var unescapeLines = function(lines) {
        var i,
            line,
            prevline;
        for (i = lines.length-1; i != 0; i--) {
            line = lines[i];
            prevline = i-1 >= 0 ? lines[i-1] : "";
            if (prevline.slice(-1) === "\\") {
                prevline = (prevline.slice(0,-1) + "\n" + line.replace(/^[\t ]{0,}/,""));
                lines[i-1] = prevline;
                lines.splice(i,1);
            }
        }
        return lines;
    }
	var concatStrings = function(strings, offset, joiner) {
		var i 		= offset && typeof offset == 'number' ? offset : 0,
			j 		= joiner && typeof joiner == 'string' ? joiner : "";
			ret 	= "";
		if (i < strings.length) {
			ret = strings[i];
			i++;
		}
		for (; i < strings.length ; i++) {
			ret += j + strings[i];
		}
		return ret;
	};
	var parseType = function(val) {
        var extractor = /^[^\\]{0,}\{([\w ]+)[^\\]{0,}\} ?([\u0000-\uffff]{0,})/,
            result = extractor.exec(val);
        if (result) {
            return {
                type : result[1],
                description : result[2]
            };
        } else {
            return {
                type : "Unknown",
                description : val
            };
        }
	};
	var parseParameters = function(params) {
        var paramObj,
            results,
            extractor = /^\s{0,}(\w+)\s{0,}=\s{0,}([^\s][\u0000-\uffff]{0,})/;
        if (params) {
            return params.map(function(param) {
                results = extractor.exec(param);
                if (results) {
                    paramObj = parseType(results[2]);
                    paramObj.name = results[1];
                    return paramObj;
                } else {
                    paramObj = parseType(param);
                    paramObj.name = "Unknown";
                    return paramObj;
                }
            });
        } else {
            return null;
        }
	};
	var prettyParameters = function(parameters) {
		var retval = "(",
			i;
		if (parameters.length > 0) {
			retval += "(<code>" + parameters[0].type + "</code>)<span class=\"parameter\">" + parameters[0].name + "</span>";
		}
		for (i = 1; i < parameters.length; i++) {
			retval += ", (<code>" + parameters[i].type + "</code>)<span class=\"parameter\">" + parameters[i].name + "</span>";
		}
		return retval + ")";
	};
    var combineDicts = function(a, b) {
        if (!a)
            return b;
        for (key in b) {
            if (a.hasKey(key)) {
                a[key] = a[key].concat(b[key]);
            } else {
                a.addObject(b[key], key);
            }
        }
        return a;
    };
    var checkandjoin = function(dict, p) {
        if (dict.hasOwnProperty(p) && Array.isArray(dict[p])) {
            return dict[p].join("<br/>");
        } else {
            return null;
        }
    };
    // }}}

	logger("Rendering file: " + path);
	var file 			= fs.readFileSync(path, "utf8"),
		i = 0,
		lines = [],
		ditems = [],
		render,
		bodycategories = [],
		prebodycategories = [],
        zeroth,
        first,
        starstart = /^\*/;
    

	if (file) {
        var commentss       = null,
            comments        = [],
            commentMatcher  = /\/\*\*?\s{0,}([\u0000-\uffff]{0,}?)\s{0,}\*?\*\//g;
		while (true) {
			commentss = commentMatcher.exec(file);
			if (commentss == null)
				break;
			for (i = 1; i < commentss.length; i++) {
				comments.push(commentss[i]);
			}
		}
		if (comments) {
            var dict            = null,
                selectors       = [],
                filedescription,
                page;
			comments.forEach(function(comment, index, arr) {
				dict = commentParser.parse(comment);
                /*
                for (key in dict) {
					logger("Comment[" + index + "][" + key + "] = '" + JSON.stringify(dict[key]) + "'");
				}
                */
				if (dict.hasOwnProperty("zdocs")) {
					if (/selector/i.test(dict['zdocs'][0])) {
						selectors.push({
                            name : dict.hasKey('name') ? dict['name'][0] : null,
							description : checkandjoin(dict, 'description'),
							discussion : checkandjoin(dict, 'discussion'),
							availability : checkandjoin(dict,'availability'),
                            group : checkandjoin(dict, 'group')
						});
					} else if (/filedescription/i.test(dict['zdocs'][0])) {
                        dict.removeObjectForKey('zdocs');
                        filedescription = combineDicts(filedescription, dict);
					}
				}
			});
            page = artist.createPage(fpath.basename(path) + " File Reference", options);
            if (filedescription) {
                filedescription.enumerate(function(key, object, index, dict) {
                    page.addHeaderItem({
                        title : key,
                        content : object
                    });
                });
            } else if (selectors.length == 0) {
                page.addHeaderItem({
                    title : "Undocumented",
                    content : "This file is currently undocumented, even in code!"
                });
            }
            
            selectors.forEach(function(sel,index, arr) {
                sel.category = "Selectors";
                if (!sel.group) {
                    sel.group = "";
                }
                if (!sel.items) {
                    sel.items = sortedDictionary.create();
                    if (sel.discussion) {
                        sel.items.addObject(sel.discussion, "Discussion");
                    }
                    if (sel.availability) {
                        sel.items.addObject(sel.availability, "Availability");
                    }
                }
                if (!sel.fullname) {
                    sel.fullname = sel.name + '';
                }
                page.addDocumentationBlock(sel);
            });
            return page.render();
		}
	}
	return "";
};
