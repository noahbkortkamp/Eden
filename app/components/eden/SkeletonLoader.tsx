import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useEdenTheme } from '../../theme/ThemeProvider';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
  animated = true,
}) => {
  const theme = useEdenTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!animated) return;

    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [animated]);

  const skeletonStyle = {
    width,
    height,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: borderRadius ?? theme.borderRadius.sm,
    opacity: animated ? opacity : 0.3,
  };

  return <Animated.View style={[skeletonStyle, style]} />;
};

interface CourseSkeletonProps {
  showScores?: boolean;
}

export const CourseSkeleton: React.FC<CourseSkeletonProps> = ({ showScores = false }) => {
  const theme = useEdenTheme();

  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          {/* Course name */}
          <SkeletonLoader 
            height={24} 
            width="85%" 
            style={{ marginBottom: theme.spacing.sm }} 
          />
          
          {/* Date played */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: theme.spacing.sm 
          }}>
            <SkeletonLoader 
              height={14} 
              width={14} 
              borderRadius={theme.borderRadius.full}
              style={{ marginRight: theme.spacing.sm }} 
            />
            <SkeletonLoader height={12} width="40%" />
          </View>
          
          {/* Location */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: theme.spacing.md 
          }}>
            <SkeletonLoader 
              height={16} 
              width={16} 
              borderRadius={theme.borderRadius.full}
              style={{ marginRight: theme.spacing.sm }} 
            />
            <SkeletonLoader height={12} width="60%" />
          </View>
        </View>
        
        {/* Score circle */}
        {showScores && (
          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
          }}>
            <SkeletonLoader 
              height={36} 
              width={36} 
              borderRadius={theme.borderRadius.full}
            />
          </View>
        )}
      </View>
    </View>
  );
};

interface ListSkeletonProps {
  itemCount?: number;
  showScores?: boolean;
  itemType?: 'course' | 'simple';
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ 
  itemCount = 3, 
  showScores = false,
  itemType = 'course'
}) => {
  const theme = useEdenTheme();

  if (itemType === 'simple') {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md 
      }}>
        {Array.from({ length: itemCount }, (_, index) => (
          <View key={index} style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            borderBottomWidth: index < itemCount - 1 ? 1 : 0,
            borderBottomColor: theme.colors.border,
          }}>
            <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
              <SkeletonLoader 
                height={18} 
                width="75%" 
                style={{ marginBottom: theme.spacing.xs }} 
              />
              <SkeletonLoader height={14} width="50%" />
            </View>
            <SkeletonLoader 
              height={20} 
              width={20} 
              borderRadius={theme.borderRadius.full}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md 
    }}>
      {Array.from({ length: itemCount }, (_, index) => (
        <CourseSkeleton key={index} showScores={showScores} />
      ))}
    </View>
  );
}; 