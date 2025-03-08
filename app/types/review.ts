import type { Database } from './database.types';

export type Course = Database['public']['Tables']['courses']['Row'];

export type SentimentRating = 'liked' | 'fine' | 'didnt_like';

export interface FavoriteHole {
  number: number;
  notes?: string;
}

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

export interface ReviewScreenProps {
  course: Course;
  onSubmit: (review: {
    course_id: string;
    rating: SentimentRating;
    notes: string;
    favorite_holes: FavoriteHole[];
    photos: string[];
    date_played: Date;
    tags: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}

export interface CourseComparisonProps {
  courseA: Course;
  courseB: Course;
  onSelect: (selectedId: string, notSelectedId: string) => void;
  onSkip: (courseAId: string, courseBId: string) => void;
} 