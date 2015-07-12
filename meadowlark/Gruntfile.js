'use strict';

module.exports = function(grunt){
  // load plugins
  [
    'grunt-eslint',
    'grunt-cafe-mocha',
    'grunt-link-checker'
  ].forEach(function(task){
    grunt.loadNpmTasks(task);
  });

  // configure plugins
  grunt.initConfig({
    cafemocha: {
      all: {src: 'qa/tests-*.js', options: {ui: 'tdd'}}
    },
    eslint: {
      target: ['meadowlark.js', 'public/js/**/*.js,', 'lib/**/*.js', 'Gruntfile.js', 'public/qa/**/*.js', 'qa/**/*.js']
    },
    linkChecker: {
      dev: {
        site: 'localhost',
        options: {
          initialPort: 3000
        }
      }
    }
  });

  // register tasks
  grunt.registerTask('default', ['cafemocha', 'eslint', 'linkChecker']);
};
