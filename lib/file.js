'use strict';

var config = require('./config'),
  QUEUE = require('./queue'),
  fsModule = require('./fileSystem.js'),
  q = require('q');

var client = {};

client.init = function() {
  var deferredFhinit = q.defer();
  $fh.on('fhinit', function(error) {
    if (error) {
      deferredFhinit.reject(new Error(error));
      return;
    }
    client.cloudUrl = $fh.getCloudURL();
    deferredFhinit.resolve();
  });

  var deferredReady = q.defer();
  if (window.cordova) {
    document.addEventListener("deviceready", function cameraReady() {
      deferredReady.resolve();
    }, false);
  } else {
    deferredReady.resolve();
  }

  var deferredInitUploadsQueue = q.defer();
  if (!client.uploads) {
    client.uploads = new QUEUE(config.queue.uploadsLabel, config.queue.storageType) || {};
    deferredInitUploadsQueue.resolve();
  } else if (client.uploads.ready) {
    deferredInitUploadsQueue.resolve();
  }

  var deferredInitDownloadsQueue = q.defer();
  if (!client.downloads) {
    client.downloads = new QUEUE(config.queue.downloadsLabel, config.queue.storageType) || {};
    deferredInitDownloadsQueue.resolve();
  } else if (client.downloads.ready) {
    deferredInitUploadsQueue.resolve();
  }

  client.fs = fsModule.fs;

  client.initPromise = q.all([
    deferredFhinit.promise,
    deferredReady.promise,
    deferredInitUploadsQueue.promise,
    deferredInitDownloadsQueue.promise
  ]);

  return client.initPromise;
};

client.uploadDataUrl = function(userId, dataUrl) {
  var deferred = q.defer();
  if (arguments.length < 2) {
    deferred.reject('Both userId and a dataUrl parameters are required.');
  } else {
    $fh.cloud({
      path: config.apiPath + '/owner/' + userId + '/upload/base64/photo.png',
      method: 'post',
      data: dataUrl
    }, function(res) {
      deferred.resolve(res);
    }, function(message, props) {
      var e = new Error(message);
      e.props = props;
      deferred.reject(e);
    });
  }
  return deferred.promise;
};

client.list = function(userId) {
  var url = arguments.length === 0 ? config.apiPath + '/all' :
      config.apiPath + '/owner/' + userId;
  var deferred = q.defer();
  $fh.cloud({
    path: url,
    method: 'get'
  }, function(res) {
    deferred.resolve(res);
  }, function(message, props) {
    var e = new Error(message);
    e.props = props;
    deferred.reject(e);
  });
  return deferred.promise;
};

function fileUpload(fileURI, serverURI, fileUploadOptions) {
  var deferred = q.defer();
  var transfer = new FileTransfer();
  transfer.upload(fileURI, serverURI, function uploadSuccess(response) {
    deferred.resolve(response);
  }, function uploadFailure(error) {
    deferred.reject(error);
  }, fileUploadOptions);
  return deferred.promise;
}

function fileUploadRetry(fileURI, serverURI, fileUploadOptions, timeout, retries) {
  return fileUpload(fileURI, serverURI, fileUploadOptions)
      .then(function(response) {
        return response;
      }, function() {
        if (retries === 0) {
          throw new Error("Can't upload to " + JSON.stringify(serverURI));
        }
        return q.delay(timeout).then(function() {
          return fileUploadRetry(fileURI, serverURI, fileUploadOptions, timeout, retries - 1);
        });
      });
}

client.uploadFile = function(userId, fileURI, options) {
  if (arguments.length < 2) {
    return q.reject('userId and fileURI parameters are required.');
  } else {
    options = options || {};
    var fileUploadOptions = new FileUploadOptions();
    fileUploadOptions.fileKey = options.fileKey || 'binaryfile';
    fileUploadOptions.fileName = options.fileName;
    fileUploadOptions.mimeType = options.mimeType || 'image/jpeg';
    fileUploadOptions.params = {
      ownerId: userId,
      fileName: options.fileName
    };
    var timeout = options.timeout || 2000;
    var retries = options.retries || 1;
    return client.initPromise.then(function() {
      var serverURI = window.encodeURI(client.cloudUrl + config.apiPath + '/upload/binary');
      return fileUploadRetry(fileURI, serverURI, fileUploadOptions, timeout, retries);
    });
  }
};

client.processQueue = function() {
  return client.initPromise.then(function() {
    return client.uploads.recoverQueue();
  }).then(function(processingQueue) {
    if (processingQueue) {
      client.uploads.queue.forEach(function(item) {
        if (window && window.cordova) {
          return client.uploadFile(item.userId, item.filePath, {
            fileName: item.fileName
          });
        } else {
          return client.uploadDataUrl(item.userId, item.filePath);
        }
      });
    } else {
      return;
    }
  });
};

client.persistQueue = function() {
  var d = q.defer();
  client.uploads.save().then(function(success) {
    d.resolve(success);
  }, function(error) {
    d.reject(error);
  });
  return d.promise;
};

client.init();

module.exports = client;