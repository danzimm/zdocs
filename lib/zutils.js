
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
		if (items.hasOwnProperty(name)) {
			return items[name](name, context);
		} else {
			return items["default"](name, context);
		}
	};
	that.createCategory = function(name, options) {
		return (function() {
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
		})();
	};
	that.registerItem("default", domItem);
	that.registerItem("paragraph", domParagraphItem);
	that.registerItem("unorderedList", domUnorderedListItem);
	that.registerItem("span", domSpanItem);
	that.registerItem("text", domTextItem);
	that.registerItem("link", domLinkItem);
	that.registerItem("container", domContainerItem);
	return that;
})();

module.exports = dominie;
