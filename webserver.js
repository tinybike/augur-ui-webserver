#!/usr/bin/env node
"use strict";

var nodeStatic = require("node-static"),
	fs = require("fs"),
	http = require("http"),
	https = require("https"),
	chalk = require("chalk"),
	getopt = require("posix-getopt"),
	execFile = require('child_process').execFile,
	ssl = {
		key: fs.readFileSync(__dirname + "/key.pem"),
		cert: fs.readFileSync(__dirname + "/cert.pem")
	},
	parser = new getopt.BasicParser("d:(directory)s(ssl)p:(port)", process.argv),
	opt,
	directory,
	port,
	protocol,
	files,
	indexFile;

// parse passed-in cli options
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

// set param defaults if opts not passed in
protocol = protocol || "http";
port = port || process.env.PORT || 8080;

// create index of file paths to see if they match later
execFile('find', [directory, ' -type f '], function(doNotHandleThisErr, stdout, stderr) {
	files =
		stdout.split('\n')
		.filter(function(path) {
			return path.length && path !== directory;
		})
		.reduce(function(p, path) {
			var cleanPath = path.replace(directory, '/').replace(/[/]+/, '/');

			// find main index file
			if(/index.*html/.test(cleanPath)) {
				indexFile = cleanPath;
			}

			p[cleanPath] = true;

			return p;
		}, {});

	startServer();
});

function startServer() {
	var staticServer = new(nodeStatic.Server)(directory, {cache: 600});

	if (protocol === "https") {
		https.createServer(ssl, serveHTTP).listen(port);
	}
	else {
		http.createServer(serveHTTP).listen(port);
	}

	log(protocol + "://localhost:" + port.toString());

	function serveHTTP(req, res) {

		// if the file doesn't exist, use the default index file
		if (!files[req.url]) {
			req.url = indexFile;
		}

		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader("X-XSS-Protection", "1; mode=block");

		staticServer.serve(req, res, function (err, result) {
			if (err) {
				console.error("Error serving %s: %s", req.url, err.message);
				res.writeHead(err.status, err.headers);
				res.end();
			}
			else {
				log(req.url);
			}
		});
	}
}

function log(str) {
	console.log(chalk.cyan.dim("[augur]"), str);
}
