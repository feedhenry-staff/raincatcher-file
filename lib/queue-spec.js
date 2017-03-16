var assert = require('assert'),
  _ = require('lodash');

describe('Queue', function() {
  var queue = {},
    fileTestQ = {},
    lsTestQ = {};

  var item = {
    'id': 1,
    'hello': 'world',
    'date': Date.now()
  };

  before(function() {
    queue = require('./queue');
    lsTestQ = new queue('lsTestQ', 'localStorage');
    fileTestQ = new queue('fileTestQ', 'file');
  });

  it('should return new queue with name lsTestQ', function() {
    assert.equal(lsTestQ.queueName, 'fh.wfm.file.queue.lsTestQ');
  });

  it('should return new queue with name fileTestQ', function() {
    assert.equal(fileTestQ.queueName, 'fh.wfm.file.queue.fileTestQ');
  });

  it('lsTestQ should have storageType of localStorage', function() {
    assert.equal(lsTestQ.storageType, 'localStorage');
  });

  it('fileTestQ should have storageType of file', function() {
    assert.equal(fileTestQ.storageType, 'file');
  });

  it('should allow item to be added to lsTestQ queue array', function() {
    lsTestQ.addItem(item);
    var lsExists = _.includes(lsTestQ.queue, item);
    assert.equal(lsExists, true);

    fileTestQ.addItem(item);
    var fileExists = _.includes(fileTestQ.queue, item);
    assert.equal(fileExists, true);
  });

  it('should get response equal to item object from both queues', function() {
    lsTestQ.readItem().then(function(res) {
      assert.equal(res, item);
    });

    fileTestQ.readItem().then(function(res) {
      assert.equal(res, item);
    });
  });

  it('should update hello prop value to `update test`', function() {
    lsTestQ.updateItem(1, 'hello', 'update test');
    lsTestQ.readItem().then(function(item) {
      assert.equal(item.hello, 'update test');
    });

    fileTestQ.updateItem(1, 'hello', 'update test');
    fileTestQ.readItem().then(function(item) {
      assert.equal(item.hello, 'update test');
    });
  });

  it('should remove item from both arrays', function() {
    lsTestQ.removeItem(item).then(function() {
      assert.equal(lsTestQ.queue.length, 0);
    });

    fileTestQ.removeItem(item).then(function() {
      assert.equal(fileTestQ.queue.length, 0);
    });
  });
});