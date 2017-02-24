'use strict';

var MODULE_NAME = "wfm.file.directives";

angular.module(MODULE_NAME, ['wfm.core.mediator']);

module.exports = MODULE_NAME;

// Directive definitions
require('./imgDirective');
require('./fileDetailDirective');
// Precompiled versions of templates
require('../dist-templates');

