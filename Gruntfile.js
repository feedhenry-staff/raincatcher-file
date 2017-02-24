module.exports = function(grunt){
  'use strict';
  require('load-grunt-tasks')(grunt);
  grunt.initConfig({
    eslint: {
      options: {
        configFile: '.eslintrc'
      },
      target: ["lib/**/*.js"]
    },
    mochify: {
      options: {
        reporter: 'spec'
      },
      unit: {
        src: ['lib/**/*-spec.js']
      }
    },
    wfmTemplate: {
      module: "wfm.file.directives",
      templateDir: "lib/angular/templates",
      outputDir: "lib/angular/dist-templates"
    }
  });
  grunt.loadNpmTasks('fh-wfm-template-build');
  grunt.registerTask('eslint', ['eslint']);
  grunt.registerTask('test', ['mochify:unit']);};
