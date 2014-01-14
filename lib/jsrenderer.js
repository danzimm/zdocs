/*
	zdocs : filedescription
	 : ``jsrenderer.js`` is the javascript documentation renderer for zdocs. It uses zdocs' module api and is automatically (internal to zdocs) added as the js renderer. At the moment there is no way to override this renderer, but in the future there will be.
	Styling : You can style this page with the stylesheet you gave when creating the corresponding documentation center.
*/

var fs 			= require('fs'),
	zutils		= require('./zutils'),
	jade		= require('jade'),
	markdown	= require('markdown').markdown,
    util        = require('util');

String.prototype.unquote = function() {
	if ((this[0] === '"' && this[this.length-1] === '"') || (this[0] === '\'' && this[this.length-1] === '\'')) {
		return this.slice(1, this.length-1);
	}
	return this;
};
String.prototype.lastPathComponent = function() {
	var a = this.split('/');
	if (a && a.length > 0)
		return a.pop();
	return "";
};

/*
	zdocs : function
	name : module.exports
	parameter : path={String} The file path to the file that you want documented.
    parameter : options={Object} An object with the optional keys of: 'stylesheet' to specify the relative path to the stylesheet to use (with regards to the website's root), doccenter to specify the name of the documentation center
	retval : {String} A 'String' with html documentation of the given 'file'
	description : Parses a javascript file and returns an HTML string of documentation for that file.
	discussion : This assumes the file you are passing to it in 'path' is a javascript file. Ensure that 'path'. It also expects 'path' to be a relative path to the current directory, or a full path.
	availability : Available in zdocs 0.1 and later
*/

module.exports = function(path, options) {
	var logger = function(str) {
		util.log("[JSRenderer] " + str + "\n");
	};
	var nicify = function(rets) {
		var result = [],
			ret;
		rets.forEach(function(val, index, arr) {
			ret = val.replace(/([\n\r]+)\t/g, "$1",'g');
			ret = ret.replace(/\n$/, "");
			result.push(ret);
		});
		return result;
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

	logger("Rendering file: " + path);
	var file 			= fs.readFileSync(path, "utf8"),
		commentmatcher	= /\/\*\*?\s{0,}([\u0000-\uffff]{0,}?)\s{0,}\*?\*\//g,
		comments = [],
		commentss = [],
		i = 0,
		lines = [],
		ditems = [],
		dict,
		functions = [],
		objects = [],
		render,
		bodycategories = [],
		prebodycategories = [],
		filedescription = {},
        zeroth,
        first,
        starstart = /^\*/,
        checkandjoin;
    
    checkandjoin = function(dict, p) {
        if (dict.hasOwnProperty(p) && Array.isArray(dict[p])) {
            return dict[p].join("<br/>");
        } else {
            return null;
        }
    }

	if (file) {
		while (true) {
			commentss = commentmatcher.exec(file);
			if (commentss == null)
				break;
			for (i = 1; i < commentss.length; i++) {
				comments.push(commentss[i]);
			}
		}
		if (comments) {
			comments = nicify(comments);
			comments.forEach(function(comment, index, arr) {
				dict = {};
				lines = comment.split('\n');
                lines = unescapeLines(lines);
				lines.forEach(function(line, i, arr) {
					line = line.trim();
					ditems = line.split(':');
					if (ditems.length > 1) {
                        zeroth = ditems[0].trim();
                        if (starstart.test(zeroth)) {
                            zeroth = zeroth.replace(starstart, "").trim();
                        }
                        first = markdown.toHTML(concatStrings(ditems, 1, ':').trim()).replace(/<p>/, "").replace(/<\/p>/, "");
                        if (dict.hasOwnProperty(zeroth)) {
                            dict[zeroth].push(first);
                        } else {
                            dict[zeroth] = [first];
                        }
					}
				});
				/*
                for (key in dict) {
					logger("Comment[" + index + "][" + key + "] = '" + JSON.stringify(dict[key]) + "'");
				}
                */
				if (dict.hasOwnProperty("zdocs")) {
					if (dict['zdocs'][0].toLowerCase() === 'function') {
						functions.push({
                            name : dict.hasOwnProperty('name') ? dict['name'][0] : null,
							parameters : parseParameters(dict['parameter']),
							retval : dict.hasOwnProperty('retval') ? parseType(dict['retval'][0]) : null,
							description : checkandjoin(dict, 'description'),
							discussion : checkandjoin(dict, 'discussion'),
							availability : checkandjoin(dict,'availability')
						});
					} else if (dict['zdocs'][0].toLowerCase() === 'object') {
                        objects.push({
                            name : dict['name'][0],
							description : checkandjoin(dict, 'description'),
							discussion : checkandjoin(dict, 'discussion'),
							availability : checkandjoin(dict,'availability')
                        });
					} else if (dict['zdocs'][0].toLowerCase() === 'filedescription') {
						delete dict['zdocs'];
						filedescription = dict;
					}
				}
			});
		}
		/*
        functions.forEach(function(func, index, arr) {
			logger("Found function:\n\tname: " + func.name + "\n\tparameters: " + JSON.stringify(func.parameters));
		});
        */
		var headeritems = [];
		for (key in filedescription) {
			headeritems.push(
				zutils.createItem("paragraph", {
					title : key,
					text : filedescription[key].join("<br/>")
				})
			);
		}
		headercategories = [zutils.createCategory("Overview").addItems(headeritems)];
		if (functions.length > 0) {
			var links = [],
			    informationItems = [],
                containerItems;
			functions.forEach(function(func, index, arr) {
                containerItems = [];
				links.push(zutils.createItem("link", {
					href : "#" + func.name,
					text : func.name
				}));
                containerItems.push(zutils.createItem("paragraph", {
                    text : func.description
                }), zutils.createItem("<div>", {
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
                    containerItems.push(zutils.createItem("<h5>", {
                        text : "Parameters"
                    }), zutils.createItem("dl", {
                        terms : names,
                        descriptions : descs,
                        cls : "termdef"
                    }));
                }
                if (func.retval) {
                    containerItems.push(zutils.createItem("<h5>", {
                        text : "Return Value"
                    }), zutils.createItem("text", {
                        text : "Type: <code>" + func.retval.type + "</code><br/>" + func.retval.description
                    }));
                }
                if (func.discussion) {
                    containerItems.push(zutils.createItem("<h5>", {
                        text : "Discussion"
                    }), zutils.createItem("paragraph", {
                        text : func.discussion
                    }));
                }
                if (func.availability) {
                    containerItems.push(zutils.createItem("<h5>", {
                        text : "Availability"
                    }), zutils.createItem("text", {
                        text : func.availability
                    }));
                }
				informationItems.push(zutils.createItem("container", {
					items : containerItems,
					title : func.name
				}));
			});
			var items = [
				zutils.createItem("unorderedList", {
					title : "",
					sidebarcls : "sidebarlist",
					items : links
				})
			];
			prebodycategories.push(zutils.createCategory("Functions").addItems(items));
			bodycategories.push(zutils.createCategory("Functions", {
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
				links.push(zutils.createItem("link", {
					href : "#" + obj.name,
					text : obj.name
				}));
                containerItems.push(zutils.createItem("paragraph", {
                    text : obj.description
                }));
                if (obj.discussion) {
                    containerItems.push(zutils.createItem("<h5>", {
                        text : "Discussion"
                    }), zutils.createItem("paragraph", {
                        text : obj.discussion
                    }));
                }
                if (obj.availability) {
                    containerItems.push(zutils.createItem("<h5>", {
                        text : "Availability"
                    }), zutils.createItem("text", {
                        text : obj.availability
                    }));
                }
				informationItems.push(zutils.createItem("container", {
					items : containerItems,
					title : obj.name
				}));
			});
			var items = [
				zutils.createItem("unorderedList", {
					title : "",
					sidebarcls : "sidebarlist",
					items : links
				})
			];
			prebodycategories.push(zutils.createCategory("Objects").addItems(items));
			bodycategories.push(zutils.createCategory("Objects", {
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
	}
	return "";
};
