/**
 * Extends file module with portal demo application controllers and state handlers
 */
module.exports = function(mainModule, webConfig){
  if(!webConfig.globalFileList){
    return;
  }
  
  // Configure state providers
  mainModule.config(function($stateProvider){
    $stateProvider
      .state('app.file', {
        url: '/files',
        resolve: {
          files: function(fileClient){
            return fileClient.list();
          },
          workerMap: function(userClient){
            return userClient.list().then(function(workers){
              return workers.reduce(function(map, worker){
                map[worker.id] = worker;
                return map;
              }, {});
            });
          }
        },
        views: {
          column2: {
            templateProvider: function($templateCache){
              return $templateCache.get("wfm-template/portal-file-list.tpl.html");
            },
            controller: 'FileListController as ctrl'
          },
          'content': {
            templateProvider: function($templateCache){
              return $templateCache.get("wfm-template/portal-empty-list.tpl.html");
            }
          }
        }
      })
      .state('app.file.detail', {
        url: '/file/:fileUid',
        resolve: {
          file: function($stateParams, files){
            return files.filter(function(file){
              return file.uid === $stateParams.fileUid;
            })[0];
          }
        },
        views: {
          'content@app': {
            template: '<file-detail file="ctrl.file" display-options="ctrl.displayOptions"></file-detail>',
            controller: 'FileDetailController as ctrl'
          }
        }
      });
  });
  
  mainModule.run(function($state, mediator){
    mediator.subscribe('wfm:file:selected', function(file){
      $state.go('app.file.detail', {
          fileUid: file.uid
        },
        {reload: true}
      );
    });
  });
  
  mainModule.controller('FileListController', function($scope, files, workerMap){
    var self = this;
    $scope.$parent.selected = {id: null};
    self.files = files;
    self.workerMap = workerMap;
  });
  
  mainModule.controller('FileDetailController', function($scope, $state, file, workerMap, mediator){
    mediator.subscribeForScope('wfm:file:close:', $scope, function(){
      $state.go('app.file');
    });
    var self = this;
    $scope.$parent.selected = {id: file.id};
    self.file = file;
    // set display options specifying which parameters of the file to display
    // should be an array object e.g. all fields {id: true, name: true, uid: true, owner: true, preview:true};
    self.displayOptions = {id: true, name: true, uid: true, owner: true, preview: true};
    self.workerMap = workerMap;
  });
};