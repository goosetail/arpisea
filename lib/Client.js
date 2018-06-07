"use strict";

const fs = require('fs');
const async = require('async');
const path = require('path');
const jade = require('jade');
const express = require('express');
const _ = require('underscore');
const camelize = require('camelize');

module.exports = class Client {

	constructor(config) {
		if (!config) {
			throw new Error('must provide config');
		}

		for (let key in config) {
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

		const libDirStat = fs.statSync(this._libDir);

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

	init(done) {
		const self = this;
		const router = express.Router();

		router.get('/', (req, res) => {

			let config;

			fs.readFile(self._docFile, (err, data) => {

				if (err) {
					throw err;
				}

				try {
					config = JSON.parse(data);
				}
				catch (e) {
					throw e;
				}

				// makes the HTML formatted pretty if the server is set
				config.pretty = this._server.locals.pretty;

				// pass along the rpc route
				config._url = this._url;

				// pass along the version
				config._version = this._version;

				self.updateCurrentState(config, function() {
					res.send(jade.renderFile(path.join(__dirname, '../public/main.jade'), config));
				});
			});
		});

		self._server.use('/arpisea', express.static(path.join(__dirname, '../public')));
		self._server.use(self._url, router);

		setImmediate(done);
	}

	updateCurrentState(config, done) {

		fs.readdir(this._libDir, (err, list) => {

			if (err) {
				return done(err);
			}

			async.each(list, (file, next) => {

				fs.stat(file, (err, stat) => {

					if (!stat) {
						let name = camelize(path.basename(file, '.js'), '-');
						let module = require(path.join(this._libDir, file));
						let lib = _.findWhere(config.libraries, {name: name});

						if (!lib) {
							lib = {
								name: name,
								methods: []
							};

							config.libraries.push(lib);
						}

						_.each(getInstanceMethodNames(module), (methodName) => {

							if (typeof module[methodName] === 'function') {

								let method = _.findWhere(lib.methods, {name: methodName});

								if (!method) {
									lib.methods.push({
										name: methodName,
										autoCreated: true
									});
								}
							}
						});
					}

					next();

				});

			}, done);

		});
	}
};

function getInstanceMethodNames(obj) {
	let array = [];
	let proto = Object.getPrototypeOf(obj);

	Object.getOwnPropertyNames(proto).forEach(name => {
		if (name !== 'constructor') {
			if (hasMethod(proto, name)) {
				array.push(name);
			}
		}
	});

	proto = Object.getPrototypeOf(proto);

	return array;
}

function hasMethod(obj, name) {
	const desc = Object.getOwnPropertyDescriptor(obj, name);
	return !!desc && typeof desc.value === 'function';
}