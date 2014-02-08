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
		util.log("[CHDRRenderer] " + str + "\n");
	};
    var parseAttributes = function(attrs) {
        var retval = [],
            tmp;
        if (attrs) {
            attrs.forEach(function(attr, i, a) {
                tmp = attr.split(",");
                tmp = tmp.map(function(elm) {
                    return elm.trim();
                });
                retval = retval.concat(tmp);
            });
        } else {
            return [];
        }
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
    var search = function(arr, constraints) {
        if (!constraints.isSorted) {
            constraints = sortedDictionary.create(constraints);
        }
        function checkConstraints(dict) {
            var good = true;
            constraints.enumerate(function(key, val) {
                if (!dict.hasKey(key) || dict[key] !== val) {
                    good = false;
                }
            });
            return good;
        };
        var indy = -1;
        arr.forEach(function(elm, ind) {
            if (elm.isSorted) {
                if (checkConstraints(elm)) {
                    indy = ind;
                }
            } else {
                var tmpelm = sortedDictionary.create(elm);
                if (checkConstraints(tmpelm)) {
                    indy = ind;
                }
            }
        });
        return indy;
    };
    var searchAndMerge = function(arr, key, data) {
        var indy = search(arr, { key : data[key] });
        if (indy != -1) {
            arr[indy].merge(data, function(path, obj1, obj2) {
                if (obj1 === obj2) {
                    return obj1;
                }
                if (Array.isArray(obj1) && Array.isArray(obj2)) {
                    return obj1.concat(obj2);
                }
                return obj1 + ', ' + obj2;
            });
        } else {
            arr.push(sortedDictionary.create(data));
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
        var classes = [], commentss = null, comments = null, functions = [], globals = [],
            classextractor = /@interface[\s]+([\w][\w\d]{0,})[\s]{0,}:[\s]{0,}([\w][\w\d]{0,})[\s]{0,}([\s\S]*?)@end/g, commentMatcher = /\/\*\*?\s{0,}([\u0000-\uffff]{0,}?)\s{0,}\*?\*\//g,
            propertyextractor = /@property[\s]{0,}\((?:\s{0,}(\w+)\s{0,}(?:,)?)+\)\s{0,}(\w[\w\d]{0,})(\s+|\s{0,}\*+)(\w[\w\d]{0,});/g, props,
            methextractor = /([-+])\s{0,}\(\s{0,}(\w[\w\d]{0,}\s{0,}\*{0,})\s{0,}\)\s{0,}(\w[\w\d]{0,}\s{0,}(?::\(\w[\w\d]{0,}[\s*]{0,}\)\w[\w\d]{0,})?(?:\s{0,}(?:\w[\w\d]{0,})?:\(\w[\w\d]{0,}[\s*]{0,}\)\w[\w\d]{0,}){0,})\s{0,};/g, meths,
            matches = classextractor.exec(file),
            data = file, dict = null, filedescription = null;
        if (matches && matches.length > 1) {
            var ncls = (matches.length - 1) / 3,
                i, j, clsname, superclsname, innards;
            data = data.replace(classextractor, "");
            for (i = 0; i < ncls; i++) {
                var methods     = [],
                    properties  = [],
                    ivars       = [];
                comments = [];
                clsname = matches[1+3*i];
                superclsname = matches[1+3*i+1];
                innards = matches[1+3*i+2];
                while (true) {
                    props = propertyextractor.exec(innards);
                    if (props == null)
                        break;
                    var attr    = props[1] ? props[1].split(",").map(function(elm){return elm.trim()}) : "",
                        type    = props[2],
                        pnter   = props[3].trim(),
                        nam     = props[4];
                    if (pnter.length > 0) {
                        pnter = " " + pnter;
                    }
                    properties.push({
                        name : nam,
                        cls : clsname,
                        supercls : superclsname,
                        type : type + pnter,
                        attributes : attr
                    });
                }
                while (true) {
                    meths = methextractor.exec(innards);
                    if (meths == null)
                        break;
                    var clsmeth = meths[1] == '+' ? 'true' : 'false',
                        retval = {
                            type : meths[2]
                        },
                        tmp = parseSelector(meths[3]),
                        selector = tmp.selector,
                        args = tmp.args;
                    
                    methods.push({
                        name : selector,
                        cls : clsname,
                        supercls : superclsname,
                        clsmeth : clsmeth,
                        retval : retval,
                        parameters : args
                    });
                }
                
                while (true) {
                    commentss = commentMatcher.exec(innards);
                    if (commentss == null)
                        break;
                    for (j = 1; j < commentss.length; j++) {
                        comments.push(commentss[i]);
                    }
                }
                comments.forEach(function(comment, index, a) {
                    dict = commentParser.parse(comment);
                    if (dict.hasKey('zdocs')) {
                        if (/ivar/i.test(dict['zdocs'][0])) {
                            searchAndMerge(ivars, 'name', {
                                    name : dict.hasKey('name') ? dict['name'][0] : null,
                                    cls : clsname,
                                    supercls : superclsname,
                                    type : dict.hasKey('type') ? dict['type'][0] : null,
                                    description : commentParser.checkandjoin(dict, 'description'),
                                    discussion : commentParser.checkandjoin(dict, 'discussion'),
                                    availability : commentParser.checkandjoin(dict,'availability'),
                                    group : commentParser.checkandjoin(dict, 'group')
                            });
                        } else if (/property/i.test(dict['zdocs'][0])) {
                            searchAndMerge(properties, 'name', {
                                name : dict.hasKey('name') ? dict['name'][0] : null,
                                cls : clsname,
                                supercls : superclsname,
                                type : dict.hasKey('type') ? dict['type'][0] : null,
                                attributes : parseAttributes(dict['attributes']),
                                description : commentParser.checkandjoin(dict, 'description'),
                                discussion : commentParser.checkandjoin(dict, 'discussion'),
                                availability : commentParser.checkandjoin(dict,'availability'),
                                group : commentParser.checkandjoin(dict, 'group')
                            });
                        } else if (/method/i.test(dict['zdocs'][0])) {
                            searchAndMerge(methods, 'name', {
                                name : dict.hasKey('name') ? dict['name'][0] : null,
                                cls : clsname,
                                supercls : superclsname,
                                clsmeth : dict.hasKey('clsmeth') ? dict['clsmeth'][0] : null,
                                retval : dict.hasKey('retval') ? commentParser.parseType(dict['retval'][0]) : null,
                                parameters : commentParser.parseParameters(dict['parameters']),
                                description : commentParser.checkandjoin(dict, 'description'),
                                discussion : commentParser.checkandjoin(dict, 'discussion'),
                                availability : commentParser.checkandjoin(dict,'availability'),
                                group : checkandjoin(dict, 'group')
                            });
                        } else if (/function/i.test(dict['zdocs'][0])) {
                            functions.push(sortedDictionary.create({
                                name : dict.hasKey('name') ? dict['name'][0] : null,
                                parameters : parseParameters(dict['parameter']),
                                retval : dict.hasKey('retval') ? parseType(dict['retval'][0]) : null,
                                description : checkandjoin(dict, 'description'),
                                discussion : checkandjoin(dict, 'discussion'),
                                availability : checkandjoin(dict,'availability'),
                                group : checkandjoin(dict, 'group')
                            }));
                        } else if (/global/i.test(dict['zdocs'][0])) {
                            globals.push(sortedDictionary.create({
                                name : dict['name'][0],
                                type : dict.hasKey('type') ? dict['type'][0] : null,
                                description : checkandjoin(dict, 'description'),
                                discussion : checkandjoin(dict, 'discussion'),
                                availability : checkandjoin(dict,'availability'),
                                group : checkandjoin(dict, 'group')
                            }));
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
                classes.push({
                    cls : clsname,
                    supercls : superclsname,
                    ivars : ivars,
                    properties : properties,
                    methods : methods
                });
            }
        }
        commentss = null, comments = [];
        while (true) {
            commentss = commentMatcher.exec(data);
            if (commentss == null)
                break;
            for (i = 1; i < commentss.length; i++) {
                comments.push(commentss[i]);
            }
        }
        dict = null;
        comments.forEach(function(comment, index, arr) {
            dict = commentParser.parse(comment);
            if (dict.hasKey('zdocs')) {
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
                } else if (/global/i.test(dict['zdocs'][0])) {
                    globals.push({
                        name : dict['name'][0],
                        type : dict.hasKey('type') ? dict['type'][0] : null,
                        description : checkandjoin(dict, 'description'),
                        discussion : checkandjoin(dict, 'discussion'),
                        availability : checkandjoin(dict,'availability'),
                        group : checkandjoin(dict, 'group')
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
        var title = null;
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
                meth.category = cls.cls;
                if (!meth.group) {
                    meth.group = "Methods";
                }
                if (!meth.items) {
                    meth.items = sortedDictionary.create();
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
                    meth.fullname = (meth.clsmeth == 'true' ? '+' : '-') + " (<code>" + (meth.retval ? meth.retval.type : "Unknown") + "</code>)" + prettySelector(meth);
                }
                page.addDocumentationBlock(meth);
            });
            cls.properties.forEach(function(prop, i) {
                prop.category = prop.cls;
                if (!prop.group) {
                    prop.group = "Properties";
                }
                if (!prop.items) {
                    prop.items = sortedDictionary.create();
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
                    prop.fullname = "@property " + (prop.attributes ? "(" + prop.attributes.join(", ") + ") " : "") + "<code>" + (prop.type ? (prop.type.slice(-1) == "*" ? prop.type : prop.type + " ") : "TYPE ") + "</code><span class=\"parameter\">" + (prop.name ? prop.name : "VARNAME") + "</span>";
                }
                page.addDocumentationBlock(prop);
            });
            // for now we won't document ivars considering theyre generally not used in APIs
        });
        return page.render();
	}
	return "";
};
