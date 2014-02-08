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
							parameters : commentParser.parseParameters(dict['parameter']),
							retval : dict.hasKey('retval') ? commentParser.parseType(dict['retval'][0]) : null,
							description : commentParser.checkandjoin(dict, 'description'),
							discussion : commentParser.checkandjoin(dict, 'discussion'),
							availability : commentParser.checkandjoin(dict,'availability'),
                            group : commentParser.checkandjoin(dict, 'group')
						});
					} else if (/object/i.test(dict['zdocs'][0])) {
                        objects.push({
                            name : dict['name'][0],
							description : commentParser.checkandjoin(dict, 'description'),
							discussion : commentParser.checkandjoin(dict, 'discussion'),
							availability : commentParser.checkandjoin(dict,'availability'),
                            group : commentParser.checkandjoin(dict, 'group')
                        });
					} else if (/filedescription/i.test(dict['zdocs'][0])) {
                        dict.removeObjectForKey('zdocs');
                        filedescription = dict.merge(filedescription, function(path, obj1, obj2) {
                            if (obj1 === obj2)
                                return obj1;
                            if (Array.isArray(obj1) && Array.isArray(obj2)) {
                                return obj1.concat(obj2);
                            }
                            return obj1 + obj2;
                        });
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
	}
	return "";
};
