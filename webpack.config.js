const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { resolve } = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Add Node.js polyfills
  config.resolve.alias = {
    ...config.resolve.alias,
    'stream': require.resolve('stream-browserify'),
    'crypto': require.resolve('crypto-browserify'),
    'buffer': require.resolve('buffer'),
    'process': require.resolve('process/browser'),
    'util': require.resolve('util'),
    'string_decoder': require.resolve('string_decoder'),
    'events': require.resolve('events'),
    'assert': require.resolve('assert'),
    'path': require.resolve('path-browserify'),
  };

  // Provide polyfills
  config.plugins.push(
    new (require('webpack').ProvidePlugin)({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  return config;
};
