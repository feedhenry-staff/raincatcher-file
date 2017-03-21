'use strict';

var express = require('express'),
  multer = require('multer'),
  config = require('./config'),
  os = require('os'),
  uuid = require('uuid-js'),
  q = require('q'),
  fs = require('fs'),
  base64 = require('base64-stream'),
  through = require('through2'),
  fhGridFs = require('fh-gridfs'),
  MongoDB = require('mongodb'),
  MongoFileHandler = fhGridFs.MongoFileHandler,
  imageDir = os.tmpdir() + '/wfm';

var upload = multer({
  dest: 'uploads/'
});

var fileUpload = upload.single('file');


function getMongoURI() {
  var platformMongo = process.env.FH_MONGODB_CONN_URL;
  var localMongo = 'mongodb://localhost:27017/FH_LOCAL';
  return platformMongo ? platformMongo : localMongo;
}

var DB = {};
var uri = getMongoURI();
var gridFS = new MongoFileHandler();
var MongoClient = MongoDB.MongoClient;

MongoClient.connect(uri, function(err, db) {
  if (err) {
    console.error(err.toString());
    return;
  } else {
    DB = db;
    return DB;
  }
});

fs.mkdir(imageDir, '0775', function(err) {
  if (err && err.code !== 'EEXIST') {
    console.log(err);
    throw new Error(err);
  }
});

function writeStreamToFile(fileMeta, stream) {
  var deferred = q.defer();
  stream.on('end', function() {
    // console.log('File save complete:', filename);
    deferred.resolve(fileMeta);
  });
  stream.on('error', function(error) {
    deferred.reject(error);
  });
  var filename = imageDir + '/' + fileMeta.uid;
  stream.pipe(fs.createWriteStream(filename));
  return deferred.promise;
}

var parseBase64Stream = function(req) {
  var passthrough = false;
  var accumulation = '';
  var stream = req.pipe(through(function(chunk, enc, callback) {
    if (!passthrough) {
      accumulation += chunk;
      var test = ';base64,';
      var index = accumulation.indexOf(test);
      if (index > - 1) {
        passthrough = true;
        chunk = accumulation.substr(index + test.length);
      }
    }
    if (passthrough) {
      this.push(chunk);
    }
    callback();
  }))
    .pipe(base64.decode());
  return stream;
};


function initRouter(mediator) {
  var router = express.Router();
  router.route('/all').get(function(req, res) {
    mediator.publish(config.cloudDataTopicPrefix + config.datasetId + ':list');
    mediator.once('done:' + config.cloudDataTopicPrefix + config.datasetId + ':list', function(files) {
      res.json(files);
    });
  });

  router.route('/owner/:owner').get(function(req, res) {
    mediator.publish(config.cloudDataTopicPrefix + config.datasetId + ':list');
    mediator.once('done:' + config.cloudDataTopicPrefix + config.datasetId + ':list', function(files) {
      var filtered = files.filter(function(file) {
        return String(file.owner) === String(req.params.owner);
      });
      res.json(filtered);
    });
  });

  router.route('/owner/:owner/upload/base64/:filename').post(function(req, res, next) {
    var uid = uuid.create().toString();
    var fileMeta = {
      owner: req.params.owner,
      name: req.params.filename,
      id: uid,
      uid: uid
    };
    var stream = parseBase64Stream(req);
    writeStreamToFile(fileMeta, stream).then(function(fileMeta) {
      return mediator.request(config.cloudDataTopicPrefix + config.datasetId + ':create', fileMeta);
    })
    .then(function(fileMeta) {
      res.json(fileMeta);
    }, function(err) {
      console.log(err);
      next(err);
    });
  });

  router.route('/upload/binary').post(function(req, res, next) {
    req.fileMeta = {
      uid: uuid.create().toString()
    };
    next();
  },
  multer({storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, imageDir);
    },
    filename: function(req, file, cb) {
      cb(null, req.fileMeta.uid);
    }})
  }).single('binaryfile'),
  function(req, res, next) {
    req.fileMeta.name = req.body.fileName;
    req.fileMeta.owner= req.body.ownerId;

    req.fileMeta.mimetype = req.file.mimetype;
    mediator.request(config.cloudDataTopicPrefix + config.datasetId + ':create', req.fileMeta)
    .then(function(fileMeta) {
      res.json(fileMeta);
    }, function(err) {
      console.error(err);
      next(err);
    });
  });

  router.route('/get/:filename').get(function(req, res) {
    var filename = req.params.filename;
    res.sendFile(os.tmpdir() + '/wfm/' + filename);
  });

  router.route('/gridfs/upload').post(function(req, res, next) {
    req.fileMeta = {
      uid: uuid.create().toString()
    };
    next();
  }, fileUpload, function(req, res, next) {
    var fileName = req.body.fileName;
    var readStream = fs.createReadStream(req.file);

    gridFS.saveFile(DB, fileName, readStream, {}, function(err, details) {
      if (err) {
        next(err);
      } else {
        res.status(200).send(details);
      }
    });
  });

  router.route('/gridfs/getFileHistory/:groupId').get(function(req, res, next) {
    var groupId = req.params.groupId;

    gridFS.getFileHistory(DB, groupId, function(err, fileHistory) {
      if (err) {
        next(err);
      } else {
        res.status(200).send(fileHistory);
      }
    });
  });

  router.route('/gridfs/download').post(function(req, res, next) {
    var searchOpts = req.body.searchOpts || {};
    var fileOpts = {};

    gridFS.streamFile(DB, searchOpts, fileOpts, function(err, stream) {
      if (err) {
        next(err);
      } else {
        res.status(200).send(stream);
      }
    });
  });

  return router;
}

module.exports = function(mediator, app) {
  var router = initRouter(mediator);
  app.use(config.apiPath, router);
};
