/* global process */
/* eslint-env commonjs */
/* eslint-disable import/no-commonjs */

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logReduxActions: () => process.env.LOG_REDUX_ACTIONS === 'true',
  warnOnDroppedErrors: process.env.WARN_ON_DROPPED_ERRORS === 'true',

  firebaseApp: process.env.FIREBASE_APP,
  firebaseApiKey: process.env.FIREBASE_API_KEY,
  firebaseClientId: process.env.FIREBASE_CLIENT_ID,

  feedbackUrl: 'https://gitreports.com/issue/popcodeorg/popcode',

  bugsnagApiKey: '3cc590a735bc2e50d2a21e467cf62fee',

  gitRevision: process.env.GIT_REVISION,

  googleAnalyticsTrackingId: process.env.GOOGLE_ANALYTICS_TRACKING_ID,
};
