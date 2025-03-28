import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { CourseComparisonProps } from '../../types/review';
import { useTheme } from '../../theme/ThemeProvider';

const { width } = Dimensions.get('window');

export const CourseComparisonScreen: React.FC<CourseComparisonProps> = ({
  courseA,
  courseB,
  onSelect,
  onSkip,
}) => {
  const theme = useTheme();
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Reset selecting state when courses change
  useEffect(() => {
    if (courseA && courseB) {
      setIsSelecting(false);
    }
  }, [courseA?.id, courseB?.id]);

  if (!courseA || !courseB) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleSelect = async (selectedId: string, notSelectedId: string) => {
    try {
      // Prevent double-selection
      if (isSelecting) return;
      
      setIsSelecting(true);
      
      console.log('Selecting course:', {
        selectedId,
        notSelectedId,
      });
      
      // Directly call onSelect which will navigate to the next comparison
      await onSelect(selectedId, notSelectedId);
    } catch (error) {
      console.error('Failed to submit comparison:', error);
      setIsSelecting(false);
    }
  };

  const handleSkip = async () => {
    try {
      if (isSelecting) return;
      
      setIsSelecting(true);
      
      console.log('Skipping comparison:', {
        courseAId: courseA?.id,
        courseBId: courseB?.id,
      });
      
      await onSkip(courseA.id, courseB.id);
    } catch (error) {
      console.error('Failed to skip comparison:', error);
      setIsSelecting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },
    coursesContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xl,
    },
    courseCard: {
      width: width - 32,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardPressed: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      transform: [{ scale: 0.98 }],
      backgroundColor: `${theme.colors.primary}10`,
    },
    courseName: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
    },
    vsContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: -theme.spacing.lg,
      zIndex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    vsText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    skipButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    skipButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Which course do you prefer?
        </Text>
        <Text style={styles.subtitle}>Tap on your favorite</Text>
      </View>
      
      <View style={styles.coursesContainer}>
        {/* Course A */}
        <Pressable
          style={({pressed}) => [
            styles.courseCard, 
            pressed && styles.courseCardPressed
          ]}
          onPress={() => handleSelect(courseA.id, courseB.id)}
          android_ripple={{ color: `${theme.colors.primary}30` }}
          disabled={isSelecting}
        >
          <Text style={styles.courseName}>
            {courseA.name}
          </Text>
        </Pressable>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Course B */}
        <Pressable
          style={({pressed}) => [
            styles.courseCard, 
            pressed && styles.courseCardPressed
          ]}
          onPress={() => handleSelect(courseB.id, courseA.id)}
          android_ripple={{ color: `${theme.colors.primary}30` }}
          disabled={isSelecting}
        >
          <Text style={styles.courseName}>
            {courseB.name}
          </Text>
        </Pressable>
      </View>
      
      <Pressable 
        style={({pressed}) => [
          styles.skipButton,
          pressed && { opacity: 0.8 }
        ]} 
        onPress={handleSkip}
        disabled={isSelecting}
      >
        <Text style={styles.skipButtonText}>
          Too tough to choose
        </Text>
      </Pressable>
    </View>
  );
}; 