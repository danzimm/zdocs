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
    util        = require('util'),
    path        = require('path'),
    jade        = require('jade'),
    markdown    = require('markdown').markdown;

String.prototype.fileExtension = function() {
	var a = this.split('.');
	if (a.length === 1 || (a[0] === '' && a.length === 2)) {
		return ""
	}
	return a.pop();
};

String.prototype.stringByAppendingPathComponent = function(component) {
	if (this[this.length-1] === '/')  {
		return this + component;
	} else {
		return this + '/' + component;
	}
};

var warner = function(msg) {
    util.log("[WARNING] " + msg);
};

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
		var a = file.split(".");
		if( a.length === 1 || ( a[0] === "" && a.length === 2 ) ) {
		    return "";
		}
		return a.pop();
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
		var handledFileTypes = {};
        var parseItems = function(dir, items) {
            if (Array.isArray(items)) {
                return items;
            } else {
                var files,
                    reger,
                    retval = [];
                try {
                    files = fs.readdirSync(dir);
                } catch(e) {
                    files = [];
                    util.error("Failed to parseItems " + JSON.stringify(e));
                }
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
                files.forEach(function(file, index, arr) {
                    if (reger.test(file)) {
                        retval.push("<a href=\"" + file + "\">" + file + "</a>");
                    }
                });
                return retval;
            }
        };
        var renderMeta = function(p, options) {
            var metadata = fs.readFileSync(p, { "encoding" : "utf8" }),
                dir = p.replace(new RegExp(path.basename(p) + "$"), "");
            try {
                metadata = metadata ? JSON.parse(metadata) : null;
            } catch(e) {
                return "";
            }
            metadata.maxitems = 0;
            metadata.columns = metadata.columns.map(function(elm) {
                var ret =  {
                    title : elm.title,
                    items : parseItems(dir, elm.items)
                };
                if (ret.items.length > metadata.maxitems)
                    metadata.maxitems = ret.items.length;
                return ret;
            });
            if (metadata.description && typeof metadata.description === 'string') {
                if (fs.existsSync(path.resolve(dir, metadata.description))) {
                    metadata.description = markdown.toHTML(fs.readFileSync(path.resolve(dir, metadata.description), { "encoding" : "utf8" }));
                }
            } else {
                metadata.description = "";
            }
            return jade.renderFile(__dirname + '/views/meta.jade', {
                doccenter : options.doccenter,
                stylesheet : options.stylesheet,
                pagetitle : metadata.title + " Reference",
                description : metadata.description,
                hideSidebar : true,
                specialData : metadata.specialData.map(function(elm) {
                    return {
                        key : elm.key,
                        val : elm.link  ? "<a href=\"" + elm.link + "\">" + (elm.val ? elm.val : elm.link + "</a>") : (elm.val ? elm.val : "Unknown")
                    };
                }),
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
		that.canHandleFile = function(path) {
			var fileext = extractFileExtension(path);
			return handledFileTypes.hasOwnProperty(fileext) || path === 'meta.json';
		};
        /*
         * @zdocs function
         *
         * @name module.exports.documentor.registerFileHandler
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
		that.registerFileHandler = function(fileext, renderer) {
			if (!handledFileTypes.hasOwnProperty(fileext)) {
				handledFileTypes[fileext] = renderer;
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
            if (path.basename(p) === 'meta.json') {
                return renderMeta(p, options);
            }
			var fileext = extractFileExtension(p);
			if (handledFileTypes.hasOwnProperty(fileext)) {
				return handledFileTypes[fileext](p, options);
			}
			return null;
		};
		return that;
	})();
	that.documentor.registerFileHandler('js', jsrenderer);
	var createDocCenter = function(arg) {
		var that = {},
			watcher,
			updateCache, tryUpdateCache, cacheCounter = 0,
			cache = {};
		that.path = arg.path;
		that.name = arg.name;
        tryUpdateCache = function(event) {
            cacheCounter++;
            setTimeout(function() {
                cacheCounter--;
                if (cacheCounter === 0) {
                    updateCache(event);
                }
            }, 500);
        };
		updateCache = function(event) {
            var files,
                stats,
                tim,
                fullpath;
            try {
			    files = fs.readdirSync(that.path);
		    } catch(e) {
                util.error("Failed to update cache for doc center: " + that.name + " at path " + that.path + ": " + JSON.stringify(e));
            }
			files.forEach(function(file, index, arr) {
                if (mod.documentor.canHandleFile(file)) {
					fullpath = that.path.stringByAppendingPathComponent(file);
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
					cache[file] = {
						render : mod.documentor.renderFile(fullpath, {
							doccenter : that.name,
							stylesheet : arg.stylesheet
						}),
						mtime : tim
					};
				}
			});
        };
		watcher = fs.watch(that.path, function(event, filename) {
            tryUpdateCache(event);
		});
		updateCache(null);
		that.renderFile = function(file) {
            if (file === '')
                file = 'meta.json';
			if (cache.hasOwnProperty(file)) {
				return cache[file].render;
			}
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
			console.log("Requesting: " + req.path + " from doc center " + dc.name);
			res.send(dc.renderFile(req.path.slice(1)));
		};
	};
	return that;
})();
