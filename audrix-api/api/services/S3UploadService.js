'use strict';
let AWS = require('aws-sdk');
var fs = require('fs');

let upload_thumbnail = function (file_data, file_key, callback) {
	AWS.config.update(sails.config.aws_config);
	let s3 = new AWS.S3({apiVersion: '2006-03-01'});

	console.log("Upload : " + file_key);
	// fs.readFile( file_path, function (err, data) {
		// if( err || !data ) {
		// 	console.log("Invalid file : " + fileName );
		// 	return;
		// }
		let params = {
			ContentType:'image/png',
			Key: sails.config.s3_config.base_key_track+'/tracks_thumbnail/'+file_key,
			Body: file_data,
			Bucket : sails.config.s3_config.bucket_name,
			ACL:'public-read'
		};
		s3.putObject(params,function (error, result) {
			return callback(error, result);
		});
	// });
};

module.exports = {
	upload_thumbnail : upload_thumbnail
}