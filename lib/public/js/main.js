var SB = (function() {
    // helpers
    // {{{
    function setCookie(cname,cvalue,exdays) {
        var d = new Date();
        d.setTime(d.getTime()+(exdays*24*60*60*1000));
        var expires = "expires="+d.toGMTString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    };
    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i].trim();
            if (c.indexOf(name)==0) 
                return c.substring(name.length,c.length);
        }
        return "";
    };
    function checkWidth() {
        var width = getCookie("sbwidth");
        if (width != "") {
            return parseInt(width);
        } else {
            return null;
        }
    };
    // }}}
    var that = {},
        sidebar, toc;
    that.changeWidth = function(fin) {
        if (!toc)
            return;
        if (fin >= 10 && fin <= 228) {
            var container = document.getElementById("container");
            container.style.left = fin+'px';
            sidebar.style.width = fin+'px';
        }        
        if (fin <= 80) {
            sidebar.style['overflow-y'] = 'hidden';
        } else {
            sidebar.style['overflow-y'] = 'auto';
        }
    };
    that.toggleSidebar = function() {
        var showingSidebar = parseInt(sidebar.offsetWidth) >= 80;
        if (showingSidebar) {
            that.changeWidth(10);
        } else {
            that.changeWidth(228);
        }
        setCookie("sbwidth",sidebar.offsetWidth,365*10);
    };
    window.onload = function() {
        hljs.initHighlighting();
        sidebar = document.getElementById("sidebar");
        toc = document.getElementById("toc");
        if (toc) {
            toc.onclick = function(event) {
                that.toggleSidebar();
            };
        }
        handle = document.getElementById("handle");
        handle.addEventListener("mousedown", function(event) {
            handle.initial = parseInt(sidebar.offsetWidth) - event.clientX;
            event.preventDefault();
        });
        window.addEventListener("mousemove", function(event) {
            if (handle.initial !== undefined) {
                that.changeWidth(event.clientX+handle.initial);
                event.preventDefault();
            }
        });
        window.addEventListener("mouseup", function(event) {
            if (handle.initial) {
                event.preventDefault();
                setCookie("sbwidth",sidebar.offsetWidth,365*10);
            }
            handle.initial = undefined;
        });
        if (checkWidth() != null) {
            that.changeWidth(checkWidth());
        }
    };
    return that;
})();
