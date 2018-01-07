'use strict'

var http = require('http'),
  fs = require('fs'),
  path = require('path'),
  util = require('util');

module.exports = {

  playAudio: function(req, res) {
    // console.log(__dirname);
    var filePath = path.join(__dirname + '/../../assets/music/song.mp3');
    var readStream = fs.createReadStream(filePath);
    // console.log(req.headers);
    var range = req.headers.range;
    var stats = fs.statSync(filePath);
    var fileSizeInBytes = stats.size;

    if (range) {
      const parts = range.replace("/bytes=/", "").split('-');
      var bytes_start = range[0] ? parseInt(range[0], 10) : 0;
      var bytes_end = range[1] ? parseInt(range[1], 10) : fileSizeInBytes;

      var readStream = fs.createReadStream(filePath, {bytes_start, bytes_end});

      var chunk_size = bytes_end - bytes_start;

      // if (chunk_size == fileSizeInBytes) {
      //   //Serve the whole file as before
      //   res.writeHead(200, {
      //     'Accept-Ranges': 'bytes',
      //     'Content-Type': 'audio/mpeg',
      //     'Content-Length': fileSizeInBytes
      //   });
      //   readStream.pipe(res);
      // } else {
        res.writeHead(200, {
          'Content-Range': 'bytes ' + bytes_start + '-' + bytes_end + '/' + fileSizeInBytes,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileSizeInBytes
        });
        readStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSizeInBytes,
        'Content-Type': 'audio/mpeg',
      }
      res.writeHead(200, head);
      readStream.pipe(res);
    }
  }
};
