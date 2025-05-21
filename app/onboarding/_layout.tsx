import { Stack } from 'expo-router';
import { edenTheme } from '../theme/edenTheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function OnboardingLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: edenTheme.colors.background },
          animation: 'none',
          headerBackVisible: false,
          presentation: 'modal'
        }}>
        <Stack.Screen name="profile-info" options={{ gestureEnabled: false }} />
        <Stack.Screen name="golf-sickko" options={{ gestureEnabled: false }} />
        <Stack.Screen name="location-permission" options={{ gestureEnabled: false }} />
        <Stack.Screen name="find-friends" options={{ gestureEnabled: false }} />
        <Stack.Screen name="course" options={{ gestureEnabled: false }} />
        <Stack.Screen name="done" options={{ gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});