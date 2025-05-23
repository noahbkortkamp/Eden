// Import polyfills first - must be before other imports
import './polyfills';

// Import essential modules first
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { preventAutoHideAsync, hideAsync } from 'expo-splash-screen';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';

// Keep the splash screen visible while we fetch resources
preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Test polyfill initialization
// This is a verification that our ReadableStream polyfill was loaded correctly
try {
  if (typeof ReadableStream !== 'undefined') {
    console.log('✅ ReadableStream polyfill is available globally');
    const testStream = new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    console.log('✅ ReadableStream can be instantiated successfully');
  } else {
    console.error('❌ ReadableStream is not defined globally');
  }
} catch (error) {
  console.error('❌ Error testing ReadableStream:', error);
}

// Main App component with proper initialization
function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Load resources and initialize
  useEffect(() => {
    async function prepare() {
      try {
        console.log('⚡ Initializing app...');
        
        // Import the router
        require('expo-router/entry');
      } catch (e) {
        console.warn('Error during initialization:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }
    
    prepare();
  }, []);
  
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await hideAsync();
    }
  }, [appIsReady]);
  
  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Initializing app...</Text>
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {/* Expo Router renders here */}
    </View>
  );
}

// Register the root component properly
registerRootComponent(App);

// Export for web compatibility
export default App; 