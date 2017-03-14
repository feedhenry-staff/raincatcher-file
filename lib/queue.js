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
  this.queueName = config.queue.prefix + this.type;
  this.storageType = cacheType !== undefined ? cacheType : config.storageType;
  this.queue = [];
  this.ready = true;
};

QUEUE.prototype.save = function() {
  localStorage.setItem(this.queueName, JSON.stringify({ queue: this.queue }));
};

QUEUE.prototype.recoverQueue = function() {
  var d = q.defer();
  if (localStorage.getItem(this.queueName) !== null) {
    var data = JSON.parse(localStorage.getItem(this.queueName));
    this.queue = data.queue;
    d.resolve(true);
  } else {
    d.reject(false);
  }
  return d.promise;
};

QUEUE.prototype.getStorageType = function() {
  return this.cacheType;
};

QUEUE.prototype.getCount = function() {
  return this.queue.length;
};

QUEUE.prototype.getQueueName = function() {
  return this.queueName;
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.addItem = function(item) {
  if (_existsInQueue(this.queue, item)) {
    return;
  }
  this.queue.push(item);
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.removeItem = function(item) {
  if (!_existsInQueue(this.queue, item)) {
    return;
  }
  _.remove(this.queue, item);
};

/**
 * @param {object} item meta data model
 */
QUEUE.prototype.updateItem = function(id, key, val) {
  this.queue.filter(function(item) {
    if (item.id === id) {
      item[key] = val;
      return item;
    }
  });
};

module.exports = QUEUE;