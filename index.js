"use strict";

var Client = require( './lib/Client' );

module.exports = {
	createClient: createClient
};

function createClient(params) {

	params = params || {};

	return new Client({
		libDir: params.libDir,
		docFile: params.docFile,
		server: params.server,
		url: params.url,
		app: params.app
	});
}
