var fs 			        = require('fs'),
	zutils		        = require('./zutils.js'),
    dominie             = zutils.dominie,
    commentParser       = zutils.commentParser,
    artist              = zutils.artist,
    sortedDictionary    = zutils.sortedDictionary,
	jade		        = require('jade'),
    util                = require('util'),
    fpath               = require('path');

module.exports = function(path, options) {
    // helper funcs
    // {{{
	var logger = function(str) {
		util.log("[CHDRRenderer] " + str + "\n");
	};
	var prettyParameters = function(parameters) {
		var retval = "(",
			i;
		if (parameters.length > 0) {
			retval += "<code>" + (parameters[0].type ? (parameters[0].type.slice(-1) == "*" ? parameters[0].type : parameters[0].type + " ") : "") + "</code><span class=\"parameter\">" + parameters[0].name + "</span>";
		}
		for (i = 1; i < parameters.length; i++) {
			retval += ", <code>" + (parameters[i].type ? (parameters[i].type.slice(-1) == "*" ? parameters[i].type : parameters[i].type + " ") : "") + "</code><span class=\"parameter\">" + parameters[i].name + "</span>";
		}
		return retval + ")";
	};
    var parseSelector = function(sel) {
        var reger = /(\w[\w\d]{0,})\s{0,}(?::\s{0,}\(\s{0,}(\w[\w\d]{0,}[ *]{0,})\s{0,}\)\s{0,}(\w[\w\d]{0,}))?/g,
            stuff,
            retval = {
                selector : "",
                args : []
            },
            i, nparts;
        while (true) {
            stuff = reger.exec(sel);
            if (stuff == null)
                break;
            if (stuff[2] == null && stuff[3] == null) {
                retval.selector = stuff[1];
                retval.args = [];
                break;
            }
            retval.selector += stuff[1] + ":";
            retval.args.push({
                type : stuff[2],
                name : stuff[3]
            });
        }
        return retval;
    };
    var prettySelector = function(meth) {
        var sel = meth.name, tmp;
        var index = 0,
            colons = 0;
        while (index < sel.length) {
            if (sel[index] == ':') {
                tmp = '(<code>'+meth.parameters[colons].type+'</code>)<span class="parameter">'+meth.parameters[colons].name+'</span> ';
                sel = sel.slice(0,index+1) + tmp + sel.slice(index+1);
                index += 1 + tmp.length;
                colons++;
            } else {
                index++;
            }
        }
        return sel;
    };
    var processComment = function(comment) {
        var dict = commentParser.parse(comment), 
            comDict = sortedDictionary.create();
        if (dict.hasKey('zdocs') && /filedescription/.test(dict['zdocs'][0])) {
    //        dict.removeObjectForKey('zdocs');
            comDict.merge(dict);
        } else {
            comDict.addObject(dict.hasKey('zdocs') ? dict['zdocs'][0] : null, "zdocs");
            comDict.addObject(dict.hasKey("name") ? dict['name'][0] : null, "name");
            comDict.addObject(dict.hasKey("cls") ? dict["cls"][0] : (dict.hasKey("class") ? dict["class"] : null), "cls");
            comDict.addObject(dict.hasKey("supercls") ? dict["supercls"][0] : (dict.hasKey("superclass") ? dict["superclass"] : null), "cls");
            comDict.addObject(dict.hasKey("type") ? dict["type"][0] : null, "type");
            comDict.addObject(commentParser.checkandjoin(dict, "description"), "description");
            comDict.addObject(commentParser.checkandjoin(dict, "discussion"), "discussion");
            comDict.addObject(commentParser.checkandjoin(dict, "availability"), "availability");
            comDict.addObject(commentParser.checkandjoin(dict, "group"), "group");
            comDict.addObject(commentParser.parseAttributes(dict['attributes']), "attributes");
            comDict.addObject(dict.hasKey('clsmeth') ? dict['clsmeth'][0] : null, "clsmeth");
            comDict.addObject(dict.hasKey('retval') ? commentParser.parseType(dict['retval'][0]) : null, "retval");
            comDict.addObject(commentParser.parseParameters(dict['parameter']), "parameters");
        }
        return comDict;
    };
    // }}}

	logger("Rendering file: " + path);
	var file 			= fs.readFileSync(path, "utf8");

	if (file) {
        var classes = [], functions = [], globals = [], filedescription = sortedDictionary.create(), title = null, data;
        // blocks
        /// {{{
        var clsCodeBlocks = {
            "@property\\s{0,}\\(([\\w\\s,]*)\\)\\s{0,}(\\w[\\w\\d]{0,})(\\s+|\\s{0,}\\*+)(\\w[\\w\\d]{0,});" : function(result, update) {
                var attr, t,
                    dict = sortedDictionary.create();
                t = result.splice(0,1)[0];
                attr = t.split(",").map(function(a) {
                    return a.trim();
                });
                dict.addObject(attr, "attributes");
                t = result.splice(0,2);
                dict.addObject(t[0] + t[1].trim(), "type");
                dict.addObject(result.splice(0,1)[0], "name");
                dict.addObject("property", "zdocs");
                update(result);
                return dict;
            },
            "([-+])\\s{0,}\\(\\s{0,}(\\w[\\w\\d]{0,}\\s{0,}\\*{0,})\\s{0,}\\)\\s{0,}(\\w[\\w\\d]{0,}\\s{0,}(?::\\(\\w[\\w\\d]{0,}[\\s*]{0,}\\)\\w[\\w\\d]{0,})?(?:\\s{0,}(?:\\w[\\w\\d]{0,})?:\\(\\w[\\w\\d]{0,}[\\s*]{0,}\\)\\w[\\w\\d]{0,}){0,})\\s{0,};" : function(result, update) {

                var clsmeth = result.splice(0,1)[0] == '+' ? 'true' : 'false',
                    retval = {
                        type : result.splice(0,1)[0]
                    },
                    tmp = parseSelector(result.splice(0,1)[0]),
                    selector = tmp.selector,
                    args = tmp.args,
                    dict = sortedDictionary.create();
                dict.addObject(selector, "name");
                dict.addObject(clsmeth, "clsmeth");
                dict.addObject(retval, "retval");
                dict.addObject(args, "parameters");
                dict.addObject("method", "zdocs");
                update(result);
                return dict;
            }
        };
        var commentBlocks = {
            "\\/\\*((?:\\*(?!\\/)|[^*])*?)\\*\\/" : function(result, update) {
                var comment = result.splice(0,1)[0],
                    comDict, dict;
                update(result);
                comment = comment.replace(/(^|\n)[ \t]{0,}\*[ \t]?/g,"$1");
                return processComment(comment);
            },
            "((?://[\\S \\t]*\\s{0,})+)" : function(result, update) {
                var comment = result.splice(0,1)[0],
                    comDict;
                update(result);
                comment = comment.replace(/(^|\n)[ \t]{0,}\/\/[ \t]?/g,"$1");
                return processComment(comment);
            }
        };
        var codeBlocks = {
            "@interface[\\s]+([\\w][\\w\\d]{0,})[\\s]{0,}:[\\s]{0,}([\\w][\\w\\d]{0,})[\\s]{0,}([\\s\\S]*?)@end" : function(result, update) {
                var dict = sortedDictionary.create(),
                    body, data, props = [], meths = [];
                dict.addObject(result.splice(0,1)[0],"cls");
                dict.addObject(result.splice(0,1)[0],"supercls");
                body = result.splice(0,1)[0];
                data = commentParser.extract(body, commentBlocks, clsCodeBlocks);
                data.couples.forEach(function(elm) {
                    if (elm['zdocs'] == 'property') {
                        props.push(elm);
                    } else if (elm['zdocs'] == 'method') {
                        meths.push(elm);
                    }
                });
                dict.addObject(data.comments, "comments");
                dict.addObject(data.text, "leftover");
                dict.addObject(props, "properties");
                dict.addObject(meths, "methods");
                dict.addObject("class", "zdocs");
                update(result);
                return dict;
            },
            "(\\w[\\w\\d\\s]*?)([\\s*]+)(\\w[\\w\\d]*)\\(([^)]*?)\\)\s{0,}(?:;|\\{)" : function(result, update) {
                var paren = result.splice(-1)[0],
                    doer = /(\w[\w\d]*)([\s*]+)(\w[\w\d]*)/,
                    dict = sortedDictionary.create(),
                    t;
                sepers = paren.split(",").map(function(a) {
                    var b = doer.exec(a.trim());
                    return {
                       type : (b[1] + b[2]).trim(),
                       name : b[3]
                    };
                });
                t = result.splice(0,2);
                dict.addObject({
                    type : t[0] + t[1].trim()
                }, "retval");
                dict.addObject(result.splice(0,1)[0], "name");
                dict.addObject(sepers, "parameters");
                dict.addObject("function", "zdocs");
                update(result);
                return dict;
            },
            "(\\w[\\w\\d\\s]*?)([\\s*]+)(\\w[\\w\\d]*)\\s{0,}(?:;|=)" : function(result, update) {
                var dict = sortedDictionary.create(),
                    t = result.splice(0,2);
                dict.addObject(t[0] + t[1].trim(), "type");
                dict.addObject(result.splice(0,1)[0], "name");
                dict.addObject("global", "zdocs");
                update(result);
                return dict;
            }
        };
        // }}}
        data = commentParser.extract(file, commentBlocks, codeBlocks);
        data.comments.forEach(function(comment) {
            if (comment.hasKey('zdocs') && comment['zdocs'][0] === 'filedescription') {
                comment.removeObjectForKey('zdocs');
                filedescription = comment.merge(filedescription);
            }
        });
        data.couples.forEach(function(couple) {
            if (couple.hasKey('zdocs')) {
                if (couple['zdocs'] === 'class') {
                    classes.push(couple);
                } else if (couple['zdocs'] === 'function') {
                    functions.push(couple);
                } else if (couple['zdocs'] === 'global') {
                    globals.push(couple);
                }
            }
        });
        if (filedescription.hasKey("title")) {
            title = filedescription.title[0].replace(/<\/?p>/g, "");
            filedescription.removeObjectForKey("title");
        } else {
            title = fpath.basename(path) + " File Reference";
        }
        page = artist.createPage(title, options);
        if (filedescription) {
            filedescription.enumerate(function(key, object, index, dict) {
                page.addHeaderItem({
                    title : key,
                    content : object
                });
            });
        } else if (classes.length == 0 && functions.length == 0 && globals.length == 0) {
            page.addHeaderItem({
                title : "Undocumented",
                content : "This file is currently undocumented, even in code!"
            });
        }
        classes.forEach(function(cls, ind) {
            cls.methods.forEach(function(meth, i) {
                meth.addObject(cls.cls, "category");
                if (!meth.group) {
                    meth.addObject("Methods", "group");
                }
                if (!meth.items) {
                    meth.addObject(sortedDictionary.create(), "items");
                    if (meth.parameters && meth.parameters.length > 0) {
                        var names = meth.parameters.map(function(parameter) {
                            return "<span class=\"parameter\">" + parameter.name + "</span>";
                        });
                        var descs = meth.parameters.map(function(parameter) {
                            return "Type: <code>" + parameter.type + "</code>" +  (parameter.description ? "<br/>" + parameter.description : "");
                        });
                        meth.items.addObject(dominie.createItem("dl", {
                            terms : names,
                            descriptions : descs,
                            cls : "termdef"
                        }), "Parameters");
                    }
                    if (meth.retval) {
                        meth.items.addObject("Type: <code>" + meth.retval.type + "</code>" + (meth.retval.description ? "<br/>" + meth.retval.description : ""), "Return Value");
                    }
                    if (meth.discussion) {
                        meth.items.addObject(meth.discussion, "Discussion");
                    }
                    if (meth.availability) {
                        meth.items.addObject(meth.availability, "Availability");
                    }
                }
                if (!meth.fullname) {
                    meth.addObject((meth.clsmeth == 'true' ? '+' : '-') + " (<code>" + (meth.retval ? meth.retval.type : "Unknown") + "</code>)" + prettySelector(meth), "fullname");
                }
                page.addDocumentationBlock(meth);
            });
            cls.properties.forEach(function(prop, i) {
                prop.addObject(cls.cls, "category");
                if (!prop.group) {
                    prop.addObject("Properties", "group");
                }
                if (!prop.items) {
                    prop.addObject(sortedDictionary.create(), "items");
                    if (prop.type) {
                        prop.items.addObject("<code>" + prop.type + "</code>", "Type");
                    }
                    if (prop.attributes) {
                        prop.items.addObject("<code>" + prop.attributes.join(", ") + "</code>", "Attributes");
                    }
                    if (prop.discussion) {
                        prop.items.addObject(prop.discussion, "Discussion");
                    }
                    if (prop.availability) {
                        prop.items.addObject(prop.availability, "Availability");
                    }
                }
                if (!prop.fullname) {
                    prop.addObject("@property " + (prop.attributes ? "(" + prop.attributes.join(", ") + ") " : "") + "<code>" + (prop.type ? (prop.type.slice(-1) == "*" ? prop.type : prop.type + " ") : "TYPE ") + "</code><span class=\"parameter\">" + (prop.name ? prop.name : "VARNAME") + "</span>", "fullname");
                }
                page.addDocumentationBlock(prop);
            });
        });
        functions.forEach(function(func,index, arr) {
            func.addObject("Functions", "category");
            if (!func.group) {
                func.addObject("", "group");
            }
            if (!func.items) {
                func.addObject(sortedDictionary.create(), "items");
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
                    func.items.addObject("Type: <code>" + func.retval.type + "</code>" + (func.retval.description ? "<br/>" + func.retval.description : ""), "Return Value");
                }
                if (func.discussion) {
                    func.items.addObject(func.discussion, "Discussion");
                }
                if (func.availability) {
                    func.items.addObject(func.availability, "Availability");
                }
            }
            if (!func.fullname) {
                func.addObject("<code>" + (func.retval ? func.retval.type + " " : "") + "</code>" + func.name + prettyParameters(func.parameters), "fullname");
            }
            page.addDocumentationBlock(func);
        });
        globals.forEach(function(glob,index, arr) {
            glob.addObject("Globals", "category");
            if (!glob.group) {
                glob.addObject("", "group");
            }
            if (!glob.items) {
                glob.addObject(sortedDictionary.create(), "items");
                if (glob.type) {
                    glob.items.addObject("<code>" + glob.type + "</code>", "Type");
                }
                if (glob.discussion) {
                    glob.items.addObject(glob.discussion, "Discussion");
                }
                if (glob.availability) {
                    glob.items.addObject(func.availability, "Availability");
                }
            }
            if (!glob.fullname) {
                glob.addObject("<code>" + (glob.type ? glob.type + " " : "") + "</code>" + glob.name, "fullname");
            }
            page.addDocumentationBlock(glob);
        });
        return page.render();
	}
	return "";
};
