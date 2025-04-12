// Polyfills for Node.js core modules in React Native
global.Buffer = require('buffer').Buffer;
global.process = require('process');

// Add other global polyfills as needed
if (typeof window !== 'undefined') {
  window.Buffer = global.Buffer;
  window.process = global.process;
}
