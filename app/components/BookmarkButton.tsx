import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Bookmark, BookmarkCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useEdenTheme } from '../theme/ThemeProvider';
import { bookmarkService } from '../services/bookmarkService';

interface BookmarkButtonProps {
  courseId: string;
  isBookmarked: boolean;
  size?: number;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  courseId,
  isBookmarked,
  size = 24,
  onBookmarkChange
}) => {
  const { user } = useAuth();
  const edenTheme = useEdenTheme();
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [loading, setLoading] = useState(false);

  // Update local state when props change
  React.useEffect(() => {
    setBookmarked(isBookmarked);
  }, [isBookmarked]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!user || !courseId) {
      console.log('❌ Cannot bookmark - user not logged in or no course ID');
      return;
    }
    
    console.log(`🔖 Toggling bookmark for course ${courseId} (current: ${bookmarked})`);
    
    // Store original state to revert in case of error
    const originalIsBookmarked = bookmarked;
    const newBookmarkState = !originalIsBookmarked;
    
    try {
      setLoading(true);
      
      // Optimistically update UI immediately
      setBookmarked(newBookmarkState);
      
      // Notify parent component of the change
      if (onBookmarkChange) {
        onBookmarkChange(newBookmarkState);
      }
      
      // Add a small delay to ensure UI updates before network request
      setTimeout(async () => {
        try {
          if (originalIsBookmarked) {
            console.log(`⏳ Removing bookmark for course ${courseId}`);
            await bookmarkService.removeBookmark(user.id, courseId);
            console.log(`✅ Successfully removed bookmark for course ${courseId}`);
          } else {
            console.log(`⏳ Adding bookmark for course ${courseId}`);
            await bookmarkService.addBookmark(user.id, courseId);
            console.log(`✅ Successfully added bookmark for course ${courseId}`);
          }
        } catch (err) {
          console.error('❌ Error toggling course bookmark:', err);
          
          // Revert UI on error
          setBookmarked(originalIsBookmarked);
          
          // Notify parent component of the reversion
          if (onBookmarkChange) {
            onBookmarkChange(originalIsBookmarked);
          }
          
          // Show error feedback
          if (__DEV__) {
            console.warn(`Bookmark operation failed: ${err}`);
          }
        } finally {
          setLoading(false);
        }
      }, 50);
    } catch (err) {
      console.error('❌ Error in bookmark toggle:', err);
      setBookmarked(originalIsBookmarked);
      if (onBookmarkChange) {
        onBookmarkChange(originalIsBookmarked);
      }
      setLoading(false);
    }
  }, [courseId, user, bookmarked, onBookmarkChange]);

  // Added debug log for rendering
  console.log(`Rendering BookmarkButton for course ${courseId} (bookmarked=${bookmarked})`);

  return (
    <Pressable 
      onPress={() => {
        console.log('🖱️ BookmarkButton pressed!');
        handleBookmarkToggle();
      }}
      disabled={loading || !user}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed
      ]}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={edenTheme.colors.primary} />
      ) : bookmarked ? (
        <BookmarkCheck size={size} color={edenTheme.colors.primary} />
      ) : (
        <Bookmark size={size} color={edenTheme.colors.textSecondary} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    // Add visual debugging in dev mode
    ...__DEV__ && { 
      backgroundColor: 'rgba(0, 0, 255, 0.1)', 
      borderWidth: 1, 
      borderColor: 'blue',
      borderRadius: 4
    },
  },
  pressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
}); 