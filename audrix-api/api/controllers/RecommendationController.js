'use strict'

const math = require('mathjs');
const similarity = require('compute-cosine-similarity');
const _ = require('lodash');
var fs = require('fs');
// const csv = require('csv');
const csv1 = require('fast-csv');
const path = require('path');
const FindInCsv = require('find-in-csv');
var Q = require('q');
var LineByLineReader = require('line-by-line');
const csv=require('csvtojson');
const Grid = require('gridfs-stream');
const mongo = require('mongodb');
const mm = require('musicmetadata');
// const json2csv = require('json2csv');
// const Json2csvParser = require('json2csv').Parser;
// const Json2csvTransform = require('json2csv').Transform;


module.exports = {

	contentBased: (req, res) => {

		if (!req.header('Authorization')) {
			return res.status(401).send({
				message: 'Please make sure your request has an Authorization header'
			});
		}
		var token = '';
		var credentials = req.header('Authorization').split(' ');
		var params = credentials[2].split('+');
		let trackId = params[0];
		let username = params[1];

		PlayHistory.find({
			user: username,
		}).exec( (err, userProfile) => {

			let IdsArray = userProfile.map( (value) => {
				return value.trackId;
			});

			let playArr = userProfile.map( (value)  => {
				return value.play_count;
			});

			getTrackFeatures(IdsArray, playArr).then( (trackFeatures) => {
				console.log(playArr);
				let normalizedArr = [];
				normalizedArr['danceability'] = getNormalizedValue(playArr, trackFeatures, 'danceability');
				normalizedArr['energy'] = getNormalizedValue(playArr, trackFeatures, 'energy');
				normalizedArr['acousticness'] = getNormalizedValue(playArr, trackFeatures, 'acousticness');
				normalizedArr['tempo'] = getNormalizedValue(playArr, trackFeatures, 'tempo');
				normalizedArr['valence'] = getNormalizedValue(playArr, trackFeatures, 'valence');
				normalizedArr['speechiness'] = getNormalizedValue(playArr, trackFeatures, 'speechiness');
				normalizedArr['mode'] = _.floor(getNormalizedValue(playArr, trackFeatures, 'mode'));
				normalizedArr['key'] = _.floor(getNormalizedValue(playArr, trackFeatures, 'key'));
				normalizedArr['average_loudness'] = getNormalizedValue(playArr, trackFeatures, 'average_loudness');
				normalizedArr['duration'] = getNormalizedValue(playArr, trackFeatures, 'duration');
				normalizedArr['instrumentalness'] = getNormalizedValue(playArr, trackFeatures, 'instrumentalness');
				normalizedArr['timbre_bright'] = getNormalizedValue(playArr, trackFeatures, 'timbre_bright');
				normalizedArr['timbre_dark'] = getNormalizedValue(playArr, trackFeatures, 'timbre_dark');
				normalizedArr['dynamic_complexity'] = getNormalizedValue(playArr, trackFeatures, 'dynamic_complexity');
				normalizedArr['onset_rate'] = getNormalizedValue(playArr, trackFeatures, 'onset_rate');
				normalizedArr['lowlevel_danceability'] = getNormalizedValue(playArr, trackFeatures, 'lowlevel_danceability');
				normalizedArr['gender_female'] = getNormalizedValue(playArr, trackFeatures, 'gender_female');
				normalizedArr['gender_male'] = getNormalizedValue(playArr, trackFeatures, 'gender_male');
				normalizedArr['tonal'] = getNormalizedValue(playArr, trackFeatures, 'tonal');
				normalizedArr['beats_count'] = getNormalizedValue(playArr, trackFeatures, 'beats_count');

				console.log(normalizedArr);

				LineByLineReading(normalizedArr).then( (recommendation) => {
					var sorted = sortByScore(recommendation);
					console.log(sorted);

					let trackId = sorted[0].trackId;

					let trackIdArr = sorted.map( (value)  => {
						return value.trackId;
					});

					let number = Math.floor(Math.random() * trackIdArr.length) + 1;

					var host = sails.config.connections.localMongo.host;
					var port = sails.config.connections.localMongo.port;
					var database = sails.config.connections.localMongo.database;
					var db = mongo.Db(database, mongo.Server(host, port));

					db.open( (err) => {
						db.collection('track.files').findOne(
						{
							"metadata.trackId": trackIdArr[number]
						}, function(err, files) {
							if (err) {
								return err;
							} else if (files.length <= 0) {
								return res.status(200).send({
									status: false,
								});
							} else {
								let metadataArray = [],j = 0;
								
								var duration = files.metadata.duration;
								var minutes = Math.floor(duration / 60);
								var seconds = Math.floor(duration - minutes * 60);
								var minuteValue;
								var secondValue;

								if (minutes < 10) {
									minuteValue = '0' + minutes;
								} else {
									minuteValue = minutes;
								}

								if (seconds < 10) {
									secondValue = '0' + seconds;
								} else {
									secondValue = seconds;
								}
								var trackDuration = minuteValue + ':' + secondValue;
								metadataArray = {
									trackId: files.metadata.trackId,
									filename: files.filename,
									length: files.length,
									title: files.metadata.title,
									artist: files.metadata.artist,
									album: files.metadata.album,
									year: files.metadata.year,
									genre: files.metadata.genre,
									duration: trackDuration,
									isPlaying: false,
									isStopped: true,

									md5: files.md5
								}

								return res.status(200).send({
									status: true,
									metadata: metadataArray,
									// trackIdArr: trackIdArr
								});
							}
						}
						);
					});
				});
			});
		});
},

playRecommendedMusic: (req, res) => {

	if (!req.header('Authorization')) {
		return res.status(401).send({
			message: 'Please make sure your request has an Authorization header'
		});
	}
	var token = '';
	var trackId = req.params.id;
	var credentials = req.header('Authorization').split(' ');
	var username = credentials[2];
	var host = sails.config.connections.localMongo.host;
	var port = sails.config.connections.localMongo.port;
	var database = sails.config.connections.localMongo.database;
	var db = mongo.Db(database, mongo.Server(host, port));
	var buffer = "";
	var _id = "";

	db.open((err) => {
		db.collection('track.files').findOne({
			"metadata.trackId": trackId
		}, (err, file) => {
			if (err) {
				return err;
			}
			_id = file._id;
			var gfs = Grid(db, mongo);
			var readStream = gfs.createReadStream({
				_id: _id,
				range: {
					startPos: 0,
					endPos: file.length
				},
				mode: 'r',
				chunkSize: 1024 * 100,
				content_type: 'audio/mpeg',
				root: 'track'
			});

			let content_length;

			readStream.on("open", () => {

				content_length = file.length;
				res.status(206).header({
					'Accept-Ranges': 'bytes',
					'Content-Type': 'application/octet-stream',
					'Content-Length': content_length,
					'Content-Transfer-Encoding': 'chunked',
					'Content-Range': "bytes " + readStream.range.startPos + "-" + readStream.range.endPos + "/" + content_length
				});

			});

			readStream.on("data", function(chunk) {
				buffer += chunk;
			});

			readStream.on("open", () => {

				readStream.pipe(res);
			});

      // dump contents to console when complete
      readStream.on("end", function() {
      	var d = new Date();
      	let params = {
      		user: username,
      		trackId: trackId,
      		play_count: 1,
      		lastPlayed: d.getTime(),
      		like: 0
      	};

      	console.log(params);

      	PlayHistory.findOne({
      		user: username,
      		trackId: trackId
      	}).exec( (err, userHistory) => {
      		if(userHistory) {
      			PlayHistory.update({ 
      				user: userHistory.user, 
      				trackId: userHistory.trackId 
      			},{
      				play_count: userHistory.play_count + 1,
      				lastPlayed: d.getTime(),  
      			}).exec( (err, updated) => {
      				if(err) {
      					console.log('play history not updated');
      				}
      			});
      		} else {
      			PlayHistory.create(params).exec( function(err, history) {
      				if(err) {
      					console.log('play history not created');
      				}
      			});
      		}

      	});    

      });       

    });
	});
}
};	

let LineByLineReading = function (normalizedArr) {
	let cosineSimilarityPromises = [];
	return new Promise((resolve, reject) => {

		var csvPath = path.join(__dirname + '/../../uploads/features.csv');
		var firstLine = true;
		var cosineSimilarity = [];

		var lr = new LineByLineReader( csvPath );

		lr.on('line', function (line) {
			if(firstLine) {
				firstLine = false;
			} else {
				cosineSimilarityPromises.push(getCosineSimilarityVector(line,normalizedArr,firstLine));
			}
		});

		lr.on('end', function () {
			Q.all(cosineSimilarityPromises).then( (cosineSimilarity) => {
				return resolve(cosineSimilarity);
			}).catch( (err) => {
				return reject(err);
			});
		});

	}); 	
};

let getCosineSimilarityVector = function(line,normalizedArr,firstLine) {
	var tempFeatures = [];
	return new Promise( (resolve, reject) => {
		csv({noheader: true})
		.fromString(line)
		.on('csv',(csvRow)=>{ 
			// console.log(csvRow);
			var processedFeatures = processFeature(csvRow);
			tempFeatures.push(processedFeatures);
			// console.log(tempFeatures);
		})
		.on('done',()=>{
			var trackId = tempFeatures[0].trackId;
			delete tempFeatures[0].trackId;
			var itemProfile = _.values(tempFeatures[0]);
			var userProfile = _.values(normalizedArr);
			// console.log(itemProfile);
			// console.log(userProfile);
			tempFeatures = [];
			var s = predictWithContentBased(itemProfile, userProfile, trackId);
				// console.log(s);
				return resolve(s);
			});
	});
}

let processFeature = function (csvRow) {
	let row = [];
	row['trackId'] = csvRow[0];
	row['danceability'] = _.toNumber(csvRow[1]);
	row['energy'] = _.toNumber(csvRow[2]);
	row['acousticness'] = _.toNumber(csvRow[3]);
	row['tempo'] = _.toNumber(csvRow[4]);
	row['valence'] = _.toNumber(csvRow[5]);
	row['speechiness'] = _.toNumber(csvRow[6]);
	row['mode'] = _.toNumber(csvRow[7]);
	row['key'] = _.toNumber(csvRow[8]);
	row['average_loudness'] = _.toNumber(csvRow[9]);
	row['duration'] = _.toNumber(csvRow[10]);
	row['instrumentalness'] = _.toNumber(csvRow[11]);
	row['timbre_bright'] = _.toNumber(csvRow[12]);
	row['timbre_dark'] = _.toNumber(csvRow[13]);
	row['dynamic_complexity'] = _.toNumber(csvRow[14]);
	row['onset_rate'] = _.toNumber(csvRow[15]);
	row['lowlevel_danceability'] = _.toNumber(csvRow[16]);
	row['gender_female'] = _.toNumber(csvRow[17]);
	row['gender_male'] = _.toNumber(csvRow[18]);
	row['tonal'] = _.toNumber(csvRow[19]);
	row['beats_count'] = _.toNumber(csvRow[20]);
	return row;
}

let getNormalizedValue = function(playArr, trackFeatures, property) {
	var sumOfplayCount = _.sum(playArr);
	var playCount = playArr.map( (value) => _.divide(value/sumOfplayCount));
	var result = _.mapValues(trackFeatures[0], (value, key) => _.map(trackFeatures, key));
	var d = result[property].map((value, index) => _.multiply(playCount[index] * value) );
	var f = _.sum(d);
	return f;
}

function mergeNames (arr) {
	return _.chain(arr).groupBy('danceability').mapValues(function (v) {
		return _.chain(v).pluck('danceability').flattenDeep();
	}).value();
}

var getTrackFeatures = function(trackIds, playArr) {
	var trackFeaturePromises = [];
	return	new Promise( (resolve, reject) => {
		for (var i = 0; i < trackIds.length; i++) {
			trackFeaturePromises.push(getTrackFeaturePromise(trackIds[i]))
		}
		Q.all(trackFeaturePromises).then( (feature) => {
			return resolve(feature);
		}).catch( (err) => {
			return reject(err);
		});
	});
};

var getTrackFeaturePromise = function(trackId) {
	// console.log(trackId);
	return new Promise( (resolve, reject) => {
		TrackFeatures.findOne({ trackId: trackId}).exec( (err, trackFeature) => {
			if(err) {
				reject(err);
				return;
			}
			let features = {};
			features['trackId'] = trackFeature.trackId;
			features['danceability'] = trackFeature.danceability.danceable;
			features['energy'] = trackFeature.energy;
			features['acousticness'] = trackFeature.acousticness;
			features['tempo'] = trackFeature.tempo;
			features['valence'] = trackFeature.valence;
			features['speechiness'] = trackFeature.speechiness;
			features['mode'] = trackFeature.mode;
			features['key'] = trackFeature.key;
			features['average_loudness'] = trackFeature.average_loudness;
			features['duration'] = trackFeature.duration;
			features['instrumentalness'] = trackFeature.instrumentalness;
			features['timbre_bright'] = trackFeature.timbre.bright;
			features['timbre_dark'] = trackFeature.timbre.dark;
			features['dynamic_complexity'] = trackFeature.dynamic_complexity;
			features['onset_rate'] = trackFeature.onset_rate;
			features['lowlevel_danceability'] = trackFeature.lowlevel_danceability;
			features['gender_female'] = trackFeature.gender.female;
			features['gender_male'] = trackFeature.gender.male;
			features['tonal'] = trackFeature.tonal_atonal.tonal;
			features['beats_count'] = trackFeature.beats_count;
			return resolve(features);
		});
	});
};	

function predictWithContentBased(itemProfile, userProfile, trackId) {
	const contentBasedRecommendation = {};
	const cosineSimilarity = getCosineSimilarityRowVector(itemProfile, userProfile);

	contentBasedRecommendation['score'] = cosineSimilarity;
	contentBasedRecommendation['trackId'] = trackId;

	return contentBasedRecommendation;
}

function sortByScore(recommendation) {
	return recommendation.sort((a, b) => b.score - a.score);
}

function getCosineSimilarityRowVector(itemMatrix, userMatrix) {
	return similarity(itemMatrix, userMatrix);
}

function convertArrayOfObjectsToCSV(args) {  
	var result, ctr, keys, columnDelimiter, lineDelimiter, data, firstTime;

	data = args.data || null;
	firstTime = args.firstTime;
	if (data == null || !data.length) {
		return null;
	}

	columnDelimiter = args.columnDelimiter || ',';
	lineDelimiter = args.lineDelimiter || '\n';

	keys = Object.keys(data[0]);

	result = '';

	if (firstTime == 1) {
		result += keys.join(columnDelimiter);
		result += lineDelimiter;
	}

	data.forEach(function(item) {
		ctr = 0;
		keys.forEach(function(key) {
			if (ctr > 0) result += columnDelimiter;

			result += item[key];
			ctr++;
		});
		result += lineDelimiter;
	});

	return result;
}