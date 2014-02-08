var express	= require("express"),
	zdocs	= require("../lib/zdocs"),
    stylus  = require('stylus'),
    nib     = require('nib'),
	app		= express();


var compile = function(str, path) {
    return stylus(str).set('filename', path).set('include css', true).use(nib());
};

app.use(stylus.middleware({
    src : __dirname + '/public',
    compile : compile
}));
app.use(express.static(__dirname + '/public'));

//app.use(express.logger('dev'));
app.use('/', zdocs.middleware({
	paths : ['../lib/', './public/stylesheets/'],
	name : 'zDocs Doc Center',
    stylesheet : '/stylesheets/style.css'
}));

app.use(function(req, res) {
	res.send("404 brah");
});

app.listen(3001);
