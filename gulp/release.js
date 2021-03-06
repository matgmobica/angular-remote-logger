'use strict';

//Dependencies
var gulp = require('gulp'),
  $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'minimist']
  });
  $.fs = require('fs');
  $.environment = require('./lib/environment.js');
  $.changelog = require('changelog');
  $.q = require('q');

//CLI parameters
var VERSION_TYPE = $.environment.get('version', 'minor');
$.environment.set('environment', 'production'); //set environment to production

/**
 * Reads the package.json file
 * `fs` is used instead of require to prevent caching in watch (require caches)
 * @returns {json}
 */
function getPackageJson() {
  return JSON.parse($.fs.readFileSync('./package.json', 'utf-8'));
}

gulp.task('checkoutMasterBranch', false, ['build'], function() {

  return $.git.revParse({args:'--abbrev-ref HEAD'}, function(err, currentBranch) {

    if(currentBranch !== 'master') {
      $.git.checkout('master', function(err){
        $.util.log(err);
      });
    }

  });

});

gulp.task('bump', false, ['checkoutMasterBranch'], function() {

  return gulp.src(['./package.json', './bower.json'])
    .pipe($.bump({ type: VERSION_TYPE}))
    .pipe(gulp.dest('./'));

});

gulp.task('commit', false, ['bump', 'changelog'], function() {

  var pkg = getPackageJson();
  var v = 'v' + pkg.version;
  var message = 'Release ' + v;

  return gulp.src('./')
    .pipe($.git.add())
    .pipe($.git.commit(message));

});

gulp.task('release', 'Bumps version, tags release using new version and pushes changes to git origin repo', ['commit'], function () {

  var pkg = getPackageJson();
  var v = 'v' + pkg.version;
  var message = 'Release ' + v;

  $.git.tag(v, message, function(err){
    if (err) throw err;
  });
  $.git.push('origin', 'master', {args: ' --tags'}, function(err){
    if (err) throw err;
  });

}, {
  options: {
    'version [minor]': 'The semantic version type for this release [patch|minor|major]. See http://semver.org/ for information.'
  }
});


gulp.task('changelog', 'Generates a daily changelog from github issues', function() {

  var changelogFilename = './CHANGELOG.md',
      repo = 'github.com/inakianduaga/angular-remote-logger',
      range = $.environment.get('range', 'all'),
      deferred = $.q.defer();

  $.util.log('Generating changelog...');

  $.changelog.generate(repo, range)
    .then(function(data) {

      var markdown = $.changelog.markdown(data);

      $.fs.writeFile(changelogFilename, markdown, function(err) {
        if(err) {
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });
    });

  return deferred.promise;

}, {
  options: {
    'days [all]': 'The days included in the changelog [latest|all|number].'
  }
});
