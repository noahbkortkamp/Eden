import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, StatusBar } from 'react-native';

function NativeTestApp() {
  console.log('🎉 SUCCESS: Native→JS handoff working! TestNativeEntry is rendering');
  
  return (
    <View style={{
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#0066cc',
      padding: 20
    }}>
      <StatusBar barStyle="light-content" />
      <Text style={{
        fontSize: 28, 
        color: 'white', 
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20
      }}>
        ✅ NATIVE FIXES WORKING!
      </Text>
      <Text style={{
        fontSize: 16, 
        color: 'white',
        textAlign: 'center',
        marginBottom: 10
      }}>
        Build 18 - Phase A Complete
      </Text>
      <Text style={{
        fontSize: 14, 
        color: '#ccddff',
        textAlign: 'center'
      }}>
        Entry point: {__filename}
      </Text>
      <Text style={{
        fontSize: 14, 
        color: '#ccddff',
        textAlign: 'center',
        marginTop: 10
      }}>
        Next: Test Expo Router entry
      </Text>
    </View>
  );
}

console.log('🚀 NATIVE TEST: Registering TestNativeEntry component');
registerRootComponent(NativeTestApp); 