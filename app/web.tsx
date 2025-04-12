import { Slot, SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * This is a special file for web platform handling in Expo Router
 * It helps fix routing issues specific to the web platform
 */
export default function WebLayout() {
  const [isReady, setIsReady] = useState(false);
  
  // Add any web-specific initialization here
  useEffect(() => {
    // Fix for web platform specific issues
    if (typeof window !== 'undefined') {
      // Ensure global objects are available
      if (!window.URL) {
        window.URL = URL;
      }
      
      if (!window.URLSearchParams) {
        window.URLSearchParams = URLSearchParams;
      }
      
      // Fix for String methods if they're somehow undefined
      if (!String.prototype.slice) {
        String.prototype.slice = function(start: number, end?: number): string {
          return this.substring(start, end !== undefined ? end : this.length);
        };
      }
      
      // Fix for String.prototype.startsWith if it's somehow undefined
      if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(searchString: string, position?: number): boolean {
          const pos = position || 0;
          return this.indexOf(searchString, pos) === pos;
        };
      }
      
      // Fix for String.prototype.endsWith if it's somehow undefined
      if (!String.prototype.endsWith) {
        String.prototype.endsWith = function(searchString: string, position?: number): boolean {
          const subjectString = this.toString();
          const pos = position === undefined || position > subjectString.length 
            ? subjectString.length 
            : position;
          const adjustedPosition = pos - searchString.length;
          const lastIndex = subjectString.indexOf(searchString, adjustedPosition);
          return lastIndex !== -1 && lastIndex === adjustedPosition;
        };
      }
    }
    
    // Mark as ready after initialization
    setIsReady(true);
    SplashScreen.hideAsync();
  }, []);
  
  // Show a loading indicator until everything is ready
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return <Slot />;
}
