var unescapeLines = function(lines) {
    var i,
        line,
        prevline;
    for (i = lines.length-1; i != 0; i--) {
        line = lines[i];
        prevline = i-1 >= 0 ? lines[i-1] : "";
        if (prevline.slice(-1) === "\\") {
            prevline = prevline.slice(0,-1) + line;
            lines[i-1] = prevline;
            lines.splice(i,1);
        }
    }
    return lines;
}

var txt = "Hello world. This is a string.\n with multiple lines \\\nand letters!";
var stuff = txt.split('\n');
console.log(JSON.stringify(stuff));
console.log(JSON.stringify(unescapeLines(stuff)));
