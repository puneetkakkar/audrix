'use strict'

var http = require('http');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
const {
  spawn
} = require('child_process');
const {
  Readable
} = require('stream');
var Grid = require('gridfs-stream');
var mongo = require('mongodb');
var mm = require('musicmetadata');
var os = require('os');

os.tmpDir = os.tmpdir;

// var GridStore = mongo.GridStore;
// var MongoClient = mongo.MongoClient,
//   grid = mongo.Grid;


module.exports = {

  uploadTrack: function(req, res) {

    upload(req, res).then(function(FileName) {
      var file = FileName;
      setTimeout(function() {
        var Origmusic = path.join(__dirname + '/../../uploads/' + file);
        var host = sails.config.connections.localMongo.host;
        var port = sails.config.connections.localMongo.port;
        var database = sails.config.connections.localMongo.database;
        // var uri = 'mongodb://' + host + ':' + port + '/' + db;
        var db = mongo.Db(database, mongo.Server(host, port));
        var finalMetadata;
        var parser = mm(fs.createReadStream(Origmusic), {
          duration: true
        }, function(err, metadata) {
          if (err) throw err;
          // console.log(metadata);
          metadata['trackId'] = UtilService.generateTrackID();
          db.open(function(err) {
            if (err) return handleError(err);
            var gfs = Grid(db, mongo);
            var writestream = gfs.createWriteStream({
              filename: file,
              mode: 'w',
              chunkSize: 1024 * 100,
              content_type: 'audio/mpeg',
              root: 'track',
              metadata: metadata
            });

            writestream.on('open', function(file) {
              fs.createReadStream(Origmusic).pipe(writestream);
            });


            writestream.on('close', function(file) {
              console.log('done !');
              return res.status(200).send({
                status: true,
                message: 'File Uploaded Successfully'
              });
            });
          });
        });
      }, 20000);
    });

    function upload(req, res, next) {
      return new Promise(function(resolve, reject) {
        const file_name = req.body.filename;
        var file_without_extension = file_name.split('.');
        var newFileName = file_without_extension[0];

        var uploadFileName = newFileName + '_' + (new Date()).getTime() + '.mp3';

        req.file('file').upload({
            maxBytes: 50000000,
            dirname: '../../uploads',
            saveAs: function(_newFileStream, next) {
              return next(undefined, uploadFileName);
            }
          },
          function(err, file, uploadToDatabase) {
            if (err) {
              console.log(err);
              return reject(error);
            }
            if (typeof file[0] === 'undefined') {
              console.log("Missing file");
              return reject(error);
            } else {
              var source = path.join(__dirname + '/../../uploads/');
              var destination = path.join(__dirname + '/../../uploads/');
              var ffmpeg = spawn('ffmpeg', ['-i', source + uploadFileName, '-acodec', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', destination + newFileName + '.mp3']);

              ffmpeg.stderr.on('close', function() {
                fs.unlinkSync(source + uploadFileName);
                console.log('...closing time! bye');
              });
              return resolve(newFileName + '.mp3');
            }
          });
      });
    }
  },

  getTrack: function(req, res) {
    if (!req.header('Authorization')) {
      return res.status(401).send({
        message: 'Please make sure your request has an Authorization header'
      });
    }
    var token = '';
    var id = '';
    var credentials = req.header('Authorization').split(' ');
    if (!_.isEmpty(credentials[1])) {
      id = credentials[1];
    } else {
      return res.status(401).send({
        message: 'Please make sure your request has correct Authorization header'
      });
    }
    var host = sails.config.connections.localMongo.host;
    var port = sails.config.connections.localMongo.port;
    var database = sails.config.connections.localMongo.database;
    var db = mongo.Db(database, mongo.Server(host, port));
    var buffer = "";
    db.open(function(err) {
      var gfs = Grid(db, mongo);
      var readStream = gfs.createReadStream({
        _id: id,
        mode: 'r',
        chunkSize: 1024 * 100,
        content_type: 'audio/mpeg',
        root: 'track'
      });

      readStream.on("data", function(chunk) {
        buffer += chunk;
      });

      // dump contents to console when complete
      readStream.on("end", function() {});
      readStream.pipe(res);
    });
  },

  getTrackList: function(req, res) {
    var host = sails.config.connections.localMongo.host;
    var port = sails.config.connections.localMongo.port;
    var database = sails.config.connections.localMongo.database;
    var db = mongo.Db(database, mongo.Server(host, port));
    db.open(function(err) {
      db.collection('track.files').find().toArray(function(err, files) {
        if (err) {
          return err;
        }
        var metadataArray = [];
        for (var i = 0; i < files.length; i++) {
          var duration = files[i].metadata.duration;
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
          metadataArray[i] = {
            id: files[i]._id,
            trackId: files[i].metadata.trackId,
            filename: files[i].filename,
            length: files[i].length,
            title: files[i].metadata.title,
            artist: files[i].metadata.artist,
            album: files[i].metadata.album,
            year: files[i].metadata.year,
            genre: files[i].metadata.genre,
            duration: trackDuration,
            isPlaying: false,
            picture: files[i].metadata.picture
          }
        };
        return res.status(200).send({
          status: true,
          metadata: metadataArray
        });
      });
    });
  }
};
