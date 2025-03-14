import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Star, Camera, X, ArrowLeft, Tag, ChevronRight } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { calculateCourseScore, getScoreBreakdown } from '../utils/scoring';

// Golf-specific tags for different aspects of the course
const COURSE_TAGS = {
  layout: [
    'Challenging Layout',
    'Strategic Design',
    'Open Fairways',
    'Tight Fairways',
    'Elevation Changes',
    'Water Hazards',
    'Bunker Placement',
    'Dogleg Holes',
    'Par 3 Course',
    'Links Style'
  ],
  conditions: [
    'Perfect Greens',
    'Well-Maintained',
    'Fast Greens',
    'True Roll',
    'Firm Fairways',
    'Lush Rough',
    'Pristine Bunkers',
    'Excellent Tee Boxes',
    'Good Drainage',
    'Scenic Views'
  ],
  amenities: [
    'Pro Shop',
    'Driving Range',
    'Practice Green',
    'Clubhouse',
    'Restaurant',
    'Caddie Service',
    'Cart Service',
    'Locker Room',
    'Golf Lessons',
    'Tournament Ready'
  ],
  value: [
    'Great Value',
    'Premium Experience',
    'Reasonable Rates',
    'Membership Benefits',
    'Special Offers',
    'Weekend Rates',
    'Twilight Specials',
    'Group Discounts',
    'Season Passes',
    'Stay & Play'
  ]
};

// Mock data for previously reviewed courses
const PREVIOUS_REVIEWS = [
  {
    id: 1,
    name: 'The Country Club',
    rating: 5,
    date: '2 weeks ago',
    tags: ['Perfect Greens', 'Challenging Layout', 'Premium Experience'],
    comparison: {
      difficulty: 5,
      conditions: 5,
      value: 3,
      amenities: 4
    }
  },
  {
    id: 2,
    name: 'Boston Golf Club',
    rating: 4,
    date: '1 month ago',
    tags: ['Strategic Design', 'Well-Maintained', 'Great Value'],
    comparison: {
      difficulty: 4,
      conditions: 4,
      value: 5,
      amenities: 3
    }
  }
];

export default function NewReviewScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('layout');
  const [comparisonRatings, setComparisonRatings] = useState({
    difficulty: 0,
    conditions: 0,
    value: 0,
    amenities: 0
  });
  const [courseScore, setCourseScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!fontsLoaded) {
    return null;
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const updateComparisonRating = (aspect: keyof typeof comparisonRatings, value: number) => {
    setComparisonRatings(prev => ({
      ...prev,
      [aspect]: value
    }));
  };

  const handleSubmit = () => {
    // TODO: Implement review submission
    console.log({ 
      rating, 
      content, 
      images, 
      tags: selectedTags,
      comparison: comparisonRatings 
    });
    router.back();
  };

  useEffect(() => {
    if (rating > 0) {
      const reviewData = {
        rating,
        comparison: comparisonRatings,
        tags: selectedTags
      };
      const score = calculateCourseScore(reviewData);
      const breakdown = getScoreBreakdown(reviewData);
      setCourseScore(score);
      setScoreBreakdown(breakdown);
    }
  }, [rating, comparisonRatings, selectedTags]);

  // Handle text input focus to scroll to the review section
  const handleReviewFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#000" />
            </Pressable>
            <Text style={styles.title}>Write a Review</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}>
                  <Star
                    size={32}
                    color={star <= rating ? '#fbbf24' : '#e2e8f0'}
                    fill={star <= rating ? '#fbbf24' : 'none'}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreTitle}>Course Score</Text>
                <View style={styles.scoreDisplay}>
                  <Text style={styles.scoreValue}>{courseScore.toFixed(1)}</Text>
                  <Text style={styles.scoreMax}>/10</Text>
                </View>
                {scoreBreakdown && (
                  <View style={styles.breakdownContainer}>
                    {Object.entries(scoreBreakdown).map(([key, value]: [string, any]) => (
                      <View key={key} style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Text>
                        <View style={styles.breakdownBarContainer}>
                          <View 
                            style={[
                              styles.breakdownBar,
                              { width: `${value.weightedScore * 10}%` }
                            ]} 
                          />
                        </View>
                        <Text style={styles.breakdownValue}>
                          {value.score.toFixed(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compare with Previous Reviews</Text>
            <View style={styles.comparisonContainer}>
              {Object.entries(comparisonRatings).map(([aspect, value]) => (
                <View key={aspect} style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>
                    {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
                  </Text>
                  <View style={styles.comparisonStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => updateComparisonRating(aspect as keyof typeof comparisonRatings, star)}
                        style={styles.starButton}>
                        <Star
                          size={20}
                          color={star <= value ? '#fbbf24' : '#e2e8f0'}
                          fill={star <= value ? '#fbbf24' : 'none'}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.previousReviews}>
              <Text style={styles.previousReviewsTitle}>Your Previous Reviews</Text>
              {PREVIOUS_REVIEWS.map((review) => (
                <Pressable key={review.id} style={styles.previousReviewCard}>
                  <View style={styles.previousReviewHeader}>
                    <View>
                      <Text style={styles.previousReviewName}>{review.name}</Text>
                      <Text style={styles.previousReviewDate}>{review.date}</Text>
                    </View>
                    <View style={styles.previousReviewRating}>
                      <Star size={16} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.previousReviewRatingText}>{review.rating}/5</Text>
                    </View>
                  </View>
                  <View style={styles.previousReviewTags}>
                    {review.tags.map((tag, index) => (
                      <View key={index} style={styles.previousReviewTag}>
                        <Text style={styles.previousReviewTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.previousReviewComparison}>
                    {Object.entries(review.comparison).map(([aspect, value]) => (
                      <View key={aspect} style={styles.previousReviewComparisonItem}>
                        <Text style={styles.previousReviewComparisonLabel}>
                          {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
                        </Text>
                        <View style={styles.previousReviewComparisonStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              color={star <= value ? '#fbbf24' : '#e2e8f0'}
                              fill={star <= value ? '#fbbf24' : 'none'}
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Course Tags</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}>
              {Object.keys(COURSE_TAGS).map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryButton,
                    activeCategory === category && styles.activeCategoryButton
                  ]}
                  onPress={() => setActiveCategory(category)}>
                  <Text style={[
                    styles.categoryText,
                    activeCategory === category && styles.activeCategoryText
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.tagsContainer}>
              {COURSE_TAGS[activeCategory as keyof typeof COURSE_TAGS].map((tag) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagButton,
                    selectedTags.includes(tag) && styles.selectedTagButton
                  ]}
                  onPress={() => toggleTag(tag)}>
                  <Tag size={16} color={selectedTags.includes(tag) ? '#fff' : '#64748b'} />
                  <Text style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.selectedTagText
                  ]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={6}
              placeholder="Share your experience..."
              value={content}
              onChangeText={setContent}
              onFocus={handleReviewFocus}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable style={styles.addPhotoButton} onPress={pickImage}>
                <Camera size={24} color="#64748b" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </Pressable>
              {images.map((uri, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photo} />
                  <Pressable
                    style={styles.removePhoto}
                    onPress={() => removeImage(index)}>
                    <X size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable 
        style={[
          styles.submitButton,
          (!rating || courseScore === 0) && styles.submitButtonDisabled
        ]} 
        onPress={handleSubmit}
        disabled={!rating || courseScore === 0}>
        <Text style={styles.submitButtonText}>Post Review</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  comparisonContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
  },
  comparisonStars: {
    flexDirection: 'row',
    gap: 4,
  },
  previousReviews: {
    marginTop: 16,
  },
  previousReviewsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    marginBottom: 12,
  },
  previousReviewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  previousReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  previousReviewName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  previousReviewDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  previousReviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previousReviewRatingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  previousReviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  previousReviewTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previousReviewTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  previousReviewComparison: {
    gap: 8,
  },
  previousReviewComparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousReviewComparisonLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  previousReviewComparisonStars: {
    flexDirection: 'row',
    gap: 2,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#eff6ff',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
  },
  activeCategoryText: {
    color: '#2563eb',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    gap: 4,
  },
  selectedTagButton: {
    backgroundColor: '#2563eb',
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  selectedTagText: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    height: 120,
    textAlignVertical: 'top',
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addPhotoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 8,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  scoreContainer: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  scoreTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b',
    marginBottom: 8,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#2563eb',
  },
  scoreMax: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginLeft: 4,
  },
  breakdownContainer: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    width: 80,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  breakdownBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  breakdownValue: {
    width: 30,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
    textAlign: 'right',
  },
}); 