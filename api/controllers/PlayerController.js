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
var os = require('os');

os.tmpDir = os.tmpdir;
// var GridStore = mongo.GridStore;
// var MongoClient = mongo.MongoClient,
//   grid = mongo.Grid;


module.exports = {

  getAudioStream: function(req, res) {

    var filePath = path.join(__dirname + '/../../assets/music/song');
    var destination = path.join(__dirname + '/../../assets/music/');

    // var ffmpeg = spawn('ffmpeg', ['-i', filePath + '.mp3', fileName + '.amr', '-acodec', 'libopencore_amrnb', '-ab', '12200k', '-ac', '1', '-ar', '8000']);
    var ffmpeg = spawn('ffmpeg', ['-i', filePath + '.mp3', '-f', 'segment', '-segment_time', '30', '-c', 'copy', destination + 'out%03d.mp3']);
    // input_file.pipe(ffmpeg.stdin);
    // ffmpeg.stdout.pipe(output_stream);

    ffmpeg.stderr.on('data', function(data) {
      console.log(data.toString());
    });

    ffmpeg.stderr.on('end', function() {
      console.log('file has been converted succesfully');
    });

    ffmpeg.stderr.on('exit', function() {
      console.log('child process exited');
    });

    ffmpeg.stderr.on('close', function() {
      console.log('...closing time! bye');
    });
  },

  getAudioSize: function(req, res) {
    var Origmusic = path.join(__dirname + '/../../assets/music/song.mp3');
    var stat = fs.statSync(Origmusic);
    var fileSizeInBytes = stat.size;
    return res.status(200).send({
      status: true,
      size: fileSizeInBytes
    });
  },

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

        db.open(function(err) {
          if (err) return handleError(err);
          var gfs = Grid(db, mongo);
          var writestream = gfs.createWriteStream({
            filename: file,
            mode: 'w',
            chunkSize: 1024,
            content_type: 'audio/mpeg'
          });

          writestream.on('open', function(file) {
            fs.createReadStream(Origmusic).pipe(writestream);
          });


          writestream.on('close', function(file) {
            console.log('done !');
            return res.status(200).send({
              status:true,
              message: 'File Uploaded Successfully'
            });
          });
        });
      }, 5000);
    });

    function upload(req, res, next) {
      return new Promise(function(resolve, reject) {
        const file_name = req.body.filename;
        var newFileName = file_name;

        req.file('file').upload({
            dirname: '../../uploads',
            saveAs: function(_newFileStream, next) {
              return next(undefined, newFileName);
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
              return resolve(newFileName);
            }
          });
      });
    }
  },

  getTrack: function(req, res) {
    var host = sails.config.connections.localMongo.host;
    var port = sails.config.connections.localMongo.port;
    var database = sails.config.connections.localMongo.database;
    var db = mongo.Db(database, mongo.Server(host, port));
    var buffer = "";
    db.open(function(err) {
      var gfs = Grid(db, mongo);
      var readStream = gfs.createReadStream({
        filename: "Alone.mp3",
        mode: 'r',
        chunkSize: 1024,
        content_type: 'audio/mpeg'
      });

      readStream.on("data", function(chunk) {
        buffer += chunk;
      });

      // dump contents to console when complete
      readStream.on("end", function() {
      });
      readStream.pipe(res);
    });


    // gfs.exist({
    //   filename: 'song.mp3'
    // }.toString(function(err, file) {
    //   console.log(file);
    //   if (err || !file) {
    //     res.send('File Not Found');
    //   } else {
    //     var readstream = gfs.createReadStream({
    //       filename: 'song.mp3'
    //     });
    //     readstream.pipe(res);
    //   }
    // }));
    // console.log(gfs.files.findOne({_id : '5a5b942fe388def764a6bbbe' }));
    // gfs.exist({
    //   _id: '5a5b942fe388def764a6bbbe'
    // }, function(err, found) {
    //   console.log(found);
    //   if (err) return handleError(err);
    //   found ? console.log('File exists') : console.log('File does not exist');
    // });

    // gfs.files.find({
    //   filename: 'song.mp3'
    // }, function(err, files) {
    //   var rstream = gfs.createReadStream(files);
    //   var bufs = [];
    //   rstream.on('data', function(chunk) {
    //     bufs.push(chunk);
    //     console.log(bufs);
    //   });
    // .on('error', function() {
    //   res.send();
    // })
    // .on('end', function() { // done
    //
    //   var fbuf = Buffer.concat(bufs);
    //
    //   var File = (fbuf.toString('base64'));
    //   console.log(File);
    //
    //   res.send(File);
    //
    // });

    // if (files.length === 0) {
    //   return res.status(400).send({
    //     message: 'File not found'
    //   });
    // }
    //
    // res.writeHead(200, {
    //   'Content-Type': files[0].contentType
    // });
    //
    // var readstream = gfs.createReadStream({
    //   filename: files[0].filename
    // });
    //
    // console.log(readstream);
    //
    // readstream.on('data', function(chunk) {
    //   res.write(chunk);
    // });
    //
    // readstream.on('end', function() {
    //   res.end();
    // });
    //
    // readstream.on('error', function(err) {
    //   console.log('An error occurred!', err);
    //   throw err;
    // });
    // });



    // gfs.files.find({
    //   _id: '5a5b942fe388def764a6bbbe'
    // }).toString().then(function(err, files) {
    //   if (err) {
    //     res.json(err);
    //   }
    //   if (files.length > 0) {

    //   var mime = files[0].contentType;
    //   var filename = files[0].filename;
    //   console.log(filename);
    //   res.set('Content-Type', mime);
    //   res.set('Content-Disposition', "inline; filename=" + filename);
    //   var read_stream = gfs.createReadStream({
    //     _id: file_id
    //   });
    //   read_stream.pipe(res);
    // } else {
    //   res.json('File Not Found');
    // }
    //   }
    // });
  }
};
