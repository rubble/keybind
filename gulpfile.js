const babel = require("gulp-babel"),
  gulp = require("gulp"),
  karma = require("karma"),
  bump = require("gulp-bump"),
  license = require("gulp-license"),
  jsdoc = require("gulp-jsdoc3"),
  rename = require("gulp-rename"),
  streamify = require("gulp-streamify"),
  uglify = require("gulp-uglify");

gulp.task('dev', () => {
  return gulp.src('src/keybind.js')
    .pipe(babel({
      presets: ["es2015"]
    }))
    .pipe(license("MIT", {
      organization: "Rubble LTD. All rights reserved."
    }))
    .pipe(gulp.dest('dist'))
    .pipe(rename("keybind.min.js"))
    .pipe(streamify(uglify()))
    .pipe(license("MIT", {
      organization: "Rubble LTD. All rights reserved.",
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('jsdoc', () => {
  const conf = require("./conf.json");
  return gulp.src(['./src/keybind.js'], {read: false})
    .pipe(jsdoc(conf));
});

gulp.task('watch', ['dev'], () => {
  gulp.watch('./src/*.js', ['dev', 'jsdoc']);
});

gulp.task('bump', () => {
  return gulp.src('./package.json')
    .pipe(bump({
      type: 'patch'
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('build', ['dev', 'bump']);

