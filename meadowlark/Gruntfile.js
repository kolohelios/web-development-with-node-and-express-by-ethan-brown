/* eslint no-reserved-keys: 0, camelcase: 0 */
'use strict';

// order of operations: less, cssmin, uglify, hashres

module.exports = function(grunt){
  // load plugins
  [
    'grunt-eslint',
    'grunt-cafe-mocha',
    'grunt-link-checker',
    'grunt-contrib-less',
    'grunt-contrib-uglify',
    'grunt-contrib-cssmin',
    'grunt-hashres',
    'grunt-lint-pattern'
  ].forEach(function(task){
    grunt.loadNpmTasks(task);
  });

  grunt.registerTask('default', ['cafemocha', 'eslint', 'lint_pattern']);
  grunt.registerTask('static', ['less', 'cssmin', 'uglify', 'hashres']);

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
    },
    less: {
      development: {
        files: {
          'public/css/main.css': 'less/main.less',
          'public/css/cart.css': 'less/cart.less'
        },
        options: {
          customFunctions: {
            static: function(lessObject, name){
              return 'url("' + require('./lib/static.js').map(name.value) + '")';
            }
          }
        }
      }
    },
    uglify: {
      all: {
        files: {
          'public/js/meadowlark.min.js': ['public/js/**/*.js', '!public/js/meadowlark*.js']
        }
      }
    },
    cssmin: {
      combine: {
        files: {
          'public/css/meadowlark.css': ['public/css/**/*.css', '!public/css/meadowlark*.css']
        }
      },
      minify: {
        src: 'public/css/meadowlark.css',
        dest: 'public/css/meadowlark.min.css'
      }
    },
    hashres: {
      options: {
        fileNameFormat: '${name}.${hash}.${ext}'
      },
      all: {
        src: [
          'public/js/meadowlark.min.js',
          'public/css/meadowlark.min.css'
        ],
        dest: [
          'config.js'
        ]
      }
    },
    lint_pattern: {
      view_statics: {
        options: {
          rules: [
            {
              pattern: /<link [^>]*href=["'](?!\{static )/,
                message: 'Unmapped static response found in <link>.'
            },
            {
              pattern: /<script [^>]*src=["'](?!\{static )/,
                message: 'Unmapped static response found in <script>.'
            },
            {
              pattern: /<img [^>]*src=["'](?!\{static )/,
                message: 'Unmapped static response found in <img>.'
            }
          ]
        },
        files: {
          src: [
            'views/**/*.handlebars'
          ]
        }
      },
      css_statics: {
        options: {
          rules: [
          {
            pattern: /url\(/,
            message: 'Unmapped static found in LESS property.'
          }]
        },
        files: {
          src: [
            'less/**/*.less'
          ]
        }
      }
    }
  });
};
