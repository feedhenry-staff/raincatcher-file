var q = require('q');

/**
 * @param {object} e error object
 */
function _fsErrorHandler(e) {
  console.error(e, e.name);
  throw new Error('Error: ' + e);
}

function _requestFileSystem() {
  var d = q.defer();
  navigator.webkitPersistentStorage.requestQuota(1024 * 1024, function(grantedBytes) {
    window.webkitRequestFileSystem(PERSISTENT, grantedBytes, function(fs) {
      d.resolve(fs);
    }, _fsErrorHandler);
  }, function(e) {
    d.reject(e);
  });
  return d.promise;
}

var fileSystem = {};

fileSystem.init = function() {
  return _requestFileSystem().then(function(fs) {
    fileSystem.ready = true;
    fileSystem.fs = fs;
  }, function(err) {
    fileSystem.ready = false;
    throw new Error('Cannot reserve space on fileSystem' + err);
  });
};

/**
 * @param {string} name fileName/key
 * @param {object} data queue data
 */
fileSystem.writeFile = function(name, contentType, data) {
  var deferredWrite = q.defer();
  var fileData = JSON.stringify(data);

  if (fileSystem.ready) {
    fileSystem.fs.root.getFile(name, {
      create: true
    }, function(fileEntry) {
        // Create a FileWriter object for our FileEntry (log.txt).
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = function() {
          deferredWrite.resolve(true);
        };
        fileWriter.onerror = function(err) {
          deferredWrite.reject('Write failed: ' + err.toString());
        };
        // Create a new Blob and write it to log.txt.
        var blob = new Blob([fileData], { type: contentType });
        fileWriter.write(blob);
      }, _fsErrorHandler);
    }, _fsErrorHandler);
  } else {
    deferredWrite.reject('fileSystem not ready');
  }

  return deferredWrite.promise;
};

/**
 * @param {string} name fileName/key
 */
fileSystem.readFile = function(name) {
  var deferredRead = q.defer();

  if (fileSystem.ready) {
    fileSystem.fs.root.getFile(name, {
      create: false
    }, function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function() {
          deferredRead.resolve(this.result);
        };
        reader.onerror = function(err) {
          deferredRead.reject('Unable to read '+ name +' file, Error: ' + err.toString());
        };
        reader.readAsText(file);
      });
    });
  } else {
    deferredRead.reject('fileSystem not ready');
  }

  return deferredRead.promise;
};

fileSystem.init();

module.exports = fileSystem;