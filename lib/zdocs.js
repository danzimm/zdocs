/*
 * @zdocs filedescription
 *
 * @@ ``zdocs.js`` is the main file that is loaded when the zdocs module is loaded. The `tldr` version of the how-to below is call [zdocs.stackDoc](#module.exports.stackDoc "stackDoc"):
 *
 * ```javascript
 * var app = require('express')(),
 *     zdocs = require('zdocs');
 * zdocs.stackDoc(app,'/', {
 *     paths : ['./'],
 *     name : 'Doc Center'
 * });
 * app.listen(3001);
 * ```
 *
 * @#../README.md
 *
 * @Road_Map As of version `0.2.0` one can document `.js` and `.h` files. The headers can be `c` or `objective-c`. Support for `c++`, `python` and more is planned!
 *
 */

var fs 			    = require('fs'),
	jsrenderer	    = require('./jsrenderer.js'),
    chdrrenderer    = require('./chdrrenderer.js'),
    util            = require('util'),
    path            = require('path'),
    jade            = require('jade'),
    marked          = require('marked'),
    stylus          = require('stylus'),
    nib             = require('nib'),
    express         = require('express');

/*
	@description This is the object returned by `require('zdocs')`

	@discussion The main method to be called on this module is the [zdocs.stackDoc](#module.exports.stackDoc "stackDoc") function
    
	@availability Available in zdocs 0.1.0 and later
    
    @group Global
*/
module.exports = (function() {
	var that = mod = {};
	var extractFileExtension = function(file) {
        var ret = path.extname(file);
        return ret.length == 0 ? ret : ret.slice(1);
	};
    /*
     * @name module.exports.documentor
     * 
     * @description The object that manages file renderers.
     * 
     * @discussion This object is used to register your own file renderer. Simply call one of the two following methods:
     *
     * ```javascript
     * require('zdocs').registerFileHandler(filename, function(path, options) {...});
     * require('zdocs').registerFileExtHandler(fileext, function(path, options) {...});
     * ```
     * Note that the second arguement should return a string of the html you want sent back to the client.
     *
     * @availability Available in zdocs 0.1.0 and later
     * 
     * @group Exports
     */
	that.documentor = (function() {
		var that = {};
		var handledFileTypes = {},
            handledFiles = {};
        var logger = function(msg) {
            util.log("[Documentor] " + msg + "\n");
        };
        var parseItems = function(dirs, items) {
            if (Array.isArray(items)) {
                var retval = [],
                    tmp = [],
                    i;
                items.forEach(function(item) {
                    if (/^-/.test(item)) {
                        item = item.replace(/^-/,"");
                        tmp = parseItems(dirs, item);
                        tmp.forEach(function(t) {
                            i = retval.indexOf(t);
                            if (i != -1) {
                                retval.splice(i, 1);
                            }
                        });
                    } else {
                        retval = retval.concat(parseItems(dirs, item));
                    }
                });
                return retval;
            } else {
                var files,
                    reger,
                    retval = [];
                try {
                    reger = new RegExp(items);
                } catch(e) {
                    logger("Failed to create regex first time: " + JSON.stringify(e) + " (" + items + ")");
                    items = items.replace(/^\*/,".*");
                    try {
                        reger = new RegExp(items);
                    } catch(ee) {
                        logger("Failed to create regex second time: " + JSON.stringify(ee) + " (" + items + ")");
                        reger = {
                            test : function(str) {
                                return str.indexOf(items) != -1;
                            }
                        };
                    }
                }
                dirs.forEach(function(dir, index, a) {
                    try {
                        files = fs.readdirSync(dir);
                    } catch(e) {
                        files = [];
                        util.error("Failed to parseItems " + JSON.stringify(e));
                    }
                    files.forEach(function(file, index, arr) {
                        if (reger.test(file)) {
                            retval.push("<a href=\"" + file + "\">" + file + "</a>");
                        }
                    });
                });
                return retval;
            }
        };
        that.renderMeta = function(p, options) {
            logger("Rendering file: " + p);
            var metadata = fs.readFileSync(p, { "encoding" : "utf8" }),
                dirs = options.paths;
            try {
                metadata = (metadata ? JSON.parse(metadata) : null) || {};
            } catch(e) {
                return "";
            }
            metadata.maxitems = 0;
            if (metadata.columns) {
                metadata.columns = metadata.columns.map(function(elm) {
                    var ret =  {
                        title : elm.title,
                        items : parseItems(dirs, elm.items)
                    };
                    if (ret.items.length > metadata.maxitems)
                        metadata.maxitems = ret.items.length;
                    return ret;
                });
            } else {
                metadata.columns = [];
            }
            var desc = "";
            if (metadata.description && typeof metadata.description === 'string') {
                dirs.forEach(function(dir, i, a) {
                    if (fs.existsSync(path.resolve(dir, metadata.description))) {
                        desc += marked(fs.readFileSync(path.resolve(dir, metadata.description), { "encoding" : "utf8" })) + "<br/>";
                    }
                });
            }
            metadata.description = "<span class=\"markdownContent\">"+desc+"</span>";
            return jade.renderFile(__dirname + '/views/meta.jade', {
                doccenter : options.doccenter,
                root : options.root,
                stylesheets : options.stylesheets,
                scripts : options.scripts,
                pagetitle : metadata.title + " Reference",
                description : metadata.description,
                hideSidebar : true,
                specialData : metadata.specialData ? metadata.specialData.map(function(elm) {
                    return {
                        key : elm.key,
                        val : elm.link  ? "<a href=\"" + elm.link + "\">" + (elm.val ? elm.val : elm.link + "</a>") : (elm.val ? elm.val : "Unknown")
                    };
                }) : [],
                columns : metadata.columns,
                maxitems : metadata.maxitems
            });
        };

        /*
         * @name module.exports.documentor.canHandleFile
         *
         * @parameter path = {String} The path to the file you wonder if we can render.
         *
         * @retval {Boolean} Returns whether or not ``module.exports.documentor`` can render this file
         *
         * @description Checks whether or not the `documentor` can render the file at ``path``
         *
         * @discussion This is the only way to check whether or not we can render a given file type. If you want to know in general if a file type can be handled then send a dummy path; for example if we wanted to check whether or not we can render *meow* files, we could pass along 'thecatgoes.meow'.
         * 
         * @availability Available in zdocs 0.1.0 and later
         * 
         * @group Documentor
         */
		that.canHandleFile = function(p) {
			var fileext = extractFileExtension(p);
			return handledFileTypes.hasOwnProperty(fileext) || handledFiles.hasOwnProperty(path.basename(p));
		};
        /*
         * @name module.exports.documentor.registerFileExtHandler
         *
         * @parameter fileext = {String} File extension to be assigned to the *renderer*
         *
         * @parameter renderer = {Function} A function that takes two arguements:
         *
         * ```javascript
         * function(path, options) {...}
         * ```
         *
         * and returns a string of html that represents the documentation of this file. `path` is the path to the file that should be rendered and `options` is an object with the following possible keys:
         *
         * - `doccenter` - `String` : name of the documentation center that wants this file rendered
         * - `root` - `String` : root URL of this documentation center
         * - `stylesheets` - `Array` : each element is a `String` representing the URL to a stylesheet that should be included when rendering this file
         * - `scripts` - `Array` : each element is a `String` representing the URL to a script that should be included when rendering this file
         *
         * @retval {Object} The instance of ``module.exports.documentor`` if successful, otherwise ``null``. See the discussion.
         *
         * @description The function to register a file-type renderer.
         *
         * @discussion This will register the *renderer* as the renderer for all files with the file extension *fileext*. This will fail if a renderer has already been registered for the given *fileext*, thus returning ``null``.
         *
         * @availability Available in zdocs 0.1.0 and later
         *
         * @group Documentor
         */
		that.registerFileExtHandler = function(fileext, renderer) {
			if (!handledFileTypes.hasOwnProperty(fileext)) {
				handledFileTypes[fileext] = renderer;
                return this;
			}
            return null;
		};
        /*
         * @name module.exports.documentor.registerFileHandler
         *
         * @parameter file = {String} File to be assigned to the *renderer*
         *
         *
         * @parameter renderer = {Function} A function that takes two arguements:
         *
         * ```javascript
         * function(path, options) {...}
         * ```
         *
         * and returns a string of html that represents the documentation of this file. `path` is the path to the file that should be rendered and `options` is an object with the following possible keys:
         *
         * - `doccenter` - `String` : name of the documentation center that wants this file rendered
         * - `root` - `String` : root URL of this documentation center
         * - `stylesheets` - `Array` : each element is a `String` representing the URL to a stylesheet that should be included when rendering this file
         * - `scripts` - `Array` : each element is a `String` representing the URL to a script that should be included when rendering this file
         *
         * @retval {Object} The instance of ``module.exports.documentor`` if successful, otherwise ``null``. See the discussion.
         *
         * @description The function to register a file-type renderer.
         *
         * @discussion This will register the *renderer* as the renderer for the file *file*. This will fail if a renderer has already been registered for the given *file*, thus returning ``null``.
         *
         * @availability Available in zdocs 0.1.0 and later
         *
         * @group Documentor
         */
		that.registerFileHandler = function(file, renderer) {
			if (!handledFiles.hasOwnProperty(file)) {
				handledFiles[file] = renderer;
                return this;
			}
            return null;
		};
        /*
         * @name module.exports.documentor.renderFile
         *
         * @parameter path = {String} The path to the file you want rendered.
         *
         * @parameter options = {Object} An object with the keys as mentioned in the description of the `options` object passed to the second arguement of `renderer` in (registerFileHandler)[#module.exports.documentor.registerFileHandler]
         *
         * @retval {String} A ``String`` of HTML that represents the documentation for *path* or null.
         *
         * @description The function to render a page of documentation for the file at *path*.
         *
         * @discussion This will call the handler that was registered with ``module.exports.documentor.registerFileExtHandler, module.exports.documentor.registerFileHandler`` for the file type of *path*. If no renderer has been registered for the given file type `null` will be returned. 
         *
         * NOTE: It is customary for the renderer to return `""` on failure
         *
         * @availability Available in zdocs 0.1 and later
         *
         * @group Documentor
         */
		that.renderFile = function(p, options) {
            if (handledFiles.hasOwnProperty(path.basename(p))) {
                return handledFiles[path.basename(p)](p, options);
            }
			var fileext = extractFileExtension(p);
			if (handledFileTypes.hasOwnProperty(fileext)) {
				return handledFileTypes[fileext](p, options);
			}
			return null;
		};
		return that;
	})();
	that.documentor.registerFileExtHandler('js', jsrenderer);
    that.documentor.registerFileHandler('meta.json', that.documentor.renderMeta);
    that.documentor.registerFileExtHandler('h', chdrrenderer);
	var createDocCenter = function(arg) {
		var that = {},
			watchers = {},
			updateCache, tryUpdateCache, cacheCounter = {},
			cache = {};
        var logger = function(msg) {
            util.log("[" + that.name + "] " + msg + "\n");
        };
        var warner = function(msg) {
            logger("[WARNING] " + msg);
        };
		that.paths = arg.paths || [arg.path] || ['./'];
		that.name = arg.name;
        tryUpdateCache = function(p, event) {
            cacheCounter[p] = cacheCounter.hasOwnProperty(p) ? cacheCounter[p] + 1 : 0;
            setTimeout(function() {
                cacheCounter[p]--;
                if (cacheCounter[p] === 0) {
                    updateCache(p, event);
                }
            }, 500);
        };
		updateCache = function(p, event) {
            var files,
                stats,
                tim,
                fullpath;
            try {
			    files = fs.readdirSync(p);
		    } catch(e) {
                util.error("Failed to update cache for doc center: " + that.name + " at path " + p + ": " + JSON.stringify(e));
            }
			files.forEach(function(file, index, arr) {
                if (mod.documentor.canHandleFile(file)) {
					fullpath = path.resolve(p, file);
                    try {
					    stats = fs.statSync(fullpath);
                    } catch(ee) {
                        warner("Failed to update cache for file: " + file + ". Removing from cache with error: " + JSON.stringify(ee) + ". Trying again in a second...");
                        delete cache[file];
                        setTimeout(updateCache, 1000);
                        return;
                    }
					tim = stats.mtime.getTime();
					if (cache.hasOwnProperty(file) && tim <= cache[file].mtime) {
						return;
					}
                    //logger("Caching " + file);
					cache[file] = {
						render : mod.documentor.renderFile(fullpath, {
							doccenter : that.name, //string
                            root : arg.path, //string
							stylesheets : arg.stylesheets.slice(), //arr
                            scripts : arg.scripts.slice(), //arr
                            paths : that.paths.slice() //arr
						}),
						mtime : tim
					};
				}
			});
        };
        that.paths.forEach(function(p, i, a) {
            var watcher = fs.watch(p, function(event, filename) {
                tryUpdateCache(p, event);
            });
            updateCache(p, null);
            watchers[p] = watcher;
        });
		that.renderFile = function(file) {
			logger("Requesting: " + file);
            if (file === '')
                file = 'meta.json';
			if (cache.hasOwnProperty(file)) {
				return cache[file].render;
			}
            warner("Failed to render: " + file);
			return "";
		};
		return that;
	};

	var middleware = function(arg) {
		var dc = createDocCenter(arg);
		return function(req, res, next) {
			res.send(dc.renderFile(req.path.slice(1)));
		};
	};

    var hexToRgb = function(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };
    var stylCompile = function(options) {
        var t = hexToRgb(options.maincolor ? options.maincolor : "#50A186"), maincolor = new stylus.nodes.RGBA(t.r,t.g,t.b,1), hdrcolor, linkcolor, subcolor;
        t = hexToRgb(options.hdrcolor ? options.hdrcolor : "#468C75");
        hdrcolor = new stylus.nodes.RGBA(t.r,t.g,t.b,1);
        t = hexToRgb(options.linkcolor ? options.linkcolor : "#97BFB2");
        linkcolor = new stylus.nodes.RGBA(t.r,t.g,t.b,1);
        t = hexToRgb(options.subcolor ? options.subcolor : "#C7C7C7");
        subcolor = new stylus.nodes.RGBA(t.r,t.g,t.b,1);
        return function(str, path) {
            return stylus(str).set('filename', path).define("main-color",maincolor).define("hdr-color", hdrcolor).define("link-color", linkcolor).define("sub-color", subcolor).use(nib());
        };
    };
    /*
     * @name module.exports.stackDoc
     *
     * @parameter app = {ExpressApp} The express application to add the documentation center to the stack
     *
     * @parameter p = {String} The path to add the documentation center to
     *
     * @parameter arg = {Object} An object with two required keys:
     *
     * - `path` - The path to the files you want to display in the documentation center server.
     * - `name` - The name of the documentation center server.
     *
     * and a few optional ones:
     *
     * - `stylesheets` - An array of either strings or objects representing stylesheets you want added to each page of documentation. The strings represent the urls to be placed inside `link` nodes. The objects represent inline css, place the data in the `inner` attribute i.e.:
     * ```
     * var stylesheets = [
     *     {
     *         inner : "head { color: green; }"
     *     },
     *     "some.link.com/style.css"
     * ];
     * ```
     * - `scripts` - Similar to `stylesheets` but with javascript scripts
     * - `maincolor` - A hex string that represents the main color for the documentation center. Defaults to `50A186`
     * - `hdrcolor` - A hex string that represents the header color for the documentation center. Defaults to `468C75`
     * - `linkcolor` - A hex string that represents the link color for the documentation center. Defaults to `97BFB2`
     * - `subcolor` - A hex string that represents the secondary color for the documentation center. Defaults to `C7C7C7`
     *
     * @retval {ExpressApp} The express application passed to `app` for cascading
     *
     * @description The function that you use to instantiate a documentation center
     *
     * @discussion Use this function when you want to add a documentation center to an express stack. This is currently the main way to create a documentation center. We rely on `express` because it's a fairly stable framework
     *
     * @availability Available in zdocs 0.2.0 and later
     *
     * @group Exports
     */
    that.stackDoc = function(app, p, arg) {
        var statstyle = [path.resolve(p, "stylesheets/style.css"), "http://yandex.st/highlightjs/8.0/styles/default.min.css", "http://yandex.st/highlightjs/8.0/styles/github.min.css"],
            statscript = ["http://yandex.st/highlightjs/8.0/highlight.min.js", path.resolve(p, "js/main.js")];
        if(arg.stylesheets) {
            arg.stylesheets = statstyle.concat(arg.stylesheets);
        } else {
            arg.stylesheets = statstyle;
        }
        if (arg.scripts) {
            arg.scripts = statscript.concat(arg.scripts);
        } else {
            arg.scripts = statscript;
        }
        arg.path = p;
        app.use(p, stylus.middleware({
            src : __dirname,
            dest : __dirname + '/public/',
            compile : stylCompile(arg)
        }));
        app.use(p, express.static(__dirname + '/public'));
        app.use(p, middleware(arg));
    };
	return that;
})();
