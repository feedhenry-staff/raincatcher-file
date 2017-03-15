var q = require('q');

/**
 * @param {object} e error object
 */
function _fsErrorHandler(e) {
  console.error(e, e.name);
  throw new Error('Error: ' + e);
}

var _requestedFileSystem = {};
function _checkEnv() {
  var d = q.defer();

  if (window.requestFileSystem) {
    _requestedFileSystem = window.requestFileSystem;
    d.resolve(true);
  } else if (window.webkitRequestFileSystem) {
    _requestedFileSystem = window.webkitRequestFileSystem;
    d.resolve(true);
  } else {
    d.reject(false);
  }

  if (window.LocalFileSystem) {
    PERSISTENT = window.LocalFileSystem.PERSISTENT;
  } else if (window.PERSISTENT) {
    PERSISTENT = window.PERSISTENT;
  }

  return d.promise;
}

function _requestFS() {
  var d = q.defer();
  _checkEnv().then(function(fileSystemAvailable) {
    if (fileSystemAvailable) {
      _requestedFileSystem(PERSISTENT, 1024 * 1024, function(fs) {
        d.resolve(fs);
      }, function(e) {
        console.error(e, e.name);
        d.reject(e.name);
      });
    } else {
      d.reject('Unable to retrieve fileSystem.');
    }
  });
  return d.promise;
}

var fileSystem = {};

fileSystem.init = function() {
  var d = q.defer();
  _requestFS().then(function(fs) {
    fileSystem.fs = fs;
    d.resolve(true);
  }, function(errorMsg) {
    d.reject(errorMsg);
  });
  return d.promise;
};

/**
 * @param {string} name directory name
 */
fileSystem.getDir = function(name) {
  var d = q.defer();
  if (fileSystem.ready) {
    fileSystem.fs.root.getDirectory(name, {
      create: true
    }, function(dirEntry) {
      d.resolve(dirEntry);
    }, function(error) {
      d.reject(error.toString());
    });
  } else {
    d.reject('fileSystem not ready');
  }
  return d.promise;
};

/**
 * @param {string} name fileName/key
 * @param {string} contentType file content type
 * @param {object} data queue data
 */
fileSystem.writeFile = function(name, contentType, data) {
  var d = q.defer();
  var fileData = JSON.stringify(data);
  if (fileSystem.ready) {
    fileSystem.fs.root.getFile(name, {
      create: true
    }, function(fileEntry) {
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = function() {
          d.resolve(true);
        };
        fileWriter.onerror = function(err) {
          d.reject('Write failed: ' + err.toString());
        };
        var blob = new Blob([fileData], { type: contentType });
        fileWriter.write(blob);
      }, _fsErrorHandler);
    }, _fsErrorHandler);
  } else {
    d.reject('fileSystem not ready');
  }

  return d.promise;
};

/**
 * @param {string} name fileName/key
 */
fileSystem.readFile = function(name) {
  var d = q.defer();
  if (fileSystem.ready) {
    fileSystem.fs.root.getFile(name, {
      create: false
    }, function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function() {
          d.resolve(this.result);
        };
        reader.onerror = function(err) {
          d.reject('Unable to read '+ name +' file, Error: ' + err.toString());
        };
        reader.readAsText(file);
      });
    });
  } else {
    d.reject('fileSystem not ready!');
  }
  return d.promise;
};

// init fieSysten module
fileSystem.init().then(function(ready) {
  fileSystem.ready = ready;
}, function(errorMsg) {
  console.error(errorMsg);
});

module.exports = fileSystem;