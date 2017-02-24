/**
 * Extends file module with mobile application controllers and state handlers
 */
module.exports = function(mainModule, webConfig){
  if(webConfig.globalFileList){
    return;
  }
  mainModule.config(function($stateProvider) {
    $stateProvider
      .state('app.file', {
        url: '/files',
        templateProvider: function($templateCache){
          return $templateCache.get('wfm-template/file-list.tpl.html');
        },
        controller: 'FileController as ctrl',
        resolve: {
          profileData: function(userClient) {
            return userClient.getProfile();
          },
          files: function(fileClient, profileData) {
            return fileClient.list(profileData.id);
          }
        }
      })
      .state('app.file-detail', {
        url: '/file/:fileUid',
        templateProvider: function($templateCache){
          return $templateCache.get("wfm-template/file-detail.tpl.html");
        },
        controller: 'FileDetailController as ctrl',
        resolve: {
          profileData: function(userClient) {
            return userClient.getProfile();
          },
          files: function(fileClient, profileData) {
            return fileClient.list(profileData.id);
          },
          file: function($stateParams, files) {
            return files.filter(function(file) {
              return file.uid === $stateParams.fileUid;
            })[0];
          }
        }
      });
  });
  
  mainModule.controller('FileController', function($state, $window, $mdDialog, mobileCamera, desktopCamera, fileClient, files, profileData) {
    var self = this;
    self.files = files.slice().reverse();
    var captureThenUpload = function() {
      if ($window.cordova) {
        return mobileCamera.capture()
          .then(function(capture) {
            return fileClient.uploadFile(profileData.id, capture.fileURI, {fileName: capture.fileName}).then(mobileCamera.clearCache);
          });
      } else {
        return desktopCamera.capture()
          .then(function(dataUrl) {
            return fileClient.uploadDataUrl(profileData.id, dataUrl);
          });
      }
    };
    
    self.capturePhoto = function() {
      captureThenUpload().then(function() {
        $state.go('app.file', undefined, {reload: true});
      }, function(error) {
        console.error(error);
      });
    };
  });
  
  mainModule.controller('FileDetailController', function($state, $scope, file, mediator) {
    mediator.subscribeForScope('wfm:file:detail:close', $scope, function() {
      $state.go('app.file');
    });
    var self = this;
    self.file = file;
    // set display options specifying which parameters of the file to display
    // should be an array object e.g. all fields {id: true, name: true, uid: true, owner: true, preview:true};
    self.displayOptions = {id: true, name: false, uid: true, owner: false, preview: true};
  });
};

