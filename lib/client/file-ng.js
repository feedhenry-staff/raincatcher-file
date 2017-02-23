'use strict';

var client = require('./file'),
  _ = require('lodash');

const MODULE_NAME = 'wfm.file.module';
var defaultConf = require("./web-config");


/**
 * Initialize Raincatcher file module
 *
 * @param userConfig - object containing user overrides for default module configuration
 * See ./web-config
 *
 * @returns {string} module name
 */
module.exports = function(userConfig){
  userConfig = userConfig ? userConfig : {};
  _.defaults(userConfig, defaultConf);
  var directivesModule = require('./directives/index');
  var mainModule = angular.module(MODULE_NAME, [
    directivesModule
  ]);
  
  // TODO Remove factory and use mediator
  mainModule.factory('fileClient', function($q){
    var fileClient = {};
    _.forOwn(client, function(value, key){
      if(typeof value === 'function'){
        fileClient[key] = function(){
          return $q.when(client[key].apply(client, arguments));
        };
      }else{
        fileClient[key] = value;
      }
    });
    return fileClient;
  });
  require("./portal.js")(mainModule, userConfig);
  require("./mobile.js")(mainModule, userConfig);
  return MODULE_NAME;
};

