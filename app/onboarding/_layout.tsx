import { Stack, usePathname } from 'expo-router';
import { edenTheme } from '../theme/edenTheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import OnboardingProgressBar from '../components/OnboardingProgressBar';
import { getStepNumber, TOTAL_ONBOARDING_STEPS } from '../constants/onboarding';

export default function OnboardingLayout() {
  const pathname = usePathname();
  const currentRoute = pathname.split('/').pop() || '';
  const currentStep = getStepNumber(currentRoute);
  
  // Only show progress bar if it's a numbered step, not on the done screen
  const showProgressBar = currentRoute !== 'done';

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {showProgressBar && (
          <View style={styles.progressBarContainer}>
            <OnboardingProgressBar 
              currentStep={currentStep} 
              totalSteps={TOTAL_ONBOARDING_STEPS} 
            />
          </View>
        )}
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
          <Stack.Screen name="frequency" options={{ gestureEnabled: false }} />
          <Stack.Screen name="done" options={{ gestureEnabled: false }} />
        </Stack>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: edenTheme.colors.background,
  },
  progressBarContainer: {
    backgroundColor: edenTheme.colors.background,
    paddingTop: 0, // Removed padding completely to position it higher
  }
});