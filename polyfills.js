// This file sets up polyfills for Node.js core modules in React Native
// Import polyfills
import { Buffer } from 'buffer';
import process from 'process';
import { Platform } from 'react-native';

// Make Buffer and process available globally
global.Buffer = Buffer;
global.process = process;

// Fix for web platform specific issues
if (Platform.OS === 'web') {
  // Ensure URL and URLSearchParams are available
  if (typeof global.URL === 'undefined') {
    global.URL = URL;
  }
  if (typeof global.URLSearchParams === 'undefined') {
    global.URLSearchParams = URLSearchParams;
  }
  
  // Fix for undefined slice error in Expo Router
  if (!String.prototype.slice) {
    String.prototype.slice = function(start, end) {
      return this.substring(start, end !== undefined ? end : this.length);
    };
  }
  
  // Fix for String.prototype.startsWith if it's somehow undefined
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
      position = position || 0;
      return this.indexOf(searchString, position) === position;
    };
  }
  
  // Fix for String.prototype.endsWith if it's somehow undefined
  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
      const subjectString = this.toString();
      if (position === undefined || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      const lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };
  }
}
