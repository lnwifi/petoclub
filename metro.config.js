// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-browser');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js core modules using node-libs-browser
const extraNodeModules = {};

// Use node-libs-browser for polyfills
Object.keys(nodeLibs).forEach((lib) => {
  if (nodeLibs[lib]) {
    extraNodeModules[lib] = nodeLibs[lib];
  }
});

// Add specific polyfills for WooCommerce integration
config.resolver = {
  extraNodeModules,
  // Handle ESM modules properly
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
};

// Configure resolver to handle Supabase packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
