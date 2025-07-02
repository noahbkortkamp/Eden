import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEdenTheme } from '../theme/ThemeProvider';
import { reviewService } from '../services/reviewService';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Edit3,
  Tag,
  Users,
  Flag,
  Camera,
  User,
  MoreHorizontal,
  Shield
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { userSafetyService } from '../services/userSafetyService';
import { ReportReason } from '../types/userSafety';

// Eden components
import { Heading2, Heading3, BodyText, SmallText, Caption } from '../components/eden/Typography';
import { Card } from '../components/eden/Card';
import { Button } from '../components/eden/Button';
import { Icon } from '../components/eden/Icon';
import { FeedbackBadge } from '../components/eden/FeedbackBadge';
import { FilterChip } from '../components/eden/FilterChip';

// Define sentiment mappings for the FeedbackBadge component
const SENTIMENT_TO_STATUS = {
  liked: 'positive',
  fine: 'neutral',
  didnt_like: 'negative'
};

// Define sentiment label mapping
const SENTIMENT_LABELS = {
  liked: 'I liked it',
  fine: 'It was fine',
  didnt_like: 'I didn\'t like it'
};

// Map sentiment to icons
const SENTIMENT_ICONS = {
  liked: <ThumbsUp size={16} />,
  fine: <Minus size={16} />,
  didnt_like: <ThumbsDown size={16} />
};

// Placeholder images
const PLACEHOLDER_IMAGE = { uri: 'https://via.placeholder.com/100' };
const AVATAR_PLACEHOLDER = { uri: 'https://via.placeholder.com/40' };

export default function FriendReviewDetailScreen() {
  // Get params and hooks
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const router = useRouter();
  const theme = useEdenTheme();
  const { user } = useAuth();
  
  // State
  const [review, setReview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch review data
  useEffect(() => {
    let isMounted = true;
    
    async function loadReview() {
      if (!reviewId) {
        setError('Missing reviewId');
        setLoading(false);
        return;
      }
      
      try {
        const reviewData = await reviewService.getReviewDetail(reviewId);
        
        if (!isMounted) return;
        
        if (!reviewData) {
          setError('Review not found');
        } else {
          setReview(reviewData);
        }
        
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading review:', err);
        setError(err instanceof Error ? err.message : 'Failed to load review');
        setLoading(false);
      }
    }
    
    loadReview();
    
    return () => {
      isMounted = false;
    };
  }, [reviewId]);

  // Handle navigating to the course details
  const handleViewCourse = () => {
    if (!review?.course_id) return;
    
    router.push({
      pathname: '/(modals)/course-details',
      params: { courseId: review.course_id }
    });
  };

  // Handle reporting review
  const handleReportReview = () => {
    Alert.alert(
      'Report Review',
      'Why are you reporting this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => reportReview('inappropriate') },
        { text: 'Spam', onPress: () => reportReview('spam') },
        { text: 'Harassment', onPress: () => reportReview('harassment') },
        { text: 'Fake Information', onPress: () => reportReview('fake') },
        { text: 'Other', onPress: () => reportReview('other') },
      ]
    );
  };

  const reportReview = async (reason: ReportReason) => {
    if (!reviewId) return;
    
    try {
      await userSafetyService.reportContent('review', reviewId, reason);
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep Eden safe. We\'ll review this report.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error reporting review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      Alert.alert('Error', errorMessage);
    }
  };

  // Handle blocking user
  const handleBlockUser = () => {
    if (!review?.user_id) return;
    
    const userName = review.user?.full_name || 'this user';
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? You won't see their reviews or be able to interact with them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            try {
              await userSafetyService.blockUser(review.user_id);
              Alert.alert(
                'User Blocked',
                `${userName} has been blocked.`,
                [
                  { 
                    text: 'OK', 
                    onPress: () => router.back() // Go back since this content is now blocked
                  }
                ]
              );
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleMoreActions = () => {
    Alert.alert(
      'Actions',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report Review', onPress: handleReportReview },
        { text: 'Block User', onPress: handleBlockUser, style: 'destructive' },
      ]
    );
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <SmallText style={styles.loadingText}>Loading review...</SmallText>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !review) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false
          }}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Heading3>Review Not Found</Heading3>
        </View>
        
        <View style={styles.centerContent}>
          <BodyText color={theme.colors.textSecondary} center style={styles.errorText}>
            {error === 'Review not found' 
              ? "This review isn't available." 
              : "There was a problem loading this review."}
          </BodyText>
          
          <Button 
            label="Go Back"
            onPress={() => router.back()}
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Get sentiment status for FeedbackBadge
  const sentiment = review.rating || 'fine';
  const sentimentStatus = SENTIMENT_TO_STATUS[sentiment as keyof typeof SENTIMENT_TO_STATUS] as any;
  const sentimentLabel = SENTIMENT_LABELS[sentiment as keyof typeof SENTIMENT_LABELS];
  const sentimentIcon = SENTIMENT_ICONS[sentiment as keyof typeof SENTIMENT_ICONS];
  
  // Format the date
  const formattedDate = review.date_played 
    ? format(new Date(review.date_played), 'MMMM d, yyyy')
    : 'Unknown date';
  
  // Check for content
  const hasNotes = review.notes && review.notes.trim().length > 0;
  const hasTags = review.tags && review.tags.length > 0;
  const hasFavoriteHoles = review.favorite_holes && review.favorite_holes.length > 0;
  const hasPhotos = review.photos && review.photos.length > 0;
  const hasPlayingPartners = review.playing_partners && review.playing_partners.length > 0;
  
  // User info
  const userName = review.user?.full_name || 'Unknown User';
  const avatarUrl = review.user?.avatar_url;
  const firstLetter = userName[0]?.toUpperCase() || 'U';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Heading3>Review Details</Heading3>
        {/* Show more actions menu if viewing someone else's review */}
        {user && review?.user_id && user.id !== review.user_id && (
          <TouchableOpacity onPress={handleMoreActions} style={styles.moreButton}>
            <MoreHorizontal size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* User Info */}
        <Card style={styles.userInfoContainer}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => {
              router.push({
                pathname: '/(modals)/user-profile',
                params: {
                  userId: review.user_id,
                  userName: userName
                }
              });
            }}
          >
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                placeholder={AVATAR_PLACEHOLDER}
                style={styles.avatar}
                contentFit="cover"
                recyclingKey={`avatar-${review.user_id}`}
                transition={200}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <SmallText style={styles.avatarText} color="#FFFFFF">
                  {firstLetter}
                </SmallText>
              </View>
            )}
            <View>
              <BodyText bold style={styles.userName}>
                {userName}
              </BodyText>
              <SmallText color={theme.colors.textSecondary}>
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </SmallText>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Course Info */}
        <Card style={styles.courseInfoContainer} pressable onPress={handleViewCourse}>
          <Heading2>{review.course?.name || 'Unknown Course'}</Heading2>
          <View style={styles.courseMetaContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <SmallText color={theme.colors.textSecondary} style={styles.metaText}>
              {review.course?.location || 'Unknown location'}
            </SmallText>
          </View>
          <View style={styles.courseMetaContainer}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <SmallText color={theme.colors.textSecondary} style={styles.metaText}>
              Played on {formattedDate}
            </SmallText>
          </View>
        </Card>

        {/* Sentiment */}
        <Card style={styles.sectionContainer}>
          <BodyText bold style={styles.sectionTitle}>Overall Rating</BodyText>
          <FeedbackBadge 
            status={sentimentStatus} 
            label={sentimentLabel}
            icon={sentimentIcon}
            style={styles.sentimentBadge}
          />
        </Card>

        {/* Tags */}
        {hasTags && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Tag size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Tags</BodyText>
            </View>
            <View style={styles.tagsContainer}>
              {review.tags && review.tags.length > 0 ? (
                review.tags.map((tag: any) => (
                  <FilterChip
                    key={tag.id || `tag-${tag.name}`}
                    label={tag.name}
                    selected={false}
                    onToggle={() => {}} // read-only in details view
                    style={styles.tagChip}
                  />
                ))
              ) : (
                <SmallText color={theme.colors.textSecondary}>No tags added</SmallText>
              )}
            </View>
          </Card>
        )}

        {/* Notes */}
        {hasNotes && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Edit3 size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Notes</BodyText>
            </View>
            <BodyText style={styles.notesText}>
              {review.notes}
            </BodyText>
          </Card>
        )}

        {/* Favorite Holes */}
        {hasFavoriteHoles && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Flag size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Favorite Holes</BodyText>
            </View>
            <View style={styles.holesContainer}>
              {review.favorite_holes.map((hole: any) => (
                <View key={`hole-${hole}`} style={styles.holeChip}>
                  <SmallText>{hole}</SmallText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Playing Partners */}
        {hasPlayingPartners && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Users size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Playing Partners</BodyText>
            </View>
            <View style={styles.partnersContainer}>
              {review.playing_partners.map((partner: any) => (
                <View key={partner.id} style={styles.partnerItem}>
                  <Image 
                    source={partner.avatar_url ? { uri: partner.avatar_url } : PLACEHOLDER_IMAGE}
                    style={styles.partnerAvatar}
                  />
                  <SmallText style={styles.partnerName}>{partner.name}</SmallText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Photos */}
        {hasPhotos && (
          <Card style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Camera size={18} color={theme.colors.textSecondary} style={styles.sectionIcon} />
              <BodyText bold>Photos</BodyText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
              {review.photos.map((photo: string, index: number) => (
                <Image
                  key={`photo-${index}`}
                  source={{ uri: photo }}
                  style={styles.photoItem}
                />
              ))}
            </ScrollView>
          </Card>
        )}

        {/* View Course Button */}
        <Button
          label="View Course Details"
          onPress={handleViewCourse}
          style={styles.viewCourseButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  backButton: {
    marginRight: 16,
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  userInfoContainer: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    marginBottom: 2,
  },
  courseInfoContainer: {
    marginBottom: 16,
  },
  courseMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: {
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  notesText: {
    lineHeight: 22,
  },
  holesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  holeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    marginBottom: 8,
  },
  partnersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  partnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  partnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  partnerName: {
    fontWeight: '500',
  },
  photosScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  photoItem: {
    width: 150,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  viewCourseButton: {
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    marginBottom: 20,
  },
  actionButton: {
    marginTop: 16,
  },
}); 