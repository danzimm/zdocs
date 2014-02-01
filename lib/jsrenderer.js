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
		util.log("[JSRenderer] " + str + "\n");
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
            return [];
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
                functions       = [],
                objects         = [],
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
					if (/function/i.test(dict['zdocs'][0])) {
						functions.push({
                            name : dict.hasKey('name') ? dict['name'][0] : null,
							parameters : parseParameters(dict['parameter']),
							retval : dict.hasKey('retval') ? parseType(dict['retval'][0]) : null,
							description : checkandjoin(dict, 'description'),
							discussion : checkandjoin(dict, 'discussion'),
							availability : checkandjoin(dict,'availability'),
                            group : checkandjoin(dict, 'group')
						});
					} else if (/object/i.test(dict['zdocs'][0])) {
                        objects.push({
                            name : dict['name'][0],
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
            } else if (functions.length == 0 && objects.length == 0) {
                page.addHeaderItem({
                    title : "Undocumented",
                    content : "This file is currently undocumented, even in code!"
                });
            }
            
            functions.forEach(function(func,index, arr) {
                func.category = "Functions";
                if (!func.group) {
                    func.group = "";
                }
                if (!func.items) {
                    func.items = sortedDictionary.create();
                    if (func.parameters && func.parameters.length > 0) {
                        var names = func.parameters.map(function(parameter) {
                            return "<span class=\"parameter\">" + parameter.name + "</span>";
                        });
                        var descs = func.parameters.map(function(parameter) {
                            return "Type: <code>" + parameter.type + "</code><br/>" +  parameter.description
                        });
                        func.items.addObject(dominie.createItem("dl", {
                            terms : names,
                            descriptions : descs,
                            cls : "termdef"
                        }), "Parameters");
                    }
                    if (func.retval) {
                        func.items.addObject("Type: <code>" + func.retval.type + "</code><br/>" + func.retval.description, "Return Value");
                    }
                    if (func.discussion) {
                        func.items.addObject(func.discussion, "Discussion");
                    }
                    if (func.availability) {
                        func.items.addObject(func.availability, "Availability");
                    }
                }
                if (!func.fullname) {
                    func.fullname = "(<code>" + (func.retval ? func.retval.type : "Unknown") + "</code>)" + func.name + prettyParameters(func.parameters);
                }
                page.addDocumentationBlock(func);
            });
            objects.forEach(function(object, index, arr) {
                object.category = "Objects";
                if (!object.group) {
                    object.group = "";
                }
                if (!object.items) {
                    object.items = sortedDictionary.create();
                    if (object.discussion) {
                        object.items.addObject(object.discussion, "Discussion");
                    }
                    if (object.availability) {
                        object.items.addObject(object.availability, "Availability");
                    }
                }
                page.addDocumentationBlock(object);
            });
            return page.render();
		}
		/*
        // {{{
        functions.forEach(function(func, index, arr) {
			logger("Found function:\n\tname: " + func.name + "\n\tparameters: " + JSON.stringify(func.parameters));
		});
        */
        /*
		var headeritems = [];
		for (key in filedescription) {
			headeritems.push(
				dominie.createItem("text", {
					title : key,
					text : filedescription[key].join("<br/>")
				})
			);
		}
		headercategories = [dominie.createCategory("Overview").addItems(headeritems)];
		if (functions.length > 0) {
			var links = [],
			    informationItems = [],
                containerItems;
			functions.forEach(function(func, index, arr) {
                containerItems = [];
				links.push(dominie.createItem("link", {
					href : "#" + func.name,
					text : func.name
				}));
                containerItems.push(dominie.createItem("text", {
                    text : func.description
                }), dominie.createItem("<div>", {
                    text : "(<code>" + (func.retval ? func.retval.type : "Unknown") + "</code>)" + func.name + prettyParameters(func.parameters),
                    attributes : {
                        "class" : "declaration"
                    }
                }));
                if (func.parameters && func.parameters.length > 0) {
                    names = func.parameters.map(function(parameter) {
                        return "<span class=\"parameter\">" + parameter.name + "</span>";
                    });
                    descs = func.parameters.map(function(parameter) {
                        return "Type: <code>" + parameter.type + "</code><br/>" +  parameter.description
                    });
                    containerItems.push(dominie.createItem("<h5>", {
                        text : "Parameters"
                    }), dominie.createItem("dl", {
                        terms : names,
                        descriptions : descs,
                        cls : "termdef"
                    }));
                }
                if (func.retval) {
                    containerItems.push(dominie.createItem("<h5>", {
                        text : "Return Value"
                    }), dominie.createItem("text", {
                        text : "Type: <code>" + func.retval.type + "</code><br/>" + func.retval.description
                    }));
                }
                if (func.discussion) {
                    containerItems.push(dominie.createItem("<h5>", {
                        text : "Discussion"
                    }), dominie.createItem("text", {
                        text : func.discussion
                    }));
                }
                if (func.availability) {
                    containerItems.push(dominie.createItem("<h5>", {
                        text : "Availability"
                    }), dominie.createItem("text", {
                        text : func.availability
                    }));
                }
				informationItems.push(dominie.createItem("container", {
					items : containerItems,
					title : func.name
				}));
			});
			var items = [
				dominie.createItem("unorderedList", {
					title : "",
					sidebarcls : "sidebarlist",
					items : links
				})
			];
			prebodycategories.push(dominie.createCategory("Functions").addItems(items));
			bodycategories.push(dominie.createCategory("Functions", {
				drawSidebar : false
			}).addItems(informationItems));
		}
		if (objects.length > 0) {
			var links = [],
			    informationItems = [],
                containerItems;
			objects.forEach(function(obj, index, arr) {
                containerItems = [];
                //logger("Rendering object: " + JSON.stringify(obj));
				links.push(dominie.createItem("link", {
					href : "#" + obj.name,
					text : obj.name
				}));
                containerItems.push(dominie.createItem("text", {
                    text : obj.description
                }));
                if (obj.discussion) {
                    containerItems.push(dominie.createItem("<h5>", {
                        text : "Discussion"
                    }), dominie.createItem("text", {
                        text : obj.discussion
                    }));
                }
                if (obj.availability) {
                    containerItems.push(dominie.createItem("<h5>", {
                        text : "Availability"
                    }), dominie.createItem("text", {
                        text : obj.availability
                    }));
                }
				informationItems.push(dominie.createItem("container", {
					items : containerItems,
					title : obj.name
				}));
			});
			var items = [
				dominie.createItem("unorderedList", {
					title : "",
					sidebarcls : "sidebarlist",
					items : links
				})
			];
			prebodycategories.push(dominie.createCategory("Objects").addItems(items));
			bodycategories.push(dominie.createCategory("Objects", {
				drawSidebar : false
			}).addItems(informationItems));
		}
		render = jade.renderFile(__dirname + '/views/generalrenderer.jade', {
			"doccenter" : options.doccenter ? options.doccenter : "Where am I?",
			"stylesheet" : options.stylesheet,
			"pagetitle" : path.lastPathComponent() + " File Reference",
			"categories" : headercategories.concat(prebodycategories.concat(bodycategories))
		});
		return render;
        // }}}
        */
	}
	return "";
};
