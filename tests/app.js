var express	= require("express"),
	zdocs	= require("../lib/zdocs"),
    stylus  = require('stylus'),
    nib     = require('nib'),
	app		= express();

//app.use(express.logger('dev'));
zdocs.stackDoc(app, '/doccenter', {
	paths : ['../lib/', '../lib/public/stylesheets/'],
	name : 'zDocs Doc Center'
});

app.use(function(req, res) {
	res.send("404 brah");
});

app.listen(3001);
