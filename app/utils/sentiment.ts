import { ThumbsUp, ThumbsDown, Meh } from 'lucide-react-native';
import { colors } from '../theme/tokens';

/**
 * Define sentiment ranges with their colors and icons
 */
export const SENTIMENT_RANGES = {
  liked: { min: 7.0, max: 10.0, color: colors.feedback.positive, icon: ThumbsUp },
  fine: { min: 3.0, max: 6.9, color: colors.feedback.neutral, icon: Meh },
  didnt_like: { min: 0.0, max: 2.9, color: colors.feedback.negative, icon: ThumbsDown }
};

/**
 * Helper function to determine sentiment from numeric rating
 */
export const getSentimentFromRating = (rating: number | null | undefined): 'liked' | 'fine' | 'didnt_like' => {
  if (!rating) return 'fine'; // Default to 'fine' if no rating
  if (rating >= SENTIMENT_RANGES.liked.min) return 'liked';
  if (rating >= SENTIMENT_RANGES.fine.min) return 'fine';
  return 'didnt_like';
}; 