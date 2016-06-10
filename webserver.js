#!/usr/bin/env node
"use strict";

var nodeStatic = require("node-static"),
	fs = require("fs"),
	http = require("http"),
	https = require("https"),
	chalk = require("chalk"),
	getopt = require("posix-getopt"),
	ssl = {
		key: fs.readFileSync(__dirname + "/key.pem"),
		cert: fs.readFileSync(__dirname + "/cert.pem")
	},
	parser = new getopt.BasicParser("d:(directory)s(ssl)p:(port)", process.argv),
	opt,
	directory,
	port,
	protocol;

while ((opt = parser.getopt()) !== undefined) {
	switch (opt.option) {
	case 'd':
		directory = opt.optarg;
		break;
	case 's':
		protocol = "https";
		break;
	case 'p':
		port = opt.optarg;
		break;
	}
}

var file = new(nodeStatic.Server)(directory, {cache: 600}),
	files = fs.readdirSync(directory),
	htmlFile;

for(var i in files) {
	if(/index.*html/.test(files[i])) {
		htmlFile = files[i];
	}
}

runserver(protocol || "http", port || process.env.PORT || 8080);

function runserver(protocol, port) {
	if (protocol === "https") {
		https.createServer(ssl, serveHTTP).listen(port);
	} else {
		http.createServer(serveHTTP).listen(port);
	}
	log(protocol + "://localhost:" + port.toString());
}

function serveHTTP(req, res) {

	// redirect */blog/* urls to the augur.org/blog archive
	if (req.url.match(/\/blog\//)) {
		res.writeHead(302, {"Location": "http://www.augur.org" + req.url});
		return res.end();
	}

    // static URIs
	var re = /\/(styles\.css|splash\.css|images|fonts|build\.js|augur\.min\.js)/;

    // route to app if not static URI
	if (!req.url.match(re)) req.url = "/" + htmlFile;

	file.serve(req, res, function (err, result) {
		if (err) {
			console.error("Error serving %s: %s", req.url, err.message);
			res.writeHead(err.status, err.headers);
			res.end();
		} else {
			log(req.url);
		}
	});
}

function log(str) {
	console.log(chalk.cyan.dim("[augur]"), str);
}
