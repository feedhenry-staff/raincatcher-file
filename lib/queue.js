'use strict';

var config = require('./config'),
  q = require('q'),
  _ = require('lodash');

// meta data item model schema
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
  localStorage.setItem(this.queueName, JSON.stringify({ queue: this.queue }));
  d.resolve();
  return d.promise;
};

QUEUE.prototype.recoverQueue = function() {
  var d = q.defer();
  var queueData = localStorage.getItem(this.queueName);
  if (queueData !== null) {
    var data = JSON.parse(queueData);
    this.queue = data.queue;
    d.resolve(true);
  } else {
    d.reject(false);
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
      d.reject('Queue item no updated');
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
      d.reject('Queue item no updated');
    }
  });
  return d.promise;
};

module.exports = QUEUE;