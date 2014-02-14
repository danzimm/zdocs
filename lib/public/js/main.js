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
    that.changeWidth = function(width) {
        var container = document.getElementById("container");
        container.style.left = width+'';
        sidebar.style.width = width+'';
    };
    var showingSidebar = true;
    that.toggleSidebar = function(show) {
        if (show === undefined || show === null) {
            that.toggleSidebar(!showingSidebar);
        } else {
            if (show === showingSidebar)
                return;
            showingSidebar = show;
            if (showingSidebar) {
                that.changeWidth('228px');
            } else {
                that.changeWidth('0');
            }
        }
    };
    window.onload = function() {
        var handles, i,
            sidebarWidth = function(fin) {
                if (fin >= 10 && fin <= 228) {
                    that.changeWidth(fin + 'px');
                }        
                if (fin <= 80) {
                    sidebar.style['overflow-y'] = 'hidden';
                } else {
                    sidebar.style['overflow-y'] = 'auto';
                }
            };
        sidebar = document.getElementById("sidebar");
        toc = document.getElementById("toc");
        sidebar.onclick = toc.onclick = function(event) {
            //that.toggleSidebar();
        };
        handle = document.getElementById("handle");
        handle.addEventListener("mousedown", function(event) {
            handle.initial = parseInt(sidebar.offsetWidth) - event.clientX;
            event.preventDefault();
        });
        window.addEventListener("mousemove", function(event) {
            if (handle.initial !== undefined) {
                var pos = event.clientX;
                sidebarWidth(pos+handle.initial);
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
            sidebarWidth(checkWidth());
        }
    };
    return that;
})();
