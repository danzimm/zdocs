var zutils              = require('./zutils'),
    commentParser       = zutils.commentParser,
    sortedDictionary    = zutils.sortedDictionary,
    fs                  = require('fs');

var processComment = function(comment) {
    var dict = commentParser.parse(comment), 
        comDict = sortedDictionary.create();
    if (dict.hasKey('zdocs') && /filedescription/.test(dict['zdocs'][0])) {
//        dict.removeObjectForKey('zdocs');
        comDict.merge(dict);
    } else {
        comDict.addObject(dict.hasKey('zdocs') ? dict['zdocs'][0] : null, "zdocs");
        comDict.addObject(dict.hasKey("name") ? dict['name'][0] : null, "name");
        comDict.addObject(dict.hasKey("cls") ? dict["cls"][0] : (dict.hasKey("class") ? dict["class"] : null), "cls");
        comDict.addObject(dict.hasKey("supercls") ? dict["supercls"][0] : (dict.hasKey("superclass") ? dict["superclass"] : null), "cls");
        comDict.addObject(dict.hasKey("type") ? dict["type"][0] : null, "type");
        comDict.addObject(commentParser.checkandjoin(dict, "description"), "description");
        comDict.addObject(commentParser.checkandjoin(dict, "discussion"), "discussion");
        comDict.addObject(commentParser.checkandjoin(dict, "availability"), "availability");
        comDict.addObject(commentParser.checkandjoin(dict, "group"), "group");
        comDict.addObject(commentParser.parseAttributes(dict['attributes']), "attributes");
        comDict.addObject(dict.hasKey('clsmeth') ? dict['clsmeth'][0] : null, "clsmeth");
        comDict.addObject(dict.hasKey('retval') ? commentParser.parseType(dict['retval'][0]) : null, "retval");
        comDict.addObject(commentParser.parseParameters(dict['parameter']), "parameters");
    }
    return comDict;
};
var parseSelector = function(sel) {
    var reger = /(\w[\w\d]{0,})\s{0,}(?::\s{0,}\(\s{0,}(\w[\w\d]{0,}[ *]{0,})\s{0,}\)\s{0,}(\w[\w\d]{0,}))?/g,
        stuff,
        retval = {
            selector : "",
            args : []
        },
        i, nparts;
    while (true) {
        stuff = reger.exec(sel);
        if (stuff == null)
            break;
        if (stuff[2] == null && stuff[3] == null) {
            retval.selector = stuff[1];
            retval.args = [];
            break;
        }
        retval.selector += stuff[1] + ":";
        retval.args.push({
            type : stuff[2],
            name : stuff[3]
        });
    }
    return retval;
};

var clsCodeBlocks = {
    "@property\\s{0,}\\(([\\w\\s,]*)\\)\\s{0,}(\\w[\\w\\d]{0,})(\\s+|\\s{0,}\\*+)(\\w[\\w\\d]{0,});" : function(result, update) {
        var attr, t,
            dict = sortedDictionary.create();
        t = result.splice(0,1)[0];
        attr = t.split(",").map(function(a) {
            return a.trim();
        });
        dict.addObject(attr, "attributes");
        t = result.splice(0,2);
        dict.addObject(t[0] + t[1].trim(), "type");
        dict.addObject(result.splice(0,1)[0], "name");
        dict.addObject("property", "zdocs");
        update(result);
        return dict;
    },
    "([-+])\\s{0,}\\(\\s{0,}(\\w[\\w\\d]{0,}\\s{0,}\\*{0,})\\s{0,}\\)\\s{0,}(\\w[\\w\\d]{0,}\\s{0,}(?::\\(\\w[\\w\\d]{0,}[\\s*]{0,}\\)\\w[\\w\\d]{0,})?(?:\\s{0,}(?:\\w[\\w\\d]{0,})?:\\(\\w[\\w\\d]{0,}[\\s*]{0,}\\)\\w[\\w\\d]{0,}){0,})\\s{0,};" : function(result, update) {

        var clsmeth = result.splice(0,1)[0] == '+' ? 'true' : 'false',
            retval = {
                type : result.splice(0,1)[0]
            },
            tmp = parseSelector(result.splice(0,1)[0]),
            selector = tmp.selector,
            args = tmp.args,
            dict = sortedDictionary.create();
        dict.addObject(selector, "name");
        dict.addObject(clsmeth, "clsmeth");
        dict.addObject(retval, "retval");
        dict.addObject(args, "parameters");
        dict.addObject("method", "zdocs");
        update(result);
        return dict;
    }
};

var commentBlocks = {
    "\\/\\*((?:\\*(?!\\/)|[^*])*?)\\*\\/" : function(result, update) {
        var comment = result.splice(0,1)[0],
            comDict, dict;
        update(result);
        comment = comment.replace(/(^|\n)[ \t]{0,}\*[ \t]{0,}/g,"$1");
        return processComment(comment);
    },
    "((?://[\\S \\t]*\\s{0,})+)" : function(result, update) {
        var comment = result.splice(0,1)[0],
            comDict;
        update(result);
        comment = comment.replace(/(^|\n)[ \t]{0,}\/\/[ \t]{0,}/g,"$1");
        return processComment(comment);
    }
};

var codeBlocks = {
    "@interface[\\s]+([\\w][\\w\\d]{0,})[\\s]{0,}:[\\s]{0,}([\\w][\\w\\d]{0,})[\\s]{0,}([\\s\\S]*?)@end" : function(result, update) {
        var dict = sortedDictionary.create(),
            body, data, props = [], meths = [];
        dict.addObject(result.splice(0,1)[0],"cls");
        dict.addObject(result.splice(0,1)[0],"supercls");
        body = result.splice(0,1)[0];
        data = commentParser.extract(body, commentBlocks, clsCodeBlocks);
        data.couples.forEach(function(elm) {
            if (elm['zdocs'] == 'property') {
                props.push(elm);
            } else if (elm['zdocs'] == 'method') {
                meths.push(elm);
            }
        });
        dict.addObject(data.comments, "comments");
        dict.addObject(data.text, "leftover");
        dict.addObject(props, "properties");
        dict.addObject(meths, "methods");
        dict.addObject("class", "zdocs");
        update(result);
        return dict;
    },
    "(\\w[\\w\\d\\s]*?)([\\s*]+)(\\w[\\w\\d]*)\\(([^)]*?)\\)\s{0,}(?:;|\\{)" : function(result, update) {
        var paren = result.splice(-1)[0],
            doer = /(\w[\w\d]*)([\s*]+)(\w[\w\d]*)/,
            dict = sortedDictionary.create(),
            t;
        sepers = paren.split(",").map(function(a) {
            var b = doer.exec(a.trim());
            return {
               type : (b[1] + b[2]).trim(),
               name : b[3]
            };
        });
        t = result.splice(0,2);
        dict.addObject({
            type : t[0] + t[1].trim()
        }, "retval");
        dict.addObject(result.splice(0,1)[0], "name");
        dict.addObject(sepers, "parameters");
        dict.addObject("function", "zdocs");
        update(result);
        return dict;
    },
    "(\\w[\\w\\d\\s]*?)([\\s*]+)(\\w[\\w\\d]*)\\s{0,}(?:;|=)" : function(result, update) {
        var dict = sortedDictionary.create(),
            t = result.splice(0,2);
        dict.addObject(t[0] + t[1].trim(), "type");
        dict.addObject(result.splice(0,1)[0], "name");
        dict.addObject("global", "zdocs");
        update(result);
        return dict;
    }
};

var txt = fs.readFileSync("./DZMagnifyingView.h") + "";

var stuff = commentParser.extract(txt, commentBlocks, codeBlocks),
    i = 0;

for (i = 0; i < stuff.couples.length; i++) {
    console.log("COUPLE:");
    console.log(JSON.stringify(stuff.couples[i]));
}


for (i = 0; i < stuff.comments.length; i++) {
    console.log("COMMENT:");
    console.log(stuff.comments[i]);
}
console.log("LEFTOVERS:\n" + stuff.text);
