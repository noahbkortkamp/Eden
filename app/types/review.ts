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
  id: string;
  user_id: string;
  course_id: string;
  rating: SentimentRating;
  notes: string | null;
  favorite_holes: number[];
  photos: string[];
  date_played: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface ReviewScreenProps {
  course: Course;
  onSubmit: (review: {
    course_id: string;
    rating: SentimentRating;
    notes: string;
    favorite_holes: number[];
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