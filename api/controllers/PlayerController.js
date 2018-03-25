'use strict'

const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  spawn
} = require('child_process');
const {
  Readable
} = require('stream');
const Grid = require('gridfs-stream');
const mongo = require('mongodb');
const mm = require('musicmetadata');
let os = require('os');

os.tmpDir = os.tmpdir;

// var GridStore = mongo.GridStore;
// var MongoClient = mongo.MongoClient,
//   grid = mongo.Grid;


module.exports = {

  uploadTrack: (req, res) => {

    upload(req, res).then( (FileName) => {
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
                message: 'File Uploaded Successfully',
                trackId: metadata['trackId'],
                filename: file
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

  getTrack: (req, res) => {
    if (!req.header('Authorization')) {
      return res.status(401).send({
        message: 'Please make sure your request has an Authorization header'
      });
    }
    var token = '';
    var id = req.params.id;
    var credentials = req.header('Authorization').split(' ');
    // if (!_.isEmpty(credentials[1])) {
    //   id = credentials[1];
    // } else {
    //   return res.status(401).send({
    //     message: 'Please make sure your request has correct Authorization header'
    //   });
    // }

    var host = sails.config.connections.localMongo.host;
    var port = sails.config.connections.localMongo.port;
    var database = sails.config.connections.localMongo.database;
    var db = mongo.Db(database, mongo.Server(host, port));
    var buffer = "";
    var _id = "";

    res.set('content-type', 'audio/mp3');
    res.set('accept-ranges', 'bytes');

    db.open((err) => {
      db.collection('track.files').findOne({
        "metadata.trackId": id
      }, (err, file) => {
        if (err) {
          return err;
        }
        _id = file._id;
        var gfs = Grid(db, mongo);
        var readStream = gfs.createReadStream({
          _id: _id,
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
    });
  },

  getTrackList: (req, res) => {
    var host = sails.config.connections.localMongo.host;
    var port = sails.config.connections.localMongo.port;
    var database = sails.config.connections.localMongo.database;
    var db = mongo.Db(database, mongo.Server(host, port));
    db.open( (err) => {
      db.collection('track.files').find().toArray(function(err, files) {
        if (err) {
          return err;
        }
        let metadataArray = [],j = 0;
        for (var i = files.length - 1; i > files.length - 8; i--,j++) {
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
          metadataArray[j] = {
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
            isStopped: true,
            picture: files[i].metadata.picture
          }
        };
        return res.status(200).send({
          status: true,
          metadata: metadataArray
        });
      });
    });
  },

  addTrackFeatures: (req, res) => {
    let filename = req.body.filename;
    let trackId = req.body.trackId;
    const Origmusic = path.join(__dirname + '/../../uploads/' + filename);
    const highLevelProfile = path.join(__dirname + '/../../assets/profile.txt');
    const lowLevelDestination = path.join(__dirname + '/../../track_features/lowlevel.json');
    const highLevelDestination = path.join(__dirname + '/../../track_features/highlevel.json');
    const lowLevel = spawn('streaming_extractor_music', [Origmusic, lowLevelDestination]);
    lowLevel.stderr.on('close', () => {
      let rawData = fs.readFileSync(lowLevelDestination);
      let lowLevelFeatures = JSON.parse(rawData);
      const highLevel = spawn('streaming_extractor_music_svm', [lowLevelDestination, highLevelDestination, highLevelProfile]);
      highLevel.stderr.on('close', () => {
        let rawData = fs.readFileSync(highLevelDestination);
        let highLevelFeatures = JSON.parse(rawData);
        const highlevel = highLevelFeatures.highlevel;
        const lowlevel = lowLevelFeatures.lowlevel;
        let energy = Math.pow(10, (Math.log(lowlevel.average_loudness) / 0.67));
        let mode,key;
        if(lowLevelFeatures.tonal.key_scale === 'minor') {
          mode = 0;
        } else {
          mode = 1;
        }
        switch(lowLevelFeatures.tonal.key_key) {
          case 'C':
          key = 0;
          break;
          case 'C#':
          key = 1;
          break;
          case 'D': 
          key = 2;
          break;
          case 'D#':
          key = 3;
          break;
          case 'E':
          key = 4;
          break;
          case 'F':
          key = 5;
          break;
          case 'F#': 
          key = 6;
          break;
          case 'G':
          key = 7;
          break;
          case 'G#':
          key = 8;
          break;
          case 'A':
          key = 9;
          break;
          case 'A#': 
          key = 10;
          break;
          case 'B':
          key = 11;
          break;
          default:
          break;
        }
        let featureParams = {
          trackId: trackId,
          danceability: highlevel.danceability.all,
          energy: energy,
          acousticness: highlevel.mood_acoustic.all.acoustic,
          tempo: lowLevelFeatures.rhythm.bpm,
          valence: highlevel.mood_happy.probability,
          speechiness: highlevel.voice_instrumental.all.voice,
          mode: mode, 
          key: key,
          average_loudness: lowlevel.average_loudness,
          duration: highLevelFeatures.metadata.audio_properties.length,
          instrumentalness: highlevel.voice_instrumental.all.instrumental,
          timbre: highlevel.timbre.all,
          dynamic_complexity: lowlevel.dynamic_complexity,
          onset_rate: lowLevelFeatures.rhythm.onset_rate,
          lowlevel_danceability: lowLevelFeatures.rhythm.danceability,
          gender: highlevel.gender.all,
          tonal_atonal: highlevel.tonal_atonal.all,
          beats_count: lowLevelFeatures.rhythm.beats_count
        };

        let moodParams = {
          trackId: trackId,
          acoustic: highlevel.mood_acoustic,
          aggressive: highlevel.mood_aggressive,
          electronic: highlevel.mood_electronic,
          happy: highlevel.mood_happy,
          party: highlevel.mood_party,
          relaxed: highlevel.mood_relaxed,
          sad: highlevel.mood_sad,
        };

        let genreParams = {
          trackId: trackId,
          genre: highLevelFeatures.metadata.tags.genre
        };

        TrackFeatures.create(featureParams).exec( (err, trackFeatures) => {
          if (err) { 
            return res.serverError(err); 
          }
        });

        TrackMoods.create(moodParams).exec( (err, trackMoods) => {
          if (err) { 
            return res.serverError(err); 
          }
        });

        TrackGenre.create(genreParams).exec( (err, trackGenre) => {
          if (err) { 
            return res.serverError(err); 
          }
        });

        return res.status(200).send({
          status: true,
          message: 'Track features added successfully'
        });
      });
    });
  }
};
