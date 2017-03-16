'use strict';

var config = require('./config'),
  q = require('q'),
  fileSystem = require('./fileSystem'),
  _ = require('lodash');

// example meta data item model schema
// {
//  id: <string>,
//  fileName: <string>,
//  filePath: <fileURi>,
//  createdTs: <timestamp>,
//  uploadedTs: <timestamp>,
//  result:  <result>,
//  userId: <string>
//  step:  <step>,
//  retries: 3
//  status: <waiting|inprogress|success|failed|retry>
// }

/**
 * @param  {object} queue array of q items
 * @param {object} item meta-data model
 */
function _existsInQueue(queue, item) {
  return _.includes(queue, item);
}

/**
 * @param {string} type
 * @param {string} cacheType
 */
var QUEUE = function(type, cacheType) {
  this.queueName = config.queue.prefix + type;
  this.storageType = cacheType !== undefined ? cacheType : config.storageType;
  this.queue = [];
  this.ready = true;
};

QUEUE.prototype.save = function() {
  var d = q.defer();

  if (this.storageType === 'file') {
    return fileSystem.writeFile(this.fileName, config.queue.fileContentType, {
      queue: this.queue
    }).then(function(success) {
      d.resolve(success);
    }, function(error) {
      d.reject(error);
    });
  } else {
    localStorage.setItem(this.fileName, JSON.stringify({ queue: this.queue }));
    d.resolve(true);
  }

  return d.promise;
};

QUEUE.prototype.recoverQueue = function() {
  var self = this;
  var d = q.defer();

  if (this.storageType === 'file') {
    return fileSystem.readFile(this.fileName).then(function(data) {
      var fileData = JSON.parse(data);
      self.queue = fileData.queue;
      d.resolve(true);
    }, function() {
      d.reject(false);
    });
  } else {
    var queueData = localStorage.getItem(this.queueName);
    if (queueData !== null) {
      var fileData = JSON.parse(queueData);
      this.queue = fileData.queue;
      d.resolve(true);
    } else {
      d.reject(false);
    }
  }

  return d.promise;
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.addItem = function(item) {
  var d = q.defer();
  if (_existsInQueue(this.queue, item)) {
    d.reject('Item already added to queue');
  } else {
    this.queue.push(item);
    d.resolve(true);
  }
  return d.promise;
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.removeItem = function(item) {
  var d = q.defer();
  if (!_existsInQueue(this.queue, item)) {
    d.reject('Cannot find queue item.');
  } else {
    _.remove(this.queue, item);
    d.resolve(true);
  }
  return d.promise;
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.updateItem = function(id, key, val) {
  var d = q.defer();
  this.queue.filter(function(item) {
    if (item.id === id) {
      item[key] = val;
      d.resolve(true);
    } else {
      d.reject('Queue item not updated');
    }
  });
  return d.promise;
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.readItem = function(id) {
  var d = q.defer();
  this.queue.filter(function(item) {
    if (item.id === id) {
      d.resolve(item);
    } else {
      d.reject('Unable to read queue item');
    }
  });
  return d.promise;
};

module.exports = QUEUE;