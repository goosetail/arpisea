"use strict";

var fs = require('fs');
var async = require('async');
var path = require('path');
var jade = require('jade');
var express = require('express');
var _ = require('underscore');
var camelize = require('camelize');

function Client(config) {

	if (!config) {
		throw new Error('must provide config');
	}

	for (var key in config) {
		if (config.hasOwnProperty(key)) {
			this['_' + key] = config[key];
		}
	}

	if (!this._libDir) {
		throw new Error('config field libDir is required');
	}

	if (!fs.existsSync(this._libDir)) {
		throw new Error('config field libDir identifies a missing directory: ' + this._libDir);
	}

	var libDirStat = fs.statSync(this._libDir);

	if (!libDirStat.isDirectory()) {
		throw new Error('config field libDir must identify a directory: ' + this._libDir);
	}

	if (!this._url) {
		throw new Error('config field url is required');
	}

	if (!this._server) {
		throw new Error('config field server is required');
	}

}

Client.prototype.init = function(done) {

	var self = this;
	var router = express.Router();

	router.get('/', function(req, res) {

		fs.readFile(self._docFile, function(err, data) {

			if (err) {
				throw err;
			}

			try {
				var config = JSON.parse(data);
			}
			catch (e) {
				throw e;
			}

			// makes the HTML formatted pretty if the server is set
			config.pretty = self._server.locals.pretty;

			// pass along the rpc route
			config._url = self._url;

			// pass along the version
			config._version = self._version

			self.updateCurrentState(config, function() {
				res.send(jade.renderFile(path.join(__dirname, '../public/main.jade'), config));
			});
		});
	});

	self._server.use('/arpisea', express.static(path.join(__dirname, '../public')));
	self._server.use(self._url, router);

	setImmediate(done);
};

Client.prototype.updateCurrentState = function(config, done) {

	var self = this;

	fs.readdir(this._libDir, function(err, list) {

		if (err) {
			return done(err);
		}

		async.each(list, function(file, next) {

			fs.stat(file, function(err, stat) {

				if (!stat) {
					var name = camelize(path.basename(file, '.js'), '-');
					var module = require(path.join(self._libDir, file));
					var lib = _.findWhere(config.libraries, {name: name});

					if (!lib) {
						lib = {
							name: name,
							methods: []
						};

						config.libraries.push(lib);
					}

					for (var methodName in module) {
						if (module.hasOwnProperty(methodName) && typeof module[methodName] === 'function') {

							var method = _.findWhere(lib.methods, {name: methodName});

							if (!method) {
								lib.methods.push({
									name: methodName,
									autoCreated: true
								});
							}
						}
					}
				}

				next();
			});

		}, done);

	});
};

module.exports = Client;