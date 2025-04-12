// Import polyfills first
import './polyfills';
import { Buffer } from 'buffer';
import process from 'process';
import { Platform } from 'react-native';

// Make Buffer and process available globally
global.Buffer = Buffer;
global.process = process;

// Web platform specific polyfills
if (Platform.OS === 'web') {
  // Ensure URL and URLSearchParams are available
  if (typeof global.URL === 'undefined') {
    global.URL = URL;
  }
  if (typeof global.URLSearchParams === 'undefined') {
    global.URLSearchParams = URLSearchParams;
  }
  
  // Fix for String.prototype methods if they're somehow undefined
  if (!String.prototype.slice) {
    String.prototype.slice = function(start, end) {
      return this.substring(start, end !== undefined ? end : this.length);
    };
  }
}

// Import the main entry point
import 'expo-router/entry';
