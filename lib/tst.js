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
    "(?:var\\s+)?(\\w[\\w\\d.]{0,})\\s{0,}=\\s{0,}function\\s{0,}\\(([^)]{0,})\\)" : function(result, update) {
        var name = result.splice(0,1)[0],
            param = result.splice(0,1)[0].split(",").map(function(a) {
                return {
                    name : a.trim()
                };
            }),
            dict = sortedDictionary.create();
        dict.addObject(name,"name");
        dict.addObject(param,"parameters");
        dict.addObject("function", "zdocs");
        update(result);
        return dict;
    },
    "(?:var\\s+)?(\\w[\\w\\d.]{0,})\\s{0,}=\\s{0,}new\\s+(\\w[\\w\\d]{0,})" : function(result, update) {
        var name = result.splice(0,1)[0],
            type = result.splice(0,1)[0],
            dict = sortedDictionary.create();
        dict.addObject(name,"name");
        dict.addObject(type,"type");
        dict.addObject("object","zdocs");
        update(result);
        return dict;
    },
    "(?:var\\s+)?(\\w[\\w\\d.]{0,})\\s{0,}=\\s{0,}(?:\\{|\\(\\s{0,}function)" : function(result, update) {
        var name = result.splice(0,1)[0],
            dict = sortedDictionary.create();
        dict.addObject(name,"name");
        dict.addObject("object","zdocs");
        update(result);
        return dict;
    }
};

var txt = fs.readFileSync("./zdocs.js") + "";

var stuff = commentParser.extract(txt, commentBlocks, codeBlocks, function(a) {
    a.enumerate(function(key,val) {
        if (key === 'name') {
            a[key] = val.replace(/, that\..*$/,"");
        }
    });
    return a;
}), i = 0;

for (i = 0; i < stuff.couples.length; i++) {
    console.log("COUPLE:");
    console.log(JSON.stringify(stuff.couples[i]));
}


for (i = 0; i < stuff.comments.length; i++) {
    console.log("COMMENT:");
    console.log(stuff.comments[i]);
}
//console.log("LEFTOVERS:\n" + stuff.text);

