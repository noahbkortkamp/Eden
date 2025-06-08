// MINIMAL TEST ENTRY - Isolate crash point
console.log('🔥 MINIMAL TEST STARTING');

// Test 1: Environment variables
console.log('🔥 Test 1: Environment variables');
console.log('ENV keys:', Object.keys(process.env).length);
console.log('EXPO keys:', Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')));
console.log('Supabase URL:', !!process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_URL?.length || 0);
console.log('Supabase Key:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length || 0);

// Test 2: Basic React Native
console.log('🔥 Test 2: React Native');
try {
  const { Alert } = require('react-native');
  console.log('✅ React Native imported');
  Alert.alert('🔥 Test Alert', 'If you see this, React Native works!');
} catch (e) {
  console.error('❌ React Native failed:', e.message);
}

// Test 3: Polyfills
console.log('🔥 Test 3: Polyfills');
try {
  require('./polyfills');
  console.log('✅ Polyfills loaded');
} catch (e) {
  console.error('❌ Polyfills failed:', e.message);
}

// Test 4: Supabase
console.log('🔥 Test 4: Supabase');
try {
  const { supabase } = require('./app/utils/supabase');
  console.log('✅ Supabase imported, type:', typeof supabase);
} catch (e) {
  console.error('❌ Supabase failed:', e.message);
}

// Test 5: Simple React component
console.log('🔥 Test 5: React');
try {
  const React = require('react');
  const { View, Text } = require('react-native');
  
  const TestComponent = () => React.createElement(View, null, 
    React.createElement(Text, null, 'Test')
  );
  
  console.log('✅ React component created');
} catch (e) {
  console.error('❌ React failed:', e.message);
}

console.log('🔥 MINIMAL TEST COMPLETE - App should show if no errors above');

// Only load Expo Router if everything else works
console.log('🔥 Final: Loading Expo Router...');
require('expo-router/entry'); 