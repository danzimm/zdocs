/*
	zdocs : filedescription
	 : ``jsrenderer.js`` is the javascript documentation renderer for zdocs. It uses zdocs' module api and is automatically (internal to zdocs) added as the js renderer. At the moment there is no way to override this renderer, but in the future there will be.
	Styling : You can style this page with the stylesheet you gave when creating the corresponding documentation center.
*/

var fs 			= require('fs'),
	zutils		= require('./zutils'),
	jade		= require('jade'),
	markdown	= require('markdown').markdown;

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
	parameters : path=String-A 'String' object that represents the file path to the javascript file to be documented; options=Object-"An object with the optional keys of: 'stylesheet' to specify the relative path to the stylesheet to use (with regards to the website's root), doccenter to specify the name of the documentation center"
	retval : String; A 'String' with html documentation of the given 'file'
	description : Parses a javascript file and returns an HTML string of documentation for that file.
	discussion : This assumes the file you are passing to it in 'path' is a javascript file. Ensure that 'path'. It also expects 'path' to be a relative path to the current directory, or a full path.
	availability : Available in zdocs 0.1 and later
*/

module.exports = function(path, options) {
	var logger = function(str) {
		console.log("[JSRenderer] " + str + "\n");
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
	var parseType = function(val, delimiter) {
		var a = val.split(delimiter);
		if (a.length > 1) {
			return {
				type : a[0].trim(),
				description : concatStrings(a, 1, delimiter).trim()
			};
		}
		return {
			type : "Unknown",
			description : val
		};
	};
	var parseParameters = function(params) {
		var retval 	= [],
			strs,
			items,
			val,
			i;
		if (!params)
			return retval;
		strs = params.split(';');
		for (i = 0; i < strs.length; i++) {
			items = strs[i].trim().split('=');
			if (items.length > 1) {
				items[1] = concatStrings(items, 1, '=');
				val = parseType(items[1].trim().unquote(), "-");
				val.name = items[0];
				retval.push(val);
			}
		}
		return retval;
	};
	var prettyParameters = function(parameters) {
		var retval = "(",
			i;
		if (parameters.length > 0) {
			retval += "(" + parameters[0].type + ")" + parameters[0].name;
		}
		for (i = 1; i < parameters.length; i++) {
			// TODO need to make this ordered somehow
			retval += ", (" + parameters[i].type + ")" + parameters[i].name;
		}
		return retval + ")";
	};

	logger("Rendering file: " + path);
	var file 			= fs.readFileSync(path, "utf8"),
		commentmatcher	= /\/\*[\n\f\t\r ]{0,}([\n\f\t\r\w !-)+-.:-@\[-`{-˜]{0,})[\n\f\t\r ]{0,}\*\//g,
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
		filedescription = {};

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
				lines.forEach(function(line, i, arr) {
					line = line.trim();
					ditems = line.split(':');
					if (ditems.length > 1) {
						dict[ditems[0].trim()] = concatStrings(ditems, 1, ':').trim();
					}
				});
				/*
				for (key in dict) {
					logger("Comment[" + index + "][" + key + "] = '" + dict[key] + "'");
				}
				*/
				if (dict.hasOwnProperty("zdocs")) {
					if (dict['zdocs'].toLowerCase() === 'function') {
						functions.push({
							name : dict['name'],
							parameters : parseParameters(dict['parameters']),
							retval : parseType(dict['retval'], ";"),
							description : dict['description'],
							discussion : dict['discussion'],
							availability : dict['availability']
						});
					} else if (dict['zdocs'].toLowerCase() === 'object') {

					} else if (dict['zdocs'].toLowerCase() === 'filedescription') {
						delete dict['zdocs'];
						filedescription = dict;
					}
				}
			});
		}
		functions.forEach(function(func, index, arr) {
			logger("Found function:\n\tname: " + func.name + "\n\tparameters: " + JSON.stringify(func.parameters));
		});
		var headeritems = [];
		for (key in filedescription) {
			headeritems.push(
				zutils.createItem("paragraph", {
					title : key,
					text : markdown.toHTML(filedescription[key])
				})
			);
		}
		headercategories = [zutils.createCategory("Overview").addItems(headeritems)];
		if (functions.length > 0) {
			var links = [];
			var informationItems = [];
			functions.forEach(function(func, index, arr) {
				links.push(zutils.createItem("link", {
					href : "#" + func.name,
					text : func.name
				}));
				informationItems.push(zutils.createItem("container", {
					items : [
						zutils.createItem("paragraph", {
							text : func.description
						}),
						zutils.createItem("text", {
							text : "(" + func.retval.type + ")" + func.name + prettyParameters(func.parameters)
						})
					],
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

		}
		render = jade.renderFile(__dirname + '/views/generalrenderer.jade', {
			"doccenter" : options.doccenter,
			"stylesheet" : options.stylesheet,
			"pagetitle" : path.lastPathComponent() + " File Reference",
			"categories" : headercategories.concat(prebodycategories.concat(bodycategories))
		});
		return render;
	}
	return "";
};