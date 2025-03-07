export type SentimentRating = 'liked' | 'fine' | 'disliked';

export interface CourseTag {
  id: string;
  name: string;
  category: string;
}

export interface CourseReview {
  review_id: string;
  user_id: string;
  course_id: string;
  rating: SentimentRating;
  tags: string[];
  notes: string;
  favorite_holes: number[];
  photos: string[];
  date_played: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Course {
  course_id: string;
  name: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  total_holes: number;
  average_rating: number;
  total_reviews: number;
}

export interface ReviewScreenProps {
  course: Course;
  onSubmit: (review: Omit<CourseReview, 'review_id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export interface CourseComparisonProps {
  courseA: Course;
  courseB: Course;
  onSelect: (preferredCourseId: string, otherCourseId: string) => void;
  onSkip: (courseAId: string, courseBId: string) => void;
} 