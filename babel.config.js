module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add module resolver for Node.js core modules
      ['module-resolver', {
        alias: {
          'stream': 'stream-browserify',
          'crypto': 'crypto-browserify',
          'buffer': 'buffer',
          'process': 'process/browser',
          'util': 'util',
          'string_decoder': 'string_decoder',
        }
      }]
    ]
  };
};
