'use strict';
const Q = require('q');
const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
	host: sails.config.elasticsearch.host
});


module.exports = {
	createTracksInElastic: function(data) {
		return new Promise(function(resolve, reject) {
			client.bulk({
				body: [{
					index: {
						_index: sails.config.elasticsearch.index,
						_type: sails.config.elasticsearch.type
					}
				},
				data
				]
			}, function(err, resp) {
				if (err) {
					return reject(err);
				}
				return resolve(resp);
			});
		});
	},
};