var marked      = require('marked'),
    util        = require('util'),
    jade        = require('jade'),
    fs          = require('fs'),
    path        = require('path');

var logger = function(str) {
    util.log("[zUtils] " + str + "\n");
};

// sortedDictionary
// {{{

var sortedDictionary = (function() {
    var that = {};
    that.create = function(dict, keys) {
        var self = {};
        var m_keys = [];
        if (dict) {
            for (key in dict) {
                self[key] = dict[key];
            }
            if (!keys) {
                m_keys = Object.keys(dict);
            }
        }
        if (keys) {
            keys.forEach(function(obj, ind, arr) {
                if (self.hasOwnProperty(obj)) {
                    m_keys.push(obj);
                }
            });
        }
        Object.defineProperty(self, 'isSorted', {
            value : true,
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'addObject', {
            value : function(object, key, index) {
                if (key === null || key === undefined || object === null || object === undefined) {
                    return null;
                }
                this[key] = object;
                if (index != undefined && typeof index === 'number') {
                    m_keys.splice(index, 0, key);
                } else {
                    m_keys.push(key);
                }
                return this;
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'fetchKeys', {
            value : function() {
                return m_keys.slice();
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'enumerate', {
            value : function(cb) {
                m_keys.forEach(function(key, ind, arr) {
                    cb(key, this[key], ind, this);
                }, this);
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'merge', {
            value : function(dict, smergecb) {
                var mergecb;
                if (!dict)
                    return this;
                mergecb = function(path, obj1, obj2) {
                    if (obj1 === obj2) {
                        return obj1;
                    }
                    if (Array.isArray(obj1) && Array.isArray(obj2)) {
                        return obj1.concat(obj2);
                    }
                    return obj1 + ', ' + obj2;
                };
                if (!smergecb) {
                    smergecb = mergecb;
                }
                if (!dict.isSorted) {
                    dict = sortedDictionary.create(dict);
                }
                var merger = function(path, into, from, k) {
                    if (into.isSorted) {
                        if (into.hasKey(k)) {
                            if (typeof into[k] == 'object' && typeof from[k] == 'object' && !Array.isArray(into[k]) && !Array.isArray(from[k])) {
                                if (from[k].isSorted) {
                                    from[k].enumerate(function(kk,vv) {
                                        merger(path+'/'+k,into[k],from[k],kk);
                                    });
                                } else {
                                    for (kk in from[k]) {
                                        merger(path+'/'+k,into[k],from[k],kk);
                                    }
                                }
                            } else {
                                into[k] = smergecb(path+'/'+key,into[k],from[k], mergecb);
                            }
                        } else {
                            into.addObject(from[k], k);
                        }
                    } else {
                        if (into.hasOwnProperty(k)) {
                            if (typeof into[k] == 'object' && typeof from[k] == 'object' && !Array.isArray(into[k]) && !Array.isArray(from[k])) {
                                if (from[k].isSorted) {
                                    from[k].enumerate(function(kk,vv) {
                                        merger(path+'/'+k,into[k],from[k],kk);
                                    });
                                } else {
                                    for (kk in from[k]) {
                                        merger(path+'/'+k,into[k],from[k],kk);
                                    }
                                }
                            } else {
                                into[k] = smergecb(path+'/'+key,into[k],from[k], mergecb);
                            }
                        } else {
                            into[k] = from[k];
                        }
                    }
                };
                var self = this;
                dict.enumerate(function(key, val) {
                    merger('', self, dict, key);
                });
                return this;
            },
            enumerable : false,
            writable : false,
            configurable : false
        });
        Object.defineProperty(self, 'hasKey', {
            value : function(key) {
                return m_keys.indexOf(key) != -1;
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'keysLen', {
            value : function() {
                return m_keys.length;
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'keysIndexOf', {
            value : function(obj) {
                return m_keys.indexOf(obj);
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        Object.defineProperty(self, 'removeObjectForKey', {
            value : function(key) {
                var i = m_keys.indexOf(key);
                if (i != -1) {
                    m_keys.splice(i, 1);
                    delete this[key];
                }
            },
            enumerable: false,
            writable: false,
            configurable: false
        });
        return self;
    };
    return that;
})();

// }}}

// commentParser
// {{{

var commentParser = (function() {
    var that = {};
    that.parse = function(cmt) {
        var attrExtractor   = /@(@|[^\s@]{1,})([ \t]{1,}(?:[^@]|.*\\@.*){0,}){0,}(?:\n|$)/g;
            retval          = sortedDictionary.create(),
            extracted       = null,
            first           = null,
            second          = null;
        cmt = cmt.replace(/(^|\n)[ \t]{0,}\*[ \t]{0,}/g,"$1");
        extracted = attrExtractor.exec(cmt);
        while(extracted != null && extracted.length == 3) {
            if (extracted[2] == null)
                extracted[2] = "";
            first = extracted[1].replace(/([^\\]|^)_/, '$1 ').replace('\\_','_'), second = marked(extracted[2]).replace(/<\/?p>/g, "").trim();
            if (retval.hasKey(first)) {
                retval[first].push(second);
            } else {
                retval.addObject([second], first);
            }
            extracted = attrExtractor.exec(cmt);
        }
        var mdtster = /#[\w.]+\.md/g;
        for (key in retval) {
            if (mdtster.test(key)) {
                var fnam = path.resolve(__dirname, key.substr(1));
                var fildat;
                try {
                    fildat = fs.readFileSync(fnam) + '';
                } catch(e) {
                    fildat = '';
                }
                var matches = /<\!---\s{0,}title:\s{0,}?(.{0,})\s{0,}?-->/g.exec(fildat);
                var title = null;
                if (matches && matches.length > 1) {
                    title = matches[1].trim();
                } else {
                    title = "";
                }
                var mddata = (fildat ? marked(fildat) : "");
                if (retval.hasKey(title)) {
                    retval[title].push(mddata);
                } else {
                    retval.addObject([mddata], title, retval.keysIndexOf(key));
                }
                retval.removeObjectForKey(key);
            } else if (key == "@") {
                retval.addObject(retval["@"], "", retval.keysIndexOf("@"));
                retval.removeObjectForKey("@");
            }
        }
        return retval;
    };
	that.parseType = function(val) {
        var extractor = /^[^\\]{0,}\{([\w *]+)[^\\]{0,}\}[ \t]{0,}([\s\S]{0,})/,
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
	that.parseParameters = function(params) {
        var paramObj,
            results,
            extractor = /^\s{0,}(\w+)\s{0,}=\s{0,}([^\s][\s\S]{0,})/;
        if (params) {
            return params.map(function(param) {
                results = extractor.exec(param);
                if (results) {
                    paramObj = that.parseType(results[2]);
                    paramObj.name = results[1];
                    return paramObj;
                } else {
                    paramObj = that.parseType(param);
                    paramObj.name = "Unknown";
                    return paramObj;
                }
            });
        } else {
            return null;
        }
	};
    that.checkandjoin = function(dict, p) {
        if (dict.hasOwnProperty(p) && Array.isArray(dict[p])) {
            return dict[p].join("<br/>");
        } else {
            return null;
        }
    };
    that.parseAttributes = function(attrs) {
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
            return null;
        }
    };
    that.extract = function(text, commentBlocks, codeBlocks, smerger) {
        var i,j,merger,
            reger, result,
            comment, tmp, found,
            retval = [], match, comms = [],
            comDict, codDict, dict, ttext = text;
        merger = function(d1, d2) {
            if (d1.hasKey("parameters") && d1.parameters.length > 0 && d2.hasKey("parameters") && d2.parameters.length > 0) {
                d2.removeObjectForKey("parameters");
            }
            d1.merge(d2);
            if (smerger) {
                d1 = smerger(d1);
            }
            d1.enumerate(function(key, object) {
                if (Array.isArray(object)) {
                    tmp = [];
                    found = false;
                    object.forEach(function(aitem) {
                        tmp.forEach(function(bitem) {
                            if (bitem.name && aitem.name && bitem.name == aitem.name) {
                                found = true;
                                for (thing in aitem) {
                                    if (bitem.hasOwnProperty(thing)) {
                                        if (bitem[thing] != aitem[thing]) {
                                            bitem[thing] += ", " + aitem[thing];
                                        }
                                    } else {
                                        bitem[thing] = aitem[thing]
                                    }
                                }
                            }
                        });
                        if (!found) {
                            tmp.push(aitem);
                        }
                    });
                    d1[key] = tmp;
                }
            });
            return d1;
        };
        for (codBlock in codeBlocks) {
            for (comBlock in commentBlocks) {
                var a = comBlock + "\\s{0,}" + codBlock;
                reger = new RegExp(a);
                while (true) {
                    result = reger.exec(ttext);
                    if (result == null) {
                        break;
                    }
                    match = result.splice(0,1)[0];
                    ttext = ttext.replace(match, "");
                    var a = result[0];
                    comDict = commentBlocks[comBlock](result, function(res) {
                        result = res;
                    });
                    if (comDict.keysLen() == 0) {
                        continue;
                    }
                    text = text.replace(match,"");
                    codeDict = codeBlocks[codBlock](result, function(res) {
                        result = res;
                    });
                    dict = merger(comDict, codeDict);
                    retval.push(dict);
                }
            }
        }
        for (comBlock in commentBlocks) {
            reger = new RegExp(comBlock);
            while (true) {
                result = reger.exec(ttext);
                if (result == null)
                    break;
                match = result.splice(0,1)[0];
                ttext = ttext.replace(match,"");
                comment = commentBlocks[comBlock](result, function(res) {
                    result = res;
                });
                if (!comment['zdocs'] || comment['zdocs'][0] !== 'filedescription')
                    continue;
                text = text.replace(match, "");
                comms.push(comment);
            }
        }
        return {
            couples : retval,
            comments : comms,
            text : text
        };
    };
    that.escapeType = function(type) {
        return type.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    };
    return that;
})();

// }}}

// dominie
// {{{

var dominie = (function() {
	var that = {};
	var createElement = function(tagname, attrs, innertext) {
		var attrstr = "";
		for (attr in attrs) {
			if (attrs[attr] != null)
				attrstr += " " + attr + "=\"" + attrs[attr] + "\"";
		}
		return "<" + tagname + attrstr + ">" + innertext + "</" + tagname + ">";
	};
	var domItem = {
		draw : function() {
			return createElement("span", { "class" : this.context.cls, "id" : this.context.id }, "");
		},
		drawSidebar : function() {
			return null;
		}
	};
	var domParagraphItem = {
		draw : function() {
			return createElement("p", {"class" : this.context.cls, "id" : this.context.id }, this.context.text);
		},
		drawSidebar : function() {
			return null;
		}
	};
	var domUnorderedListItem = {
		draw : function() {
			var inner = "";
			this.context.items.forEach(function(li, index, array) {
				inner += "<li>" + li.draw() + "</li>";
			});
			return createElement("ul", {"class" : this.context.cls, "id" : this.context.id}, inner);
		},
		drawSidebar : function() {
			if (this.context.hasOwnProperty("drawSidebar") && this.context.drawSidebar == false) {
				return null;
			}
			var inner = "";
			this.context.items.forEach(function(li, index, array) {
				inner += "<li>" + li.draw() + "</li>";
			});
			return createElement("ul", {"class" : this.context.sidebarcls, "id" : this.context.sidebarid}, inner);
		}
	};
	var domSpanItem = {
		draw : function() {
			return createElement("span", {"class" : this.context.cls, "id" : this.context.id}, this.context.text);
		},
		drawSidebar : function() {
			return null;
		}
	};
	var domTextItem = {
		draw : function() {
			return this.context.text;
		},
		drawSidebar : function() {
			return null;
		}
	};
	var domLinkItem = {
		draw : function() {
			return createElement("a", {"class" : this.context.cls, "id" : this.context.id, "href" : this.context.href}, this.context.text);
		},
		drawSidebar : function() {
			return null;
		}
	};
	var domContainerItem = {
		draw : function() {
			var inner = "";
			this.context.items.forEach(function(li, index, array) {
				inner += li.draw();
			});
			return createElement("div", {"class" : this.context.cls, "id" : this.context.id}, inner);
		},
		drawSidebar : function() {
			return null;
		}
	};
    var domGeneralItem = {
        draw : function() {
            return createElement(this.name, this.context.hasOwnProperty("attributes") ? this.context.attributes : {}, this.context.text);
        },
        drawSidebar : function() {
            return null;
        }
    };
    var domDescriptionList = {
        draw : function() {
            var inner = "",
                minner = Math.min(this.context.terms.length, this.context.descriptions.length),
                i;
            for (i = 0; i < minner; i++) {
                inner += createElement("dt", {"class" : this.context.termcls, "id" : this.context.termid}, this.context.terms[i]);
                inner += createElement("dd", {"class" : this.context.descriptioncls, "id" : this.context.descriptionid}, this.context.descriptions[i]);
            }
            return createElement("dl", {"class" : this.context.cls, "id" : this.context.id}, inner);
        },
        drawSidebar : function() { return null; }
    };
	var items = {};
	that.registerItem = function() {
		var name = arguments[0];
		var drawer;
		var sbdrawer;
		if (arguments.length == 3) {
			drawer = arguments[1];
			sbdrawer = arguments[2];
		} else {
			drawer = arguments[1].drawer ? arguments[1].drawer : arguments[1].draw;
			sbdrawer = arguments[1].sbdrawer ? arguments[1].sbdrawer : arguments[1].drawSidebar;
		}

		if (items.hasOwnProperty(name)) {
			return null;
		} else {
			items[name] = function(nam, context) {
				var that = {};
				var drawCache = null;
				var drawSidebarCache = null;
				that.name = nam;
				that.context = context;
				that.draw = function() {
					if (!drawCache) {
						drawCache = drawer.apply(that);
					}
					return drawCache;
				};
				that.drawSidebar = function() {
					if (!drawSidebarCache) {
						drawSidebarCache = sbdrawer.apply(that);
					}
					return drawSidebarCache;
				};
				that.resetCache = function() {
					drawCache = null;
					drawSidebarCache = null;
				};
				return that;
			};
			
		}

		return this;
	};
	that.createItem = function(name, context) {
        var checker = /<(\w+)>/;
		if (items.hasOwnProperty(name)) {
			return items[name](name, context);
		} else {
            if (checker.test(name)) {
                return items["general"](checker.exec(name)[1], context);
            }
			return items["default"](name, context);
		}
	};
	that.createCategory = function(name, options) {
        var that = {};
        that.items = [];
        that.name = name;

        that.drawSidebar = options && options.hasOwnProperty("drawSidebar") ? options.drawSidebar : true;
        that.addItem = function(item) {
            that.items.push(item);
            return this;
        };
        that.addItems = function(i) {
            i.forEach(function(item, index, arr) {
                that.items.push(item);
            });
            return this;
        };
        return that;
	};
	that.registerItem("default", domItem);
	that.registerItem("paragraph", domParagraphItem);
	that.registerItem("unorderedList", domUnorderedListItem);
	that.registerItem("span", domSpanItem);
	that.registerItem("text", domTextItem);
	that.registerItem("link", domLinkItem);
	that.registerItem("container", domContainerItem);
    that.registerItem("general", domGeneralItem);
    that.registerItem("dl", domDescriptionList);
	return that;
})();

// }}}

// artist
// {{{

var artist = (function() {
    var that = {};
    that.createPage = function(title, options) {
        var page = {};
        page.options = options != null ? options : {};
        page.title = title;
        var header = sortedDictionary.create({},[]);
        var categories = sortedDictionary.create({},[]);
        // helper funcs
        // {{{
        var cleanUpCategories = function() {
            categories.enumerate(function(key, object, index, dict) {
                if (object.keysLen() == 0) {
                    dict.removeObjectForKey(key);
                }
            });
        };
        var addGroup = function(grpnam, catnam) {
            if (categories.hasKey(catnam)) {
                if (!categories[catnam].hasKey(grpnam)) {
                    categories[catnam].addObject(sortedDictionary.create(), grpnam);
                }
            } else {
                categories.addObject(sortedDictionary.create(), catnam);
                categories[catnam].addObject(sortedDictionary.create(), grpnam);
            }
            cleanUpCategories();
        };
        var addDocBlock = function(docblock) {
            if (!docblock.isSorted) 
                docblock = sortedDictionary.create(docblock, Object.keys(docblock));
            if (!docblock.hasKey("category") || !docblock.hasKey("group") || !docblock.hasKey("name")) {
                return;
            }
            categories[docblock.category][docblock.group].addObject(docblock, docblock.name);
        };
        // }}}
        page.addHeaderItem = function(hdr) {
            if (!hdr.isSorted)
                hdr = sortedDictionary.create(hdr, Object.keys(hdr));
            if (!hdr.hasKey("title"))
                return null;
            header.addObject(hdr, hdr.title);
            return this;
        };
        page.addDocumentationBlock = function(docblock) {
            if (!docblock.hasOwnProperty("group") || !docblock.hasOwnProperty("category")) {
                return null;
            }
            addGroup(docblock.group, docblock.category);
            addDocBlock(docblock);
            return this;
        };
        page.render = function() {
            var headerCats      = [],
                precontentCats  = [],
                contentCats     = [],
                acat, bcat;
            acat = dominie.createCategory("Overview");
            header.enumerate(function(key, object, index, dict) {
                acat.addItem(dominie.createItem("text", {
                    title : key,
                    text : object.content
                }));
            });
            headerCats.unshift(acat);
            categories.enumerate(function(key, groups, index, dict) {
                acat = dominie.createCategory(key);
                bcat = dominie.createCategory(key, {
                    drawSidebar : false
                });
                groups.enumerate(function(group, items, i, d) {
                    acat.addItem(dominie.createItem("unorderedList", {
                        title : group,
                        sidebarcls : "sidebarlist",
                        items : items.fetchKeys().map(function(elm) {
                            return dominie.createItem("link", {
                                href : "#" + elm,
                                text : elm
                            });
                        })
                    }));
                    items.enumerate(function(name, item, ind, is) {
                        var contentItems = [];
                        contentItems.push(dominie.createItem("paragraph", {
                            text : item.description ? item.description : ""
                        }));
                        if (item.fullname) {
                            contentItems.push(dominie.createItem("<div>", {
                                text : item.fullname,
                                attributes : {
                                    "class" : "declaration"
                                }
                            }));
                        }
                        if (item.items) {
                            item.items.enumerate(function(subitemname, subitem, ii, aitem) {
                                contentItems.push(dominie.createItem("<h5>", {
                                    text : subitemname
                                }));
                                if (subitem.hasOwnProperty("draw")) {
                                    contentItems.push(subitem);
                                } else {
                                    contentItems.push(dominie.createItem("text", {
                                        text : subitem
                                    }));
                                }
                            });
                        }
                        bcat.addItem(dominie.createItem("container", {
                            items : contentItems,
                            title : item.name
                        }));
                    });
                });
                precontentCats.push(acat);
                contentCats.push(bcat);
            });
            return jade.renderFile(__dirname + '/views/generalrenderer.jade', {
                doccenter : this.options.doccenter ? this.options.doccenter : "Where am I?",
                stylesheets : this.options.stylesheets,
                scripts : this.options.scripts,
                pagetitle : this.title,
                root : this.options.root,
                categories : headerCats.concat(precontentCats.concat(contentCats))
            });
        };
        return page;
    };
    return that;
})();

// }}}

module.exports = {
    dominie : dominie,
    commentParser : commentParser,
    artist : artist,
    sortedDictionary : sortedDictionary
};
