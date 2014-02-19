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
	var file = fs.readFileSync(path, "utf8"),
		i = 0;

	if (file) {
        var functions = [], objects = [], filedescription = sortedDictionary.create(), title = null, data;
    // blocks
        // {{{
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
            "(?:var\\s+)?(\\w[\\w\\d.]{0,})\\s{0,}(?:=|:)\\s{0,}function\\s{0,}\\(([^)]{0,})\\)" : function(result, update) {
                var name = result.splice(0,1)[0],
                    param = result.splice(0,1)[0],
                    dict = sortedDictionary.create();
                if (param.length > 0) {
                    param = param.split(",").map(function(a) {
                        return {
                            name : a.trim()
                        };
                    });
                } else {
                    param = [];
                }
                dict.addObject(name,"name");
                dict.addObject(param,"parameters");
                dict.addObject("function", "zdocs");
                update(result);
                return dict;
            },
            "(?:var\\s+)?(\\w[\\w\\d.]{0,})\\s{0,}(?:=|:)\\s{0,}new\\s+(\\w[\\w\\d]{0,})" : function(result, update) {
                var name = result.splice(0,1)[0],
                    type = result.splice(0,1)[0],
                    dict = sortedDictionary.create();
                dict.addObject(name,"name");
                dict.addObject(type,"type");
                dict.addObject("object","zdocs");
                update(result);
                return dict;
            },
            "(?:var\\s+)?(\\w[\\w\\d.]{0,})\\s{0,}(?:=|:)\\s{0,}(?:\\{|\\(\\s{0,}function)" : function(result, update) {
                var name = result.splice(0,1)[0],
                    dict = sortedDictionary.create();
                dict.addObject(name,"name");
                dict.addObject("object","zdocs");
                update(result);
                return dict;
            }
        };
        // }}}
        data = commentParser.extract(file, commentBlocks, codeBlocks, function(a) {
            a.enumerate(function(key,val) {
                if (key === 'name') {
                    a[key] = val.replace(/, .*$/,"");
                }
            });
            return a;
        });
        data.comments.forEach(function(comment) {
            if (comment.hasKey('zdocs') && comment['zdocs'][0] === 'filedescription') {
                comment.removeObjectForKey('zdocs');
                filedescription = comment.merge(filedescription);
            }
        });
        data.couples.forEach(function(couple) {
            if (couple.hasKey('zdocs')) {
                if (couple['zdocs'] === 'object') {
                    objects.push(couple);
                } else if (couple['zdocs'] === 'function') {
                    functions.push(couple);
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
        if (filedescription.keysLen() > 0) {
            filedescription.enumerate(function(key, object, index, dict) {
                page.addHeaderItem({
                    title : key,
                    content : object.join("<br/>")
                });
            });
        } else if (functions.length == 0 && objects.length == 0) {
            logger("Undoced!");
            page.addHeaderItem({
                title : "Undocumented",
                content : "This file is currently undocumented, even in code!"
            });
        }
        functions.forEach(function(func,index, arr) {
            func.addObject("Functions", "category");
            if (!func.group) {
                func.addObject("","group");
            }
            if (!func.items) {
                func.addObject(sortedDictionary.create(), "items");
                if (func.parameters && func.parameters.length > 0) {
                    var names = func.parameters.map(function(parameter) {
                        return "<span class=\"parameter\">" + parameter.name + "</span>";
                    });
                    var descs = func.parameters.map(function(parameter) {
                        return "Type: <code>" + parameter.type + "</code>" +  (parameter.description ? "<br/>" + parameter.description : "");
                    });
                    func.items.addObject(dominie.createItem("dl", {
                        terms : names,
                        descriptions : descs,
                        cls : "termdef"
                    }), "Parameters");
                }
                if (func.retval) {
                    func.items.addObject("Type: <code>" + func.retval.type + "</code>" + (func.retval.description ? "<br/>" + func.retval.description : "", "Return Value"));
                }
                if (func.discussion) {
                    func.items.addObject(func.discussion, "Discussion");
                }
                if (func.availability) {
                    func.items.addObject(func.availability, "Availability");
                }
            }
            if (!func.fullname) {
                func.addObject("(<code>" + (func.retval ? func.retval.type : "Unknown") + "</code>)" + func.name + prettyParameters(func.parameters), "fullname");
            }
            page.addDocumentationBlock(func);
        });
        objects.forEach(function(object, index, arr) {
            object.addObject("Objects", "category");
            if (!object.group) {
                object.addObject("","group");
            }
            if (!object.items) {
                object.addObject(sortedDictionary.create(), "items");
                if (object.discussion) {
                    object.items.addObject(object.discussion, "Discussion");
                }
                if (object.availability) {
                    object.items.addObject(object.availability, "Availability");
                }
            }
            page.addDocumentationBlock(object);
        });
        page.appendScript({
            inner : "hljs.configure({ languages : ['javascript', 'js'] });"
        });
        return page.render();
	}
	return "";
};
