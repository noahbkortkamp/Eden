import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SimpleFriendReviewCard } from './components/SimpleFriendReviewCard';
import { TouchTestComponent } from './components/TouchTestComponent';

// Mock review data for testing
const mockReviews = [
  {
    id: 'test-review-1',
    user_id: 'test-user-1',
    course_id: 'test-course-1',
    rating: 4.2,
    relative_score: 8.5, // High score - should be green
    sentiment: 'positive',
    notes: 'Had an amazing round today! The greens were in perfect condition and the weather was ideal. Really enjoyed playing with my friends.',
    date_played: '2024-01-15',
    created_at: '2024-01-15T10:30:00Z',
    full_name: 'Deven',
    avatar_url: null,
    course_name: 'Erin Hills',
    course_location: 'Erin, WI',
    playing_partners: [
      { id: 'partner-1', full_name: 'Mike Johnson', avatar_url: null },
      { id: 'partner-2', full_name: 'Sarah Wilson', avatar_url: null }
    ],
    photos: [
      'https://picsum.photos/400/400?random=1',
      'https://picsum.photos/400/400?random=2'
    ],
    favorite_holes: [12, 16, 18],
    likes_count: 1,
    is_liked_by_me: false,
    comments_count: 1,
    is_bookmarked: false,
  },
  {
    id: 'test-review-2',
    user_id: 'test-user-2',
    course_id: 'test-course-2',
    rating: 3.8,
    relative_score: 5.2, // Medium score - should be yellowish
    sentiment: 'neutral',
    notes: 'Decent course but nothing special. The fairways were okay and the price was reasonable.',
    date_played: '2024-01-10',
    created_at: '2024-01-10T14:20:00Z',
    full_name: 'Alex',
    avatar_url: null,
    course_name: 'Braintree Municipal Golf Course',
    course_location: 'Braintree, MA',
    playing_partners: [],
    photos: [
      'https://picsum.photos/400/400?random=3'
    ],
    favorite_holes: [],
    likes_count: 0,
    is_liked_by_me: false,
    comments_count: 0,
    is_bookmarked: false,
  },
  {
    id: 'test-review-3',
    user_id: 'test-user-3',
    course_id: 'test-course-3',
    rating: 2.1,
    relative_score: 1.8, // Low score - should be red
    sentiment: 'negative',
    notes: 'Really disappointing experience. The course was poorly maintained and overpriced.',
    date_played: '2024-01-05',
    created_at: '2024-01-05T11:45:00Z',
    full_name: 'Jordan',
    avatar_url: null,
    course_name: 'Disappointing Hills Golf Club',
    course_location: 'Somewhere, TX',
    playing_partners: [],
    photos: [],
    favorite_holes: [],
    likes_count: 0,
    is_liked_by_me: false,
    comments_count: 2,
    is_bookmarked: false,
  }
];

export default function TestTouchScreen() {
  const handleReviewPress = () => {
    console.log('🖱️ Review navigation pressed!');
  };

  const handlePhotoPress = (photoIndex: number) => {
    console.log('🖼️ Photo pressed at index:', photoIndex);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Touch Interaction Test</Text>
      
      <Text style={styles.sectionTitle}>Simple Touch Test Component</Text>
      <TouchTestComponent />
      
      <Text style={styles.sectionTitle}>New SimpleFriendReviewCard - Different Score Colors</Text>
      
      <Text style={styles.scoreLabel}>High Score (8.5) - Green:</Text>
      <SimpleFriendReviewCard 
        review={mockReviews[0]}
        onPress={handleReviewPress}
      />
      
      <Text style={styles.scoreLabel}>Medium Score (5.2) - Yellow:</Text>
      <SimpleFriendReviewCard 
        review={mockReviews[1]}
        onPress={handleReviewPress}
      />
      
      <Text style={styles.scoreLabel}>Low Score (1.8) - Red:</Text>
      <SimpleFriendReviewCard 
        review={mockReviews[2]}
        onPress={handleReviewPress}
      />
      
      <Text style={styles.instructions}>
        Test Instructions:{'\n'}
        1. Tap the card content area - should log "Card navigation pressed!"{'\n'}
        2. Tap the like button - should log "Like button pressed!"{'\n'}
        3. Tap the comment button - should log "Comment button pressed!"{'\n'}
        4. Tap the bookmark button - should log "Bookmark button pressed!"{'\n'}
        5. Check the console for all touch events
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EC',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#234D2C',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#234D2C',
    marginBottom: 16,
    marginTop: 24,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#234D2C',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#4A5E50',
    backgroundColor: '#FDFBF6',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    lineHeight: 20,
  },
}); 