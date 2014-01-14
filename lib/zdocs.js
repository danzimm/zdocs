/*
 * zdocs : filedescription
 * : ``zdocs.js`` is the main file that is loaded when the zdocs module is loaded. You can create a documentation center by adding an instancd of ``zdocs.middleware()`` to the expressjs stack.
 * Road Map : Right now you can only render javascript files. In the future support for languages like python and objective-c will be added!
 */


var fs 			= require('fs'),
	jsrenderer	= require('./jsrenderer.js'),
    util        = require('util');

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
	zdocs : object 
	name : module.exports
	description : The main zdocs module is exported here.
	discussion : More information on using this module can be found at `module.exports.middleware()`.
	availability : Available in zdocs 0.1 and later
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
     * zdocs : object
     * name : module.exports.documentor
     * description : The object that manages file renderers.
     * discussion : If you want to create your own file renderer then you must register it with this object. Simply call ``require('zdocs').documentor.registerFileHandler()`` and you will be called to render a file! If you want to manually render a file then call ``renderFile()`` on this object.
     * availability : Available in zdocs 0.1 and later
     */
	that.documentor = (function() {
		var that = {};
		var handledFileTypes = {};
        /*
         * zdocs : function
         * name : module.exports.documentor.canHandleFile
         * parameter : path = {String} The path to the file you wonder if we can render.
         * retval : {Boolean} Returns whether or not ``module.exports.documentor`` can render this file
         * description : Checks whether or not we can render the file at ``path``
         * discussion : This is the only way to check whether or not we can render a given file type. If you want to know in general if a file type can be handled then send a dummy path; for example if we wanted to check whether or not we can render *meow* files, we could pass along 'thecatgoes.meow'.
         * availability : Available in zdocs 0.1 and later
         */
		that.canHandleFile = function(path) {
			var fileext = extractFileExtension(path);
			return handledFileTypes.hasOwnProperty(fileext);;
		};
        /*
         * zdocs : function
         * name : module.exports.documentor.registerFileHandler
         * parameter : fileext = {String} File extension to be assigned to the *renderer*
         * parameter : renderer = {Function} A ZDocsFileHandler
         * retval : {Object} The instance of ``module.exports.documentor`` if successful, otherwise ``null``. See the discussion.
         * description : The function to register a file-type renderer.
         * discussion : This will register the *renderer* as the renderer for all files with the file extension *fileext*. This will fail if a renderer has already been registered for the given *fileext*, thus returning ``null``.
         * availability : Available in zdocs 0.1 and later
         */
		that.registerFileHandler = function(fileext, renderer) {
			if (!handledFileTypes.hasOwnProperty(fileext)) {
				handledFileTypes[fileext] = renderer;
                return this;
			}
            return null;
		};
        /*
         * zdocs : function
         * name : module.exports.documentor.renderFile
         * parameter : path = {String} The path to the file you want rendered.
         * parameter : options = {Object} An object with optional keys of 'doccenter' and 'stylesheet'. The 'doccenter' should be a ``String`` that represents the name of the documentation center you want to render. The 'stylesheet' should be a path to a stylesheet that will be placed inside the HTML that is generated.
         * retval : {String} A ``String`` of HTML that represents the documentation for *path* or null.
         * description : The function to render a page of documentation for the file at *path*.
         * discussion : This will call the handler that was registered with ``module.exports.documentor.registerFileHandler`` for the file type of *path*. If no renderer has been registered for the given file type null will be returned. It is customary for the renderer to return null on failure as well.
         * availability : Available in zdocs 0.1 and later
         */
		that.renderFile = function(path, options) {
			var fileext = extractFileExtension(path);
			if (handledFileTypes.hasOwnProperty(fileext)) {
				return handledFileTypes[fileext](path, options);
			}
			return null;
		};
		return that;
	})();
	that.documentor.registerFileHandler('js', jsrenderer);
	var createDocCenter = function(arg) {
		var that = {},
			watcher,
			updateCache,
			cache = {};
		that.path = arg.path;
		that.name = arg.name;
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
			updateCache(event);
		});
		updateCache(null);
		that.renderFile = function(file) {
			if (cache.hasOwnProperty(file)) {
				return cache[file].render;
			}
			return "";
		};
		return that;
	};
    /*
     * zdocs : function
     * name : module.exports.middleware
     * parameter : arg = {Object} An object with two required keys: \
                                                                    \
                                                              - `path` - The path to the files you want to display in the documentation center server. \
                                                              - `name` - The name of the documentation center server.
     * retval : {Function} A `Function` you can use as middleware for expressjs
     * description : The function that you use to instantiate a documentation center.
     * discussion : Use this function when you want to add a documentation center to an express stack.
     * availability : Available in zdocs 0.1 and later
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
