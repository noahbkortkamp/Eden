import { StyleSheet } from 'react-native';

// Style for full screen content
const styles = StyleSheet.create({
  fullScreenContent: {
    flex: 1,
  },
});

// Common screen options to completely disable navigation headers
export const fullScreenOptions = {
  headerShown: false,
  contentStyle: styles.fullScreenContent,
}; 