// 'use strict';

module.exports = {
  apiHost: 'http://localhost:8080',
  apiPath: '/file/wfm',
  cloudDataTopicPrefix: 'wfm:cloud:data:',
  datasetId: 'file',
  queue: {
    prefix: 'fh.wfm.file.queue.',
    storageType: 'localStorage',
    uploadsLabel: 'uploads',
    downloadsLabel: 'downloads',
    fileContentType: 'application/json'
  }
};