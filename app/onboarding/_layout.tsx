import { Stack } from 'expo-router';
import { edenTheme } from '../theme/edenTheme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: edenTheme.colors.background },
        animation: 'none',
        headerBackVisible: false,
        presentation: 'modal'
      }}>
      <Stack.Screen name="frequency" options={{ gestureEnabled: false }} />
      <Stack.Screen name="course" options={{ gestureEnabled: false }} />
      <Stack.Screen name="done" options={{ gestureEnabled: false }} />
    </Stack>
  );
}