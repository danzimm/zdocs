var express	= require("express"),
	zdocs	= require("../lib/zdocs"),
	stylus = require('stylus'),
	nib = require('nib'),
	app		= express();


function compile(str, path) {
	return stylus(str).set('filename', path).use(nib());
}

app.use(express.logger('dev'));
app.use(stylus.middleware({
	src : __dirname + "/public",
	compile : compile
}));
app.use(express.static(__dirname + '/public'));

app.use('/', zdocs.middleware({
	path : '../lib',
	name : 'Test Documentation Center',
	stylesheet : '/stylesheets/style.css'
}));

app.use(function(req, res) {
	res.send("404 brah");
});

app.listen(3001);
