import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, MapPin, Calendar, Heart, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { Image } from 'expo-image';
import { addReviewComment, getReviewComments, likeReview, unlikeReview, hasUserLikedReview, getReviewLikesCount } from '../utils/interactions';
import { format } from 'date-fns';
import { supabase } from '../utils/supabase';
import { reviewService } from '../services/reviewService';
import { LikeButton } from '../components/LikeButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CommentsScreen() {
  const insets = useSafeAreaInsets();
  const { reviewId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    loadComments();
    loadReviewDetails();
    
    // Set up real-time subscription for new comments
    const subscription = supabase
      .channel('review_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'review_comments',
          filter: `review_id=eq.${reviewId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add the new comment if it's not from the current user
            if (payload.new.user_id !== user?.id) {
              loadComments();
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove the deleted comment
            setComments(prev => prev.filter(comment => comment.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            // Update the modified comment
            setComments(prev => 
              prev.map(comment => 
                comment.id === payload.new.id 
                  ? { ...comment, ...payload.new } 
                  : comment
              )
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [reviewId, user?.id]);
  
  const loadReviewDetails = async () => {
    if (!reviewId) return;
    
    try {
      setReviewLoading(true);
      // Force a fresh load from the server by adding timestamp
      const reviewData = await reviewService.getReviewDetail(reviewId.toString());
      console.log('Review data loaded:', JSON.stringify(reviewData, null, 2));
      
      // Log the specific score being displayed for debugging
      console.log(`Displaying score in comments screen: ${reviewData.relative_score}`);
      
      setReview(reviewData);
    } catch (error) {
      console.error('Error loading review details:', error);
    } finally {
      setReviewLoading(false);
    }
  };
  
  const loadComments = async () => {
    if (!reviewId) return;
    
    try {
      setLoading(true);
      const commentsData = await getReviewComments(reviewId.toString());
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !user || !reviewId) return;
    
    try {
      setSubmitting(true);
      
      const newComment = await addReviewComment(
        reviewId.toString(),
        user.id,
        commentText.trim()
      );
      
      if (newComment) {
        // Add the new comment to the list
        setComments(prev => [...prev, newComment]);
        setCommentText('');
        
        // Scroll to the bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderCommentItem = ({ item }: { item: any }) => {
    const isCurrentUser = item.user_id === user?.id;
    const userName = item.users?.full_name || 'Unknown User';
    const avatarUrl = item.users?.avatar_url;
    const formattedDate = format(new Date(item.created_at), 'MMM d, yyyy h:mm a');
    
    return (
      <View style={[
        styles.commentItem,
        isCurrentUser ? styles.currentUserComment : null
      ]}>
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                <Text style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.commentContent,
          isCurrentUser ? styles.currentUserCommentContent : null,
          { backgroundColor: isCurrentUser ? theme.colors.primary + '20' : theme.colors.surface }
        ]}>
          <View style={styles.commentHeader}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {isCurrentUser ? 'You' : userName}
            </Text>
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {formattedDate}
            </Text>
          </View>
          
          <Text style={[styles.commentText, { color: theme.colors.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };
  
  // Generate list header with review details
  const ListHeader = () => {
    if (reviewLoading) {
      return (
        <View style={styles.reviewLoadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    
    if (!review) {
      return null;
    }
    
    const userName = review.user?.full_name || 'Unknown User';
    const avatarUrl = review.user?.avatar_url;
    const firstLetter = userName.charAt(0).toUpperCase();
    const formattedDate = review.date_played ? format(new Date(review.date_played), 'MMM d, yyyy') : 'Unknown date';
    
    return (
      <View style={[styles.reviewContainer, { backgroundColor: theme.colors.surface }]}>
        {/* User Info */}
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.userAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.userAvatarPlaceholder, { backgroundColor: theme.colors.secondary }]}>
                <Text style={styles.userAvatarText}>{firstLetter}</Text>
              </View>
            )}
            <View style={styles.textContainer}>
              <Text numberOfLines={0} style={[styles.reviewUserName, { color: theme.colors.text }]}>
                {userName} ranked {review.course?.name}
              </Text>
              <Text style={[styles.reviewDate, { color: theme.colors.textSecondary }]}>
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Course Info */}
        <View style={styles.courseInfo}>
          <MapPin size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.courseLocation, { color: theme.colors.textSecondary }]}>
            {review.course?.location || 'Unknown location'}
          </Text>
        </View>
        
        <View style={styles.courseInfo}>
          <Calendar size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.playedDate, { color: theme.colors.textSecondary }]}>
            Played on {formattedDate}
          </Text>
        </View>
        
        {/* Notes */}
        {review.notes && (
          <Text style={[styles.notes, { color: theme.colors.text }]}>
            {review.notes}
          </Text>
        )}
        
        {/* Interactions */}
        <View style={styles.interactionsContainer}>
          <LikeButton reviewId={review.id} size={20} />
          <View style={styles.interactionDivider} />
          <View style={styles.commentsCount}>
            <MessageCircle size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.commentsCountText, { color: theme.colors.textSecondary }]}>
              {comments.length}
            </Text>
          </View>
        </View>
        
        {/* Comments Section Title */}
        <View style={styles.commentsSectionHeader}>
          <Text style={[styles.commentsSectionTitle, { color: theme.colors.text }]}>
            {comments.length > 0 ? 'Comments' : 'Be the first to comment'}
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView 
      style={[
        styles.safeArea, 
        { 
          backgroundColor: theme.colors.background,
          paddingTop: insets.top > 0 ? 0 : StatusBar.currentHeight || 12,
        }
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      
      {/* Header */}
      <View style={[
        styles.header,
        { borderBottomColor: theme.colors.border }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Comments
        </Text>
      </View>
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Comments List with Review Detail Header */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            renderItem={renderCommentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.commentsContainer,
              { paddingBottom: 16 + (insets.bottom > 0 ? insets.bottom : 0) }
            ]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={
              !reviewLoading ? (
                <View style={styles.emptyCommentsContainer}>
                  <Text style={[styles.emptyCommentsText, { color: theme.colors.textSecondary }]}>
                    No comments yet
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
      
      {/* Comment Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View 
          style={[
            styles.inputContainer, 
            { 
              borderTopColor: theme.colors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12
            }
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.primary + '50' }
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  commentsContainer: {
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  currentUserComment: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  commentContent: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  currentUserCommentContent: {
    borderTopRightRadius: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Review styles
  reviewContainer: {
    marginTop: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  reviewLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
    width: '100%',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  textContainer: {
    flex: 1,
    flexShrink: 1,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  courseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseLocation: {
    fontSize: 14,
    marginLeft: 8,
  },
  playedDate: {
    fontSize: 14,
    marginLeft: 8,
  },
  notes: {
    fontSize: 16,
    lineHeight: 22,
    marginVertical: 12,
  },
  interactionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  interactionDivider: {
    width: 16,
  },
  commentsCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsCountText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  commentsSectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCommentsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 14,
  },
}); 