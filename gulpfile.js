const fs = require('fs');
const path = require('path');
const https = require('https');

const gulp = require('gulp');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const cssnano = require('cssnano');
const forOwn = require('lodash.forown');
const postcss = require('gulp-postcss');
const postcssPresetEnv = require('postcss-preset-env');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const cloudflare = require('cloudflare');
const BrowserSync = require('browser-sync');
const pify = require('pify');
const isDocker = require('is-docker');

const config = require('./src/config');
const webpackConfiguration = require('./webpack.config');

const browserSync = BrowserSync.create();
const srcDir = 'src';
const distDir = 'dist';
const stylesheetsDir = path.join(srcDir, 'css');
const highlightStylesheetsDir = 'node_modules/highlight.js/styles';
const staticDir = path.join(srcDir, 'static');
const bowerComponents = 'bower_components';

const postcssBrowsers = [];
const supportedBrowsers = JSON.parse(fs.readFileSync('./config/browsers.json'));
forOwn(supportedBrowsers, (version, browser) => {
  let browserForPostcss = browser;
  if (browser === 'msie') {
    browserForPostcss = 'ie';
  } else if (browser === 'chromium') {
    return;
  }
  postcssBrowsers.push(`${browserForPostcss} >= ${version}`);
});

gulp.task('static', () =>
  gulp.src(path.join(staticDir, '**/*')).pipe(gulp.dest(distDir)),
);

gulp.task('css', () => {
  const processors = [
    postcssPresetEnv({
      features: {
        'nesting-rules': true,
      },
      browsers: postcssBrowsers,
    }),
  ];
  if (process.env.NODE_ENV === 'production') {
    processors.push(cssnano());
  }

  return gulp
    .src([
      path.join(bowerComponents, 'normalize-css/normalize.css'),
      path.join(highlightStylesheetsDir, 'github.css'),
      path.join(stylesheetsDir, '**/*.css'),
    ])
    .pipe(concat('application.css'))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(postcss(processors))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(distDir))
    .pipe(browserSync.stream());
});

gulp.task(
  'js',
  () =>
    new Promise((resolve, reject) => {
      webpack(webpackConfiguration(process.env.NODE_ENV), (error, stats) => {
        if (error) {
          reject(error);
          return;
        }

        if (stats.hasErrors()) {
          reject(new Error(stats.toJson().errors.join('\n\n')));
          return;
        }

        if (stats.hasWarnings()) {
          // eslint-disable-next-line no-console
          console.warn(stats.toJson().warnings);
        }

        resolve(stats);
      });
    }),
);

gulp.task('build', ['static', 'css', 'js']);

gulp.task('syncFirebase', async () => {
  const data = await pify(fs).readFile(
    path.resolve(__dirname, 'config/firebase-auth.json'),
  );
  const firebaseSecret = process.env.FIREBASE_SECRET;
  if (!firebaseSecret) {
    throw new Error('Missing environment variable FIREBASE_SECRET');
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: `${config.firebaseApp}.firebaseio.com`,
        path: `/.settings/rules.json?auth=${firebaseSecret}`,
        method: 'PUT',
      },
      res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          res.on('data', reject);
        }
      },
    );

    req.write(data);
    req.end();
  });
});

gulp.task('dev', ['browserSync', 'static', 'css'], () => {
  gulp.watch(path.join(staticDir, '/**/*'), ['static']);
  gulp.watch(path.join(stylesheetsDir, '**/*.css'), ['css']);
  gulp.watch(path.join(distDir, '*')).on('change', browserSync.reload);
});

gulp.task('browserSync', ['static'], () => {
  const compiler = webpack(webpackConfiguration(process.env.NODE_ENV));
  compiler.plugin('invalid', browserSync.reload);
  browserSync.init({
    ghostMode: false,
    notify: false,
    open: !isDocker(),
    reloadOnRestart: true,
    server: {
      baseDir: distDir,
      middleware: [
        webpackDevMiddleware(compiler, {
          lazy: false,
        }),
      ],
    },
  });
});

gulp.task('purgeCache', () =>
  cloudflare({
    email: process.env.CLOUDFLARE_EMAIL,
    key: process.env.CLOUDFLARE_KEY,
  }).zones.purgeCache(process.env.CLOUDFLARE_ZONE, {
    files: [
      `https://${process.env.HOSTNAME}/index.html`,
      `https://${process.env.HOSTNAME}/application.css`,
    ],
  }),
);
