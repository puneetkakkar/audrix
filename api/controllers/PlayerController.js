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
const csv = require('csv');
let os = require('os');

os.tmpDir = os.tmpdir;

// var GridStore = mongo.GridStore;
// var MongoClient = mongo.MongoClient,
//   grid = mongo.Grid;


module.exports = {

  uploadTrack: (req, res) => {

    let message,file;

    upload(req, res).then( (FileName) => {
      file = FileName;
      // setTimeout( () => {
        let Origmusic = path.join(__dirname + '/../../uploads/' + file);
        let host = sails.config.connections.localMongo.host;
        let port = sails.config.connections.localMongo.port;
        let database = sails.config.connections.localMongo.database;
        // var uri = 'mongodb://' + host + ':' + port + '/' + db;
        let db = mongo.Db(database, mongo.Server(host, port));
        let finalMetadata;
        let parser = mm(fs.createReadStream(Origmusic), {
          duration: true
        }, (err, metadata) => {
          if (err) throw err;
          else {
            let trackThumbnail,trackThumbnailExt;
            if(typeof(metadata.picture[0]) === 'undefined') {
              trackThumbnail = '';
            } else {
              trackThumbnail = metadata.picture[0].data;
              trackThumbnailExt = metadata.picture[0].format;
              delete metadata['picture']; 
            }
            let trackID = UtilService.generateTrackID();
            if(trackThumbnail) {
              S3UploadService.upload_thumbnail(trackThumbnail, trackID, (err, file) => {
                if (err) {
                  console.log(err);
                }
                else {
                  console.log("Uploaded Image Successfully");
                }
              });

            } else {
              console.log('Track thumbnail not present in original file . Try Uploading again.');
            }
            metadata['trackId'] = trackID;
            metadata['play_count'] = 0;
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
          }
        });
      // }, 20000);
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
        function (err, file, uploadToDatabase) {
          if (err) {
            console.log(err);
            message = "File Not Uploaded Successfully. Try Uploading after some time.";
            return reject(message);
          }
          if (typeof file[0] === 'undefined') {
            console.log("Missing file");
            message = "File Missing.";
            return reject(message);
          } else {
            var source = path.join(__dirname + '/../../uploads/');
            var destination = path.join(__dirname + '/../../uploads/');
            var ffmpeg = spawn('ffmpeg', ['-i', source + uploadFileName, '-acodec', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', destination + newFileName + '.mp3']);

            ffmpeg.stderr.on('error', () => {
              console.log("Failed to Convert Bitrate of File");
              return reject("Failed to Convert Bitrate of File");
            });

            ffmpeg.stderr.on('exit', () => {
              fs.unlinkSync(source + uploadFileName);
              console.log('exiting !!');
            });

            ffmpeg.stderr.on('close', () => {
              fs.unlinkSync(source + uploadFileName);
              console.log('...closing time! bye');
              return resolve(newFileName + '.mp3'); 
            });
          }
        });
      });
    }
  },

  getTrack: (req, res) => {
    console.log('hello');
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

        

        // res.set('content-type', 'audio/mp3');
        // res.set('accept-ranges', 'bytes');
        // res.set('content-range')

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
        } else if (files.length <= 0) {
          return res.status(200).send({
            status: false,
          });
        } else {
          let metadataArray = [],j = 0;
          for (var i = files.length - 1; i >= 0; i--,j++) {
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
              picture: files[i].metadata.picture,
              md5: files[i].md5
            }
          };
          return res.status(200).send({
            status: true,
            metadata: metadataArray
          });
        }
      });
    });
  },

  addTrackFeatures: (req, res) => {
    let filename = req.body.filename;
    let trackId = req.body.trackId;
    let d = new Date();
    const Origmusic = path.join(__dirname + '/../../uploads/' + filename);
    const highLevelProfile = path.join(__dirname + '/../../assets/profile.txt');
    let lowlevelFilename = 'lowlevel_'+ d.getTime() + '_1' + '.json';
    let highlevelFilename = 'highlevel_'+ d.getTime() + '_2' + '.json';
    const lowLevelDestination = path.join(__dirname + '/../../track_features/' + lowlevelFilename);
    const highLevelDestination = path.join(__dirname + '/../../track_features/' + highlevelFilename);
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
          } else {
            const fields = [
            'trackId', 
            'danceability', 
            'energy', 
            'acousticness', 
            'tempo', 
            'valence',
            'speechiness',
            'mode',
            'key',
            'average_loudness',
            'duration',
            'intrumentalness',
            'timbre',
            'dynamic_complexity',
            'onset_rate',
            'lowlevel_danceability',
            'gender_female',
            'gender_male',
            'tonal',
            'beats_count'
            ];

            TrackFeatures.find({
              trackId: trackId
            }).exec( (err, trackFeature) => {

              let featureArray = trackFeature.map( (trackFeature) => {
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
                return features;
              });

              let csvPath = path.join(__dirname + '/../../uploads/features.csv');

              fs.stat(csvPath, function (err, stat) {
                if (err == null) {
                  console.log('File exists');
                 //write the actual data and end with newline

                 var csvData = convertArrayOfObjectsToCSV({
                  data: featureArray,
                  firstTime: 0
                });

                 fs.appendFile(csvPath, csvData, function (err) {
                  if (err) throw err;
                  console.log('The "data to append" was appended to file!');
                });
               }
               else {

                var csvData = convertArrayOfObjectsToCSV({
                  data: featureArray,
                  firstTime: 1
                });

                fs.writeFile(csvPath, csvData, 'utf8', function (err) {
                  if (err) {
                    console.log('Some error occured - file either not saved or corrupted file saved.');
                  } else{
                    console.log('It\'s saved!');
                  }
                });
              }
            });
            });
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

        fs.unlinkSync(Origmusic);
        // fs.unlinkSync(lowLevelDestination);
        fs.unlinkSync(highLevelDestination);

        return res.status(200).send({
          status: true,
          message: 'Track features added successfully'
        });
      });
});
},

addTrackToElastic: (req, res) => {
  let filename = req.body.filename;
  let trackId = req.body.trackId;
  let data = {};

  var host = sails.config.connections.localMongo.host;
  var port = sails.config.connections.localMongo.port;
  var database = sails.config.connections.localMongo.database;
  var db = mongo.Db(database, mongo.Server(host, port));
  db.open( (err) => {
    db.collection('track.files').find({
      'metadata.trackId': trackId
    }).toArray(function(err, files) {
      if (err) {
        return err;
      } else if (files.length <= 0) {
        return res.status(200).send({
          status: false,
        });
      } else {
          // console.log(files);
          var duration = files[0].metadata.duration;
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

          data = {
            trackId: files[0].metadata.trackId,
            filename: files[0].filename,
            length: files[0].length,
            title: files[0].metadata.title,
            artist: files[0].metadata.artist,
            album: files[0].metadata.album,
            year: files[0].metadata.year,
            genre: files[0].metadata.genre,
            duration: trackDuration
          }

          TrackFeatures.find({
            trackId: trackId
          }).exec( (err, TrackFeatures) => {
            if(err)
              console.log('Track features couldn\'t be added');
            else {
              data['features'] = TrackFeatures;
              TrackMoods.find({
                trackId: trackId
              }).exec( (err, TrackMoods) => {
                if(err)
                  console.log('Track features couldn\'t be added');
                else {
                  data['moods'] = TrackMoods;
                  let elasticTracks = TrackService.mapMongo2ElasticTracks(data);
                  ElasticService.createTracksInElastic(elasticTracks)
                  .then(function(response) {
                    const elasticId = response.items[0].index._id;
                    db.collection('track.files').update({
                      'metadata.trackId': trackId
                    },{
                      $set: { 'metadata.elasticId' : elasticId }
                    }, function(err, result) {
                      if(err)
                        throw err;
                      else {
                        return res.status(200).send({
                          status: true,
                          message: 'Data added successfully to Elastic'
                        });
                      } 
                    });
                  })
                  .catch(function (err) {
                    return res.status(408).send({
                      message: err.message
                    })
                  });
                }
              });
            }
          });
        }
      });
  });
}
};

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