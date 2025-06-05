import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text } from 'react-native';

function DebugApp() {
  console.log('🚨 DEBUG: DebugApp component is rendering!');
  
  return (
    <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: 'red'}}>
      <Text style={{fontSize: 24, color: 'white', fontWeight: 'bold'}}>
        If you see this, JS is running.
      </Text>
      <Text style={{fontSize: 16, color: 'white', marginTop: 20}}>
        Debug mode active
      </Text>
    </View>
  );
}

console.log('🚨 DEBUG: Registering DebugApp component');
registerRootComponent(DebugApp); 