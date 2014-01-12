var fs 			= require('fs'),
	jsrenderer	= require('./jsrenderer.js');

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

module.exports = (function() {
	var that = mod = {};
	var extractFileExtension = function(file) {
		var a = file.split(".");
		if( a.length === 1 || ( a[0] === "" && a.length === 2 ) ) {
		    return "";
		}
		return a.pop();
	};
	that.documentor = (function() {
		var that = {};
		var handledFileTypes = {};
		that.canHandleFile = function(path) {
			var fileext = extractFileExtension(path);
			return handledFileTypes.hasOwnProperty(fileext);;
		};
		that.registerFileHandler = function(fileext, renderer) {
			if (!handledFileTypes.hasOwnProperty(fileext)) {
				handledFileTypes[fileext] = renderer;
			}
		};
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
			var files = fs.readdirSync(that.path),
				stats,
				tim,
				fullpath;
			files.forEach(function(file, index, arr) {
				if (mod.documentor.canHandleFile(file)) {
					fullpath = that.path.stringByAppendingPathComponent(file);
					stats = fs.statSync(fullpath);
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
	that.middleware = function(arg) {
		var dc = createDocCenter(arg);
		return function(req, res, next) {
			console.log("Requesting: " + req.path + " from doc center " + dc.name);
			res.send(dc.renderFile(req.path.slice(1)));
		};
	};
	return that;
})();
