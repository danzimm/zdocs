/*
 * @zdocs filedescription
 *
 * @@ ``zdocs.js`` is the main file that is loaded when the zdocs module is loaded. You can create a documentation center by adding an instancd of ``zdocs.middleware()`` to the expressjs stack.
 *
 * @Road_Map Right now you can only render javascript files. In the future support for languages like python and objective-c will be added!
 *
 */

var fs 			= require('fs'),
	jsrenderer	= require('./jsrenderer.js'),
    cssrenderer = require('./cssrenderer.js'),
    util        = require('util'),
    path        = require('path'),
    jade        = require('jade'),
    markdown    = require('markdown').markdown;

/*
	@zdocs object 

	@name module.exports

	@description The main zdocs module is exported here.

	@discussion More information on using this module can be found at `module.exports.middleware()`.
    
	@availability Available in zdocs 0.1 and later
    
    @group Global

*/
module.exports = (function() {
	var that = mod = {};
	var extractFileExtension = function(file) {
        var ret = path.extname(file);
        return ret.length == 0 ? ret : ret.slice(1);
	};
    /*
     * @zdocs object
     * 
     * @name module.exports.documentor
     * 
     * @description The object that manages file renderers.
     * 
     * @discussion If you want to create your own file renderer then you must register it with this object. Simply call ``require('zdocs').documentor.registerFileHandler()`` and you will be called to render a file! If you want to manually render a file then call ``renderFile()`` on this object.
     * 
     * @availability Available in zdocs 0.1 and later
     * 
     * @group Global
     *
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
                return items;
            } else {
                var files,
                    reger,
                    retval = [];
                try {
                    reger = new RegExp(items);
                } catch(e) {
                    items = items.replace(/^\*/,".*");
                    try {
                        reger = new RegExp(items);
                    } catch(ee) {
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
                metadata = metadata ? JSON.parse(metadata) : null || {};
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
                        desc += markdown.toHTML(fs.readFileSync(path.resolve(dir, metadata.description), { "encoding" : "utf8" })) + "<br/>";
                    }
                });
            }
            metadata.description = desc;

            return jade.renderFile(__dirname + '/views/meta.jade', {
                doccenter : options.doccenter,
                stylesheet : options.stylesheet,
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
         * @zdocs function
         *
         * @name module.exports.documentor.canHandleFile
         *
         * @parameter path = {String} The path to the file you wonder if we can render.
         *
         * @retval {Boolean} Returns whether or not ``module.exports.documentor`` can render this file
         *
         * @description Checks whether or not we can render the file at ``path``
         *
         * @discussion This is the only way to check whether or not we can render a given file type. If you want to know in general if a file type can be handled then send a dummy path; for example if we wanted to check whether or not we can render *meow* files, we could pass along 'thecatgoes.meow'.
         * 
         * @availability Available in zdocs 0.1 and later
         * 
         * @group Global
         * 
         */
		that.canHandleFile = function(p) {
			var fileext = extractFileExtension(p);
			return handledFileTypes.hasOwnProperty(fileext) || handledFiles.hasOwnProperty(path.basename(p));
		};
        /*
         * @zdocs function
         *
         * @name module.exports.documentor.registerFileExtHandler
         *
         * @parameter fileext = {String} File extension to be assigned to the *renderer*
         *
         * @parameter renderer = {Function} A ZDocsFileHandler
         *
         * @retval {Object} The instance of ``module.exports.documentor`` if successful, otherwise ``null``. See the discussion.
         *
         * @description The function to register a file-type renderer.
         *
         * @discussion This will register the *renderer* as the renderer for all files with the file extension *fileext*. This will fail if a renderer has already been registered for the given *fileext*, thus returning ``null``.
         *
         * @availability Available in zdocs 0.1 and later
         *
         * @group Global
         *
         */
		that.registerFileExtHandler = function(fileext, renderer) {
			if (!handledFileTypes.hasOwnProperty(fileext)) {
				handledFileTypes[fileext] = renderer;
                return this;
			}
            return null;
		};
        /*
         * @zdocs function
         *
         * @name module.exports.documentor.registerFileHandler
         *
         * @parameter file = {String} File to be assigned to the *renderer*
         *
         * @parameter renderer = {Function} A ZDocsFileHandler
         *
         * @retval {Object} The instance of ``module.exports.documentor`` if successful, otherwise ``null``. See the discussion.
         *
         * @description The function to register a file-type renderer.
         *
         * @discussion This will register the *renderer* as the renderer for the file *file*. This will fail if a renderer has already been registered for the given *file*, thus returning ``null``.
         *
         * @availability Available in zdocs 0.1 and later
         *
         * @group Global
         *
         */
		that.registerFileHandler = function(file, renderer) {
			if (!handledFiles.hasOwnProperty(file)) {
				handledFiles[file] = renderer;
                return this;
			}
            return null;
		};
        /*
         * @zdocs function
         *
         * @name module.exports.documentor.renderFile
         *
         * @parameter path = {String} The path to the file you want rendered.
         *
         * @parameter options = {Object} An object with optional keys of 'doccenter' and 'stylesheet'. The 'doccenter' should be a ``String`` that represents the name of the documentation center you want to render. The 'stylesheet' should be a path to a stylesheet that will be placed inside the HTML that is generated.
         *
         * @retval {String} A ``String`` of HTML that represents the documentation for *path* or null.
         *
         * @description The function to render a page of documentation for the file at *path*.
         *
         * @discussion This will call the handler that was registered with ``module.exports.documentor.registerFileHandler`` for the file type of *path*. If no renderer has been registered for the given file type null will be returned. It is customary for the renderer to return null on failure as well.
         *
         * @availability Available in zdocs 0.1 and later
         *
         * @group Global
         *
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
    that.documentor.registerFileExtHandler('css', cssrenderer);
    that.documentor.registerFileHandler('meta.json', that.documentor.renderMeta);
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
        /*
        if (arg.stylesheet === '_style.css') {
           
            var counter = 0;
            var updateStyl = function() {
                var str = fs.readFileSync(__dirname + '/stylesheets/style.styl', 'utf8');
                stylus(str).set('filename', arg.stylesheet).use(nib()).render(function(err, css) {
                    fs.writeFileSync(__dirname + '/stylesheets/style.css', css);
                    cache['_style.css'] = {
                        render : css,
                        mtime : Date.now()
                    };
                });
            };
            var tryUpdateStyl = function() {
                counter++;
                setTimeout(function() {
                    counter--;
                    if (counter === 0) {
                        updateStyl();
                    }
                }, 500);
            };
            fs.watch(__dirname + '/stylesheets/style.styl', function(event, filename) {
                tryUpdateStyl();
            });
            updateStyl();
            
        }
        */
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
							doccenter : that.name,
							stylesheet : arg.stylesheet,
                            paths : that.paths
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

    /*
     * @zdocs function
     *
     * @name module.exports.middleware
     *
     * @parameter arg = {Object} An object with two required keys:
     *
     * - `path` - The path to the files you want to display in the documentation center server.
     * - `name` - The name of the documentation center server.
     *
     * @retval {Function} A `Function` you can use as middleware for expressjs
     *
     * @description The function that you use to instantiate a documentation center.
     *
     * @discussion Use this function when you want to add a documentation center to an express stack.
     *
     * @availability Available in zdocs 0.1 and later
     *
     * @group Global
     *
     */
	that.middleware = function(arg) {
		var dc = createDocCenter(arg);
		return function(req, res, next) {
			res.send(dc.renderFile(req.path.slice(1)));
		};
	};
	return that;
})();
