const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { resolve } = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['expo-router']
    },
  }, argv);
  
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
    'url': require.resolve('url/'),
    'http': require.resolve('stream-http'),
    'https': require.resolve('https-browserify'),
    'os': require.resolve('os-browserify/browser'),
    'zlib': require.resolve('browserify-zlib'),
  };

  // Configure fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    net: false,
    tls: false,
    dns: false,
    child_process: false,
  };

  // Provide polyfills
  config.plugins.push(
    new (require('webpack').ProvidePlugin)({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Add source map support
  if (process.env.NODE_ENV !== 'production') {
    config.devtool = 'source-map';
  }


  return config;
};
