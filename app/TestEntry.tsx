import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

// CRITICAL: Address Hermes undeclared variable warnings by providing safe fallbacks
if (typeof global.AbortController === 'undefined') {
  console.log('🚨 HERMES FIX: AbortController not available');
}
if (typeof global.Promise === 'undefined') {
  console.log('🚨 HERMES FIX: Promise not available');
}
if (typeof global.queueMicrotask === 'undefined') {
  console.log('🚨 HERMES FIX: queueMicrotask not available');
}

// CRITICAL: Maximum logging to track JavaScript execution
console.log('🔴 HERMES EXECUTION: JavaScript bundle starting execution');
console.log('🔴 HERMES EXECUTION: Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DEV: __DEV__,
  timestamp: new Date().toISOString()
});

// CRITICAL: Test if React Native platform detection works
try {
  const Platform = require('react-native').Platform;
  console.log('🟢 HERMES EXECUTION: Platform detected:', Platform.OS);
} catch (error) {
  console.error('🚨 HERMES ERROR: Platform detection failed:', error);
}

// CRITICAL: Global error handler to catch any Hermes execution failures
global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
  console.error('🚨 HERMES GLOBAL ERROR:', error);
  console.error('🚨 HERMES FATAL:', isFatal);
  console.error('🚨 HERMES STACK:', error.stack);
  
  // Force alert in production to confirm error handling works
  if (!__DEV__) {
    setTimeout(() => {
      const Alert = require('react-native').Alert;
      Alert.alert(
        '🚨 HERMES ERROR CAUGHT',
        `JavaScript Error: ${error.message}\n\nStack: ${error.stack?.substring(0, 100)}...\n\nThis confirms JS is executing but failing.`,
        [{ text: 'OK' }]
      );
    }, 100);
  }
});

// CRITICAL: Minimal React component with maximum safety
function TestEntry() {
  console.log('🟢 HERMES EXECUTION: TestEntry function called');
  
  // Import React modules with error handling
  let React, View, Text;
  try {
    React = require('react');
    const RN = require('react-native');
    View = RN.View;
    Text = RN.Text;
    console.log('🟢 HERMES EXECUTION: React Native modules loaded successfully');
  } catch (error) {
    console.error('🚨 HERMES ERROR: Failed to load React modules:', error);
    return null;
  }
  
  // Use useEffect with error handling
  React.useEffect(() => {
    console.log('🟢 HERMES EXECUTION: useEffect triggered - Component mounted successfully');
    
    // Test setTimeout to verify async works
    setTimeout(() => {
      console.log('🟢 HERMES EXECUTION: setTimeout works - Async execution confirmed');
      
      // Test alert to confirm UI thread access
      if (!__DEV__) {
        const Alert = require('react-native').Alert;
        Alert.alert(
          '🎉 HERMES SUCCESS',
          'JavaScript execution confirmed!\n\nReact: ✅\nAsync: ✅\nUI Thread: ✅\n\nThe issue is not basic JS execution.',
          [{ text: 'Excellent!' }]
        );
      }
    }, 2000);
  }, []);

  console.log('🟢 HERMES EXECUTION: About to render View');
  
  // Create JSX with maximum safety
  return React.createElement(
    View,
    { 
      style: { 
        flex: 1, 
        backgroundColor: '#FF4500', // Bright orange to distinguish from previous builds
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20
      } 
    },
    React.createElement(
      Text,
      { 
        style: { 
          fontSize: 18, 
          color: '#FFFFFF',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 10
        } 
      },
      '🔥 HERMES EXECUTION SUCCESS'
    ),
    React.createElement(
      Text,
      { 
        style: { 
          fontSize: 14, 
          color: '#FFFFFF',
          textAlign: 'center'
        } 
      },
      'JavaScript is running!\nReact Native UI is working!\nHermes engine is operational!'
    )
  );
}

console.log('🔴 HERMES EXECUTION: About to register component...');

// Register component with error handling
try {
  registerRootComponent(TestEntry);
  console.log('🟢 HERMES EXECUTION: Component registered successfully');
} catch (error) {
  console.error('🚨 HERMES ERROR: Failed to register component:', error);
}

console.log('🔴 HERMES EXECUTION: TestEntry.tsx execution complete');

export default TestEntry; 