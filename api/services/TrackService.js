'use strict'

module.exports = {

	mapMongo2ElasticTracks : function( t ) {
		let data = {};
		let artist = t.artist[0];
		let artistArray = artist.split(/,|&/);
		let features = {}, moods = {}; 
		for (let i = 0; i < t.features.length; i++) {
			features['danceability'] = t.features[i].danceability;
			features['energy'] = t.features[i].energy;
			features['acousticness'] = t.features[i].acousticness;
			features['tempo'] = t.features[i].tempo;
			features['valence'] = t.features[i].valence;
			features['speechiness'] = t.features[i].speechiness;
			features['mode'] = t.features[i].mode;
			features['key'] = t.features[i].key;
			features['average_loudness'] = t.features[i].average_loudness;
			features['duration'] = t.features[i].duration;
			features['instrumentalness'] = t.features[i].instrumentalness;
			features['timbre'] = t.features[i].timbre;
			features['dynamic_complexity'] = t.features[i].dynamic_complexity;
			features['onset_rate'] = t.features[i].onset_rate;
			features['lowlevel_danceability'] = t.features[i].lowlevel_danceability;
			features['gender'] = t.features[i].gender;
			features['tonal_atonal'] = t.features[i].tonal_atonal;
			features['beats_count'] = t.features[i].beats_count;
		}

		for (let i = 0; i < t.moods.length; i++) {
			moods['acoustic'] = t.moods[i].acoustic;
			moods['aggressive'] = t.moods[i].aggressive;
			moods['electronic'] = t.moods[i].electronic;
			moods['happy'] = t.moods[i].happy;
			moods['party'] = t.moods[i].party;
			moods['relaxed'] = t.moods[i].relaxed;
			moods['sad'] = t.moods[i].sad;
		}

		data['mongo_id'] = t.features[0].id;
		data['trackId'] = t.trackId;
		data['filename'] = t.filename;
		data['length'] = t.length;
		data['title'] = t.title;
		data['artist'] = artistArray;
		data['album'] = t.album;
		data['year'] = t.year;
		data['genre'] = t.genre || [];
		data['duration'] = t.duration;
		data['features'] = features || {};
		data['moods'] = moods || {};

		return data;
	}

};