'use strict'

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host: sails.config.elasticsearch.host
});

module.exports = {

	searchTrack: (req, res) => {
		let query = req.body.q;
		client.search({
			index: sails.config.elasticsearch.index,
			type: sails.config.elasticsearch.type,
			from:0,
			size:10,
			body: {
				query: {
					match: {
						catch_all: query
					}
				}
			}
		}).then(function (body) {
			var hits = body.hits.hits;
			var data = processElasticResponse(hits);
			var total = 0;
			return res.status(200).send({status:true, data:data, total:body.hits.total});
		}, function (error) {
			console.log(error.message);
			return res.status(200).send({status:false});
		});
	}
};

var processElasticResponse = function( hits ) {
    var data = [];
    if( (hits === null) || ( typeof hits === 'undefined') || (hits.length === 0) ) {
        return data;
    }

    for( var i=0; i < hits.length; ++i ) {
        var obj = hits[i]._source;
        var res = {};
        res['mid'] = obj['mongo_id'];
        res['trackId'] = obj['trackId'];
        res['eid'] = hits[i]._id;
        res['title'] = obj['title'];
        res['artist'] = obj['artist'];
        res['album'] = obj['album'];
        res['year'] = obj['year'] || undefined;
        res['genre'] = obj['genre'];
        res['duration']= obj['duration'];
        res['isPlaying'] = false;
        res['isStopped'] = true;

        data.push( res );
    }
    return data;
}
