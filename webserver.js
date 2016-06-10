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
	args = process.argv.slice(2);

if (!args.length) {
	console.error("Argument required for build folder, ex: augur-ui-webserver './build'");
	process.exit();
}

var homedir = args[0],
	file = new(nodeStatic.Server)(homedir, {cache: 600}),
	htmlFile,
	files = fs.readdirSync(homedir);

for(var i in files) {
	if(/index.*html/.test(files[i])) {
		htmlFile = files[i];
	}
}

function log(str) {
	console.log(chalk.cyan.dim("[augur]"), str);
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

function runserver(protocol, port) {
	if (protocol === "https") {
		https.createServer(ssl, serveHTTP).listen(port);
	} else {
		http.createServer(serveHTTP).listen(port);
	}
	log(protocol + "://localhost:" + port.toString());
}

(function init(args) {
	var opt, port, protocol, parser;
	parser = new getopt.BasicParser("s(ssl)p:(port)", args);
	while ((opt = parser.getopt()) !== undefined) {
		switch (opt.option) {
		case 's':
			protocol = "https";
			break;
		case 'p':
			port = opt.optarg;
			break;
		}
	}
	runserver(protocol || "http", port || process.env.PORT || 8080);
})(process.argv);
